-- Migration para corrigir mapeamento completo de status
-- Garante que as tabelas ReservaSessao, Agenda e Consulta recebam todos os valores válidos do enum AgendaStatus
-- 
-- Mapeamentos principais:
-- - PacienteNaoCompareceu → Cancelled_by_patient
-- - PsicologoNaoCompareceu → Cancelled_by_psychologist
-- - AmbosNaoCompareceram → Cancelled_no_show
-- - Agendada/Reservado → Reservado
-- - EmAndamento → Andamento
-- - Realizada → Concluido
-- - Reagendada* → Reagendada
-- - ForaDaPlataforma → Fora_plataforma
-- - Cancelamentos → Cancelado, Cancelled_by_patient, Cancelled_by_psychologist, Cancelled_no_show

-- Primeiro, adiciona o novo status ao enum ConsultaStatus se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'AmbosNaoCompareceram' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')
  ) THEN
    ALTER TYPE "ConsultaStatus" ADD VALUE 'AmbosNaoCompareceram';
  END IF;
END $$;

-- Atualiza o trigger trg_sync_status_consulta para mapear corretamente TODOS os status
-- Garante que ReservaSessao e Agenda recebam todos os valores válidos do enum AgendaStatus
CREATE OR REPLACE FUNCTION trg_sync_status_consulta()
RETURNS TRIGGER AS $$
DECLARE
  new_agenda_status "AgendaStatus";
BEGIN
  new_agenda_status := (
    CASE
      -- Status ativos/em andamento
      WHEN NEW."Status" IN ('Agendada', 'Reservado') THEN 'Reservado'
      WHEN NEW."Status" = 'EmAndamento' THEN 'Andamento'
      WHEN NEW."Status" = 'Realizada' THEN 'Concluido'
      
      -- Reagendadas → Reagendada
      WHEN NEW."Status" IN (
        'ReagendadaPacienteNoPrazo',
        'ReagendadaPsicologoNoPrazo',
        'ReagendadaPsicologoForaDoPrazo'
      ) THEN 'Reagendada'
      
      -- Fora da plataforma → Fora_plataforma
      WHEN NEW."Status" = 'ForaDaPlataforma' THEN 'Fora_plataforma'
      
      -- Inatividade: Paciente não compareceu → Cancelled_by_patient
      WHEN NEW."Status" = 'PacienteNaoCompareceu' THEN 'Cancelled_by_patient'
      
      -- Inatividade: Psicólogo não compareceu → Cancelled_by_psychologist
      WHEN NEW."Status" = 'PsicologoNaoCompareceu' THEN 'Cancelled_by_psychologist'
      
      -- Inatividade: Ambos não compareceram → Cancelled_no_show
      WHEN NEW."Status" = 'AmbosNaoCompareceram' THEN 'Cancelled_no_show'
      
      -- Cancelamentos por paciente (com ou sem prazo) → Cancelled_by_patient
      WHEN NEW."Status" IN (
        'CanceladaPacienteNoPrazo', 
        'CanceladaPacienteForaDoPrazo',
        'CanceladaNaoCumprimentoContratualPaciente'
      ) THEN 'Cancelled_by_patient'
      
      -- Cancelamentos por psicólogo (com ou sem prazo) → Cancelled_by_psychologist
      WHEN NEW."Status" IN (
        'CanceladaPsicologoNoPrazo', 
        'CanceladaPsicologoForaDoPrazo',
        'CanceladaNaoCumprimentoContratualPsicologo',
        'PsicologoDescredenciado'
      ) THEN 'Cancelled_by_psychologist'
      
      -- Cancelamentos sistêmicos/administrativos → Cancelado (genérico)
      WHEN NEW."Status" IN (
        'CanceladaForcaMaior',
        'CanceladoAdministrador',
        'Cancelado',
        'CANCELAMENTO_SISTEMICO_PSICOLOGO',
        'CANCELAMENTO_SISTEMICO_PACIENTE'
      ) THEN 'Cancelado'
      
      -- Fallback: qualquer outro status cancelado → Cancelado
      WHEN NEW."Status"::text LIKE '%Cancel%' THEN 'Cancelado'
      
      -- Fallback padrão: Cancelado
      ELSE 'Cancelado'
    END
  )::"AgendaStatus";

  -- Valida que o status mapeado é válido no enum AgendaStatus
  -- Isso garante que não haverá erro ao tentar inserir um valor inválido
  IF new_agenda_status IS NULL THEN
    RAISE WARNING 'Trigger trg_sync_status_consulta: Status % da Consulta % não pôde ser mapeado para AgendaStatus', NEW."Status", NEW."Id";
    RETURN NEW;
  END IF;

  PERFORM set_config('app.consulta_sync', 'true', true);

  -- Atualiza ReservaSessao com o status mapeado
  -- Garante que todos os valores válidos do enum AgendaStatus possam ser usados
  UPDATE "ReservaSessao"
    SET "Status" = new_agenda_status,
        "updatedAt" = now(),
        "AgoraTokenPatient" = CASE
          WHEN NEW."Status" IN ('Agendada', 'Reservado', 'EmAndamento') THEN "AgoraTokenPatient"
          ELSE NULL
        END,
        "AgoraTokenPsychologist" = CASE
          WHEN NEW."Status" IN ('Agendada', 'Reservado', 'EmAndamento') THEN "AgoraTokenPsychologist"
          ELSE NULL
        END,
        "Uid" = CASE
          WHEN NEW."Status" IN ('Agendada', 'Reservado', 'EmAndamento') THEN "Uid"
          ELSE NULL
        END,
        "UidPsychologist" = CASE
          WHEN NEW."Status" IN ('Agendada', 'Reservado', 'EmAndamento') THEN "UidPsychologist"
          ELSE NULL
        END
  WHERE "ConsultaId" = NEW."Id"
    AND "Status" IS DISTINCT FROM new_agenda_status;

  -- Atualiza Agenda com o status mapeado
  -- Garante que todos os valores válidos do enum AgendaStatus possam ser usados
  IF NEW."AgendaId" IS NOT NULL THEN
    UPDATE "Agenda"
      SET "Status" = new_agenda_status,
          "UpdatedAt" = now(),
          "PacienteId" = CASE
            WHEN NEW."Status" IN ('Agendada', 'Reservado', 'EmAndamento') THEN "PacienteId"
            ELSE NULL
          END
    WHERE "Id" = NEW."AgendaId"
      AND "Status" IS DISTINCT FROM new_agenda_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atualiza o trigger de inatividade para usar AmbosNaoCompareceram quando ambos não comparecem
CREATE OR REPLACE FUNCTION trg_check_inatividade_joined_at()
RETURNS TRIGGER AS $$
DECLARE
  v_scheduled_at TIMESTAMP;
  v_agora TIMESTAMP;
  v_deadline TIMESTAMP;
  v_consulta_id TEXT;
  v_patient_joined BOOLEAN;
  v_psychologist_joined BOOLEAN;
  v_consulta_status TEXT;
  v_novo_status TEXT;
  v_scheduled_str TEXT;
  v_scheduled_clean TEXT;
BEGIN
  -- Só processa se PatientJoinedAt ou PsychologistJoinedAt foram alterados
  IF (OLD."PatientJoinedAt" IS DISTINCT FROM NEW."PatientJoinedAt") 
     OR (OLD."PsychologistJoinedAt" IS DISTINCT FROM NEW."PsychologistJoinedAt") THEN
    
    -- Obtém dados da ReservaSessao
    v_consulta_id := NEW."ConsultaId";
    v_scheduled_at := NULL;
    
    -- Converte ScheduledAt de string para TIMESTAMP se existir
    IF NEW."ScheduledAt" IS NOT NULL AND NEW."ScheduledAt" != '' THEN
      BEGIN
        v_scheduled_str := NEW."ScheduledAt"::text;
        v_scheduled_clean := regexp_replace(v_scheduled_str, '\.\d+', '', 'g');
        v_scheduled_clean := regexp_replace(v_scheduled_clean, '[+-]\d{2}:?\d{2}$', '', 'g');
        v_scheduled_at := to_timestamp(v_scheduled_clean, 'YYYY-MM-DD HH24:MI:SS');
      EXCEPTION WHEN OTHERS THEN
        BEGIN
          v_scheduled_at := (v_scheduled_clean)::TIMESTAMP;
        EXCEPTION WHEN OTHERS THEN
          v_scheduled_at := NULL;
        END;
      END;
    END IF;
    
    -- Se não tem ScheduledAt, não processa
    IF v_scheduled_at IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Obtém horário atual em Brasília
    v_agora := timezone('America/Sao_Paulo', now());
    v_deadline := v_scheduled_at + INTERVAL '10 minutes';
    
    -- Só processa se já passaram 10 minutos do ScheduledAt
    IF v_agora < v_deadline THEN
      RETURN NEW;
    END IF;
    
    -- Verifica se algum participante não entrou
    v_patient_joined := NEW."PatientJoinedAt" IS NOT NULL;
    v_psychologist_joined := NEW."PsychologistJoinedAt" IS NOT NULL;
    
    -- Se ambos entraram, não precisa cancelar
    IF v_patient_joined AND v_psychologist_joined THEN
      RETURN NEW;
    END IF;
    
    -- Obtém status atual da consulta
    SELECT "Status" INTO v_consulta_status
    FROM "Consulta"
    WHERE "Id" = v_consulta_id;
    
    -- Verifica se já foi cancelada (evita processamento duplicado)
    IF v_consulta_status IN (
      'PacienteNaoCompareceu',
      'PsicologoNaoCompareceu',
      'AmbosNaoCompareceram',
      'CanceladaPacienteNoPrazo',
      'CanceladaPsicologoNoPrazo',
      'CanceladaPacienteForaDoPrazo',
      'CanceladaPsicologoForaDoPrazo',
      'CanceladaForcaMaior'
    ) THEN
      RETURN NEW;
    END IF;
    
    -- Determina o novo status baseado em quem não entrou
    -- REGRA ATUALIZADA: Se ambos não entraram → AmbosNaoCompareceram (mapeia para Cancelled_no_show)
    -- REGRA: Se apenas paciente não entrou → PacienteNaoCompareceu (mapeia para Cancelled_by_patient)
    -- REGRA: Se apenas psicólogo não entrou → PsicologoNaoCompareceu (mapeia para Cancelled_by_psychologist)
    IF NOT v_patient_joined AND NOT v_psychologist_joined THEN
      -- Ambos não entraram → usa AmbosNaoCompareceram (mapeia para Cancelled_no_show)
      v_novo_status := 'AmbosNaoCompareceram';
    ELSIF NOT v_patient_joined THEN
      -- Apenas paciente não entrou → PacienteNaoCompareceu (mapeia para Cancelled_by_patient)
      v_novo_status := 'PacienteNaoCompareceu';
    ELSE
      -- Apenas psicólogo não entrou → PsicologoNaoCompareceu (mapeia para Cancelled_by_psychologist)
      v_novo_status := 'PsicologoNaoCompareceu';
    END IF;
    
    -- Valida que o status é válido antes de atualizar
    IF v_novo_status NOT IN ('PacienteNaoCompareceu', 'PsicologoNaoCompareceu', 'AmbosNaoCompareceram') THEN
      RAISE WARNING 'Trigger de inatividade: Status inválido % para consulta %', v_novo_status, v_consulta_id;
      RETURN NEW;
    END IF;
    
    -- Atualiza status da Consulta (trigger trg_sync_status_consulta vai sincronizar ReservaSessao e Agenda)
    PERFORM set_config('app.consulta_sync', 'true', true);
    
    UPDATE "Consulta"
    SET "Status" = v_novo_status::"ConsultaStatus",
        "UpdatedAt" = now()
    WHERE "Id" = v_consulta_id
      AND "Status" != v_novo_status::"ConsultaStatus";
    
    -- Log detalhado para debug
    RAISE NOTICE '✅ [Trigger Inatividade] Consulta % atualizada: Status=% (PatientJoined: %, PsychologistJoined: %, ScheduledAt: %, Deadline: %, Agora: %)',
      v_consulta_id, v_novo_status, v_patient_joined, v_psychologist_joined, v_scheduled_at, v_deadline, v_agora;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comentário explicativo atualizado
COMMENT ON FUNCTION trg_check_inatividade_joined_at() IS 
'Verifica inatividade baseado em PatientJoinedAt e PsychologistJoinedAt. 
Após 10 minutos do ScheduledAt, se algum participante não entrou (campo null), 
atualiza automaticamente o status da Consulta:
- Ambos não compareceram → AmbosNaoCompareceram (mapeia para Cancelled_no_show no AgendaStatus)
- Apenas paciente não compareceu → PacienteNaoCompareceu (mapeia para Cancelled_by_patient no AgendaStatus)
- Apenas psicólogo não compareceu → PsicologoNaoCompareceu (mapeia para Cancelled_by_psychologist no AgendaStatus)';

-- Função helper para atualizar status de ReservaSessao diretamente (apenas para correções de dados)
-- IMPORTANTE: Use apenas quando necessário corrigir dados. O fluxo normal deve ser via Consulta.
CREATE OR REPLACE FUNCTION atualizar_reservasessao_status_direto(
  p_consulta_id TEXT,
  p_novo_status "AgendaStatus"
)
RETURNS VOID AS $$
BEGIN
  -- Valida que o status é válido no enum AgendaStatus
  IF p_novo_status IS NULL THEN
    RAISE EXCEPTION 'Status inválido: %', p_novo_status;
  END IF;

  -- Permite atualização direta configurando a flag de sincronização
  PERFORM set_config('app.consulta_sync', 'true', true);

  -- Atualiza o status
  UPDATE "ReservaSessao"
  SET "Status" = p_novo_status,
      "updatedAt" = now()
  WHERE "ConsultaId" = p_consulta_id;

  -- Limpa a flag
  PERFORM set_config('app.consulta_sync', 'false', true);

  RAISE NOTICE 'Status da ReservaSessao atualizado para % na consulta %', p_novo_status, p_consulta_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION atualizar_reservasessao_status_direto IS 
'Função helper para atualizar status de ReservaSessao diretamente.
IMPORTANTE: Use apenas para correções de dados. O fluxo normal deve atualizar via Consulta.Status.
Exemplo de uso: SELECT atualizar_reservasessao_status_direto(''consulta-id'', ''Cancelled_no_show''::"AgendaStatus");';

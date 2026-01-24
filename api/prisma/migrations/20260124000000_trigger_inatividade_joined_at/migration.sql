-- Trigger para verificar inatividade baseado em PatientJoinedAt e PsychologistJoinedAt
-- Dispara cancelamento automático após 10 minutos do ScheduledAt se algum participante não entrou

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
    -- ScheduledAt é armazenado como String no formato 'YYYY-MM-DD HH:MM:SS' ou 'YYYY-MM-DD HH:MM:SS.SSS'
    IF NEW."ScheduledAt" IS NOT NULL AND NEW."ScheduledAt" != '' THEN
      BEGIN
        v_scheduled_str := NEW."ScheduledAt"::text;
        -- Remove milissegundos e timezone se houver
        v_scheduled_clean := regexp_replace(v_scheduled_str, '\.\d+', '', 'g');
        v_scheduled_clean := regexp_replace(v_scheduled_clean, '[+-]\d{2}:?\d{2}$', '', 'g');
        
        -- Tenta converter com formato padrão
        v_scheduled_at := to_timestamp(v_scheduled_clean, 'YYYY-MM-DD HH24:MI:SS');
      EXCEPTION WHEN OTHERS THEN
        -- Se falhar, tenta sem especificar formato (PostgreSQL tenta inferir)
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
      'CanceladaPacienteNoPrazo',
      'CanceladaPsicologoNoPrazo',
      'CanceladaPacienteForaDoPrazo',
      'CanceladaPsicologoForaDoPrazo',
      'CanceladaForcaMaior'
    ) THEN
      RETURN NEW;
    END IF;
    
    -- Determina o novo status baseado em quem não entrou (seguindo regras do processarInatividade)
    -- REGRA: Se ambos não entraram → PacienteNaoCompareceu
    -- REGRA: Se apenas paciente não entrou → PacienteNaoCompareceu
    -- REGRA: Se apenas psicólogo não entrou → PsicologoNaoCompareceu
    IF NOT v_patient_joined AND NOT v_psychologist_joined THEN
      -- Ambos não entraram → usa PacienteNaoCompareceu (conforme regra do processarInatividade)
      v_novo_status := 'PacienteNaoCompareceu';
    ELSIF NOT v_patient_joined THEN
      -- Apenas paciente não entrou → PacienteNaoCompareceu
      v_novo_status := 'PacienteNaoCompareceu';
    ELSE
      -- Apenas psicólogo não entrou → PsicologoNaoCompareceu
      v_novo_status := 'PsicologoNaoCompareceu';
    END IF;
    
    -- Valida que o status é válido antes de atualizar
    IF v_novo_status NOT IN ('PacienteNaoCompareceu', 'PsicologoNaoCompareceu') THEN
      RAISE WARNING 'Trigger de inatividade: Status inválido % para consulta %', v_novo_status, v_consulta_id;
      RETURN NEW;
    END IF;
    
    -- Atualiza status da Consulta (trigger trg_sync_status_consulta vai sincronizar ReservaSessao e Agenda)
    -- IMPORTANTE: A tabela Consulta recebe o status específico (PacienteNaoCompareceu ou PsicologoNaoCompareceu)
    -- As tabelas ReservaSessao e Agenda recebem 'Cancelado' via trigger de sincronização (comportamento esperado)
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

-- Cria trigger que dispara após atualização de PatientJoinedAt ou PsychologistJoinedAt
DROP TRIGGER IF EXISTS trg_after_update_joined_at ON "ReservaSessao";
CREATE TRIGGER trg_after_update_joined_at
AFTER UPDATE OF "PatientJoinedAt", "PsychologistJoinedAt" ON "ReservaSessao"
FOR EACH ROW
WHEN (
  (OLD."PatientJoinedAt" IS DISTINCT FROM NEW."PatientJoinedAt")
  OR (OLD."PsychologistJoinedAt" IS DISTINCT FROM NEW."PsychologistJoinedAt")
)
EXECUTE FUNCTION trg_check_inatividade_joined_at();

-- Comentário explicativo
COMMENT ON FUNCTION trg_check_inatividade_joined_at() IS 
'Verifica inatividade baseado em PatientJoinedAt e PsychologistJoinedAt. 
Após 10 minutos do ScheduledAt, se algum participante não entrou (campo null), 
atualiza automaticamente o status da Consulta para cancelamento apropriado.';

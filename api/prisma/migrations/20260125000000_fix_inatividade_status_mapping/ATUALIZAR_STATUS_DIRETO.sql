-- ============================================================================
-- SCRIPT SEGURO: Atualizar Status Diretamente no Banco
-- ============================================================================
-- Este script atualiza APENAS os status nas tabelas ReservaSessao e Agenda
-- baseado no status da Consulta, SEM modificar triggers ou funções.
-- 
-- IMPORTANTE: Execute em uma transação para poder reverter se necessário
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASSO 1: Adiciona o enum AmbosNaoCompareceram se não existir
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'AmbosNaoCompareceram' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')
  ) THEN
    ALTER TYPE "ConsultaStatus" ADD VALUE 'AmbosNaoCompareceram';
    RAISE NOTICE '✅ Enum AmbosNaoCompareceram adicionado ao ConsultaStatus';
  ELSE
    RAISE NOTICE 'ℹ️ Enum AmbosNaoCompareceram já existe';
  END IF;
END $$;

-- ============================================================================
-- PASSO 2: Verifica quantos registros serão atualizados (ANTES de atualizar)
-- ============================================================================
DO $$
DECLARE
  v_count_reservasessao INTEGER;
  v_count_agenda INTEGER;
BEGIN
  -- Conta ReservaSessao que precisam ser atualizadas
  SELECT COUNT(*) INTO v_count_reservasessao
  FROM "ReservaSessao" rs
  INNER JOIN "Consulta" c ON c."Id" = rs."ConsultaId"
  WHERE (
    -- PacienteNaoCompareceu → Cancelled_by_patient
    (c."Status" = 'PacienteNaoCompareceu' AND rs."Status" != 'Cancelled_by_patient')
    OR
    -- PsicologoNaoCompareceu → Cancelled_by_psychologist
    (c."Status" = 'PsicologoNaoCompareceu' AND rs."Status" != 'Cancelled_by_psychologist')
    OR
    -- AmbosNaoCompareceram → Cancelled_no_show
    (c."Status" = 'AmbosNaoCompareceram' AND rs."Status" != 'Cancelled_no_show')
    OR
    -- Agendada/Reservado → Reservado
    (c."Status" IN ('Agendada', 'Reservado') AND rs."Status" != 'Reservado')
    OR
    -- EmAndamento → Andamento
    (c."Status" = 'EmAndamento' AND rs."Status" != 'Andamento')
    OR
    -- Realizada → Concluido
    (c."Status" = 'Realizada' AND rs."Status" != 'Concluido')
    OR
    -- Reagendadas → Reagendada
    (c."Status" IN ('ReagendadaPacienteNoPrazo', 'ReagendadaPsicologoNoPrazo', 'ReagendadaPsicologoForaDoPrazo') 
     AND rs."Status" != 'Reagendada')
    OR
    -- ForaDaPlataforma → Fora_plataforma
    (c."Status" = 'ForaDaPlataforma' AND rs."Status" != 'Fora_plataforma')
    OR
    -- Cancelamentos por paciente → Cancelled_by_patient
    (c."Status" IN ('CanceladaPacienteNoPrazo', 'CanceladaPacienteForaDoPrazo', 'CanceladaNaoCumprimentoContratualPaciente')
     AND rs."Status" != 'Cancelled_by_patient')
    OR
    -- Cancelamentos por psicólogo → Cancelled_by_psychologist
    (c."Status" IN ('CanceladaPsicologoNoPrazo', 'CanceladaPsicologoForaDoPrazo', 'CanceladaNaoCumprimentoContratualPsicologo', 'PsicologoDescredenciado')
     AND rs."Status" != 'Cancelled_by_psychologist')
    OR
    -- Cancelamentos sistêmicos → Cancelado
    (c."Status" IN ('CanceladaForcaMaior', 'CanceladoAdministrador', 'Cancelado', 'CANCELAMENTO_SISTEMICO_PSICOLOGO', 'CANCELAMENTO_SISTEMICO_PACIENTE')
     AND rs."Status" != 'Cancelado')
  );

  -- Conta Agenda que precisam ser atualizadas
  SELECT COUNT(*) INTO v_count_agenda
  FROM "Agenda" a
  INNER JOIN "Consulta" c ON c."AgendaId" = a."Id"
  WHERE (
    -- PacienteNaoCompareceu → Cancelled_by_patient
    (c."Status" = 'PacienteNaoCompareceu' AND a."Status" != 'Cancelled_by_patient')
    OR
    -- PsicologoNaoCompareceu → Cancelled_by_psychologist
    (c."Status" = 'PsicologoNaoCompareceu' AND a."Status" != 'Cancelled_by_psychologist')
    OR
    -- AmbosNaoCompareceram → Cancelled_no_show
    (c."Status" = 'AmbosNaoCompareceram' AND a."Status" != 'Cancelled_no_show')
    OR
    -- Agendada/Reservado → Reservado
    (c."Status" IN ('Agendada', 'Reservado') AND a."Status" != 'Reservado')
    OR
    -- EmAndamento → Andamento
    (c."Status" = 'EmAndamento' AND a."Status" != 'Andamento')
    OR
    -- Realizada → Concluido
    (c."Status" = 'Realizada' AND a."Status" != 'Concluido')
    OR
    -- Reagendadas → Reagendada
    (c."Status" IN ('ReagendadaPacienteNoPrazo', 'ReagendadaPsicologoNoPrazo', 'ReagendadaPsicologoForaDoPrazo')
     AND a."Status" != 'Reagendada')
    OR
    -- ForaDaPlataforma → Fora_plataforma
    (c."Status" = 'ForaDaPlataforma' AND a."Status" != 'Fora_plataforma')
    OR
    -- Cancelamentos por paciente → Cancelled_by_patient
    (c."Status" IN ('CanceladaPacienteNoPrazo', 'CanceladaPacienteForaDoPrazo', 'CanceladaNaoCumprimentoContratualPaciente')
     AND a."Status" != 'Cancelled_by_patient')
    OR
    -- Cancelamentos por psicólogo → Cancelled_by_psychologist
    (c."Status" IN ('CanceladaPsicologoNoPrazo', 'CanceladaPsicologoForaDoPrazo', 'CanceladaNaoCumprimentoContratualPsicologo', 'PsicologoDescredenciado')
     AND a."Status" != 'Cancelled_by_psychologist')
    OR
    -- Cancelamentos sistêmicos → Cancelado
    (c."Status" IN ('CanceladaForcaMaior', 'CanceladoAdministrador', 'Cancelado', 'CANCELAMENTO_SISTEMICO_PSICOLOGO', 'CANCELAMENTO_SISTEMICO_PACIENTE')
     AND a."Status" != 'Cancelado')
  );

  RAISE NOTICE '📊 RESUMO:';
  RAISE NOTICE '   • ReservaSessao a atualizar: %', v_count_reservasessao;
  RAISE NOTICE '   • Agenda a atualizar: %', v_count_agenda;
END $$;

-- ============================================================================
-- PASSO 3: Atualiza ReservaSessao.Status baseado no Consulta.Status
-- ============================================================================
UPDATE "ReservaSessao" rs
SET 
  "Status" = CASE
    -- Status ativos/em andamento
    WHEN c."Status" IN ('Agendada', 'Reservado') THEN 'Reservado'::"AgendaStatus"
    WHEN c."Status" = 'EmAndamento' THEN 'Andamento'::"AgendaStatus"
    WHEN c."Status" = 'Realizada' THEN 'Concluido'::"AgendaStatus"
    
    -- Reagendadas → Reagendada
    WHEN c."Status" IN ('ReagendadaPacienteNoPrazo', 'ReagendadaPsicologoNoPrazo', 'ReagendadaPsicologoForaDoPrazo') 
      THEN 'Reagendada'::"AgendaStatus"
    
    -- Fora da plataforma → Fora_plataforma
    WHEN c."Status" = 'ForaDaPlataforma' THEN 'Fora_plataforma'::"AgendaStatus"
    
    -- Inatividade: Paciente não compareceu → Cancelled_by_patient
    WHEN c."Status" = 'PacienteNaoCompareceu' THEN 'Cancelled_by_patient'::"AgendaStatus"
    
    -- Inatividade: Psicólogo não compareceu → Cancelled_by_psychologist
    WHEN c."Status" = 'PsicologoNaoCompareceu' THEN 'Cancelled_by_psychologist'::"AgendaStatus"
    
    -- Inatividade: Ambos não compareceram → Cancelled_no_show
    WHEN c."Status" = 'AmbosNaoCompareceram' THEN 'Cancelled_no_show'::"AgendaStatus"
    
    -- Cancelamentos por paciente → Cancelled_by_patient
    WHEN c."Status" IN ('CanceladaPacienteNoPrazo', 'CanceladaPacienteForaDoPrazo', 'CanceladaNaoCumprimentoContratualPaciente')
      THEN 'Cancelled_by_patient'::"AgendaStatus"
    
    -- Cancelamentos por psicólogo → Cancelled_by_psychologist
    WHEN c."Status" IN ('CanceladaPsicologoNoPrazo', 'CanceladaPsicologoForaDoPrazo', 'CanceladaNaoCumprimentoContratualPsicologo', 'PsicologoDescredenciado')
      THEN 'Cancelled_by_psychologist'::"AgendaStatus"
    
    -- Cancelamentos sistêmicos/administrativos → Cancelado
    WHEN c."Status" IN ('CanceladaForcaMaior', 'CanceladoAdministrador', 'Cancelado', 'CANCELAMENTO_SISTEMICO_PSICOLOGO', 'CANCELAMENTO_SISTEMICO_PACIENTE')
      THEN 'Cancelado'::"AgendaStatus"
    
    -- Fallback: qualquer outro status cancelado → Cancelado
    WHEN c."Status"::text LIKE '%Cancel%' THEN 'Cancelado'::"AgendaStatus"
    
    -- Fallback padrão: mantém o status atual (não altera)
    ELSE rs."Status"
  END,
  "updatedAt" = now()
FROM "Consulta" c
WHERE rs."ConsultaId" = c."Id"
  AND (
    -- Só atualiza se o status precisa ser mudado
    (c."Status" IN ('Agendada', 'Reservado') AND rs."Status" != 'Reservado')
    OR (c."Status" = 'EmAndamento' AND rs."Status" != 'Andamento')
    OR (c."Status" = 'Realizada' AND rs."Status" != 'Concluido')
    OR (c."Status" IN ('ReagendadaPacienteNoPrazo', 'ReagendadaPsicologoNoPrazo', 'ReagendadaPsicologoForaDoPrazo') AND rs."Status" != 'Reagendada')
    OR (c."Status" = 'ForaDaPlataforma' AND rs."Status" != 'Fora_plataforma')
    OR (c."Status" = 'PacienteNaoCompareceu' AND rs."Status" != 'Cancelled_by_patient')
    OR (c."Status" = 'PsicologoNaoCompareceu' AND rs."Status" != 'Cancelled_by_psychologist')
    OR (c."Status" = 'AmbosNaoCompareceram' AND rs."Status" != 'Cancelled_no_show')
    OR (c."Status" IN ('CanceladaPacienteNoPrazo', 'CanceladaPacienteForaDoPrazo', 'CanceladaNaoCumprimentoContratualPaciente') AND rs."Status" != 'Cancelled_by_patient')
    OR (c."Status" IN ('CanceladaPsicologoNoPrazo', 'CanceladaPsicologoForaDoPrazo', 'CanceladaNaoCumprimentoContratualPsicologo', 'PsicologoDescredenciado') AND rs."Status" != 'Cancelled_by_psychologist')
    OR (c."Status" IN ('CanceladaForcaMaior', 'CanceladoAdministrador', 'Cancelado', 'CANCELAMENTO_SISTEMICO_PSICOLOGO', 'CANCELAMENTO_SISTEMICO_PACIENTE') AND rs."Status" != 'Cancelado')
    OR (c."Status"::text LIKE '%Cancel%' AND rs."Status" != 'Cancelado')
  );

-- ============================================================================
-- PASSO 4: Atualiza Agenda.Status baseado no Consulta.Status
-- ============================================================================
UPDATE "Agenda" a
SET 
  "Status" = CASE
    -- Status ativos/em andamento
    WHEN c."Status" IN ('Agendada', 'Reservado') THEN 'Reservado'::"AgendaStatus"
    WHEN c."Status" = 'EmAndamento' THEN 'Andamento'::"AgendaStatus"
    WHEN c."Status" = 'Realizada' THEN 'Concluido'::"AgendaStatus"
    
    -- Reagendadas → Reagendada
    WHEN c."Status" IN ('ReagendadaPacienteNoPrazo', 'ReagendadaPsicologoNoPrazo', 'ReagendadaPsicologoForaDoPrazo')
      THEN 'Reagendada'::"AgendaStatus"
    
    -- Fora da plataforma → Fora_plataforma
    WHEN c."Status" = 'ForaDaPlataforma' THEN 'Fora_plataforma'::"AgendaStatus"
    
    -- Inatividade: Paciente não compareceu → Cancelled_by_patient
    WHEN c."Status" = 'PacienteNaoCompareceu' THEN 'Cancelled_by_patient'::"AgendaStatus"
    
    -- Inatividade: Psicólogo não compareceu → Cancelled_by_psychologist
    WHEN c."Status" = 'PsicologoNaoCompareceu' THEN 'Cancelled_by_psychologist'::"AgendaStatus"
    
    -- Inatividade: Ambos não compareceram → Cancelled_no_show
    WHEN c."Status" = 'AmbosNaoCompareceram' THEN 'Cancelled_no_show'::"AgendaStatus"
    
    -- Cancelamentos por paciente → Cancelled_by_patient
    WHEN c."Status" IN ('CanceladaPacienteNoPrazo', 'CanceladaPacienteForaDoPrazo', 'CanceladaNaoCumprimentoContratualPaciente')
      THEN 'Cancelled_by_patient'::"AgendaStatus"
    
    -- Cancelamentos por psicólogo → Cancelled_by_psychologist
    WHEN c."Status" IN ('CanceladaPsicologoNoPrazo', 'CanceladaPsicologoForaDoPrazo', 'CanceladaNaoCumprimentoContratualPsicologo', 'PsicologoDescredenciado')
      THEN 'Cancelled_by_psychologist'::"AgendaStatus"
    
    -- Cancelamentos sistêmicos/administrativos → Cancelado
    WHEN c."Status" IN ('CanceladaForcaMaior', 'CanceladoAdministrador', 'Cancelado', 'CANCELAMENTO_SISTEMICO_PSICOLOGO', 'CANCELAMENTO_SISTEMICO_PACIENTE')
      THEN 'Cancelado'::"AgendaStatus"
    
    -- Fallback: qualquer outro status cancelado → Cancelado
    WHEN c."Status"::text LIKE '%Cancel%' THEN 'Cancelado'::"AgendaStatus"
    
    -- Fallback padrão: mantém o status atual (não altera)
    ELSE a."Status"
  END,
  "UpdatedAt" = now(),
  "PacienteId" = CASE
    -- Limpa PacienteId quando a consulta não está mais ativa
    WHEN c."Status" IN ('Agendada', 'Reservado', 'EmAndamento') THEN a."PacienteId"
    ELSE NULL
  END
FROM "Consulta" c
WHERE a."Id" = c."AgendaId"
  AND c."AgendaId" IS NOT NULL
  AND (
    -- Só atualiza se o status precisa ser mudado
    (c."Status" IN ('Agendada', 'Reservado') AND a."Status" != 'Reservado')
    OR (c."Status" = 'EmAndamento' AND a."Status" != 'Andamento')
    OR (c."Status" = 'Realizada' AND a."Status" != 'Concluido')
    OR (c."Status" IN ('ReagendadaPacienteNoPrazo', 'ReagendadaPsicologoNoPrazo', 'ReagendadaPsicologoForaDoPrazo') AND a."Status" != 'Reagendada')
    OR (c."Status" = 'ForaDaPlataforma' AND a."Status" != 'Fora_plataforma')
    OR (c."Status" = 'PacienteNaoCompareceu' AND a."Status" != 'Cancelled_by_patient')
    OR (c."Status" = 'PsicologoNaoCompareceu' AND a."Status" != 'Cancelled_by_psychologist')
    OR (c."Status" = 'AmbosNaoCompareceram' AND a."Status" != 'Cancelled_no_show')
    OR (c."Status" IN ('CanceladaPacienteNoPrazo', 'CanceladaPacienteForaDoPrazo', 'CanceladaNaoCumprimentoContratualPaciente') AND a."Status" != 'Cancelled_by_patient')
    OR (c."Status" IN ('CanceladaPsicologoNoPrazo', 'CanceladaPsicologoForaDoPrazo', 'CanceladaNaoCumprimentoContratualPsicologo', 'PsicologoDescredenciado') AND a."Status" != 'Cancelled_by_psychologist')
    OR (c."Status" IN ('CanceladaForcaMaior', 'CanceladoAdministrador', 'Cancelado', 'CANCELAMENTO_SISTEMICO_PSICOLOGO', 'CANCELAMENTO_SISTEMICO_PACIENTE') AND a."Status" != 'Cancelado')
    OR (c."Status"::text LIKE '%Cancel%' AND a."Status" != 'Cancelado')
  );

-- ============================================================================
-- PASSO 5: Mostra resumo final
-- ============================================================================
DO $$
DECLARE
  v_total_reservasessao INTEGER;
  v_total_agenda INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_reservasessao FROM "ReservaSessao";
  SELECT COUNT(*) INTO v_total_agenda FROM "Agenda";
  
  RAISE NOTICE '✅ ATUALIZAÇÃO CONCLUÍDA!';
  RAISE NOTICE '   • Total de ReservaSessao: %', v_total_reservasessao;
  RAISE NOTICE '   • Total de Agenda: %', v_total_agenda;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE: Se tudo estiver correto, execute COMMIT;';
  RAISE NOTICE '   Se houver problemas, execute ROLLBACK; para reverter';
END $$;

-- ============================================================================
-- IMPORTANTE: 
-- - Se estiver tudo OK, execute: COMMIT;
-- - Se houver problemas, execute: ROLLBACK;
-- ============================================================================

-- COMMIT;  -- Descomente esta linha após verificar que está tudo OK

-- ============================================================================
-- SCRIPT SIMPLES: Atualizar APENAS Status de Inatividade
-- ============================================================================
-- Este script atualiza APENAS os status de inatividade:
-- - PacienteNaoCompareceu → Cancelled_by_patient
-- - PsicologoNaoCompareceu → Cancelled_by_psychologist  
-- - AmbosNaoCompareceram → Cancelled_no_show
-- 
-- É mais seguro e focado apenas no problema de inatividade
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
    RAISE NOTICE '✅ Enum AmbosNaoCompareceram adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Enum AmbosNaoCompareceram já existe';
  END IF;
END $$;

-- ============================================================================
-- PASSO 2: Mostra o que será atualizado
-- ============================================================================
DO $$
DECLARE
  v_paciente_nao_compareceu INTEGER;
  v_psicologo_nao_compareceu INTEGER;
  v_ambos_nao_compareceram INTEGER;
BEGIN
  -- Conta consultas com status de inatividade
  SELECT COUNT(*) INTO v_paciente_nao_compareceu
  FROM "Consulta" 
  WHERE "Status" = 'PacienteNaoCompareceu';
  
  SELECT COUNT(*) INTO v_psicologo_nao_compareceu
  FROM "Consulta" 
  WHERE "Status" = 'PsicologoNaoCompareceu';
  
  SELECT COUNT(*) INTO v_ambos_nao_compareceram
  FROM "Consulta" 
  WHERE "Status" = 'AmbosNaoCompareceram';
  
  RAISE NOTICE '📊 CONSULTAS COM STATUS DE INATIVIDADE:';
  RAISE NOTICE '   • PacienteNaoCompareceu: %', v_paciente_nao_compareceu;
  RAISE NOTICE '   • PsicologoNaoCompareceu: %', v_psicologo_nao_compareceu;
  RAISE NOTICE '   • AmbosNaoCompareceram: %', v_ambos_nao_compareceram;
END $$;

-- ============================================================================
-- PASSO 3: Atualiza ReservaSessao.Status para status de inatividade
-- ============================================================================
UPDATE "ReservaSessao" rs
SET 
  "Status" = CASE
    WHEN c."Status" = 'PacienteNaoCompareceu' THEN 'Cancelled_by_patient'::"AgendaStatus"
    WHEN c."Status" = 'PsicologoNaoCompareceu' THEN 'Cancelled_by_psychologist'::"AgendaStatus"
    WHEN c."Status" = 'AmbosNaoCompareceram' THEN 'Cancelled_no_show'::"AgendaStatus"
    ELSE rs."Status"  -- Mantém o status atual se não for inatividade
  END,
  "updatedAt" = now()
FROM "Consulta" c
WHERE rs."ConsultaId" = c."Id"
  AND c."Status" IN ('PacienteNaoCompareceu', 'PsicologoNaoCompareceu', 'AmbosNaoCompareceram')
  AND (
    (c."Status" = 'PacienteNaoCompareceu' AND rs."Status" != 'Cancelled_by_patient')
    OR (c."Status" = 'PsicologoNaoCompareceu' AND rs."Status" != 'Cancelled_by_psychologist')
    OR (c."Status" = 'AmbosNaoCompareceram' AND rs."Status" != 'Cancelled_no_show')
  );

-- ============================================================================
-- PASSO 4: Atualiza Agenda.Status para status de inatividade
-- ============================================================================
UPDATE "Agenda" a
SET 
  "Status" = CASE
    WHEN c."Status" = 'PacienteNaoCompareceu' THEN 'Cancelled_by_patient'::"AgendaStatus"
    WHEN c."Status" = 'PsicologoNaoCompareceu' THEN 'Cancelled_by_psychologist'::"AgendaStatus"
    WHEN c."Status" = 'AmbosNaoCompareceram' THEN 'Cancelled_no_show'::"AgendaStatus"
    ELSE a."Status"  -- Mantém o status atual se não for inatividade
  END,
  "UpdatedAt" = now()
FROM "Consulta" c
WHERE a."Id" = c."AgendaId"
  AND c."AgendaId" IS NOT NULL
  AND c."Status" IN ('PacienteNaoCompareceu', 'PsicologoNaoCompareceu', 'AmbosNaoCompareceram')
  AND (
    (c."Status" = 'PacienteNaoCompareceu' AND a."Status" != 'Cancelled_by_patient')
    OR (c."Status" = 'PsicologoNaoCompareceu' AND a."Status" != 'Cancelled_by_psychologist')
    OR (c."Status" = 'AmbosNaoCompareceram' AND a."Status" != 'Cancelled_no_show')
  );

-- ============================================================================
-- PASSO 5: Mostra resumo final
-- ============================================================================
DO $$
DECLARE
  v_atualizados_reservasessao INTEGER;
  v_atualizados_agenda INTEGER;
BEGIN
  -- Conta quantos foram atualizados (apenas para mostrar)
  SELECT COUNT(*) INTO v_atualizados_reservasessao
  FROM "ReservaSessao" rs
  INNER JOIN "Consulta" c ON c."Id" = rs."ConsultaId"
  WHERE c."Status" IN ('PacienteNaoCompareceu', 'PsicologoNaoCompareceu', 'AmbosNaoCompareceram')
    AND (
      (c."Status" = 'PacienteNaoCompareceu' AND rs."Status" = 'Cancelled_by_patient')
      OR (c."Status" = 'PsicologoNaoCompareceu' AND rs."Status" = 'Cancelled_by_psychologist')
      OR (c."Status" = 'AmbosNaoCompareceram' AND rs."Status" = 'Cancelled_no_show')
    );
  
  SELECT COUNT(*) INTO v_atualizados_agenda
  FROM "Agenda" a
  INNER JOIN "Consulta" c ON c."AgendaId" = a."Id"
  WHERE c."Status" IN ('PacienteNaoCompareceu', 'PsicologoNaoCompareceu', 'AmbosNaoCompareceram')
    AND (
      (c."Status" = 'PacienteNaoCompareceu' AND a."Status" = 'Cancelled_by_patient')
      OR (c."Status" = 'PsicologoNaoCompareceu' AND a."Status" = 'Cancelled_by_psychologist')
      OR (c."Status" = 'AmbosNaoCompareceram' AND a."Status" = 'Cancelled_no_show')
    );
  
  RAISE NOTICE '✅ ATUALIZAÇÃO CONCLUÍDA!';
  RAISE NOTICE '   • ReservaSessao atualizadas: %', v_atualizados_reservasessao;
  RAISE NOTICE '   • Agenda atualizadas: %', v_atualizados_agenda;
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

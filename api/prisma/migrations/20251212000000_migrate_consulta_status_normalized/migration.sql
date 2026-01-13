-- Migration: Normalizar Status de Consultas
-- Data: 2025-12-12
-- Descrição: Atualiza os status de consultas para os novos valores normalizados conforme tabela de especificação

-- ============================================
-- PARTE 1: Criar o enum ConsultaStatus se não existir
-- ============================================

-- Cria o enum ConsultaStatus se não existir
DO $$ 
BEGIN
    -- Verifica se o tipo enum já existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsultaStatus') THEN
        -- Cria o enum com todos os valores
        CREATE TYPE "ConsultaStatus" AS ENUM (
            'Agendada',
            'EmAndamento',
            'Realizada',
            'PacienteNaoCompareceu',
            'PsicologoNaoCompareceu',
            'CanceladaPacienteNoPrazo',
            'CanceladaPsicologoNoPrazo',
            'ReagendadaPacienteNoPrazo',
            'ReagendadaPsicologoNoPrazo',
            'CanceladaPacienteForaDoPrazo',
            'CanceladaPsicologoForaDoPrazo',
            'CanceladaForcaMaior',
            'CanceladaNaoCumprimentoContratualPaciente',
            'ReagendadaPsicologoForaDoPrazo',
            'CanceladaNaoCumprimentoContratualPsicologo',
            'PsicologoDescredenciado',
            'CanceladoAdministrador',
            'Reservado',
            'Cancelado'
        );
    ELSE
        -- Se o enum já existe, adiciona valores que podem não existir
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Agendada' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'Agendada';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EmAndamento' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'EmAndamento';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Realizada' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'Realizada';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PacienteNaoCompareceu' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'PacienteNaoCompareceu';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PsicologoNaoCompareceu' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'PsicologoNaoCompareceu';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CanceladaPacienteNoPrazo' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'CanceladaPacienteNoPrazo';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CanceladaPsicologoNoPrazo' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'CanceladaPsicologoNoPrazo';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ReagendadaPacienteNoPrazo' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'ReagendadaPacienteNoPrazo';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ReagendadaPsicologoNoPrazo' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'ReagendadaPsicologoNoPrazo';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CanceladaPacienteForaDoPrazo' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'CanceladaPacienteForaDoPrazo';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CanceladaPsicologoForaDoPrazo' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'CanceladaPsicologoForaDoPrazo';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CanceladaForcaMaior' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'CanceladaForcaMaior';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CanceladaNaoCumprimentoContratualPaciente' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'CanceladaNaoCumprimentoContratualPaciente';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ReagendadaPsicologoForaDoPrazo' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'ReagendadaPsicologoForaDoPrazo';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CanceladaNaoCumprimentoContratualPsicologo' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'CanceladaNaoCumprimentoContratualPsicologo';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PsicologoDescredenciado' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'PsicologoDescredenciado';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CanceladoAdministrador' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'CanceladoAdministrador';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Reservado' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'Reservado';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Cancelado' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')) THEN
            ALTER TYPE "ConsultaStatus" ADD VALUE 'Cancelado';
        END IF;
    END IF;
END $$;

-- ============================================
-- PARTE 1.5: Alterar coluna Status para usar o enum (se ainda não estiver usando)
-- ============================================

-- Verifica se a coluna Status já é do tipo ConsultaStatus
DO $$ 
BEGIN
    -- Se a coluna Status não for do tipo ConsultaStatus, altera para usar o enum
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Consulta' 
        AND column_name = 'Status' 
        AND data_type != 'USER-DEFINED'
    ) THEN
        -- Primeiro, converte os valores de texto para o enum
        -- Cria uma coluna temporária com o enum
        ALTER TABLE "Consulta" ADD COLUMN "Status_temp" "ConsultaStatus";
        
        -- Migra os dados
        UPDATE "Consulta" 
        SET "Status_temp" = CASE
            WHEN "Status"::text = 'Agendado' THEN 'Agendada'::"ConsultaStatus"
            WHEN "Status"::text = 'Andamento' THEN 'EmAndamento'::"ConsultaStatus"
            WHEN "Status"::text IN ('Concluido', 'Concluído') THEN 'Realizada'::"ConsultaStatus"
            WHEN "Status"::text = 'Reagendada' THEN 'ReagendadaPacienteNoPrazo'::"ConsultaStatus"
            WHEN "Status"::text LIKE '%Cancelled_by_patient%' THEN 'CanceladaPacienteNoPrazo'::"ConsultaStatus"
            WHEN "Status"::text LIKE '%Cancelled_by_psychologist%' THEN 'CanceladaPsicologoNoPrazo'::"ConsultaStatus"
            WHEN "Status"::text LIKE '%Cancelled_no_show%' THEN 'PacienteNaoCompareceu'::"ConsultaStatus"
            WHEN "Status"::text = 'Reservado' THEN 'Reservado'::"ConsultaStatus"
            WHEN "Status"::text = 'Cancelado' THEN 'Cancelado'::"ConsultaStatus"
            ELSE 'Reservado'::"ConsultaStatus" -- Valor padrão para valores desconhecidos
        END;
        
        -- Remove a coluna antiga
        ALTER TABLE "Consulta" DROP COLUMN "Status";
        
        -- Renomeia a coluna temporária
        ALTER TABLE "Consulta" RENAME COLUMN "Status_temp" TO "Status";
        
        -- Define NOT NULL se necessário
        ALTER TABLE "Consulta" ALTER COLUMN "Status" SET NOT NULL;
    END IF;
END $$;

-- ============================================
-- PARTE 2: Migrar dados da tabela Consulta (após conversão para enum)
-- ============================================

-- Nota: Se a coluna já foi convertida para enum na PARTE 1.5, estas atualizações podem não ser necessárias
-- Mas mantemos para garantir que valores legados sejam atualizados corretamente
-- Estas atualizações só funcionam se a coluna já for do tipo enum

-- Atualiza valores que podem ter sido migrados incorretamente ou que precisam de ajuste
-- Usa casting seguro que funciona tanto com enum quanto com texto
DO $$
BEGIN
    -- Só executa se a coluna for do tipo enum
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Consulta' 
        AND column_name = 'Status' 
        AND udt_name = 'ConsultaStatus'
    ) THEN
        -- Atualiza valores que podem ter sido migrados incorretamente
        UPDATE "Consulta"
        SET "Status" = 'Agendada'::"ConsultaStatus"
        WHERE "Status"::text = 'Agendado';

        UPDATE "Consulta"
        SET "Status" = 'EmAndamento'::"ConsultaStatus"
        WHERE "Status"::text = 'Andamento';

        UPDATE "Consulta"
        SET "Status" = 'Realizada'::"ConsultaStatus"
        WHERE "Status"::text IN ('Concluido', 'Concluído');

        UPDATE "Consulta"
        SET "Status" = 'ReagendadaPacienteNoPrazo'::"ConsultaStatus"
        WHERE "Status"::text = 'Reagendada';

        -- Status de cancelamento específicos (se existirem como strings)
        UPDATE "Consulta"
        SET "Status" = 'CanceladaPacienteNoPrazo'::"ConsultaStatus"
        WHERE "Status"::text LIKE '%Cancelled_by_patient%';

        UPDATE "Consulta"
        SET "Status" = 'CanceladaPsicologoNoPrazo'::"ConsultaStatus"
        WHERE "Status"::text LIKE '%Cancelled_by_psychologist%';

        UPDATE "Consulta"
        SET "Status" = 'PacienteNaoCompareceu'::"ConsultaStatus"
        WHERE "Status"::text LIKE '%Cancelled_no_show%';
    END IF;
END $$;

-- ============================================
-- PARTE 3: Migrar dados da tabela ReservaSessao (Status usa AgendaStatus)
-- ============================================

-- Nota: ReservaSessao usa AgendaStatus, não ConsultaStatus
-- Os status de ReservaSessao são mapeados para AgendaStatus que já existe
-- Não precisa migrar aqui, mas podemos atualizar para manter consistência

-- ============================================
-- PARTE 4: Atualizar status baseado em CancelamentoSessao (lógica mais precisa)
-- ============================================

-- Atualiza status de consultas que têm CancelamentoSessao relacionado
-- para usar o tipo de cancelamento mais específico baseado no prazo
-- Usa o campo Data do CancelamentoSessao para verificar se foi dentro ou fora do prazo (24h antes da consulta)

-- Atualiza cancelamentos do tipo Paciente
UPDATE "Consulta" c
SET "Status" = CASE
    -- Verifica se o cancelamento foi feito 24h ou mais antes da consulta
    -- Se (data consulta - data cancelamento) >= 24h, então foi NoPrazo
    WHEN (DATE_TRUNC('day', c."Date") + (c."Time"::time)) - cs."Data" >= INTERVAL '24 hours'
    THEN 'CanceladaPacienteNoPrazo'::"ConsultaStatus"
    ELSE 'CanceladaPacienteForaDoPrazo'::"ConsultaStatus"
END
FROM "CancelamentoSessao" cs
WHERE cs."SessaoId" = c."Id" 
AND cs."Tipo" = 'Paciente'
AND cs."Status" = 'Deferido';

-- Atualiza cancelamentos do tipo Psicologo
UPDATE "Consulta" c
SET "Status" = CASE
    -- Verifica se o cancelamento foi feito 24h ou mais antes da consulta
    WHEN (DATE_TRUNC('day', c."Date") + (c."Time"::time)) - cs."Data" >= INTERVAL '24 hours'
    THEN 'CanceladaPsicologoNoPrazo'::"ConsultaStatus"
    ELSE 'CanceladaPsicologoForaDoPrazo'::"ConsultaStatus"
END
FROM "CancelamentoSessao" cs
WHERE cs."SessaoId" = c."Id" 
AND cs."Tipo" = 'Psicologo'
AND cs."Status" = 'Deferido';

-- Atualiza cancelamentos do tipo Sistema (força maior)
UPDATE "Consulta" c
SET "Status" = 'CanceladaForcaMaior'::"ConsultaStatus"
FROM "CancelamentoSessao" cs
WHERE cs."SessaoId" = c."Id" 
AND cs."Tipo" = 'Sistema'
AND cs."Status" = 'Deferido';

-- ============================================
-- PARTE 5: Atualizar status de consultas com base em data/hora (para status genéricos)
-- ============================================

-- Converte "Reservado" para "Agendada" se a consulta ainda não aconteceu
-- Nota: Mantém "Reservado" como status legado válido, mas converte para "Agendada" quando apropriado
UPDATE "Consulta"
SET "Status" = 'Agendada'::"ConsultaStatus"
WHERE "Status"::text = 'Reservado'
AND (DATE_TRUNC('day', "Date") + ("Time"::time)) > NOW();

-- Converte "Andamento" para "EmAndamento"
UPDATE "Consulta"
SET "Status" = 'EmAndamento'::"ConsultaStatus"
WHERE "Status"::text = 'Andamento';

-- Converte "Concluido"/"Concluído" para "Realizada"
UPDATE "Consulta"
SET "Status" = 'Realizada'::"ConsultaStatus"
WHERE "Status"::text IN ('Concluido', 'Concluído');

-- ============================================
-- PARTE 6: Log de migração
-- ============================================

-- Cria uma tabela temporária para log (opcional, pode ser removida depois)
DO $$
DECLARE
    total_consultas INTEGER;
    agendadas INTEGER;
    em_andamento INTEGER;
    realizadas INTEGER;
    canceladas INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_consultas FROM "Consulta";
    SELECT COUNT(*) INTO agendadas FROM "Consulta" WHERE "Status"::text = 'Agendada';
    SELECT COUNT(*) INTO em_andamento FROM "Consulta" WHERE "Status"::text = 'EmAndamento';
    SELECT COUNT(*) INTO realizadas FROM "Consulta" WHERE "Status"::text = 'Realizada';
    SELECT COUNT(*) INTO canceladas FROM "Consulta" WHERE "Status"::text LIKE 'Cancelada%';
    
    RAISE NOTICE 'Migração concluída:';
    RAISE NOTICE 'Total de consultas: %', total_consultas;
    RAISE NOTICE 'Agendadas: %', agendadas;
    RAISE NOTICE 'Em Andamento: %', em_andamento;
    RAISE NOTICE 'Realizadas: %', realizadas;
    RAISE NOTICE 'Canceladas: %', canceladas;
END $$;


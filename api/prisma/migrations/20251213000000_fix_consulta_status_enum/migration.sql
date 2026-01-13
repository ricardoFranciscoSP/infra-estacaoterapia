-- Migration: Corrigir enum ConsultaStatus
-- Data: 2025-12-13
-- Descrição: Cria o enum ConsultaStatus se não existir e converte a coluna Status de forma segura

-- ============================================
-- PARTE 1: Criar o enum ConsultaStatus se não existir
-- ============================================

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
        
        RAISE NOTICE 'Enum ConsultaStatus criado com sucesso';
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
        
        RAISE NOTICE 'Valores adicionados ao enum ConsultaStatus';
    END IF;
END $$;

-- ============================================
-- PARTE 2: Converter coluna Status de TEXT para enum (se necessário)
-- ============================================

DO $$ 
BEGIN
    -- Verifica se a coluna Status é TEXT e precisa ser convertida para enum
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Consulta' 
        AND column_name = 'Status' 
        AND data_type = 'text'
    ) THEN
        RAISE NOTICE 'Convertendo coluna Status de TEXT para enum ConsultaStatus...';
        
        -- Cria uma coluna temporária com o enum
        ALTER TABLE "Consulta" ADD COLUMN "Status_temp" "ConsultaStatus";
        
        -- Migra os dados existentes, mapeando valores antigos para novos
        UPDATE "Consulta" 
        SET "Status_temp" = CASE
            WHEN "Status"::text = 'Agendado' THEN 'Agendada'::"ConsultaStatus"
            WHEN "Status"::text = 'Andamento' THEN 'EmAndamento'::"ConsultaStatus"
            WHEN "Status"::text IN ('Concluido', 'Concluído', 'Concluido') THEN 'Realizada'::"ConsultaStatus"
            WHEN "Status"::text = 'Reagendada' THEN 'ReagendadaPacienteNoPrazo'::"ConsultaStatus"
            WHEN "Status"::text LIKE '%Cancelled_by_patient%' OR "Status"::text LIKE '%Cancelled_by_patient' THEN 'CanceladaPacienteNoPrazo'::"ConsultaStatus"
            WHEN "Status"::text LIKE '%Cancelled_by_psychologist%' OR "Status"::text LIKE '%Cancelled_by_psychologist' THEN 'CanceladaPsicologoNoPrazo'::"ConsultaStatus"
            WHEN "Status"::text LIKE '%Cancelled_no_show%' OR "Status"::text LIKE '%Cancelled_no_show' THEN 'PacienteNaoCompareceu'::"ConsultaStatus"
            WHEN "Status"::text = 'Reservado' THEN 'Reservado'::"ConsultaStatus"
            WHEN "Status"::text = 'Cancelado' THEN 'Cancelado'::"ConsultaStatus"
            -- Valores que já podem estar no formato enum (caso a migração anterior tenha sido parcialmente aplicada)
            WHEN "Status"::text = 'Agendada' THEN 'Agendada'::"ConsultaStatus"
            WHEN "Status"::text = 'EmAndamento' THEN 'EmAndamento'::"ConsultaStatus"
            WHEN "Status"::text = 'Realizada' THEN 'Realizada'::"ConsultaStatus"
            WHEN "Status"::text = 'PacienteNaoCompareceu' THEN 'PacienteNaoCompareceu'::"ConsultaStatus"
            WHEN "Status"::text = 'PsicologoNaoCompareceu' THEN 'PsicologoNaoCompareceu'::"ConsultaStatus"
            WHEN "Status"::text = 'CanceladaPacienteNoPrazo' THEN 'CanceladaPacienteNoPrazo'::"ConsultaStatus"
            WHEN "Status"::text = 'CanceladaPsicologoNoPrazo' THEN 'CanceladaPsicologoNoPrazo'::"ConsultaStatus"
            WHEN "Status"::text = 'ReagendadaPacienteNoPrazo' THEN 'ReagendadaPacienteNoPrazo'::"ConsultaStatus"
            WHEN "Status"::text = 'ReagendadaPsicologoNoPrazo' THEN 'ReagendadaPsicologoNoPrazo'::"ConsultaStatus"
            WHEN "Status"::text = 'CanceladaPacienteForaDoPrazo' THEN 'CanceladaPacienteForaDoPrazo'::"ConsultaStatus"
            WHEN "Status"::text = 'CanceladaPsicologoForaDoPrazo' THEN 'CanceladaPsicologoForaDoPrazo'::"ConsultaStatus"
            WHEN "Status"::text = 'CanceladaForcaMaior' THEN 'CanceladaForcaMaior'::"ConsultaStatus"
            WHEN "Status"::text = 'CanceladaNaoCumprimentoContratualPaciente' THEN 'CanceladaNaoCumprimentoContratualPaciente'::"ConsultaStatus"
            WHEN "Status"::text = 'ReagendadaPsicologoForaDoPrazo' THEN 'ReagendadaPsicologoForaDoPrazo'::"ConsultaStatus"
            WHEN "Status"::text = 'CanceladaNaoCumprimentoContratualPsicologo' THEN 'CanceladaNaoCumprimentoContratualPsicologo'::"ConsultaStatus"
            WHEN "Status"::text = 'PsicologoDescredenciado' THEN 'PsicologoDescredenciado'::"ConsultaStatus"
            WHEN "Status"::text = 'CanceladoAdministrador' THEN 'CanceladoAdministrador'::"ConsultaStatus"
            ELSE 'Reservado'::"ConsultaStatus" -- Valor padrão para valores desconhecidos
        END;
        
        -- Remove a coluna antiga
        ALTER TABLE "Consulta" DROP COLUMN "Status";
        
        -- Renomeia a coluna temporária
        ALTER TABLE "Consulta" RENAME COLUMN "Status_temp" TO "Status";
        
        -- Define NOT NULL e default
        ALTER TABLE "Consulta" ALTER COLUMN "Status" SET NOT NULL;
        ALTER TABLE "Consulta" ALTER COLUMN "Status" SET DEFAULT 'Reservado'::"ConsultaStatus";
        
        RAISE NOTICE 'Coluna Status convertida com sucesso para enum ConsultaStatus';
    ELSE
        -- Se a coluna já é do tipo enum, apenas verifica se precisa do default
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'Consulta' 
            AND column_name = 'Status' 
            AND udt_name = 'ConsultaStatus'
            AND column_default IS NULL
        ) THEN
            ALTER TABLE "Consulta" ALTER COLUMN "Status" SET DEFAULT 'Reservado'::"ConsultaStatus";
            RAISE NOTICE 'Default adicionado à coluna Status';
        ELSE
            RAISE NOTICE 'Coluna Status já está usando enum ConsultaStatus com default';
        END IF;
    END IF;
END $$;


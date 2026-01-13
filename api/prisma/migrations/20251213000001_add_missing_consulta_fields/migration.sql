-- Migration: Adicionar campos faltantes na tabela Consulta
-- Data: 2025-12-13
-- Descrição: Adiciona campos Faturada, OrigemStatus, TelaGatilho e AcaoSaldo que estão no schema mas não no banco

-- ============================================
-- PARTE 1: Adicionar campo Faturada
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Consulta' 
        AND column_name = 'Faturada'
    ) THEN
        ALTER TABLE "Consulta" ADD COLUMN "Faturada" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Campo Faturada adicionado à tabela Consulta';
    ELSE
        RAISE NOTICE 'Campo Faturada já existe na tabela Consulta';
    END IF;
END $$;

-- ============================================
-- PARTE 2: Adicionar campo OrigemStatus
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Consulta' 
        AND column_name = 'OrigemStatus'
    ) THEN
        ALTER TABLE "Consulta" ADD COLUMN "OrigemStatus" TEXT;
        RAISE NOTICE 'Campo OrigemStatus adicionado à tabela Consulta';
    ELSE
        RAISE NOTICE 'Campo OrigemStatus já existe na tabela Consulta';
    END IF;
END $$;

-- ============================================
-- PARTE 3: Adicionar campo TelaGatilho
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Consulta' 
        AND column_name = 'TelaGatilho'
    ) THEN
        ALTER TABLE "Consulta" ADD COLUMN "TelaGatilho" TEXT;
        RAISE NOTICE 'Campo TelaGatilho adicionado à tabela Consulta';
    ELSE
        RAISE NOTICE 'Campo TelaGatilho já existe na tabela Consulta';
    END IF;
END $$;

-- ============================================
-- PARTE 4: Adicionar campo AcaoSaldo
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Consulta' 
        AND column_name = 'AcaoSaldo'
    ) THEN
        ALTER TABLE "Consulta" ADD COLUMN "AcaoSaldo" TEXT NOT NULL DEFAULT 'Nao altera';
        RAISE NOTICE 'Campo AcaoSaldo adicionado à tabela Consulta';
    ELSE
        RAISE NOTICE 'Campo AcaoSaldo já existe na tabela Consulta';
    END IF;
END $$;


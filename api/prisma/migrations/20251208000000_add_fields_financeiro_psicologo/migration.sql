-- AlterTable
ALTER TABLE "FinanceiroPsicologo" ADD COLUMN IF NOT EXISTS "Periodo" TEXT,
ADD COLUMN IF NOT EXISTS "ConsultasRealizadas" INTEGER,
ADD COLUMN IF NOT EXISTS "DataPagamento" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "UrlDocumentoStorage" TEXT;

-- AlterEnum
-- Adicionar novo valor ao enum FinanceiroPsicologoStatus
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PagamentoEmAnalise' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'FinanceiroPsicologoStatus')) THEN
        ALTER TYPE "FinanceiroPsicologoStatus" ADD VALUE 'PagamentoEmAnalise';
    END IF;
END $$;

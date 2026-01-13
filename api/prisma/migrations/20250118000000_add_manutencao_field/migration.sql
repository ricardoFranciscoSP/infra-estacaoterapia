-- AlterTable
ALTER TABLE "Configuracao" ADD COLUMN IF NOT EXISTS "manutencao" BOOLEAN DEFAULT false;

-- Atualiza registros existentes para false se NULL
UPDATE "Configuracao" SET "manutencao" = false WHERE "manutencao" IS NULL;

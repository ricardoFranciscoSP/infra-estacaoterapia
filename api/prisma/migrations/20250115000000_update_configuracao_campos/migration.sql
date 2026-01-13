-- Adicionar novos campos
ALTER TABLE "Configuracao" ADD COLUMN IF NOT EXISTS "horarioGeracaoAutomaticaAgenda" TEXT;
ALTER TABLE "Configuracao" ADD COLUMN IF NOT EXISTS "percentualRepasseJuridico" DOUBLE PRECISION DEFAULT 40.0;
ALTER TABLE "Configuracao" ADD COLUMN IF NOT EXISTS "percentualRepasseAutonomo" DOUBLE PRECISION DEFAULT 32.0;

-- Migrar dados existentes para os novos campos
UPDATE "Configuracao" SET "percentualRepasseJuridico" = 40.0 WHERE "percentualRepasseJuridico" IS NULL;
UPDATE "Configuracao" SET "percentualRepasseAutonomo" = 32.0 WHERE "percentualRepasseAutonomo" IS NULL;

-- Remover campos desnecessários
ALTER TABLE "Configuracao" DROP COLUMN IF EXISTS "gatewayPagamento";
ALTER TABLE "Configuracao" DROP COLUMN IF EXISTS "moedaPadrao";
ALTER TABLE "Configuracao" DROP COLUMN IF EXISTS "taxaAdministrativa";
ALTER TABLE "Configuracao" DROP COLUMN IF EXISTS "percentualRepassePsicologo";


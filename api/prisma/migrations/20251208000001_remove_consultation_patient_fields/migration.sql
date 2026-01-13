-- AlterTable: Remover campos ConsultationId e PatientId da tabela FinanceiroPsicologo
ALTER TABLE "FinanceiroPsicologo" DROP COLUMN IF EXISTS "ConsultationId";
ALTER TABLE "FinanceiroPsicologo" DROP COLUMN IF EXISTS "PatientId";

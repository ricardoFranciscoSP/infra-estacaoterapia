-- DropIndex
DROP INDEX "Fatura_CodigoFatura_Status_idx";

-- DropIndex
DROP INDEX "Fatura_Status_idx";

-- DropIndex
DROP INDEX "Financeiro_FaturaId_Status_idx";

-- DropIndex
DROP INDEX "Financeiro_Status_idx";

-- DropIndex
DROP INDEX "Job_Status_RunAt_idx";

-- DropIndex
DROP INDEX "Job_Type_Status_idx";

-- DropIndex
DROP INDEX "ReservaSessao_ScheduledAt_Status_idx";

-- DropIndex
DROP INDEX "ReservaSessao_Status_idx";

-- AlterTable
ALTER TABLE "Configuracao" ALTER COLUMN "backupScheduleEnabled" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Solicitacoes" ADD COLUMN     "PublicoFinanceiro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "PublicoPacientes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "PublicoPsicologos" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "PublicoTodos" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SolicitacaoDestinatario" (
    "Id" TEXT NOT NULL,
    "SolicitacaoId" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitacaoDestinatario_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE INDEX "SolicitacaoDestinatario_UserId_idx" ON "SolicitacaoDestinatario"("UserId");

-- CreateIndex
CREATE INDEX "SolicitacaoDestinatario_SolicitacaoId_idx" ON "SolicitacaoDestinatario"("SolicitacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitacaoDestinatario_SolicitacaoId_UserId_key" ON "SolicitacaoDestinatario"("SolicitacaoId", "UserId");

-- CreateIndex
CREATE INDEX "ReservaSessao_ScheduledAt_idx" ON "ReservaSessao"("ScheduledAt");

-- AddForeignKey
ALTER TABLE "SolicitacaoDestinatario" ADD CONSTRAINT "SolicitacaoDestinatario_SolicitacaoId_fkey" FOREIGN KEY ("SolicitacaoId") REFERENCES "Solicitacoes"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoDestinatario" ADD CONSTRAINT "SolicitacaoDestinatario_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

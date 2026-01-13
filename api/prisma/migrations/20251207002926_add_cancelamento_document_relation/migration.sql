-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "CancelamentoSessaoId" TEXT;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_CancelamentoSessaoId_fkey" FOREIGN KEY ("CancelamentoSessaoId") REFERENCES "CancelamentoSessao"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

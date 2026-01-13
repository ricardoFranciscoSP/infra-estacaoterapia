-- AlterTable
ALTER TABLE "Document" ADD COLUMN "SolicitacaoId" TEXT;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_SolicitacaoId_fkey" FOREIGN KEY ("SolicitacaoId") REFERENCES "Solicitacoes"("Id") ON DELETE SET NULL ON UPDATE CASCADE;



















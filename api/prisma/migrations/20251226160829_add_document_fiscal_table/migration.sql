-- CreateTable
CREATE TABLE "Document_fiscal" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "SolicitacaoId" TEXT NOT NULL,
    "Url" TEXT NOT NULL,
    "NomeArquivo" TEXT NOT NULL,
    "TipoDocumento" TEXT NOT NULL,
    "TamanhoByte" INTEGER,
    "MimeType" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_fiscal_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE INDEX "Document_fiscal_UserId_idx" ON "Document_fiscal"("UserId");

-- CreateIndex
CREATE INDEX "Document_fiscal_SolicitacaoId_idx" ON "Document_fiscal"("SolicitacaoId");

-- AddForeignKey
ALTER TABLE "Document_fiscal" ADD CONSTRAINT "Document_fiscal_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document_fiscal" ADD CONSTRAINT "Document_fiscal_SolicitacaoId_fkey" FOREIGN KEY ("SolicitacaoId") REFERENCES "Solicitacoes"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

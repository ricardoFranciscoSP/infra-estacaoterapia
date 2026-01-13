-- CreateTable
CREATE TABLE "Banner" (
    "Id" TEXT NOT NULL,
    "Titulo" TEXT,
    "Descricao" TEXT,
    "UrlImagemDesktop" TEXT NOT NULL,
    "UrlImagemMobile" TEXT NOT NULL,
    "LinkDestino" TEXT,
    "Ordem" INTEGER NOT NULL DEFAULT 0,
    "Ativo" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "CreatedBy" TEXT NOT NULL,
    "UpdatedBy" TEXT,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE INDEX "Banner_Ativo_idx" ON "Banner"("Ativo");

-- CreateIndex
CREATE INDEX "Banner_Ordem_idx" ON "Banner"("Ordem");

-- AddForeignKey
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_CreatedBy_fkey" FOREIGN KEY ("CreatedBy") REFERENCES "User"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_UpdatedBy_fkey" FOREIGN KEY ("UpdatedBy") REFERENCES "User"("Id") ON DELETE SET NULL ON UPDATE CASCADE;


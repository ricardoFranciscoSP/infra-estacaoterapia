-- CreateTable
CREATE TABLE "PolicyDocument" (
    "Id" TEXT NOT NULL,
    "Titulo" TEXT NOT NULL,
    "Descricao" TEXT,
    "Url" TEXT NOT NULL,
    "Tipo" TEXT NOT NULL DEFAULT 'pdf',
    "PublicoPara" TEXT NOT NULL DEFAULT 'todos',
    "Ordem" INTEGER DEFAULT 0,
    "Ativo" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "CreatedById" TEXT,
    "UpdatedById" TEXT,

    CONSTRAINT "PolicyDocument_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE INDEX "PolicyDocument_PublicoPara_idx" ON "PolicyDocument"("PublicoPara");

-- CreateIndex
CREATE INDEX "PolicyDocument_Ativo_idx" ON "PolicyDocument"("Ativo");

-- AddForeignKey
ALTER TABLE "PolicyDocument" ADD CONSTRAINT "PolicyDocument_CreatedById_fkey" FOREIGN KEY ("CreatedById") REFERENCES "User"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyDocument" ADD CONSTRAINT "PolicyDocument_UpdatedById_fkey" FOREIGN KEY ("UpdatedById") REFERENCES "User"("Id") ON DELETE SET NULL ON UPDATE CASCADE;


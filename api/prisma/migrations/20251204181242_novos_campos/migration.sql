-- CreateEnum
CREATE TYPE "RacaCor" AS ENUM ('Branca', 'Preta', 'Parda', 'Amarela', 'Indigena', 'PrefiroNaoInformar');

-- AlterTable
ALTER TABLE "PessoalJuridica" ADD COLUMN     "DescricaoExtenso" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "RacaCor" "RacaCor",
ADD COLUMN     "WhatsApp" TEXT;

-- CreateTable
CREATE TABLE "EnderecoEmpresa" (
    "Id" TEXT NOT NULL,
    "PessoalJuridicaId" TEXT NOT NULL,
    "Rua" TEXT NOT NULL,
    "Numero" TEXT,
    "Complemento" TEXT,
    "Bairro" TEXT NOT NULL,
    "Cidade" TEXT NOT NULL,
    "Estado" TEXT NOT NULL,
    "Cep" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnderecoEmpresa_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnderecoEmpresa_PessoalJuridicaId_key" ON "EnderecoEmpresa"("PessoalJuridicaId");

-- AddForeignKey
ALTER TABLE "EnderecoEmpresa" ADD CONSTRAINT "EnderecoEmpresa_PessoalJuridicaId_fkey" FOREIGN KEY ("PessoalJuridicaId") REFERENCES "PessoalJuridica"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

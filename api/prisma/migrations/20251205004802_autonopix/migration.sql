/*
  Warnings:

  - A unique constraint covering the columns `[PsicologoAutonomoId]` on the table `DadosBancarios` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DadosBancarios" ADD COLUMN     "PsicologoAutonomoId" TEXT,
ALTER COLUMN "PessoalJuridicaId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DadosBancarios_PsicologoAutonomoId_key" ON "DadosBancarios"("PsicologoAutonomoId");

-- CreateIndex
CREATE INDEX "DadosBancarios_PessoalJuridicaId_idx" ON "DadosBancarios"("PessoalJuridicaId");

-- CreateIndex
CREATE INDEX "DadosBancarios_PsicologoAutonomoId_idx" ON "DadosBancarios"("PsicologoAutonomoId");

-- AddForeignKey
ALTER TABLE "DadosBancarios" ADD CONSTRAINT "DadosBancarios_PsicologoAutonomoId_fkey" FOREIGN KEY ("PsicologoAutonomoId") REFERENCES "ProfessionalProfile"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

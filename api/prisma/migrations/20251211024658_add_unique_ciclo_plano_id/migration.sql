/*
  Warnings:

  - A unique constraint covering the columns `[CicloPlanoId]` on the table `Financeiro` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Financeiro_CicloPlanoId_key" ON "Financeiro"("CicloPlanoId");

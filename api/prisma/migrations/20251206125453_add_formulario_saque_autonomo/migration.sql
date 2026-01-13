-- CreateTable
CREATE TABLE "FormularioSaqueAutonomo" (
    "Id" TEXT NOT NULL,
    "PsicologoAutonomoId" TEXT NOT NULL,
    "NumeroRg" TEXT,
    "DataEmissaoRg" TEXT,
    "OrgaoEmissor" TEXT,
    "UfOrgaoEmissor" TEXT,
    "DataNascimento" TEXT,
    "Nacionalidade" TEXT,
    "CidadeNascimentoPessoa" TEXT,
    "EstadoNascimentoPessoa" TEXT,
    "Sexo" TEXT,
    "Raca" TEXT,
    "EstadoCivil" TEXT,
    "NomeConjuge" TEXT,
    "RegimeBens" TEXT,
    "PossuiDependente" TEXT,
    "TipoDependente" TEXT,
    "NomeDependente" TEXT,
    "CpfDependente" TEXT,
    "DataNascimentoDependente" TEXT,
    "CidadeNascimento" TEXT,
    "EstadoNascimento" TEXT,
    "PossuiDeficiencia" TEXT,
    "ChavePix" TEXT,
    "Status" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormularioSaqueAutonomo_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormularioSaqueAutonomo_PsicologoAutonomoId_key" ON "FormularioSaqueAutonomo"("PsicologoAutonomoId");

-- AddForeignKey
ALTER TABLE "FormularioSaqueAutonomo" ADD CONSTRAINT "FormularioSaqueAutonomo_PsicologoAutonomoId_fkey" FOREIGN KEY ("PsicologoAutonomoId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Atualiza enum de experiência clínica para os novos intervalos
-- mapeando valores antigos para os novos buckets.

-- CreateEnum
CREATE TYPE "ExperienciaClinica_new" AS ENUM (
  'Entre1_5Anos',
  'Entre6_10Anos',
  'Entre11_15Anos',
  'Entre15_20Anos',
  'Mais20Anos'
);

-- AlterTable
ALTER TABLE "ProfessionalProfile"
  ALTER COLUMN "ExperienciaClinica" TYPE "ExperienciaClinica_new"
  USING (
    CASE ("ExperienciaClinica"::text)
      WHEN 'Menos1Ano' THEN 'Entre1_5Anos'
      WHEN 'Entre1_3Anos' THEN 'Entre1_5Anos'
      WHEN 'Entre3_5Anos' THEN 'Entre1_5Anos'
      WHEN 'Entre5_10Anos' THEN 'Entre6_10Anos'
      WHEN 'Mais10Anos' THEN 'Entre11_15Anos'
      WHEN 'Nenhuma' THEN NULL
      ELSE NULL
    END
  )::"ExperienciaClinica_new";

-- DropEnum
DROP TYPE "ExperienciaClinica";

-- RenameEnum
ALTER TYPE "ExperienciaClinica_new" RENAME TO "ExperienciaClinica";

-- Add backup schedule fields to Configuracao
ALTER TABLE "Configuracao"
ADD COLUMN "backupScheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "backupScheduleDayOfWeek" INTEGER,
ADD COLUMN "backupScheduleTime" TEXT;

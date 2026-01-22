-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('AVAILABLE', 'FAILED');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('supabase');

-- CreateTable
CREATE TABLE "DatabaseBackup" (
    "Id" TEXT NOT NULL,
    "Filename" TEXT NOT NULL,
    "Bucket" TEXT NOT NULL,
    "Path" TEXT NOT NULL,
    "Size" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedById" TEXT,
    "Status" "BackupStatus" NOT NULL DEFAULT 'AVAILABLE',
    "StorageProvider" "StorageProvider" NOT NULL DEFAULT 'supabase',
    "DownloadExpiresAt" TIMESTAMP(3),

    CONSTRAINT "DatabaseBackup_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DatabaseBackup_Filename_key" ON "DatabaseBackup"("Filename");

-- CreateIndex
CREATE INDEX "DatabaseBackup_CreatedAt_idx" ON "DatabaseBackup"("CreatedAt");

-- CreateIndex
CREATE INDEX "DatabaseBackup_Status_idx" ON "DatabaseBackup"("Status");

-- AddForeignKey
ALTER TABLE "DatabaseBackup" ADD CONSTRAINT "DatabaseBackup_CreatedById_fkey" FOREIGN KEY ("CreatedById") REFERENCES "User"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

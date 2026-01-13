-- AlterTable
ALTER TABLE "AdminActionLog" ADD COLUMN     "IpAddress" TEXT,
ADD COLUMN     "Status" TEXT DEFAULT 'Sucesso',
ADD COLUMN     "Metadata" TEXT;

-- CreateTable
CREATE TABLE "PasswordReset" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "TokenHash" TEXT NOT NULL,
    "ExpiresAt" TIMESTAMP(3) NOT NULL,
    "UsedAt" TIMESTAMP(3),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" TEXT NOT NULL,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("Id")
);

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_CreatedBy_fkey" FOREIGN KEY ("CreatedBy") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;


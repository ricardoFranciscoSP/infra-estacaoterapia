-- Add missing Review title column
ALTER TABLE "Review"
    ADD COLUMN IF NOT EXISTS "Titulo" TEXT;

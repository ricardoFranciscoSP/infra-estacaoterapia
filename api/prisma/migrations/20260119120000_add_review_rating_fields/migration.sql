-- Add missing Review columns and rating aggregates for psychologists
ALTER TABLE "Review"
    ADD COLUMN IF NOT EXISTS "Titulo" TEXT;

ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "RatingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "RatingCount" INTEGER NOT NULL DEFAULT 0;

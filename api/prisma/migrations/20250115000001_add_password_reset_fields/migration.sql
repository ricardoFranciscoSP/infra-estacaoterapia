-- Adicionar campos para redefinição de senha
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ResetPasswordTokenExpiresAt" TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "MustChangePassword" BOOLEAN NOT NULL DEFAULT false;


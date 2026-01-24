-- Migration manual para adicionar Fora_plataforma ao enum AgendaStatus
ALTER TYPE "AgendaStatus" ADD VALUE IF NOT EXISTS 'Fora_plataforma';

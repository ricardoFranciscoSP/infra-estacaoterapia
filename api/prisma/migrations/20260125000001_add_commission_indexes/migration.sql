-- Adiciona índices para otimizar queries de Commission
-- Melhora performance de agregações e filtros por PsicologoId, Status, Periodo e ConsultaId

CREATE INDEX IF NOT EXISTS "Commission_PsicologoId_Status_idx" ON "Commission"("PsicologoId", "Status");
CREATE INDEX IF NOT EXISTS "Commission_ConsultaId_idx" ON "Commission"("ConsultaId");
CREATE INDEX IF NOT EXISTS "Commission_Periodo_idx" ON "Commission"("Periodo");
CREATE INDEX IF NOT EXISTS "Commission_Status_idx" ON "Commission"("Status");
CREATE INDEX IF NOT EXISTS "Commission_PsicologoId_Periodo_idx" ON "Commission"("PsicologoId", "Periodo");

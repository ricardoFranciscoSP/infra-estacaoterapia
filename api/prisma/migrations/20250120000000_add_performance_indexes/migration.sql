-- CreateIndex
CREATE INDEX IF NOT EXISTS "Job_Status_RunAt_idx" ON "Job"("Status", "RunAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Job_Type_Status_idx" ON "Job"("Type", "Status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReservaSessao_ScheduledAt_Status_idx" ON "ReservaSessao"("ScheduledAt", "Status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReservaSessao_Status_idx" ON "ReservaSessao"("Status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Fatura_CodigoFatura_Status_idx" ON "Fatura"("CodigoFatura", "Status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Fatura_Status_idx" ON "Fatura"("Status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Financeiro_FaturaId_Status_idx" ON "Financeiro"("FaturaId", "Status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Financeiro_Status_idx" ON "Financeiro"("Status");


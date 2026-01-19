-- Materialized view for psychologist available slots (performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS "AgendaDisponibilidadeResumo" AS
SELECT
    "PsicologoId",
    COUNT(*)::int AS "Disponiveis"
FROM "Agenda"
WHERE "Status" = 'Disponivel'
  AND (
    "Data"::date > CURRENT_DATE
    OR (
      "Data"::date = CURRENT_DATE
      AND "Horario" >= TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')
    )
  )
GROUP BY "PsicologoId";

-- Required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS "AgendaDisponibilidadeResumo_PsicologoId_key"
    ON "AgendaDisponibilidadeResumo" ("PsicologoId");

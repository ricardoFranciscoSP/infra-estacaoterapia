-- Corrige o trigger trg_sync_status_consulta: CASE retorna text, mas
-- ReservaSessao.Status e Agenda.Status são "AgendaStatus". PostgreSQL não
-- permite comparar enum com text sem cast explícito (operador não existe: "AgendaStatus" = text).
-- Usamos variável tipada e cast (CASE)::"AgendaStatus".
-- Inclui mapeamento ForaDaPlataforma (ConsultaStatus) -> Fora_plataforma (AgendaStatus).

CREATE OR REPLACE FUNCTION trg_sync_status_consulta()
RETURNS TRIGGER AS $$
DECLARE
  new_agenda_status "AgendaStatus";
BEGIN
  new_agenda_status := (
    CASE
      WHEN NEW."Status" IN ('Agendada', 'Reservado') THEN 'Reservado'
      WHEN NEW."Status" = 'EmAndamento' THEN 'Andamento'
      WHEN NEW."Status" = 'Realizada' THEN 'Concluido'
      WHEN NEW."Status" IN (
        'ReagendadaPacienteNoPrazo',
        'ReagendadaPsicologoNoPrazo',
        'ReagendadaPsicologoForaDoPrazo'
      ) THEN 'Reagendada'
      WHEN NEW."Status" = 'ForaDaPlataforma' THEN 'Fora_plataforma'
      ELSE 'Cancelado'
    END
  )::"AgendaStatus";

  PERFORM set_config('app.consulta_sync', 'true', true);

  UPDATE "ReservaSessao"
    SET "Status" = new_agenda_status,
        "updatedAt" = now(),
        "AgoraTokenPatient" = CASE
          WHEN NEW."Status" IN ('Agendada', 'Reservado', 'EmAndamento') THEN "AgoraTokenPatient"
          ELSE NULL
        END,
        "AgoraTokenPsychologist" = CASE
          WHEN NEW."Status" IN ('Agendada', 'Reservado', 'EmAndamento') THEN "AgoraTokenPsychologist"
          ELSE NULL
        END,
        "Uid" = CASE
          WHEN NEW."Status" IN ('Agendada', 'Reservado', 'EmAndamento') THEN "Uid"
          ELSE NULL
        END,
        "UidPsychologist" = CASE
          WHEN NEW."Status" IN ('Agendada', 'Reservado', 'EmAndamento') THEN "UidPsychologist"
          ELSE NULL
        END
  WHERE "ConsultaId" = NEW."Id"
    AND "Status" IS DISTINCT FROM new_agenda_status;

  IF NEW."AgendaId" IS NOT NULL THEN
    UPDATE "Agenda"
      SET "Status" = new_agenda_status,
          "UpdatedAt" = now(),
          "PacienteId" = CASE
            WHEN NEW."Status" IN ('Agendada', 'Reservado', 'EmAndamento') THEN "PacienteId"
            ELSE NULL
          END
    WHERE "Id" = NEW."AgendaId"
      AND "Status" IS DISTINCT FROM new_agenda_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE "Consulta"
ADD COLUMN IF NOT EXISTS "InicioEm" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "FimEm" TIMESTAMP(3);

CREATE OR REPLACE FUNCTION trg_set_consulta_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."Status" = 'EmAndamento'
     AND OLD."Status" IS DISTINCT FROM 'EmAndamento' THEN
    NEW."InicioEm" := timezone('America/Sao_Paulo', now());
  END IF;

  IF NEW."Status" = 'Realizada'
     AND OLD."Status" IS DISTINCT FROM 'Realizada' THEN
    NEW."FimEm" := timezone('America/Sao_Paulo', now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_before_update_consulta_status ON "Consulta";
CREATE TRIGGER trg_before_update_consulta_status
BEFORE UPDATE OF "Status" ON "Consulta"
FOR EACH ROW
EXECUTE FUNCTION trg_set_consulta_timestamps();

CREATE OR REPLACE FUNCTION trg_sync_status_consulta()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM set_config('app.consulta_sync', 'true', true);

  UPDATE "ReservaSessao"
    SET "Status" = CASE
      WHEN NEW."Status" IN ('Agendada', 'Reservado') THEN 'Reservado'
      WHEN NEW."Status" = 'EmAndamento' THEN 'Andamento'
      WHEN NEW."Status" = 'Realizada' THEN 'Concluido'
      WHEN NEW."Status" IN (
        'ReagendadaPacienteNoPrazo',
        'ReagendadaPsicologoNoPrazo',
        'ReagendadaPsicologoForaDoPrazo'
      ) THEN 'Reagendada'
      ELSE 'Cancelado'
    END,
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
    AND "Status" IS DISTINCT FROM CASE
      WHEN NEW."Status" IN ('Agendada', 'Reservado') THEN 'Reservado'
      WHEN NEW."Status" = 'EmAndamento' THEN 'Andamento'
      WHEN NEW."Status" = 'Realizada' THEN 'Concluido'
      WHEN NEW."Status" IN (
        'ReagendadaPacienteNoPrazo',
        'ReagendadaPsicologoNoPrazo',
        'ReagendadaPsicologoForaDoPrazo'
      ) THEN 'Reagendada'
      ELSE 'Cancelado'
    END;

  IF NEW."AgendaId" IS NOT NULL THEN
    UPDATE "Agenda"
      SET "Status" = CASE
        WHEN NEW."Status" IN ('Agendada', 'Reservado') THEN 'Reservado'
        WHEN NEW."Status" = 'EmAndamento' THEN 'Andamento'
        WHEN NEW."Status" = 'Realizada' THEN 'Concluido'
        WHEN NEW."Status" IN (
          'ReagendadaPacienteNoPrazo',
          'ReagendadaPsicologoNoPrazo',
          'ReagendadaPsicologoForaDoPrazo'
        ) THEN 'Reagendada'
        ELSE 'Cancelado'
      END,
          "UpdatedAt" = now(),
          "PacienteId" = CASE
            WHEN NEW."Status" IN ('Agendada', 'Reservado', 'EmAndamento') THEN "PacienteId"
            ELSE NULL
          END
    WHERE "Id" = NEW."AgendaId"
      AND "Status" IS DISTINCT FROM CASE
        WHEN NEW."Status" IN ('Agendada', 'Reservado') THEN 'Reservado'
        WHEN NEW."Status" = 'EmAndamento' THEN 'Andamento'
        WHEN NEW."Status" = 'Realizada' THEN 'Concluido'
        WHEN NEW."Status" IN (
          'ReagendadaPacienteNoPrazo',
          'ReagendadaPsicologoNoPrazo',
          'ReagendadaPsicologoForaDoPrazo'
        ) THEN 'Reagendada'
        ELSE 'Cancelado'
      END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_update_consulta_status ON "Consulta";
CREATE TRIGGER trg_after_update_consulta_status
AFTER UPDATE OF "Status" ON "Consulta"
FOR EACH ROW
WHEN (OLD."Status" IS DISTINCT FROM NEW."Status")
EXECUTE FUNCTION trg_sync_status_consulta();

CREATE OR REPLACE FUNCTION trg_block_reservasessao_status_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."Status" IS DISTINCT FROM OLD."Status" THEN
    IF current_setting('app.consulta_sync', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Atualize o status via Consulta (fonte de verdade)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS block_reservasessao_status_update ON "ReservaSessao";
CREATE TRIGGER block_reservasessao_status_update
BEFORE UPDATE OF "Status" ON "ReservaSessao"
FOR EACH ROW
EXECUTE FUNCTION trg_block_reservasessao_status_update();

CREATE OR REPLACE FUNCTION trg_block_agenda_status_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."Status" IS DISTINCT FROM OLD."Status" THEN
    IF current_setting('app.consulta_sync', true) = 'true' THEN
      RETURN NEW;
    END IF;

    IF EXISTS (SELECT 1 FROM "Consulta" WHERE "AgendaId" = NEW."Id" LIMIT 1) THEN
      RAISE EXCEPTION 'Atualize o status via Consulta (fonte de verdade)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS block_agenda_status_update ON "Agenda";
CREATE TRIGGER block_agenda_status_update
BEFORE UPDATE OF "Status" ON "Agenda"
FOR EACH ROW
EXECUTE FUNCTION trg_block_agenda_status_update();

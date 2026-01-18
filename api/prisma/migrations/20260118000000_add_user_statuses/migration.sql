DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PendenteDocumentacao' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserStatus')) THEN
        ALTER TYPE "UserStatus" ADD VALUE 'PendenteDocumentacao';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'AnaliseContrato' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserStatus')) THEN
        ALTER TYPE "UserStatus" ADD VALUE 'AnaliseContrato';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Reprovado' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserStatus')) THEN
        ALTER TYPE "UserStatus" ADD VALUE 'Reprovado';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DescredenciadoVoluntario' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserStatus')) THEN
        ALTER TYPE "UserStatus" ADD VALUE 'DescredenciadoVoluntario';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DescredenciadoInvoluntario' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserStatus')) THEN
        ALTER TYPE "UserStatus" ADD VALUE 'DescredenciadoInvoluntario';
    END IF;
END $$;

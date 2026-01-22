import path from "path";
import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import prisma from "../../prisma/client";
import { createSignedUrl, deleteFile, uploadFile, STORAGE_BUCKET_BACKUPS } from "../storage.services";

const execFileAsync = promisify(execFile);

export interface BackupItem {
  id: string;
  filename: string;
  bucket: string;
  path: string;
  size: number;
  createdAt: string;
  createdBy: string | null;
  status: string;
  storageProvider: string;
  downloadExpiresAt: string | null;
}

type DbConfig = {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
};

export class BackupService {
  private static getBackupDir(): string {
    const baseDir = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
    return path.resolve(baseDir);
  }

  private static async ensureBackupDir(): Promise<string> {
    const dir = BackupService.getBackupDir();
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  private static parseDatabaseUrl(): DbConfig {
    const urlValue = process.env.BACKUP_DATABASE_URL || process.env.DATABASE_URL;
    if (!urlValue) {
      throw Object.assign(new Error("DATABASE_URL não configurada para backup"), { status: 500 });
    }

    let parsed: URL;
    try {
      parsed = new URL(urlValue);
    } catch (error) {
      throw Object.assign(new Error("DATABASE_URL inválida para backup"), { status: 500 });
    }

    const database = parsed.pathname?.replace("/", "");
    if (!parsed.hostname || !database || !parsed.username) {
      throw Object.assign(new Error("DATABASE_URL incompleta para backup"), { status: 500 });
    }

    return {
      host: parsed.hostname,
      port: parsed.port || "5432",
      database,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password || "")
    };
  }

  private static sanitizeFileName(fileName: string): string {
    const base = path.basename(fileName);
    const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
    if (!cleaned.toLowerCase().endsWith(".sql")) {
      throw Object.assign(new Error("Arquivo inválido. Use um arquivo .sql"), { status: 400 });
    }
    if (!cleaned) {
      throw Object.assign(new Error("Nome do arquivo inválido"), { status: 400 });
    }
    return cleaned;
  }

  private static getBackupEnvironment(): string {
    return (process.env.BACKUP_ENVIRONMENT || process.env.APP_ENV || process.env.NODE_ENV || "dev")
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-");
  }

  private static formatDatePath(date: Date): { year: string; month: string; day: string } {
    const year = String(date.getUTCFullYear());
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return { year, month, day };
  }

  private static buildBackupFileName(database: string, timestamp: Date): string {
    const iso = timestamp.toISOString().replace(/[:.]/g, "-");
    const safeDatabase = database.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `backup_${safeDatabase}_${iso}.sql`;
  }

  private static buildBackupStoragePath(database: string, fileName: string, timestamp: Date): string {
    const env = BackupService.getBackupEnvironment();
    const { year, month, day } = BackupService.formatDatePath(timestamp);
    return `${env}/${year}/${month}/${day}/${database}/${fileName}`;
  }

  private static async createBackupRecord(input: {
    filename: string;
    bucket: string;
    path: string;
    size: number;
    createdById: string | null;
    status: string;
    storageProvider: string;
  }): Promise<BackupItem> {
    const rows = await prisma.$queryRaw<BackupItem[]>`
      INSERT INTO "DatabaseBackup" (
        "Filename",
        "Bucket",
        "Path",
        "Size",
        "CreatedById",
        "Status",
        "StorageProvider"
      )
      VALUES (
        ${input.filename},
        ${input.bucket},
        ${input.path},
        ${input.size},
        ${input.createdById},
        ${input.status},
        ${input.storageProvider}
      )
      RETURNING
        "Id" AS "id",
        "Filename" AS "filename",
        "Bucket" AS "bucket",
        "Path" AS "path",
        "Size" AS "size",
        "CreatedAt" AS "createdAt",
        "CreatedById" AS "createdBy",
        "Status" AS "status",
        "StorageProvider" AS "storageProvider",
        "DownloadExpiresAt" AS "downloadExpiresAt";
    `;

    if (!rows.length) {
      throw Object.assign(new Error("Falha ao registrar backup no banco"), { status: 500 });
    }

    const record = rows[0];
    return {
      ...record,
      createdAt: new Date(record.createdAt).toISOString(),
      downloadExpiresAt: record.downloadExpiresAt ? new Date(record.downloadExpiresAt).toISOString() : null,
    };
  }

  static async listBackups(): Promise<BackupItem[]> {
    const rows = await prisma.$queryRaw<BackupItem[]>`
      SELECT
        "Id" AS "id",
        "Filename" AS "filename",
        "Bucket" AS "bucket",
        "Path" AS "path",
        "Size" AS "size",
        "CreatedAt" AS "createdAt",
        "CreatedById" AS "createdBy",
        "Status" AS "status",
        "StorageProvider" AS "storageProvider",
        "DownloadExpiresAt" AS "downloadExpiresAt"
      FROM "DatabaseBackup"
      ORDER BY "CreatedAt" DESC;
    `;

    return rows.map((record) => ({
      ...record,
      createdAt: new Date(record.createdAt).toISOString(),
      downloadExpiresAt: record.downloadExpiresAt ? new Date(record.downloadExpiresAt).toISOString() : null,
    }));
  }

  static async generateAndUploadBackup(createdById: string | null = null): Promise<BackupItem> {
    const dir = await BackupService.ensureBackupDir();
    const db = BackupService.parseDatabaseUrl();

    const now = new Date();
    const fileName = BackupService.buildBackupFileName(db.database, now);
    const filePath = path.join(dir, fileName);

    const args = [
      `--file=${filePath}`,
      "--format=plain",
      "--no-owner",
      "--no-privileges",
      "--clean",
      "--if-exists",
      `--host=${db.host}`,
      `--port=${db.port}`,
      `--username=${db.user}`,
      db.database,
    ];

    await execFileAsync("pg_dump", args, {
      env: {
        ...process.env,
        PGPASSWORD: db.password,
      },
      maxBuffer: 10 * 1024 * 1024,
    });

    const stat = await fs.stat(filePath);
    const storagePath = BackupService.buildBackupStoragePath(db.database, fileName, now);
    const bucket = STORAGE_BUCKET_BACKUPS;

    if (!bucket) {
      throw Object.assign(new Error("Bucket de backups não configurado"), { status: 500 });
    }

    let uploaded = false;
    try {
      const fileBuffer = await fs.readFile(filePath);
      await uploadFile(storagePath, fileBuffer, {
        bucket,
        contentType: "application/sql",
        upsert: false,
      });
      uploaded = true;

      return await BackupService.createBackupRecord({
        filename: fileName,
        bucket,
        path: storagePath,
        size: stat.size,
        createdById,
        status: "AVAILABLE",
        storageProvider: "supabase",
      });
    } finally {
      if (uploaded) {
        try {
          await fs.unlink(filePath);
        } catch {
          // Ignora falhas ao remover arquivo temporário
        }
      }
    }
  }

  static async getBackupByFileName(fileName: string): Promise<BackupItem> {
    const safeName = BackupService.sanitizeFileName(fileName);
    const rows = await prisma.$queryRaw<BackupItem[]>`
      SELECT
        "Id" AS "id",
        "Filename" AS "filename",
        "Bucket" AS "bucket",
        "Path" AS "path",
        "Size" AS "size",
        "CreatedAt" AS "createdAt",
        "CreatedById" AS "createdBy",
        "Status" AS "status",
        "StorageProvider" AS "storageProvider",
        "DownloadExpiresAt" AS "downloadExpiresAt"
      FROM "DatabaseBackup"
      WHERE "Filename" = ${safeName}
      LIMIT 1;
    `;

    if (!rows.length) {
      throw Object.assign(new Error("Backup não encontrado"), { status: 404 });
    }

    const record = rows[0];
    return {
      ...record,
      createdAt: new Date(record.createdAt).toISOString(),
      downloadExpiresAt: record.downloadExpiresAt ? new Date(record.downloadExpiresAt).toISOString() : null,
    };
  }

  static async createSignedDownloadUrl(
    fileName: string,
    expiresInSeconds: number
  ): Promise<{ signedUrl: string; expiresAt: Date; backup: BackupItem }> {
    const backup = await BackupService.getBackupByFileName(fileName);
    if (backup.status !== "AVAILABLE") {
      throw Object.assign(new Error("Backup indisponível para download"), { status: 409 });
    }

    const { signedUrl, expiresAt } = await createSignedUrl(backup.path, {
      bucket: backup.bucket,
      expiresIn: expiresInSeconds,
      download: backup.filename,
    });

    await prisma.$executeRaw`
      UPDATE "DatabaseBackup"
      SET "DownloadExpiresAt" = ${expiresAt}
      WHERE "Id" = ${backup.id};
    `;

    return { signedUrl, expiresAt, backup };
  }

  static async deleteBackup(fileName: string): Promise<BackupItem> {
    const backup = await BackupService.getBackupByFileName(fileName);
    await deleteFile(backup.path, backup.bucket);

    await prisma.$executeRaw`
      DELETE FROM "DatabaseBackup"
      WHERE "Id" = ${backup.id};
    `;

    return backup;
  }

  static async restoreBackup(filePath: string): Promise<void> {
    const db = BackupService.parseDatabaseUrl();

    const args = [
      `--host=${db.host}`,
      `--port=${db.port}`,
      `--username=${db.user}`,
      `--dbname=${db.database}`,
      "--set",
      "ON_ERROR_STOP=on",
      "--file",
      filePath,
    ];

    await execFileAsync("psql", args, {
      env: {
        ...process.env,
        PGPASSWORD: db.password,
      },
      maxBuffer: 10 * 1024 * 1024,
    });
  }
}

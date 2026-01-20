import path from "path";
import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface BackupItem {
  name: string;
  size: number;
  createdAt: string;
  updatedAt: string;
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

  private static async resolveBackupPath(fileName: string): Promise<string> {
    const dir = await BackupService.ensureBackupDir();
    const safeName = BackupService.sanitizeFileName(fileName);
    const resolved = path.resolve(dir, safeName);
    if (!resolved.startsWith(dir)) {
      throw Object.assign(new Error("Arquivo inválido"), { status: 400 });
    }
    return resolved;
  }

  static async listBackups(): Promise<BackupItem[]> {
    const dir = await BackupService.ensureBackupDir();
    const entries = await fs.readdir(dir);
    const backups: BackupItem[] = [];

    for (const entry of entries) {
      if (!entry.toLowerCase().endsWith(".sql")) continue;
      const filePath = path.join(dir, entry);
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;
      backups.push({
        name: entry,
        size: stat.size,
        createdAt: stat.birthtime.toISOString(),
        updatedAt: stat.mtime.toISOString(),
      });
    }

    return backups.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  static async generateBackup(): Promise<BackupItem> {
    const dir = await BackupService.ensureBackupDir();
    const db = BackupService.parseDatabaseUrl();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup_${timestamp}.sql`;
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
    return {
      name: fileName,
      size: stat.size,
      createdAt: stat.birthtime.toISOString(),
      updatedAt: stat.mtime.toISOString(),
    };
  }

  static async getBackupFilePath(fileName: string): Promise<string> {
    const filePath = await BackupService.resolveBackupPath(fileName);
    await fs.access(filePath);
    return filePath;
  }

  static async deleteBackup(fileName: string): Promise<void> {
    const filePath = await BackupService.resolveBackupPath(fileName);
    await fs.unlink(filePath);
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

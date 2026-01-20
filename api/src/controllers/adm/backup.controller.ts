import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import prisma from "../../prisma/client";
import { BackupService } from "../../services/adm/backup.service";
import { scheduleAutomaticBackupGeneration } from "../../jobs/jobGerarBackupAutomatica";

export class BackupController {
  private getFileNameParam(fileName: string | string[] | undefined): string {
    if (typeof fileName === "string") {
      return fileName;
    }
    if (Array.isArray(fileName)) {
      throw Object.assign(new Error("Nome do arquivo inválido"), { status: 400 });
    }
    throw Object.assign(new Error("Nome do arquivo é obrigatório"), { status: 400 });
  }

  async getSchedule(req: Request, res: Response) {
    const config = await prisma.configuracao.findFirst({
      select: {
        backupScheduleEnabled: true,
        backupScheduleDayOfWeek: true,
        backupScheduleTime: true,
      },
    });

    return res.json({
      enabled: config?.backupScheduleEnabled ?? false,
      dayOfWeek: config?.backupScheduleDayOfWeek ?? 5,
      time: config?.backupScheduleTime ?? "00:00",
    });
  }

  async updateSchedule(req: Request, res: Response) {
    const { enabled, dayOfWeek, time } = req.body as {
      enabled: boolean;
      dayOfWeek: number;
      time: string;
    };

    if (typeof enabled !== "boolean") {
      throw Object.assign(new Error("Campo enabled inválido"), { status: 400 });
    }
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw Object.assign(new Error("Dia da semana inválido"), { status: 400 });
    }
    if (!time || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(time)) {
      throw Object.assign(new Error("Horário inválido (HH:mm)"), { status: 400 });
    }

    const existing = await prisma.configuracao.findFirst();
    const data = {
      backupScheduleEnabled: enabled,
      backupScheduleDayOfWeek: dayOfWeek,
      backupScheduleTime: time,
    };

    const updated = existing
      ? await prisma.configuracao.update({
          where: { Id: existing.Id },
          data,
        })
      : await prisma.configuracao.create({ data });

    await scheduleAutomaticBackupGeneration();

    return res.json({
      enabled: updated.backupScheduleEnabled ?? false,
      dayOfWeek: updated.backupScheduleDayOfWeek ?? dayOfWeek,
      time: updated.backupScheduleTime ?? time,
    });
  }

  async list(req: Request, res: Response) {
    const backups = await BackupService.listBackups();
    return res.json({ items: backups });
  }

  async generate(req: Request, res: Response) {
    const backup = await BackupService.generateBackup();
    return res.status(201).json({ backup });
  }

  async download(req: Request, res: Response) {
    const fileName = this.getFileNameParam(req.params.fileName);
    const filePath = await BackupService.getBackupFilePath(fileName);
    return res.download(filePath, path.basename(filePath));
  }

  async delete(req: Request, res: Response) {
    const fileName = this.getFileNameParam(req.params.fileName);
    await BackupService.deleteBackup(fileName);
    return res.json({ message: "Backup removido com sucesso" });
  }

  async restore(req: Request, res: Response) {
    const file = req.file;
    if (!file) {
      throw Object.assign(new Error("Arquivo .sql é obrigatório"), { status: 400 });
    }

    if (!file.originalname.toLowerCase().endsWith(".sql")) {
      throw Object.assign(new Error("Arquivo inválido. Envie um .sql"), { status: 400 });
    }

    try {
      await BackupService.restoreBackup(file.path);
      return res.json({ message: "Backup restaurado com sucesso" });
    } finally {
      try {
        await fs.unlink(file.path);
      } catch {
        // Ignora erro ao remover arquivo temporário
      }
    }
  }
}

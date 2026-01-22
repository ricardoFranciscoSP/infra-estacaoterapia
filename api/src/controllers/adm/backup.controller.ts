import { Request, Response } from "express";
import fs from "fs/promises";
import prisma from "../../prisma/client";
import { BackupService } from "../../services/adm/backup.service";
import { scheduleAutomaticBackupGeneration } from "../../jobs/jobGerarBackupAutomatica";
import { getWebhookQueue } from "../../workers/worker.webhook";
import { logAuditFromRequest } from "../../utils/auditLogger.util";
import { ActionType, Module } from "../../generated/prisma";

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
    const webhookQueue = getWebhookQueue();
    if (!webhookQueue) {
      throw Object.assign(new Error("Fila de backup indisponível"), { status: 503 });
    }

    const requestedBy = req.user?.Id ?? null;
    const job = await webhookQueue.add(
      "generateDatabaseBackup",
      {
        requestedBy,
        requestedAt: new Date().toISOString(),
      },
      {
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 86400 },
      }
    );

    if (requestedBy) {
      await logAuditFromRequest(
        req,
        requestedBy,
        ActionType.Create,
        Module.SystemSettings,
        "Backup do banco solicitado"
      );
    }

    return res.status(202).json({
      message: "Backup agendado para processamento",
      jobId: job.id,
    });
  }

  async download(req: Request, res: Response) {
    const fileName = this.getFileNameParam(req.params.fileName);
    const expiresIn =
      Number(req.query.expiresIn) || Number(process.env.BACKUP_SIGNED_URL_EXPIRES_IN || 600);
    if (!Number.isFinite(expiresIn) || expiresIn < 300 || expiresIn > 900) {
      throw Object.assign(new Error("expiresIn inválido (300-900 segundos)"), { status: 400 });
    }

    const { signedUrl, expiresAt } = await BackupService.createSignedDownloadUrl(
      fileName,
      expiresIn
    );

    return res.json({ signedUrl, expiresAt });
  }

  async delete(req: Request, res: Response) {
    const confirmEnv = process.env.CONFIRM_DELETE === "true";
    const confirmRequest =
      req.query.confirm === "true" || (req.body && req.body.confirm === true);

    if (!confirmEnv || !confirmRequest) {
      throw Object.assign(
        new Error("Confirmação explícita obrigatória para excluir backup"),
        { status: 400 }
      );
    }

    const fileName = this.getFileNameParam(req.params.fileName);
    const backup = await BackupService.deleteBackup(fileName);

    const deletedBy = req.user?.Id;
    if (deletedBy) {
      await logAuditFromRequest(
        req,
        deletedBy,
        ActionType.Delete,
        Module.SystemSettings,
        `Backup removido: ${backup.filename}`
      );
    }

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

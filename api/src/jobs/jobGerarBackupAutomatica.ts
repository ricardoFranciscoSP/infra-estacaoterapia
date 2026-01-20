import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import prisma from "../prisma/client";
import { BackupService } from "../services/adm/backup.service";
import { BRASILIA_TIMEZONE } from "../utils/timezone.util";
import { getWebhookQueue } from "../workers/worker.webhook";

dayjs.extend(utc);
dayjs.extend(timezone);

const BACKUP_JOB_ID = "database-backup-weekly";

type BackupScheduleConfig = {
  enabled: boolean;
  dayOfWeek: number | null;
  time: string | null;
};

async function getBackupScheduleConfig(): Promise<BackupScheduleConfig> {
  const config = await prisma.configuracao.findFirst({
    select: {
      backupScheduleEnabled: true,
      backupScheduleDayOfWeek: true,
      backupScheduleTime: true,
    },
  });

  return {
    enabled: config?.backupScheduleEnabled ?? false,
    dayOfWeek: config?.backupScheduleDayOfWeek ?? null,
    time: config?.backupScheduleTime ?? null,
  };
}

function parseTime(time: string): { hours: number; minutes: number } | null {
  const match = time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  };
}

async function getDelayForNextBackup(): Promise<number | null> {
  const config = await getBackupScheduleConfig();
  if (!config.enabled || config.dayOfWeek === null || !config.time) {
    return null;
  }

  const timeInfo = parseTime(config.time);
  if (!timeInfo) {
    console.error(
      `[getDelayForNextBackup] Horário inválido: ${config.time}`
    );
    return null;
  }

  const now = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);
  const currentDay = now.day(); // 0 (domingo) - 6 (sábado)
  let daysUntil = (config.dayOfWeek - currentDay + 7) % 7;

  let targetTime = now
    .startOf("day")
    .add(daysUntil, "day")
    .hour(timeInfo.hours)
    .minute(timeInfo.minutes)
    .second(0)
    .millisecond(0);

  if (daysUntil === 0 && targetTime.isBefore(now)) {
    targetTime = targetTime.add(7, "day");
    daysUntil = 7;
  }

  const delayMs = targetTime.valueOf() - now.valueOf();
  console.log("[getDelayForNextBackup] Próxima execução:", {
    targetTime: targetTime.format("YYYY-MM-DD HH:mm:ss"),
    now: now.format("YYYY-MM-DD HH:mm:ss"),
    delayMs,
    delayHours: Math.floor(delayMs / (1000 * 60 * 60)),
    delayMinutes: Math.floor((delayMs % (1000 * 60 * 60)) / (1000 * 60)),
    dayOfWeek: config.dayOfWeek,
    time: config.time,
  });

  return delayMs;
}

async function removeExistingBackupJob(): Promise<void> {
  const webhookQueue = getWebhookQueue();
  if (!webhookQueue) return;

  try {
    const existingJob = await webhookQueue.getJob(BACKUP_JOB_ID);
    if (existingJob) {
      await existingJob.remove();
      console.log("[scheduleAutomaticBackupGeneration] Job anterior removido");
    }
  } catch (error) {
    console.warn(
      "[scheduleAutomaticBackupGeneration] Erro ao remover job anterior:",
      error
    );
  }
}

/**
 * Agenda o job semanal de backup do banco via Redis
 */
export async function scheduleAutomaticBackupGeneration(): Promise<boolean> {
  try {
    console.log("[scheduleAutomaticBackupGeneration] Iniciando agendamento de backup...");
    const delayMs = await getDelayForNextBackup();

    if (delayMs === null) {
      await removeExistingBackupJob();
      console.log("[scheduleAutomaticBackupGeneration] Agendamento desativado");
      return false;
    }

    const webhookQueue = getWebhookQueue();
    if (!webhookQueue) {
      console.error("[scheduleAutomaticBackupGeneration] WebhookQueue não disponível");
      return false;
    }

    await removeExistingBackupJob();

    await webhookQueue.add(
      "generateDatabaseBackup",
      { timestamp: dayjs().toISOString() },
      {
        delay: delayMs,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        jobId: BACKUP_JOB_ID,
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      }
    );

    console.log(
      `✅ [scheduleAutomaticBackupGeneration] Backup agendado (delay: ${Math.floor(
        delayMs / (1000 * 60)
      )}min)`
    );
    return true;
  } catch (error) {
    console.error("[scheduleAutomaticBackupGeneration] Erro:", error);
    return false;
  }
}

/**
 * Executa o backup e re-agenda o próximo ciclo
 */
export async function handleGenerateDatabaseBackup(): Promise<boolean> {
  try {
    console.log("[handleGenerateDatabaseBackup] Iniciando backup automático...");
    await BackupService.generateBackup();
    console.log("✅ [handleGenerateDatabaseBackup] Backup gerado com sucesso");

    await scheduleAutomaticBackupGeneration();
    return true;
  } catch (error) {
    console.error("[handleGenerateDatabaseBackup] Erro ao gerar backup:", error);
    try {
      await scheduleAutomaticBackupGeneration();
    } catch (rescheduleError) {
      console.error(
        "[handleGenerateDatabaseBackup] Erro ao re-agendar backup:",
        rescheduleError
      );
    }
    return false;
  }
}

import { BackupService } from "../services/adm/backup.service";
import { emitEvent } from "../socket/utils/emitEvent";
import { getSocketServer } from "../socket/serverInstance";

export async function generateBackupAndNotifyUser(userId: string | null) {
    // Gera o backup normalmente
    const backup = await BackupService.generateAndUploadBackup(userId);

    // Emite evento para o usuário conectado (se userId informado)
    if (userId) {
        const io = getSocketServer();
        if (io) {
            emitEvent(io, "backup:status", {
                toUserId: userId,
                data: {
                    status: "completed",
                    backup,
                },
            });
        }
    }
    return backup;
}

import { Worker, QueueEvents, Job } from "bullmq";
import { notificationQueue } from "../queues/bullmqCentral";
import { WebSocketNotificationService } from "../services/websocketNotification.service";
import prisma from "../prisma/client";
import { attachQueueEventsLogging } from "../utils/bullmqLogs";

const wsService = new WebSocketNotificationService();


let notificationWorker: Worker | null = null;
if (!notificationQueue) {
    console.log('[BullMQ] notification.worker não inicializado: notificationQueue indisponível (ambiente de desenvolvimento ou erro de conexão).');
} else {
    notificationWorker = new Worker(
        notificationQueue.name,
        async (job: Job) => {
            switch (job.name) {
                case "notification:user": {
                    const { userId, title, message } = job.data;
                    const notification = await prisma.notification.create({
                        data: { Title: title, Message: message, IsForAllUsers: false },
                    });
                    await prisma.notificationStatus.create({
                        data: { UserId: userId, Status: "NaoLida", NotificationId: notification.Id },
                    });
                    await wsService.emitToUser(userId, "notification:new", {
                        id: notification.Id,
                        title,
                        message,
                        type: "info",
                        createdAt: new Date(),
                    });
                    break;
                }
                case "notification:all": {
                    const { title, message } = job.data;
                    const users = await prisma.user.findMany({ select: { Id: true } });
                    const notification = await prisma.notification.create({
                        data: { Title: title, Message: message, IsForAllUsers: true },
                    });
                    await Promise.all(
                        users.map(async (user) => {
                            await prisma.notificationStatus.create({
                                data: { UserId: user.Id, Status: "NaoLida", NotificationId: notification.Id },
                            });
                        })
                    );
                    await wsService.emitToAll("notification:new", {
                        id: notification.Id,
                        title,
                        message,
                        type: "info",
                        createdAt: new Date(),
                    });
                    break;
                }
                default:
                    throw new Error(`Tipo de job desconhecido: ${job.name}`);
            }
        },
        { connection: notificationQueue.opts.connection, concurrency: 2 }
    );

    const events = new QueueEvents(notificationQueue.name, { connection: notificationQueue.opts.connection });
    attachQueueEventsLogging(notificationQueue.name, events);
    events.on("failed", ({ jobId, failedReason }) => {
        console.error(`74c Notification job failed: ${jobId} - ${failedReason}`);
    });
    events.on("completed", ({ jobId }) => {
        console.log(`705 Notification job completed: ${jobId}`);
    });
}

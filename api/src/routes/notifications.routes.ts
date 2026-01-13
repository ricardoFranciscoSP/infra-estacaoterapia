import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { NotificationController } from '../controllers/notification.controller';
import { AuthorizationService } from "../services/authorization.service";
import { WebSocketNotificationService } from "../services/websocketNotification.service";
import { NotificationService } from "../services/notification.service";
import { UserDataCheckService } from "../services/userDataCheck.service";

const router = Router();

const wsService = new WebSocketNotificationService();
const notificationService = new NotificationService(wsService);
const authService = new AuthorizationService();
const userDataCheckService = new UserDataCheckService(wsService);

const notificationController = new NotificationController(
    authService,
    notificationService,
    userDataCheckService
);

router.use(protect); // Middleware to handle async errors
router.get('/', asyncHandler(notificationController.fetchAllNotifications.bind(notificationController)));
router.post('/', asyncHandler(notificationController.createNotification.bind(notificationController)));
router.patch('/mark-as-read', asyncHandler(notificationController.markNotificationAsRead.bind(notificationController)));
router.post('/check-user-data', asyncHandler(notificationController.checkUserData.bind(notificationController)));
router.post('/mark-all-read', asyncHandler(notificationController.markAllNotificationsAsRead.bind(notificationController)));
// Marcar uma notificação como lida
router.delete('/:notificationId', asyncHandler(notificationController.deleteNotification.bind(notificationController)));
// Marcar todas as notificações como lidas
router.delete('/', asyncHandler(notificationController.deleteAllNotifications.bind(notificationController)));

export default router;
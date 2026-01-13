import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { WorkScheduleController } from '../controllers/workSchedule.controller';
import { AuthorizationService } from '../services/authorization.service';
import { WorkScheduleService } from '../services/workSchedule.service';

const router = Router();

const authService = new AuthorizationService();
const workScheduleService = new WorkScheduleService();
const workScheduleController = new WorkScheduleController(authService, workScheduleService);

router.use(protect); // Middleware to handle async errors
router.post('/set', asyncHandler(workScheduleController.setWorkSchedules.bind(workScheduleController)));


export default router;

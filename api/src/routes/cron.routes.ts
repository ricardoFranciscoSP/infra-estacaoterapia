import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { CronController } from '../controllers/cron.controller';

const router = Router();
const cronController = new CronController();

// Rota para executar cron jobs manualmente
router.post('/executar', asyncHandler(cronController.executarCronJobs.bind(cronController)));

export default router; 
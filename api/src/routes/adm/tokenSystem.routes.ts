import { Router } from 'express';
import tokenSystemController from '../../controllers/tokenSystemController';

const router = Router();

// Todas as rotas já estão protegidas e autorizadas em admin.routes.ts
router.use('/', tokenSystemController);

export default router;

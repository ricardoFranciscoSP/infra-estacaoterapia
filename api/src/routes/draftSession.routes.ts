import { Router } from 'express';
import { DraftSessionController } from '../controllers/draftSession.controller';

const router = Router();

router.post('/', DraftSessionController.createDraftSession);
router.post('/confirm', DraftSessionController.confirmDraftSession);

export default router;

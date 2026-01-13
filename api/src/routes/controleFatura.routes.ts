import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { ControleFaturaController } from '../controllers/controleFatura.controller';

const router = Router();
const controleFaturaController = new ControleFaturaController();

router.post('/', asyncHandler(controleFaturaController.criarControleFatura.bind(controleFaturaController)));
router.put('/:id/status', asyncHandler(controleFaturaController.updateControleFaturaStatus.bind(controleFaturaController)));
router.get('/:id', asyncHandler(controleFaturaController.getControleFaturaById.bind(controleFaturaController)));
router.get('/user/:userId', asyncHandler(controleFaturaController.getControleFaturasByUserId.bind(controleFaturaController)));
router.get('/', asyncHandler(controleFaturaController.listarControlesFatura.bind(controleFaturaController)));
router.delete('/:id', asyncHandler(controleFaturaController.deleteControleFatura.bind(controleFaturaController)));

export default router;

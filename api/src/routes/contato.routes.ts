import { Router } from 'express';
import { ContatoController } from '../controllers/contato.controller';

const router = Router();

router.post('/', ContatoController.enviarContato);

export default router;

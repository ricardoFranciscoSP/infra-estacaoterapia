import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { ConfiguracoesController } from '../controllers/adm/configuracoes.controller';

const router = Router();
const configuracoesController = new ConfiguracoesController();

// Rota pública para buscar FAQs ativas (sem autenticação)
router.get('/', asyncHandler(configuracoesController.getFaqPublic.bind(configuracoesController)));

// Rota pública para buscar integrações (GTM e GA4)
router.get('/integrations', asyncHandler(configuracoesController.getIntegrationsPublic.bind(configuracoesController)));

// Rota pública para buscar redes sociais
router.get('/redes-sociais', asyncHandler(configuracoesController.getRedesPublic.bind(configuracoesController)));

export default router;

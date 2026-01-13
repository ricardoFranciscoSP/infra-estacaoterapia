import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { WebHookController } from '../controllers/webhook.controller';

const router = Router();

// Middleware de log para TODAS as requisições de webhook
router.use((req, res, next) => {
    console.log(`🔍 [WebhookRoutes] Requisição recebida:`, {
        method: req.method,
        path: req.path,
        url: req.url,
        headers: {
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent']
        },
        hasBody: !!req.body,
        bodyType: typeof req.body,
        timestamp: new Date().toISOString()
    });
    next();
});

router.post('/', asyncHandler(WebHookController.handleWebhook));
// ⚠️ A Vindi envia JSON cru, então use express.json() no app
router.post('/vindi', asyncHandler(WebHookController.vindiWebhook));

export default router;
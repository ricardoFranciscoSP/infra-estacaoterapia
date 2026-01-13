import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect, authorize } from '../middlewares/authMiddleware';
import { BannerController } from '../controllers/banner.controller';
import { BannerService } from '../services/banner.service';
import multer from 'multer';

const router = Router();
const bannerService = new BannerService();
const bannerController = new BannerController(bannerService);

// Configurar multer para upload de múltiplos arquivos
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// Rota pública para listar banners ativos
router.get('/', asyncHandler(bannerController.findAll.bind(bannerController)));

// Rota pública para buscar um banner específico
router.get('/:id', asyncHandler(bannerController.findById.bind(bannerController)));

// Rotas protegidas - apenas Admin e Management
router.use(protect);
router.use(authorize('Admin', 'Management'));

// Criar banner (requer upload de imagens)
router.post(
    '/',
    upload.fields([
        { name: 'imagemDesktop', maxCount: 1 },
        { name: 'imagemMobile', maxCount: 1 }
    ]),
    asyncHandler(bannerController.create.bind(bannerController))
);

// Atualizar banner
router.put(
    '/:id',
    upload.fields([
        { name: 'imagemDesktop', maxCount: 1 },
        { name: 'imagemMobile', maxCount: 1 }
    ]),
    asyncHandler(bannerController.update.bind(bannerController))
);

// Deletar banner
router.delete('/:id', asyncHandler(bannerController.delete.bind(bannerController)));

// Ativar/desativar banner
router.patch('/:id/toggle-active', asyncHandler(bannerController.toggleActive.bind(bannerController)));

export default router;


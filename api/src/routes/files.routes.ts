/**
 * ============================================================================
 * ROTAS DE ARQUIVOS - URLs TEMPORÁRIAS
 * ============================================================================
 * 
 * Endpoints para gerar URLs assinadas temporárias para:
 * - Documentos de psicólogos (visualizar, baixar)
 * - Imagens de perfil (usuários e psicólogos)
 * - Documentos administrativos
 * 
 * Todas as URLs expiram após um tempo configurável por segurança.
 */

import { Router } from "express";
import { FilesController } from "../controllers/files.controller";
import { protect } from "../middlewares/authMiddleware";

const router = Router();

// ============================================================================
// DOCUMENTOS DE PSICÓLOGOS
// ============================================================================

/**
 * Visualizar documento específico do psicólogo
 * GET /api/files/psychologist/documents/:id
 * 
 * Uso: Admin visualizar documento enviado pelo psicólogo
 */
router.get("/psychologist/documents/:id", protect, FilesController.viewPsychologistDocument);

/**
 * Visualizar documento da tabela Document (usado em solicitações de saque)
 * GET /api/files/documents/:id
 * 
 * Uso: Visualizar nota fiscal/receita saúde de solicitação de saque
 */
router.get("/documents/:id", protect, FilesController.viewDocument);

/**
 * Listar TODOS os documentos de um psicólogo com URLs
 * GET /api/files/psychologist/:profileId/documents
 * 
 * Uso: Admin ou psicólogo ver lista de documentos
 */
router.get("/psychologist/:profileId/documents", protect, FilesController.listPsychologistDocuments);

/**
 * Download de documento com nome amigável
 * GET /api/files/psychologist/documents/:id/download
 * 
 * Uso: Admin ou psicólogo baixar documento
 */
router.get("/psychologist/documents/:id/download", protect, FilesController.downloadPsychologistDocument);

/**
 * Excluir documento do psicólogo (banco + storage)
 * DELETE /api/files/psychologist/documents/:id
 * 
 * Uso: Admin excluir documento
 */
router.delete("/psychologist/documents/:id", protect, FilesController.deletePsychologistDocument);

/**
 * Thumbnail de imagem de documento
 * GET /api/files/psychologist/documents/:id/thumbnail?size=200
 * 
 * Uso: Visualizar preview de imagem
 */
router.get("/psychologist/documents/:id/thumbnail", protect, FilesController.documentThumbnail);

// ============================================================================
// IMAGENS DE PERFIL (AVATARES)
// ============================================================================

/**
 * Obter avatar de usuário com URL temporária
 * GET /api/files/user/:userId/avatar?size=200
 * 
 * Uso: Exibir foto de perfil no frontend
 */
router.get("/user/:userId/avatar", protect, FilesController.userAvatar);

/**
 * Obter avatar original (tamanho completo)
 * GET /api/files/user/:userId/avatar/full
 */
router.get("/user/:userId/avatar/full", protect, FilesController.userAvatarFull);

/**
 * Obter avatar com URL assinada válida por 12 horas (sem transformação)
 * GET /api/files/user/:userId/avatar/signed
 * 
 * Uso: Quando o front precisar manter o link válido por mais tempo
 */
router.get("/user/:userId/avatar/signed", protect, FilesController.userAvatarSigned);

// ============================================================================
// MÚLTIPLOS ARQUIVOS DE UMA VEZ
// ============================================================================

/**
 * Obter URLs de múltiplos documentos
 * POST /api/files/batch
 * Body: { documentIds: string[] }
 * 
 * Uso: Carregar vários documentos de uma vez
 */
router.post("/batch", protect, FilesController.batch);

// ============================================================================
// VALIDAÇÃO DE DOCUMENTOS
// ============================================================================

/**
 * Validar se documentos existem no storage
 * POST /api/files/validate
 * Body: { documentIds: string[] }
 * 
 * Uso: Admin verificar integridade dos arquivos
 */
router.post("/validate", protect, FilesController.validate);

// ============================================================================
// DOWNLOAD PÚBLICO DE ARQUIVOS
// ============================================================================

/**
 * Download público do guia do psicólogo
 * GET /api/files/guia-psicologo
 * 
 * Uso: Download do PDF do guia para psicólogos em cadastro (público, sem autenticação)
 */
router.get("/guia-psicologo", FilesController.downloadGuiaPsicologo);

// ============================================================================
// ROTA DE TESTE (apenas em desenvolvimento)
// ============================================================================

if (process.env.NODE_ENV === 'development') {
    /**
     * Testar geração de URL
     * GET /api/files/test?path=uploads/exemplo.pdf
     */
    router.get("/test", protect, FilesController.test);
}

export default router;

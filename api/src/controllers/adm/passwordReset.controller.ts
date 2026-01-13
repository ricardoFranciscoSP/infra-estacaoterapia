import { Request, Response } from 'express';
import { PasswordResetService } from '../../services/adm/passwordReset.service';
import { EmailService } from '../../services/email.service';
import { getClientIp } from '../../utils/getClientIp.util';
import { normalizeParamStringRequired } from '../../utils/validation.util';

export class PasswordResetController {
    private passwordResetService: PasswordResetService;

    constructor() {
        const emailService = new EmailService();
        this.passwordResetService = new PasswordResetService(emailService);
    }

    /**
     * Opção 1 - RECOMENDADO: Gerar link de redefinição de senha
     * POST /admin/password-reset/generate-link/:userId
     */
    async generateResetLink(req: Request, res: Response): Promise<Response> {
        try {
            const userId = normalizeParamStringRequired(req.params.userId);
            const admin = req.user; // Admin autenticado

            if (!userId) {
                return res.status(400).json({ error: 'ID do usuário é obrigatório.' });
            }

            if (!admin || !admin.Id) {
                return res.status(401).json({ error: 'Não autorizado. Admin não identificado.' });
            }

            const ipAddress = getClientIp(req);
            const result = await this.passwordResetService.generateResetLink(userId, admin.Id, ipAddress);

            if (!result.success) {
                return res.status(400).json({ error: result.message });
            }

            return res.status(200).json({
                message: result.message,
                resetLink: result.resetLink,
                expiresAt: result.expiresAt,
            });
        } catch (error: unknown) {
            console.error('[PasswordResetController] Erro ao gerar link de redefinição:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return res.status(500).json({ error: `Erro ao gerar link de redefinição: ${errorMessage}` });
        }
    }

    /**
     * Opção 2: Gerar senha aleatória
     * POST /admin/password-reset/generate-random/:userId
     */
    async generateRandomPassword(req: Request, res: Response): Promise<Response> {
        try {
            const userId = normalizeParamStringRequired(req.params.userId);
            const admin = req.user; // Admin autenticado

            console.log('[PasswordResetController] Recebida requisição para gerar senha aleatória. userId:', userId);

            if (!userId || userId.trim() === '') {
                console.error('[PasswordResetController] ❌ userId não fornecido ou vazio');
                return res.status(400).json({ error: 'ID do usuário é obrigatório.' });
            }

            if (!admin || !admin.Id) {
                console.error('[PasswordResetController] ❌ Admin não identificado');
                return res.status(401).json({ error: 'Não autorizado. Admin não identificado.' });
            }

            const ipAddress = getClientIp(req);
            console.log('[PasswordResetController] Chamando service para gerar senha...');
            const result = await this.passwordResetService.generateRandomPassword(userId, admin.Id, ipAddress);

            if (!result.success) {
                console.error('[PasswordResetController] ❌ Service retornou erro:', result.message);
                return res.status(400).json({ error: result.message });
            }

            console.log('[PasswordResetController] ✅ Senha gerada com sucesso');
            // IMPORTANTE: Senha retornada apenas uma vez para exibição
            return res.status(200).json({
                message: result.message,
                password: result.password, // Exibido apenas uma vez
                warning: 'Por segurança, esta senha será exibida apenas uma vez. O usuário será obrigado a alterá-la no próximo login.'
            });
        } catch (error: unknown) {
            console.error('[PasswordResetController] ❌ Erro inesperado ao gerar senha aleatória:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return res.status(500).json({ error: `Erro ao gerar senha aleatória: ${errorMessage}` });
        }
    }
}


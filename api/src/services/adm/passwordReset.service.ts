import prisma from '../../prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { IEmailService } from '../../interfaces/communication.interface';
import { AuditService } from '../audit.service';
import { Module } from '../../generated/prisma';

export interface GenerateResetLinkResult {
    success: boolean;
    message: string;
    resetToken?: string;
    resetLink?: string;
    expiresAt?: Date;
}

export interface GenerateRandomPasswordResult {
    success: boolean;
    message: string;
    password?: string;
    expiresAt?: Date;
}

export class PasswordResetService {
    private emailService: IEmailService;
    private auditService: AuditService;
    private readonly TOKEN_EXPIRATION_HOURS = 2;
    private readonly FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

    constructor(emailService: IEmailService) {
        this.emailService = emailService;
        this.auditService = new AuditService();
    }

    /**
     * Gera um token seguro de redefinição de senha (UUID + hash)
     * Opção 1 - RECOMENDADO: Link de redefinição
     */
    async generateResetLink(
        userId: string,
        adminId: string,
        ipAddress?: string
    ): Promise<GenerateResetLinkResult> {
        try {
            const user = await prisma.user.findUnique({
                where: { Id: userId },
                select: { Id: true, Email: true, Nome: true }
            });

            if (!user) {
                return { success: false, message: 'Usuário não encontrado.' };
            }

            // Gera token seguro (UUID)
            const resetToken = randomUUID();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRATION_HOURS);

            // Hash do token para armazenamento seguro
            const tokenHash = await bcrypt.hash(resetToken, 10);

            // Cria registro no modelo PasswordReset
            await prisma.passwordReset.create({
                data: {
                    UserId: userId,
                    TokenHash: tokenHash,
                    ExpiresAt: expiresAt,
                    CreatedBy: adminId,
                }
            });

            // Atualiza o usuário com o token e data de expiração (mantido para compatibilidade)
            await prisma.user.update({
                where: { Id: userId },
                data: {
                    ResetPasswordToken: resetToken,
                    ResetPasswordTokenExpiresAt: expiresAt,
                    MustChangePassword: false // Link de redefinição não força mudança
                }
            });

            // Gera o link de redefinição
            const resetLink = `${this.FRONTEND_URL}/reset-password?token=${resetToken}`;

            // Enfileira e-mail com o link para envio assíncrono
            try {
                const { emailQueue } = await import('../../queues/emailQueue');
                
                if (emailQueue) {
                    await emailQueue.add(
                        'sendResetPasswordLink',
                        {
                            type: 'resetPasswordLink',
                            to: user.Email,
                            nome: user.Nome,
                            subject: 'Redefinição de Senha - Link Seguro',
                            htmlTemplate: 'resetPasswordLink',
                            templateData: {
                                nome: user.Nome,
                                resetLink,
                                expirationHours: this.TOKEN_EXPIRATION_HOURS,
                            },
                        },
                        {
                            jobId: `reset-link-${userId}-${Date.now()}`, // Evita duplicatas
                            priority: 1, // Alta prioridade para links de redefinição
                        }
                    );
                    console.log('[PasswordResetService] ✅ Email de link enfileirado para envio assíncrono');
                } else {
                    // Fallback: envia síncrono se a fila não estiver disponível
                    console.warn('[PasswordResetService] ⚠️ Fila de email não disponível, enviando síncrono');
                    await this.emailService.sendResetPasswordLinkEmail(
                        user.Email,
                        user.Nome,
                        resetLink,
                        this.TOKEN_EXPIRATION_HOURS
                    );
                    console.log('[PasswordResetService] ✅ Email de link enviado síncrono com sucesso');
                }
            } catch (emailError: unknown) {
                console.error('[PasswordResetService] ⚠️ Erro ao enfileirar/enviar email de link:', emailError);
                // Continua mesmo se o email falhar, pois o token foi salvo no banco
            }

            // Registra na auditoria
            await this.auditService.log({
                userId: adminId,
                actionType: 'Manage',
                module: Module.SystemSettings,
                description: `Link de redefinição de senha gerado para usuário ${user.Nome} (${user.Email}) - ID: ${userId}`,
                ipAddress: ipAddress || undefined,
                status: 'Sucesso',
                metadata: {
                    targetUserId: userId,
                    targetUserEmail: user.Email,
                    expiresAt: expiresAt.toISOString(),
                }
            });

            return {
                success: true,
                message: 'Link de redefinição gerado e enviado por e-mail com sucesso.',
                resetToken,
                resetLink,
                expiresAt
            };
        } catch (error: unknown) {
            console.error('[PasswordResetService] Erro ao gerar link de redefinição:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return { success: false, message: `Erro ao gerar link de redefinição: ${errorMessage}` };
        }
    }

    /**
     * Gera uma senha aleatória e força o usuário a alterá-la no próximo login
     * Opção 2: Senha aleatória (para casos operacionais)
     */
    async generateRandomPassword(
        userId: string,
        adminId: string,
        ipAddress?: string
    ): Promise<GenerateRandomPasswordResult> {
        try {
            console.log('[PasswordResetService] Iniciando geração de senha aleatória para userId:', userId);
            
            const user = await prisma.user.findUnique({
                where: { Id: userId },
                select: { Id: true, Email: true, Nome: true }
            });

            if (!user) {
                console.error('[PasswordResetService] Usuário não encontrado:', userId);
                
                // Registra tentativa de reset para usuário inexistente na auditoria
                await this.auditService.log({
                    userId: adminId,
                    actionType: 'Manage',
                    module: Module.SystemSettings,
                    description: `Tentativa de gerar senha aleatória para usuário inexistente - ID: ${userId}`,
                    ipAddress: ipAddress || undefined,
                    status: 'Falha',
                    metadata: {
                        targetUserId: userId,
                        reason: 'Usuário não encontrado',
                    }
                });

                return { success: false, message: 'Usuário não encontrado.' };
            }

            console.log('[PasswordResetService] Usuário encontrado:', user.Email);

            // Gera senha aleatória segura (12 caracteres: maiúsculas, minúsculas, números)
            const randomPassword = this.generateSecurePassword(12);
            console.log('[PasswordResetService] Senha aleatória gerada');
            
            // Hash da senha
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            console.log('[PasswordResetService] Senha hash gerada');

            // Atualiza o usuário com a nova senha e força mudança
            // IMPORTANTE: A senha deve ser atualizada no banco mesmo se o email falhar
            try {
                await prisma.user.update({
                    where: { Id: userId },
                    data: {
                        Password: hashedPassword,
                        MustChangePassword: true,
                        ResetPasswordToken: null,
                        ResetPasswordTokenExpiresAt: null
                    }
                });
                console.log('[PasswordResetService] ✅ Senha atualizada no banco de dados com sucesso');
            } catch (dbError: unknown) {
                console.error('[PasswordResetService] ❌ Erro ao atualizar senha no banco:', dbError);
                const errorMessage = dbError instanceof Error ? dbError.message : 'Erro desconhecido';
                
                // Registra falha na auditoria
                await this.auditService.log({
                    userId: adminId,
                    actionType: 'Manage',
                    module: Module.SystemSettings,
                    description: `Erro ao gerar senha aleatória para usuário ${user.Nome} (${user.Email}) - ID: ${userId}`,
                    ipAddress: ipAddress || undefined,
                    status: 'Falha',
                    metadata: {
                        targetUserId: userId,
                        targetUserEmail: user.Email,
                        error: errorMessage,
                    }
                });

                return { 
                    success: false, 
                    message: `Erro ao atualizar senha no banco de dados: ${errorMessage}` 
                };
            }

            // Enfileira e-mail com a senha para envio assíncrono (apenas uma vez)
            // Se o email falhar, a senha já foi atualizada no banco
            try {
                const { emailQueue } = await import('../../queues/emailQueue');
                
                if (emailQueue) {
                    await emailQueue.add(
                        'sendRandomPassword',
                        {
                            type: 'randomPassword',
                            to: user.Email,
                            nome: user.Nome,
                            subject: 'Nova Senha Gerada',
                            htmlTemplate: 'randomPassword',
                            templateData: {
                                nome: user.Nome,
                                password: randomPassword,
                                warning: 'Por segurança, você será obrigado a alterar esta senha no próximo login.',
                            },
                        },
                        {
                            jobId: `random-password-${userId}-${Date.now()}`, // Evita duplicatas
                            priority: 1, // Alta prioridade para senhas
                        }
                    );
                    console.log('[PasswordResetService] ✅ Email enfileirado para envio assíncrono');
                } else {
                    // Fallback: envia síncrono se a fila não estiver disponível
                    console.warn('[PasswordResetService] ⚠️ Fila de email não disponível, enviando síncrono');
                    await this.emailService.sendRandomPasswordEmail(
                        user.Email,
                        user.Nome,
                        randomPassword
                    );
                    console.log('[PasswordResetService] ✅ Email enviado síncrono com sucesso');
                }
            } catch (emailError: unknown) {
                console.error('[PasswordResetService] ⚠️ Erro ao enfileirar/enviar email (senha já foi atualizada):', emailError);
                // Não retorna erro aqui, pois a senha já foi atualizada
                // Apenas loga o erro para debug
            }

            // Registra sucesso na auditoria
            await this.auditService.log({
                userId: adminId,
                actionType: 'Manage',
                module: Module.SystemSettings,
                description: `Senha aleatória gerada para usuário ${user.Nome} (${user.Email}) - ID: ${userId}`,
                ipAddress: ipAddress || undefined,
                status: 'Sucesso',
                metadata: {
                    targetUserId: userId,
                    targetUserEmail: user.Email,
                    requiresPasswordChange: true,
                }
            });

            return {
                success: true,
                message: 'Senha aleatória gerada com sucesso. O usuário será obrigado a alterá-la no próximo login.',
                password: randomPassword, // Retorna apenas para exibição única
                expiresAt: undefined
            };
        } catch (error: unknown) {
            console.error('[PasswordResetService] ❌ Erro geral ao gerar senha aleatória:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return { 
                success: false, 
                message: `Erro ao gerar senha aleatória: ${errorMessage}` 
            };
        }
    }

    /**
     * Gera uma senha aleatória segura
     */
    private generateSecurePassword(length: number = 12): string {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const special = '!@#$%&*';
        const allChars = uppercase + lowercase + numbers + special;

        // Garante pelo menos um de cada tipo
        let password = '';
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += special[Math.floor(Math.random() * special.length)];

        // Completa com caracteres aleatórios
        for (let i = password.length; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        // Embaralha a senha
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
}

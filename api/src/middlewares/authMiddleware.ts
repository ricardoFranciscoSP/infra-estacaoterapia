import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { SMSService } from '../services/sms.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { User } from '../types/user.types';

declare module 'express-serve-static-core' {
    interface Request {
        user?: User;
    }
}

// Instancie os serviços apenas uma vez
const emailService = new EmailService();
const smsService = new SMSService();
const whatsAppService = new WhatsAppService();

const authService = new AuthService(emailService, smsService, whatsAppService);

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Rotas públicas que não requerem autenticação e não devem ser bloqueadas por manutenção
    const publicRoutes = [
        '/api/configuracoes/manutencao',
        '/api/auth',
        '/api/webhook',
    ];
    
    const isPublicRoute = publicRoutes.some(route => req.path.startsWith(route));
    
    // Se for rota pública, pula verificação de manutenção e autenticação
    if (isPublicRoute) {
        next();
        return;
    }

    let token = '';

    // Primeiro tenta pegar do cookie (httpOnly)
    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    // Se não houver cookie, tenta pegar do header Authorization
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.slice(7);
    }

    if (!token) {
        res.status(401).json({ success: false, message: 'Token não fornecido' });
        return;
    }

    const result = await authService.getAuthenticatedUser(token);

    if (!result.success || !result.user) {
        res.status(401).json({ message: 'Token inválido ou usuário não encontrado' });
        return;
    }
    
    // Verifica modo de manutenção DEPOIS da autenticação (só para rotas não-admin)
    try {
        const prismaClient = (await import('../prisma/client')).default;
        const configuracao = await prismaClient.configuracao.findFirst({
            orderBy: { CreatedAt: 'desc' },
        });
        
        const isMaintenanceMode = configuracao && 'manutencao' in configuracao && configuracao.manutencao === true;
        
        if (isMaintenanceMode) {
            // IMPORTANTE: Apenas Admin tem acesso durante manutenção
            const isAdmin = result.user.Role === 'Admin';
            
            if (!isAdmin) {
                // Se não for Admin, bloqueia acesso durante manutenção
                res.status(503).json({ 
                    success: false, 
                    message: 'Sistema em manutenção. Apenas administradores têm acesso.',
                    maintenance: true 
                });
                return;
            }
            // Se for Admin, permite acesso normalmente
        }
    } catch (error) {
        console.error('Erro ao verificar modo de manutenção:', error);
        // Em caso de erro, continua normalmente
    }
    
    (req as any).user = result.user;
    next();
};

export const authorize =
    (...roles: string[]) =>
        (req: Request, res: Response, next: NextFunction): void => {
            const user = (req as any).user;

            if (!user) {
                console.log('[authorize] Usuário não autenticado');
                res.status(401).json({ success: false, error: 'Não autenticado', message: 'Você precisa estar logado para acessar este recurso.' });
                return;
            }

            if (!roles.includes(user.Role)) {
                console.log('[authorize] Acesso negado para role:', user.Role, 'Roles permitidos:', roles);
                res.status(403).json({ success: false, error: 'Acesso negado', message: `Acesso negado. Role necessário: ${roles.join(', ')}. Role atual: ${user.Role}` });
                return;
            }

            next();
        };
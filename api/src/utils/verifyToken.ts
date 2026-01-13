import jwt from 'jsonwebtoken';

export const verifyToken = (token: string): any => {
    try {
        if (!token) {
            throw new Error('Token não fornecido');
        }

        const secret = process.env.JWT_SECRET as string;
        if (!secret) {
            console.error('JWT_SECRET não está definido nas variáveis de ambiente');
            throw new Error('Configuração de segurança inválida');
        }

        const decoded = jwt.verify(token, secret);
        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            console.error('Token expirado:', error.message);
        } else if (error instanceof jwt.JsonWebTokenError) {
            console.error('Token inválido:', error.message);
        } else {
            console.error('Erro ao verificar token:', error);
        }
        return null; // Retorna null se o token for inválido ou expirado
    }
};

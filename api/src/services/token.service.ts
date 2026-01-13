import prisma from '../prisma/client';
import { generateToken } from '../utils/generateToken';

export interface ITokenService {
    generateTokens(userId: string): Promise<{ token: string; refreshToken: string }>;
    revokeRefreshToken(token: string): Promise<void>;
    refreshAccessToken(token: string): Promise<{ success: boolean; message: string; accessToken?: string }>;
}

export class TokenService implements ITokenService {
    async generateTokens(userId: string): Promise<{ token: string; refreshToken: string }> {
        const token = generateToken(userId, process.env.JWT_SECRET!, '7d');
        const refreshToken = generateToken(userId, process.env.JWT_SECRET!, '30d');

        await prisma.refreshToken.create({
            data: {
                UserId: userId, // Certifique-se que user.Id está definido
                Token: refreshToken,
                ExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
                // Não inclua o campo User aqui!
            },
        });

        return { token, refreshToken };
    }

    async revokeRefreshToken(token: string): Promise<void> {
        if (token) {
            await prisma.refreshToken.deleteMany({ where: { Token: token } });
        }
    }

    async refreshAccessToken(token: string): Promise<{ success: boolean; message: string; accessToken?: string }> {
        if (!token) {
            return { success: false, message: 'Refresh token não fornecido.' };
        }

        const storedToken = await prisma.refreshToken.findUnique({ where: { Token: token } });
        if (!storedToken) {
            return { success: false, message: 'Refresh token não encontrado no banco de dados.' };
        }
        if (storedToken.ExpiresAt < new Date()) {
            return { success: false, message: 'Refresh token expirado.' };
        }

        const newAccessToken = generateToken(storedToken.UserId, process.env.JWT_SECRET!, '7d');
        return { success: true, message: 'Token atualizado com sucesso.', accessToken: newAccessToken };
    }
}
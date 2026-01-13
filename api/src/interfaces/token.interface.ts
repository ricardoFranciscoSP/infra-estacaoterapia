export interface ITokenService {
    generateTokens(userId: string): Promise<{ token: string; refreshToken: string }>;
    revokeRefreshToken(token: string): Promise<void>;
    refreshAccessToken(token: string): Promise<{ success: boolean; message: string; accessToken?: string }>;
}
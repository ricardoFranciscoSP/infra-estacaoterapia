// src/services/agoraService.ts
import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from 'agora-token';

const appId: string = process.env.AGORA_APP_ID as string;
const appCertificate: string = process.env.AGORA_APP_CERTIFICATE as string;

export class AgoraService {
    /**
     * Gera token RTC para um usuário específico (paciente ou psicólogo)
     * @param channelName - Nome do canal Agora
     * @param uid - UID único do usuário (deve ser numérico)
     * @param role - Role do usuário (paciente ou psicólogo)
     * @returns Token de acesso do Agora
     */
    async generateToken(channelName: string, uid: number | string, role: 'patient' | 'psychologist' = 'patient'): Promise<string> {
        const ttlInSeconds = 3600; // 1 hora
        const rtcRole = RtcRole.PUBLISHER;

        // Garante que uid seja número (RTC usa UID numérico)
        const uidNum = typeof uid === 'string' ? Number(uid) : uid;
        if (Number.isNaN(uidNum) || uidNum <= 0) {
            throw new Error('UID inválido para geração de token RTC. Deve ser um número positivo.');
        }

        try {
            // Timestamp de expiração (epoch seconds)
            const currentTs = Math.floor(Date.now() / 1000);
            const expireTs = currentTs + ttlInSeconds;

            const token: string = RtcTokenBuilder.buildTokenWithUid(
                appId,
                appCertificate,
                channelName,
                uidNum,
                rtcRole,
                expireTs,
                expireTs
            );

            // Remove espaços em branco
            const tokenSemEspacos = token.replace(/\s/g, '');

            console.log(`✅ [AGORA] Token gerado para ${role} com UID ${uidNum} no canal ${channelName}`);

            return tokenSemEspacos;
        } catch (error) {
            console.error(`❌ [AGORA] Erro ao gerar token para ${role}:`, error);
            throw new Error(`Falha ao gerar token do Agora para ${role}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }

    async generateRtmToken(channelName: string, account: number | string): Promise<string> {
        const ttlInSeconds = 3600; // 1 hora

        const accountStr = typeof account === 'number' ? String(account) : account;
        if (!accountStr || accountStr.trim() === '') {
            throw new Error('Account inválida para geração de token RTM.');
        }

        try {
            const currentTs = Math.floor(Date.now() / 1000);
            const expireTs = currentTs + ttlInSeconds;

            const tokenWithRtm: string = RtmTokenBuilder.buildToken(
                appId,
                appCertificate,
                accountStr,
                expireTs
            );
            // Remove espaços em branco
            const tokenSemEspacos = tokenWithRtm.replace(/\s/g, '');
            return tokenSemEspacos;
        } catch (error) {
            console.error('❌ [AGORA] Erro ao gerar token RTM:', error);
            throw new Error(`Falha ao gerar token RTM do Agora: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }
}
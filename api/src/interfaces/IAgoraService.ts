// src/interfaces/IAgoraService.ts
export interface IAgoraService {
    generateToken(channelName: string, uid: number | string, role?: 'patient' | 'psychologist'): Promise<string>;
    generateRtmToken(channelName: string, account: number | string): Promise<string>;
}
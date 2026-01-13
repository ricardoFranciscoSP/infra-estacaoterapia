import { sendWhatsAppMessage } from '../services/communication.service';

export interface IWhatsAppService {
    sendResetCode(telefone: string, resetCode: string): Promise<void>;
}

export class WhatsAppService implements IWhatsAppService {
    async sendResetCode(telefone: string, resetCode: string): Promise<void> {
        await sendWhatsAppMessage(telefone, `Seu código de redefinição de senha é: ${resetCode}`);
    }
}
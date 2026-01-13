import { sendSMS } from '../services/communication.service';

export interface ISMSService {
    sendResetCode(telefone: string, resetCode: string): Promise<void>;
}

export class SMSService implements ISMSService {
    async sendResetCode(telefone: string, resetCode: string): Promise<void> {
        await sendSMS(telefone, `Seu código de redefinição de senha é: ${resetCode}`);
    }
}
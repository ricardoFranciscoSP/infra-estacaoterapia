import { IEmailService } from '../interfaces/email.interface';

export class ContatoService {
    constructor(private emailService: IEmailService) {}

    async enviarContato({ nome, email, telefone, assunto, mensagem }: { nome: string; email: string; telefone: string; assunto: string; mensagem: string }) {
        await this.emailService.sendContatoEmail({ nome, email, telefone, assunto, mensagem });
    }
}

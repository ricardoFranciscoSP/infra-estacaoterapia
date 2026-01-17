import { Request, Response } from 'express';
import { EmailService } from '../services/email.service';
import { ContatoService } from '../services/contato.service';
import { verifyRecaptcha } from '../utils/recaptcha.util';

const contatoService = new ContatoService(new EmailService());

export class ContatoController {
    static async enviarContato(req: Request, res: Response) {
        const { nome, email, telefone, assunto, mensagem, recaptchaToken } = req.body;
        if (!nome || !email || !assunto || !mensagem) {
            return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
        }
        if (!recaptchaToken || typeof recaptchaToken !== 'string') {
            return res.status(400).json({ error: 'reCAPTCHA obrigatório.' });
        }
        try {
            const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '';
            const captchaResult = await verifyRecaptcha(recaptchaToken, ip);
            if (!captchaResult.success) {
                return res.status(400).json({ error: 'Captcha inválido.' });
            }
            await contatoService.enviarContato({ nome, email, telefone, assunto, mensagem });
            return res.status(200).json({ message: 'Contato enviado com sucesso.' });
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao enviar contato.' });
        }
    }
}

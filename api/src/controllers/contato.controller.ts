import { Request, Response } from 'express';
import { EmailService } from '../services/email.service';
import { ContatoService } from '../services/contato.service';

const contatoService = new ContatoService(new EmailService());

export class ContatoController {
    static async enviarContato(req: Request, res: Response) {
        const { nome, email, telefone, assunto, mensagem } = req.body;
        if (!nome || !email || !assunto || !mensagem) {
            return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
        }
        try {
            await contatoService.enviarContato({ nome, email, telefone, assunto, mensagem });
            return res.status(200).json({ message: 'Contato enviado com sucesso.' });
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao enviar contato.' });
        }
    }
}

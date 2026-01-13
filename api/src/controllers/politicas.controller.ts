import { Request, Response } from 'express';
import { ContratoService } from '../services/gerarPdf.service';

export class PoliticasController {
    /**
     * Gera PDF da política de agendamento do paciente
     * GET /api/politicas/agendamento-paciente/pdf
     */
    async gerarPoliticaAgendamentoPaciente(req: Request, res: Response): Promise<Response> {
        try {
            const contratoService = new ContratoService();
            const pdfBuffer = await contratoService.gerarPoliticaAgendamentoPaciente();

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="politica-agendamento-paciente.pdf"');
            return res.send(pdfBuffer);
        } catch (error: any) {
            console.error('Erro ao gerar PDF da política de agendamento:', error);
            return res.status(500).json({ 
                error: 'Erro ao gerar PDF da política de agendamento',
                details: error.message 
            });
        }
    }
}


import { Request, Response } from 'express';
import { IGerarAgendaService } from '../interfaces/gerarAgenda.interface';

export class GerarAgendaController {

    private gerarAgendaService: IGerarAgendaService;

    constructor(gerarAgendaService: IGerarAgendaService) {
        this.gerarAgendaService = gerarAgendaService;

        // Bind dos métodos para garantir o contexto correto de 'this'
        this.gerarAutomatica = this.gerarAutomatica.bind(this);
        this.gerarManual = this.gerarManual.bind(this);
        this.deletarAgendasAnteriores = this.deletarAgendasAnteriores.bind(this);
    }

    /**
     * Gera agendas automaticamente para o usuário.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com resultado da geração ou erro.
     */
    async gerarAutomatica(req: Request, res: Response): Promise<any> {
        try {
            const result = await this.gerarAgendaService.gerarAutomatica(req, res);
            if (result.error) {
                // Mostra o erro detalhado se vier do serviço
                return res.status(500).json({ error: result.error });
            }
            return res.status(200).json(result);
        } catch (error: any) {
            // Mostra o erro detalhado do serviço, inclusive stack trace se existir
            console.error('Erro ao gerar agenda automaticamente:', error);
            return res.status(500).json({
                error: 'Erro interno ao gerar agenda.',
                details: error?.message || error,
                stack: error?.stack || undefined
            });
        }
    }

    /**
     * Gera agendas manualmente para o usuário.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com resultado da geração ou erro.
     */
    async gerarManual(req: Request, res: Response): Promise<any> {
        try {
            const result = await this.gerarAgendaService.gerarManual(req, res);
            if (result.error) {
                return res.status(404).json({ error: result.error });
            }
            return res.status(200).json({
                message: 'Agendas geradas manualmente.',
                resultados: result.resultados,
            });
        } catch (error) {
            console.error('Erro ao gerar agenda manualmente:', error);
            return res.status(500).json({ error: 'Erro interno ao gerar agenda.' });
        }
    }

    /**
     * Deleta agendas anteriores do usuário.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com resultado da exclusão ou erro.
     */
    async deletarAgendasAnteriores(req: Request, res: Response): Promise<any> {
        try {
            const deleted = await this.gerarAgendaService.deletarAgendasAnteriores(req, res);
            return res.status(200).json({
                message: 'Agendas anteriores deletadas com sucesso.',
                registrosExcluidos: deleted,
            });
        } catch (error) {
            console.error('Erro ao deletar agendas anteriores:', error);
            return res.status(500).json({ error: 'Erro interno ao deletar agendas anteriores.' });
        }
    }
}

export default GerarAgendaController;
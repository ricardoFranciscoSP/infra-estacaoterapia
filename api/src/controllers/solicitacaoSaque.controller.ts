import { Request, Response } from 'express';
import { AuthorizationService } from '../services/authorization.service';
import { SolicitacaoSaqueService } from '../services/solicitacaoSaque.service';

export class SolicitacaoSaqueController {
    private authService: AuthorizationService;
    private solicitacaoSaqueService: SolicitacaoSaqueService;

    constructor() {
        this.authService = new AuthorizationService();
        this.solicitacaoSaqueService = new SolicitacaoSaqueService();
    }

    async verificarTipoPsicologo(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const resultado = await this.solicitacaoSaqueService.verificarTipoPsicologo(userId);
            return res.status(200).json(resultado);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return res.status(500).json({ success: false, message: errorMessage });
        }
    }

    async verificarFormularioStatus(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const resultado = await this.solicitacaoSaqueService.verificarFormularioSaqueAutonomo(userId);
            return res.status(200).json(resultado);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return res.status(500).json({ success: false, message: errorMessage });
        }
    }

    async criarSolicitacaoSaque(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Log completo do request para debug
            console.log('[SolicitacaoSaqueController] Request completo:', {
                body: req.body,
                hasFile: !!req.file,
                file: req.file ? {
                    fieldname: req.file.fieldname,
                    originalname: req.file.originalname,
                    encoding: req.file.encoding,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    hasBuffer: !!req.file.buffer,
                    bufferLength: req.file.buffer?.length
                } : null
            });

            const { valor, periodo, quantidadeConsultas } = req.body;
            // upload.single() coloca o arquivo em req.file, não req.files
            const notaFiscalFile = req.file as Express.Multer.File | undefined;

            console.log('[SolicitacaoSaqueController] Dados extraídos:', {
                valor,
                periodo,
                quantidadeConsultas,
                valorType: typeof valor,
                periodoType: typeof periodo,
                quantidadeConsultasType: typeof quantidadeConsultas,
                hasFile: !!notaFiscalFile,
                fileName: notaFiscalFile?.originalname,
                fileSize: notaFiscalFile?.size
            });

            // Validação mais detalhada
            if (!valor) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Campo obrigatório faltando: valor' 
                });
            }
            if (!periodo) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Campo obrigatório faltando: periodo' 
                });
            }
            if (quantidadeConsultas === undefined || quantidadeConsultas === null) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Campo obrigatório faltando: quantidadeConsultas' 
                });
            }

            const resultado = await this.solicitacaoSaqueService.criarSolicitacaoSaque({
                userId,
                valor: parseFloat(valor),
                periodo: String(periodo),
                quantidadeConsultas: parseInt(quantidadeConsultas),
                notaFiscalFile
            });

            return res.status(resultado.success ? 201 : 400).json(resultado);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[SolicitacaoSaqueController] Erro ao criar solicitação:', error);
            return res.status(500).json({ success: false, message: errorMessage });
        }
    }

    async getUltimaSolicitacaoSaque(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const resultado = await this.solicitacaoSaqueService.getUltimaSolicitacaoSaque(userId);
            return res.status(200).json(resultado);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return res.status(500).json({ success: false, message: errorMessage });
        }
    }
}

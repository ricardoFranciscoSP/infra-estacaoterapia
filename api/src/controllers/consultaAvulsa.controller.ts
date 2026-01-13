import { Request, Response } from "express";
import { AuthorizationService } from "../services/authorization.service";
import { IConsultaAvulsa, IConsultaAvulsaService } from "../interfaces/consultaAvulsa.interface";

export class ConsultaAvulsaController {
    constructor(
        private authService: AuthorizationService,
        private consultaAvulsaService: IConsultaAvulsaService
    ) { }

    /**
     * Registra uma compra de consulta avulsa para o usuário autenticado.
     * @param req Request do Express contendo dados da consulta.
     * @param res Response do Express.
     * @returns Response com resultado da compra ou erro.
     */
    async registrarConsultaAvulsa(req: Request, res: Response): Promise<Response> {
        const startTime = Date.now();
        console.log('🔍 [ConsultaAvulsaController] registrarConsultaAvulsa: INICIANDO', {
            body: req.body,
            timestamp: new Date().toISOString()
        });

        try {
            const { quantidade, vindiProductId, preco, payment_method_code, fromAgendamento, agendaId } = req.body;

            console.log('🔍 [ConsultaAvulsaController] registrarConsultaAvulsa: Dados recebidos', {
                quantidade,
                vindiProductId,
                preco,
                payment_method_code,
                fromAgendamento,
                agendaId
            });

            const userId = this.authService.getLoggedUserId(req);
            console.log('🔍 [ConsultaAvulsaController] registrarConsultaAvulsa: userId extraído', { userId });

            if (!userId) {
                console.error('❌ [ConsultaAvulsaController] registrarConsultaAvulsa: Usuário não autorizado');
                return res.status(401).json({ error: "Usuário não autorizado." });
            }

            const data: IConsultaAvulsa = { 
                userId, 
                quantidade, 
                vindiProductId, 
                preco, 
                payment_method_code,
                fromAgendamento: fromAgendamento || false,
                agendaId: agendaId || null
            };
            
            console.log('🔍 [ConsultaAvulsaController] registrarConsultaAvulsa: Chamando service...', { data });
            const resultado = await this.consultaAvulsaService.CompraConsultaAvulsa(data);
            console.log('🔍 [ConsultaAvulsaController] registrarConsultaAvulsa: Service retornou', {
                hasResultado: !!resultado,
                resultadoKeys: resultado ? Object.keys(resultado) : []
            });

            // Se é proveniente de agendamento e houve sucesso, retorna sucesso sem redirecionar
            if (fromAgendamento) {
                const duration = Date.now() - startTime;
                console.log('✅ [ConsultaAvulsaController] registrarConsultaAvulsa: CONCLUÍDO (fromAgendamento)', {
                    duration: `${duration}ms`,
                    timestamp: new Date().toISOString()
                });
                return res.status(201).json({ 
                    success: true, 
                    consulta: resultado,
                    fromAgendamento: true,
                    message: "Consulta avulsa comprada com sucesso. Você pode agendar sua consulta agora."
                });
            }

            const duration = Date.now() - startTime;
            console.log('✅ [ConsultaAvulsaController] registrarConsultaAvulsa: CONCLUÍDO com sucesso', {
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            });
            return res.status(201).json({ success: true, consulta: resultado });
        } catch (error: any) {
            const duration = Date.now() - startTime;
            console.error('❌ [ConsultaAvulsaController] registrarConsultaAvulsa: ERRO', {
                error: error.message || String(error),
                stack: error.stack,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            });
            
            // Se é proveniente de agendamento, retorna erro específico sem redirecionar
            const fromAgendamento = req.body.fromAgendamento || false;
            if (fromAgendamento) {
                return res.status(400).json({ 
                    error: error.message || "Erro ao processar pagamento da consulta avulsa.",
                    fromAgendamento: true,
                    shouldNotRedirect: true,
                    shouldNotSchedule: true
                });
            }
            
            return res.status(400).json({ error: error.message || "Erro ao registrar consulta avulsa." });
        }
    }
}

import { Request, Response } from "express";
import { AuthorizationService } from "../../services/authorization.service";
import { ConsultasPacienteService } from "../../services/paciente/consultas.service";
import { AgendaStatus } from "../../generated/prisma";
import { normalizeQueryString, normalizeQueryInt, normalizeParamStringRequired } from "../../utils/validation.util";

export class ConsultasPacienteController {
    /**
     * Inicia uma consulta (atualiza status para 'Andamento')
     * POST /api/paciente/consultas/iniciar/:id
     */
    async iniciarConsulta(req: Request, res: Response): Promise<void> {
        const consultaId = normalizeParamStringRequired(req.params.id);
        if (!consultaId) {
            res.status(400).json({ success: false, error: 'ID da consulta é obrigatório.' });
            return;
        }
        try {
            const result = await this.consultasService.iniciarConsulta(consultaId);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erro interno' });
        }
    }

    /**
     * Finaliza uma consulta (atualiza status para 'Realizada')
     * POST /api/paciente/consultas/finalizar/:id
     * Query param opcional: forceFinalize=true (força finalização mesmo se ambos não estiveram na sala)
     */
    async finalizarConsulta(req: Request, res: Response): Promise<void> {
        const consultaId = normalizeParamStringRequired(req.params.id);

        // Converte forceFinalize para boolean de forma segura
        const forceFinalizeParam = req.query.forceFinalize;
        const forceFinalize = typeof forceFinalizeParam === 'string'
            ? forceFinalizeParam === 'true'
            : Array.isArray(forceFinalizeParam)
                ? forceFinalizeParam[0] === 'true'
                : false;

        if (!consultaId) {
            res.status(400).json({ success: false, error: 'ID da consulta é obrigatório.' });
            return;
        }
        try {
            const result = await this.consultasService.finalizarConsulta(consultaId, forceFinalize);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('Erro ao finalizar consulta:', error);
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erro interno' });
        }
    }

    /**
     * Finaliza uma consulta e verifica se precisa de review
     * POST /api/paciente/consultas/finalizar-com-review/:id
     * Query param opcional: forceFinalize=true (força finalização mesmo se ambos não estiveram na sala)
     * Retorna: { success: true, requiresReview: boolean, psychologistId?: string, consultaFinalizada: any }
     */
    async finalizarConsultaComReview(req: Request, res: Response): Promise<void> {
        const consultaId = normalizeParamStringRequired(req.params.id);
        const patientId = this.authService.getLoggedUserId(req);

        // Converte forceFinalize para boolean de forma segura
        const forceFinalizeParam = req.query.forceFinalize;
        const forceFinalize = typeof forceFinalizeParam === 'string'
            ? forceFinalizeParam === 'true'
            : Array.isArray(forceFinalizeParam)
                ? forceFinalizeParam[0] === 'true'
                : false;

        if (!consultaId) {
            res.status(400).json({ success: false, error: 'ID da consulta é obrigatório.' });
            return;
        }

        if (!patientId) {
            res.status(401).json({ success: false, error: 'Usuário não autenticado.' });
            return;
        }

        try {
            const { FinalizarConsultaService } = await import('../../services/paciente/finalizarConsulta.service');
            const finalizarConsultaService = new FinalizarConsultaService();
            const result = await finalizarConsultaService.finalizarConsultaComReview(
                consultaId,
                patientId,
                forceFinalize
            );
            res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao finalizar consulta com review:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro interno',
                requiresReview: false
            });
        }
    }

    /**
     * Retorna a consulta em andamento do paciente
     * GET /api/paciente/consultas/em-andamento
     */
    async consultaEmAndamento(req: Request, res: Response): Promise<void> {
        const pacienteId = this.authService.getLoggedUserId(req);

        if (!pacienteId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        try {
            const consulta = await this.consultasService.consultaEmAndamento(pacienteId);
            console.log('[consultaEmAndamento][paciente] userId:', pacienteId, 'consulta:', consulta?.Id, 'status:', consulta?.Status, 'date:', consulta?.Date, 'time:', consulta?.Time);

            if (!consulta) {
                res.status(200).json({
                    success: true,
                    message: 'Nenhuma consulta em andamento no momento.',
                    data: null
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: consulta
            });
        } catch (error) {
            console.error('Erro ao buscar consulta em andamento:', error);
            res.status(500).json({
                error: "Erro ao buscar consulta em andamento",
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    constructor(
        private authService: AuthorizationService,
        private consultasService: ConsultasPacienteService
    ) { }

    /**
     * Lista todas as consultas realizadas do paciente
     * GET /api/paciente/consultas/realizadas
     * Query params opcionais:
     * - status: string (pode ser um ou múltiplos separados por vírgula)
     */
    async listarConsultasRealizadas(req: Request, res: Response): Promise<void> {
        const pacienteId = this.authService.getLoggedUserId(req);

        if (!pacienteId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        try {
            const statusQuery = normalizeQueryString(req.query.status);
            let statusFiltro: AgendaStatus[] | undefined;

            // Se foi passado status na query, converte para array de AgendaStatus
            if (statusQuery) {
                const statusArray = statusQuery.split(',').map(s => s.trim());
                statusFiltro = statusArray.filter(s =>
                    Object.values(AgendaStatus).includes(s as AgendaStatus)
                ) as AgendaStatus[];
            }

            const consultas = await this.consultasService.listarConsultasRealizadas(
                pacienteId,
                statusFiltro
            );

            res.status(200).json({
                success: true,
                total: consultas.length,
                data: consultas
            });
        } catch (error) {
            console.error('Erro ao listar consultas realizadas:', error);
            res.status(500).json({
                error: "Erro ao buscar consultas realizadas",
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Lista consultas por status específico
     * GET /api/paciente/consultas/por-status/:status
     */
    async listarConsultasPorStatus(req: Request, res: Response): Promise<void> {
        const pacienteId = this.authService.getLoggedUserId(req);
        const status = req.params.status as AgendaStatus;

        if (!pacienteId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        if (!Object.values(AgendaStatus).includes(status)) {
            res.status(400).json({
                error: "Status inválido",
                statusDisponiveis: Object.values(AgendaStatus)
            });
            return;
        }

        try {
            const consultas = await this.consultasService.listarConsultasPorStatus(
                pacienteId,
                status
            );

            res.status(200).json({
                success: true,
                status: status,
                total: consultas.length,
                data: consultas
            });
        } catch (error) {
            console.error('Erro ao listar consultas por status:', error);
            res.status(500).json({
                error: "Erro ao buscar consultas por status",
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Conta total de consultas por status
     * GET /api/paciente/consultas/contar
     */
    async contarConsultasRealizadas(req: Request, res: Response): Promise<void> {
        const pacienteId = this.authService.getLoggedUserId(req);

        if (!pacienteId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        try {
            const statusQuery = normalizeQueryString(req.query.status);
            let statusFiltro: AgendaStatus[] | undefined;

            if (statusQuery) {
                const statusArray = statusQuery.split(',').map(s => s.trim());
                statusFiltro = statusArray.filter(s =>
                    Object.values(AgendaStatus).includes(s as AgendaStatus)
                ) as AgendaStatus[];
            }

            const total = await this.consultasService.contarConsultasPorStatus(
                pacienteId,
                statusFiltro
            );

            res.status(200).json({
                success: true,
                total: total
            });
        } catch (error) {
            console.error('Erro ao contar consultas:', error);
            res.status(500).json({
                error: "Erro ao contar consultas",
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Lista TODAS as consultas realizadas com os status finalizados
     * GET /api/paciente/consultas/todas-realizadas
     * Status incluídos: Reagendada, Concluido, Cancelado, Cancelled_by_patient, Cancelled_by_psychologist, Cancelled_no_show
     * NÃO inclui: Reservado, Andamento
     */
    async listarTodasConsultasRealizadas(req: Request, res: Response): Promise<void> {
        const pacienteId = this.authService.getLoggedUserId(req);

        if (!pacienteId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        try {
            // Status fixos para consultas realizadas: Reagendada, Realizada e Canceladas (qualquer motivo)
            // NÃO inclui: Reservado, EmAndamento, Agendada
            // Usa ConsultaStatus (não AgendaStatus) pois o campo Status da Consulta é ConsultaStatus
            const statusRealizadas: string[] = [
                'ReagendadaPacienteNoPrazo',
                'ReagendadaPsicologoNoPrazo',
                'ReagendadaPsicologoForaDoPrazo',
                'Realizada',
                'Cancelado',
                'CanceladaPacienteNoPrazo',
                'CanceladaPacienteForaDoPrazo',
                'CanceladaPsicologoNoPrazo',
                'CanceladaPsicologoForaDoPrazo',
                'CanceladaForcaMaior',
                'CanceladaNaoCumprimentoContratualPaciente',
                'CanceladaNaoCumprimentoContratualPsicologo',
                'CanceladoAdministrador',
                'PacienteNaoCompareceu',
                'PsicologoNaoCompareceu',
                'PsicologoDescredenciado'
            ];

            const consultas = await this.consultasService.listarConsultasRealizadas(
                pacienteId,
                statusRealizadas
            );

            res.status(200).json({
                success: true,
                total: consultas.length,
                statusIncluidos: statusRealizadas,
                data: consultas
            });
        } catch (error) {
            console.error('Erro ao listar todas as consultas realizadas:', error);
            console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
            res.status(500).json({
                error: "Erro ao buscar todas as consultas realizadas",
                message: error instanceof Error ? error.message : 'Erro desconhecido',
                details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
            });
        }
    }

    /**
     * Lista consultas realizadas por status e mês
     * GET /api/paciente/consultas/por-status-e-mes
     * Query params:
     * - mes: number (1-12) - obrigatório
     * - ano: number (ex: 2025) - obrigatório
     * - status: string (opcional, separados por vírgula)
     */
    async listarConsultasPorStatusEMes(req: Request, res: Response): Promise<void> {
        const pacienteId = this.authService.getLoggedUserId(req);

        if (!pacienteId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        try {
            const mes = normalizeQueryInt(req.query.mes);
            const ano = normalizeQueryInt(req.query.ano);
            const statusQuery = normalizeQueryString(req.query.status);

            // Validação de mês e ano
            if (!mes || !ano || mes < 1 || mes > 12 || ano < 2000 || ano > 2100) {
                res.status(400).json({
                    error: "Parâmetros inválidos",
                    message: "Mês deve estar entre 1 e 12, e ano deve ser válido"
                });
                return;
            }

            let statusFiltro: AgendaStatus[] | undefined;

            if (statusQuery) {
                const statusArray = statusQuery.split(',').map(s => s.trim());
                statusFiltro = statusArray.filter(s =>
                    Object.values(AgendaStatus).includes(s as AgendaStatus)
                ) as AgendaStatus[];
            }

            const consultas = await this.consultasService.listarConsultasPorStatusEMes(
                pacienteId,
                mes,
                ano,
                statusFiltro
            );

            res.status(200).json({
                success: true,
                mes: mes,
                ano: ano,
                total: consultas.length,
                data: consultas
            });
        } catch (error) {
            console.error('Erro ao listar consultas por status e mês:', error);
            res.status(500).json({
                error: "Erro ao buscar consultas por status e mês",
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Conta consultas por status e mês
     * GET /api/paciente/consultas/contar-por-status-e-mes
     */
    async contarConsultasPorStatusEMes(req: Request, res: Response): Promise<void> {
        const pacienteId = this.authService.getLoggedUserId(req);

        if (!pacienteId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        try {
            const mes = normalizeQueryInt(req.query.mes);
            const ano = normalizeQueryInt(req.query.ano);
            const statusQuery = normalizeQueryString(req.query.status);

            if (!mes || !ano || mes < 1 || mes > 12 || ano < 2000 || ano > 2100) {
                res.status(400).json({
                    error: "Parâmetros inválidos",
                    message: "Mês deve estar entre 1 e 12, e ano deve ser válido"
                });
                return;
            }

            let statusFiltro: AgendaStatus[] | undefined;

            if (statusQuery) {
                const statusArray = statusQuery.split(',').map(s => s.trim());
                statusFiltro = statusArray.filter(s =>
                    Object.values(AgendaStatus).includes(s as AgendaStatus)
                ) as AgendaStatus[];
            }

            const total = await this.consultasService.contarConsultasPorStatusEMes(
                pacienteId,
                mes,
                ano,
                statusFiltro
            );

            res.status(200).json({
                success: true,
                mes: mes,
                ano: ano,
                total: total
            });
        } catch (error) {
            console.error('Erro ao contar consultas por status e mês:', error);
            res.status(500).json({
                error: "Erro ao contar consultas por status e mês",
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
}

import { Request, Response } from "express";
import { AuthorizationService } from "../../services/authorization.service";
import { ConsultasService } from "../../services/psicologo/consultas.service";
import { AgendaStatus } from "../../generated/prisma/client";

export class ConsultasPsicologoController {
    /**
     * Inicia uma consulta (atualiza status para 'Andamento')
     * POST /api/psicologo/consultas/iniciar/:id
     */
    async iniciarConsulta(req: Request, res: Response): Promise<void> {
        const consultaId = req.params.id;
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
     * Retorna a consulta em andamento do psicólogo
     * GET /api/psicologo/consultas/em-andamento
     */
    async consultaEmAndamento(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);
        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }
        try {
            const consulta = await this.consultasService.consultaEmAndamento(psicologoId);
            console.log('[consultaEmAndamento][psicologo] userId:', psicologoId, 'consulta:', consulta?.Id, 'status:', consulta?.Status, 'date:', consulta?.Date, 'time:', consulta?.Time);
            res.status(200).json({ success: true, consulta });
        } catch (error) {
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erro interno' });
        }
    }

    constructor(
        private authService: AuthorizationService,
        private consultasService: ConsultasService,
    ) { }

    async consultasRealizadas(req: Request, res: Response): Promise<void> {
        try {
            const psicologoId = this.authService.getLoggedUserId(req);
            if (!psicologoId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }

            const totalConsultas = await this.consultasService.consultasRealizadas(psicologoId);
            res.json({ totalConsultas });
        } catch (error) {
            console.error('Erro ao buscar consultas realizadas:', error);
            res.status(500).json({
                error: "Erro ao buscar consultas realizadas",
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    async taxaOcupacaoAgenda(req: Request, res: Response): Promise<void> {
        try {
            const psicologoId = this.authService.getLoggedUserId(req);
            if (!psicologoId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }

            const taxa = await this.consultasService.taxaOcupacaoAgenda(psicologoId);
            res.json(taxa);
        } catch (error) {
            console.error('Erro ao buscar taxa de ocupação:', error);
            res.status(500).json({
                error: "Erro ao buscar taxa de ocupação",
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
    async consultasPendentes(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);
        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        const pendentes = await this.consultasService.consultasPendentes(psicologoId);
        res.json({ totalPendentes: pendentes });
    }

    async proximasConsultas(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);
        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        const proximas = await this.consultasService.proximasConsultas(psicologoId);
        res.json(proximas);
    }

    /**
     * Retorna a próxima consulta do psicólogo no formato similar ao de pacientes
     * GET /api/adm-psicologos/consultas/proxima-consulta
     */
    async proximaConsulta(req: Request, res: Response): Promise<void> {
        try {
            const psicologoId = this.authService.getLoggedUserId(req);
            if (!psicologoId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }

            const resultado = await this.consultasService.proximaConsultaPsicologo(psicologoId);

            if (!resultado.success) {
                res.status(200).json(resultado);
                return;
            }

            // Adiciona idProximaConsulta na resposta
            res.status(200).json({
                ...resultado,
                idProximaConsulta: resultado.nextReservation?.Id || null
            });
        } catch (error) {
            console.error('Erro ao buscar próxima consulta do psicólogo:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Erro interno no servidor.'
            });
        }
    }

    /**
     * Lista todas as consultas realizadas do psicólogo filtradas por status
     * GET /api/adm-psicologos/consultas/realizadas-por-status
     * Query params opcionais:
     * - status: string (pode ser um ou múltiplos separados por vírgula)
     */
    async listarConsultasRealizadasPorStatus(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);

        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        try {
            const statusQuery = req.query.status as string | undefined;
            let statusFiltro: AgendaStatus[] | undefined;

            if (statusQuery) {
                const statusArray = statusQuery.split(',').map(s => s.trim());
                statusFiltro = statusArray.filter(s =>
                    Object.values(AgendaStatus).includes(s as AgendaStatus)
                ) as AgendaStatus[];
            }

            const consultas = await this.consultasService.listarConsultasRealizadasPorStatus(
                psicologoId,
                statusFiltro
            );

            res.status(200).json({
                success: true,
                total: consultas.length,
                data: consultas
            });
        } catch (error) {
            console.error('Erro ao listar consultas realizadas por status:', error);
            res.status(500).json({
                error: "Erro ao buscar consultas realizadas",
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Lista consultas realizadas por status e mês
     * GET /api/adm-psicologos/consultas/por-status-e-mes
     * Query params:
     * - mes: number (1-12) - obrigatório
     * - ano: number (ex: 2025) - obrigatório
     * - status: string (opcional, separados por vírgula)
     */
    async listarConsultasPorStatusEMes(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);

        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        try {
            const mes = parseInt(req.query.mes as string);
            const ano = parseInt(req.query.ano as string);
            const statusQuery = req.query.status as string | undefined;

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
                psicologoId,
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
     * Lista consultas por status específico
     * GET /api/adm-psicologos/consultas/por-status/:status
     */
    async listarConsultasPorStatus(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);
        const status = req.params.status;

        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        // Validar se o status é válido no enum do Prisma
        if (!Object.values(AgendaStatus).includes(status as AgendaStatus)) {
            res.status(400).json({
                error: "Status inválido",
                statusDisponiveis: Object.values(AgendaStatus)
            });
            return;
        }

        try {
            const consultas = await this.consultasService.listarConsultasPorStatusEspecifico(
                psicologoId,
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
     * GET /api/adm-psicologos/consultas/contar-por-status
     */
    async contarConsultasPorStatus(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);

        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        try {
            const statusQuery = req.query.status as string | undefined;
            let statusFiltro: AgendaStatus[] | undefined;

            if (statusQuery) {
                const statusArray = statusQuery.split(',').map(s => s.trim());
                statusFiltro = statusArray.filter(s =>
                    Object.values(AgendaStatus).includes(s as AgendaStatus)
                ) as AgendaStatus[];
            }

            const total = await this.consultasService.contarConsultasPorStatus(
                psicologoId,
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
     * Conta consultas por status e mês
     * GET /api/adm-psicologos/consultas/contar-por-status-e-mes
     */
    async contarConsultasPorStatusEMes(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);

        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        try {
            const mes = parseInt(req.query.mes as string);
            const ano = parseInt(req.query.ano as string);
            const statusQuery = req.query.status as string | undefined;

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
                psicologoId,
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

    /**
     * Lista TODAS as consultas realizadas com os status finalizados
     * GET /api/adm-psicologos/consultas/todas-realizadas
     */
    async listarTodasConsultasRealizadas(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);

        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        try {
            // Status fixos para consultas realizadas: Reagendada, Concluido e Canceladas (qualquer motivo)
            // NÃO inclui: Reservado, Andamento
            const statusRealizadas: AgendaStatus[] = [
                AgendaStatus.Reagendada,
                AgendaStatus.Concluido,
                AgendaStatus.Cancelado,
                AgendaStatus.Cancelled_by_patient,
                AgendaStatus.Cancelled_by_psychologist,
                AgendaStatus.Cancelled_no_show
            ];

            const consultas = await this.consultasService.listarConsultasRealizadasPorStatus(
                psicologoId,
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
            res.status(500).json({
                error: "Erro ao buscar todas as consultas realizadas",
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Lista histórico de consultas com filtros avançados
     * GET /api/adm-psicologos/consultas/historico
     * Query params opcionais:
     * - status: 'todos' | 'efetuada' | 'cancelada'
     * - buscaPaciente: string (nome do paciente)
     * - dataInicial: string (YYYY-MM-DD)
     * - dataFinal: string (YYYY-MM-DD)
     * - page: number (padrão: 1)
     * - pageSize: number (padrão: 10)
     */
    async listarHistoricoConsultas(req: Request, res: Response): Promise<void> {
        const psicologoId = this.authService.getLoggedUserId(req);

        if (!psicologoId) {
            res.status(401).json({ error: "Usuário não autenticado" });
            return;
        }

        try {
            const status = req.query.status as 'todos' | 'efetuada' | 'cancelada' | undefined;
            const buscaPaciente = req.query.buscaPaciente as string | undefined;
            const dataInicial = req.query.dataInicial as string | undefined;
            const dataFinal = req.query.dataFinal as string | undefined;
            const page = req.query.page ? parseInt(req.query.page as string) : undefined;
            const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined;

            // Validação de status
            if (status && !['todos', 'efetuada', 'cancelada'].includes(status)) {
                res.status(400).json({
                    error: "Status inválido",
                    message: "Status deve ser 'todos', 'efetuada' ou 'cancelada'"
                });
                return;
            }

            // Validação de paginação
            if (page !== undefined && (page < 1 || isNaN(page))) {
                res.status(400).json({
                    error: "Página inválida",
                    message: "Página deve ser um número maior que 0"
                });
                return;
            }

            if (pageSize !== undefined && (pageSize < 1 || isNaN(pageSize))) {
                res.status(400).json({
                    error: "Tamanho da página inválido",
                    message: "Tamanho da página deve ser um número maior que 0"
                });
                return;
            }

            const resultado = await this.consultasService.listarHistoricoConsultas(psicologoId, {
                status,
                buscaPaciente,
                dataInicial,
                dataFinal,
                page,
                pageSize
            });

            res.status(200).json({
                success: true,
                ...resultado
            });
        } catch (error) {
            console.error('Erro ao listar histórico de consultas:', error);
            res.status(500).json({
                error: "Erro ao buscar histórico de consultas",
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
}
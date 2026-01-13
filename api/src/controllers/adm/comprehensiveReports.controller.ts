/**
 * Controller de Relatórios Completos para Admin
 */

import { Request, Response } from "express";
import {
    getClientesCadastroReport,
    getPsicologosCredenciamentoReport,
    getPlanosMovimentacaoReport,
    getAcessoResetReport,
    getAcessoResetPsicologoReport,
    getSessaoHistoricoReport,
    getAvaliacaoSessaoReport,
    getFaturamentoClienteReport,
    getAgendaPsicologoReport,
    getCarteiraPagamentoPsicologoReport,
    getOnboardingObjetivosReport,
    ComprehensiveReportFilters,
} from "../../services/adm/comprehensiveReports.service";
import { ReportExportService } from "../../services/adm/reportExport.service";
import { normalizeQueryString } from "../../utils/validation.util";

const exportService = new ReportExportService();

export class ComprehensiveReportsController {
    /**
     * GET /admin/reports/clientes-cadastro
     * 1) Relatório Base de Cadastro de Clientes Ativos e Inativos
     */
    async getClientesCadastro(req: Request, res: Response): Promise<Response> {
        try {
            const filters: ComprehensiveReportFilters = {
                startDate: normalizeQueryString(req.query.startDate),
                endDate: normalizeQueryString(req.query.endDate),
                status: normalizeQueryString(req.query.status),
                userId: normalizeQueryString(req.query.userId),
                search: normalizeQueryString(req.query.search),
            };

            const format = normalizeQueryString(req.query.format);

            const data = await getClientesCadastroReport(filters);

            if (format === "excel") {
                const headers = [
                    "ID",
                    "Nome",
                    "Email",
                    "Telefone",
                    "CPF",
                    "Data Nascimento",
                    "Gênero",
                    "Status",
                    "Data Cadastro",
                    "Último Acesso",
                    "Total Consultas",
                    "Plano Ativo",
                    "Status Plano",
                    "Endereço Completo",
                ];

                const excelData = data.map((item) => ({
                    ID: item.Id,
                    Nome: item.Nome,
                    Email: item.Email,
                    Telefone: item.Telefone,
                    CPF: item.CPF || "",
                    "Data Nascimento": item.DataNascimento,
                    Gênero: item.Genero || "",
                    Status: item.Status,
                    "Data Cadastro": item.DataCadastro,
                    "Último Acesso": item.UltimoAcesso,
                    "Total Consultas": item.TotalConsultas,
                    "Plano Ativo": item.PlanoAtivo || "",
                    "Status Plano": item.StatusPlano || "",
                    "Endereço Completo": item.EnderecoCompleto || "",
                }));

                await exportService.exportToExcel(
                    excelData,
                    headers,
                    "Relatorio_Cadastro_Clientes",
                    res
                );
                return res;
            }

            if (format === "pdf") {
                const headers = [
                    "Nome",
                    "Email",
                    "Telefone",
                    "CPF",
                    "Status",
                    "Data Cadastro",
                    "Total Consultas",
                    "Plano Ativo",
                ];

                const pdfData = data.map((item) => ({
                    Nome: item.Nome,
                    Email: item.Email,
                    Telefone: item.Telefone,
                    CPF: item.CPF || "",
                    Status: item.Status,
                    "Data Cadastro": item.DataCadastro,
                    "Total Consultas": item.TotalConsultas,
                    "Plano Ativo": item.PlanoAtivo || "",
                }));

                await exportService.exportToPDF(
                    pdfData,
                    headers,
                    "Relatório de Cadastro de Clientes",
                    "Relatorio_Cadastro_Clientes",
                    res
                );
                return res;
            }

            return res.json({ data, total: data.length });
        } catch (error: any) {
            console.error("[ComprehensiveReports] Erro ao buscar relatório de clientes:", error);
            return res.status(500).json({ error: error.message || "Erro ao buscar relatório" });
        }
    }

    /**
     * GET /admin/reports/psicologos-credenciamento
     * 2) Relatório Base de Credenciamento de Psicólogos Ativos e Inativos
     */
    async getPsicologosCredenciamento(req: Request, res: Response): Promise<Response> {
        try {
            const filters: ComprehensiveReportFilters = {
                startDate: normalizeQueryString(req.query.startDate),
                endDate: normalizeQueryString(req.query.endDate),
                status: normalizeQueryString(req.query.status),
                userId: normalizeQueryString(req.query.userId),
                psicologoId: normalizeQueryString(req.query.psicologoId),
                search: normalizeQueryString(req.query.search),
            };

            const format = normalizeQueryString(req.query.format);

            const data = await getPsicologosCredenciamentoReport(filters);

            if (format === "excel") {
                const headers = [
                    "ID",
                    "Nome",
                    "Email",
                    "Telefone",
                    "CPF",
                    "CRP",
                    "Data Nascimento",
                    "Status",
                    "Status Credenciamento",
                    "Data Cadastro",
                    "Data Aprovação",
                    "Último Acesso",
                    "Total Consultas",
                    "Total Avaliações",
                    "Média Avaliações",
                    "Endereço Completo",
                ];

                const excelData = data.map((item) => ({
                    ID: item.Id,
                    Nome: item.Nome,
                    Email: item.Email,
                    Telefone: item.Telefone,
                    CPF: item.CPF || "",
                    CRP: item.CRP || "",
                    "Data Nascimento": item.DataNascimento,
                    Status: item.Status,
                    "Status Credenciamento": item.StatusCredenciamento,
                    "Data Cadastro": item.DataCadastro,
                    "Data Aprovação": item.DataAprovacao,
                    "Último Acesso": item.UltimoAcesso,
                    "Total Consultas": item.TotalConsultas,
                    "Total Avaliações": item.TotalAvaliacoes,
                    "Média Avaliações": item.MediaAvaliacoes,
                    "Endereço Completo": item.EnderecoCompleto || "",
                }));

                await exportService.exportToExcel(
                    excelData,
                    headers,
                    "Relatorio_Credenciamento_Psicologos",
                    res
                );
                return res;
            }

            if (format === "pdf") {
                const headers = [
                    "Nome",
                    "Email",
                    "CRP",
                    "Status",
                    "Data Aprovação",
                    "Total Consultas",
                    "Média Avaliações",
                ];

                const pdfData = data.map((item) => ({
                    Nome: item.Nome,
                    Email: item.Email,
                    CRP: item.CRP || "",
                    Status: item.Status,
                    "Data Aprovação": item.DataAprovacao,
                    "Total Consultas": item.TotalConsultas,
                    "Média Avaliações": item.MediaAvaliacoes,
                }));

                await exportService.exportToPDF(
                    pdfData,
                    headers,
                    "Relatório de Credenciamento de Psicólogos",
                    "Relatorio_Credenciamento_Psicologos",
                    res
                );
                return res;
            }

            return res.json({ data, total: data.length });
        } catch (error: any) {
            console.error("[ComprehensiveReports] Erro ao buscar relatório de psicólogos:", error);
            return res.status(500).json({ error: error.message || "Erro ao buscar relatório" });
        }
    }

    /**
     * GET /admin/reports/planos-movimentacao
     * 3) Relatório Aquisição e Movimentações de Planos
     */
    async getPlanosMovimentacao(req: Request, res: Response): Promise<Response> {
        try {
            const filters: ComprehensiveReportFilters = {
                startDate: normalizeQueryString(req.query.startDate),
                endDate: normalizeQueryString(req.query.endDate),
                status: normalizeQueryString(req.query.status),
                userId: normalizeQueryString(req.query.userId),
                planoId: normalizeQueryString(req.query.planoId),
                tipoPlano: normalizeQueryString(req.query.tipoPlano),
            };

            const format = normalizeQueryString(req.query.format);

            const data = await getPlanosMovimentacaoReport(filters);

            if (format === "excel" || format === "pdf") {
                const headers = [
                    "Cliente",
                    "Email Cliente",
                    "Plano",
                    "Tipo",
                    "Valor",
                    "Status",
                    "Data Aquisição",
                    "Data Início",
                    "Data Fim",
                    "Data Cancelamento",
                    "Total Ciclos",
                    "Consultas Usadas",
                    "Consultas Disponíveis",
                    "Valor Total Pago",
                ];

                const exportData = data.map((item) => ({
                    Cliente: item.ClienteNome,
                    "Email Cliente": item.ClienteEmail,
                    Plano: item.PlanoNome,
                    Tipo: item.TipoPlano,
                    Valor: item.ValorPlano,
                    Status: item.Status,
                    "Data Aquisição": item.DataAquisicao,
                    "Data Início": item.DataInicio,
                    "Data Fim": item.DataFim,
                    "Data Cancelamento": item.DataCancelamento,
                    "Total Ciclos": item.TotalCiclos,
                    "Consultas Usadas": item.TotalConsultasUsadas,
                    "Consultas Disponíveis": item.TotalConsultasDisponiveis,
                    "Valor Total Pago": item.ValorTotalPago,
                }));

                if (format === "excel") {
                    await exportService.exportToExcel(
                        exportData,
                        headers,
                        "Relatorio_Movimentacao_Planos",
                        res
                    );
                } else {
                    await exportService.exportToPDF(
                        exportData,
                        headers,
                        "Relatório de Movimentação de Planos",
                        "Relatorio_Movimentacao_Planos",
                        res
                    );
                }
                return res;
            }

            return res.json({ data, total: data.length });
        } catch (error: any) {
            console.error("[ComprehensiveReports] Erro ao buscar relatório de planos:", error);
            return res.status(500).json({ error: error.message || "Erro ao buscar relatório" });
        }
    }

    /**
     * GET /admin/reports/acesso-reset
     * 4) Relatório Acesso à Plataforma e Reset de Senha – Cliente PF e Psicólogos
     */
    async getAcessoReset(req: Request, res: Response): Promise<Response> {
        try {
            const filters: ComprehensiveReportFilters = {
                startDate: normalizeQueryString(req.query.startDate),
                endDate: normalizeQueryString(req.query.endDate),
                role: normalizeQueryString(req.query.role) as string | undefined,
                userId: normalizeQueryString(req.query.userId),
                search: normalizeQueryString(req.query.search),
            };

            const format = normalizeQueryString(req.query.format);

            const data = await getAcessoResetReport(filters);

            if (format === "excel" || format === "pdf") {
                const headers = [
                    "Usuário",
                    "Email",
                    "Perfil",
                    "Tipo Ação",
                    "Data Ação",
                    "Sucesso",
                    "Detalhes",
                ];

                const exportData = data.map((item) => ({
                    Usuário: item.UsuarioNome,
                    Email: item.UsuarioEmail,
                    Perfil: item.Role,
                    "Tipo Ação": item.TipoAcao,
                    "Data Ação": item.DataAcao,
                    Sucesso: item.Sucesso ? "Sim" : "Não",
                    Detalhes: item.Detalhes || "",
                }));

                if (format === "excel") {
                    await exportService.exportToExcel(
                        exportData,
                        headers,
                        "Relatorio_Acesso_Reset",
                        res
                    );
                } else {
                    await exportService.exportToPDF(
                        exportData,
                        headers,
                        "Relatório de Acesso e Reset de Senha",
                        "Relatorio_Acesso_Reset",
                        res
                    );
                }
                return res;
            }

            return res.json({ data, total: data.length });
        } catch (error: any) {
            console.error("[ComprehensiveReports] Erro ao buscar relatório de acesso:", error);
            return res.status(500).json({ error: error.message || "Erro ao buscar relatório" });
        }
    }

    /**
     * GET /admin/reports/sessoes-historico
     * 5) Relatório Sessões – Histórico Completo
     */
    async getSessoesHistorico(req: Request, res: Response): Promise<Response> {
        try {
            const filters: ComprehensiveReportFilters = {
                startDate: normalizeQueryString(req.query.startDate),
                endDate: normalizeQueryString(req.query.endDate),
                status: normalizeQueryString(req.query.status),
                userId: normalizeQueryString(req.query.userId),
                pacienteId: normalizeQueryString(req.query.pacienteId),
                psicologoId: normalizeQueryString(req.query.psicologoId),
            };

            const format = normalizeQueryString(req.query.format);

            const data = await getSessaoHistoricoReport(filters);

            if (format === "excel" || format === "pdf") {
                const headers = [
                    "Data",
                    "Horário",
                    "Status",
                    "Paciente",
                    "Psicólogo",
                    "Valor",
                    "Faturada",
                    "Duração (min)",
                    "Avaliação",
                    "Data Criação",
                ];

                const exportData = data.map((item) => ({
                    Data: item.Data,
                    Horário: item.Horario,
                    Status: item.Status,
                    Paciente: item.PacienteNome || "",
                    Psicólogo: item.PsicologoNome || "",
                    Valor: item.Valor || 0,
                    Faturada: item.Faturada ? "Sim" : "Não",
                    "Duração (min)": item.DuracaoMinutos || "",
                    Avaliação: item.Avaliacao || "",
                    "Data Criação": item.DataCriacao,
                }));

                if (format === "excel") {
                    await exportService.exportToExcel(
                        exportData,
                        headers,
                        "Relatorio_Sessoes_Historico",
                        res
                    );
                } else {
                    await exportService.exportToPDF(
                        exportData,
                        headers,
                        "Relatório de Histórico de Sessões",
                        "Relatorio_Sessoes_Historico",
                        res
                    );
                }
                return res;
            }

            return res.json({ data, total: data.length });
        } catch (error: any) {
            console.error("[ComprehensiveReports] Erro ao buscar relatório de sessões:", error);
            return res.status(500).json({ error: error.message || "Erro ao buscar relatório" });
        }
    }

    /**
     * GET /admin/reports/avaliacoes-sessoes
     * 6) Relatório Avaliações de Sessões
     */
    async getAvaliacoesSessoes(req: Request, res: Response): Promise<Response> {
        try {
            const filters: ComprehensiveReportFilters = {
                startDate: normalizeQueryString(req.query.startDate),
                endDate: normalizeQueryString(req.query.endDate),
                status: normalizeQueryString(req.query.status),
                userId: normalizeQueryString(req.query.userId),
                psicologoId: normalizeQueryString(req.query.psicologoId),
                pacienteId: normalizeQueryString(req.query.pacienteId),
            };

            const format = normalizeQueryString(req.query.format);

            const data = await getAvaliacaoSessaoReport(filters);

            if (format === "excel" || format === "pdf") {
                const headers = [
                    "Data Sessão",
                    "Psicólogo",
                    "Paciente",
                    "Avaliação",
                    "Comentário",
                    "Status",
                    "Data Avaliação",
                ];

                const exportData = data.map((item) => ({
                    "Data Sessão": item.DataSessao,
                    Psicólogo: item.PsicologoNome,
                    Paciente: item.PacienteNome || "",
                    Avaliação: item.Rating,
                    Comentário: item.Comentario || "",
                    Status: item.Status,
                    "Data Avaliação": item.DataAvaliacao,
                }));

                if (format === "excel") {
                    await exportService.exportToExcel(
                        exportData,
                        headers,
                        "Relatorio_Avaliacoes_Sessoes",
                        res
                    );
                } else {
                    await exportService.exportToPDF(
                        exportData,
                        headers,
                        "Relatório de Avaliações de Sessões",
                        "Relatorio_Avaliacoes_Sessoes",
                        res
                    );
                }
                return res;
            }

            return res.json({ data, total: data.length });
        } catch (error: any) {
            console.error("[ComprehensiveReports] Erro ao buscar relatório de avaliações:", error);
            return res.status(500).json({ error: error.message || "Erro ao buscar relatório" });
        }
    }

    /**
     * GET /admin/reports/faturamento-cliente
     * 7) Relatório Transacional de Faturamento por Cliente PF
     */
    async getFaturamentoCliente(req: Request, res: Response): Promise<Response> {
        try {
            const filters: ComprehensiveReportFilters = {
                startDate: normalizeQueryString(req.query.startDate),
                endDate: normalizeQueryString(req.query.endDate),
                status: normalizeQueryString(req.query.status),
                userId: normalizeQueryString(req.query.userId),
                pacienteId: normalizeQueryString(req.query.pacienteId),
            };

            const format = normalizeQueryString(req.query.format);

            const data = await getFaturamentoClienteReport(filters);

            if (format === "excel" || format === "pdf") {
                const headers = [
                    "Cliente",
                    "Email",
                    "Tipo Transação",
                    "Valor",
                    "Status",
                    "Data Vencimento",
                    "Data Pagamento",
                    "Plano",
                    "Data Criação",
                ];

                const exportData = data.map((item) => ({
                    Cliente: item.ClienteNome,
                    Email: item.ClienteEmail,
                    "Tipo Transação": item.TipoTransacao,
                    Valor: item.Valor,
                    Status: item.Status,
                    "Data Vencimento": item.DataVencimento,
                    "Data Pagamento": item.DataPagamento,
                    Plano: item.PlanoNome || "",
                    "Data Criação": item.DataCriacao,
                }));

                if (format === "excel") {
                    await exportService.exportToExcel(
                        exportData,
                        headers,
                        "Relatorio_Faturamento_Cliente",
                        res
                    );
                } else {
                    await exportService.exportToPDF(
                        exportData,
                        headers,
                        "Relatório de Faturamento por Cliente",
                        "Relatorio_Faturamento_Cliente",
                        res
                    );
                }
                return res;
            }

            return res.json({ data, total: data.length });
        } catch (error: any) {
            console.error("[ComprehensiveReports] Erro ao buscar relatório de faturamento:", error);
            return res.status(500).json({ error: error.message || "Erro ao buscar relatório" });
        }
    }

    /**
     * GET /admin/reports/acesso-reset-psicologo
     * 8) Relatório Acesso à Plataforma e Reset de Senha – Psicólogo
     */
    async getAcessoResetPsicologo(req: Request, res: Response): Promise<Response> {
        try {
            const filters: ComprehensiveReportFilters = {
                startDate: normalizeQueryString(req.query.startDate),
                endDate: normalizeQueryString(req.query.endDate),
                userId: normalizeQueryString(req.query.userId),
                psicologoId: normalizeQueryString(req.query.psicologoId),
                search: normalizeQueryString(req.query.search),
            };

            const format = normalizeQueryString(req.query.format);

            const data = await getAcessoResetPsicologoReport(filters);

            if (format === "excel" || format === "pdf") {
                const headers = [
                    "Psicólogo",
                    "Email",
                    "Tipo Ação",
                    "Data Ação",
                    "Sucesso",
                    "Detalhes",
                ];

                const exportData = data.map((item) => ({
                    Psicólogo: item.UsuarioNome,
                    Email: item.UsuarioEmail,
                    "Tipo Ação": item.TipoAcao,
                    "Data Ação": item.DataAcao,
                    Sucesso: item.Sucesso ? "Sim" : "Não",
                    Detalhes: item.Detalhes || "",
                }));

                if (format === "excel") {
                    await exportService.exportToExcel(
                        exportData,
                        headers,
                        "Relatorio_Acesso_Reset_Psicologo",
                        res
                    );
                } else {
                    await exportService.exportToPDF(
                        exportData,
                        headers,
                        "Relatório de Acesso e Reset de Senha - Psicólogos",
                        "Relatorio_Acesso_Reset_Psicologo",
                        res
                    );
                }
                return res;
            }

            return res.json({ data, total: data.length });
        } catch (error: any) {
            console.error("[ComprehensiveReports] Erro ao buscar relatório de acesso psicólogo:", error);
            return res.status(500).json({ error: error.message || "Erro ao buscar relatório" });
        }
    }

    /**
     * GET /admin/reports/agenda-psicologo
     * 9) Relatório Agenda do Psicólogo
     */
    async getAgendaPsicologo(req: Request, res: Response): Promise<Response> {
        try {
            const filters: ComprehensiveReportFilters = {
                startDate: normalizeQueryString(req.query.startDate),
                endDate: normalizeQueryString(req.query.endDate),
                status: normalizeQueryString(req.query.status),
                userId: normalizeQueryString(req.query.userId),
                psicologoId: normalizeQueryString(req.query.psicologoId),
                pacienteId: normalizeQueryString(req.query.pacienteId),
            };

            const format = normalizeQueryString(req.query.format);

            const data = await getAgendaPsicologoReport(filters);

            if (format === "excel" || format === "pdf") {
                const headers = [
                    "Psicólogo",
                    "Data",
                    "Horário",
                    "Dia da Semana",
                    "Status",
                    "Paciente",
                    "Consulta ID",
                ];

                const exportData = data.map((item) => ({
                    Psicólogo: item.PsicologoNome,
                    Data: item.Data,
                    Horário: item.Horario,
                    "Dia da Semana": item.DiaDaSemana,
                    Status: item.Status,
                    Paciente: item.PacienteNome || "",
                    "Consulta ID": item.ConsultaId || "",
                }));

                if (format === "excel") {
                    await exportService.exportToExcel(
                        exportData,
                        headers,
                        "Relatorio_Agenda_Psicologo",
                        res
                    );
                } else {
                    await exportService.exportToPDF(
                        exportData,
                        headers,
                        "Relatório de Agenda do Psicólogo",
                        "Relatorio_Agenda_Psicologo",
                        res
                    );
                }
                return res;
            }

            return res.json({ data, total: data.length });
        } catch (error: any) {
            console.error("[ComprehensiveReports] Erro ao buscar relatório de agenda:", error);
            return res.status(500).json({ error: error.message || "Erro ao buscar relatório" });
        }
    }

    /**
     * GET /admin/reports/carteira-pagamento-psicologo
     * 10) Relatório Carteira e Pagamento dos Psicólogos
     */
    async getCarteiraPagamentoPsicologo(req: Request, res: Response): Promise<Response> {
        try {
            const filters: ComprehensiveReportFilters = {
                startDate: normalizeQueryString(req.query.startDate),
                endDate: normalizeQueryString(req.query.endDate),
                status: normalizeQueryString(req.query.status),
                userId: normalizeQueryString(req.query.userId),
                psicologoId: normalizeQueryString(req.query.psicologoId),
            };

            const format = normalizeQueryString(req.query.format);

            const data = await getCarteiraPagamentoPsicologoReport(filters);

            if (format === "excel" || format === "pdf") {
                const headers = [
                    "Psicólogo",
                    "Email",
                    "Período",
                    "Consultas Realizadas",
                    "Valor Total",
                    "Status",
                    "Data Vencimento",
                    "Data Pagamento",
                    "Banco",
                    "Agência",
                    "Conta",
                    "PIX",
                ];

                const exportData = data.map((item) => ({
                    Psicólogo: item.PsicologoNome,
                    Email: item.PsicologoEmail,
                    Período: item.Periodo || "",
                    "Consultas Realizadas": item.ConsultasRealizadas || 0,
                    "Valor Total": item.ValorTotal,
                    Status: item.Status,
                    "Data Vencimento": item.DataVencimento,
                    "Data Pagamento": item.DataPagamento,
                    Banco: item.Banco || "",
                    Agência: item.Agencia || "",
                    Conta: item.Conta || "",
                    PIX: item.PIX || "",
                }));

                if (format === "excel") {
                    await exportService.exportToExcel(
                        exportData,
                        headers,
                        "Relatorio_Carteira_Pagamento_Psicologo",
                        res
                    );
                } else {
                    await exportService.exportToPDF(
                        exportData,
                        headers,
                        "Relatório de Carteira e Pagamento dos Psicólogos",
                        "Relatorio_Carteira_Pagamento_Psicologo",
                        res
                    );
                }
                return res;
            }

            return res.json({ data, total: data.length });
        } catch (error: any) {
            console.error("[ComprehensiveReports] Erro ao buscar relatório de carteira:", error);
            return res.status(500).json({ error: error.message || "Erro ao buscar relatório" });
        }
    }

    /**
     * GET /admin/reports/onboarding-objetivos
     * 11) Relatório de Objetivos do Onboarding dos Pacientes
     */
    async getOnboardingObjetivos(req: Request, res: Response): Promise<Response> {
        try {
            const filters: ComprehensiveReportFilters = {
                startDate: normalizeQueryString(req.query.startDate),
                endDate: normalizeQueryString(req.query.endDate),
                userId: normalizeQueryString(req.query.userId),
                pacienteId: normalizeQueryString(req.query.pacienteId),
                search: normalizeQueryString(req.query.search),
            };

            const format = normalizeQueryString(req.query.format);

            const data = await getOnboardingObjetivosReport(filters);

            if (format === "excel" || format === "pdf") {
                const headers = [
                    "Paciente",
                    "Email",
                    "Objetivos",
                    "Concluído",
                    "Data Criação",
                    "Data Atualização",
                ];

                const exportData = data.map((item) => ({
                    Paciente: item.PacienteNome,
                    Email: item.PacienteEmail,
                    Objetivos: item.Objetivos,
                    Concluído: item.Completed ? "Sim" : "Não",
                    "Data Criação": item.DataCriacao,
                    "Data Atualização": item.DataAtualizacao,
                }));

                if (format === "excel") {
                    await exportService.exportToExcel(
                        exportData,
                        headers,
                        "Relatorio_Onboarding_Objetivos",
                        res
                    );
                } else {
                    await exportService.exportToPDF(
                        exportData,
                        headers,
                        "Relatório de Objetivos do Onboarding",
                        "Relatorio_Onboarding_Objetivos",
                        res
                    );
                }
                return res;
            }

            return res.json({ data, total: data.length });
        } catch (error: any) {
            console.error("[ComprehensiveReports] Erro ao buscar relatório de onboarding:", error);
            return res.status(500).json({ error: error.message || "Erro ao buscar relatório" });
        }
    }
}


import prisma from "../prisma/client";
import { Role, UserStatus, ConsultaStatus, PlanoCompraStatus, ControleFinanceiroStatus, CommissionStatus } from "../generated/prisma";

export interface ReportFilters {
    startDate?: string;
    endDate?: string;
    status?: string;
    role?: Role;
    userId?: string;
    search?: string;
}

export interface UsuarioAtivoReport {
    Id: string;
    Nome: string;
    Email: string;
    Role: Role;
    Status: UserStatus;
    DataNascimento: Date | null;
    Telefone: string;
    CreatedAt: Date;
    LastLogin: Date | null;
    TotalConsultas: number;
    PlanoAtivo?: {
        Nome: string;
        Status: PlanoCompraStatus;
    } | null;
}

export interface PlanoReport {
    Id: string;
    Nome: string;
    Preco: number;
    Duracao: number;
    Tipo: string;
    Status: string;
    TotalAssinaturas: number;
    AssinaturasAtivas: number;
    AssinaturasInativas: number;
    ReceitaTotal: number;
    CreatedAt: Date;
}

export interface UsuarioInativoReport {
    Id: string;
    Nome: string;
    Email: string;
    Role: Role;
    Status: UserStatus;
    CreatedAt: Date;
    LastLogin: Date | null;
    DiasInativo: number;
    TotalConsultas: number;
}

export interface FaturamentoReport {
    Id: string;
    UserId: string;
    NomeUsuario: string;
    Email: string;
    Valor: number;
    DataVencimento: Date;
    Status: ControleFinanceiroStatus;
    Tipo: string;
    FaturaId: string | null;
    CreatedAt: Date;
    PlanoNome?: string | null;
}

export interface RepasseReport {
    Id: string;
    PsicologoId: string;
    NomePsicologo: string;
    Email: string;
    Periodo: string | null;
    ConsultasRealizadas: number | null;
    Valor: number;
    Status: string;
    DataPagamento: Date | null;
    DataVencimento: Date;
    Tipo: string;
    CreatedAt: Date;
}

export interface AvaliacaoReport {
    Id: string;
    PsicologoId: string;
    NomePsicologo: string;
    PacienteId: string | null;
    NomePaciente: string | null;
    Rating: number;
    Comentario: string | null;
    Status: string;
    MostrarNaHome: boolean | null;
    MostrarNaPsicologo: boolean | null;
    CreatedAt: Date;
}

export interface SessaoReport {
    Id: string;
    Date: Date;
    Time: string;
    Status: ConsultaStatus;
    PacienteId: string | null;
    NomePaciente: string | null;
    PsicologoId: string | null;
    NomePsicologo: string | null;
    Valor: number | null;
    Faturada: boolean;
    CreatedAt: Date;
}

export interface AgendaReport {
    Id: string;
    Data: Date;
    Horario: string;
    DiaDaSemana: string;
    Status: string;
    PsicologoId: string;
    NomePsicologo: string;
    PacienteId: string | null;
    NomePaciente: string | null;
    CreatedAt: Date;
}

export interface ReportSummary {
    totalUsuariosAtivos: number;
    totalUsuariosInativos: number;
    totalPlanos: number;
    totalFaturamento: number;
    totalRepasse: number;
    totalAvaliacoes: number;
    totalSessoes: number;
    totalAgendamentos: number;
}

export class ReportsService {
    /**
     * Busca usuários ativos com filtros
     */
    async getUsuariosAtivos(filters: ReportFilters = {}): Promise<UsuarioAtivoReport[]> {
        const where: Record<string, unknown> = {
            Status: UserStatus.Ativo,
            deletedAt: null,
            Role: { notIn: [Role.Admin, Role.Management, Role.Finance] }, // Excluir Admin, Management e Finance
        };

        if (filters.role) {
            where.Role = filters.role;
        }

        if (filters.search) {
            where.OR = [
                { Nome: { contains: filters.search, mode: 'insensitive' } },
                { Email: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        if (filters.userId) {
            where.Id = filters.userId;
        }

        const usuarios = await prisma.user.findMany({
            where,
            include: {
                AssinaturaPlanos: {
                    where: {
                        Status: PlanoCompraStatus.Ativo,
                    },
                    include: {
                        PlanoAssinatura: true,
                    },
                    take: 1,
                    orderBy: {
                        CreatedAt: 'desc',
                    },
                },
                ConsultaPacientes: filters.startDate || filters.endDate ? {
                    where: {
                        Date: {
                            ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                            ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
                        },
                    },
                } : undefined,
            },
            orderBy: {
                CreatedAt: 'desc',
            },
        });

        return usuarios.map(user => ({
            Id: user.Id,
            Nome: user.Nome,
            Email: user.Email,
            Role: user.Role,
            Status: user.Status,
            DataNascimento: user.DataNascimento,
            Telefone: user.Telefone,
            CreatedAt: user.CreatedAt,
            LastLogin: user.LastLogin,
            TotalConsultas: user.ConsultaPacientes?.length || 0,
            PlanoAtivo: user.AssinaturaPlanos[0] ? {
                Nome: user.AssinaturaPlanos[0].PlanoAssinatura.Nome,
                Status: user.AssinaturaPlanos[0].Status,
            } : null,
        }));
    }

    /**
     * Busca planos com estatísticas
     */
    async getPlanos(filters: ReportFilters = {}): Promise<PlanoReport[]> {
        const where: Record<string, unknown> = {};

        if (filters.status) {
            where.Status = filters.status;
        }

        if (filters.search) {
            where.Nome = { contains: filters.search, mode: 'insensitive' };
        }

        const planos = await prisma.planoAssinatura.findMany({
            where,
            include: {
                Assinaturas: {
                    include: {
                        Financeiro: filters.startDate || filters.endDate ? {
                            where: {
                                CreatedAt: {
                                    ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                                    ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
                                },
                            },
                        } : true,
                    },
                },
            },
            orderBy: {
                CreatedAt: 'desc',
            },
        });

        return planos.map(plano => {
            const assinaturasAtivas = plano.Assinaturas.filter(a => a.Status === PlanoCompraStatus.Ativo);
            const assinaturasInativas = plano.Assinaturas.filter(a => a.Status !== PlanoCompraStatus.Ativo);
            const receitaTotal = plano.Assinaturas.reduce((acc, assinatura) => {
                const financeiros = assinatura.Financeiro || [];
                const valorPago = financeiros
                    .filter(f => f.Status === ControleFinanceiroStatus.Aprovado)
                    .reduce((sum, f) => sum + f.Valor, 0);
                return acc + valorPago;
            }, 0);

            return {
                Id: plano.Id,
                Nome: plano.Nome,
                Preco: plano.Preco,
                Duracao: plano.Duracao,
                Tipo: plano.Tipo,
                Status: plano.Status,
                TotalAssinaturas: plano.Assinaturas.length,
                AssinaturasAtivas: assinaturasAtivas.length,
                AssinaturasInativas: assinaturasInativas.length,
                ReceitaTotal: receitaTotal,
                CreatedAt: plano.CreatedAt,
            };
        });
    }

    /**
     * Busca usuários inativos
     */
    async getUsuariosInativos(filters: ReportFilters = {}): Promise<UsuarioInativoReport[]> {
        const where: Record<string, unknown> = {
            Status: { in: [UserStatus.Inativo, UserStatus.Bloqueado, UserStatus.Deletado] },
            deletedAt: null,
            Role: { notIn: [Role.Admin, Role.Management, Role.Finance] }, // Excluir Admin, Management e Finance
        };

        if (filters.role) {
            where.Role = filters.role;
        }

        if (filters.search) {
            where.OR = [
                { Nome: { contains: filters.search, mode: 'insensitive' } },
                { Email: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        if (filters.userId) {
            where.Id = filters.userId;
        }

        const usuarios = await prisma.user.findMany({
            where,
            include: {
                ConsultaPacientes: true,
            },
            orderBy: {
                UpdatedAt: 'desc',
            },
        });

        const agora = new Date();

        return usuarios.map(user => {
            const lastLogin = user.LastLogin ? new Date(user.LastLogin) : null;
            const diasInativo = lastLogin
                ? Math.floor((agora.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
                : Math.floor((agora.getTime() - user.CreatedAt.getTime()) / (1000 * 60 * 60 * 24));

            return {
                Id: user.Id,
                Nome: user.Nome,
                Email: user.Email,
                Role: user.Role,
                Status: user.Status,
                CreatedAt: user.CreatedAt,
                LastLogin: user.LastLogin,
                DiasInativo: diasInativo,
                TotalConsultas: user.ConsultaPacientes?.length || 0,
            };
        });
    }

    /**
     * Busca faturamento
     */
    async getFaturamento(filters: ReportFilters = {}): Promise<FaturamentoReport[]> {
        const where: Record<string, unknown> = {};

        if (filters.status) {
            where.Status = filters.status;
        }

        if (filters.userId) {
            where.UserId = filters.userId;
        }

        if (filters.startDate || filters.endDate) {
            where.CreatedAt = {
                ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
            };
        }

        const financeiros = await prisma.financeiro.findMany({
            where,
            include: {
                User: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true,
                    },
                },
                PlanoAssinatura: {
                    select: {
                        Nome: true,
                    },
                },
            },
            orderBy: {
                CreatedAt: 'desc',
            },
        });

        return financeiros.map(fin => ({
            Id: fin.Id,
            UserId: fin.UserId,
            NomeUsuario: fin.User.Nome,
            Email: fin.User.Email,
            Valor: fin.Valor,
            DataVencimento: fin.DataVencimento,
            Status: fin.Status,
            Tipo: fin.Tipo,
            FaturaId: fin.FaturaId,
            CreatedAt: fin.CreatedAt,
            PlanoNome: fin.PlanoAssinatura?.Nome || null,
        }));
    }

    /**
     * Busca repasses
     */
    async getRepasse(filters: ReportFilters = {}): Promise<RepasseReport[]> {
        const where: Record<string, unknown> = {};

        if (filters.status) {
            where.Status = filters.status;
        }

        if (filters.userId) {
            where.UserId = filters.userId;
        }

        if (filters.startDate || filters.endDate) {
            where.CreatedAt = {
                ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
            };
        }

        const repasses = await prisma.financeiroPsicologo.findMany({
            where,
            include: {
                User: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true,
                    },
                },
            },
            orderBy: {
                CreatedAt: 'desc',
            },
        });

        return repasses.map(rep => ({
            Id: rep.Id,
            PsicologoId: rep.UserId,
            NomePsicologo: rep.User.Nome,
            Email: rep.User.Email,
            Periodo: rep.Periodo,
            ConsultasRealizadas: rep.ConsultasRealizadas,
            Valor: rep.Valor,
            Status: rep.Status,
            DataPagamento: rep.DataPagamento,
            DataVencimento: rep.DataVencimento,
            Tipo: rep.Tipo,
            CreatedAt: rep.CreatedAt,
        }));
    }

    /**
     * Busca avaliações
     */
    async getAvaliacoes(filters: ReportFilters = {}): Promise<AvaliacaoReport[]> {
        const where: Record<string, unknown> = {};

        if (filters.status) {
            where.Status = filters.status;
        }

        if (filters.userId) {
            where.PsicologoId = filters.userId;
        }

        if (filters.startDate || filters.endDate) {
            where.CreatedAt = {
                ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
            };
        }

        const avaliacoes = await prisma.review.findMany({
            where,
            include: {
                Psicologo: {
                    select: {
                        Id: true,
                        Nome: true,
                    },
                },
                User: {
                    select: {
                        Id: true,
                        Nome: true,
                    },
                },
            },
            orderBy: {
                CreatedAt: 'desc',
            },
        });

        return avaliacoes.map(av => ({
            Id: av.Id,
            PsicologoId: av.PsicologoId,
            NomePsicologo: av.Psicologo.Nome,
            PacienteId: av.UserId || null,
            NomePaciente: av.User?.Nome || null,
            Rating: av.Rating,
            Comentario: av.Comentario,
            Status: av.Status,
            MostrarNaHome: av.MostrarNaHome,
            MostrarNaPsicologo: av.MostrarNaPsicologo,
            CreatedAt: av.CreatedAt,
        }));
    }

    /**
     * Busca sessões
     */
    async getSessoes(filters: ReportFilters = {}): Promise<SessaoReport[]> {
        const where: Record<string, unknown> = {};

        if (filters.status) {
            where.Status = filters.status;
        }

        if (filters.userId) {
            where.OR = [
                { PacienteId: filters.userId },
                { PsicologoId: filters.userId },
            ];
        }

        if (filters.startDate || filters.endDate) {
            where.Date = {
                ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
            };
        }

        const sessoes = await prisma.consulta.findMany({
            where,
            include: {
                Paciente: {
                    select: {
                        Id: true,
                        Nome: true,
                    },
                },
                Psicologo: {
                    select: {
                        Id: true,
                        Nome: true,
                    },
                },
            },
            orderBy: {
                Date: 'desc',
            },
        });

        return sessoes.map(sess => ({
            Id: sess.Id,
            Date: sess.Date,
            Time: sess.Time,
            Status: sess.Status,
            PacienteId: sess.PacienteId,
            NomePaciente: sess.Paciente?.Nome || null,
            PsicologoId: sess.PsicologoId,
            NomePsicologo: sess.Psicologo?.Nome || null,
            Valor: sess.Valor,
            Faturada: sess.Faturada,
            CreatedAt: sess.CreatedAt,
        }));
    }

    /**
     * Busca agenda
     */
    async getAgenda(filters: ReportFilters = {}): Promise<AgendaReport[]> {
        const where: Record<string, unknown> = {};

        if (filters.status) {
            where.Status = filters.status;
        }

        if (filters.userId) {
            where.OR = [
                { PacienteId: filters.userId },
                { PsicologoId: filters.userId },
            ];
        }

        if (filters.startDate || filters.endDate) {
            where.Data = {
                ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
            };
        }

        const agendas = await prisma.agenda.findMany({
            where,
            include: {
                Paciente: {
                    select: {
                        Id: true,
                        Nome: true,
                    },
                },
                Psicologo: {
                    select: {
                        Id: true,
                        Nome: true,
                    },
                },
            },
            orderBy: {
                Data: 'desc',
            },
        });

        return agendas.map(ag => ({
            Id: ag.Id,
            Data: ag.Data,
            Horario: ag.Horario,
            DiaDaSemana: ag.DiaDaSemana,
            Status: ag.Status,
            PsicologoId: ag.PsicologoId,
            NomePsicologo: ag.Psicologo.Nome,
            PacienteId: ag.PacienteId,
            NomePaciente: ag.Paciente?.Nome || null,
            CreatedAt: ag.CreatedAt,
        }));
    }

    /**
     * Busca resumo geral dos relatórios
     */
    async getSummary(filters: ReportFilters = {}): Promise<ReportSummary> {
        const dateFilter = filters.startDate || filters.endDate ? {
            ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
            ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
        } : undefined;

        const [
            totalUsuariosAtivos,
            totalUsuariosInativos,
            totalPlanos,
            financeiros,
            repasses,
            totalAvaliacoes,
            totalSessoes,
            totalAgendamentos,
        ] = await Promise.all([
            prisma.user.count({
                where: {
                    Status: UserStatus.Ativo,
                    deletedAt: null,
                    Role: { notIn: [Role.Admin, Role.Management, Role.Finance] },
                },
            }),
            prisma.user.count({
                where: {
                    Status: { in: [UserStatus.Inativo, UserStatus.Bloqueado, UserStatus.Deletado] },
                    deletedAt: null,
                    Role: { notIn: [Role.Admin, Role.Management, Role.Finance] },
                },
            }),
            prisma.planoAssinatura.count({
                where: {
                    Status: 'ativo',
                },
            }),
            prisma.financeiro.findMany({
                where: dateFilter ? {
                    CreatedAt: dateFilter,
                    Status: ControleFinanceiroStatus.Aprovado,
                } : {
                    Status: ControleFinanceiroStatus.Aprovado,
                },
            }),
            prisma.financeiroPsicologo.findMany({
                where: dateFilter ? {
                    CreatedAt: dateFilter,
                } : {},
            }),
            prisma.review.count({
                where: dateFilter ? {
                    CreatedAt: dateFilter,
                } : {},
            }),
            prisma.consulta.count({
                where: dateFilter ? {
                    Date: dateFilter,
                } : {},
            }),
            prisma.agenda.count({
                where: dateFilter ? {
                    Data: dateFilter,
                } : {},
            }),
        ]);

        const totalFaturamento = financeiros.reduce((acc, fin) => acc + fin.Valor, 0);
        const totalRepasse = repasses.reduce((acc, rep) => acc + rep.Valor, 0);

        return {
            totalUsuariosAtivos,
            totalUsuariosInativos,
            totalPlanos,
            totalFaturamento,
            totalRepasse,
            totalAvaliacoes,
            totalSessoes,
            totalAgendamentos,
        };
    }
}


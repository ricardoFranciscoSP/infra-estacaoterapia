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
            select: {
                Id: true,
                Nome: true,
                Email: true,
                Role: true,
                Status: true,
                DataNascimento: true,
                Telefone: true,
                CreatedAt: true,
                LastLogin: true,
                AssinaturaPlanos: {
                    where: {
                        Status: PlanoCompraStatus.Ativo,
                    },
                    select: {
                        Status: true,
                        PlanoAssinatura: {
                            select: {
                                Nome: true,
                            },
                        },
                    },
                    take: 1,
                    orderBy: {
                        CreatedAt: 'desc',
                    },
                },
                _count: filters.startDate || filters.endDate ? undefined : {
                    select: {
                        ConsultaPacientes: true,
                    },
                },
            },
            orderBy: {
                CreatedAt: 'desc',
            },
        });

        const consultaCountByUser = new Map<string, number>();
        if (filters.startDate || filters.endDate) {
            const consultaCounts = await prisma.consulta.groupBy({
                by: ["PacienteId"],
                where: {
                    PacienteId: { in: usuarios.map(user => user.Id) },
                    Date: {
                        ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                        ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
                    },
                },
                _count: {
                    _all: true,
                },
            });
            for (const row of consultaCounts) {
                if (row.PacienteId) {
                    consultaCountByUser.set(row.PacienteId, row._count._all);
                }
            }
        }

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
            TotalConsultas: filters.startDate || filters.endDate
                ? consultaCountByUser.get(user.Id) || 0
                : user._count?.ConsultaPacientes || 0,
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
            select: {
                Id: true,
                Nome: true,
                Preco: true,
                Duracao: true,
                Tipo: true,
                Status: true,
                CreatedAt: true,
            },
            orderBy: {
                CreatedAt: 'desc',
            },
        });

        const planoIds = planos.map(plano => plano.Id);
        const assinaturaCounts = await prisma.assinaturaPlano.groupBy({
            by: ["PlanoAssinaturaId", "Status"],
            where: {
                PlanoAssinaturaId: { in: planoIds },
            },
            _count: {
                _all: true,
            },
        });

        const receitaPorPlano = await prisma.financeiro.groupBy({
            by: ["PlanoAssinaturaId"],
            where: {
                PlanoAssinaturaId: { in: planoIds },
                Status: ControleFinanceiroStatus.Aprovado,
                ...(filters.startDate || filters.endDate ? {
                    CreatedAt: {
                        ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                        ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
                    },
                } : {}),
            },
            _sum: {
                Valor: true,
            },
        });

        const receitaMap = new Map<string, number>();
        for (const row of receitaPorPlano) {
            if (row.PlanoAssinaturaId) {
                receitaMap.set(row.PlanoAssinaturaId, row._sum.Valor ?? 0);
            }
        }

        const assinaturaStats = new Map<string, { total: number; ativos: number; inativos: number }>();
        for (const row of assinaturaCounts) {
            if (!row.PlanoAssinaturaId) continue;
            const current = assinaturaStats.get(row.PlanoAssinaturaId) || { total: 0, ativos: 0, inativos: 0 };
            current.total += row._count._all;
            if (row.Status === PlanoCompraStatus.Ativo) {
                current.ativos += row._count._all;
            } else {
                current.inativos += row._count._all;
            }
            assinaturaStats.set(row.PlanoAssinaturaId, current);
        }

        return planos.map(plano => {
            const stats = assinaturaStats.get(plano.Id) || { total: 0, ativos: 0, inativos: 0 };
            return {
                Id: plano.Id,
                Nome: plano.Nome,
                Preco: plano.Preco,
                Duracao: plano.Duracao,
                Tipo: plano.Tipo,
                Status: plano.Status,
                TotalAssinaturas: stats.total,
                AssinaturasAtivas: stats.ativos,
                AssinaturasInativas: stats.inativos,
                ReceitaTotal: receitaMap.get(plano.Id) || 0,
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
            select: {
                Id: true,
                Nome: true,
                Email: true,
                Role: true,
                Status: true,
                CreatedAt: true,
                LastLogin: true,
                _count: {
                    select: {
                        ConsultaPacientes: true,
                    },
                },
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
                TotalConsultas: user._count.ConsultaPacientes,
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
            select: {
                Id: true,
                UserId: true,
                Valor: true,
                DataVencimento: true,
                Status: true,
                Tipo: true,
                FaturaId: true,
                CreatedAt: true,
                User: {
                    select: {
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
            select: {
                Id: true,
                UserId: true,
                Periodo: true,
                ConsultasRealizadas: true,
                Valor: true,
                Status: true,
                DataPagamento: true,
                DataVencimento: true,
                Tipo: true,
                CreatedAt: true,
                User: {
                    select: {
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
            select: {
                Id: true,
                PsicologoId: true,
                UserId: true,
                Rating: true,
                Comentario: true,
                Status: true,
                MostrarNaHome: true,
                MostrarNaPsicologo: true,
                CreatedAt: true,
                Psicologo: {
                    select: {
                        Nome: true,
                    },
                },
                User: {
                    select: {
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
            select: {
                Id: true,
                Date: true,
                Time: true,
                Status: true,
                PacienteId: true,
                PsicologoId: true,
                Valor: true,
                Faturada: true,
                CreatedAt: true,
                Paciente: {
                    select: {
                        Nome: true,
                    },
                },
                Psicologo: {
                    select: {
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
            select: {
                Id: true,
                Data: true,
                Horario: true,
                DiaDaSemana: true,
                Status: true,
                PsicologoId: true,
                PacienteId: true,
                CreatedAt: true,
                Paciente: {
                    select: {
                        Nome: true,
                    },
                },
                Psicologo: {
                    select: {
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
            faturamentoAgg,
            repasseAgg,
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
            prisma.financeiro.aggregate({
                where: dateFilter ? {
                    CreatedAt: dateFilter,
                    Status: ControleFinanceiroStatus.Aprovado,
                } : {
                    Status: ControleFinanceiroStatus.Aprovado,
                },
                _sum: {
                    Valor: true,
                },
            }),
            prisma.financeiroPsicologo.aggregate({
                where: dateFilter ? {
                    CreatedAt: dateFilter,
                } : {},
                _sum: {
                    Valor: true,
                },
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

        const totalFaturamento = faturamentoAgg._sum.Valor ?? 0;
        const totalRepasse = repasseAgg._sum.Valor ?? 0;

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


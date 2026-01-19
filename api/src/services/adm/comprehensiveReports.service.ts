/**
 * Serviço de Relatórios Completos para Admin
 * Implementa os 10 relatórios solicitados com filtros e exportação
 */

import prisma from "../../prisma/client";
import { Role, UserStatus, ConsultaStatus } from "../../generated/prisma";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export interface ComprehensiveReportFilters {
    startDate?: string;
    endDate?: string;
    status?: string;
    role?: Role;
    userId?: string;
    psicologoId?: string;
    pacienteId?: string;
    search?: string;
    planoId?: string;
    tipoPlano?: string;
}

/**
 * 1) Relatório Base de Cadastro de Clientes Ativos e Inativos
 */
export interface ClienteCadastroReport {
    Id: string;
    Nome: string;
    Email: string;
    Telefone: string;
    CPF?: string | null;
    DataNascimento: Date | null;
    Genero?: string | null;
    Status: UserStatus;
    DataCadastro: Date;
    UltimoAcesso: Date | null;
    TotalConsultas: number;
    PlanoAtivo?: string | null;
    StatusPlano?: string | null;
    EnderecoCompleto?: string | null;
}

export async function getClientesCadastroReport(
    filters: ComprehensiveReportFilters = {}
): Promise<ClienteCadastroReport[]> {
    const where: Record<string, unknown> = {
        Role: Role.Patient,
        deletedAt: null,
    };

    if (filters.status) {
        where.Status = filters.status;
    } else {
        // Por padrão, inclui ativos e inativos
        where.Status = { in: [UserStatus.Ativo, UserStatus.Inativo, UserStatus.Bloqueado] };
    }

    if (filters.search) {
        where.OR = [
            { Nome: { contains: filters.search, mode: 'insensitive' } },
            { Email: { contains: filters.search, mode: 'insensitive' } },
            { CPF: { contains: filters.search, mode: 'insensitive' } },
        ];
    }

    if (filters.userId) {
        where.Id = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
        where.CreatedAt = {
            ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
            ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
        };
    }

    const clientes = await prisma.user.findMany({
        where,
        select: {
            Id: true,
            Nome: true,
            Email: true,
            Telefone: true,
            Cpf: true,
            DataNascimento: true,
            Sexo: true,
            Status: true,
            CreatedAt: true,
            LastLogin: true,
            Address: {
                select: {
                    Rua: true,
                    Numero: true,
                    Bairro: true,
                    Cidade: true,
                    Estado: true,
                    Cep: true,
                },
                take: 1,
            },
            AssinaturaPlanos: {
                where: { Status: 'Ativo' },
                select: {
                    Status: true,
                    PlanoAssinatura: {
                        select: {
                            Nome: true,
                        },
                    },
                },
                take: 1,
                orderBy: { CreatedAt: 'desc' },
            },
            _count: {
                select: {
                    ConsultaPacientes: true,
                },
            },
        },
        orderBy: { CreatedAt: 'desc' },
    });

    return clientes.map(cliente => {
        const endereco = cliente.Address[0] || null;

        const enderecoCompleto = endereco
            ? `${endereco.Rua || ''}, ${endereco.Numero || ''} - ${endereco.Bairro || ''}, ${endereco.Cidade || ''} - ${endereco.Estado || ''}, CEP: ${endereco.Cep || ''}`
            : null;

        return {
            Id: cliente.Id,
            Nome: cliente.Nome,
            Email: cliente.Email,
            Telefone: cliente.Telefone,
            CPF: cliente.Cpf,
            DataNascimento: cliente.DataNascimento,
            Genero: cliente.Sexo,
            Status: cliente.Status,
            DataCadastro: cliente.CreatedAt,
            UltimoAcesso: cliente.LastLogin,
            TotalConsultas: cliente._count.ConsultaPacientes,
            PlanoAtivo: cliente.AssinaturaPlanos[0]?.PlanoAssinatura?.Nome || null,
            StatusPlano: cliente.AssinaturaPlanos[0]?.Status || null,
            EnderecoCompleto: enderecoCompleto,
        };
    });
}

/**
 * 2) Relatório Base de Credenciamento de Psicólogos Ativos e Inativos
 */
export interface PsicologoCredenciamentoReport {
    Id: string;
    Nome: string;
    Email: string;
    Telefone: string;
    CPF?: string | null;
    CRP?: string | null;
    DataNascimento: Date | null;
    Status: UserStatus;
    StatusCredenciamento: string;
    DataCadastro: Date;
    DataAprovacao: Date | null;
    UltimoAcesso: Date | null;
    TotalConsultas: number;
    TotalAvaliacoes: number;
    MediaAvaliacoes: number;
    EnderecoCompleto?: string | null;
}

export async function getPsicologosCredenciamentoReport(
    filters: ComprehensiveReportFilters = {}
): Promise<PsicologoCredenciamentoReport[]> {
    const where: Record<string, unknown> = {
        Role: Role.Psychologist,
        deletedAt: null,
    };

    if (filters.status) {
        where.Status = filters.status;
    } else {
        where.Status = { in: [UserStatus.Ativo, UserStatus.Inativo, UserStatus.Bloqueado, UserStatus.EmAnalise] };
    }

    if (filters.search) {
        where.OR = [
            { Nome: { contains: filters.search, mode: 'insensitive' } },
            { Email: { contains: filters.search, mode: 'insensitive' } },
            { CPF: { contains: filters.search, mode: 'insensitive' } },
            { CRP: { contains: filters.search, mode: 'insensitive' } },
        ];
    }

    if (filters.userId || filters.psicologoId) {
        where.Id = filters.userId || filters.psicologoId;
    }

    if (filters.startDate || filters.endDate) {
        where.CreatedAt = {
            ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
            ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
        };
    }

    const psicologos = await prisma.user.findMany({
        where,
        select: {
            Id: true,
            Nome: true,
            Email: true,
            Telefone: true,
            Cpf: true,
            Crp: true,
            DataNascimento: true,
            Status: true,
            CreatedAt: true,
            DataAprovacao: true,
            LastLogin: true,
            Address: {
                select: {
                    Rua: true,
                    Numero: true,
                    Bairro: true,
                    Cidade: true,
                    Estado: true,
                    Cep: true,
                },
                take: 1,
            },
            _count: {
                select: {
                    ConsultaPsicologos: true,
                },
            },
        },
        orderBy: { CreatedAt: 'desc' },
    });

    const psicologoIds = psicologos.map(psicologo => psicologo.Id);
    const avaliacaoStats = await prisma.review.groupBy({
        by: ["PsicologoId"],
        where: {
            PsicologoId: { in: psicologoIds },
        },
        _count: {
            _all: true,
        },
        _avg: {
            Rating: true,
        },
    });
    const avaliacaoMap = new Map<string, { total: number; media: number }>();
    for (const row of avaliacaoStats) {
        if (row.PsicologoId) {
            avaliacaoMap.set(row.PsicologoId, {
                total: row._count._all,
                media: row._avg.Rating ?? 0,
            });
        }
    }

    return psicologos.map(psicologo => {
        const endereco = psicologo.Address[0] || null;

        const enderecoCompleto = endereco
            ? `${endereco.Rua || ''}, ${endereco.Numero || ''} - ${endereco.Bairro || ''}, ${endereco.Cidade || ''} - ${endereco.Estado || ''}, CEP: ${endereco.Cep || ''}`
            : null;

        const avaliacao = avaliacaoMap.get(psicologo.Id) || { total: 0, media: 0 };

        return {
            Id: psicologo.Id,
            Nome: psicologo.Nome,
            Email: psicologo.Email,
            Telefone: psicologo.Telefone,
            CPF: psicologo.Cpf,
            CRP: psicologo.Crp,
            DataNascimento: psicologo.DataNascimento,
            Status: psicologo.Status,
            StatusCredenciamento: psicologo.Status,
            DataCadastro: psicologo.CreatedAt,
            DataAprovacao: psicologo.DataAprovacao,
            UltimoAcesso: psicologo.LastLogin,
            TotalConsultas: psicologo._count.ConsultaPsicologos,
            TotalAvaliacoes: avaliacao.total,
            MediaAvaliacoes: Math.round(avaliacao.media * 10) / 10,
            EnderecoCompleto: enderecoCompleto,
        };
    });
}

/**
 * 3) Relatório Aquisição e Movimentações de Planos
 */
export interface PlanoMovimentacaoReport {
    Id: string;
    ClienteId: string;
    ClienteNome: string;
    ClienteEmail: string;
    PlanoId: string;
    PlanoNome: string;
    TipoPlano: string;
    ValorPlano: number;
    Status: string;
    DataAquisicao: Date;
    DataInicio: Date | null;
    DataFim: Date | null;
    DataCancelamento: Date | null;
    MotivoCancelamento?: string | null;
    TotalCiclos: number;
    TotalConsultasUsadas: number;
    TotalConsultasDisponiveis: number;
    ValorTotalPago: number;
}

export async function getPlanosMovimentacaoReport(
    filters: ComprehensiveReportFilters = {}
): Promise<PlanoMovimentacaoReport[]> {
    const where: Record<string, unknown> = {};

    if (filters.status) {
        where.Status = filters.status;
    }

    if (filters.planoId) {
        where.PlanoAssinaturaId = filters.planoId;
    }

    if (filters.tipoPlano) {
        where.PlanoAssinatura = {
            Tipo: filters.tipoPlano,
        };
    }

    if (filters.userId || filters.pacienteId) {
        where.UserId = filters.userId || filters.pacienteId;
    }

    if (filters.startDate || filters.endDate) {
        where.CreatedAt = {
            ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
            ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
        };
    }

    const assinaturas = await prisma.assinaturaPlano.findMany({
        where,
        select: {
            Id: true,
            UserId: true,
            PlanoAssinaturaId: true,
            Status: true,
            CreatedAt: true,
            DataInicio: true,
            DataFim: true,
            User: {
                select: {
                    Nome: true,
                    Email: true,
                },
            },
            PlanoAssinatura: {
                select: {
                    Nome: true,
                    Tipo: true,
                    Preco: true,
                },
            },
        },
        orderBy: { CreatedAt: 'desc' },
    });

    const assinaturaIds = assinaturas.map(assinatura => assinatura.Id);
    const ciclosAgg = await prisma.cicloPlano.groupBy({
        by: ["AssinaturaPlanoId"],
        where: {
            AssinaturaPlanoId: { in: assinaturaIds },
        },
        _count: {
            _all: true,
        },
        _sum: {
            ConsultasUsadas: true,
            ConsultasDisponiveis: true,
        },
    });
    const cicloMap = new Map<string, { total: number; usadas: number; disponiveis: number }>();
    for (const row of ciclosAgg) {
        if (row.AssinaturaPlanoId) {
            cicloMap.set(row.AssinaturaPlanoId, {
                total: row._count._all,
                usadas: row._sum.ConsultasUsadas ?? 0,
                disponiveis: row._sum.ConsultasDisponiveis ?? 0,
            });
        }
    }

    const assinaturaFinanceiros = await prisma.assinaturaPlano.findMany({
        where: {
            Id: { in: assinaturaIds },
        },
        select: {
            Id: true,
            Financeiro: {
                where: {
                    Status: 'Aprovado',
                },
                select: {
                    Valor: true,
                },
            },
        },
    });
    const financeiroMap = new Map<string, number>();
    for (const row of assinaturaFinanceiros) {
        const total = row.Financeiro.reduce((sum, fin) => sum + fin.Valor, 0);
        financeiroMap.set(row.Id, total);
    }

    return assinaturas.map(assinatura => {
        const ciclos = cicloMap.get(assinatura.Id) || { total: 0, usadas: 0, disponiveis: 0 };
        const valorTotalPago = financeiroMap.get(assinatura.Id) || 0;

        return {
            Id: assinatura.Id,
            ClienteId: assinatura.UserId,
            ClienteNome: assinatura.User.Nome,
            ClienteEmail: assinatura.User.Email,
            PlanoId: assinatura.PlanoAssinaturaId,
            PlanoNome: assinatura.PlanoAssinatura.Nome,
            TipoPlano: assinatura.PlanoAssinatura.Tipo,
            ValorPlano: assinatura.PlanoAssinatura.Preco,
            Status: assinatura.Status,
            DataAquisicao: assinatura.CreatedAt,
            DataInicio: assinatura.DataInicio,
            DataFim: assinatura.DataFim,
            DataCancelamento: null, // Campo não existe no schema
            MotivoCancelamento: null, // Campo não existe no schema
            TotalCiclos: ciclos.total,
            TotalConsultasUsadas: ciclos.usadas,
            TotalConsultasDisponiveis: ciclos.disponiveis,
            ValorTotalPago: valorTotalPago,
        };
    });
}

/**
 * 4) Relatório Acesso à Plataforma e Reset de Senha – Cliente PF e Psicólogos
 */
export interface AcessoResetReport {
    Id: string;
    UsuarioId: string;
    UsuarioNome: string;
    UsuarioEmail: string;
    Role: Role;
    TipoAcao: string; // 'Login' | 'ResetSenha' | 'TentativaLogin'
    DataAcao: Date;
    IP?: string | null;
    UserAgent?: string | null;
    Sucesso: boolean;
    Detalhes?: string | null;
}

export async function getAcessoResetReport(
    filters: ComprehensiveReportFilters = {}
): Promise<AcessoResetReport[]> {
    // Nota: Este relatório requer uma tabela de logs de acesso
    // Por enquanto, vamos usar LastLogin e ResetPasswordTokenExpiresAt
    const where: Record<string, unknown> = {
        deletedAt: null,
    };

    if (filters.role) {
        where.Role = filters.role;
    } else {
        where.Role = { in: [Role.Patient, Role.Psychologist] };
    }

    if (filters.userId) {
        where.Id = filters.userId;
    }

    if (filters.search) {
        where.OR = [
            { Nome: { contains: filters.search, mode: 'insensitive' } },
            { Email: { contains: filters.search, mode: 'insensitive' } },
        ];
    }

    const usuarios = await prisma.user.findMany({
        where,
        select: {
            Id: true,
            Nome: true,
            Email: true,
            Role: true,
            LastLogin: true,
            ResetPasswordTokenExpiresAt: true,
            CreatedAt: true,
        },
        orderBy: { UpdatedAt: 'desc' },
    });

    const report: AcessoResetReport[] = [];

    usuarios.forEach(usuario => {
        // Login
        if (usuario.LastLogin) {
            report.push({
                Id: `${usuario.Id}-login-${usuario.LastLogin.getTime()}`,
                UsuarioId: usuario.Id,
                UsuarioNome: usuario.Nome,
                UsuarioEmail: usuario.Email,
                Role: usuario.Role,
                TipoAcao: 'Login',
                DataAcao: usuario.LastLogin,
                Sucesso: true,
                Detalhes: 'Último acesso à plataforma',
            });
        }

        // Reset de senha
        if (usuario.ResetPasswordTokenExpiresAt) {
            report.push({
                Id: `${usuario.Id}-reset-${usuario.ResetPasswordTokenExpiresAt.getTime()}`,
                UsuarioId: usuario.Id,
                UsuarioNome: usuario.Nome,
                UsuarioEmail: usuario.Email,
                Role: usuario.Role,
                TipoAcao: 'ResetSenha',
                DataAcao: usuario.ResetPasswordTokenExpiresAt,
                Sucesso: true,
                Detalhes: 'Solicitação de reset de senha',
            });
        }
    });

    // Filtrar por data se fornecido
    if (filters.startDate || filters.endDate) {
        return report.filter(item => {
            const dataAcao = new Date(item.DataAcao);
            if (filters.startDate && dataAcao < new Date(filters.startDate)) return false;
            if (filters.endDate && dataAcao > new Date(filters.endDate)) return false;
            return true;
        });
    }

    return report.sort((a, b) => b.DataAcao.getTime() - a.DataAcao.getTime());
}

/**
 * 5) Relatório Sessões – Histórico Completo
 */
export interface SessaoHistoricoReport {
    Id: string;
    Data: Date;
    Horario: string;
    Status: ConsultaStatus;
    PacienteId: string | null;
    PacienteNome: string | null;
    PacienteEmail: string | null;
    PsicologoId: string | null;
    PsicologoNome: string | null;
    PsicologoEmail: string | null;
    Valor: number | null;
    Faturada: boolean;
    DuracaoMinutos: number | null;
    Avaliacao?: number | null;
    ComentarioAvaliacao?: string | null;
    DataCriacao: Date;
    OrigemStatus?: string | null;
}

export async function getSessaoHistoricoReport(
    filters: ComprehensiveReportFilters = {}
): Promise<SessaoHistoricoReport[]> {
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

    if (filters.pacienteId) {
        where.PacienteId = filters.pacienteId;
    }

    if (filters.psicologoId) {
        where.PsicologoId = filters.psicologoId;
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
                    Email: true,
                },
            },
            Psicologo: {
                select: {
                    Id: true,
                    Nome: true,
                    Email: true,
                },
            },
            ReservaSessao: {
                select: {
                    Id: true,
                },
            },
        },
        orderBy: { Date: 'desc' },
    });

    // Buscar avaliações separadamente
    const consultaIds = sessoes.map(s => s.Id);
    const avaliacoes = await prisma.review.findMany({
        where: {
            // Review não tem ConsultaId direto, então vamos buscar por PsicologoId e UserId
        },
        select: {
            Id: true,
            Rating: true,
            Comentario: true,
            PsicologoId: true,
            UserId: true,
        },
    });

    // Criar mapa de avaliações por psicologo e paciente
    const avaliacoesMap = new Map<string, { Rating: number; Comentario: string | null }>();
    avaliacoes.forEach(av => {
        const key = `${av.PsicologoId}-${av.UserId || ''}`;
        avaliacoesMap.set(key, { Rating: av.Rating, Comentario: av.Comentario });
    });

    return sessoes.map(sessao => {
        const avKey = `${sessao.PsicologoId}-${sessao.PacienteId || ''}`;
        const avaliacao = avaliacoesMap.get(avKey);

        return {
            Id: sessao.Id,
            Data: sessao.Date,
            Horario: sessao.Time,
            Status: sessao.Status,
            PacienteId: sessao.PacienteId,
            PacienteNome: sessao.Paciente?.Nome || null,
            PacienteEmail: sessao.Paciente?.Email || null,
            PsicologoId: sessao.PsicologoId,
            PsicologoNome: sessao.Psicologo?.Nome || null,
            PsicologoEmail: sessao.Psicologo?.Email || null,
            Valor: sessao.Valor,
            Faturada: sessao.Faturada,
            DuracaoMinutos: null, // Campo não existe no schema
            Avaliacao: avaliacao?.Rating || null,
            ComentarioAvaliacao: avaliacao?.Comentario || null,
            DataCriacao: sessao.CreatedAt,
            OrigemStatus: sessao.OrigemStatus,
        };
    });
}

/**
 * 6) Relatório Avaliações de Sessões
 */
export interface AvaliacaoSessaoReport {
    Id: string;
    SessaoId: string;
    DataSessao: Date;
    HorarioSessao: string;
    PsicologoId: string;
    PsicologoNome: string;
    PsicologoEmail: string;
    PacienteId: string | null;
    PacienteNome: string | null;
    PacienteEmail: string | null;
    Rating: number;
    Comentario: string | null;
    Status: string;
    MostrarNaHome: boolean | null;
    MostrarNaPsicologo: boolean | null;
    DataAvaliacao: Date;
}

export async function getAvaliacaoSessaoReport(
    filters: ComprehensiveReportFilters = {}
): Promise<AvaliacaoSessaoReport[]> {
    const where: Record<string, unknown> = {};

    if (filters.status) {
        where.Status = filters.status;
    }

    if (filters.userId || filters.psicologoId) {
        where.PsicologoId = filters.userId || filters.psicologoId;
    }

    if (filters.pacienteId) {
        where.UserId = filters.pacienteId;
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
                    Email: true,
                },
            },
            User: {
                select: {
                    Id: true,
                    Nome: true,
                    Email: true,
                },
            },
        },
        orderBy: { CreatedAt: 'desc' },
    });

    // Buscar consultas relacionadas através de PsicologoId e PacienteId
    const consultasMap = new Map<string, { Id: string; Date: Date; Time: string }>();
    
    for (const av of avaliacoes) {
        if (av.UserId && av.PsicologoId) {
            const consulta = await prisma.consulta.findFirst({
                where: {
                    PacienteId: av.UserId,
                    PsicologoId: av.PsicologoId,
                },
                orderBy: { Date: 'desc' },
                take: 1,
            });
            
            if (consulta) {
                consultasMap.set(av.Id, {
                    Id: consulta.Id,
                    Date: consulta.Date,
                    Time: consulta.Time,
                });
            }
        }
    }

    return avaliacoes.map(av => {
        const consulta = consultasMap.get(av.Id);
        
        return {
            Id: av.Id,
            SessaoId: consulta?.Id || '',
            DataSessao: consulta?.Date || av.CreatedAt,
            HorarioSessao: consulta?.Time || '',
            PsicologoId: av.PsicologoId,
            PsicologoNome: av.Psicologo.Nome,
            PsicologoEmail: av.Psicologo.Email,
            PacienteId: av.UserId || null,
            PacienteNome: av.User?.Nome || null,
            PacienteEmail: av.User?.Email || null,
            Rating: av.Rating,
            Comentario: av.Comentario,
            Status: av.Status,
            MostrarNaHome: av.MostrarNaHome,
            MostrarNaPsicologo: av.MostrarNaPsicologo,
            DataAvaliacao: av.CreatedAt,
        };
    });
}

/**
 * 7) Relatório Transacional de Faturamento por Cliente PF
 */
export interface FaturamentoClienteReport {
    Id: string;
    ClienteId: string;
    ClienteNome: string;
    ClienteEmail: string;
    TipoTransacao: string;
    Valor: number;
    Status: string;
    DataVencimento: Date;
    DataPagamento: Date | null;
    PlanoNome?: string | null;
    FaturaId: string | null;
    Descricao?: string | null;
    DataCriacao: Date;
}

export async function getFaturamentoClienteReport(
    filters: ComprehensiveReportFilters = {}
): Promise<FaturamentoClienteReport[]> {
    const where: Record<string, unknown> = {
        User: {
            Role: Role.Patient,
        },
    };

    if (filters.status) {
        where.Status = filters.status;
    }

    if (filters.userId || filters.pacienteId) {
        where.UserId = filters.userId || filters.pacienteId;
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
        orderBy: { CreatedAt: 'desc' },
    });

    return financeiros.map(fin => ({
        Id: fin.Id,
        ClienteId: fin.UserId,
        ClienteNome: fin.User.Nome,
        ClienteEmail: fin.User.Email,
        TipoTransacao: fin.Tipo,
        Valor: fin.Valor,
        Status: fin.Status,
        DataVencimento: fin.DataVencimento,
        DataPagamento: null, // Campo não existe no schema
        PlanoNome: fin.PlanoAssinatura?.Nome || null,
        FaturaId: fin.FaturaId,
        Descricao: null, // Campo não existe no schema
        DataCriacao: fin.CreatedAt,
    }));
}

/**
 * 8) Relatório Acesso à Plataforma e Reset de Senha – Psicólogo
 * (Similar ao 4, mas filtrado apenas para psicólogos)
 */
export async function getAcessoResetPsicologoReport(
    filters: ComprehensiveReportFilters = {}
): Promise<AcessoResetReport[]> {
    return getAcessoResetReport({ ...filters, role: Role.Psychologist });
}

/**
 * 9) Relatório Agenda do Psicólogo
 */
export interface AgendaPsicologoReport {
    Id: string;
    PsicologoId: string;
    PsicologoNome: string;
    PsicologoEmail: string;
    Data: Date;
    Horario: string;
    DiaDaSemana: string;
    Status: string;
    PacienteId: string | null;
    PacienteNome: string | null;
    PacienteEmail: string | null;
    ConsultaId: string | null;
    DataCriacao: Date;
}

export async function getAgendaPsicologoReport(
    filters: ComprehensiveReportFilters = {}
): Promise<AgendaPsicologoReport[]> {
    const where: Record<string, unknown> = {};

    if (filters.status) {
        where.Status = filters.status;
    }

    if (filters.userId || filters.psicologoId) {
        where.PsicologoId = filters.userId || filters.psicologoId;
    }

    if (filters.pacienteId) {
        where.PacienteId = filters.pacienteId;
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
            Psicologo: {
                select: {
                    Id: true,
                    Nome: true,
                    Email: true,
                },
            },
            Paciente: {
                select: {
                    Id: true,
                    Nome: true,
                    Email: true,
                },
            },
            Consultas: {
                select: {
                    Id: true,
                },
                take: 1,
            },
        },
        orderBy: { Data: 'desc' },
    });

    return agendas.map(ag => ({
        Id: ag.Id,
        PsicologoId: ag.PsicologoId,
        PsicologoNome: ag.Psicologo.Nome,
        PsicologoEmail: ag.Psicologo.Email,
        Data: ag.Data,
        Horario: ag.Horario,
        DiaDaSemana: ag.DiaDaSemana,
        Status: ag.Status,
        PacienteId: ag.PacienteId,
        PacienteNome: ag.Paciente?.Nome || null,
        PacienteEmail: ag.Paciente?.Email || null,
        ConsultaId: ag.Consultas?.[0]?.Id || null,
        DataCriacao: ag.CreatedAt,
    }));
}

/**
 * 10) Relatório Carteira e Pagamento dos Psicólogos
 */
export interface CarteiraPagamentoPsicologoReport {
    Id: string;
    PsicologoId: string;
    PsicologoNome: string;
    PsicologoEmail: string;
    Periodo: string | null;
    ConsultasRealizadas: number | null;
    ValorTotal: number;
    Status: string;
    DataVencimento: Date;
    DataPagamento: Date | null;
    Tipo: string;
    Banco?: string | null;
    Agencia?: string | null;
    Conta?: string | null;
    PIX?: string | null;
    DataCriacao: Date;
}

export async function getCarteiraPagamentoPsicologoReport(
    filters: ComprehensiveReportFilters = {}
): Promise<CarteiraPagamentoPsicologoReport[]> {
    const where: Record<string, unknown> = {};

    if (filters.status) {
        where.Status = filters.status;
    }

    if (filters.userId || filters.psicologoId) {
        where.UserId = filters.userId || filters.psicologoId;
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
        orderBy: { CreatedAt: 'desc' },
    });

    return repasses.map(rep => ({
        Id: rep.Id,
        PsicologoId: rep.UserId,
        PsicologoNome: rep.User.Nome,
        PsicologoEmail: rep.User.Email,
        Periodo: rep.Periodo,
        ConsultasRealizadas: rep.ConsultasRealizadas,
        ValorTotal: rep.Valor,
        Status: rep.Status,
        DataVencimento: rep.DataVencimento,
        DataPagamento: rep.DataPagamento,
        Tipo: rep.Tipo,
        Banco: null, // Campo não existe no schema User
        Agencia: null, // Campo não existe no schema User
        Conta: null, // Campo não existe no schema User
        PIX: null, // Campo não existe no schema User
        DataCriacao: rep.CreatedAt,
    }));
}

/**
 * 11) Relatório de Objetivos do Onboarding dos Pacientes
 */
export interface OnboardingObjetivosReport {
    Id: string;
    PacienteId: string;
    PacienteNome: string;
    PacienteEmail: string;
    Objetivos: string; // Step contém os objetivos separados por vírgula
    ObjetivosArray: string[]; // Array dos objetivos para facilitar visualização
    Completed: boolean;
    DataCriacao: Date;
    DataAtualizacao: Date;
}

export async function getOnboardingObjetivosReport(
    filters: ComprehensiveReportFilters = {}
): Promise<OnboardingObjetivosReport[]> {
    const where: Record<string, unknown> = {
        User: {
            Role: 'Patient', // Apenas pacientes
        },
    };

    if (filters.userId || filters.pacienteId) {
        where.UserId = filters.userId || filters.pacienteId;
    }

    if (filters.search) {
        where.User = {
            Role: 'Patient',
            OR: [
                { Nome: { contains: filters.search, mode: 'insensitive' } },
                { Email: { contains: filters.search, mode: 'insensitive' } },
            ],
        };
    }

    if (filters.startDate || filters.endDate) {
        where.CreatedAt = {
            ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
            ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
        };
    }

    const onboardings = await prisma.onboarding.findMany({
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
        orderBy: { CreatedAt: 'desc' },
    });

    return onboardings.map(onb => ({
        Id: onb.Id,
        PacienteId: onb.UserId,
        PacienteNome: onb.User.Nome,
        PacienteEmail: onb.User.Email,
        Objetivos: onb.Step,
        ObjetivosArray: onb.Step ? onb.Step.split(',').map(o => o.trim()).filter(o => o.length > 0) : [],
        Completed: onb.Completed,
        DataCriacao: onb.CreatedAt,
        DataAtualizacao: onb.UpdatedAt,
    }));
}


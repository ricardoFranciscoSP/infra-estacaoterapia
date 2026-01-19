import prisma from '../../prisma/client';
import { FinanceiroPsicologoStatus, ControleFinanceiroStatus } from '../../generated/prisma';

export interface FiltroFinanceiroAdmin {
  dataInicio?: string;
  dataFim?: string;
  psicologoId?: string;
  status?: FinanceiroPsicologoStatus | ControleFinanceiroStatus;
  tipo?: string;
  page?: number;
  pageSize?: number;
}

export interface EstatisticasFinanceiras {
  totalPsicologos: number;
  psicologosPagos: number;
  psicologosPendentes: number;
  psicologosReprovados: number;
  totalEntradas: number;
  totalSaidas: number;
  totalRepasses: number;
  saldoLiquido: number;
  pedidosSaquePendentes: number;
  documentosPendentes: number;
}

export interface RelatorioFinanceiro {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: {
    totalEntradas: number;
    totalSaidas: number;
    totalRepasses: number;
    saldoLiquido: number;
  };
  porStatus: {
    aprovado: number;
    pendente: number;
    reprovado: number;
    processando: number;
  };
  porPsicologo: Array<{
    psicologoId: string;
    nome: string;
    totalPago: number;
    totalPendente: number;
    consultas: number;
  }>;
  porPeriodo: Array<{
    mes: number;
    ano: number;
    entradas: number;
    saidas: number;
  }>;
}

export class AdmFinanceiroService {
  /**
   * Lista todos os pagamentos de psicólogos com filtros
   */
  async listarPagamentosPsicologos(filtros: FiltroFinanceiroAdmin = {}) {
    const {
      dataInicio,
      dataFim,
      psicologoId,
      status,
      tipo,
      page = 1,
      pageSize = 50,
    } = filtros;

    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (psicologoId) {
      where.UserId = psicologoId;
    }

    if (status) {
      where.Status = status;
    }

    if (tipo) {
      where.Tipo = tipo;
    }

    if (dataInicio || dataFim) {
      const dateFilter: Record<string, unknown> = {};
      if (dataInicio) {
        dateFilter.gte = new Date(dataInicio);
      }
      if (dataFim) {
        dateFilter.lte = new Date(dataFim);
      }
      where.DataVencimento = dateFilter;
    }

    const [items, total] = await Promise.all([
      prisma.financeiroPsicologo.findMany({
        where,
        include: {
          User: {
            select: {
              Id: true,
              Nome: true,
              Email: true,
              Crp: true,
              ProfessionalProfiles: {
                select: {
                  Id: true,
                },
                take: 1,
              },
            },
          },
          ReservaSessao: {
            select: {
              Id: true,
              ScheduledAt: true,
            },
            take: 10,
          },
        },
        orderBy: { CreatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.financeiroPsicologo.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        User: {
          ...item.User,
          CRP: item.User.Crp || null,
        },
      })),
      paginacao: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Lista todos os pagamentos de pacientes (entradas)
   */
  async listarPagamentosPacientes(filtros: FiltroFinanceiroAdmin = {}) {
    const {
      dataInicio,
      dataFim,
      psicologoId, // Não aplicável aqui, mas mantido para consistência
      status,
      tipo,
      page = 1,
      pageSize = 50,
    } = filtros;

    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (status) {
      where.Status = status;
    }

    if (tipo) {
      where.Tipo = tipo;
    }

    if (dataInicio || dataFim) {
      const dateFilter: Record<string, unknown> = {};
      if (dataInicio) {
        dateFilter.gte = new Date(dataInicio);
      }
      if (dataFim) {
        dateFilter.lte = new Date(dataFim);
      }
      where.DataVencimento = dateFilter;
    }

    const [items, total] = await Promise.all([
      prisma.financeiro.findMany({
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
              Id: true,
              Nome: true,
            },
          },
          Fatura: {
            select: {
              Id: true,
              CodigoFatura: true,
              DataEmissao: true,
              DataVencimento: true,
              Status: true,
            },
          },
        },
        orderBy: { CreatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.financeiro.count({ where }),
    ]);

    return {
      items,
      paginacao: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Lista psicólogos com informações financeiras
   */
  async listarPsicologosComFinanceiro(filtros: { status?: string; page?: number; pageSize?: number } = {}) {
    try {
      const { status, page = 1, pageSize = 50 } = filtros;
      const skip = (page - 1) * pageSize;

      const where: Record<string, unknown> = {
        Role: 'Psychologist',
      };

      if (status) {
        where.Status = status;
      } else {
        // Se não há filtro de status, excluir apenas usuários deletados
        where.Status = { not: 'Deletado' };
      }

      console.log('[AdmFinanceiroService] Buscando psicólogos com where:', JSON.stringify(where));

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            Id: true,
            Nome: true,
            Email: true,
            Crp: true,
            Status: true,
            ProfessionalProfiles: {
              select: {
                Id: true,
                TipoPessoaJuridico: true,
              },
              take: 1,
            },
            PessoalJuridica: {
              select: {
                Id: true,
              },
            },
            FormularioSaqueAutonomo: {
              select: {
                Id: true,
              },
            },
          },
          orderBy: { CreatedAt: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.user.count({ where }),
      ]);

      const userIds = users.map(user => user.Id);
      const financeiroPorStatus = await prisma.financeiroPsicologo.groupBy({
        by: ["UserId", "Status"],
        where: {
          UserId: { in: userIds },
        },
        _sum: {
          Valor: true,
        },
      });

      const ultimoPagamentoAgg = await prisma.financeiroPsicologo.groupBy({
        by: ["UserId"],
        where: {
          UserId: { in: userIds },
          DataPagamento: { not: null },
        },
        _max: {
          DataPagamento: true,
        },
      });

      const sumPorStatusMap = new Map<string, Map<string, number>>();
      for (const row of financeiroPorStatus) {
        if (!row.UserId) continue;
        const map = sumPorStatusMap.get(row.UserId) || new Map<string, number>();
        map.set(row.Status, row._sum.Valor ?? 0);
        sumPorStatusMap.set(row.UserId, map);
      }

      const ultimoPagamentoMap = new Map<string, Date | null>();
      for (const row of ultimoPagamentoAgg) {
        if (!row.UserId) continue;
        ultimoPagamentoMap.set(row.UserId, row._max.DataPagamento ?? null);
      }

      const psicologos = users.map((user) => {
        const profile = user.ProfessionalProfiles?.[0];
        const statusMap = sumPorStatusMap.get(user.Id) || new Map<string, number>();

        const valorPago = statusMap.get('pago') || 0;
        const valorAprovado = statusMap.get('aprovado') || 0;
        const valorRetido = statusMap.get('retido') || 0;
        const valorPendente = statusMap.get('pendente') || 0;
        const valorProcessando = statusMap.get('processando') || 0;
        const valorCancelado = statusMap.get('cancelado') || 0;

        const saldoDisponivel = valorPago + valorAprovado;
        const saldoRetido = valorRetido;
        const totalPago = valorPago;
        const totalPendente = valorPendente + valorProcessando;
        const totalReprovado = valorCancelado;
        const ultimoPagamento = ultimoPagamentoMap.get(user.Id) || null;

        const tipoPessoa = user.PessoalJuridica
          ? 'Pessoa Jurídica'
          : (profile?.TipoPessoaJuridico &&
              Array.isArray(profile.TipoPessoaJuridico) &&
              profile.TipoPessoaJuridico.some((tipo) => tipo !== 'Autonomo'))
            ? 'Pessoa Jurídica'
            : 'Autônomo';

        return {
          Id: user.Id,
          Nome: user.Nome,
          Email: user.Email,
          CRP: user.Crp || null,
          Status: user.Status,
          TipoPessoa: tipoPessoa as 'Autônomo' | 'Pessoa Jurídica',
          SaldoDisponivel: saldoDisponivel,
          SaldoRetido: saldoRetido,
          TotalPago: totalPago,
          TotalPendente: totalPendente,
          TotalReprovado: totalReprovado,
          UltimoPagamento: ultimoPagamento,
          DocumentosPendentes: 0, // Será calculado separadamente se necessário
          FormularioSaqueCompleto: !!user.FormularioSaqueAutonomo,
          ProfessionalProfileId: profile?.Id || null,
        };
      });

      console.log('[AdmFinanceiroService] Psicólogos processados:', psicologos.length);

      return {
        items: psicologos,
        paginacao: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      console.error('[AdmFinanceiroService] Erro ao listar psicólogos:', error);
      throw error;
    }
  }

  /**
   * Aprova um pagamento de psicólogo
   */
  async aprovarPagamento(financeiroPsicologoId: string, observacoes?: string, dataPagamento?: string) {
    const financeiro = await prisma.financeiroPsicologo.findUnique({
      where: { Id: financeiroPsicologoId },
    });

    if (!financeiro) {
      throw new Error('Pagamento não encontrado');
    }

    const atualizado = await prisma.financeiroPsicologo.update({
      where: { Id: financeiroPsicologoId },
      data: {
        Status: 'aprovado',
        DataPagamento: dataPagamento ? new Date(dataPagamento) : new Date(),
      },
    });

    // Se for uma solicitação de saque (Tipo: 'Saque'), atualizar o status da solicitação relacionada
    if (financeiro.Tipo === 'Saque') {
      try {
        // Buscar solicitação relacionada pelo período e valor
        const solicitacao = await prisma.solicitacoes.findFirst({
          where: {
            UserId: financeiro.UserId,
            Tipo: 'Saque',
            Status: 'PagamentoEmAnalise',
            Descricao: {
              contains: financeiro.Periodo || ''
            }
          },
          orderBy: {
            CreatedAt: 'desc'
          }
        });

        if (solicitacao) {
          await prisma.solicitacoes.update({
            where: { Id: solicitacao.Id },
            data: { Status: 'Aprovado' }
          });
          console.log(`[AdmFinanceiroService] Status da solicitação ${solicitacao.Id} atualizado para Aprovado`);
        }
      } catch (error) {
        console.error('[AdmFinanceiroService] Erro ao atualizar status da solicitação:', error);
        // Não falha a aprovação se não conseguir atualizar a solicitação
      }
    }

    return atualizado;
  }

  /**
   * Reprova um pagamento de psicólogo
   */
  async reprovarPagamento(financeiroPsicologoId: string, motivo: string) {
    const financeiro = await prisma.financeiroPsicologo.findUnique({
      where: { Id: financeiroPsicologoId },
    });

    if (!financeiro) {
      throw new Error('Pagamento não encontrado');
    }

    const atualizado = await prisma.financeiroPsicologo.update({
      where: { Id: financeiroPsicologoId },
      data: {
        Status: 'cancelado',
      },
    });

    // Se for uma solicitação de saque (Tipo: 'Saque'), atualizar o status da solicitação relacionada
    if (financeiro.Tipo === 'Saque') {
      try {
        // Buscar solicitação relacionada pelo período e valor
        const solicitacao = await prisma.solicitacoes.findFirst({
          where: {
            UserId: financeiro.UserId,
            Tipo: 'Saque',
            Status: { in: ['PagamentoEmAnalise', 'Pendente'] },
            Descricao: {
              contains: financeiro.Periodo || ''
            }
          },
          orderBy: {
            CreatedAt: 'desc'
          }
        });

        if (solicitacao) {
          await prisma.solicitacoes.update({
            where: { Id: solicitacao.Id },
            data: { Status: 'Recusado' }
          });
          console.log(`[AdmFinanceiroService] Status da solicitação ${solicitacao.Id} atualizado para Recusado`);
        }
      } catch (error) {
        console.error('[AdmFinanceiroService] Erro ao atualizar status da solicitação:', error);
        // Não falha a reprovação se não conseguir atualizar a solicitação
      }
    }

    return atualizado;
  }

  /**
   * Baixa um pagamento (marca como pago)
   */
  async baixarPagamento(financeiroPsicologoId: string, comprovanteUrl?: string) {
    const financeiro = await prisma.financeiroPsicologo.findUnique({
      where: { Id: financeiroPsicologoId },
    });

    if (!financeiro) {
      throw new Error('Pagamento não encontrado');
    }

    const atualizado = await prisma.financeiroPsicologo.update({
      where: { Id: financeiroPsicologoId },
      data: {
        Status: 'pago',
        DataPagamento: new Date(),
        UrlDocumentoStorage: comprovanteUrl || financeiro.UrlDocumentoStorage,
      },
    });

    return atualizado;
  }

  /**
   * Obtém estatísticas financeiras
   */
  async obterEstatisticas(): Promise<EstatisticasFinanceiras> {
    const [
      totalPsicologos,
      financeirosPsicologo,
      financeirosPacientes,
      pedidosSaquePendentes,
    ] = await Promise.all([
      prisma.user.count({
        where: { Role: 'Psychologist', Status: { not: 'Deletado' } },
      }),
      prisma.financeiroPsicologo.findMany({
        select: {
          Status: true,
          Valor: true,
        },
      }),
      prisma.financeiro.findMany({
        where: {
          Status: { in: ['Aprovado'] },
        },
        select: {
          Valor: true,
        },
      }),
      prisma.financeiroPsicologo.count({
        where: {
          Status: { in: ['pendente', 'processando'] },
        },
      }),
    ]);

    const psicologosPagos = financeirosPsicologo.filter((f) => f.Status === 'pago').length;
    const psicologosPendentes = financeirosPsicologo.filter((f) => 
      f.Status === 'pendente' || f.Status === 'processando'
    ).length;
    const psicologosReprovados = financeirosPsicologo.filter((f) => f.Status === 'cancelado').length;

    const totalEntradas = financeirosPacientes.reduce((sum, f) => sum + f.Valor, 0);
    const totalSaidas = financeirosPsicologo
      .filter((f) => f.Status === 'pago')
      .reduce((sum, f) => sum + f.Valor, 0);
    const totalRepasses = totalSaidas; // Mesmo valor para repasses
    const saldoLiquido = totalEntradas - totalSaidas;

    return {
      totalPsicologos,
      psicologosPagos,
      psicologosPendentes,
      psicologosReprovados,
      totalEntradas,
      totalSaidas,
      totalRepasses,
      saldoLiquido,
      pedidosSaquePendentes,
      documentosPendentes: 0, // Será calculado separadamente se necessário
    };
  }

  /**
   * Gera relatório financeiro
   */
  async gerarRelatorio(filtros: { dataInicio?: string; dataFim?: string; psicologoId?: string }): Promise<RelatorioFinanceiro> {
    const { dataInicio, dataFim, psicologoId } = filtros;

    const whereEntradas: Record<string, unknown> = {
      Status: 'Aprovado',
    };

    const whereSaidas: Record<string, unknown> = {
      Status: 'pago',
    };

    if (dataInicio || dataFim) {
      const dateFilter: Record<string, unknown> = {};
      if (dataInicio) {
        dateFilter.gte = new Date(dataInicio);
      }
      if (dataFim) {
        dateFilter.lte = new Date(dataFim);
      }
      whereEntradas.DataVencimento = dateFilter;
      whereSaidas.DataPagamento = dateFilter;
    }

    if (psicologoId) {
      whereSaidas.UserId = psicologoId;
    }

    const [entradas, saidas, financeirosPsicologo] = await Promise.all([
      prisma.financeiro.findMany({
        where: whereEntradas,
        select: {
          Valor: true,
          DataVencimento: true,
        },
      }),
      prisma.financeiroPsicologo.findMany({
        where: whereSaidas,
        include: {
          User: {
            select: {
              Id: true,
              Nome: true,
            },
          },
          ReservaSessao: {
            select: {
              Id: true,
            },
          },
        },
      }),
      prisma.financeiroPsicologo.findMany({
        where: psicologoId ? { UserId: psicologoId } : {},
        select: {
          Status: true,
          Valor: true,
        },
      }),
    ]);

    const totalEntradas = entradas.reduce((sum, e) => sum + e.Valor, 0);
    const totalSaidas = saidas.reduce((sum, s) => sum + s.Valor, 0);
    const totalRepasses = totalSaidas;
    const saldoLiquido = totalEntradas - totalSaidas;

    const porStatus = {
      aprovado: financeirosPsicologo.filter((f) => f.Status === 'pago').length,
      pendente: financeirosPsicologo.filter((f) => f.Status === 'pendente').length,
      reprovado: financeirosPsicologo.filter((f) => f.Status === 'cancelado').length,
      processando: financeirosPsicologo.filter((f) => f.Status === 'processando').length,
    };

    // Agrupar por psicólogo
    const porPsicologoMap = new Map<string, { psicologoId: string; nome: string; totalPago: number; totalPendente: number; consultas: number }>();
    
    saidas.forEach((s) => {
      const key = s.UserId;
      const existing = porPsicologoMap.get(key) || {
        psicologoId: key,
        nome: s.User.Nome,
        totalPago: 0,
        totalPendente: 0,
        consultas: 0,
      };
      existing.totalPago += s.Valor;
      existing.consultas += s.ReservaSessao?.length || 0;
      porPsicologoMap.set(key, existing);
    });

    const porPsicologo = Array.from(porPsicologoMap.values());

    // Agrupar por período (mês/ano)
    const porPeriodoMap = new Map<string, { mes: number; ano: number; entradas: number; saidas: number }>();

    entradas.forEach((e) => {
      const date = new Date(e.DataVencimento);
      const key = `${date.getMonth() + 1}-${date.getFullYear()}`;
      const existing = porPeriodoMap.get(key) || {
        mes: date.getMonth() + 1,
        ano: date.getFullYear(),
        entradas: 0,
        saidas: 0,
      };
      existing.entradas += e.Valor;
      porPeriodoMap.set(key, existing);
    });

    saidas.forEach((s) => {
      if (s.DataPagamento) {
        const date = new Date(s.DataPagamento);
        const key = `${date.getMonth() + 1}-${date.getFullYear()}`;
        const existing = porPeriodoMap.get(key) || {
          mes: date.getMonth() + 1,
          ano: date.getFullYear(),
          entradas: 0,
          saidas: 0,
        };
        existing.saidas += s.Valor;
        porPeriodoMap.set(key, existing);
      }
    });

    const porPeriodo = Array.from(porPeriodoMap.values()).sort((a, b) => {
      if (a.ano !== b.ano) return b.ano - a.ano;
      return b.mes - a.mes;
    });

    return {
      periodo: {
        inicio: dataInicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        fim: dataFim || new Date().toISOString(),
      },
      resumo: {
        totalEntradas,
        totalSaidas,
        totalRepasses,
        saldoLiquido,
      },
      porStatus,
      porPsicologo,
      porPeriodo,
    };
  }

  /**
   * Busca detalhes completos de um psicólogo (somente leitura para financeiro)
   * GET /admin/financeiro/psicologos/:id
   */
  async obterDetalhesPsicologo(psicologoId: string) {
    try {
      const psicologo = await prisma.user.findFirst({
        where: { Id: psicologoId, Role: "Psychologist" },
        include: {
          ProfessionalProfiles: {
            include: {
              Documents: true,
              Formacoes: true,
              DadosBancarios: true,
            }
          },
          PsychologistAgendas: true,
          ReviewsReceived: true,
          FavoritesReceived: true,
          Images: true,
          Address: true,
          BillingAddress: true,
          Commissions: true,
          WorkSchedules: true,
          PessoalJuridica: {
            include: {
              DadosBancarios: true,
              EnderecoEmpresa: true
            }
          },
          ConsultaPsicologos: {
            include: {
              ReservaSessao: true
            }
          },
        }
      });

      if (!psicologo) {
        return null;
      }

      // Remove senha e outros campos sensíveis
      const { Password, ResetPasswordToken, ...rest } = psicologo;
      
      return rest;
    } catch (error) {
      console.error('[AdmFinanceiroService] Erro ao buscar detalhes do psicólogo:', error);
      throw error;
    }
  }
}


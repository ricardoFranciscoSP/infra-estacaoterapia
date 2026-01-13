import { IFinanceiroService } from "../../interfaces/psicoologo/iFinanceiro.interface";
import prisma from "../../prisma/client";
import { getRepassePercentForPsychologist } from "../../utils/repasse.util";

export interface FiltroFinanceiro {
    mes?: number;
    ano?: number;
}

export class FinanceiroService implements IFinanceiroService {
    /**
     * Retorna os ganhos do psicólogo no mês especificado, com status detalhado (disponível, retido)
     * Implementa a regra de data de corte: Gere e nos envie sua Nota fiscal (para PJ) / Receita saúde (Autônomo) 
     * até no máximo dia 23 do mês. O pagamento é efetuado até o dia 5 do mês seguinte.
     */
    async calcularPagamento(psicologoId: string, filtro?: FiltroFinanceiro) {
        console.log("🔹 Calculando pagamento para psicólogo:", psicologoId, "com filtro:", filtro);
        const now = new Date();
        const ano = now.getFullYear();
        const mes = now.getMonth(); // 0-indexado (0-11)
        
        // Período: 20 do mês anterior até 20 do mês atual
        // Se estamos em dezembro (mes = 11), mês anterior é novembro (mes = 10)
        // Se estamos em janeiro (mes = 0), mês anterior é dezembro do ano anterior
        const mesAnterior = mes === 0 ? 11 : mes - 1;
        const anoAnterior = mes === 0 ? ano - 1 : ano;
        
        // Data de pagamento: sempre dia 05 do mês seguinte ao mês atual
        // Se estamos em dezembro (mes = 11), mês seguinte é janeiro (mes = 0) do ano seguinte
        const mesSeguinte = mes === 11 ? 0 : mes + 1;
        const anoSeguinte = mes === 11 ? ano + 1 : ano;
        
        // Data início: 20 do mês anterior (início do dia, sem hora)
        const dataInicio = new Date(anoAnterior, mesAnterior, 20, 0, 0, 0, 0);
        // Data fim: 20 do mês atual (fim do dia, sem hora)
        const dataFim = new Date(ano, mes, 20, 23, 59, 59, 999);
        
        // Período de referência para o pagamento (mês seguinte)
        const periodoReferencia = `${anoSeguinte}-${mesSeguinte + 1}`;

        console.log("🔹 Período de corte calculado (20 a 20):", {
            dataInicio: dataInicio.toISOString(),
            dataFim: dataFim.toISOString(),
            periodoReferencia,
            periodo: `20/${mesAnterior + 1}/${anoAnterior} até 20/${mes + 1}/${ano}`,
            pagamento: `05/${mesSeguinte + 1}/${anoSeguinte}`
        });

        // Busca todas as consultas concluídas no período para garantir que todas tenham comissão
        // Isso garante que mesmo se algumas comissões já existirem, novas consultas serão processadas
        const consultas = await prisma.consulta.findMany({
            where: {
                PsicologoId: psicologoId,
                Status: "Realizada",
                Date: { gte: dataInicio, lte: dataFim },
            },
            include: {
                Paciente: {
                    include: {
                        AssinaturaPlanos: {
                            where: {
                                Status: "Ativo",
                                DataInicio: { lte: dataFim },
                                OR: [
                                    { DataFim: null },
                                    { DataFim: { gte: dataInicio } }
                                ]
                            },
                            include: {
                                PlanoAssinatura: true
                            }
                        }
                    }
                }
            },
        });

        // Define o percentual de repasse conforme tipo do psicólogo (Autônomo 32% | Jurídica 40%)
        const repassePercent = await getRepassePercentForPsychologist(psicologoId);
        const psicologo = await prisma.user.findUnique({ where: { Id: psicologoId } });
        const statusRepasse = psicologo?.Status === "Ativo" ? "disponivel" : "retido";

        // Processa cada consulta para garantir que tenha comissão criada/atualizada
        for (const consulta of consultas) {
            // Busca o plano ativo do paciente para o período da consulta
            const planoAssinatura = consulta.Paciente?.AssinaturaPlanos?.find(
                p => p.Status === "Ativo" && (!p.DataFim || new Date(p.DataFim) >= consulta.Date)
            );
            let valorBase: number = 0;
            let tipoPlano: "mensal" | "trimestral" | "semestral" | "avulsa" = "avulsa";

            if (planoAssinatura && planoAssinatura.PlanoAssinatura) {
                const tipo = planoAssinatura.PlanoAssinatura.Tipo?.toLowerCase();
                if (tipo === "mensal") {
                    tipoPlano = "mensal";
                    valorBase = (planoAssinatura.PlanoAssinatura.Preco ?? 0) / 4;
                } else if (tipo === "trimestral") {
                    tipoPlano = "trimestral";
                    valorBase = (planoAssinatura.PlanoAssinatura.Preco ?? 0) / 12;
                } else if (tipo === "semestral") {
                    tipoPlano = "semestral";
                    valorBase = (planoAssinatura.PlanoAssinatura.Preco ?? 0) / 24;
                } else {
                    tipoPlano = "avulsa";
                    valorBase = consulta.Valor ?? 0;
                }
            } else {
                // Não tem plano ativo, trata como consulta avulsa
                tipoPlano = "avulsa";
                valorBase = consulta.Valor ?? 0;
            }

            const valorPsicologo = valorBase * repassePercent;

            // Busca comissão existente por ConsultaId
            const comissaoExistente = await prisma.commission.findFirst({
                where: { ConsultaId: consulta.Id }
            });

            const mesConsulta = new Date(consulta.Date).getMonth() + 1;
            const anoConsulta = new Date(consulta.Date).getFullYear();

            if (comissaoExistente) {
                await prisma.commission.update({
                    where: { Id: comissaoExistente.Id },
                    data: {
                        Valor: valorPsicologo,
                        Status: statusRepasse,
                        Periodo: `${anoConsulta}-${mesConsulta}`,
                        TipoPlano: tipoPlano,
                    },
                });
            } else {
                await prisma.commission.create({
                    data: {
                        ConsultaId: consulta.Id,
                        PsicologoId: psicologoId,
                        Valor: valorPsicologo,
                        Status: statusRepasse,
                        Periodo: `${anoConsulta}-${mesConsulta}`,
                        TipoPlano: tipoPlano,
                    },
                });
            }
        }

        // Busca novamente todas as comissões do período após criar/atualizar
        const todasComissoes = await prisma.commission.findMany({
            where: {
                PsicologoId: psicologoId,
                OR: [
                    {
                        // Comissões com consulta associada no período
                        Consulta: {
                            Date: {
                                gte: dataInicio,
                                lte: dataFim
                            }
                        }
                    },
                    {
                        // Comissões sem consulta associada, mas criadas no período
                        ConsultaId: null,
                        CreatedAt: {
                            gte: dataInicio,
                            lte: dataFim
                        }
                    }
                ]
            }
        });

        // Soma os valores de todas as comissões do período
        const totalPagamento = todasComissoes.reduce((sum, comissao) => {
            return sum + (comissao.Valor || 0);
        }, 0);

        return {
            totalPagamento: parseFloat(totalPagamento.toFixed(2)),
            periodo: periodoReferencia,
        };
    }

    /**
     * Retorna o saldo disponível para resgate (comissões com status "disponivel" no período de corte)
     * Período: 20 do mês anterior até 20 do mês atual
     */
    async getSaldoDisponivelResgate(psicologoId: string) {
        const now = new Date();
        const ano = now.getFullYear();
        const mes = now.getMonth(); // 0-indexado (0-11)
        
        // Período: 20 do mês anterior até 20 do mês atual
        // Se estamos em dezembro (mes = 11), mês anterior é novembro (mes = 10)
        // Se estamos em janeiro (mes = 0), mês anterior é dezembro do ano anterior
        const mesAnterior = mes === 0 ? 11 : mes - 1;
        const anoAnterior = mes === 0 ? ano - 1 : ano;
        
        // Data início: 20 do mês anterior (início do dia, sem hora)
        const dataInicio = new Date(anoAnterior, mesAnterior, 20, 0, 0, 0, 0);
        // Data fim: 20 do mês atual (fim do dia, sem hora)
        const dataFim = new Date(ano, mes, 20, 23, 59, 59, 999);

        // Busca comissões com status "disponivel" no período
        const comissoesDisponiveis = await prisma.commission.findMany({
            where: {
                PsicologoId: psicologoId,
                Status: "disponivel",
                OR: [
                    {
                        // Comissões com consulta associada no período
                        Consulta: {
                            Date: {
                                gte: dataInicio,
                                lte: dataFim,
                            },
                        },
                    },
                    {
                        // Comissões sem consulta associada, mas criadas no período
                        ConsultaId: null,
                        CreatedAt: {
                            gte: dataInicio,
                            lte: dataFim,
                        },
                    },
                ],
            },
        });

        const saldoDisponivel = comissoesDisponiveis.reduce((sum, comissao) => {
            return sum + (comissao.Valor || 0);
        }, 0);

        return {
            saldoDisponivel: parseFloat(saldoDisponivel.toFixed(2)),
        };
    }

    /**
     * Retorna o saldo retido (comissões com status "retido" após o período de corte)
     * Mostra o valor das comissões geradas após o último fechamento até o próximo
     */
    async getSaldoRetido(psicologoId: string) {
        // Buscar a última solicitação de saque para obter a data de criação
        const ultimaSolicitacaoSaque = await prisma.financeiroPsicologo.findFirst({
            where: {
                UserId: psicologoId,
                Tipo: 'Saque'
            },
            orderBy: {
                CreatedAt: 'desc'
            }
        });

        let dataInicio: Date;
        let dataFim: Date;

        if (ultimaSolicitacaoSaque && ultimaSolicitacaoSaque.CreatedAt) {
            // Se há uma solicitação de saque, calcular desde a data de criação até o próximo período (dia 20 do mês seguinte)
            const dataCriacao = new Date(ultimaSolicitacaoSaque.CreatedAt);
            dataInicio = new Date(dataCriacao.getFullYear(), dataCriacao.getMonth(), dataCriacao.getDate(), 0, 0, 0, 0);
            
            // Calcular o dia 20 do mês seguinte
            const mesSeguinte = dataCriacao.getMonth() === 11 ? 0 : dataCriacao.getMonth() + 1;
            const anoSeguinte = dataCriacao.getMonth() === 11 ? dataCriacao.getFullYear() + 1 : dataCriacao.getFullYear();
            dataFim = new Date(anoSeguinte, mesSeguinte, 20, 23, 59, 59, 999);
        } else {
            // Se não há solicitação de saque, usar o período padrão (dia 20 do mês anterior até dia 20 do mês atual)
            const now = new Date();
            const ano = now.getFullYear();
            const mes = now.getMonth();
            
            // Dia 20 do mês anterior
            const mesAnterior = mes === 0 ? 11 : mes - 1;
            const anoAnterior = mes === 0 ? ano - 1 : ano;
            dataInicio = new Date(anoAnterior, mesAnterior, 20, 0, 0, 0, 0);
            
            // Dia 20 do mês atual
            dataFim = new Date(ano, mes, 20, 23, 59, 59, 999);
        }

        console.log('[getSaldoRetido] Período calculado:', {
            dataInicio: dataInicio.toISOString(),
            dataFim: dataFim.toISOString(),
            temSolicitacao: !!ultimaSolicitacaoSaque
        });

        // Buscar todas as consultas concluídas no período
        const consultasNoPeriodo = await prisma.consulta.findMany({
            where: {
                PsicologoId: psicologoId,
                Status: 'Realizada',
                Date: {
                    gte: dataInicio,
                    lte: dataFim
                }
            },
            include: {
                Commission: {
                    where: {
                        PsicologoId: psicologoId
                    }
                }
            }
        });

        // Calcular o valor total das comissões das consultas no período
        let saldoRetido = 0;
        for (const consulta of consultasNoPeriodo) {
            if (consulta.Commission && consulta.Commission.length > 0) {
                const comissao = consulta.Commission[0];
                saldoRetido += comissao.Valor || 0;
            }
        }

        console.log('[getSaldoRetido] Saldo retido calculado:', {
            quantidadeConsultas: consultasNoPeriodo.length,
            saldoRetido: saldoRetido
        });

        return {
            saldoRetido: parseFloat(saldoRetido.toFixed(2)),
        };
    }

    /**
     * Retorna os ganhos agrupados por mês (para gráfico da tela)
     * Se mes for fornecido (0-11), retorna apenas os meses até aquele mês (inclusive)
     */
    async getGanhosMensais(psicologoId: string, ano?: number, mes?: number) {
        const year = ano || new Date().getFullYear();
        // mes vem como 0-11 (índice do mês), queremos mostrar até esse mês inclusive

        const repasses = await prisma.commission.groupBy({
            by: ["Periodo", "Status"],
            where: {
                PsicologoId: psicologoId,
                Periodo: { startsWith: `${year}-` },
            },
            _sum: { Valor: true },
        });

        const ganhosPorMes = Array.from({ length: 12 }, (_, i) => ({
            mes: i + 1,
            disponivel: 0,
            retido: 0,
        }));

        for (const repasse of repasses) {
            if (!repasse.Periodo) continue;
            const parts = repasse.Periodo.split("-");
            const y = parts[0];
            const m = parts[1] ?? "0";
            const mesIndex = parseInt(m, 10) - 1; // mesIndex é 0-11
            if (isNaN(mesIndex) || mesIndex < 0 || mesIndex > 11) continue;
            
            // Se há filtro de mês, pular meses após o mês filtrado (mes também é 0-11)
            if (mes !== undefined && mesIndex > mes) continue;

            if (repasse.Status === "disponivel") ganhosPorMes[mesIndex].disponivel += repasse._sum.Valor ?? 0;
            else if (repasse.Status === "retido") ganhosPorMes[mesIndex].retido += repasse._sum.Valor ?? 0;
        }

        // Se há filtro de mês, retornar apenas até aquele mês (inclusive)
        // mes é 0-11, então precisamos retornar mes + 1 meses
        const mesesParaRetornar = mes !== undefined ? mes + 1 : 12;
        
        return ganhosPorMes.slice(0, mesesParaRetornar).map((m) => ({
            mes: m.mes,
            disponivel: parseFloat(m.disponivel.toFixed(2)),
            retido: parseFloat(m.retido.toFixed(2)),
            total: parseFloat((m.disponivel + m.retido).toFixed(2)),
        }));
    }

    /**
     * Retorna atendimentos agrupados por mês (para gráfico de barras)
     * Classifica como "Recebidos" (pago/disponivel) e "A receber" (retido/pendente)
     * Aplica lógica de data de corte (dia 23)
     */
    async getAtendimentosMensais(psicologoId: string, ano?: number, mes?: number) {
        const year = ano || new Date().getFullYear();
        const now = new Date();
        const diaAtual = now.getDate();
        const mesAtual = now.getMonth();
        const anoAtual = now.getFullYear();

        // Buscar todas as consultas concluídas do ano
        const dataInicio = new Date(year, 0, 1);
        const dataFim = new Date(year, 11, 31, 23, 59, 59, 999);

        const consultas = await prisma.consulta.findMany({
            where: {
                PsicologoId: psicologoId,
                Status: "Realizada",
                Date: { gte: dataInicio, lte: dataFim },
            },
            include: {
                Commission: {
                    select: {
                        Status: true,
                    },
                    take: 1,
                    orderBy: { CreatedAt: "desc" },
                },
            },
        });

        // Inicializar array de 12 meses
        const atendimentosPorMes = Array.from({ length: 12 }, (_, i) => ({
            mes: i + 1,
            recebidos: 0,
            aReceber: 0,
        }));

        for (const consulta of consultas) {
            const dataConsulta = new Date(consulta.Date);
            const mesConsulta = dataConsulta.getMonth(); // 0-11
            const anoConsulta = dataConsulta.getFullYear();

            // Se há filtro de mês, pular meses após o mês filtrado
            if (mes !== undefined && mesConsulta > mes) continue;
            if (anoConsulta !== year) continue;

            // Determinar se é "Recebido" ou "A receber" baseado no status da comissão
            // e na lógica de data de corte
            const comissao = consulta.Commission?.[0];
            const statusComissao = comissao?.Status;
            let isRecebido = false;

            if (statusComissao === "pago") {
                isRecebido = true;
            } else if (statusComissao === "disponivel") {
                // Verificar se já passou a data de corte para este mês
                // Se a comissão é do mês atual ou anterior ao atual
                if (anoConsulta < anoAtual || (anoConsulta === anoAtual && mesConsulta < mesAtual)) {
                    isRecebido = true; // Já passou, considera recebido
                } else if (anoConsulta === anoAtual && mesConsulta === mesAtual) {
                    // Mês atual: verifica data de corte
                    if (diaAtual >= 23) {
                        // Já passou o dia 23, disponível pode ser considerado recebido
                        isRecebido = true;
                    } else {
                        // Ainda não passou o dia 23, ainda está a receber
                        isRecebido = false;
                    }
                } else {
                    // Mês futuro, ainda a receber
                    isRecebido = false;
                }
            } else {
                // retido ou pendente ou sem comissão = a receber
                isRecebido = false;
            }

            if (isRecebido) {
                atendimentosPorMes[mesConsulta].recebidos += 1;
            } else {
                atendimentosPorMes[mesConsulta].aReceber += 1;
            }
        }

        // Se há filtro de mês, retornar apenas até aquele mês
        const mesesParaRetornar = mes !== undefined ? mes + 1 : 12;

        return atendimentosPorMes.slice(0, mesesParaRetornar).map((m) => ({
            mes: m.mes,
            recebidos: m.recebidos,
            aReceber: m.aReceber,
            total: m.recebidos + m.aReceber,
        }));
    }

    /**
     * Retorna histórico de sessões conforme o layout (com filtros)
     * Inclui status de pagamento baseado na commission associada
     */
    async getHistoricoSessoes(psicologoId: string, filtro?: FiltroFinanceiro & { page?: number; pageSize?: number }) {
        const now = new Date();
        const ano = filtro?.ano || now.getFullYear();
        const mes = filtro?.mes !== undefined ? filtro.mes : now.getMonth();
        const page = filtro?.page || 1;
        const pageSize = filtro?.pageSize || 10;
        const skip = (page - 1) * pageSize;

        const dataInicio = new Date(ano, mes, 1);
        const dataFim = new Date(ano, mes + 1, 0, 23, 59, 59, 999);

        // Busca total de registros para paginação
        const total = await prisma.consulta.count({
            where: {
                PsicologoId: psicologoId,
                Date: { gte: dataInicio, lte: dataFim },
            },
        });

        const sessoes = await prisma.consulta.findMany({
            where: {
                PsicologoId: psicologoId,
                Date: { gte: dataInicio, lte: dataFim },
            },
            include: {
                Paciente: { select: { Nome: true } },
                ReservaSessao: {
                    select: {
                        ScheduledAt: true,
                    },
                },
                Commission: {
                    select: {
                        Status: true,
                        Valor: true,
                    },
                    take: 1,
                    orderBy: { CreatedAt: "desc" },
                },
            },
            orderBy: { Date: "desc" },
            skip,
            take: pageSize,
        });

        const sessoesMapeadas = sessoes.map((sessao) => {
            // Mapeia status da sessão para o formato do frontend
            let statusSessao = "Agendada";
            if (sessao.Status === "Realizada") {
                statusSessao = "Realizada";
            } else if (sessao.Status === "Cancelado" || sessao.Status === "CanceladaPacienteNoPrazo" || sessao.Status === "CanceladaPsicologoNoPrazo" || sessao.Status === "CanceladaPacienteForaDoPrazo" || sessao.Status === "CanceladaPsicologoForaDoPrazo") {
                statusSessao = "Cancelada";
            }

            // Determina status de pagamento baseado na commission
            let statusPagamento = "-";
            const commission = sessao.Commission?.[0];
            
            if (statusSessao === "Agendada") {
                statusPagamento = "-";
            } else if (statusSessao === "Cancelada") {
                // Se cancelada, verifica se tem commission com status pago
                if (commission && commission.Status === "pago") {
                    statusPagamento = "Pago";
                } else {
                    statusPagamento = "Não pago";
                }
            } else if (statusSessao === "Realizada") {
                // Se realizada, verifica o status da commission
                if (commission) {
                    if (commission.Status === "pago") {
                        statusPagamento = "Pago";
                    } else if (commission.Status === "disponivel") {
                        statusPagamento = "Bloqueado"; // Disponível mas ainda não pago (aguardando liberação)
                    } else if (commission.Status === "retido") {
                        statusPagamento = "Bloqueado";
                    } else {
                        statusPagamento = "Bloqueado"; // pendente também é bloqueado
                    }
                } else {
                    statusPagamento = "Bloqueado"; // Sem commission ainda
                }
            }

            // Formata data e hora usando ScheduledAt da ReservaSessao, ou fallback para Date da Consulta
            const scheduledAt = sessao.ReservaSessao?.ScheduledAt;
            let dataHora: Date;
            
            if (scheduledAt) {
                // ScheduledAt é uma string no formato 'YYYY-MM-DD HH:mm:ss', precisa ser convertida para Date
                dataHora = new Date(scheduledAt);
                // Valida se a conversão foi bem-sucedida (não é uma data inválida)
                if (isNaN(dataHora.getTime())) {
                    // Se a conversão falhar, usa fallback para Date da Consulta
                    dataHora = new Date(sessao.Date);
                }
            } else {
                // Fallback para Date da Consulta se não houver ScheduledAt
                dataHora = new Date(sessao.Date);
            }
            
            const dataFormatada = dataHora.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const horaFormatada = dataHora.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            return {
                id: sessao.Id.substring(0, 4).toUpperCase(), // Primeiros 4 caracteres do ID
                sessaoId: sessao.Id, // ID completo para referência
                paciente: sessao.Paciente?.Nome || "Não informado",
                dataHora: `${dataFormatada} - ${horaFormatada}`,
                valor: sessao.Valor || 0,
                statusSessao,
                statusPagamento,
            };
        });

        return {
            data: sessoesMapeadas,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        };
    }

    /**
     * Processa o pagamento manualmente (solicitação de saque)
     */
    async processarPagamento(psicologoId: string, valorSolicitado: number): Promise<boolean> {
        const psicologo = await prisma.user.findUnique({ where: { Id: psicologoId } });

        if (!psicologo) throw new Error("Psicólogo não encontrado");

        const status = psicologo.Status === "Ativo" ? "processando" : "retido";

        await prisma.financeiroPsicologo.create({
            data: {
                UserId: psicologoId,
                Valor: valorSolicitado,
                Status: status,
                DataVencimento: new Date(),
                Tipo: "saque",
            },
        });

        return true;
    }

    // Adicione propriedades para armazenar contexto, se necessário
    private psicologoIdRelatorio?: string;
    private filtroRelatorio?: FiltroFinanceiro;

    setRelatorioContext(psicologoId: string, filtro?: FiltroFinanceiro) {
        this.psicologoIdRelatorio = psicologoId;
        this.filtroRelatorio = filtro;
    }

    /**
     * Geração de relatório financeiro (PDF ou CSV)
     */
    async gerarRelatorioFinanceiro(): Promise<string> {
        if (!this.psicologoIdRelatorio) throw new Error("psicologoIdRelatorio não definido. Use setRelatorioContext antes.");
        const ganhos = await this.getGanhosMensais(this.psicologoIdRelatorio, this.filtroRelatorio?.ano);
        const sessoes = await this.getHistoricoSessoes(this.psicologoIdRelatorio, this.filtroRelatorio);

        // Retorna como string (exemplo: JSON)
        return JSON.stringify({
            ganhos,
            sessoes,
        });
    }

    /**
     * Retorna as consultas do período (20 do mês anterior até 20 do mês atual) e o total a receber
     * Usado para exibir no modal de solicitação de saque
     * Exemplo: Se estamos em dezembro/2025, busca consultas de 20/11/2025 até 20/12/2025
     * 
     * TABELAS CONSULTADAS:
     * - Consulta: Busca consultas com Status = "Concluido" no período de 20 do mês anterior até 20 do mês atual
     * - Commission: Busca comissões relacionadas às consultas para calcular o valor total
     */
    async getFaturaPeriodo(psicologoId: string): Promise<{
        quantidade: number;
        total: number;
        periodo: string;
        pagamento: string;
        consultas: Array<{
            id: string;
            data: string;
            hora: string;
            paciente: string;
            valor: number;
            valorComissao: number;
        }>;
    }> {
        const now = new Date();
        const ano = now.getFullYear();
        const mes = now.getMonth(); // 0-indexado (0-11)
        
        // Período: 20 do mês anterior até 20 do mês atual
        // Se estamos em dezembro (mes = 11), mês anterior é novembro (mes = 10)
        // Se estamos em janeiro (mes = 0), mês anterior é dezembro do ano anterior
        const mesAnterior = mes === 0 ? 11 : mes - 1;
        const anoAnterior = mes === 0 ? ano - 1 : ano;
        
        // Data de pagamento: sempre dia 05 do mês seguinte ao mês atual
        // Se estamos em dezembro (mes = 11), mês seguinte é janeiro (mes = 0) do ano seguinte
        const mesSeguinte = mes === 11 ? 0 : mes + 1;
        const anoSeguinte = mes === 11 ? ano + 1 : ano;
        
        const mesAnteriorStr = String(mesAnterior + 1).padStart(2, "0"); // 1-12 formatado
        const mesAtualStr = String(mes + 1).padStart(2, "0"); // 1-12 formatado
        const mesSeguinteStr = String(mesSeguinte + 1).padStart(2, "0"); // 1-12 formatado
        
        // Data início: 20 do mês anterior (início do dia, sem hora)
        const dataInicio = new Date(anoAnterior, mesAnterior, 20, 0, 0, 0, 0);
        // Data fim: 20 do mês atual (fim do dia, sem hora)
        const dataFim = new Date(ano, mes, 20, 23, 59, 59, 999);

        console.log(`[getFaturaPeriodo] ===== INICIANDO BUSCA =====`);
        console.log(`[getFaturaPeriodo] Psicólogo ID: ${psicologoId}`);
        console.log(`[getFaturaPeriodo] Data atual: ${now.toISOString()}`);
        console.log(`[getFaturaPeriodo] Mês atual: ${mes + 1}/${ano}`);
        console.log(`[getFaturaPeriodo] Mês anterior: ${mesAnterior + 1}/${anoAnterior}`);
        console.log(`[getFaturaPeriodo] Período calculado: 20/${mesAnteriorStr}/${anoAnterior} até 20/${mesAtualStr}/${ano}`);
        console.log(`[getFaturaPeriodo] Data início: ${dataInicio.toISOString()}`);
        console.log(`[getFaturaPeriodo] Data fim: ${dataFim.toISOString()}`);

        // Primeiro, verificar quantas consultas concluídas existem no total (para debug)
        const totalConsultasConcluidas = await prisma.consulta.count({
            where: {
                PsicologoId: psicologoId,
                Status: "Realizada",
            },
        });
        console.log(`[getFaturaPeriodo] Total de consultas concluídas do psicólogo: ${totalConsultasConcluidas}`);

        // Buscar TODAS as consultas concluídas do psicólogo (sem filtro de data inicial)
        // Depois vamos filtrar comparando apenas a data (sem hora)
        // TABELA: Consulta
        const consultas = await prisma.consulta.findMany({
            where: {
                PsicologoId: psicologoId,
                Status: "Realizada",
            },
            include: {
                // TABELA: Commission - Busca TODAS as comissões relacionadas
                Commission: {
                    select: {
                        Valor: true,
                        CreatedAt: true,
                        Status: true,
                    },
                    orderBy: { CreatedAt: "desc" },
                },
                // Incluir dados do paciente
                Paciente: {
                    select: {
                        Nome: true,
                    },
                },
            },
            orderBy: {
                Date: "asc",
            },
        });

        console.log(`[getFaturaPeriodo] Total de consultas concluídas encontradas: ${consultas.length}`);
        
        // Log das primeiras 10 consultas para debug (mostrar data completa)
        if (consultas.length > 0) {
            console.log(`[getFaturaPeriodo] Primeiras consultas encontradas:`);
            consultas.slice(0, 10).forEach((consulta, index) => {
                const dataConsulta = new Date(consulta.Date);
                const anoConsulta = dataConsulta.getFullYear();
                const mesConsulta = dataConsulta.getMonth(); // 0-indexado
                const diaConsulta = dataConsulta.getDate();
                const comissao = consulta.Commission && consulta.Commission.length > 0 ? consulta.Commission[0] : null;
                console.log(`  ${index + 1}. ID: ${consulta.Id.substring(0, 8)}, Data: ${diaConsulta}/${mesConsulta + 1}/${anoConsulta}, Status: ${consulta.Status}, Comissões: ${consulta.Commission?.length || 0}, Valor: R$ ${comissao?.Valor || 0}`);
            });
        } else {
            console.log(`[getFaturaPeriodo] ⚠️ NENHUMA consulta concluída encontrada para este psicólogo!`);
        }

        // Filtrar consultas que estão realmente no período (comparando apenas a data, sem hora)
        // A data vem no formato "2025-12-06 03:00:00", então precisamos comparar apenas a parte da data
        const consultasFiltradas = consultas.filter((consulta) => {
            const dataConsulta = new Date(consulta.Date);
            // Extrair apenas a data (ano, mês, dia) sem a hora
            const anoConsulta = dataConsulta.getFullYear();
            const mesConsulta = dataConsulta.getMonth(); // 0-indexado
            const diaConsulta = dataConsulta.getDate();
            
            // Verificar se está no período: 20 do mês anterior até 20 do mês atual
            // Exemplo: Se estamos em dezembro/2025, período é 20/11/2025 até 20/12/2025
            // - Consultas de novembro/2025 com dia >= 20
            // - Consultas de dezembro/2025 com dia <= 20
            const estaNoPeriodo = 
                (anoConsulta === anoAnterior && mesConsulta === mesAnterior && diaConsulta >= 20) ||
                (anoConsulta === ano && mesConsulta === mes && diaConsulta <= 20);
            
            if (estaNoPeriodo) {
                const comissao = consulta.Commission && consulta.Commission.length > 0 ? consulta.Commission[0] : null;
                console.log(`[getFaturaPeriodo] ✅ Consulta incluída: ${diaConsulta}/${mesConsulta + 1}/${anoConsulta} - Comissão: R$ ${comissao?.Valor || 0}`);
            } else {
                // Log apenas algumas consultas excluídas para não poluir o console
                if (consultas.indexOf(consulta) < 5) {
                    const comissao = consulta.Commission && consulta.Commission.length > 0 ? consulta.Commission[0] : null;
                    console.log(`[getFaturaPeriodo] ❌ Consulta excluída: ${diaConsulta}/${mesConsulta + 1}/${anoConsulta} (fora do período: esperado ${mesAnterior + 1}/${anoAnterior} dia>=20 OU ${mes + 1}/${ano} dia<=20) - Comissão: R$ ${comissao?.Valor || 0}`);
                }
            }
            
            return estaNoPeriodo;
        });

        console.log(`[getFaturaPeriodo] ===== RESULTADO DO FILTRO =====`);
        console.log(`[getFaturaPeriodo] Total de consultas encontradas: ${consultas.length}`);
        console.log(`[getFaturaPeriodo] Consultas filtradas para o período: ${consultasFiltradas.length}`);
        
        // Se não encontrou consultas, mostrar informações de debug
        if (consultasFiltradas.length === 0 && consultas.length > 0) {
            console.log(`[getFaturaPeriodo] ⚠️ ATENÇÃO: Existem ${consultas.length} consultas concluídas, mas nenhuma está no período 20/${mesAnteriorStr}/${anoAnterior} até 20/${mesAtualStr}/${ano}`);
            console.log(`[getFaturaPeriodo] Verifique se as consultas estão nas datas corretas.`);
        } else if (consultas.length === 0) {
            console.log(`[getFaturaPeriodo] ⚠️ ATENÇÃO: Nenhuma consulta com status "Concluido" encontrada para este psicólogo.`);
        }

        // Calcular total somando as comissões das consultas filtradas
        let total = 0;
        consultasFiltradas.forEach((consulta) => {
            // Pegar a primeira comissão (mais recente) ou usar 0 se não houver
            const comissao = consulta.Commission && consulta.Commission.length > 0 ? consulta.Commission[0] : null;
            const valorComissao = comissao?.Valor || 0;
            const dataConsulta = new Date(consulta.Date);
            const dataFormatada = `${dataConsulta.getDate()}/${dataConsulta.getMonth() + 1}/${dataConsulta.getFullYear()}`;
            const temComissao = consulta.Commission && consulta.Commission.length > 0;
            console.log(`[getFaturaPeriodo] Consulta ${consulta.Id.substring(0, 8)} (${dataFormatada}) - ${temComissao ? `Comissão: R$ ${valorComissao.toFixed(2)}` : 'SEM COMISSÃO'}`);
            total += valorComissao;
        });

        console.log(`[getFaturaPeriodo] Total calculado: R$ ${total.toFixed(2)}`);
        console.log(`[getFaturaPeriodo] Quantidade de consultas: ${consultasFiltradas.length}`);

        // Mapear consultas com detalhes (usar apenas as filtradas)
        const consultasDetalhadas = consultasFiltradas.map((consulta) => {
            const dataHora = new Date(consulta.Date);
            // Extrair apenas a data (sem hora)
            const dataFormatada = dataHora.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const horaFormatada = dataHora.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            // Pegar a primeira comissão (mais recente) ou usar null se não houver
            const comissao = consulta.Commission && consulta.Commission.length > 0 ? consulta.Commission[0] : null;
            const valorComissao = comissao?.Valor || 0;

            return {
                id: consulta.Id.substring(0, 8).toUpperCase(),
                data: dataFormatada,
                hora: horaFormatada,
                paciente: consulta.Paciente?.Nome || "Não informado",
                valor: consulta.Valor || 0,
                valorComissao: valorComissao,
            };
        });

        const resultado = {
            quantidade: consultasFiltradas.length,
            total: parseFloat(total.toFixed(2)),
            periodo: `20/${mesAnteriorStr}/${anoAnterior} até 20/${mesAtualStr}/${ano}`,
            pagamento: `05/${mesSeguinteStr}/${anoSeguinte}`,
            consultas: consultasDetalhadas,
        };

        console.log(`[getFaturaPeriodo] Resultado:`, {
            quantidade: resultado.quantidade,
            total: resultado.total,
            periodo: resultado.periodo,
            consultasCount: resultado.consultas.length
        });

        return resultado;
    }
}


import { IFinanceiroService } from "../../interfaces/psicoologo/iFinanceiro.interface";
import prisma from "../../prisma/client";
import { getRepassePercentForPsychologist } from "../../utils/repasse.util";
import { Prisma, $Enums } from "../../generated/prisma/index";
import { calcularStatusRepassePorDataCorte } from "../../scripts/processarRepassesConsultas";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const BRASILIA_TZ = "America/Sao_Paulo";

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
        try {
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

            // 🎯 Calcula status baseado na data de corte (dia 20) para cada consulta
            // A partir do dia 21, saldo não solicitado fica retido para o próximo mês
            // Importa função e tipos do script, mas usa enums do $Enums para evitar conflito de tipos
            // Importação estática para evitar problemas de resolução no build
            // Função já importada no topo do arquivo

            // Importa CommissionTipoPlano uma vez para usar no loop
            // Usa enum do $Enums para garantir compatibilidade de tipos
            const CommissionTipoPlano = $Enums.CommissionTipoPlano;

            // Processa cada consulta para garantir que tenha comissão criada/atualizada
            for (const consulta of consultas) {
                // Busca o plano ativo do paciente para o período da consulta
                const planoAssinatura = consulta.Paciente?.AssinaturaPlanos?.find(
                    p => p.Status === "Ativo" && (!p.DataFim || new Date(p.DataFim) >= consulta.Date)
                );
                let valorBase: number = 0;
                let tipoPlano: typeof CommissionTipoPlano[keyof typeof CommissionTipoPlano] = CommissionTipoPlano.avulsa;

                if (planoAssinatura && planoAssinatura.PlanoAssinatura) {
                    const tipo = planoAssinatura.PlanoAssinatura.Tipo?.toLowerCase();
                    if (tipo === "mensal") {
                        tipoPlano = CommissionTipoPlano.mensal;
                        valorBase = (planoAssinatura.PlanoAssinatura.Preco ?? 0) / 4;
                    } else if (tipo === "trimestral") {
                        tipoPlano = CommissionTipoPlano.trimestral;
                        valorBase = (planoAssinatura.PlanoAssinatura.Preco ?? 0) / 12;
                    } else if (tipo === "semestral") {
                        tipoPlano = CommissionTipoPlano.semestral;
                        valorBase = (planoAssinatura.PlanoAssinatura.Preco ?? 0) / 24;
                    } else {
                        tipoPlano = CommissionTipoPlano.avulsa;
                        valorBase = consulta.Valor ?? 0;
                    }
                } else {
                    // Não tem plano ativo, trata como consulta avulsa
                    tipoPlano = CommissionTipoPlano.avulsa;
                    valorBase = consulta.Valor ?? 0;
                }

                const valorPsicologo = valorBase * repassePercent;

                // 🎯 Calcula status de repasse baseado na data de corte para esta consulta específica
                const statusRepasseConsulta = calcularStatusRepassePorDataCorte(consulta.Date, psicologo?.Status || 'Inativo');

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
                            Status: statusRepasseConsulta,
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
                            Status: statusRepasseConsulta,
                            Periodo: `${anoConsulta}-${mesConsulta}`,
                            TipoPlano: tipoPlano,
                        },
                    });
                }
            }

            // ✅ OTIMIZAÇÃO: Usa aggregate para somar valores diretamente no banco
            // Busca IDs das consultas no período primeiro para usar no filtro
            const consultasNoPeriodo = await prisma.consulta.findMany({
                where: {
                    PsicologoId: psicologoId,
                    Date: {
                        gte: dataInicio,
                        lte: dataFim
                    }
                },
                select: {
                    Id: true
                }
            });

            const consultaIds = consultasNoPeriodo.map(c => c.Id);

            // Agrega comissões: com ConsultaId no período OU sem ConsultaId mas criadas no período
            const whereClause: any = {
                PsicologoId: psicologoId,
            };

            if (consultaIds.length > 0) {
                // Se há consultas no período, busca comissões com ConsultaId OU sem ConsultaId criadas no período
                whereClause.OR = [
                    {
                        ConsultaId: {
                            in: consultaIds
                        }
                    },
                    {
                        ConsultaId: null,
                        CreatedAt: {
                            gte: dataInicio,
                            lte: dataFim
                        }
                    }
                ];
            } else {
                // Se não há consultas no período, busca apenas comissões sem ConsultaId criadas no período
                whereClause.ConsultaId = null;
                whereClause.CreatedAt = {
                    gte: dataInicio,
                    lte: dataFim
                };
            }

            const totalPagamentoResult = await prisma.commission.aggregate({
                where: whereClause,
                _sum: {
                    Valor: true
                }
            });

            const totalPagamento = totalPagamentoResult._sum.Valor || 0;

            return {
                totalPagamento: parseFloat(totalPagamento.toFixed(2)),
                periodo: periodoReferencia,
            };
        } catch (error: unknown) {
            console.error('[calcularPagamento] Erro ao calcular pagamento:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            const errorStack = error instanceof Error ? error.stack : undefined;
            console.error('[calcularPagamento] Stack trace:', errorStack);
            throw new Error(`Erro ao calcular pagamento: ${errorMessage}`);
        }
    }

    /**
     * Retorna o saldo disponível para resgate (comissões com status "disponivel").
     * Regra do dia 20: valor libera a partir do dia 21. Antes disso, disponível = 0.
     * Lógica acumulativa: se o psicólogo não solicitou resgate, o valor acumula para a próxima janela.
     * Soma TODAS as comissões "disponivel" (todos os períodos 20-a-20 já liberados), não só o último.
     */
    async getSaldoDisponivelResgate(psicologoId: string) {
        const now = new Date();
        const diaAtual = now.getDate();

        if (diaAtual < 21) {
            console.log('[getSaldoDisponivelResgate] Antes do dia 21: disponível = 0 (período 20 a 20 ainda não liberou)');
            return { saldoDisponivel: 0 };
        }

        const result = await prisma.commission.aggregate({
            where: {
                PsicologoId: psicologoId,
                Status: "disponivel",
            },
            _sum: { Valor: true },
        });

        const saldoDisponivel = result._sum.Valor ?? 0;

        return {
            saldoDisponivel: parseFloat(saldoDisponivel.toFixed(2)),
        };
    }

    /**
     * Retorna o saldo retido ("valor do saldo anterior ao dia 20").
     * - Antes do dia 21: período 20/(n-1) a 20/n (o que ainda não liberou; libera após o dia 20).
     * - A partir do dia 21: período 21/n a 20/(n+1) (próximo ciclo; libera após o próximo dia 20).
     */
    async getSaldoRetido(psicologoId: string) {
        const now = new Date();
        const ano = now.getFullYear();
        const mes = now.getMonth(); // 0-11
        const diaAtual = now.getDate();

        let dataInicio: Date;
        let dataFim: Date;
        let statusFiltro: "disponivel" | "retido";

        if (diaAtual < 21) {
            // Antes do dia 21: retido = período 20 a 20 (anterior ao dia 20 que vem) — ainda não liberou
            const mesAnterior = mes === 0 ? 11 : mes - 1;
            const anoAnterior = mes === 0 ? ano - 1 : ano;
            dataInicio = new Date(anoAnterior, mesAnterior, 20, 0, 0, 0, 0);
            dataFim = new Date(ano, mes, 20, 23, 59, 59, 999);
            statusFiltro = "disponivel";
        } else {
            // A partir do dia 21: retido = 21 do mês atual a 20 do próximo (próximo ciclo)
            const mesSeguinte = mes === 11 ? 0 : mes + 1;
            const anoSeguinte = mes === 11 ? ano + 1 : ano;
            dataInicio = new Date(ano, mes, 21, 0, 0, 0, 0);
            dataFim = new Date(anoSeguinte, mesSeguinte, 20, 23, 59, 59, 999);
            statusFiltro = "retido";
        }

        console.log('[getSaldoRetido] Período:', {
            dataInicio: dataInicio.toISOString(),
            dataFim: dataFim.toISOString(),
            antesDoDia21: diaAtual < 21,
        });

        const saldoRetidoResult = await prisma.commission.aggregate({
            where: {
                PsicologoId: psicologoId,
                Status: statusFiltro,
                OR: [
                    {
                        Consulta: {
                            Date: { gte: dataInicio, lte: dataFim },
                        },
                    },
                    {
                        ConsultaId: null,
                        CreatedAt: { gte: dataInicio, lte: dataFim },
                    },
                ],
            },
            _sum: { Valor: true },
        });

        const saldoRetido = saldoRetidoResult._sum.Valor || 0;

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
     * 🎯 Aplica lógica de data de corte (dia 20): A partir do dia 21, saldo não solicitado fica retido
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
            const diaConsulta = dataConsulta.getDate();

            // Se há filtro de mês, pular meses após o mês filtrado
            if (mes !== undefined && mesConsulta > mes) continue;
            if (anoConsulta !== year) continue;

            // Determinar se é "Recebido" ou "A receber" baseado no status da comissão
            // e na lógica de data de corte (dia 20)
            const comissao = consulta.Commission?.[0];
            const statusComissao = comissao?.Status;
            let isRecebido = false;

            if (statusComissao === "pago") {
                isRecebido = true;
            } else if (statusComissao === "disponivel") {
                // 🎯 Lógica de data de corte (dia 20):
                // - A partir do dia 21, consultas do mês atual ficam retidas
                // - Consultas até dia 20 do mês atual estão disponíveis
                if (anoConsulta < anoAtual || (anoConsulta === anoAtual && mesConsulta < mesAtual)) {
                    isRecebido = true; // Já passou, considera recebido
                } else if (anoConsulta === anoAtual && mesConsulta === mesAtual) {
                    // Mês atual: verifica data de corte (dia 20)
                    if (diaAtual >= 21) {
                        // A partir do dia 21, consultas após dia 20 do mês atual ficam retidas
                        if (diaConsulta > 20) {
                            isRecebido = false; // A receber (retida)
                        } else {
                            isRecebido = true; // Recebido (disponível até dia 20)
                        }
                    } else {
                        // Antes do dia 21, consultas até dia 20 estão disponíveis
                        if (diaConsulta <= 20) {
                            isRecebido = true; // Recebido (disponível)
                        } else {
                            isRecebido = false; // A receber (ainda não chegou no período)
                        }
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

        // 🎯 REGRA DE NEGÓCIO: Sempre busca consultas entre dia 20 do mês anterior e dia 20 do mês atual
        // Exemplo: Se o mês selecionado é Novembro (mes=10), busca de 20/Outubro até 20/Novembro
        // Isso garante que o histórico sempre mostra o período correto para faturamento

        // Calcula mês anterior
        let mesAnterior = mes - 1;
        let anoAnterior = ano;
        if (mesAnterior < 0) {
            mesAnterior = 11; // Dezembro
            anoAnterior = ano - 1;
        }

        // Data início: dia 20 do mês anterior às 00:00:00
        const dataInicio = new Date(anoAnterior, mesAnterior, 20, 0, 0, 0, 0);

        // Data fim: dia 20 do mês atual às 23:59:59
        const dataFim = new Date(ano, mes, 20, 23, 59, 59, 999);

        console.log('[getHistoricoSessoes] Período de busca (dia 20 do mês anterior até dia 20 do mês atual):', {
            dataInicio: dataInicio.toISOString(),
            dataFim: dataFim.toISOString(),
            periodo: `20/${String(mesAnterior + 1).padStart(2, '0')}/${anoAnterior} até 20/${String(mes + 1).padStart(2, '0')}/${ano}`,
            mesAnterior: mesAnterior + 1,
            anoAnterior,
            mesAtual: mes + 1,
            anoAtual: ano,
            psicologoId,
            todosStatus: !!(filtro as any)?.todosStatus,
        });

        // 🎯 DEBUG: com todosStatus=1 busca TODAS as sessões do período (todos os status)
        const todosStatus = !!(filtro as any)?.todosStatus;
        const statusRealizada = $Enums.ConsultaStatus.Realizada;
        const statusCancelados: $Enums.ConsultaStatus[] = [
            $Enums.ConsultaStatus.Cancelado,
            $Enums.ConsultaStatus.CanceladaPacienteNoPrazo,
            $Enums.ConsultaStatus.CanceladaPsicologoNoPrazo,
            $Enums.ConsultaStatus.CanceladaPacienteForaDoPrazo,
            $Enums.ConsultaStatus.CanceladaPsicologoForaDoPrazo,
            $Enums.ConsultaStatus.CanceladaForcaMaior,
            $Enums.ConsultaStatus.CanceladaNaoCumprimentoContratualPaciente,
            $Enums.ConsultaStatus.CanceladaNaoCumprimentoContratualPsicologo,
            $Enums.ConsultaStatus.CanceladoAdministrador,
            $Enums.ConsultaStatus.PacienteNaoCompareceu,
            $Enums.ConsultaStatus.PsicologoNaoCompareceu,
            $Enums.ConsultaStatus.PsicologoDescredenciado
        ];

        const whereBase = {
            PsicologoId: psicologoId,
            Date: { gte: dataInicio, lte: dataFim },
        };
        const whereComStatus = todosStatus
            ? whereBase
            : { ...whereBase, Status: { in: [statusRealizada, ...statusCancelados] } };

        if (todosStatus) {
            console.log('[getHistoricoSessoes] DEBUG todosStatus=1: buscando TODAS as sessões do período (todos os status)');
        }

        // Busca total de registros para paginação
        const total = await prisma.consulta.count({
            where: whereComStatus,
        });

        const sessoes = await prisma.consulta.findMany({
            where: whereComStatus,
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

        // Importa funções de status uma vez (evita múltiplos imports)
        let determinarStatusNormalizado: any;
        let determinarRepasse: any;
        try {
            const statusUtils = await import('../../utils/statusConsulta.util');
            determinarStatusNormalizado = statusUtils.determinarStatusNormalizado;
            determinarRepasse = statusUtils.determinarRepasse;
        } catch (error) {
            console.error('[getHistoricoSessoes] Erro ao importar statusConsulta.util:', error);
            throw new Error('Erro ao carregar utilitários de status de consulta');
        }

        // Mapeia ConsultaStatus (banco) -> label exibido no frontend (Histórico)
        const mapStatusSessao = (s: string): string => {
            if (s === $Enums.ConsultaStatus.Realizada) return "Concluído";
            if (statusCancelados.includes(s as any)) return "Cancelada";
            if (s === $Enums.ConsultaStatus.Agendada) return "Agendada";
            if (s === $Enums.ConsultaStatus.EmAndamento) return "Em andamento";
            if (s === $Enums.ConsultaStatus.Reservado) return "Reservada";
            if (s?.startsWith("Reagendada")) return "Reagendada";
            return s || "—";
        };

        // 🎯 Mapeia sessões com verificação de repasse para status de pagamento
        const sessoesPromises = sessoes.map(async (sessao) => {
            try {
                const isCancelada = statusCancelados.includes(sessao.Status);
                const statusSessao = mapStatusSessao(sessao.Status);

                // Busca cancelamento mais recente se houver
                let cancelamentoMaisRecente = null;
                let cancelamentoDeferido = false;
                try {
                    cancelamentoMaisRecente = await prisma.cancelamentoSessao.findFirst({
                        where: { SessaoId: sessao.Id },
                        orderBy: { Data: 'desc' }
                    });
                    cancelamentoDeferido = cancelamentoMaisRecente?.Status === 'Deferido';
                } catch (error) {
                    console.error(`[getHistoricoSessoes] Erro ao buscar cancelamento para sessão ${sessao.Id}:`, error);
                }

                let podeFazerRepasse = false;
                try {
                    const statusNormalizado = await determinarStatusNormalizado(sessao.Status, {
                        tipoAutor: cancelamentoMaisRecente?.Tipo,
                        dataConsulta: sessao.Date,
                        motivo: cancelamentoMaisRecente?.Motivo,
                        cancelamentoDeferido,
                        pacienteNaoCompareceu: sessao.Status === 'PacienteNaoCompareceu',
                        psicologoNaoCompareceu: sessao.Status === 'PsicologoNaoCompareceu'
                    });

                    podeFazerRepasse = determinarRepasse(statusNormalizado, cancelamentoDeferido);
                } catch (error) {
                    console.error(`[getHistoricoSessoes] Erro ao determinar repasse para sessão ${sessao.Id}:`, error);
                    // Se houver erro, assume que não pode fazer repasse para canceladas
                    podeFazerRepasse = false;
                }

                // Determina status de pagamento baseado na commission e se pode fazer repasse
                let statusPagamento = "-";
                const commission = sessao.Commission?.[0];

                if (statusSessao === "Concluído") {
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
                } else if (statusSessao === "Cancelada") {
                    // 🎯 Se cancelada, verifica se pode fazer repasse
                    if (podeFazerRepasse) {
                        // Pode fazer repasse → Status igual a Realizada (Bloqueado)
                        if (commission) {
                            if (commission.Status === "pago") {
                                statusPagamento = "Pago";
                            } else {
                                statusPagamento = "Bloqueado"; // Disponível/retido/pendente = Bloqueado
                            }
                        } else {
                            statusPagamento = "Bloqueado"; // Sem commission ainda
                        }
                    } else {
                        // Não pode fazer repasse → Status específico
                        statusPagamento = "Sem repasse"; // Status específico para cancelamentos sem repasse
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

                // Calcula valor do repasse baseado na commission
                let valorRepasse = 0;
                if (commission && commission.Valor) {
                    valorRepasse = Number(commission.Valor);
                } else if (statusSessao === "Concluído" || (statusSessao === "Cancelada" && podeFazerRepasse)) {
                    // Se não tem commission mas deveria ter repasse, usa o valor da consulta
                    valorRepasse = sessao.Valor || 0;
                }

                return {
                    id: sessao.Id.substring(0, 4).toUpperCase(), // Primeiros 4 caracteres do ID
                    sessaoId: sessao.Id, // ID completo para referência
                    paciente: sessao.Paciente?.Nome || "Não informado",
                    dataHora: `${dataFormatada} - ${horaFormatada}`,
                    valor: valorRepasse, // Valor do repasse (commission ou valor da consulta)
                    statusSessao,
                    statusPagamento,
                };
            } catch (error) {
                console.error(`[getHistoricoSessoes] Erro ao processar sessão ${sessao.Id}:`, error);
                // Determina se é cancelada para o fallback
                const isCancelada = statusCancelados.includes(sessao.Status);
                // Retorna objeto básico em caso de erro
                return {
                    id: sessao.Id.substring(0, 4).toUpperCase(),
                    sessaoId: sessao.Id,
                    paciente: sessao.Paciente?.Nome || "Não informado",
                    dataHora: sessao.Date ? new Date(sessao.Date).toLocaleString('pt-BR') : 'Data não disponível',
                    valor: sessao.Valor || 0,
                    statusSessao: isCancelada ? "Cancelada" : "Concluído",
                    statusPagamento: "-",
                };
            }
        });

        const sessoesMapeadas = await Promise.all(sessoesPromises);

        console.log('[getHistoricoSessoes] Resultado final:', {
            totalSessoes: sessoes.length,
            totalMapeadas: sessoesMapeadas.length,
            totalRegistros: total,
            todosStatus,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            }
        });
        if (todosStatus && sessoes.length > 0) {
            console.log('[getHistoricoSessoes] DEBUG status das sessões:', sessoes.map((s) => ({ id: s.Id.substring(0, 8), status: s.Status })));
        }

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
        // Depois vamos filtrar comparando a data em America/Sao_Paulo (evita UTC vs local)
        const consultas = await prisma.consulta.findMany({
            where: {
                PsicologoId: psicologoId,
                Status: "Realizada",
            },
            include: {
                Commission: {
                    where: { PsicologoId: psicologoId },
                    select: {
                        Valor: true,
                        CreatedAt: true,
                        Status: true,
                    },
                    orderBy: { CreatedAt: "desc" },
                },
                Paciente: {
                    select: { Nome: true },
                },
            },
            orderBy: { Date: "asc" },
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

        // Filtrar consultas no período (20 do mês anterior a 20 do mês atual)
        // Usar America/Sao_Paulo para evitar exclusão por diferença UTC vs local
        const consultasFiltradas = consultas.filter((consulta) => {
            const d = dayjs.tz(consulta.Date, BRASILIA_TZ);
            const anoConsulta = d.year();
            const mesConsulta = d.month(); // 0-11
            const diaConsulta = d.date();

            const estaNoPeriodo =
                (anoConsulta === anoAnterior && mesConsulta === mesAnterior && diaConsulta >= 20) ||
                (anoConsulta === ano && mesConsulta === mes && diaConsulta <= 20);

            if (estaNoPeriodo) {
                const comissao = consulta.Commission && consulta.Commission.length > 0 ? consulta.Commission[0] : null;
                console.log(`[getFaturaPeriodo] ✅ Consulta incluída: ${diaConsulta}/${mesConsulta + 1}/${anoConsulta} - Comissão: R$ ${comissao?.Valor || 0}`);
            } else if (consultas.indexOf(consulta) < 5) {
                const comissao = consulta.Commission && consulta.Commission.length > 0 ? consulta.Commission[0] : null;
                console.log(`[getFaturaPeriodo] ❌ Consulta excluída: ${diaConsulta}/${mesConsulta + 1}/${anoConsulta} (fora do período) - Comissão: R$ ${comissao?.Valor || 0}`);
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
            console.log(`[getFaturaPeriodo] ⚠️ ATENÇÃO: Nenhuma consulta com status "Realizada" encontrada para este psicólogo.`);
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

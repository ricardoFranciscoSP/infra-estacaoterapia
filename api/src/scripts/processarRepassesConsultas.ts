/**
 * Script para processar e calcular repasses de todas as consultas realizadas
 * Preenche dados de repasse nas tabelas Commission e Consulta
 * 
 * Uso: npx ts-node src/scripts/processarRepassesConsultas.ts
 */

import prisma from '../prisma/client';
import { getRepassePercentForPsychologist } from '../utils/repasse.util';
import { determinarStatusNormalizado, determinarRepasse } from '../utils/statusConsulta.util';
import { CommissionTipoPlano, CommissionStatus } from '../generated/prisma';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const BRASILIA_TIMEZONE = 'America/Sao_Paulo';

/**
 * Calcula o status de repasse baseado na data de corte (dia 20)
 * A partir do dia 21, saldo não solicitado fica retido para o próximo mês
 * Período de corte: dia 20 do mês anterior até dia 20 do mês atual
 */
export function calcularStatusRepassePorDataCorte(dataConsulta: Date, psicologoStatus: string): CommissionStatus {
    const agoraBr = dayjs().tz(BRASILIA_TIMEZONE);
    const dataConsultaBr = dayjs.tz(dataConsulta, BRASILIA_TIMEZONE);
    const diaAtual = agoraBr.date();
    const mesAtual = agoraBr.month() + 1;
    const anoAtual = agoraBr.year();
    
    // Se psicólogo não está ativo, sempre retido
    if (psicologoStatus !== 'Ativo') {
        return CommissionStatus.retido;
    }
    
    const mesConsulta = dataConsultaBr.month() + 1;
    const anoConsulta = dataConsultaBr.year();
    const diaConsulta = dataConsultaBr.date();
    
    // 🎯 Lógica de data de corte (dia 20):
    // - Período disponível: dia 20 do mês anterior até dia 20 do mês atual
    // - A partir do dia 21, consultas do mês atual ficam retidas para o próximo mês
    
    // Calcula período de corte
    const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
    const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;
    
    const dataInicioCorte = dayjs.tz(`${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-20 00:00:00`, 'YYYY-MM-DD HH:mm:ss', BRASILIA_TIMEZONE);
    const dataFimCorte = dayjs.tz(`${anoAtual}-${String(mesAtual).padStart(2, '0')}-20 23:59:59`, 'YYYY-MM-DD HH:mm:ss', BRASILIA_TIMEZONE);
    
    // Se estamos após o dia 20 (dia 21+)
    if (diaAtual >= 21) {
        // Consultas do mês atual após dia 20 ficam retidas
        if (anoConsulta === anoAtual && mesConsulta === mesAtual && diaConsulta > 20) {
            return CommissionStatus.retido;
        }
        // Consultas de meses futuros ficam retidas
        if (anoConsulta > anoAtual || (anoConsulta === anoAtual && mesConsulta > mesAtual)) {
            return CommissionStatus.retido;
        }
        // Consultas dentro do período de corte (até dia 20 do mês atual) ficam disponíveis
        if (dataConsultaBr.isAfter(dataInicioCorte) && dataConsultaBr.isBefore(dataFimCorte) || dataConsultaBr.isSame(dataFimCorte, 'day')) {
            return CommissionStatus.disponivel;
        }
        // Consultas antes do período de corte já foram processadas - disponíveis
        return CommissionStatus.disponivel;
    } else {
        // Antes do dia 21, verifica se está no período de corte
        if (dataConsultaBr.isAfter(dataInicioCorte) && (dataConsultaBr.isBefore(dataFimCorte) || dataConsultaBr.isSame(dataFimCorte, 'day'))) {
            // Dentro do período de corte - disponível
            return CommissionStatus.disponivel;
        } else if (dataConsultaBr.isAfter(dataFimCorte)) {
            // Após o período de corte - retida
            return CommissionStatus.retido;
        } else {
            // Antes do período de corte - já foi processada, disponível
            return CommissionStatus.disponivel;
        }
    }
}

/**
 * Processa repasse para uma consulta
 */
async function processarRepasseConsulta(consulta: any) {
    try {
        // Verifica se deve fazer repasse baseado no status
        const cancelamentoMaisRecente = consulta.Cancelamentos?.[0];
        const cancelamentoDeferido = cancelamentoMaisRecente?.Status === 'Deferido';

        const statusNormalizado = await determinarStatusNormalizado(consulta.Status, {
            tipoAutor: cancelamentoMaisRecente?.Tipo,
            dataConsulta: consulta.Date,
            motivo: cancelamentoMaisRecente?.Motivo,
            cancelamentoDeferido,
            pacienteNaoCompareceu: consulta.Status === 'PacienteNaoCompareceu' || (consulta.Status === 'Cancelado' && cancelamentoMaisRecente?.Tipo === 'Paciente'),
            psicologoNaoCompareceu: consulta.Status === 'PsicologoNaoCompareceu' || (consulta.Status === 'Cancelado' && cancelamentoMaisRecente?.Tipo === 'Psychologist')
        });

        const deveFazerRepasse = determinarRepasse(statusNormalizado, cancelamentoDeferido);

        if (!deveFazerRepasse) {
            console.log(`  ⏭️  Consulta ${consulta.Id.substring(0, 8)}: Status ${statusNormalizado} não requer repasse`);
            return;
        }

        // Calcula o valor base da consulta
        let valorBase = consulta.Valor ?? 0;
        let tipoPlano: CommissionTipoPlano = CommissionTipoPlano.avulsa;

        // Se o paciente tem plano ativo, calcula o valor base conforme o tipo de plano
        const planoAssinatura = consulta.Paciente?.AssinaturaPlanos?.find(
            (p: any) => p.Status === "Ativo" && (!p.DataFim || new Date(p.DataFim) >= consulta.Date)
        );

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
        }

        // Se não tem valor base, tenta buscar do PlanoAssinatura (consulta avulsa/promocional)
        if (valorBase === 0) {
            // Busca plano avulsa ou única para obter o valor
            const planoAvulsa = await prisma.planoAssinatura.findFirst({
                where: {
                    Tipo: { in: ["Avulsa", "Unica"] },
                    Status: "Ativo"
                },
                orderBy: { Preco: 'desc' } // Pega o mais caro primeiro (189.99)
            });
            
            if (planoAvulsa && planoAvulsa.Preco) {
                valorBase = planoAvulsa.Preco;
                console.log(`  💰 Consulta ${consulta.Id.substring(0, 8)}: Usando valor do plano avulsa: R$ ${valorBase.toFixed(2)}`);
            }
        }

        if (valorBase === 0) {
            console.warn(`  ⚠️  Consulta ${consulta.Id.substring(0, 8)}: Valor base é 0, pulando...`);
            return;
        }

        // Obtém o percentual de repasse (40% para PJ, 32% para autônomo)
        const repassePercent = await getRepassePercentForPsychologist(consulta.PsicologoId);
        const valorPsicologo = valorBase * repassePercent;

        // Busca psicólogo para verificar status
        const psicologo = await prisma.user.findUnique({
            where: { Id: consulta.PsicologoId || '' }
        });

        // Calcula status baseado na data de corte
        const statusRepasse = calcularStatusRepassePorDataCorte(consulta.Date, psicologo?.Status || 'Inativo');

        // Calcula período (ano-mês da consulta)
        const dataConsultaBr = dayjs.tz(consulta.Date, BRASILIA_TIMEZONE);
        const ano = dataConsultaBr.year();
        const mes = dataConsultaBr.month() + 1;
        const periodo = `${ano}-${mes}`;

        // Verifica se já existe comissão
        const comissaoExistente = await prisma.commission.findFirst({
            where: { ConsultaId: consulta.Id }
        });

        if (comissaoExistente) {
            // Atualiza comissão existente
            await prisma.commission.update({
                where: { Id: comissaoExistente.Id },
                data: {
                    Valor: valorPsicologo,
                    Status: statusRepasse,
                    Periodo: periodo,
                    TipoPlano: tipoPlano,
                    Type: "repasse"
                }
            });
            console.log(`  ✅ Consulta ${consulta.Id.substring(0, 8)}: Comissão atualizada - R$ ${valorPsicologo.toFixed(2)} (${(repassePercent * 100).toFixed(0)}%) - Status: ${statusRepasse}`);
        } else {
            // Cria nova comissão
            await prisma.commission.create({
                data: {
                    ConsultaId: consulta.Id,
                    PsicologoId: consulta.PsicologoId || '',
                    PacienteId: consulta.PacienteId || null,
                    Valor: valorPsicologo,
                    Status: statusRepasse,
                    Periodo: periodo,
                    TipoPlano: tipoPlano,
                    Type: "repasse"
                }
            });
            console.log(`  ✅ Consulta ${consulta.Id.substring(0, 8)}: Comissão criada - R$ ${valorPsicologo.toFixed(2)} (${(repassePercent * 100).toFixed(0)}%) - Status: ${statusRepasse}`);
        }

        // Atualiza campo Faturada na Consulta
        await prisma.consulta.update({
            where: { Id: consulta.Id },
            data: { Faturada: true }
        });

    } catch (error) {
        console.error(`  ❌ Erro ao processar consulta ${consulta.Id.substring(0, 8)}:`, error);
    }
}

/**
 * Processa todas as consultas realizadas
 */
async function processarTodasConsultas() {
    console.log('🚀 Iniciando processamento de repasses para todas as consultas realizadas...\n');

    try {
        // Busca todas as consultas realizadas
        const consultas = await prisma.consulta.findMany({
            where: {
                Status: 'Realizada',
                PsicologoId: { not: null }
            },
            include: {
                Paciente: {
                    include: {
                        AssinaturaPlanos: {
                            where: { Status: 'Ativo' },
                            include: {
                                PlanoAssinatura: true
                            }
                        }
                    }
                },
                Cancelamentos: {
                    orderBy: { Data: 'desc' },
                    take: 1
                }
            },
            orderBy: {
                Date: 'desc'
            }
        });

        console.log(`📊 Encontradas ${consultas.length} consultas realizadas\n`);

        let processadas = 0;
        let atualizadas = 0;
        let criadas = 0;
        let puladas = 0;

        for (const consulta of consultas) {
            const comissaoExistente = await prisma.commission.findFirst({
                where: { ConsultaId: consulta.Id }
            });

            const antes = comissaoExistente ? 'atualizada' : 'criada';
            await processarRepasseConsulta(consulta);
            const depois = await prisma.commission.findFirst({
                where: { ConsultaId: consulta.Id }
            });

            if (depois) {
                if (comissaoExistente) {
                    atualizadas++;
                } else {
                    criadas++;
                }
                processadas++;
            } else {
                puladas++;
            }
        }

        console.log(`\n📈 Resumo do processamento:`);
        console.log(`  ✅ Processadas: ${processadas}`);
        console.log(`  ➕ Criadas: ${criadas}`);
        console.log(`  🔄 Atualizadas: ${atualizadas}`);
        console.log(`  ⏭️  Puladas: ${puladas}`);
        console.log(`\n✨ Processamento concluído!`);

    } catch (error) {
        console.error('❌ Erro ao processar consultas:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Executa o script apenas se chamado diretamente (não quando importado)
if (require.main === module) {
    processarTodasConsultas()
        .then(() => {
            console.log('\n✅ Script executado com sucesso!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Erro ao executar script:', error);
            process.exit(1);
        });
}

// Exporta funções para uso em outros módulos (calcularStatusRepassePorDataCorte já exportada inline)
export { processarRepasseConsulta, processarTodasConsultas };

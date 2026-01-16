import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { IAgendaRepository } from '../repositories/IAgendaRepository';
import { IUserRepository } from '../repositories/IUserRepository';
import { IGerarAgendaService } from '../interfaces/gerarAgenda.interface';
import { Request, Response } from 'express';
import { STATUS } from '../constants/status.constants';
import { sendEmail } from './send.email.service';

dayjs.extend(utc);
dayjs.extend(timezone);

export class GerarAgendaService implements IGerarAgendaService {
    private agendaRepository: IAgendaRepository;
    private userRepository: IUserRepository;

    constructor(agendaRepository: IAgendaRepository, userRepository: IUserRepository) {
        this.agendaRepository = agendaRepository;
        this.userRepository = userRepository;
    }

    async generateAgendas() {
        const psicologos = await this.userRepository.findActivePsychologists();
        const psicologosAtivos = psicologos.filter(p => p.Status === 'Ativo');
        if (!psicologosAtivos.length) {
            return { error: 'Nenhum psicólogo ativo encontrado.', resultados: [] };
        }

        const hojeBr = dayjs().tz('America/Sao_Paulo').startOf('day');

        // Gera horários de 06:00 até 23:00, incluindo explicitamente 23:00
        const horariosPorDia = Array.from({ length: 18 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`);
        if (!horariosPorDia.includes('23:00')) {
            horariosPorDia.push('23:00');
        }

        // Calcula data final: 60 dias a partir de hoje
        const dataFinal = hojeBr.add(59, 'day'); // 60 dias incluindo hoje

        const resultados: Array<{ psicologoId: string; criados?: number; error?: string }> = [];

        // Concurrency control
        const CONCURRENCY = 5;
        const chunkArray = (arr: any[], size: number) => {
            const chunks = [];
            for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
            return chunks;
        };

        const chunks = chunkArray(psicologosAtivos, CONCURRENCY);

        for (const chunk of chunks) {
            // processa cada chunk em paralelo, mas aguarda intervalo entre chunks
            const promises = chunk.map(async (psicologo, idx) => {
                try {
                    // Adiciona delay entre cada job do chunk
                    if (idx > 0) {
                        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms entre jobs
                    }
                    // ...existing code...
                    let dataInicial = hojeBr;
                    if (psicologo.DataAprovacao) {
                        const dataAprovacao = dayjs(psicologo.DataAprovacao).tz('America/Sao_Paulo').startOf('day');
                        if (dataAprovacao.isAfter(hojeBr)) {
                            dataInicial = dataAprovacao;
                        }
                    }

                    console.log(`Gerando agenda para psicólogo: ${psicologo.Id} - ${psicologo.Nome}`);

                    // Busca a última data com agenda gerada para este psicólogo
                    const ultimaAgenda = await this.agendaRepository.findMany({
                        where: {
                            PsicologoId: psicologo.Id,
                            Data: { gte: dataInicial.toDate() }
                        },
                        orderBy: { Data: 'desc' },
                        take: 1
                    });

                    let dataInicioGeracao = dataInicial;
                    if (ultimaAgenda && ultimaAgenda.length > 0) {
                        const ultimaDataAgenda = dayjs(ultimaAgenda[0].Data).tz('America/Sao_Paulo').startOf('day');
                        if (ultimaDataAgenda.isBefore(dataFinal)) {
                            dataInicioGeracao = ultimaDataAgenda.add(1, 'day');
                        } else {
                            console.log(`[GerarAgendaService] ⚠️ Psicólogo ${psicologo.Id} já tem agenda até ${ultimaDataAgenda.format('YYYY-MM-DD')}`);
                            resultados.push({ psicologoId: psicologo.Id, criados: 0 });
                            return;
                        }
                    }

                    const startDateBr = dataInicioGeracao.startOf('day');
                    const endDateBr = dataFinal.endOf('day');

                    const existentes = await this.agendaRepository.findMany({
                        where: {
                            AND: [
                                { PsicologoId: psicologo.Id },
                                { Data: { gte: startDateBr.toDate(), lte: endDateBr.toDate() } }
                            ]
                        }
                    });

                    const existenteSet = new Set<string>();
                    for (const ag of existentes || []) {
                        const dataBr = dayjs(ag.Data).tz('America/Sao_Paulo').startOf('day').format('YYYY-MM-DD');
                        const horario = ag.Horario || '00:00';
                        existenteSet.add(`${dataBr}|${horario}`);
                    }

                    const nowBr = dayjs().tz('America/Sao_Paulo');
                    const agendasParaCriar = (await this._gerarAgendasParaPeriodo(
                        psicologo.Id,
                        dataInicioGeracao,
                        dataFinal,
                        horariosPorDia,
                        existenteSet
                    )).filter(agenda => {
                        const agendaDataHora = dayjs(agenda.Data).tz('America/Sao_Paulo').hour(Number(agenda.Horario.split(':')[0]));
                        return agendaDataHora.isAfter(nowBr) || agendaDataHora.isSame(nowBr);
                    });

                    if (agendasParaCriar.length) {
                        console.log(`[GerarAgendaService] 📝 Criando ${agendasParaCriar.length} agendas para psicólogo ${psicologo.Id}...`);
                        const criados = await this.agendaRepository.createMany(agendasParaCriar);
                        const count = typeof criados === 'number' ? criados : (criados as { count?: number })?.count ?? agendasParaCriar.length;
                        console.log(`[GerarAgendaService] ✅ ${count} agendas criadas para psicólogo ${psicologo.Id}`);
                        resultados.push({ psicologoId: psicologo.Id, criados: count });
                    } else {
                        console.log(`[GerarAgendaService] ⚠️ Nenhuma agenda para criar para psicólogo ${psicologo.Id}`);
                        resultados.push({ psicologoId: psicologo.Id, criados: 0 });
                    }
                } catch (error) {
                    console.error(`Erro ao gerar agenda para psicólogo ${psicologo.Id}:`, error);
                    resultados.push({ psicologoId: psicologo.Id, error: 'Falha ao gerar agenda' });
                }
            });

            await Promise.all(promises);
            // Adiciona delay entre chunks para evitar sobrecarga
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1s entre chunks
        }

        // Envia e-mail de notificação após geração
        try {
            const totalCriados = resultados.reduce((acc, r) => acc + (r.criados || 0), 0);
            console.log(`[GerarAgendaService] 📧 Enviando email de notificação. Total criado: ${totalCriados}`);
            await sendEmail({
                to: 'ri22sp@gmail.com',
                subject: 'Geração de agendas concluída',
                text: `A geração automática de agendas foi concluída com sucesso. Total de agendas criadas: ${totalCriados}.`,
            });
            console.log(`[GerarAgendaService] ✅ Email de notificação enviado com sucesso`);
        } catch (err) {
            console.error('[GerarAgendaService] ❌ Falha ao enviar e-mail de notificação:', err);
        }

        const totalCriados = resultados.reduce((acc, r) => acc + (r.criados || 0), 0);
        console.log(`[GerarAgendaService] 🎉 Geração de agendas FINALIZADA. Total: ${totalCriados} agendas criadas para ${resultados.length} psicólogos`);

        const result = {
            message: 'Agendas dos próximos 60 dias foram geradas automaticamente.',
            resultados,
        };

        console.log(`[GerarAgendaService] ✅ Retornando resultado do generateAgendas()`);
        return result;
    }

    /**
     * Gera agendas para um período específico (suporta múltiplos meses)
     * @param PsicologoId ID do psicólogo
     * @param dataInicial Data inicial (dayjs)
     * @param dataFinal Data final (dayjs)
     * @param horariosPorDia Array de horários
     * @param existenteSet Set com chaves "YYYY-MM-DD|HH:mm" das agendas já existentes
     */
    private async _gerarAgendasParaPeriodo(
        PsicologoId: string,
        dataInicial: ReturnType<typeof dayjs>,
        dataFinal: ReturnType<typeof dayjs>,
        horariosPorDia: string[],
        existenteSet: Set<string> = new Set()
    ) {
        const agendasParaCriar = [];
        const nowBr = dayjs().tz('America/Sao_Paulo');

        // Itera dia a dia desde a data inicial até a data final
        let dataAtual = dataInicial.startOf('day');

        while (dataAtual.isBefore(dataFinal) || dataAtual.isSame(dataFinal, 'day')) {
            const dataDate = dataAtual.utc().toDate();
            const dataKey = dataAtual.format('YYYY-MM-DD');

            for (const horario of horariosPorDia) {
                const horaNum = Number(horario.split(':')[0]);
                const dataHoraBrasilia = dataAtual.add(horaNum, 'hour');
                if (dataHoraBrasilia.isBefore(nowBr)) continue;

                // Verifica existência em memória (evita chamada ao DB por horário)
                const chave = `${dataKey}|${horario}`;
                if (existenteSet.has(chave)) continue;

                agendasParaCriar.push({
                    Data: dataDate,
                    Horario: horario,
                    DiaDaSemana: dataAtual.format('dddd'),
                    Status: 'Bloqueado',
                    PsicologoId: PsicologoId,
                    PacienteId: null,
                });
            }

            // Avança para o próximo dia
            dataAtual = dataAtual.add(1, 'day');
        }

        return agendasParaCriar;
    }

    async gerarAutomatica(req: Request, res: Response): Promise<any> {
        // Implemente a lógica real aqui, exemplo:
        const result = await this.generateAgendas();
        return result;
    }

    async gerarManual(req: Request, res: Response): Promise<any> {
        // Implemente a lógica real aqui, exemplo:
        const result = await this.generateAgendas();
        return { resultados: result.resultados };
    }

    async deletarAgendasAnteriores(req: Request, res: Response): Promise<any> {
        // Calcule o início do mês atual
        const inicioMesAtual = dayjs().tz('America/Sao_Paulo').startOf('month');
        try {
            const deleted = await this.agendaRepository.deleteMany({
                where: {
                    Data: { lt: inicioMesAtual.toDate() },
                    Status: STATUS.BLOQUEADO
                }
            });
            return { message: 'Agendas anteriores ao mês atual deletadas com sucesso.', deleted };
        } catch (error) {
            console.error('Erro ao deletar agendas anteriores ao mês atual:', error);
            return { error: 'Falha ao deletar agendas anteriores ao mês atual.' };
        }
    }

    /**
     * Gera agenda para um psicólogo específico
     * @param psicologoId ID do psicólogo
     * @returns Resultado da geração de agenda
     */
    async generateAgendaForPsychologist(psicologoId: string): Promise<{ criados?: number; error?: string }> {
        try {
            // Busca o psicólogo
            const psicologo = await this.userRepository.findById(psicologoId);

            if (!psicologo) {
                return { error: 'Psicólogo não encontrado.' };
            }

            if (psicologo.Status !== 'Ativo') {
                return { error: 'Psicólogo não está ativo.' };
            }

            const hojeBr = dayjs().tz('America/Sao_Paulo').startOf('day');

            // Gera horários de 06:00 até 23:00, incluindo explicitamente 23:00
            const horariosPorDia = Array.from({ length: 18 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`);
            if (!horariosPorDia.includes('23:00')) {
                horariosPorDia.push('23:00');
            }

            // Calcula data final: 60 dias a partir de hoje
            const dataFinal = hojeBr.add(59, 'day'); // 60 dias incluindo hoje

            // Determina data inicial: hoje ou data de aprovação se for posterior
            let dataInicial = hojeBr;
            if (psicologo.DataAprovacao) {
                const dataAprovacao = dayjs(psicologo.DataAprovacao).tz('America/Sao_Paulo').startOf('day');
                if (dataAprovacao.isAfter(hojeBr)) {
                    dataInicial = dataAprovacao;
                }
            }

            console.log(`[GerarAgendaService] Gerando agenda para psicólogo: ${psicologo.Id} - ${psicologo.Nome}`);

            // Busca a última data com agenda gerada para este psicólogo
            const ultimaAgenda = await this.agendaRepository.findMany({
                where: {
                    PsicologoId: psicologo.Id,
                    Data: { gte: dataInicial.toDate() }
                },
                orderBy: { Data: 'desc' },
                take: 1
            });

            // Se já existe agenda futura, verifica até quando está gerada
            let dataInicioGeracao = dataInicial;
            if (ultimaAgenda && ultimaAgenda.length > 0) {
                const ultimaDataAgenda = dayjs(ultimaAgenda[0].Data).tz('America/Sao_Paulo').startOf('day');
                // Se a última agenda está a menos de 60 dias, gera a partir do dia seguinte
                if (ultimaDataAgenda.isBefore(dataFinal)) {
                    dataInicioGeracao = ultimaDataAgenda.add(1, 'day');
                } else {
                    // Já tem 60 dias gerados
                    console.log(`[GerarAgendaService] ⚠️ Psicólogo ${psicologo.Id} já tem agenda até ${ultimaDataAgenda.format('YYYY-MM-DD')}`);
                    return { criados: 0 };
                }
            }

            // Calcula intervalo de datas para buscar agendas existentes (em Brasília)
            const startDateBr = dataInicioGeracao.startOf('day');
            const endDateBr = dataFinal.endOf('day');

            // Busca todas as agendas existentes deste psicólogo no intervalo
            const existentes = await this.agendaRepository.findMany({
                where: {
                    AND: [
                        { PsicologoId: psicologo.Id },
                        { Data: { gte: startDateBr.toDate(), lte: endDateBr.toDate() } }
                    ]
                }
            });

            // Cria um Set de chaves "YYYY-MM-DD|HH:mm" para lookup rápido
            const existenteSet = new Set<string>();
            for (const ag of existentes || []) {
                // Normaliza Data (em fuso de Brasília) e Horario
                const dataBr = dayjs(ag.Data).tz('America/Sao_Paulo').startOf('day').format('YYYY-MM-DD');
                const horario = ag.Horario || '00:00';
                existenteSet.add(`${dataBr}|${horario}`);
            }

            // Garante que nunca será criada agenda retroativa
            const nowBr = dayjs().tz('America/Sao_Paulo');
            const agendasParaCriar = (await this._gerarAgendasParaPeriodo(
                psicologo.Id,
                dataInicioGeracao,
                dataFinal,
                horariosPorDia,
                existenteSet
            )).filter(agenda => {
                // agenda.Data é Date, converte para dayjs e compara com agora
                const agendaDataHora = dayjs(agenda.Data).tz('America/Sao_Paulo').hour(Number(agenda.Horario.split(':')[0]));
                return agendaDataHora.isAfter(nowBr) || agendaDataHora.isSame(nowBr);
            });

            if (agendasParaCriar.length) {
                console.log(`[GerarAgendaService] 📝 Criando ${agendasParaCriar.length} agendas para psicólogo ${psicologo.Id}...`);
                const criados = await this.agendaRepository.createMany(agendasParaCriar);
                // Prisma createMany retorna { count: number }
                const count = typeof criados === 'number' ? criados : (criados as { count?: number })?.count ?? agendasParaCriar.length;
                console.log(`[GerarAgendaService] ✅ ${count} agendas criadas para psicólogo ${psicologo.Id}`);
                return { criados: count };
            } else {
                console.log(`[GerarAgendaService] ⚠️ Nenhuma agenda para criar para psicólogo ${psicologo.Id}`);
                return { criados: 0 };
            }
        } catch (error) {
            console.error(`[GerarAgendaService] Erro ao gerar agenda para psicólogo ${psicologoId}:`, error);
            return { error: 'Falha ao gerar agenda' };
        }
    }
}


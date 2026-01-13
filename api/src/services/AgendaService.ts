import { prismaUserRepository } from '../repositories/prismaUser.repository';
import { IAgendaService } from '../interfaces/IAgenda.interface';
import { prismaAgendaRepository } from '../repositories/prismaAgenda.repository';
import { Agenda } from '../generated/prisma/client';
import prisma from '../prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export class AgendaService implements IAgendaService {
    async listarHorariosDisponiveisPorPeriodoTodosPsicologos(data: string, periodo: 'manha' | 'tarde' | 'noite') {
        let start: string, end: string;
        switch (periodo) {
            case 'manha':
                start = '06:00'; end = '12:00'; break;
            case 'tarde':
                start = '12:01'; end = '18:00'; break;
            case 'noite':
                start = '18:01'; end = '23:00'; break;
            default:
                throw new Error('Período inválido');
        }
        const startDate = new Date(data + 'T00:00:00.000Z');
        const endDate = new Date(data + 'T23:59:59.999Z');
        const psicologos = await prismaUserRepository.findActivePsychologists();
        console.log('[Service] Psicólogos encontrados:', psicologos.length);
        const result = await Promise.all(psicologos.map(async (psicologo: any) => {
            const agendas = await prismaAgendaRepository.findMany({
                where: {
                    PsicologoId: psicologo.Id,
                    Data: {
                        gte: startDate,
                        lte: endDate
                    },
                    Horario: {
                        gte: start,
                        lte: end
                    },
                    Status: 'Disponivel'
                }
            });
            // Busca o primeiro perfil profissional do psicólogo
            const professionalProfile = psicologo.ProfessionalProfiles?.[0];
            return {
                psicologo: {
                    id: psicologo.Id,
                    nome: psicologo.Nome,
                    areasAtuacao: professionalProfile?.AreasAtuacao || null,
                },
                horarios: agendas.map(a => ({ id: a.Id, horario: a.Horario, status: a.Status }))
            };
        }));
        return result;
    }
    async listarHorariosDisponiveisPorPeriodo(data: string, periodo: 'manha' | 'tarde' | 'noite') {
        let start: string, end: string;
        switch (periodo) {
            case 'manha':
                start = '06:00'; end = '12:00'; break;
            case 'tarde':
                start = '12:01'; end = '18:00'; break;
            case 'noite':
                start = '18:01'; end = '23:00'; break;
            default:
                throw new Error('Período inválido');
        }
        const startDate = new Date(data + 'T00:00:00.000Z');
        const endDate = new Date(data + 'T23:59:59.999Z');
        const psicologos = await prismaUserRepository.findActivePsychologists();
        console.log('[Service] Psicólogos encontrados:', psicologos.length);
        const result = await Promise.all(psicologos.map(async (psicologo: any) => {
            const agendas = await prismaAgendaRepository.findMany({
                where: {
                    PsicologoId: psicologo.Id,
                    Data: {
                        gte: startDate,
                        lte: endDate
                    },
                    Horario: {
                        gte: start,
                        lte: end
                    },
                    Status: 'Disponivel'
                }
            });
            const professionalProfile = psicologo.ProfessionalProfiles?.[0];
            return {
                psicologo: {
                    id: psicologo.Id,
                    nome: psicologo.Nome,
                    email: psicologo.Email,
                    areasAtuacao: professionalProfile?.AreasAtuacao || null,
                    // Adicione outros campos necessários
                },
                horarios: agendas.map(a => ({ id: a.Id, horario: a.Horario, status: a.Status, psicologoId: a.PsicologoId }))
            };
        }));
        return result;
    }
    async listarAgendasPorDataHorario(data: string, horario: string): Promise<any[]> {
        // Busca por data ignorando hora, apenas de psicólogos ativos
        const startDate = new Date(data + 'T00:00:00.000Z');
        const endDate = new Date(data + 'T23:59:59.999Z');
        const agendas = await prismaAgendaRepository.findMany({
            where: {
                Data: {
                    gte: startDate,
                    lte: endDate
                },
                Horario: horario,
                Status: 'Disponivel',
                Psicologo: {
                    Status: 'Ativo'
                }
            }
        });
        // Retorna apenas os campos essenciais para o frontend
        return agendas.map(a => ({ id: a.Id, horario: a.Horario, status: a.Status, psicologoId: a.PsicologoId }));
    }

    async listarHorariosDisponiveisPorPeriodoPsicologo(psicologoId: string, data: string, periodo: 'manha' | 'tarde' | 'noite'): Promise<Array<{ id: string, horario: string, status: string, psicologoId: string }>> {
        let start: string, end: string;
        switch (periodo) {
            case 'manha':
                start = '06:00'; end = '12:00'; break;
            case 'tarde':
                start = '12:01'; end = '18:00'; break;
            case 'noite':
                start = '18:01'; end = '23:00'; break;
            default:
                throw new Error('Período inválido');
        }
        // Busca agendas do psicólogo na data e período selecionado, status Disponivel
        const startDate = new Date(data + 'T00:00:00.000Z');
        const endDate = new Date(data + 'T23:59:59.999Z');
        const agendas = await prismaAgendaRepository.findMany({
            where: {
                PsicologoId: psicologoId,
                Data: {
                    gte: startDate,
                    lte: endDate
                },
                Horario: {
                    gte: start,
                    lte: end
                },
                Status: 'Disponivel'
            }
        });
        // Buscar dados do psicólogo para incluir areasAtuacao diretamente via Prisma, apenas se estiver ativo
        const psicologo = await prisma.user.findUnique({
            where: { Id: psicologoId, Status: 'Ativo' },
            include: { ProfessionalProfiles: true }
        });
        if (!psicologo) {
            return [];
        }
        const professionalProfile = psicologo?.ProfessionalProfiles?.[0];
        return agendas.map(a => ({
            id: a.Id,
            horario: a.Horario,
            status: a.Status,
            psicologoId: a.PsicologoId,
            areasAtuacao: professionalProfile?.AreasAtuacao || null
        }));
    }
    async listarHorariosDisponiveisPorDataPsicologo(psicologoId: string, data: string): Promise<Array<{ id: string, horario: string, status: string }>> {
        // Busca agendas já filtradas por Status = 'Disponivel' e data
        const agendas = await this.listarAgendasPorDataPsicologo(psicologoId, data);
        console.log(`[AgendaService] Total de agendas encontradas para psicologo ${psicologoId} na data ${data}:`, agendas.length);
        
        // Garante que apenas agendas com Status = 'Disponivel' sejam retornadas
        const agendasDisponiveis = agendas.filter(a => {
            const isDisponivel = a.Status === 'Disponivel';
            if (!isDisponivel) {
                console.log(`[AgendaService] Agenda filtrada (Status: ${a.Status}):`, { id: a.Id, horario: a.Horario, status: a.Status });
            }
            return isDisponivel;
        });
        
        console.log(`[AgendaService] Agendas disponíveis após filtro:`, agendasDisponiveis.length);
        
        return agendasDisponiveis.map(a => ({ 
            id: a.Id, 
            horario: a.Horario, 
            status: a.Status, 
            psicologoId: a.PsicologoId 
        }));
    }
    async listarTodasAgendas(): Promise<Agenda[]> {
        return prismaAgendaRepository.findMany({
            where: {
                Psicologo: {
                    Status: 'Ativo'
                }
            }
        });
    }

    async listarAgendasPorPsicologo(psicologoId: string): Promise<Agenda[]> {
        // Verifica se o psicólogo está ativo antes de retornar as agendas
        const psicologo = await prisma.user.findUnique({
            where: { Id: psicologoId },
            select: { Id: true, Status: true }
        });
        if (!psicologo || psicologo.Status !== 'Ativo') return [];
        return prismaAgendaRepository.findMany({ 
            where: { 
                PsicologoId: psicologoId,
                Psicologo: {
                    Status: 'Ativo'
                }
            } 
        });
    }

    async listarAgendasPorDataPsicologo(psicologoId: string, data: string): Promise<Agenda[]> {
        // Busca por data - o formato no banco é YYYY-MM-DD 03:00:00 (horário fixo)
        // A data vem como YYYY-MM-DD do frontend (ex: "2025-11-28")
        // No banco, as datas são armazenadas como "2025-11-28 03:00:00" (sempre com 03:00:00 fixo)
        // Isso acontece porque quando criamos uma data em UTC com 00:00:00, ela vira 03:00:00 no horário de Brasília (UTC-3)
        
        // Parse da data recebida (YYYY-MM-DD)
        const [year, month, day] = data.split('-').map(Number);
        
        // Cria a data de início: YYYY-MM-DD 03:00:00 UTC (formato exato do banco)
        const startDate = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
        
        // Cria a data de fim: próximo dia 03:00:00 UTC (para incluir todo o dia atual)
        // Ex: Se buscamos 2025-11-28, queremos de 2025-11-28 03:00:00 até 2025-11-29 02:59:59.999
        const endDate = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999));
        
        console.log('[AgendaService] ===== BUSCANDO AGENDAS =====');
        console.log('[AgendaService] Parâmetros:', {
            psicologoId,
            dataRecebida: data,
            year,
            month,
            day
        });
        console.log('[AgendaService] Range de datas:', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            startDateUTC: startDate.toUTCString(),
            endDateUTC: endDate.toUTCString()
        });
        
        // Busca o psicólogo e verifica se está ativo
        const psicologo = await prisma.user.findUnique({
            where: { Id: psicologoId },
            select: { Id: true, Status: true }
        });
        if (!psicologo || psicologo.Status !== 'Ativo') {
            console.log('[AgendaService] Psicólogo não encontrado ou inativo');
            return [];
        }
        
        const agendas = await prismaAgendaRepository.findMany({
            where: {
                PsicologoId: psicologoId,
                Data: {
                    gte: startDate,
                    lte: endDate
                },
                Status: 'Disponivel'
            },
            orderBy: {
                Horario: 'asc'
            }
        });
        
        console.log('[AgendaService] ===== RESULTADO DA BUSCA =====');
        console.log('[AgendaService] Total de agendas encontradas:', agendas.length);
        if (agendas.length > 0) {
            console.log('[AgendaService] Primeiras 5 agendas:', agendas.slice(0, 5).map(a => ({
                id: a.Id,
                data: a.Data,
                dataISO: a.Data.toISOString(),
                horario: a.Horario,
                status: a.Status
            })));
        } else {
            console.log('[AgendaService] Nenhuma agenda encontrada para esta data');
        }
        
        return agendas;
    }

    async listarAgendasPorData(data: string): Promise<Agenda[]> {
        // Busca por data ignorando hora, apenas de psicólogos ativos
        const startDate = new Date(data + 'T00:00:00.000Z');
        const endDate = new Date(data + 'T23:59:59.999Z');
        return prismaAgendaRepository.findMany({
            where: {
                Data: {
                    gte: startDate,
                    lte: endDate
                },
                Psicologo: {
                    Status: 'Ativo'
                }
            }
        });
    }

    async listarAgendasPorPeriodo(periodo: 'manha' | 'tarde' | 'noite'): Promise<Agenda[]> {
        let start: string, end: string;
        switch (periodo) {
            case 'manha':
                start = '06:00'; end = '12:00'; break;
            case 'tarde':
                start = '12:01'; end = '18:00'; break;
            case 'noite':
                start = '18:01'; end = '23:00'; break;
            default:
                throw new Error('Período inválido');
        }
        // Supondo que o campo 'Horario' existe na tabela agenda, apenas de psicólogos ativos
        return prismaAgendaRepository.findMany({
            where: {
                Horario: {
                    gte: start,
                    lte: end
                },
                Psicologo: {
                    Status: 'Ativo'
                }
            }
        });
    }

    /**
     * Cria um horário quebrado (horário específico) para um psicólogo com status disponível
     * @param psicologoId ID do psicólogo
     * @param data Data no formato YYYY-MM-DD
     * @param horario Horário no formato HH:mm (ex: "16:30")
     * @param status Status da agenda (padrão: Disponivel)
     * @returns Agenda criada
     */
    async criarHorarioQuebrado(
        psicologoId: string,
        data: string,
        horario: string,
        status: string = 'Disponivel'
    ): Promise<Agenda> {
        // Validação do psicólogo
        const psicologo = await prisma.user.findUnique({
            where: { Id: psicologoId },
            select: { Id: true, Status: true }
        });

        if (!psicologo) {
            throw new Error('Psicólogo não encontrado');
        }

        if (psicologo.Status !== 'Ativo') {
            throw new Error('Psicólogo não está ativo');
        }

        // Validação do formato de data (YYYY-MM-DD)
        const dataRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dataRegex.test(data)) {
            throw new Error('Formato de data inválido. Use YYYY-MM-DD');
        }

        // Validação do formato de horário (HH:mm)
        const horarioRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!horarioRegex.test(horario)) {
            throw new Error('Formato de horário inválido. Use HH:mm (ex: 16:30)');
        }

        // Converte a data para o formato correto (timezone de Brasília)
        // A data vem no formato YYYY-MM-DD, então já está no formato correto
        const dataBrasilia = dayjs.tz(data, 'YYYY-MM-DD', 'America/Sao_Paulo').startOf('day');
        
        // Valida se a data é válida
        if (!dataBrasilia.isValid()) {
            throw new Error('Data inválida');
        }

        const dataDate = dataBrasilia.utc().toDate();
        const diaDaSemana = dataBrasilia.format('dddd');

        // Parse da data para usar na busca (mesmo formato usado em listarAgendasPorDataPsicologo)
        const [year, month, day] = data.split('-').map(Number);
        
        // Verifica se já existe um horário para essa data e horário
        // Usa a mesma lógica de busca de agendas por data
        const dataInicio = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
        const dataFim = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999));

        const horarioExistente = await prismaAgendaRepository.findMany({
            where: {
                PsicologoId: psicologoId,
                Data: {
                    gte: dataInicio,
                    lte: dataFim
                },
                Horario: horario
            }
        });

        if (horarioExistente.length > 0) {
            throw new Error(`Já existe um horário ${horario} para esta data e psicólogo`);
        }

        // Verifica se o horário não é no passado
        const [hora, minuto] = horario.split(':').map(Number);
        const dataHoraBrasilia = dataBrasilia.hour(hora).minute(minuto).second(0).millisecond(0);
        const agoraBrasilia = dayjs().tz('America/Sao_Paulo').second(0).millisecond(0);

        if (dataHoraBrasilia.isBefore(agoraBrasilia)) {
            const dataHoraFormatada = dataHoraBrasilia.format('DD/MM/YYYY [às] HH:mm');
            const agoraFormatada = agoraBrasilia.format('DD/MM/YYYY [às] HH:mm');
            const diferencaMinutos = agoraBrasilia.diff(dataHoraBrasilia, 'minute');
            const diferencaHoras = Math.floor(diferencaMinutos / 60);
            const minutosRestantes = diferencaMinutos % 60;
            
            let diferencaTexto = '';
            if (diferencaHoras > 0) {
                diferencaTexto = `${diferencaHoras} hora${diferencaHoras > 1 ? 's' : ''}`;
                if (minutosRestantes > 0) {
                    diferencaTexto += ` e ${minutosRestantes} minuto${minutosRestantes > 1 ? 's' : ''}`;
                }
            } else {
                diferencaTexto = `${diferencaMinutos} minuto${diferencaMinutos > 1 ? 's' : ''}`;
            }
            
            throw new Error(
                `Não é possível criar horários no passado. ` +
                `O horário informado (${dataHoraFormatada}) já passou há ${diferencaTexto}. ` +
                `Horário atual: ${agoraFormatada}. ` +
                `Por favor, selecione uma data e horário futuros.`
            );
        }

        // Cria a agenda usando o mesmo formato de data usado no gerarAgenda
        const agenda = await prismaAgendaRepository.create({
            Data: dataDate,
            Horario: horario,
            DiaDaSemana: diaDaSemana,
            Status: status,
            PsicologoId: psicologoId,
            PacienteId: null,
        });

        return agenda;
    }
}

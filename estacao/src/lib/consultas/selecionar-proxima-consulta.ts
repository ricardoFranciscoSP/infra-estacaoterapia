import { ConsultaApi } from '@/types/consultasTypes';
import { shouldEnableEntrarConsulta } from '@/utils/consultaTempoUtils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export interface ProximaConsultaResult {
    proximaConsulta: ConsultaApi | null;
    isHoje: boolean;
    isAmanha: boolean;
}

/**
 * Normaliza data para formato YYYY-MM-DD
 */
function normalizarData(data: string): string | null {
    if (!data) return null;
    try {
        // Se vier como ISO string, extrai apenas a parte da data
        const dateOnly = data.split('T')[0].split(' ')[0];
        // Valida formato YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
            return dateOnly;
        }
        // Tenta parsear e converter para YYYY-MM-DD
        const parsed = dayjs(data);
        if (parsed.isValid()) {
            return parsed.format('YYYY-MM-DD');
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Normaliza horário para formato HH:mm
 */
function normalizarHorario(horario: string): string | null {
    if (!horario) return null;
    try {
        const trimmed = horario.trim();
        // Valida formato HH:mm ou H:mm
        if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
            const [hora, minuto] = trimmed.split(':');
            const h = parseInt(hora, 10);
            const m = parseInt(minuto, 10);
            // Valida valores válidos
            if (h >= 0 && h < 24 && m >= 0 && m < 60) {
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Seleciona a próxima consulta com base nas regras de negócio:
 * 1. Prioriza consulta agendada para HOJE
 * 2. Se não houver consulta hoje, retorna a próxima consulta futura
 * 3. Retorna null se não houver nenhuma consulta futura
 * 
 * @param consultas - Array de consultas futuras
 * @returns Objeto contendo a próxima consulta e flags indicando se é hoje ou amanhã
 */
export function selecionarProximaConsulta(
    consultas: ConsultaApi[] | null | undefined
): ProximaConsultaResult {
    if (!consultas || consultas.length === 0) {
        return {
            proximaConsulta: null,
            isHoje: false,
            isAmanha: false,
        };
    }

    const agora = dayjs().tz('America/Sao_Paulo');
    const hoje = agora.startOf('day');
    const amanha = hoje.add(1, 'day');

    // Filtra apenas consultas futuras e com status válido
    const consultasValidas = consultas.filter((consulta) => {
        try {
            const status = consulta.Status || consulta.ReservaSessao?.Status;

            // Considera apenas consultas agendadas/reservadas
            const statusValidos = ['Agendada', 'Reservado', 'Reservada', 'Confirmada', 'Andamento'];
            if (!status || !statusValidos.includes(status)) {
                return false;
            }

            // Valida e normaliza data e horário
            const dataConsulta = consulta.Date || consulta.Agenda?.Data;
            const horarioConsulta = consulta.Time || consulta.Agenda?.Horario;

            if (!dataConsulta || !horarioConsulta) {
                return false;
            }

            const dataNormalizada = normalizarData(dataConsulta);
            const horarioNormalizado = normalizarHorario(horarioConsulta);

            if (!dataNormalizada || !horarioNormalizado) {
                return false;
            }

            // Verifica se é futura ou hoje
            const dataHoraConsulta = dayjs.tz(
                `${dataNormalizada} ${horarioNormalizado}`,
                'America/Sao_Paulo'
            );

            // Verifica se a data/hora é válida
            if (!dataHoraConsulta.isValid()) {
                return false;
            }

            // Permite consultas de hoje e futuras
            return dataHoraConsulta.isSameOrAfter(agora);
        } catch (error) {
            console.error('Erro ao processar consulta:', error, consulta);
            return false;
        }
    });

    if (consultasValidas.length === 0) {
        return {
            proximaConsulta: null,
            isHoje: false,
            isAmanha: false,
        };
    }

    // Ordena por data e horário crescente
    const consultasOrdenadas = consultasValidas.sort((a, b) => {
        try {
            const dataA = normalizarData(a.Date || a.Agenda?.Data || '');
            const horarioA = normalizarHorario(a.Time || a.Agenda?.Horario || '');
            const dataB = normalizarData(b.Date || b.Agenda?.Data || '');
            const horarioB = normalizarHorario(b.Time || b.Agenda?.Horario || '');

            if (!dataA || !horarioA || !dataB || !horarioB) {
                return 0;
            }

            const dataHoraA = dayjs.tz(`${dataA} ${horarioA}`, 'America/Sao_Paulo');
            const dataHoraB = dayjs.tz(`${dataB} ${horarioB}`, 'America/Sao_Paulo');

            if (!dataHoraA.isValid() || !dataHoraB.isValid()) {
                return 0;
            }

            return dataHoraA.diff(dataHoraB);
        } catch {
            return 0;
        }
    });

    // Verifica se há consulta dentro da janela
    // Janela: 15 minutos antes até 60 minutos depois do horário
    // SEM buffer - atualização instantânea quando sair da janela
    const consultaNaJanela = consultasOrdenadas.find((consulta) => {
        try {
            const dataConsulta = consulta.Date || consulta.Agenda?.Data;
            const horarioConsulta = consulta.Time || consulta.Agenda?.Horario;

            if (!dataConsulta || !horarioConsulta) return false;

            const dataNormalizada = normalizarData(dataConsulta);
            const horarioNormalizado = normalizarHorario(horarioConsulta);

            if (!dataNormalizada || !horarioNormalizado) return false;

            const dataHoraConsulta = dayjs.tz(
                `${dataNormalizada} ${horarioNormalizado}`,
                'America/Sao_Paulo'
            );

            if (!dataHoraConsulta.isValid()) return false;

            // Janela: 15 minutos antes até 60 minutos depois do horário
            const inicioJanela = dataHoraConsulta.subtract(15, 'minute');
            const fimJanela = dataHoraConsulta.add(60, 'minute');

            if (!inicioJanela.isValid() || !fimJanela.isValid()) return false;

            // Retorna true se estiver dentro da janela exata (sem buffer)
            return agora.isSameOrAfter(inicioJanela) && agora.isSameOrBefore(fimJanela);
        } catch {
            return false;
        }
    });

    if (consultaNaJanela) {
        // Verifica se é hoje para determinar o badge
        try {
            const dataConsulta = consultaNaJanela.Date || consultaNaJanela.Agenda?.Data;
            const dataNormalizada = normalizarData(dataConsulta || '');
            if (dataNormalizada) {
                const dataConsultaDayjs = dayjs(dataNormalizada, 'YYYY-MM-DD').tz('America/Sao_Paulo').startOf('day');
                if (dataConsultaDayjs.isValid() && dataConsultaDayjs.isSame(hoje, 'day')) {
                    return {
                        proximaConsulta: consultaNaJanela,
                        isHoje: true,
                        isAmanha: false,
                    };
                }
            }
        } catch {
            // Ignora erro e continua
        }

        return {
            proximaConsulta: consultaNaJanela,
            isHoje: false,
            isAmanha: false,
        };
    }

    // Verifica se há consulta hoje (sem considerar janela, apenas a data)
    const consultaHoje = consultasOrdenadas.find((consulta) => {
        try {
            const dataConsulta = consulta.Date || consulta.Agenda?.Data;
            if (!dataConsulta) return false;

            const dataNormalizada = normalizarData(dataConsulta);
            if (!dataNormalizada) return false;

            const dataConsultaDayjs = dayjs(dataNormalizada, 'YYYY-MM-DD').tz('America/Sao_Paulo').startOf('day');
            if (!dataConsultaDayjs.isValid()) return false;

            return dataConsultaDayjs.isSame(hoje, 'day');
        } catch {
            return false;
        }
    });

    if (consultaHoje) {
        return {
            proximaConsulta: consultaHoje,
            isHoje: true,
            isAmanha: false,
        };
    }

    // Se não tem consulta hoje, retorna a próxima futura
    const proximaConsulta = consultasOrdenadas[0];
    if (!proximaConsulta) {
        return {
            proximaConsulta: null,
            isHoje: false,
            isAmanha: false,
        };
    }

    let isAmanha = false;
    try {
        const dataProxima = proximaConsulta.Date || proximaConsulta.Agenda?.Data;
        if (dataProxima) {
            const dataNormalizada = normalizarData(dataProxima);
            if (dataNormalizada) {
                const dataDayjs = dayjs(dataNormalizada, 'YYYY-MM-DD').tz('America/Sao_Paulo').startOf('day');
                if (dataDayjs.isValid()) {
                    isAmanha = dataDayjs.isSame(amanha, 'day');
                }
            }
        }
    } catch {
        // Ignora erro e mantém isAmanha como false
    }

    return {
        proximaConsulta,
        isHoje: false,
        isAmanha,
    };
}

/**
 * Verifica se a consulta está dentro da janela permitida para entrada
 * (15 minutos antes até o fim da consulta)
 */
export function podeEntrarNaConsulta(consulta: ConsultaApi | null): boolean {
    if (!consulta) return false;

    const dataConsulta = consulta.Date || consulta.Agenda?.Data;
    const horarioConsulta = consulta.Time || consulta.Agenda?.Horario;
    const statusBase =
        consulta.Status ||
        (consulta as { status?: string }).status ||
        consulta.ReservaSessao?.Status ||
        null;

    return shouldEnableEntrarConsulta({
        date: dataConsulta || null,
        time: horarioConsulta || null,
        status: statusBase,
    });
}

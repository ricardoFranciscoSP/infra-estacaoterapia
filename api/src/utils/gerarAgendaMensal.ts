// utils/gerarAgendaMensal.ts
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import 'dayjs/locale/pt-br';
import prisma from '../prisma/client';
import { AgendaStatus } from '../types/permissions.types';

dayjs.extend(weekday);
dayjs.extend(isLeapYear);
dayjs.locale('pt-br');

export async function gerarAgendaMensal(psicologoId: string) {
    const hoje = dayjs().startOf('day');
    
    // Gera horários de 06:00 até 23:00
    const horariosPorDia = [];
    for (let hora = 6; hora <= 23; hora++) {
        horariosPorDia.push(`${hora.toString().padStart(2, '0')}:00`);
    }

    // Calcula data final: 60 dias a partir de hoje
    const dataFinal = hoje.add(59, 'day'); // 60 dias incluindo hoje

    const registros = [];
    let dataAtual = hoje;

    // Itera dia a dia desde hoje até 60 dias à frente
    while (dataAtual.isBefore(dataFinal) || dataAtual.isSame(dataFinal, 'day')) {
        const dataFormatada = dataAtual.format('YYYY-MM-DD');
        const diaDaSemana = dataAtual.format('dddd');

        for (const hora of horariosPorDia.sort()) { // Garantir ordem ascendente dos horários
            registros.push({
                Data: dataFormatada,
                Horario: hora,
                DiaDaSemana: diaDaSemana,
                Status: AgendaStatus.Bloqueado,
                PsicologoId: psicologoId,
                PacienteId: null,
            });
        }
        
        // Avança para o próximo dia
        dataAtual = dataAtual.add(1, 'day');
    }

    registros.sort((a, b) => {
        if (a.Data === b.Data) {
            return a.Horario.localeCompare(b.Horario); // Ordenar por horário se as datas forem iguais
        }
        return a.Data.localeCompare(b.Data); // Ordenar por data
    });

    if (registros.length > 0) {
        await prisma.agenda.createMany({
            data: registros,
            skipDuplicates: true,
        });
    }

    return { total: registros.length };
}

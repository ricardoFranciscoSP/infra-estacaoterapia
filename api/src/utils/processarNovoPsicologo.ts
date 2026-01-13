// utils/processarNovoPsicologo.ts
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import 'dayjs/locale/pt-br';
import prisma from '../prisma/client';
import { AgendaStatus } from '../types/permissions.types';

dayjs.extend(weekday);
dayjs.extend(isLeapYear);
dayjs.locale('pt-br');

function toISODate(dateStr: string): string {
    // Espera 'DD/MM/YYYY' e retorna 'YYYY-MM-DD'
    const [dia, mes, ano] = dateStr.split('/');
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

export async function processarNovoPsicologo(psicologo: { id: string }) {
    const hoje = dayjs().startOf('day');
    
    // Gera horários de 06:00 até 23:00
    const horarios = [];
    for (let hora = 6; hora <= 23; hora++) {
        horarios.push(`${hora.toString().padStart(2, '0')}:00`);
    }

    // Calcula data final: 60 dias a partir de hoje
    const dataFinal = hoje.add(59, 'day'); // 60 dias incluindo hoje

    const registros = [];
    let dataAtual = hoje;

    // Itera dia a dia desde hoje até 60 dias à frente
    while (dataAtual.isBefore(dataFinal) || dataAtual.isSame(dataFinal, 'day')) {
        const dataFormatada = dataAtual.format('YYYY-MM-DD');
        const diaDaSemana = dataAtual.format('dddd');

        for (const hora of horarios) {
            registros.push({
                Data: dataFormatada,
                Horario: hora,
                DiaDaSemana: diaDaSemana,
                Status: AgendaStatus.Bloqueado,
                PsicologoId: psicologo.id,
                PacienteId: null,
            });
        }
        
        // Avança para o próximo dia
        dataAtual = dataAtual.add(1, 'day');
    }

    if (registros.length > 0) {
        await prisma.agenda.createMany({
            data: registros,
            skipDuplicates: true,
        });
    }

    return { totalHorariosCriados: registros.length };
}

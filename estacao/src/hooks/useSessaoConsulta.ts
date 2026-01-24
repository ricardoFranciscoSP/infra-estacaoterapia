import { useEffect, useState, useMemo, useCallback } from "react";
import { useContadorGlobal } from "./useContadorGlobal";

export interface UseSessaoConsulta {
    contador: string;
    mostrarSessao: boolean;
    sessaoAtiva: boolean;
    sessaoEncerrada: boolean;
    tempoAposInicio: number;
    consultaPassou24h: () => boolean;
}

export interface ConsultaSessao {
    agenda?: {
        data?: string;
        horario?: string;
    };
    Agenda?: {
        Data?: string;
        Horario?: string;
    };
    Date?: string;
    Time?: string;
    ReservaSessao?: {
        ScheduledAt?: string;
    };
    // ...adicione outros campos se necessário
}

export function useSessaoConsulta(consulta: ConsultaSessao): UseSessaoConsulta {
    const [contador, setContador] = useState("");
    const [mostrarSessao, setMostrarSessao] = useState(false);
    const [sessaoAtiva, setSessaoAtiva] = useState(false);
    const [sessaoEncerrada, setSessaoEncerrada] = useState(false);
    const [tempoAposInicio, setTempoAposInicio] = useState(0);
    
    // Usa o contador global compartilhado em vez de criar um novo intervalo
    const { timestamp } = useContadorGlobal();

    // Memoiza os dados da consulta para evitar recálculos desnecessários
    // IMPORTANTE: ScheduledAt da ReservaSessao é sempre a fonte da verdade
    const consultaData = useMemo(() => {
        // Prioriza ScheduledAt da ReservaSessao
        const scheduledAt = consulta?.ReservaSessao?.ScheduledAt;
        if (scheduledAt) {
            // ScheduledAt está no formato 'YYYY-MM-DD HH:mm:ss'
            const [datePart, timePart] = scheduledAt.split(' ');
            if (datePart && timePart) {
                return { 
                    data: datePart, 
                    horario: timePart.split(':').slice(0, 2).join(':') // Remove segundos
                };
            }
        }
        // Fallback: usa agenda/Agenda/Date/Time se ScheduledAt não estiver disponível
        const data =
            consulta?.agenda?.data ||
            consulta?.Agenda?.Data ||
            consulta?.Date;
        const horario =
            consulta?.agenda?.horario ||
            consulta?.Agenda?.Horario ||
            consulta?.Time;
        return { data, horario };
    }, [consulta]);

    // Função memoizada para calcular a diferença em segundos
    const getDiffSeconds = useCallback((agoraTimestamp: number) => {
        const { data, horario } = consultaData;
        
        if (!data || !horario) return 0;

        // Aceita data/hora nos dois formatos
        let consultaDate: Date | undefined;
        if (data && (data.includes("T") || data.length > 10)) {
            // ISO format
            consultaDate = new Date(data);
            if (horario) {
                const [hora, minuto] = horario.split(":");
                consultaDate.setHours(Number(hora), Number(minuto), 0, 0);
            }
        } else if (data) {
            if (horario) {
                const [ano, mes, dia] = data.split("-");
                const [hora, minuto] = horario.split(":");
                consultaDate = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));
            }
        }
        
        return consultaDate
            ? Math.floor((consultaDate.getTime() - agoraTimestamp) / 1000)
            : 0;
    }, [consultaData]);

    // useEffect para atualizar o contador e estados da sessão
    useEffect(() => {
        const { data, horario } = consultaData;
        if (!data || !horario) {
            setMostrarSessao(false);
            setContador("");
            setSessaoAtiva(false);
            setSessaoEncerrada(false);
            setTempoAposInicio(0);
            return;
        }

        const agoraTimestamp = timestamp;
        const diffSegundos = getDiffSeconds(agoraTimestamp);

        // Antes da sessão começar (até 10 minutos antes)
        if (diffSegundos > 0 && diffSegundos <= 600) {
            setMostrarSessao(true);
            setSessaoAtiva(false);
            setSessaoEncerrada(false);
            const mm = String(Math.floor(diffSegundos / 60)).padStart(2, "0");
            const ss = String(diffSegundos % 60).padStart(2, "0");
            setContador(`${mm}:${ss}`);
            setTempoAposInicio(0);
        } else if (diffSegundos <= 0 && Math.abs(diffSegundos) <= 3000) {
            // Sessão começou, até 50 minutos depois (3000 segundos)
            setMostrarSessao(true);
            setSessaoAtiva(true);
            setSessaoEncerrada(false);
            const segundosAposInicio = Math.abs(diffSegundos);
            setTempoAposInicio(segundosAposInicio);
            const mm = String(Math.floor(segundosAposInicio / 60)).padStart(2, "0");
            const ss = String(segundosAposInicio % 60).padStart(2, "0");
            setContador(`${mm}:${ss}`);
        } else if (diffSegundos < -3000) {
            // Mais de 50 minutos após o início
            setMostrarSessao(true);
            setSessaoAtiva(false);
            setSessaoEncerrada(true);
            setContador("");
        } else {
            // Fora do intervalo de exibição
            setMostrarSessao(false);
            setSessaoAtiva(false);
            setSessaoEncerrada(false);
            setContador("");
            setTempoAposInicio(0);
        }
    }, [timestamp, consultaData, getDiffSeconds]);

    // Função para verificar se a consulta já terminou (considerando duração de 60 minutos)
    function consultaPassou24h() {
        const data =
            consulta?.agenda?.data ||
            consulta?.Agenda?.Data ||
            consulta?.Date;
        const horario =
            consulta?.agenda?.horario ||
            consulta?.Agenda?.Horario ||
            consulta?.Time;

        if (!data || !horario) return true; // Se não tem data/hora, considera como passada

        let dataConsulta: Date;
        
        // Prioriza usar Date se disponível (já vem com data/hora completa)
        if (consulta?.Date && typeof consulta.Date === 'string') {
            dataConsulta = new Date(consulta.Date);
        } else if (data.includes("T") || data.length > 10) {
            // ISO format ou timestamp
            dataConsulta = new Date(data);
            if (horario) {
                const [hora, minuto] = horario.split(":");
                dataConsulta.setHours(Number(hora), Number(minuto) || 0, 0, 0);
            }
        } else {
            // Formato YYYY-MM-DD
            const [ano, mes, dia] = data.split("-");
            const [hora, minuto] = horario.split(":");
            dataConsulta = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto) || 0, 0, 0);
        }
        
        const agora = new Date();
        // Considera duração de 60 minutos - consulta termina 1h após o início
        const fimConsulta = dataConsulta.getTime() + 60 * 60 * 1000;
        
        // Retorna true se a consulta já terminou (agora > fim da consulta)
        return agora.getTime() > fimConsulta;
    }

    return {
        contador,
        mostrarSessao,
        sessaoAtiva,
        sessaoEncerrada,
        tempoAposInicio,
        consultaPassou24h,
    };
}
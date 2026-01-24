'use client';

import { useEffect, useState, useCallback } from 'react';
import { ConsultaApi } from '@/types/consultasTypes';
import { getStatusTagInfo } from '@/utils/statusConsulta.util';

/**
 * Hook para monitorar o status de uma consulta em tempo real
 * Atualiza automaticamente quando a consulta está em andamento
 */
export function useConsultaStatusRealTime(consulta: ConsultaApi | null) {
    const [statusAtual, setStatusAtual] = useState<string>('Reservado');
    const [statusTagInfo, setStatusTagInfo] = useState(getStatusTagInfo('Reservado'));
    const [tempoRestante, setTempoRestante] = useState<string>('');
    const [emAndamento, setEmAndamento] = useState(false);

    const calcularStatusRealTime = useCallback(() => {
        if (!consulta) return;

        const statusReservaSessao = consulta.ReservaSessao?.Status;
        const statusConsulta = statusReservaSessao || consulta.Status || 'Reservado';
        const statusLower = String(statusConsulta).toLowerCase();

        // 🎯 Se foi cancelada, retorna Cancelada independente da hora
        if (statusLower.includes('cancel')) {
            setStatusAtual(statusConsulta);
            setStatusTagInfo(getStatusTagInfo(statusConsulta));
            setEmAndamento(false);
            return;
        }

        // 🎯 Se foi concluída/realizada, retorna Realizada independente da hora
        if (statusLower.includes('realizada') || statusLower.includes('concluido') || statusLower.includes('concluído') || statusLower.includes('completed')) {
            setStatusAtual(statusConsulta);
            setStatusTagInfo(getStatusTagInfo(statusConsulta));
            setEmAndamento(false);
            setTempoRestante('');
            return;
        }

        // Verifica se está dentro do horário de execução
        const dataStr = consulta.Agenda?.Data || consulta.Date || '';
        const horarioStr = consulta.Agenda?.Horario || consulta.Time || '';

        if (!dataStr || !horarioStr) {
            setStatusAtual(statusConsulta);
            setStatusTagInfo(getStatusTagInfo(statusConsulta));
            setEmAndamento(false);
            return;
        }

        try {
            let dataObj: Date | null = null;

            // Parse da data e hora
            if (dataStr.includes('T') || dataStr.length > 10) {
                dataObj = new Date(dataStr);
                const [hora, minuto] = horarioStr.split(':');
                if (hora && minuto) dataObj.setHours(Number(hora), Number(minuto), 0, 0);
            } else {
                const [ano, mes, dia] = dataStr.split('-');
                const [hora, minuto] = horarioStr.split(':');
                if (ano && mes && dia && hora && minuto) {
                    dataObj = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));
                }
            }

            if (!dataObj) {
                setStatusAtual(statusConsulta);
                setStatusTagInfo(getStatusTagInfo(statusConsulta));
                setEmAndamento(false);
                return;
            }

            const agora = new Date();
            const inicioConsulta = dataObj.getTime();
            const fimConsulta = inicioConsulta + 60 * 60 * 1000; // +1 hora
            const agoraTimestamp = agora.getTime();

            // Se estiver dentro do horário da consulta (até 1 hora)
            if (agoraTimestamp >= inicioConsulta && agoraTimestamp < fimConsulta) {
                setStatusAtual('Em Andamento');
                setStatusTagInfo(getStatusTagInfo('Em Andamento'));
                setEmAndamento(true);

                // Calcula tempo restante
                const tempoRest = fimConsulta - agoraTimestamp;
                const minutos = Math.floor(tempoRest / 60000);
                const segundos = Math.floor((tempoRest % 60000) / 1000);
                setTempoRestante(`${minutos}m ${segundos}s`);
            } else if (agoraTimestamp < inicioConsulta) {
                // Ainda não começou
                setStatusAtual('Reservado');
                setStatusTagInfo(getStatusTagInfo('Reservado'));
                setEmAndamento(false);
                setTempoRestante('');
            } else {
                // Passou do horário - está concluída
                setStatusAtual('Realizada');
                setStatusTagInfo(getStatusTagInfo('Realizada'));
                setEmAndamento(false);
                setTempoRestante('');
            }
        } catch (error) {
            console.error('Erro ao calcular status em tempo real:', error);
            setStatusAtual(statusConsulta);
            setStatusTagInfo(getStatusTagInfo(statusConsulta));
            setEmAndamento(false);
        }
    }, [consulta]);

    // Calcula status inicial
    useEffect(() => {
        calcularStatusRealTime();
    }, [calcularStatusRealTime]);

    // Atualiza a cada segundo se estiver em andamento
    useEffect(() => {
        if (!emAndamento) return;

        const interval = setInterval(() => {
            calcularStatusRealTime();
        }, 1000);

        return () => clearInterval(interval);
    }, [emAndamento, calcularStatusRealTime]);

    return {
        statusAtual,
        statusTagInfo,
        tempoRestante,
        emAndamento,
    };
}

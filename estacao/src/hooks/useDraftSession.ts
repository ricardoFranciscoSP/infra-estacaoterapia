import { useDraftSessionStore } from '@/store/draftSessionStore';
import { createDraftSession, confirmDraftSession } from '@/services/draftSessionService';
import { useEffect } from 'react';

export function useDraftSession() {
    const {
        draftId,
        psychologistId,
        date,
        setDraftSession,
        clearDraftSession,
    } = useDraftSessionStore();

    // Restaura draftId do localStorage quando o hook é usado
    useEffect(() => {
        if (typeof window !== 'undefined' && !draftId) {
            const storedDraftId = window.localStorage.getItem('draftId');
            if (storedDraftId) {
                // Restaura apenas o draftId, os outros dados podem ser recuperados do sessionStorage se necessário
                const storedAgendamento = window.sessionStorage.getItem('agendamento-pendente');
                if (storedAgendamento) {
                    try {
                        const agendamento = JSON.parse(storedAgendamento);
                        const expirado = agendamento.timestamp
                            ? Date.now() - Number(agendamento.timestamp) > 15 * 60 * 1000
                            : false;
                        if (expirado) {
                            window.localStorage.removeItem('draftId');
                            window.sessionStorage.removeItem('agendamento-pendente');
                            return;
                        }
                        // Restaura a sessão com os dados disponíveis
                        setDraftSession(
                            storedDraftId,
                            agendamento.psicologoId || '',
                            agendamento.data || ''
                        );
                    } catch {
                        // Se não conseguir parsear, apenas restaura o draftId
                        setDraftSession(storedDraftId, '', '');
                    }
                } else {
                    // Se não houver agendamento, apenas restaura o draftId
                    setDraftSession(storedDraftId, '', '');
                }
            }
        }
    }, [draftId, setDraftSession]);

    interface DraftSessionPayload {
        PsychologistId: string;
        IdAgenda: string;
    }
    const iniciarDraftSession = async (psychologistId: string, _date: string, psychologistAgendaId?: string) => {
        // O backend espera PsychologistId e IdAgenda
        const payload: DraftSessionPayload = {
            PsychologistId: psychologistId,
            IdAgenda: psychologistAgendaId || "",
        };
        const draftId = await createDraftSession(payload);
        setDraftSession(draftId, psychologistId, _date);
        return draftId;
    };

    const confirmarDraftSession = async (patientId: string) => {
        if (!draftId) throw new Error('DraftId não encontrado');
        const sessionId = await confirmDraftSession(draftId, patientId);
        clearDraftSession();
        return sessionId;
    };

    return {
        draftId,
        psychologistId,
        date,
        iniciarDraftSession,
        confirmarDraftSession,
        clearDraftSession,
    };
}

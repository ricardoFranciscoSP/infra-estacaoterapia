
import { api } from "@/lib/axios";

// Payload correto: PsychologistId, IdAgenda
export async function createDraftSession(payload: { PsychologistId: string; IdAgenda: string }) {
    const response = await api.post('/draft-session', payload);
    return response.data.draftId;
}

export async function confirmDraftSession(draftId: string, patientId: string) {
    const response = await api.post('/draft-session/confirm', { draftId, patientId });
    return response.data.sessionId;
}

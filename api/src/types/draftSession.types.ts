
export enum DraftSessionStatus {
    draft = 'draft',
    auth_done = 'auth_done',
    awaiting_plan = 'awaiting_plan',
    paid = 'paid',
    completed = 'completed',
    expired = 'expired',
}

export interface CreateDraftSessionPayload {
    PsychologistId: string;
    IdAgenda: string;
}

export interface ConfirmDraftSessionPayload {
    draftId: string;
    patientId: string;
}

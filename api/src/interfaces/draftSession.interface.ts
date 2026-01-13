import { DraftSessionStatus } from '../types/draftSession.types';

export interface DraftSession {
    id: string;
    psychologistId: string;
    patientId?: string;
    date: Date;
    status: DraftSessionStatus;
    IdAgenda: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IAgendaService {
    deletePreviousAgendas(): Promise<void>;
    generateAgenda(): Promise<void>;
    inactivateExpiredConsultations(): Promise<void>;
    executarTarefas(): Promise<void>;
}

export interface IReservaSessaoService {
    getReservaSessao(reservationId: string): Promise<any>;
    joinReservaSessao(consultationId: string, userId: string, role: 'Patient' | 'Psychologist'): Promise<{ success: boolean; message?: string; data?: any }>;
}
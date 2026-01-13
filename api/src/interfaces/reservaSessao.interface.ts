export interface IReservaSessaoService {
    getReservaSessao(reservationId: string): Promise<any>;
}
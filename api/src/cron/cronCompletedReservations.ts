import { ReservationService } from '../services/reservation.service';
import { EmailService } from '../services/email.service';

export async function cronCompletedReservations() {
    const emailService = new EmailService();
    const reservationService = new ReservationService(emailService);

    try {
        await reservationService.updateCompletedReservations();
        console.log('Reservas atualizadas para completed com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar reservas para completed:', error);
    }
}
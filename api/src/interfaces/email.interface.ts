export interface SendEmailParams {
    to: string;
    subject: string;
    htmlTemplate: string;
    templateData: Record<string, string | number | boolean | Date | undefined | null>;
}

export interface ReservationEmailData {
    paciente?: {
        email?: string;
        nome?: string;
        Id?: string;
    } | null;
    psicologo?: {
        email?: string;
        nome?: string;
        Id?: string;
    } | null;
    date?: Date | string;
    time?: string;
    tipo?: string;
}

export interface IEmailService {
    send(params: SendEmailParams): Promise<void>;
    sendCancellationEmail(reservation: ReservationEmailData | { Paciente?: { Nome?: string; Email?: string } | null; Psicologo?: { Nome?: string; Email?: string } | null; Agenda?: { Data?: Date | string; Horario?: string } | null; date?: Date | string; time?: string }, motivo: string, protocolo: string): Promise<void>;
    sendAutoCancellationEmail(reservation: ReservationEmailData | { Paciente?: { Nome?: string; Email?: string } | null; Psicologo?: { Nome?: string; Email?: string } | null; Agenda?: { Data?: Date | string; Horario?: string } | null; date?: Date | string; time?: string }): Promise<void>;
    sendContatoEmail(params: { nome: string; email: string; telefone: string; assunto: string; mensagem: string }): Promise<void>;
    sendCancelamentoCriadoEmail(reservation: ReservationEmailData, motivo: string, protocolo: string): Promise<void>;
    sendCancelamentoAtualizadoEmail(reservation: ReservationEmailData, motivo: string, protocolo: string, status: string, data: string, horario: string, autorTipo: string): Promise<void>;
    sendCancelamentoAprovadoEmail(reservation: ReservationEmailData, motivo: string, protocolo: string, dentroDoPrazo?: boolean): Promise<void>;
    sendWelcomeEmail(email: string, nome: string): Promise<void>;
    sendStatusAtualizadoPsicologoEmail(email: string, nome: string, statusLabel: string): Promise<void>;
    sendConfirmationEmail(user: { email: string; nome: string }, reservation: ReservationEmailData): Promise<void>;
    sendAppointmentConfirmationEmailPaciente(email: string, nome: string, psicologoNome: string, data: string, horario: string): Promise<void>;
    sendAppointmentConfirmationEmailPsicologo(email: string, nome: string, pacienteNome: string, pacienteEmail: string, data: string, horario: string): Promise<void>;
}
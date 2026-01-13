export interface IEmailService {
    sendWelcomeEmail(email: string, nome: string): Promise<void>;
    sendWelcomePsicologoEmail(email: string, nome: string): Promise<void>;
    sendAprovacaoPsicologoEmail(email: string, nome: string): Promise<void>;
    sendCompletePerfilPsicologoEmail(email: string, nome: string): Promise<void>;
    sendConfirmationEmail(user: any, reservation: any): Promise<void>;
    sendAppointmentConfirmationEmailPaciente(email: string, nome: string, psicologoNome: string, data: string, horario: string): Promise<void>;
    sendAppointmentConfirmationEmailPsicologo(email: string, nome: string, pacienteNome: string, pacienteEmail: string, data: string, horario: string): Promise<void>;
    sendResetPasswordEmail(email: string, nome: string, resetCode: string): Promise<void>;
    sendPasswordResetConfirmation(email: string, nome: string): Promise<void>;
    sendResetPasswordLinkEmail(email: string, nome: string, resetLink: string, expirationHours: number): Promise<void>;
    sendRandomPasswordEmail(email: string, nome: string, password: string): Promise<void>;
}

export interface ISMSService {
    sendResetCode(telefone: string, resetCode: string): Promise<void>;
}

export interface IWhatsAppService {
    sendResetCode(telefone: string, resetCode: string): Promise<void>;
}
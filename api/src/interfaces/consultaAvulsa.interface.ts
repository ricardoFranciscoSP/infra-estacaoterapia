export interface IConsultaAvulsa {
    userId: string;
    quantidade: number;
    vindiCustomerId?: string;
    vindiProductId: string;
    preco: string;
    payment_method_code?: "credit_card" | "pix" | "boleto";
    fromAgendamento?: boolean;
    agendaId?: string | null;
    pacienteId?: string;
    psicologoId?: string;
}


export interface IConsultaAvulsaService {
    CompraConsultaAvulsa(data: IConsultaAvulsa): Promise<any>;
}
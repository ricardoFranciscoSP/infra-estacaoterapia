// Tipos para parâmetros e retorno dos métodos de controle de consultas

export type ControleConsultaParams = {
    reservationId: string;
    userId: string;
};

export type ControleConsultaResult = {
    success: boolean;
    message?: string;
    error?: string;
    data?: any;
};

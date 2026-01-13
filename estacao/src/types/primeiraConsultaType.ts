export interface PrimeiraConsultaAvulsa {
    quantidade: number;
    vindiProductId: string;
    vindiBillId: string;
}

export interface PrimeiraConsultaControleFatura {
    tipoFatura: string;
    vindiProductId: string;
    vindiBillId: string;
}

export interface PrimeiraCompraPayload {
    consultaAvulsa: PrimeiraConsultaAvulsa;
    controleFatura: PrimeiraConsultaControleFatura;
}

export interface PrimeiraCompra {
    id: string;
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    createdAt: string;
    updatedAt: string;
}

export interface PrimeiraCompraStatus {
    jaComprou: boolean;
}
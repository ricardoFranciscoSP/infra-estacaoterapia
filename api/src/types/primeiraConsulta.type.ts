import { ConsultaAvulsaStatus, FaturaStatus, TipoFatura } from './permissions.types';

export type PrimeiraConsultaData = {
    email: string;
    telefone: string;
    cpf: string;
    userId: string;
    payment_method_code: string;
    payment_company_code: string;
    error?: boolean;
    message?: string;
    transactionId?: string;
    qrCode?: string;
    qrCodeText?: string;
    vindiProductId: string;
    quantidade: number;
    valor: number;
    planoId?: string;
    consultaAvulsa?: {
        id: string;
        userId: string;
        adquiridaEm: Date;
        validUntil: Date;
        status: ConsultaAvulsaStatus;
        quantidade: number;
        vindiProductId: string;
        vindiBillId?: string;
        PsicologoId?: string;
    };
    controleFatura: {
        CodigoFatura: string;
        Valor: number;
        Status: FaturaStatus;
        DataEmissao: Date;
        DataVencimento: Date;
        Tipo: TipoFatura | string;
        vindiProductId: string;
        vindiBillId?: string;
    };
    compra?: {
        vindiProductId: string;
        quantidade: number;
        valor: number;
    };
    endereco?: {
        cep: string;
        rua: string;
        numero: string;
        complemento?: string;
        bairro: string;
        cidade: string;
        estado: string;
    };
    cartao?: {
        numeroCartao: string;
        nomeTitular: string;
        validade: string;
        cvv: string;
        bandeira?: string;
        last4?: string;
        payment_company_code: string;
        paymentMethodCode: string;
        payment_company_id: string;
    };
    usuario?: {
        Id: string;
        Nome: string;
        Email: string;
        IsOnboard?: boolean;
        Role?: string;
        VindiCustomerId: string;
        Address?: any;
        PlanoCompra?: any;
        Image?: {
            id: string;
            url: string;
        };
        Onboardings?: any[];
        Telefone?: string;
        Cpf?: string;
        UserId?: string;
    };
    pagamentoVindi?: {
        bill_id: string;
        bill_code: string;
        amount: number;
        status: string;
        payment_method_code: string;
        quantity?: number;
        pix?: {
            qr_code: string;
            pix: string;
        };
    };
    financeiro?: any;
    CreditoAvulso?: any
    billDetails?: any;
}

export type PrimeiraConsultaResponse = {
    email: string;
    telefone: string;
    cpf: string;
    userId: string;
    vindiProductId: string;
    quantidade: number;
    valor: number;
    payment_method_code: string;
    payment_company_code: string;
    controleFatura: {
        CodigoFatura: string;
        Valor: number;
        Status: FaturaStatus;
        DataEmissao: Date;
        DataVencimento: Date;
        Tipo: TipoFatura | string;
        vindiProductId: string;
        vindiBillId?: string;
    };
    transactionId: string;
    financeiro: {
        id: string;
        valor: number;
        status: string;
        dataVencimento: Date;
        tipo: string;
        faturaId: string;
        userId: string;
    };
    CreditoAvulso: {
        id: string;
        valor: number;
        status: string;
        quantidade: number;
        userId: string;
    };
    ConsultaAvulsa: {
        Status: ConsultaAvulsaStatus;
        Quantidade: number;
        DataCriacao: Date;
        PacienteId: string;
    };
    qrCode: string;
    qrCodeText: string;
    pagamentoVindi: {
        bill_id: string;
        bill_code: string;
        amount: number;
        status: string;
        payment_method_code: string;
        pix?: {
            qr_code: string;
            pix: string;
        };
    };
    billDetails?: string;
}

export type VerificarCompraParams = {
    jaComprou: boolean;
}

export interface AlgumaInterfaceComFatura {
    // ...existing code...
    Status: FaturaStatus;
    // ...existing code...
    Tipo: TipoFatura | string;
    // ...existing code...
}

export interface OutraInterfaceComFatura {
    // ...existing code...
    Status: FaturaStatus;
    // ...existing code...
    Tipo: TipoFatura | string;
    // ...existing code...
}
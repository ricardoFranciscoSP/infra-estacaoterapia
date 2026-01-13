import { FaturaStatus } from "./permissions.types";

export type TipoFatura = {
    Plano: string
    ConsultaAvulsa: string
    PrimeiraConsulta: string
}

export type ComprarPlanoDTO = {
    planoId: number;
    metodoPagamento: string;
    cartaoId?: number;
    cardHash?: string;
};

type Plano = {
    Id: string;
    Nome: string;
    Descricao: string;
    Tipo: string;
    Preco: number;
    Duracao: string;
    VindiPlanId: string;
    ProductId: string;
    Status: string;
};

export type CadastrarCartaoDTO = {
    nomeTitular: string;
    ultimos4Digitos: string;
    bandeira: string;
    validadeMes: string;
    validadeAno: string;
    tokenCartao?: string;
    principal?: boolean;
};

export type CancelarPlanoDTO = {
    planoCompraId: string;
};

export type UpgradePlanoDTO = {
    planoAtualId: string;
    novoPlanoId: string;
};

export type EnderecoType = {
    Rua: string;
    Numero: string;
    Complemento?: string | null;
    Cep: string;
    Bairro: string;
    Cidade: string;
    Estado: string;
};

export type CompraPlanoPayload = {
    email: string;
    telefone: string;
    cpf: string;
    userId: string;
    error?: boolean;
    message?: string;
    transactionId?: string;
    qrCode?: string;
    qrCodeText?: string;
    tokenObj: {
        gateway_token: string;
        payment_company_code: string;
    }
    companyInfo: { payment_company_code: string; payment_company_id: number };
    assinaturaPlano?: any; // Adicionado para retornar o registro da assinatura criada
    plano?: Plano; // Adicionado para retornar os detalhes do plano comprado
    paymentProfile?: any; // Adicionado para retornar o perfil de pagamento criado na Vindi
    controleFatura: {
        CodigoFatura: string;
        Valor: number;
        Status: FaturaStatus;
        DataEmissao: Date;
        DataVencimento: Date;
        Tipo: TipoFatura;
        vindiProductId: string;
        vindiBillId?: string;
    };
    endereco?: EnderecoType;
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
        id: string;
        nome: string;
        email: string;
        vindiCustomerId: string;
        telefone?: string;
        cpf?: string;
        Address?: any;
    };
    pagamentoVindi?: {
        bill_id: string;
        bill_code: string;
        amount: number;
        status: string;
        payment_method_code: string;
        pix?: {
            qr_code: string;
            pix: any;
        };
    };
    financeiro?: any;
    CreditoAvulso?: any;
    billDetails?: any;
    details?: any; // 
    paymentProfileId?: string; // PaymentProfileId já cadastrado na Vindi (para downgrade/upgrade)
}

export type CompraPlanoResponse = {
    message: string;
    assinaturaPlano?: any;
    pendingActivation?: boolean;
    status?: string;
}

export interface CreatePaymentProfileFromTokenParams {
    gateway_token: string;
    payment_company_code: string;
    customer_id: string;
}
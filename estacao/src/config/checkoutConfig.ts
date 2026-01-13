import { fetchPlanoById } from '@/store/planoStore';
import { fetchAddressByCep } from '@/services/viaCepService';
import {
    maskCardNumber,
    maskCardExpiry,
    isAddressComplete
} from '@/utils/validation';

export {
    fetchPlanoById,
    fetchAddressByCep,
    maskCardNumber,
    maskCardExpiry,
    isAddressComplete
};

// Definição dos tipos para os formulários
interface MainForm {
    cep: string;
    endereco: string;
    numero?: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    numeroCartao: string;
    validade: string;
    cvv: string;
}

interface Plano {
    ProductId?: string;
}

// Função para montar o objeto de endereço de cobrança
export function buildEnderecoCobranca(userId: string, mainForm: MainForm) {
    return {
        userId,
        cep: mainForm.cep,
        rua: mainForm.endereco,
        numero: mainForm.numero,
        complemento: mainForm.complemento,
        bairro: mainForm.bairro,
        cidade: mainForm.cidade,
        estado: mainForm.estado,
    };
}

// Função para montar o objeto de compra de plano
export function buildComprarPlanoPayload(planoId: string, assinaturaVindiId?: string) {
    return {
        planoId,
        metodoPagamento: "cartao_credito",
        ...(assinaturaVindiId && { assinaturaVindiId }),
    };
}

export function isMainFormValid(mainForm: { numeroCartao: string, validade: string }): string {
    // Removed duplicate isMainFormValid export to avoid redeclaration error
    const [mm, aa] = mainForm.validade.split('/');
    if (!mm || !aa) return "";
    const yyyy = aa.length === 2 ? `20${aa}` : aa;
    return `${mm}/${yyyy}`;
}

export function getCardBrand(cardNumber: string) {
    const digits = cardNumber.replace(/\D/g, "");
    if (/^4/.test(digits)) return "visa";
    if (/^5[1-5]/.test(digits)) return "mastercard";
    if (/^3[47]/.test(digits)) return "amex";
    if (/^(4011(78|79)|431274|438935|451416|457393|504175|5067[0-6][0-9]|50677[0-8]|509[0-9]{3}|627780|636297|636368|6500(31|32|33|34|35|36|37|38|39)|6504(03|04|05|06|07|08|09)|6504(10|11|12|13|14|15|16|17|18|19)|6507(01|02|03|04|05|06|07|08|09)|6516(52|53|54|55|56|57|58|59)|6550(00|01|02|03|04|05|06|07|08|09))/.test(digits)) return "elo";
    return "mastercard";
}

export function buildVindiPayload(planoId: string, mainForm: MainForm, plano?: Plano) {
    return {
        planoId: planoId,
        metodoPagamento: "credit_card",
        product_id: plano?.ProductId,
        card_expiration: formatCardExpiration(mainForm.validade),
        card_number: mainForm.numeroCartao,
        card_cvv: mainForm.cvv,
        payment_company_id: 6774,
        payment_company_code: getCardBrand(mainForm.numeroCartao)
    };
}

function formatCardExpiration(validade: string): string {
    // Expecting validade in "MM/YY" or "MM/YYYY" format, returns "YYYY-MM"
    if (!validade) return "";
    const [mm, aa] = validade.split('/');
    if (!mm || !aa) return "";
    const yyyy = aa.length === 2 ? `20${aa}` : aa;
    return `${yyyy}-${mm.padStart(2, '0')}`;
}


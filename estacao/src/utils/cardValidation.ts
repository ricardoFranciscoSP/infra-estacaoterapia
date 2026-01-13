import { luhnCheck } from '@/utils/securePayment';

// Função para mascarar número do cartão (aceita até 19 dígitos como no checkout)
export function maskCreditCard(value: string) {
    return value
        .replace(/\D/g, '')
        .slice(0, 19)
        .replace(/(\d{4})(?=\d)/g, '$1 ')
        .trim();
}

// Função para mascarar validade
export function maskCardExpiry(value: string) {
    let v = value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
    return v;
}

// Função para obter logo da bandeira (exemplo simples)
export function getCardLogo(numeroCartao: string) {
    const numero = numeroCartao.replace(/\s/g, '');

    if (/^4/.test(numero)) {
        return "/assets/icons/visa.svg";
    }
    if (/^5[1-5]/.test(numero)) {
        return "/assets/icons/mastercard.svg";
    }
    if (/^3[47]/.test(numero)) {
        return "/assets/icons/creditcard.svg"; // Usando ícone genérico para Amex
    }
    if (/^6(?:011|5)/.test(numero)) {
        return "/assets/icons/creditcard.svg"; // Usando ícone genérico para Discover
    }
    if (/^35(?:2[89]|[3-8][0-9])/.test(numero)) {
        return "/assets/icons/creditcard.svg"; // Usando ícone genérico para JCB
    }
    if (/^606282/.test(numero)) {
        return "/assets/icons/hipercard.svg";
    }
    return "/assets/icons/creditcard.svg";
}

// Validação do número do cartão usando Luhn (mesma lógica do checkout)
export function validateCardNumber(numero: string): string | null {
    if (!numero) return "Número do cartão é obrigatório";

    // Remove espaços e NBSP para validação (aceita formato com ou sem espaços)
    const cleanNumber = numero.replace(/[\s\u00A0]/g, '');

    // Valida formato: deve ter 16 dígitos (aceita com espaços ou sem)
    if (!/^(?:\d{4}[ \u00A0]?){3}\d{4}$/.test(numero) && cleanNumber.length !== 16) {
        return "Número inválido";
    }

    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
        return "Número do cartão deve ter entre 13 e 19 dígitos";
    }

    if (!luhnCheck(cleanNumber)) {
        return "Número do cartão inválido";
    }

    return null;
}

// Validação do nome do titular
export function validateCardholderName(nome: string): string | null {
    if (!nome) return "Nome do titular é obrigatório";

    if (nome.length < 2) {
        return "Nome deve ter pelo menos 2 caracteres";
    }

    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nome)) {
        return "Nome deve conter apenas letras e espaços";
    }

    return null;
}

// Validação da validade do cartão (mesma lógica do checkout)
export function validateCardExpiry(validade: string): string | null {
    if (!validade) return "Validade é obrigatória";

    // Valida formato MM/AA onde MM deve ser 01-12 (mesma regex do checkout)
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(validade)) {
        return "Validade inválida (MM/AA)";
    }

    const [mmStr, yyStr] = validade.split("/");
    const mm = Number(mmStr);
    const yy = Number(yyStr);
    
    if (!mm || !yy) {
        return "Validade inválida (MM/AA)";
    }

    // Evita datas expiradas: compara MM/AA com o mês atual (mesma lógica do checkout)
    const now = new Date();
    const curYY = now.getFullYear() % 100; // dois dígitos
    const curMM = now.getMonth() + 1;
    
    if (yy < curYY || (yy === curYY && mm < curMM)) {
        return "Cartão expirado";
    }

    return null;
}

// Validação do CVV (mesma lógica do checkout)
export function validateCVV(cvv: string): string | null {
    if (!cvv) return "CVV é obrigatório";

    // Aceita 3 ou 4 dígitos (mesma regex do checkout)
    if (!/^\d{3,4}$/.test(cvv)) {
        return "CVV inválido";
    }

    return null;
}

// Validação completa do formulário do cartão
export function validateCardForm(dados: {
    numero: string;
    nome: string;
    validade: string;
    cvv: string;
}): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    const numeroError = validateCardNumber(dados.numero);
    if (numeroError) errors.numero = numeroError;

    const nomeError = validateCardholderName(dados.nome);
    if (nomeError) errors.nome = nomeError;

    const validadeError = validateCardExpiry(dados.validade);
    if (validadeError) errors.validade = validadeError;

    const cvvError = validateCVV(dados.cvv);
    if (cvvError) errors.cvv = cvvError;

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}
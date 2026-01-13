export function getPasswordRequirements(password?: string) {
    return [
        {
            label: "Deve conter no mínimo 6 caracteres",
            valid: password && password.length >= 6,
        },
        {
            label: "Incluir pelo menos uma letra maiúscula e uma minúscula",
            valid: password && /[a-z]/.test(password) && /[A-Z]/.test(password),
        },
        {
            label: "Incluir pelo menos um número",
            valid: password && /\d/.test(password),
        },
        {
            label: "Incluir pelo menos um caractere especial: @ ! % $ & #",
            valid: password && /[@!%$&#]/.test(password),
        },
    ];
}

// Validação de email simples
export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validação de CPF (apenas formato, não dígito verificador)
export function isValidCPF(cpf: string): boolean {
    return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf) || /^\d{11}$/.test(cpf);
}

// Validação de CRP (formato básico)
export function isValidCRP(crp: string): boolean {
    return /^[0-9]{2,3}\/[0-9]{4,5}$/.test(crp) || /^[0-9]{6,8}$/.test(crp);
}

// DDDs válidos do Brasil (ANATEL)
const VALID_DDDS = [
    '11', '12', '13', '14', '15', '16', '17', '18', '19', // São Paulo
    '21', '22', '24', // Rio de Janeiro
    '27', '28', // Espírito Santo
    '31', '32', '33', '34', '35', '37', '38', // Minas Gerais
    '41', '42', '43', '44', '45', '46', // Paraná
    '47', '48', '49', // Santa Catarina
    '51', '53', '54', '55', // Rio Grande do Sul
    '61', // Distrito Federal
    '62', '64', // Goiás
    '63', // Tocantins
    '65', '66', // Mato Grosso
    '67', // Mato Grosso do Sul
    '68', // Acre
    '69', // Rondônia
    '71', '73', '74', '75', '77', // Bahia
    '79', // Sergipe
    '81', '87', // Pernambuco
    '82', // Alagoas
    '83', // Paraíba
    '84', // Rio Grande do Norte
    '85', '88', // Ceará
    '86', '89', // Piauí
    '91', '93', '94', // Pará
    '92', '97', // Amazonas
    '95', // Roraima
    '96', // Amapá
    '98', '99', // Maranhão
];

// Validação de telefone (formato brasileiro com DDD válido)
export function isValidTelefone(telefone: string): boolean {
    // Remove caracteres não numéricos
    const digits = telefone.replace(/\D/g, "");

    // Deve ter 10 dígitos (fixo) ou 11 dígitos (móvel)
    if (digits.length < 10 || digits.length > 11) {
        return false;
    }

    // Extrai o DDD (primeiros 2 dígitos)
    const ddd = digits.slice(0, 2);

    // Valida se o DDD existe
    if (!VALID_DDDS.includes(ddd)) {
        return false;
    }

    // Valida o número após o DDD
    const numero = digits.slice(2);

    if (numero.length === 9) {
        // Celular: deve começar com 9
        return numero.startsWith('9');
    } else if (numero.length === 8) {
        // Fixo: não deve começar com 9
        return !numero.startsWith('9');
    }

    return false;
}

// Validação de CEP
export function isValidCEP(cep: string): boolean {
    return /^\d{5}-?\d{3}$/.test(cep);
}

// Validação de data (yyyy-mm-dd)
export function isValidDate(date: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

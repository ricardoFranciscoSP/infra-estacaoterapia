// Validação de email
export function validateEmail(email: string): string | undefined {
    if (!email) return "E-mail é obrigatório";
    // Regex mais permissiva (permite subdomínios e '+')
    // Ex.: esther-peixoto90@digitalsj.com.br
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(email)) return "Digite um e-mail válido";
    return undefined;
}
// Validação de CPF
export function validateCPF(cpf: string): string | null {
    if (!cpf) return "CPF é obrigatório";
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return "CPF deve conter 11 dígitos";
    return null;
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

// Validação de telefone com DDD brasileiro
export function validatePhone(phone: string): string | undefined {
    if (!phone) return "Telefone é obrigatório";

    const digits = phone.replace(/\D/g, "");

    // Deve ter 10 dígitos (fixo) ou 11 dígitos (móvel)
    if (digits.length < 10 || digits.length > 11) {
        return "Digite um telefone válido";
    }

    // Extrai o DDD (primeiros 2 dígitos)
    const ddd = digits.slice(0, 2);

    // Valida se o DDD existe
    if (!VALID_DDDS.includes(ddd)) {
        return "DDD inválido";
    }

    // Valida o número após o DDD
    const numero = digits.slice(2);

    if (numero.length === 9) {
        // Celular: deve começar com 9
        if (!numero.startsWith('9')) {
            return "Celular deve começar com 9";
        }
    } else if (numero.length === 8) {
        // Fixo: não deve começar com 9
        if (numero.startsWith('9')) {
            return "Telefone fixo não pode começar com 9";
        }
    } else {
        return "Digite um telefone válido";
    }

    return undefined;
}

// Validação de senha
export function validatePassword(password: string, confirmPassword: string): string | null {
    if (!password) return "Senha é obrigatória";
    if (password.length < 8) return "A senha deve ter no mínimo 8 caracteres";
    if (!/[A-Z]/.test(password)) return "A senha deve conter letra maiúscula";
    if (!/[a-z]/.test(password)) return "A senha deve conter letra minúscula";
    if (!/\d/.test(password)) return "A senha deve conter número";
    if (!/[@!%$&#]/.test(password)) return "A senha deve conter caractere especial";
    if (!confirmPassword) return "Confirme sua senha";
    if (password !== confirmPassword) return "As senhas não coincidem";
    return null;
}

// Validação de data de nascimento
export function validateBirthDate(dateIso: string): string | null {
    if (!dateIso) return "Data de nascimento é obrigatória";
    const dob = new Date(dateIso);
    if (isNaN(dob.valueOf())) return "Data de nascimento inválida";
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const mDiff = today.getMonth() - dob.getMonth();
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < dob.getDate())) age--;
    if (age < 18) return "Idade mínima: 18 anos";
    return null;
}

// Validação de aceitação dos termos
export function validateTerms(accepted: boolean): string | null {
    if (!accepted) return "Você deve aceitar os termos de uso e a política de privacidade";
    return null;
}
// Requisitos de senha para cadastro de paciente
export function getPasswordRequirements(senha: string) {
    return [
        {
            label: "Deve conter no mínimo 8 caracteres",
            valid: senha && senha.length >= 8,
        },
        {
            label: "Incluir pelo menos uma letra maiúscula e uma minúscula",
            valid: senha && /[a-z]/.test(senha) && /[A-Z]/.test(senha),
        },
        {
            label: "Incluir pelo menos um número",
            valid: senha && /\d/.test(senha),
        },
        {
            label: "Incluir pelo menos um caractere especial: ! @ % $ &",
            valid: senha && /[!@%$&]/.test(senha),
        },
    ];
}
// Máscara para número do cartão
export function maskCardNumber(value: string) {
    return value
        .replace(/\D/g, "")
        .replace(/(\d{4})(?=\d)/g, "$1 ")
        .trim()
        .slice(0, 19);
}

// Máscara para validade do cartão
export function maskCardExpiry(value: string) {
    return value
        .replace(/\D/g, "")
        .replace(/^(\d{2})(\d)/, "$1/$2")
        .slice(0, 5);
}

// Validação do formulário principal
export function isMainFormValid(form: {
    descricao: string;
    numeroCartao: string;
    nomeTitular: string;
    validade: string;
    cvv: string;
    cep: string;
    endereco: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
}) {
    return (
        form.descricao &&
        form.numeroCartao.replace(/\s/g, "").length >= 13 &&
        form.nomeTitular &&
        /^\d{2}\/\d{2}$/.test(form.validade) &&
        form.cvv.length >= 3 &&
        form.cep &&
        form.endereco &&
        form.numero &&
        form.bairro &&
        form.cidade &&
        form.estado
    );
}

// Validação de endereço completo
export function isAddressComplete(addr: {
    cep: string;
    endereco: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
}) {
    return (
        addr.cep &&
        addr.endereco &&
        addr.numero &&
        addr.bairro &&
        addr.cidade &&
        addr.estado
    );
}

export function formatarData(dataIso: string) {
    if (!dataIso) return '';
    const d = new Date(dataIso);
    return d.toLocaleDateString('pt-BR');
}

export function validadeConsultas(createdAt: string) {
    if (!createdAt) return '';
    const d = new Date(createdAt);
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('pt-BR');
}

export function capitalize(str: string) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

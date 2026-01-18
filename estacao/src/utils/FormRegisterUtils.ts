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

// Validação de telefone (formato brasileiro com DDD válido)
export function isValidTelefone(telefone: string): boolean {
    // Remove caracteres não numéricos
    const digits = telefone.replace(/\D/g, "");

    // Validação genérica internacional (E.164)
    if (digits.length >= 6 && digits.length <= 15) {
        return true;
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

// Máscara inteligente para CPF ou CNPJ
export function maskCpfCnpj(value: string): string {
    const numeric = value.replace(/\D/g, "");
    if (numeric.length <= 11) {
        // CPF: 000.000.000-00
        return numeric
            .replace(/^(\d{3})(\d)/, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
            .slice(0, 14);
    } else {
        // CNPJ: 00.000.000/0000-00
        return numeric
            .replace(/^(\d{2})(\d)/, "$1.$2")
            .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
            .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5")
            .slice(0, 18);
    }
}

// Máscara para CRP Autônomo: 00/000000 (2 dígitos + / + 6 dígitos)
export function maskCrpAutonomo(value: string): string {
    // Permite números e letras, mas remove caracteres especiais exceto a barra
    const clean = value.replace(/[^\dA-Za-z\/]/g, "").toUpperCase();
    
    if (clean.length <= 2) {
        return clean;
    }
    
    // Adiciona a barra após os dois primeiros caracteres
    const parts = clean.split("/");
    if (parts.length === 1) {
        // Se não tem barra, adiciona após 2 caracteres
        const firstPart = clean.slice(0, 2);
        const secondPart = clean.slice(2, 8); // máximo 6 caracteres após a barra
        return secondPart ? `${firstPart}/${secondPart}` : firstPart;
    } else {
        // Se já tem barra, mantém o formato
        const firstPart = parts[0].slice(0, 2);
        const secondPart = parts.slice(1).join("").slice(0, 6);
        return secondPart ? `${firstPart}/${secondPart}` : firstPart;
    }
}

// Máscara para CRP Pessoa Jurídica: 00/0000/J (2 dígitos + / + 4 dígitos + / + 1 letra)
export function maskCrpJuridico(value: string): string {
    // Permite números e letras, mas remove caracteres especiais exceto as barras
    const clean = value.replace(/[^\dA-Za-z\/]/g, "").toUpperCase();
    
    if (clean.length <= 2) {
        return clean.replace(/\D/g, "").slice(0, 2);
    }
    
    // Divide por barras
    const parts = clean.split("/");
    const firstPart = (parts[0] || "").replace(/\D/g, "").slice(0, 2);
    
    if (parts.length === 1) {
        // Se não tem barra, adiciona após 2 dígitos
        const remaining = clean.slice(2);
        const secondPart = remaining.replace(/\D/g, "").slice(0, 4);
        const letter = remaining.replace(/[^A-Z]/g, "").slice(0, 1);
        
        if (letter && secondPart.length === 4) {
            return `${firstPart}/${secondPart}/${letter}`;
        } else if (secondPart) {
            return `${firstPart}/${secondPart}`;
        } else {
            return firstPart;
        }
    } else if (parts.length === 2) {
        // Se tem uma barra
        const secondPart = parts[1].replace(/\D/g, "").slice(0, 4);
        const letter = parts[1].replace(/[^A-Z]/g, "").slice(0, 1);
        
        if (letter && secondPart.length === 4) {
            return `${firstPart}/${secondPart}/${letter}`;
        } else if (secondPart) {
            return `${firstPart}/${secondPart}`;
        } else {
            return firstPart;
        }
    } else {
        // Se já tem duas barras
        const secondPart = (parts[1] || "").replace(/\D/g, "").slice(0, 4);
        const thirdPart = (parts[2] || "").replace(/[^A-Z]/g, "").slice(0, 1);
        
        if (thirdPart && secondPart.length === 4) {
            return `${firstPart}/${secondPart}/${thirdPart}`;
        } else if (secondPart) {
            return `${firstPart}/${secondPart}`;
        } else {
            return firstPart;
        }
    }
}

// Máscara genérica para CRP (mantida para compatibilidade, usa formato autônomo por padrão)
export function maskCrp(value: string): string {
    return maskCrpAutonomo(value);
}

// Máscara para telefone brasileiro: (99) 99999-9999 ou (99) 9999-9999
export function maskTelefone(value: string): string {
    const numeric = value.replace(/\D/g, "").slice(0, 11);
    const ddd = numeric.slice(0, 2);
    const rest = numeric.slice(2);

    if (!ddd) return "";
    if (numeric.length <= 2) return ddd;
    if (rest.length <= 4) return `(${ddd}) ${rest}`.trim();
    if (rest.length <= 8) {
        return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`.trim();
    }
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`.trim();
}

// Máscara inteligente para CPF
export function maskCpf(value: string): string {
    // Remove tudo que não é número
    value = value.replace(/\D/g, "");
    // Aplica a máscara: 000.000.000-00
    return value
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
        .slice(0, 14);
}

// Máscara para CEP: 00000-000
export function maskCep(value: string): string {
    return value.replace(/\D/g, "").replace(/^(\d{5})(\d{0,3})/, "$1-$2").slice(0, 9);
}

// Máscara para validade de cartão: 00/00
export function maskExpiry(value: string): string {
    let v = value.replace(/\D/g, '').slice(0, 6);
    if (v.length >= 3) v = v.replace(/^(\d{2})(\d{1,4})/, '$1/$2');
    return v;
}

// Máscara para mês/ano: mm/yyyy
export function maskMonthYear(value: string): string {
    const numeric = value.replace(/\D/g, "");
    // Limita a 2 dígitos para mês e 4 para ano
    if (numeric.length <= 2) {
        return numeric;
    }
    // Formato: mm/yyyy
    return numeric.replace(/^(\d{2})(\d{0,4})/, "$1/$2").slice(0, 7);
}

// Converte mm/yyyy para yyyy-mm-dd (primeiro dia do mês)
export function monthYearToDate(monthYear: string): string {
    if (!monthYear || monthYear.trim() === "") return "";
    const parts = monthYear.split("/");
    if (parts.length !== 2) return "";
    const month = parseInt(parts[0], 10);
    const year = parseInt(parts[1], 10);
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return "";
    // Retorna yyyy-mm-dd (primeiro dia do mês)
    return `${year}-${String(month).padStart(2, "0")}-01`;
}

// Converte yyyy-mm-dd ou mm/yyyy para mm/yyyy
export function dateToMonthYear(date: string): string {
    if (!date || date.trim() === "") return "";
    // Se já está no formato mm/yyyy, retorna como está
    if (date.includes("/") && date.length === 7) {
        return date;
    }
    // Se está no formato yyyy-mm-dd
    if (date.includes("-")) {
        const parts = date.split("-");
        if (parts.length >= 2) {
            const year = parts[0];
            const month = parts[1];
            return `${month}/${year}`;
        }
    }
    // Tenta parsear como Date
    try {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const year = d.getFullYear();
            return `${month}/${year}`;
        }
    } catch {
        // Ignora erro
    }
    return "";
}

// Máscara para data DD/MM/YYYY
export function maskDate(value: string): string {
    // Remove tudo que não é número
    const numeric = value.replace(/\D/g, "");
    
    // Limita a 8 dígitos (DDMMYYYY)
    const limited = numeric.slice(0, 8);
    
    // Aplica a máscara: DD/MM/YYYY
    if (limited.length <= 2) {
        return limited;
    } else if (limited.length <= 4) {
        return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    } else {
        return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
}

// Função para tratar backspace/delete em campos com máscara
// Remove o dígito anterior quando o cursor está em um caractere de máscara
export function handleMaskedBackspace(
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: string,
    maskFn: (value: string) => string,
    setValue: (value: string) => void
): void {
    if (e.key !== 'Backspace' && e.key !== 'Delete') {
        return;
    }

    const input = e.currentTarget;
    const cursorPosition = input.selectionStart || 0;
    const selectionEnd = input.selectionEnd || 0;
    const value = currentValue;

    // Se não há valor, não faz nada
    if (!value || value.length === 0) {
        return;
    }

    // Caracteres de máscara comuns
    const maskChars = ['-', '.', '/', '(', ')', ' '];

    // Se há seleção, remove normalmente
    if (cursorPosition !== selectionEnd) {
        return;
    }

    // Se o cursor está em um caractere de máscara (backspace)
    if (e.key === 'Backspace' && cursorPosition > 0 && maskChars.includes(value[cursorPosition - 1])) {
        e.preventDefault();
        
        // Remove o dígito anterior ao caractere de máscara
        const beforeMask = value.slice(0, cursorPosition - 1);
        const afterMask = value.slice(cursorPosition);
        
        // Encontra o último dígito antes do caractere de máscara
        let lastDigitIndex = beforeMask.length - 1;
        while (lastDigitIndex >= 0 && maskChars.includes(beforeMask[lastDigitIndex])) {
            lastDigitIndex--;
        }
        
        if (lastDigitIndex >= 0) {
            // Remove o último dígito encontrado
            const newValue = beforeMask.slice(0, lastDigitIndex) + afterMask;
            const maskedValue = maskFn(newValue);
            setValue(maskedValue);
            
            // Reposiciona o cursor após a máscara ser aplicada
            setTimeout(() => {
                // Calcula a nova posição do cursor baseado na posição do dígito removido
                const digitsBefore = beforeMask.slice(0, lastDigitIndex).replace(/\D/g, '').length;
                let newCursorPos = 0;
                let digitCount = 0;
                
                for (let i = 0; i < maskedValue.length; i++) {
                    if (/\d/.test(maskedValue[i])) {
                        digitCount++;
                        if (digitCount === digitsBefore) {
                            newCursorPos = i + 1;
                            break;
                        }
                    }
                }
                
                input.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
        }
    }
    // Se o cursor está em um caractere de máscara (delete)
    else if (e.key === 'Delete' && cursorPosition < value.length && maskChars.includes(value[cursorPosition])) {
        e.preventDefault();
        
        // Remove o dígito após o caractere de máscara
        const beforeMask = value.slice(0, cursorPosition);
        const afterMask = value.slice(cursorPosition + 1);
        
        // Encontra o primeiro dígito após o caractere de máscara
        let firstDigitIndex = 0;
        while (firstDigitIndex < afterMask.length && maskChars.includes(afterMask[firstDigitIndex])) {
            firstDigitIndex++;
        }
        
        if (firstDigitIndex < afterMask.length) {
            // Remove o primeiro dígito encontrado
            const newValue = beforeMask + afterMask.slice(0, firstDigitIndex) + afterMask.slice(firstDigitIndex + 1);
            const maskedValue = maskFn(newValue);
            setValue(maskedValue);
            
            // Mantém o cursor na mesma posição
            setTimeout(() => {
                input.setSelectionRange(cursorPosition, cursorPosition);
            }, 0);
        }
    }
}
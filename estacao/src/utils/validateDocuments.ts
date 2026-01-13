// utils/validateDocuments.ts
export function isValidCPF(cpf: string): boolean {
    cpf = cpf.replace(/\D/g, "");

    if (!cpf || cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false; // evita repetidos tipo 111.111.111-11

    let soma = 0;
    let resto;

    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    return resto === parseInt(cpf.substring(10, 11));
}

export function isValidCNPJ(cnpj: string): boolean {
    cnpj = cnpj.replace(/\D/g, "");
    if (!cnpj || cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false; // evita repetidos tipo 11.111.111/1111-11

    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    const digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += +numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== +digitos.charAt(0)) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += +numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    return resultado === +digitos.charAt(1);
}


// utils/validateDocuments.ts
export function isValidCRP(crp: string): boolean {
    if (!crp) return false;

    const clean = crp.trim().toUpperCase();

    // Remove caracteres especiais para validar apenas alfanuméricos
    const alphanumeric = clean.replace(/[^A-Z0-9]/g, '');

    // Deve ter entre 1 e 12 caracteres alfanuméricos
    if (alphanumeric.length < 1 || alphanumeric.length > 12) return false;

    // Verifica se contém apenas letras e números
    if (!/^[A-Z0-9]+$/.test(alphanumeric)) return false;

    return true;
}

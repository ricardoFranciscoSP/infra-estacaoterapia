/**
 * Helper para sanitizar dados sensíveis antes de registrar na auditoria
 * Respeitando LGPD - não armazena senhas, CPFs completos, dados bancários completos, etc.
 */

/**
 * Mascara CPF: mantém apenas os últimos 4 dígitos
 */
export function maskCpf(cpf: string | null | undefined): string | null {
    if (!cpf) return null;
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return '***.***.***-**';
    return `***.***.${cleaned.slice(-4)}`;
}

/**
 * Mascara email: mantém apenas o prefixo e domínio, oculta o meio
 */
export function maskEmail(email: string | null | undefined): string | null {
    if (!email) return null;
    const [prefix, domain] = email.split('@');
    if (!domain) return email;
    if (prefix.length <= 2) return `${prefix}***@${domain}`;
    return `${prefix.slice(0, 2)}***@${domain}`;
}

/**
 * Mascara dados bancários (conta, agência): mantém apenas últimos 4 dígitos
 */
export function maskBankAccount(account: string | null | undefined): string | null {
    if (!account) return null;
    const cleaned = account.replace(/\D/g, '');
    if (cleaned.length < 4) return '****';
    return `****${cleaned.slice(-4)}`;
}

/**
 * Mascara cartão de crédito: mantém apenas últimos 4 dígitos
 */
export function maskCreditCard(card: string | null | undefined): string | null {
    if (!card) return null;
    const cleaned = card.replace(/\D/g, '');
    if (cleaned.length < 4) return '****';
    return `****${cleaned.slice(-4)}`;
}

/**
 * Remove senhas e tokens sensíveis de objetos
 */
export function sanitizeSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = { ...data };
    
    // Campos que nunca devem ser logados
    const sensitiveFields = [
        'password',
        'senha',
        'Password',
        'Senha',
        'token',
        'Token',
        'secret',
        'Secret',
        'apiKey',
        'apikey',
        'api_key',
        'accessToken',
        'access_token',
        'refreshToken',
        'refresh_token',
        'authorization',
        'Authorization',
    ];

    for (const field of sensitiveFields) {
        if (field in sanitized) {
            delete sanitized[field];
        }
    }

    // Sanitiza campos específicos
    if ('cpf' in sanitized && typeof sanitized.cpf === 'string') {
        sanitized.cpf = maskCpf(sanitized.cpf);
    }
    if ('Cpf' in sanitized && typeof sanitized.Cpf === 'string') {
        sanitized.Cpf = maskCpf(sanitized.Cpf);
    }
    if ('email' in sanitized && typeof sanitized.email === 'string') {
        sanitized.email = maskEmail(sanitized.email);
    }
    if ('Email' in sanitized && typeof sanitized.Email === 'string') {
        sanitized.Email = maskEmail(sanitized.Email);
    }
    if ('numeroConta' in sanitized && typeof sanitized.numeroConta === 'string') {
        sanitized.numeroConta = maskBankAccount(sanitized.numeroConta);
    }
    if ('numeroCartao' in sanitized && typeof sanitized.numeroCartao === 'string') {
        sanitized.numeroCartao = maskCreditCard(sanitized.numeroCartao);
    }
    if ('cardLast4' in sanitized && typeof sanitized.cardLast4 === 'string') {
        // cardLast4 já está mascarado, mas pode remover se necessário
    }

    return sanitized;
}

/**
 * Cria metadata sanitizado para auditoria
 */
export function createAuditMetadata(data: Record<string, unknown>): Record<string, unknown> {
    return sanitizeSensitiveData(data);
}


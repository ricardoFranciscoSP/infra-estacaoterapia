/**
 * Validação da configuração da chave pública Vindi
 * Este arquivo é carregado no startup da aplicação
 * Compatível 100% com Docker
 */

/**
 * Interface para resultado de validação
 */
interface ValidationResult {
    isValid: boolean;
    message: string;
    vindiKeyConfigured: boolean;
    vindiKeyLength?: number;
    environment: string;
    timestamp: string;
}

/**
 * Valida se a chave pública da Vindi está configurada corretamente
 * Executada durante o startup da aplicação (server-side)
 */
export function validateVindiConfiguration(): ValidationResult {
    const vindiPublicKey = process.env.VINDI_PUBLIC_KEY || process.env.NEXT_PUBLIC_VINDI_PUBLIC_KEY;
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    const result: ValidationResult = {
        isValid: true,
        message: '✅ Chave pública da Vindi configurada corretamente',
        vindiKeyConfigured: !!vindiPublicKey,
        environment: nodeEnv,
        timestamp: new Date().toISOString()
    };

    // Verificação 1: Chave não está vazia
    if (!vindiPublicKey || vindiPublicKey.trim() === '') {
        result.isValid = false;
        result.message = isProduction
            ? '❌ ERRO: Chave pública da Vindi não configurada. Configure VINDI_PUBLIC_KEY no Docker (environment ou /opt/secrets/nextjs.env)'
            : '⚠️ AVISO: Chave pública da Vindi não configurada. Configure VINDI_PUBLIC_KEY em .env.local ou variáveis de ambiente';
        result.vindiKeyConfigured = false;
        return result;
    }

    // Verificação 2: Chave não contém placeholder
    if (vindiPublicKey.includes('__PLACEHOLDER_')) {
        result.isValid = false;
        result.message = isProduction
            ? `❌ ERRO: Chave pública da Vindi contém placeholder. Configure o valor real em VINDI_PUBLIC_KEY no Docker.`
            : `⚠️ AVISO: Chave pública da Vindi contém placeholder. Configure o valor real em VINDI_PUBLIC_KEY`;
        result.vindiKeyConfigured = false;
        return result;
    }

    // Verificação 3: Chave tem tamanho razoável (chaves públicas Vindi têm mais de 20 caracteres)
    if (vindiPublicKey.length < 20) {
        result.isValid = false;
        result.message = `❌ ERRO: Chave pública da Vindi muito curta (${vindiPublicKey.length} chars). Verifique se a configuração está correta.`;
        result.vindiKeyConfigured = false;
        return result;
    }

    result.vindiKeyLength = vindiPublicKey.length;
    return result;
}

/**
 * Função para log da validação (usa durante inicialização do servidor)
 * NÃO bloqueia o startup - apenas registra warnings
 */
export function logVindiValidation(): void {
    const validation = validateVindiConfiguration();

    if (validation.isValid) {
        console.log(
            `[VINDI] ✅ Chave configurada (${validation.vindiKeyLength} chars)`
        );
    } else {
        // Apenas warning em produção - NÃO bloqueia startup
        console.warn(
            `[VINDI] ⚠️ ${validation.message}`
        );
    }
}

/**
 * Verifica a configuração e retorna booleano para uso em middleware
 */
export function isVindiConfigured(): boolean {
    const validation = validateVindiConfiguration();
    return validation.isValid;
}

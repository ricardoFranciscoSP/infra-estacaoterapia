/**
 * Arquivo de inicialização do servidor Next.js
 * Carregado automaticamente pelo Next.js na inicialização
 * 
 * Compatível 100% com Docker - permite inicialização mesmo sem VINDI_PUBLIC_KEY
 * A validação ocorre apenas quando a chave é necessária (na requisição de pagamento)
 */

// Log de startup apenas (sem falhar)
if (typeof window === 'undefined') {
    const vindiKey = process.env.VINDI_PUBLIC_KEY || process.env.NEXT_PUBLIC_VINDI_PUBLIC_KEY;
    console.log('[Startup] Vindi configuração:', {
        hasVindiKey: !!vindiKey,
        isDev: process.env.NODE_ENV === 'development',
        timestamp: new Date().toISOString()
    });
}

export { };

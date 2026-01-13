/**
 * Utilitários de ambiente que funcionam tanto no cliente quanto no servidor
 * Não depende de next/headers, então pode ser usado em componentes cliente
 */

/**
 * Verifica se é ambiente PRE/Staging
 * Detecta por variável de ambiente ou pelo hostname
 */
export function isPreEnvironment(): boolean {
  // Verifica variáveis de ambiente primeiro
  if (process.env.APP_ENV === 'pre' || 
      process.env.NEXT_PUBLIC_APP_ENV === 'pre') {
    return true;
  }

  // Detecta pelo hostname (funciona tanto no servidor quanto no cliente)
  if (typeof window !== 'undefined') {
    // Cliente: usa window.location.hostname
    const hostname = window.location.hostname;
    return hostname === 'pre.estacaoterapia.com.br' || 
           hostname.startsWith('pre.');
  } else {
    // Servidor: verifica pela URL do website configurada
    const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || '';
    return websiteUrl.includes('pre.estacaoterapia.com.br') ||
           websiteUrl.includes('pre.');
  }
}

/**
 * Verifica se é ambiente de produção
 */
export function isProductionEnvironment(): boolean {
  return process.env.APP_ENV === 'production' || 
         process.env.NEXT_PUBLIC_APP_ENV === 'production';
}
















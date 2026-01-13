/**
 * Biblioteca de utilitários para controle de modo de manutenção
 * 
 * Funcionalidades:
 * - Verificação de modo de manutenção
 * - Verificação de permissões de administrador
 * - Rotas permitidas durante manutenção
 */

import { cookies } from 'next/headers';
import { getApiUrl as getApiUrlFromEnv } from '@/config/env';

/**
 * Rotas que permanecem acessíveis mesmo durante modo de manutenção
 */
export const ALLOWED_MAINTENANCE_ROUTES = [
  '/manutencao',
  '/login-admin',
  '/adm-estacao',
  '/api/auth/admin',
  '/api/configuracoes/manutencao',
];

/**
 * Padrões de rotas que devem ser sempre permitidas (assets, etc)
 */
export const ALWAYS_ALLOWED_PATTERNS = [
  '/_next',
  '/assets',
  '/favicon',
  '/icon',
  '/sounds',
  '/banner',
  '/public',
  '/.well-known',
];

/**
 * Verifica se o sistema está em modo de manutenção
 * Prioridade: ENV > API > Cache
 */
export async function isMaintenanceMode(): Promise<boolean> {
  // 1. Verifica variável de ambiente (prioridade máxima)
  if (process.env.MAINTENANCE_MODE === 'true') {
    return true;
  }

  // 2. Se não estiver forçado por ENV, verifica API
  try {
    const apiUrl = getApiUrl();
    // Remove barra final e /backend duplicado se houver
    let cleanApiUrl = apiUrl.replace(/\/$/, '').replace(/\/backend\/?$/, '');
    
    // Garante que não tenha /api duplicado
    if (cleanApiUrl.endsWith('/api')) {
      cleanApiUrl = cleanApiUrl.replace(/\/api$/, '');
    }
    
    const maintenanceUrl = `${cleanApiUrl}/api/configuracoes/manutencao`;
    console.log('🔍 [Maintenance] Verificando manutenção em:', maintenanceUrl);
    
    const response = await fetch(maintenanceUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      // Timeout de 3 segundos para não travar o middleware
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      console.warn('Falha ao verificar modo manutenção, assumindo OFF');
      return false;
    }

    const data = await response.json();
    return data.manutencao === true;
  } catch (error) {
    console.error('Erro ao verificar modo de manutenção:', error);
    // Em caso de erro, assume que não está em manutenção para não bloquear
    return false;
  }
}

/**
 * Verifica se o usuário é administrador
 * Baseado no role armazenado no cookie ou token
 */
export async function isAdminUser(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    
    // Verifica cookie de role (setado pelo backend)
    const userRole = cookieStore.get('userRole')?.value;
    
    if (userRole === 'Admin' || userRole === 'ADMIN') {
      return true;
    }

    // Fallback: verifica token JWT se existir
    const token = cookieStore.get('token')?.value || cookieStore.get('authToken')?.value;
    
    if (token) {
      // Decodifica JWT (sem validar - só para ler role)
      try {
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString()
        );
        return payload.role === 'Admin' || payload.role === 'ADMIN';
      } catch {
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error('Erro ao verificar admin:', error);
    return false;
  }
}

/**
 * Verifica se a rota está na lista de rotas permitidas
 */
export function isAllowedRoute(pathname: string): boolean {
  // Verifica rotas exatas
  if (ALLOWED_MAINTENANCE_ROUTES.some(route => pathname.startsWith(route))) {
    return true;
  }

  // Verifica padrões sempre permitidos (assets, etc)
  if (ALWAYS_ALLOWED_PATTERNS.some(pattern => pathname.startsWith(pattern))) {
    return true;
  }

  return false;
}

/**
 * Obtém a URL da API baseada no ambiente
 * Usa a configuração centralizada de ambiente com validação
 */
export function getApiUrl(): string {
  let apiUrl: string;
  
  try {
    apiUrl = getApiUrlFromEnv();
  } catch {
    // Se getApiUrlFromEnv() falhar, detecta manualmente
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'pre.estacaoterapia.com.br' || hostname.startsWith('pre.')) {
        apiUrl = 'https://api.pre.estacaoterapia.com.br';
      } else if (hostname === 'estacaoterapia.com.br' || hostname === 'www.estacaoterapia.com.br') {
        apiUrl = 'https://api-prd.estacaoterapia.com.br';
      } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        apiUrl = 'http://localhost:3333';
      } else {
        apiUrl = 'https://api.pre.estacaoterapia.com.br'; // Fallback seguro
      }
    } else {
      // SSR: detecta pela variável de ambiente ou usa fallback
      const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || '';
      if (websiteUrl.includes('pre.estacaoterapia.com.br') || websiteUrl.includes('pre.')) {
        apiUrl = 'https://api.pre.estacaoterapia.com.br';
      } else {
        apiUrl = 'https://api-prd.estacaoterapia.com.br';
      }
    }
  }
  
  // Valida que a URL não seja o domínio raiz incorreto
  const invalidUrls = [
    'https://estacaoterapia.com.br',
    'http://estacaoterapia.com.br',
    'https://www.estacaoterapia.com.br',
    'http://www.estacaoterapia.com.br'
  ];
  
  if (invalidUrls.includes(apiUrl)) {
    // Se for domínio raiz incorreto, detecta pelo hostname
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'pre.estacaoterapia.com.br' || hostname.startsWith('pre.')) {
        apiUrl = 'https://api.pre.estacaoterapia.com.br';
      } else {
        apiUrl = 'https://api-prd.estacaoterapia.com.br';
      }
    } else {
      // SSR: usa pré-produção como fallback seguro
      apiUrl = 'https://api.pre.estacaoterapia.com.br';
    }
  }
  
  return apiUrl;
}

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

/**
 * Obtém configuração de robots baseada no ambiente
 */
export function getRobotsConfig() {
  if (isPreEnvironment()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
      host: undefined,
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/adm-estacao', '/api/'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/sitemap.xml`,
  };
}

/**
 * Obtém meta tags de SEO baseadas no ambiente
 */
export function getSEOMetaTags() {
  if (isPreEnvironment()) {
    return {
      robots: 'noindex, nofollow',
      googlebot: 'noindex, nofollow',
    };
  }

  return {
    robots: 'index, follow',
    googlebot: 'index, follow',
  };
}
/**
 * Busca o último acesso registrado no sistema
 */
export async function getUltimoAcesso(): Promise<{
  data: string;
  usuario?: string;
  erro?: string;
} | null> {
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/estacao/ultimo-acesso`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      console.warn('Erro ao buscar último acesso - status:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.ultimoAcesso) {
      return null;
    }

    // Formata a data para o padrão brasileiro
    const dataAcesso = new Date(data.ultimoAcesso);
    const dataFormatada = dataAcesso.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return {
      data: dataFormatada,
      usuario: data.usuario,
    };
  } catch (error) {
    console.error('Erro ao buscar último acesso:', error);
    return null;
  }
}
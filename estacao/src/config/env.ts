/**
 * Configuração e validação de variáveis de ambiente
 * 
 * Define e valida 3 ambientes:
 * - Produção: https://api-prd.estacaoterapia.com.br
 * - Homologação: https://api.estacaoterapia.com.br
 * - Desenvolvimento: http://localhost:3333
 */

/**
 * Tipos de ambiente disponíveis
 */
export type Environment = 'production' | 'staging' | 'development';

/**
 * URLs esperadas para cada ambiente
 */
export const ENVIRONMENT_URLS: Record<Environment, string> = {
  production: 'https://api-prd.estacaoterapia.com.br',
  staging: 'https://api.pre.estacaoterapia.com.br',
  development: 'http://localhost:3333',
} as const;

/**
 * Interface para configuração de ambiente
 */
export interface EnvironmentConfig {
  environment: Environment;
  apiUrl: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Valida se uma URL corresponde ao formato esperado
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normaliza URLs antigas/incorretas para as URLs esperadas
 * Mapeia URLs conhecidas que devem ser tratadas como equivalentes
 */
function normalizeApiUrl(url: string): string {
  // Remove barra final para comparação
  const cleanUrl = url.replace(/\/$/, '').toLowerCase();

  // Mapeamento de URLs antigas/incorretas para URLs corretas
  const urlMappings: Record<string, string> = {
    'https://estacaoterapia.com.br/backend': ENVIRONMENT_URLS.staging,
    'https://www.estacaoterapia.com.br/backend': ENVIRONMENT_URLS.staging,
    'http://estacaoterapia.com.br/backend': ENVIRONMENT_URLS.staging,
    'http://www.estacaoterapia.com.br/backend': ENVIRONMENT_URLS.staging,
  };

  // Se houver mapeamento, retorna a URL normalizada
  if (urlMappings[cleanUrl]) {
    return urlMappings[cleanUrl];
  }

  // Caso contrário, retorna a URL original
  return url.replace(/\/$/, '');
}

/**
 * Valida se a URL corresponde a um dos ambientes esperados
 */
function validateUrlAgainstEnvironments(url: string): {
  matches: boolean;
  environment: Environment | null;
  errors: string[];
} {
  const errors: string[] = [];

  if (!url || url.trim() === '') {
    errors.push('URL da API não está definida');
    return { matches: false, environment: null, errors };
  }

  if (url.includes('__PLACEHOLDER_')) {
    errors.push('URL contém placeholder e não foi configurada corretamente');
    return { matches: false, environment: null, errors };
  }

  if (!isValidUrl(url)) {
    errors.push(`URL inválida: ${url}`);
    return { matches: false, environment: null, errors };
  }

  // Normaliza a URL (mapeia URLs antigas para URLs corretas)
  const normalizedUrl = normalizeApiUrl(url);

  // Verifica se corresponde a algum ambiente
  for (const [env, expectedUrl] of Object.entries(ENVIRONMENT_URLS)) {
    if (normalizedUrl === expectedUrl) {
      return {
        matches: true,
        environment: env as Environment,
        errors: []
      };
    }
  }

  errors.push(
    `URL não corresponde a nenhum ambiente esperado. ` +
    `URL recebida: ${url.replace(/\/$/, '')}. ` +
    `URLs esperadas: ${Object.values(ENVIRONMENT_URLS).join(', ')}`
  );

  return { matches: false, environment: null, errors };
}

/**
 * Detecta o ambiente baseado na variável de ambiente NEXT_PUBLIC_API_URL
 */
export function detectEnvironment(): EnvironmentConfig {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const normalizedUrl = normalizeApiUrl(apiUrl || '');
  const validation = validateUrlAgainstEnvironments(apiUrl);

  if (validation.matches && validation.environment) {
    return {
      environment: validation.environment,
      apiUrl: normalizedUrl,
      isValid: true,
      errors: [],
    };
  }

  // Se não encontrou correspondência, tenta detectar pelo NODE_ENV
  const nodeEnv = process.env.NODE_ENV;

  if (nodeEnv === 'production') {
    // Em produção, assume produção se não houver URL configurada
    return {
      environment: 'production',
      apiUrl: ENVIRONMENT_URLS.production,
      isValid: false,
      errors: [
        ...validation.errors,
        'NEXT_PUBLIC_API_URL não está configurada corretamente para produção',
      ],
    };
  }

  // Em desenvolvimento, assume desenvolvimento
  return {
    environment: 'development',
    apiUrl: ENVIRONMENT_URLS.development,
    isValid: false,
    errors: [
      ...validation.errors,
      'NEXT_PUBLIC_API_URL não está configurada corretamente para desenvolvimento',
    ],
  };
}

/**
 * Obtém a URL da API baseada no ambiente detectado
 * Prioriza variável de ambiente, depois detecta automaticamente
 */
export function getApiUrl(): string {
  const config = detectEnvironment();

  if (config.isValid) {
    return config.apiUrl;
  }

  // 🚫 NUNCA adivinhar ambiente no servidor
  if (typeof window === 'undefined') {
    throw new Error(
      `Configuração inválida de ambiente.\n${config.errors.join('\n')}`
    );
  }

  // Cliente pode usar hostname como fallback
  const hostname = window.location.hostname;

  if (hostname === 'pre.estacaoterapia.com.br') {
    return ENVIRONMENT_URLS.staging;
  }

  if (hostname === 'estacaoterapia.com.br' || hostname === 'www.estacaoterapia.com.br') {
    return ENVIRONMENT_URLS.production;
  }

  return ENVIRONMENT_URLS.development;
}


/**
 * Valida as configurações de ambiente no build
 * Deve ser chamado no next.config.ts
 */
export function validateEnvironmentConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl || apiUrl.trim() === '') {
    errors.push('NEXT_PUBLIC_API_URL não está definida');
    return { isValid: false, errors, warnings };
  }

  if (apiUrl.includes('__PLACEHOLDER_')) {
    errors.push('NEXT_PUBLIC_API_URL contém placeholder e não foi configurada');
    return { isValid: false, errors, warnings };
  }

  const validation = validateUrlAgainstEnvironments(apiUrl);

  if (!validation.matches) {
    errors.push(...validation.errors);
    return { isValid: false, errors, warnings };
  }

  // Validações adicionais baseadas no ambiente detectado
  if (validation.environment === 'production') {
    if (process.env.NODE_ENV !== 'production') {
      warnings.push(
        'NODE_ENV não está definido como "production" mas a URL da API aponta para produção'
      );
    }
  }

  if (validation.environment === 'development') {
    if (process.env.NODE_ENV === 'production') {
      warnings.push(
        'NODE_ENV está definido como "production" mas a URL da API aponta para desenvolvimento'
      );
    }
  }

  return {
    isValid: true,
    errors: [],
    warnings
  };
}

/**
 * Obtém o ambiente atual
 */
export function getCurrentEnvironment(): Environment {
  const config = detectEnvironment();
  return config.environment;
}

/**
 * Verifica se está em produção
 */
export function isProduction(): boolean {
  return getCurrentEnvironment() === 'production';
}

/**
 * Verifica se está em homologação/staging
 */
export function isStaging(): boolean {
  return getCurrentEnvironment() === 'staging';
}

/**
 * Verifica se está em desenvolvimento
 */
export function isDevelopment(): boolean {
  return getCurrentEnvironment() === 'development';
}


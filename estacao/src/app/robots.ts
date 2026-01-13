import { MetadataRoute } from 'next';
import { isPreEnvironment } from '@/lib/maintenance';

/**
 * Configuração dinâmica de robots.txt
 * - Ambiente PRE: Bloqueia todos os crawlers
 * - Ambiente PRODUCTION: Permite crawlers com regras específicas
 */
export default function robots(): MetadataRoute.Robots {
  // Determina a URL base correta
  const getWebsiteUrl = (): string => {
    // 1. Verifica se é PRE
    if (isPreEnvironment()) {
      return 'https://pre.estacaoterapia.com.br';
    }

    // 2. Ambiente de produção usa a variável de ambiente
    const envUrl = process.env.NEXT_PUBLIC_WEBSITE_URL?.replace(/\/$/, '');
    if (envUrl && envUrl !== 'http://localhost:3000') {
      return envUrl;
    }

    // 3. Fallback para produção
    return 'https://estacaoterapia.com.br';
  };

  const websiteUrl = getWebsiteUrl();

  // Se for ambiente PRE, bloqueia tudo
  if (isPreEnvironment()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
      // Não inclui sitemap no ambiente PRE para evitar indexação
    };
  }

  // Configuração para produção
  return {
    rules: {
      userAgent: '*',
      allow: ['/'],
      disallow: [
        '/painel',
        '/painel-psicologo',
        '/adm-estacao',
        '/consulta',
        '/api',
        '/login',
        '/checkout',
        '/manutencao',
      ],
    },
    sitemap: `${websiteUrl}/sitemap.xml`,
    host: websiteUrl,
  };
}

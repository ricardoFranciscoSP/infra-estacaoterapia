/**
 * Gera o arquivo llms.txt dinamicamente
 * GET /api/llms/route.ts
 * Acessível em: https://estacaoterapia.com.br/api/llms
 * 
 * Este endpoint fornece um arquivo llms.txt que guia LLMs na indexação
 * semântica das seções principais do site.
 */

const baseUrl = process.env.NEXT_PUBLIC_WEBSITE_URL
    ? process.env.NEXT_PUBLIC_WEBSITE_URL.replace(/\/$/, '')
    : 'https://estacaoterapia.com.br';

const llmsContent = `# llms.txt for Estação Terapia ${baseUrl}
# Author: Development Team
# Last-Updated: ${new Date().toISOString().split('T')[0]}
# Purpose: Guide large language models (LLMs) in semantically indexing the main sections of the Estação Terapia site.
# Source: Next.js Dynamic Generation

## Home & Página Inicial
- ${baseUrl}/

## Encontrar Psicólogo
- ${baseUrl}/ver-psicologos

## Perfil de Psicólogo
- ${baseUrl}/psicologo/[id]

## Para Psicólogos - Informações e Cadastro
- ${baseUrl}/para-psicologos
- ${baseUrl}/termo-de-uso-psicologo

## Fale Conosco e Suporte
- ${baseUrl}/fale-conosco

## FAQ - Perguntas Frequentes
- ${baseUrl}/faq

## Políticas e Termos Legais
- ${baseUrl}/politica-de-privacidade
- ${baseUrl}/politica-de-cancelamento
- ${baseUrl}/politica-de-cookies
- ${baseUrl}/termo-de-uso

## Páginas de Informação
- ${baseUrl}/boas-vindas
- ${baseUrl}/cadastro-em-analise
- ${baseUrl}/objetivos
`;

export async function GET() {
    return new Response(llmsContent, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}

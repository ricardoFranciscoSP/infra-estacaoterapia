import React from 'react';
import { Fira_Sans } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import { getSEOMetaTags, isPreEnvironment } from '@/lib/maintenance';

const firaSans = Fira_Sans({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700'], 
  style: ['normal'],
  display: 'swap', // Evita FOIT (Flash of Invisible Text)
  preload: true, // Pré-carrega a fonte para melhor FCP
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
  adjustFontFallback: true, // Ajusta métricas para evitar CLS
  variable: '--font-fira-sans',
  // Otimização: apenas pesos necessários carregados
  // ⚡ CRÍTICO: variable para evitar FOUT e melhorar performance
});

import '@/globals.css';
import { MaintenanceGuard } from '@/components/MaintenanceGuard';
import ThirdPartyScripts from '@/components/ThirdPartyScripts';

// Helper para validar URL antes de usar em metadataBase
const getMetadataBase = (): string => {
  const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL;
  // Se for placeholder ou não for uma URL válida, usa URL padrão
  if (!websiteUrl || websiteUrl.includes('__PLACEHOLDER') || websiteUrl.startsWith('__') || websiteUrl.endsWith('__')) {
    return 'https://estacaoterapia.com.br';
  }
  try {
    // Valida se é uma URL válida
    new URL(websiteUrl);
    return websiteUrl;
  } catch {
    return 'https://estacaoterapia.com.br';
  }
};

// Helper para extrair origem da API com fallback seguro
const getApiOrigin = (): string | null => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl || apiUrl.includes("__PLACEHOLDER") || apiUrl.startsWith("__") || apiUrl.endsWith("__")) {
    return null;
  }
  try {
    return new URL(apiUrl).origin;
  } catch {
    return null;
  }
};

// Configuração de SEO baseada no ambiente
const seoTags = getSEOMetaTags();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: 'Estação Terapia - Terapia Online',
  description: 'A Estação Terapia é uma plataforma de psicoterapia online que conecta pacientes a psicólogos certificados para consultas seguras e humanizadas.',
  metadataBase: new URL(getMetadataBase()),
  robots: seoTags.robots,
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-64x64.png', sizes: '64x64', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon-128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/app-icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/app-icon-256x256.png', sizes: '256x256', type: 'image/png' },
      { url: '/app-icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Estação Terapia',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Adiciona indicador visual no ambiente PRE
  const isPreEnv = isPreEnvironment();
  const apiOrigin = getApiOrigin();
  const metadataBase = getMetadataBase();
  
  return (
    <html lang="pt-BR" className={firaSans.className}>
      <head>
        {/* Favicons - Múltiplos tamanhos para diferentes dispositivos */}
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon-64x64.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="icon" type="image/png" sizes="128x128" href="/favicon-128x128.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" sizes="192x192" href="/app-icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="256x256" href="/app-icon-256x256.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/app-icon-512x512.png" />
        {/* Resource hints otimizados - Preconnect para origens críticas (economia estimada: ~1150ms) */}
        {/* ⚡ CRÍTICO: Preconnect para o próprio domínio (reduz latência do caminho crítico de CSS) */}
        <link rel="preconnect" href={metadataBase} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={metadataBase} />
        {/* ⚡ CRÍTICO: Preconnect para GoAdopt (economia estimada: 530ms) */}
        <link rel="preconnect" href="https://tag.goadopt.io" />
        {/* ⚡ CRÍTICO: Preconnect para Supabase (economia estimada: 320ms) */}
        <link rel="preconnect" href="https://mktmsurbxszuisgxjnkq.supabase.co" crossOrigin="anonymous" />
        {/* ⚡ CRÍTICO: Preconnect para API (economia estimada: 300ms) */}
        {apiOrigin && (
          <>
            <link rel="preconnect" href={apiOrigin} />
            <link rel="dns-prefetch" href={apiOrigin} />
          </>
        )}
        {/* ⚡ CRÍTICO: Preconnect para Reclame Aqui (economia estimada: 310ms) */}
        <link rel="preconnect" href="https://api.reclameaqui.com.br" />
        <link rel="dns-prefetch" href="https://api.reclameaqui.com.br" />
        {/* DNS prefetch para outras origens não críticas */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        
        {/* Removido script de "defer CSS" para evitar conflitos de MIME ou preload */}
        
        {/* ⚡ OTIMIZAÇÃO: Preload de recursos críticos apenas */}
        {/* Next.js já faz preload automático de CSS e fontes, não precisa manual */}
        {/* Removido script de preload dinâmico que estava causando preloads desnecessários */}
        
        {/* GoAdopt Consent Management - Meta tag */}
        <meta name="adopt-website-id" content="29ac98d9-078c-42d7-844f-8e9f0de2dc46" />
        
        {/* Meta tags de SEO baseadas no ambiente */}
        <meta name="robots" content={seoTags.robots} />
        <meta name="googlebot" content={seoTags.googlebot} />
        
        {/* ⚡ OTIMIZAÇÃO: JSON-LD não bloqueante */}
        {!isPreEnv && (
          <script
            type="application/ld+json"
            async
            dangerouslySetInnerHTML={{
              __html: JSON.stringify([
                {
                  "@context": "https://schema.org",
                  "@type": "LocalBusiness",
                  name: "Estação Terapia",
                  url: "https://estacaoterapia.com.br",
                  telephone: "+55-11-96089-2131",
                  address: {
                    "@type": "PostalAddress",
                    streetAddress: "Al. Rio Negro, 503 - Sala 2020",
                    addressLocality: "Barueri",
                    addressRegion: "SP",
                    postalCode: "06454-000",
                    addressCountry: "BR",
                  },
                  openingHours: "Mo-Fr 09:00-18:00",
                  image: ["https://estacaoterapia.com.br/logo.png"],
                  priceRange: "R$",
                },
                {
                  "@context": "https://schema.org",
                  "@type": "SoftwareApplication",
                  name: "Estação Terapia",
                  applicationCategory: "HealthApplication",
                  operatingSystem: "Web",
                  description: "Plataforma de agendamento de consultas psicológicas online.",
                  url: "https://estacaoterapia.com.br",
                  publisher: {
                    "@type": "Organization",
                    name: "Estação Terapia",
                    url: "https://estacaoterapia.com.br",
                  },
                }
              ]),
            }}
          />
        )}
      </head>
      <body suppressHydrationWarning={true} className={`overflow-x-hidden antialiased ${isPreEnv ? 'has-pre-banner' : ''}`}>
        {/* Badge de ambiente PRE */}
        {isPreEnv && (
          <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-black text-center py-1 text-xs font-bold">
            🚧 AMBIENTE DE PRÉ-PRODUÇÃO - NÃO INDEXADO 🚧
          </div>
        )}
        
        {/* ⚡ OTIMIZAÇÃO: Scripts de terceiros carregados apenas no cliente */}
        <ThirdPartyScripts />
        
        <MaintenanceGuard>
          {children}
        </MaintenanceGuard>
      </body>
    </html>
  );
}
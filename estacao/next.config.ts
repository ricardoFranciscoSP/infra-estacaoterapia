import type { NextConfig } from "next";
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import { validateEnvironmentConfig } from "./src/config/env";

/* ======================================================
   CONTROLE DE EXECUÇÃO ÚNICA
====================================================== */
declare global {
  var __NEXT_CONFIG_VALIDATED__: boolean | undefined;
}

const isProduction = process.env.NODE_ENV === "production";

/* ======================================================
   LOAD ENV (DEV ONLY)
====================================================== */
if (!isProduction && !global.__NEXT_CONFIG_VALIDATED__) {
  const envLocalPath = resolve(process.cwd(), ".env.local");
  const envPath = resolve(process.cwd(), ".env");

  if (existsSync(envLocalPath)) {
    config({ path: envLocalPath, override: false });
  } else if (existsSync(envPath)) {
    config({ path: envPath, override: false });
  }
}

/* ======================================================
   ENV VALIDATION
====================================================== */
const requiredEnvVars = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_WEBSITE_URL",
  "NEXT_PUBLIC_SOCKET_URL",
  "NEXT_PUBLIC_VINDI_PUBLIC_KEY",
  "NEXT_PUBLIC_URL_VINDI_API",
  "NEXT_PUBLIC_RECAPTCHA_SITE_KEY",
] as const;

if (!global.__NEXT_CONFIG_VALIDATED__) {
  // Fallback explícito para reCAPTCHA quando não vier do build/runtime
  if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY.trim() === "") {
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = "6LdSuU0sAAAAAJn1iapwFziV9NxOUpNUfHup2YPy";
  }

  // Verificar variáveis obrigatórias
  // Permitir placeholders durante build (serão substituídos em runtime via env_file)
  const missing = requiredEnvVars.filter(v => {
    const value = process.env[v];
    // Falhar apenas se estiver completamente ausente ou vazio
    // Placeholders são aceitos durante build
    return !value || value === "";
  });

  if (missing.length) {
    // Verificar se são placeholders (aceitos em build)
    const placeholders = requiredEnvVars.filter(v => {
      const value = process.env[v];
      return value && value.startsWith("__PLACEHOLDER");
    });

    if (placeholders.length > 0 && missing.length === placeholders.length) {
      // Apenas placeholders, permitir em build (serão substituídos em runtime)
      console.warn("⚠️  Variáveis usando placeholders (serão substituídas em runtime):", placeholders);
    } else {
      // Variáveis realmente faltando
      console.error("❌ Variáveis obrigatórias ausentes:", missing);
      if (placeholders.length > 0) {
        console.warn("⚠️  Algumas variáveis estão usando placeholders:", placeholders);
        console.warn("💡 Placeholders são aceitos durante build, mas devem ser substituídos em runtime");
      }
      process.exit(1);
    }
  }

  const envValidation = validateEnvironmentConfig();
  if (!envValidation.isValid) {
    console.error("❌ Erro de ambiente:", envValidation.errors);
    process.exit(1);
  }

  global.__NEXT_CONFIG_VALIDATED__ = true;
}

/* ======================================================
   NEXT CONFIG
====================================================== */
const nextConfig: NextConfig = {
  output: "standalone",

  reactStrictMode: true,
  trailingSlash: false,

  poweredByHeader: false,
  compress: false, // Traefik já faz compressão

  productionBrowserSourceMaps: false,

  // ⚡ OTIMIZAÇÃO: Reduz preloads desnecessários
  // O Next.js faz preload automático, mas podemos otimizar para evitar preloads não utilizados
  onDemandEntries: {
    // Período em ms que uma página permanece em memória
    maxInactiveAge: 25 * 1000,
    // Número de páginas que devem ser mantidas simultaneamente
    pagesBufferLength: 2,
  },

  compiler: {
    removeConsole: isProduction
      ? { exclude: ["error", "warn"] }
      : false,
  },

  modularizeImports: {
    "@mui/material": { transform: "@mui/material/{{member}}" },
    "@mui/icons-material": { transform: "@mui/icons-material/{{member}}" },
  },

  experimental: {
    optimizePackageImports: [
      "@tanstack/react-query",
      "react-hot-toast",
      "framer-motion",
      "lucide-react",
      "date-fns",
      "dayjs",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "chart.js",
      "react-chartjs-2",
      "@mui/material",
      "@mui/x-date-pickers",
    ],
    // ⚡ OTIMIZAÇÃO: Otimiza e minifica CSS automaticamente
    optimizeCss: true,
    scrollRestoration: true,
    serverActions: {
      bodySizeLimit: "1mb",
    },
    // Otimização: reduz latência do caminho crítico de CSS
    optimizeServerReact: true,
  },

  webpack: (config, { isServer, dev }) => {
    if (!dev && !isServer) {
      config.cache = { type: "filesystem" };
    }

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // ⚡ OTIMIZAÇÃO: Code splitting agressivo para reduzir bundle size (apenas produção)
    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        // Separa runtime em chunk próprio para melhor cache
        runtimeChunk: {
          name: 'runtime',
        },
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework React separado - reduz tamanho do bundle principal
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 50,
              enforce: true,
            },
            // Chart.js - biblioteca pesada separada
            charts: {
              name: 'charts',
              test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
              chunks: 'all',
              priority: 45,
              enforce: true,
            },
            // Framer Motion - biblioteca pesada separada
            framerMotion: {
              name: 'framer-motion',
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              chunks: 'all',
              priority: 44,
              enforce: true,
            },
            // Agora RTC - biblioteca pesada separada
            agora: {
              name: 'agora',
              test: /[\\/]node_modules[\\/](agora-rtc|agora-rtm)[\\/]/,
              chunks: 'all',
              priority: 43,
              enforce: true,
            },
            // MUI - biblioteca pesada separada
            mui: {
              name: 'mui',
              test: /[\\/]node_modules[\\/]@mui[\\/]/,
              chunks: 'all',
              priority: 42,
              enforce: true,
            },
            // React Query - separado
            reactQuery: {
              name: 'react-query',
              test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query[\\/]/,
              chunks: 'all',
              priority: 41,
              enforce: true,
            },
            // Socket.io - separado
            socketio: {
              name: 'socketio',
              test: /[\\/]node_modules[\\/]socket\.io[\\/]/,
              chunks: 'all',
              priority: 40,
              enforce: true,
            },
            // Outras bibliotecas compartilhadas
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
              reuseExistingChunk: true,
            },
            // Vendor libraries menores
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              chunks: 'all',
              priority: 10,
              minChunks: 1,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    unoptimized: false,
    loader: "default",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/**",
      },
    ],
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL!,
    NEXT_PUBLIC_WEBSITE_URL: process.env.NEXT_PUBLIC_WEBSITE_URL!,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL!,
    NEXT_PUBLIC_VINDI_PUBLIC_KEY: process.env.NEXT_PUBLIC_VINDI_PUBLIC_KEY!,
    NEXT_PUBLIC_URL_VINDI_API: process.env.NEXT_PUBLIC_URL_VINDI_API!,
  },

  async headers() {
    const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || "";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
    const toOrigin = (url: string): string | null => {
      if (!url) return null;
      try {
        return new URL(url).origin;
      } catch {
        return null;
      }
    };

    const isLocalhost =
      process.env.NODE_ENV !== "production" ||
      websiteUrl.includes("localhost") ||
      websiteUrl.includes("127.0.0.1");

    // 🎯 Permissions-Policy: Permite câmera e microfone no contexto atual
    // Usa '*' para permitir em qualquer contexto dentro do mesmo origin
    // Em localhost: permite tudo
    // Em produção: permite apenas no self
    const permissionsPolicy = isLocalhost
      ? "camera=*, microphone=*, geolocation=()"
      : "camera=(self), microphone=(self), geolocation=()";

    const isPre = websiteUrl.includes("pre.");

    // Content Security Policy - proteção contra XSS
    // Em desenvolvimento, permite localhost:3333 para a API
    const connectSrcDirectives = [
      "'self'",
      "https://estacaoterapia.com.br", // Domínio raiz (sem subdomínio)
      "https://*.estacaoterapia.com.br", // Todos os subdomínios
      // Endpoints explícitos para Socket.IO (upgrade para WebSocket)
      "https://ws.prd.estacaoterapia.com.br",
      "wss://ws.prd.estacaoterapia.com.br",
      "https://ws.estacaoterapia.com.br",
      "wss://ws.estacaoterapia.com.br",
      "https://*.supabase.co",
      "https://tag.goadopt.io",
      "https://disclaimer-api.goadopt.io",
      "https://*.goadopt.io",
      "https://www.google-analytics.com",
      "https://www.google.com", // Google Analytics e Google Ads
      "https://www.gstatic.com", // reCAPTCHA assets
      "https://www.googletagmanager.com",
      "https://googleads.g.doubleclick.net", // Google Ads
      "https://www.googleadservices.com", // Google Ads Services
      "https://stats.g.doubleclick.net", // Google Ads/Analytics
      "https://static.cloudflareinsights.com",
      "https://cloudflareinsights.com",
      "https://api.reclameaqui.com.br", // Reclame Aqui API
      "https://*.agora.io", // Agora RTC WebSocket connections
      "wss://*.agora.io", // Agora RTC WebSocket secure
      "https://*.agoralab.co", // Agora RTC alternative domains
      "wss://*.agoralab.co", // Agora RTC alternative WebSocket
      "wss:",
      "ws:",
    ];

    const apiOrigin = toOrigin(apiUrl);
    if (apiOrigin) {
      connectSrcDirectives.push(apiOrigin);
    }

    const socketOrigin = toOrigin(socketUrl);
    if (socketOrigin) {
      connectSrcDirectives.push(socketOrigin);
      if (socketOrigin.startsWith("https://")) {
        connectSrcDirectives.push(socketOrigin.replace("https://", "wss://"));
      }
      if (socketOrigin.startsWith("wss://")) {
        connectSrcDirectives.push(socketOrigin.replace("wss://", "https://"));
      }
    }

    // Adiciona localhost em desenvolvimento
    if (isLocalhost) {
      connectSrcDirectives.push("http://localhost:*"); // Permite qualquer porta do localhost
      connectSrcDirectives.push("ws://localhost:*");
      connectSrcDirectives.push("wss://localhost:*");
    }

    // Diretivas para style-src (CSS)
    const styleSrcDirectives = [
      "'self'",
      "'unsafe-inline'", // Necessário para estilos inline do Next.js e CSS-in-JS
      "https://fonts.googleapis.com",
      "https://*.estacaoterapia.com.br", // Permite CSS de todos os subdomínios
      "https://s3.amazonaws.com", // Permite CSS do widget Reclame Aqui
      "https://*.amazonaws.com", // Abrange outros caminhos do S3, se usados
      "blob:", // Permite CSS dinâmico via blob URLs
      "data:", // Permite data URIs para CSS (usado por alguns frameworks)
    ];

    // Diretivas para script-src (ajustadas para evitar conflitos com CSS)
    const scriptSrcDirectives = [
      "'self'",
      "'unsafe-inline'", // Necessário para scripts inline do Next.js
      "https://static.cloudflareinsights.com",
      "https://tag.goadopt.io",
      "https://*.goadopt.io",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://www.google.com", // reCAPTCHA script
      "https://www.gstatic.com", // reCAPTCHA assets
      "https://www.googleadservices.com", // Google Ads
      "https://googleads.g.doubleclick.net", // Google Ads DoubleClick
      "https://s3.amazonaws.com", // Reclame Aqui
      "https://kppuuqnpekounoylsdum.supabase.co", // ProTrack tracking script
      "https://*.estacaoterapia.com.br", // Permite scripts de todos os subdomínios
    ];

    if (isLocalhost) {
      scriptSrcDirectives.push("'unsafe-eval'");
    }

    // Explicita style-src-elem para evitar fallback ambíguo em alguns navegadores
    const cspDirectives = [
      "default-src 'self'",
      `script-src ${scriptSrcDirectives.join(" ")}`,
      `script-src-elem ${scriptSrcDirectives.join(" ")}`,
      "script-src-attr 'self' 'unsafe-inline'",
      `style-src ${styleSrcDirectives.join(" ")}`,
      `style-src-elem ${styleSrcDirectives.join(" ")}`,
      "font-src 'self' https://fonts.gstatic.com data: blob:",
      "img-src 'self' data: blob: https:",
      `connect-src ${connectSrcDirectives.join(" ")}`,
      "media-src 'self' blob: data: mediastream: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-src 'self' https://www.googletagmanager.com https://www.google.com https://www.gstatic.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://*.goadopt.io",
      "frame-ancestors 'self'",
    ].join("; ");

    const baseHeaders = [
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      {
        key: "Content-Security-Policy",
        value: cspDirectives,
      },
      {
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin-allow-popups",
      },
      {
        key: "Permissions-Policy",
        value: permissionsPolicy,
      },
      ...(isProduction
        ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ]
        : []),
    ];

    return [
      {
        source: "/:path*",
        headers: [
          ...baseHeaders,
          ...(isPre
            ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
            : []),
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.html",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      // Desabilita cache em áreas logadas (painel, painel-psicologo, adm-estacao, adm-finance)
      {
        source: "/painel/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      {
        source: "/painel-psicologo/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      {
        source: "/adm-estacao/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      {
        source: "/adm-finance/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      // Páginas de onboarding (parte do fluxo logado)
      {
        source: "/boas-vindas",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      {
        source: "/objetivos",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

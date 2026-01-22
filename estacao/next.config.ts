import type { NextConfig } from "next";
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

const isProduction = process.env.NODE_ENV === "production";

/* ======================================================
  LOAD ENV (DEV ONLY)
====================================================== */
if (!isProduction) {
  const envLocalPath = resolve(process.cwd(), ".env.local");
  const envPath = resolve(process.cwd(), ".env");

  if (existsSync(envLocalPath)) {
    config({ path: envLocalPath, override: false });
  } else if (existsSync(envPath)) {
    config({ path: envPath, override: false });
  }
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
    // Evita pico de memória no build; o Next já minifica CSS por padrão
    optimizeCss: false,
    scrollRestoration: true,
    disableOptimizedLoading: false,
    serverActions: {
      bodySizeLimit: "1mb",
    },
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

    // Deixa o code splitting padrão do Next (menos pressão de memória)

    return config;
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    // Inclui tamanhos menores para evitar download acima do necessário
    deviceSizes: [320, 480, 500, 576, 640, 750, 828, 1080, 1200, 1920, 2048],
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

    // 🎯 Permissions-Policy: libera recursos do navegador
    const permissionsPolicy = [
      "accelerometer=*",
      "autoplay=*",
      "camera=*",
      "clipboard-read=*",
      "clipboard-write=*",
      "display-capture=*",
      "fullscreen=*",
      "geolocation=*",
      "gyroscope=*",
      "magnetometer=*",
      "microphone=*",
      "payment=*",
      "screen-wake-lock=*",
      "usb=*",
    ].join(", ");

    const isPre = websiteUrl.includes("pre.");

    // Content Security Policy - proteção contra XSS
    // Em desenvolvimento, permite localhost:3333 para a API
    const connectSrcDirectives = [
      "'self'",
      "https://estacaoterapia.com.br", // Domínio raiz (sem subdomínio)
      "https://*.estacaoterapia.com.br", // Todos os subdomínios
      "https://servicodados.ibge.gov.br", // IBGE (cidades/estados)
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
      "https://docs.google.com", // Google Docs Viewer (DOC/DOCX)
      "https://view.officeapps.live.com", // Microsoft Office Viewer (DOC/DOCX)
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

    const isLocalhost =
      process.env.NODE_ENV !== "production" ||
      websiteUrl.includes("localhost") ||
      websiteUrl.includes("127.0.0.1");

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

    // Adiciona localhost e domínios permitidos
    if (isLocalhost) {
      connectSrcDirectives.push("http://localhost:3000");
      connectSrcDirectives.push("http://localhost:3001");
      connectSrcDirectives.push("ws://localhost:3000");
      connectSrcDirectives.push("ws://localhost:3001");
      connectSrcDirectives.push("wss://localhost:3000");
      connectSrcDirectives.push("wss://localhost:3001");
    }
    // Sempre permite domínios principais
    connectSrcDirectives.push("https://estacaoterapia.com.br");
    connectSrcDirectives.push("https://www.estacaoterapia.com.br");
    connectSrcDirectives.push("wss://estacaoterapia.com.br");
    connectSrcDirectives.push("wss://www.estacaoterapia.com.br");

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
      "connect-src *",
      "media-src * blob: data: mediastream:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-src *",
      "frame-ancestors *",
    ].join("; ");

    const baseHeaders = [
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
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

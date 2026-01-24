// src/middlewares/cors.ts
import { Request, Response, NextFunction } from "express";

/**
 * Origins por ambiente
 */
const CORS_ORIGINS = {
    production: [
        "https://estacaoterapia.com.br",
        "https://www.estacaoterapia.com.br",
        "https://pre.estacaoterapia.com.br", // Adiciona suporte para pré-produção
        "https://estacao-chi.vercel.app", // Preview do Vercel
    ],
    pre: [
        "https://pre.estacaoterapia.com.br",
        "https://estacaoterapia.com.br", // Permite que pré-produção acesse produção se necessário
        "https://www.estacaoterapia.com.br",
        "https://estacao-chi.vercel.app", // Preview do Vercel
    ],
    development: [
        "http://localhost:3000",
        "http://localhost:3333",
        "http://192.168.15.109:3000", // Acesso da rede local
        "https://estacao-chi.vercel.app", // Preview do Vercel (também em dev para testes)
    ],
};

const NODE_ENV = process.env.NODE_ENV || "development";

// Log de inicialização para debug
console.log(`[CORS] 🔧 Ambiente detectado: ${NODE_ENV}`);

/**
 * Normaliza URL removendo barra final
 */
const normalize = (url?: string) =>
    url ? url.replace(/\/$/, "") : undefined;

/**
 * Em desenvolvimento: origens com acesso total sem restrições.
 * - 192.168.15.109 (e qualquer 192.168.x.x) — rede local
 * - 10.x.x.x — rede local
 * - localhost, 127.0.0.1 — máquina local
 */
const isUnrestrictedLocalOrigin = (origin: string): boolean => {
    const o = origin.replace(/\/$/, "").toLowerCase();
    if (/^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(o)) return true;
    if (/^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(o)) return true;
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(o)) return true;
    if (/^https?:\/\/localhost(:\d+)?$/i.test(o)) return true;
    if (/^https?:\/\/\[::1\](:\d+)?$/i.test(o)) return true;
    return false;
};

/**
 * Resolve origins permitidas conforme ambiente
 */
const getAllowedOrigins = (): string[] => {
    const origins: string[] = [];

    // Adiciona origins baseadas no NODE_ENV
    if (NODE_ENV === "production") {
        origins.push(...CORS_ORIGINS.production);
    } else if (NODE_ENV === "pre" || NODE_ENV === "staging") {
        origins.push(...CORS_ORIGINS.pre);
    } else {
        origins.push(...CORS_ORIGINS.development);
    }

    // Permite adicionar origins via variável de ambiente (útil para staging)
    if (process.env.CORS_ORIGIN) {
        const envOrigins = process.env.CORS_ORIGIN.split(",").map(o => o.trim()).filter(Boolean);
        origins.push(...envOrigins);
    }

    // Em produção, NÃO incluir pré-produção
    // Apenas incluir em staging/pre
    if (NODE_ENV === "pre" || NODE_ENV === "staging") {
        if (!origins.includes("https://pre.estacaoterapia.com.br")) {
            origins.push("https://pre.estacaoterapia.com.br");
        }
    }

    return [...new Set(origins)]; // Remove duplicatas
};

export const corsMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const origin = normalize(req.headers.origin);
    const allowedOrigins = getAllowedOrigins();

    // Log para debug (apenas em staging/pre)
    if (NODE_ENV === "pre" || NODE_ENV === "staging" || origin?.includes("pre.estacaoterapia.com.br")) {
        console.log(`[CORS] Request from origin: ${origin}`);
        console.log(`[CORS] Allowed origins: ${allowedOrigins.join(", ")}`);
        console.log(`[CORS] NODE_ENV: ${NODE_ENV}`);
    }

    res.setHeader("Vary", "Origin");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization,X-Requested-With,Accept,Origin,Sec-WebSocket-Key,Sec-WebSocket-Version,Sec-WebSocket-Extensions,Sec-WebSocket-Protocol,Sec-WebSocket-Accept"
    );
    res.setHeader(
        "Access-Control-Expose-Headers",
        "Authorization,Content-Disposition,Content-Length"
    );

    // Em produção, origin é obrigatório
    if (NODE_ENV === "production" && !origin) {
        res.status(403).json({ error: "Origin é obrigatório em produção" });
        return;
    }

    const allowedByList = origin && allowedOrigins.includes(origin);
    const unrestrictedLocal = origin && NODE_ENV === "development" && isUnrestrictedLocalOrigin(origin);

    if (origin && (allowedByList || unrestrictedLocal)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        if (unrestrictedLocal) {
            console.log(`[CORS] ✅ Acesso total permitido (local): ${origin}`);
        }
        // Log para debug
        if (NODE_ENV === "pre" || NODE_ENV === "staging" || origin?.includes("pre.estacaoterapia.com.br")) {
            console.log(`[CORS] ✅ Origin permitida: ${origin}`);
        }
    } else if (origin) {
        // Origin não permitida - não definir headers CORS
        if (NODE_ENV === "pre" || NODE_ENV === "staging" || origin?.includes("pre.estacaoterapia.com.br")) {
            console.log(`[CORS] ❌ Origin bloqueada: ${origin}`);
        }
    }

    // Preflight
    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Max-Age", "86400");
        return res.sendStatus(204);
    }

    next();
};

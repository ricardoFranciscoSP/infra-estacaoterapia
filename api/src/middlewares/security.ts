// src/middlewares/security.ts
import { Request, Response, NextFunction } from "express";
import helmet, { HelmetOptions } from "helmet";
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { getRedisClient } from "../config/redis.config";

/**
 * Configuração do Helmet com tipagem forte
 */
const helmetConfig: Readonly<HelmetOptions> = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://www.googletagmanager.com",
                "https://www.google-analytics.com",
                "https://static.cloudflareinsights.com",
                "https://tag.goadopt.io",
                "https://googleads.g.doubleclick.net"
            ],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: [
                "'self'",
                "https://api-prd.estacaoterapia.com.br",
                "https://ws.prd.estacaoterapia.com.br",
                "wss://ws.prd.estacaoterapia.com.br",
                "https://www.googletagmanager.com",
                "https://www.google-analytics.com",
                "https://tag.goadopt.io"
            ],
            fontSrc: ["'self'", "data:", "https:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    noSniff: true,
    xssFilter: true,
    frameguard: {
        action: "deny",
    },
    referrerPolicy: {
        policy: "strict-origin-when-cross-origin",
    },
} as const;

/**
 * Middleware Helmet para security headers
 */
export const securityHeaders = helmet(helmetConfig);

/**
 * Interface para configuração de rate limit
 */
interface RateLimitConfig {
    windowMs: number;
    max: number;
    message: string;
    skipSuccessfulRequests?: boolean;
    useRedis?: boolean;
}

/**
 * Cria um rate limiter com tipagem forte
 */
const createRateLimiter = (config: Readonly<RateLimitConfig>): RateLimitRequestHandler => {
    const baseConfig = {
        windowMs: config.windowMs,
        max: config.max,
        message: config.message,
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
    };

    // Em produção, usar Redis store se disponível
    if (config.useRedis && process.env.NODE_ENV === "production") {
        // Usar store em memória com fallback para Redis
        // O express-rate-limit funciona melhor com store em memória para a maioria dos casos
        // Redis pode ser usado para rate limiting distribuído se necessário
        return rateLimit(baseConfig);
    }

    return rateLimit(baseConfig);
};

/**
 * Rate limiter geral (100 requisições por 15 minutos)
 */
export const generalRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100,
    message: "Muitas requisições deste IP, tente novamente mais tarde.",
    useRedis: true,
} as const);

/**
 * Rate limiter para login (5 tentativas por 15 minutos)
 */
export const loginRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
    skipSuccessfulRequests: true,
    useRedis: true,
} as const);

/**
 * Rate limiter para endpoints sensíveis (10 requisições por 15 minutos)
 */
export const sensitiveRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Muitas requisições. Tente novamente mais tarde.",
    useRedis: true,
} as const);

/**
 * Middleware para validar tamanho do body
 */
export const validateBodySize = (maxSize: number = 10 * 1024 * 1024) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const contentLength = req.headers["content-length"];

        if (contentLength) {
            const size = parseInt(contentLength, 10);
            if (size > maxSize) {
                res.status(413).json({
                    error: "Payload muito grande",
                    maxSize: `${maxSize / 1024 / 1024}MB`,
                });
                return;
            }
        }

        next();
    };
};

/**
 * Middleware para forçar HTTPS em produção
 */
export const forceHttps = (req: Request, res: Response, next: NextFunction): void => {
    if (req.path === "/health") {
        next();
        return;
    }

    if (process.env.NODE_ENV === "production") {
        const forwardedProto = req.headers["x-forwarded-proto"];
        const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
        if (proto !== "https") {
            const host = req.headers.host || "";
            const url = req.url || "";
            res.redirect(301, `https://${host}${url}`);
            return;
        }
    }
    next();
};

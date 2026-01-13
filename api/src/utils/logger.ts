// src/utils/logger.ts
import winston from "winston";

/**
 * Níveis de log
 */
type LogLevel = "error" | "warn" | "info" | "debug";

/**
 * Interface para contexto de log
 */
interface LogContext {
    [key: string]: string | number | boolean | null | undefined;
}

/**
 * Configuração do logger
 */
const logLevel: LogLevel = 
    process.env.NODE_ENV === "production" ? "warn" : 
    process.env.NODE_ENV === "development" ? "debug" : 
    "info";

/**
 * Formato de log para produção (JSON)
 */
const productionFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

/**
 * Formato de log para desenvolvimento (legível)
 */
const developmentFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
);

/**
 * Logger principal
 */
export const logger = winston.createLogger({
    level: logLevel,
    format: process.env.NODE_ENV === "production" ? productionFormat : developmentFormat,
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: "logs/combined.log",
            maxsize: 5242880,
            maxFiles: 5,
        }),
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: "logs/exceptions.log" }),
    ],
    rejectionHandlers: [
        new winston.transports.File({ filename: "logs/rejections.log" }),
    ],
});

/**
 * Logger de segurança
 */
export const securityLogger = winston.createLogger({
    level: "warn",
    format: productionFormat,
    transports: [
        new winston.transports.File({
            filename: "logs/security.log",
            maxsize: 5242880,
            maxFiles: 10,
        }),
    ],
});

/**
 * Função auxiliar para log de segurança
 */
export const logSecurityEvent = (
    event: string,
    details: Readonly<LogContext>
): void => {
    securityLogger.warn(event, {
        ...details,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Função auxiliar para log de erro
 */
export const logError = (message: string, error: Error, context?: Readonly<LogContext>): void => {
    logger.error(message, {
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
        },
        ...context,
    });
};

/**
 * Função auxiliar para log de informação
 */
export const logInfo = (message: string, context?: Readonly<LogContext>): void => {
    logger.info(message, context);
};

/**
 * Função auxiliar para log de debug (apenas em desenvolvimento)
 */
export const logDebug = (message: string, context?: Readonly<LogContext>): void => {
    if (process.env.NODE_ENV !== "production") {
        logger.debug(message, context);
    }
};

// src/middlewares/validation.ts
import { Request, Response, NextFunction } from "express";
import { z, ZodError, ZodSchema } from "zod";

/**
 * Interface para erros de validação
 */
interface ValidationError {
    error: string;
    details: Array<{
        path: string;
        message: string;
    }>;
}

/**
 * Middleware de validação com tipagem forte
 */
export const validate = <T extends ZodSchema>(schema: T) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const validated = schema.parse(req.body) as z.infer<T>;
            req.body = validated;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const validationError: ValidationError = {
                    error: "Validação falhou",
                    details: error.errors.map((err) => ({
                        path: err.path.join("."),
                        message: err.message,
                    })),
                };
                res.status(400).json(validationError);
                return;
            }
            next(error);
        }
    };
};

/**
 * Schemas de validação comuns
 */
export const validationSchemas = {
    /**
     * Schema para login
     */
    login: z.object({
        email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
        password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(100, "Senha muito longa"),
    }),

    /**
     * Schema para email
     */
    email: z.string().email("Email inválido"),

    /**
     * Schema para ID numérico
     */
    numericId: z.number().int().positive("ID deve ser um número positivo"),

    /**
     * Schema para ID string
     */
    stringId: z.string().min(1, "ID é obrigatório"),

    /**
     * Schema para paginação
     */
    pagination: z.object({
        page: z.number().int().positive().optional().default(1),
        limit: z.number().int().positive().max(100).optional().default(10),
    }),

    /**
     * Schema para busca
     */
    search: z.object({
        query: z.string().min(1, "Query de busca é obrigatória").max(100, "Query muito longa"),
    }),
} as const;

/**
 * Sanitiza string removendo caracteres perigosos
 */
export const sanitizeString = (input: string): string => {
    return input.replace(/[^a-zA-Z0-9@._-]/g, "");
};

/**
 * Sanitiza email removendo caracteres perigosos
 */
export const sanitizeEmail = (email: string): string => {
    const [localPart, domain] = email.split("@");
    if (!domain) return sanitizeString(email);
    
    const sanitizedLocal = sanitizeString(localPart);
    const sanitizedDomain = sanitizeString(domain);
    
    return `${sanitizedLocal}@${sanitizedDomain}`;
};

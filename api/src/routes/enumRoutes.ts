import { Router } from "express";
import { getEnums, getEnumsFormatted, getSpecificEnum } from "../controllers/enumController";

const router = Router();

/**
 * @route GET /api/enums
 * @description Retorna todos os enums do sistema organizados por categoria
 * @access Public
 * @cache 1 hora
 */
router.get("/", getEnums);

/**
 * @route GET /api/enums/formatted
 * @description Retorna todos os enums formatados (legíveis) para exibição
 * @access Public
 * @cache 1 hora
 */
router.get("/formatted", getEnumsFormatted);

/**
 * @route GET /api/enums/:enumName
 * @description Retorna um enum específico
 * @param enumName - Nome do enum desejado
 * @query formatted - 'true' para retornar valores formatados
 * @access Public
 * @cache 1 hora
 * @example /api/enums/sexo
 * @example /api/enums/abordagem?formatted=true
 */
router.get("/:enumName", getSpecificEnum);

export default router;

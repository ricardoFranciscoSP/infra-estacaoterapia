import { Router } from 'express';
import { InfoSimplesController } from '../controllers/infoSimples.controller';

const router = Router();

/**
 * @route POST /api/infosimples/consultar
 * @description Consulta cadastro na InfoSimples por CRP, CPF, CNPJ ou Nome
 * @body {crp?: string, cpf?: string, cnpj?: string, nome?: string, uf: string, registro?: string}
 * @returns {success: boolean, data?: object, header?: object, siteReceipts?: string[]}
 */
router.post('/consultar', InfoSimplesController.consultarCadastro);

/**
 * @route POST /api/infosimples/consultar-crp
 * @description Consulta cadastro na InfoSimples apenas por CRP
 * @body {crp: string, uf: string, nome?: string}
 * @returns {success: boolean, data?: object, header?: object}
 */
router.post('/consultar-crp', InfoSimplesController.consultarPorCRP);

/**
 * @route POST /api/infosimples/consultar-cpf
 * @description Consulta cadastro na InfoSimples apenas por CPF
 * @body {cpf: string, uf: string, nome?: string}
 * @returns {success: boolean, data?: object, header?: object}
 */
router.post('/consultar-cpf', InfoSimplesController.consultarPorCPF);

/**
 * @route POST /api/infosimples/consultar-cnpj
 * @description Consulta cadastro na InfoSimples apenas por CNPJ
 * @body {cnpj: string, uf: string, registro?: string}
 * @returns {success: boolean, data?: object, header?: object, siteReceipts?: string[]}
 */
router.post('/consultar-cnpj', InfoSimplesController.consultarPorCNPJ);

/**
 * @route POST /api/infosimples/consultar-nome
 * @description Consulta cadastro na InfoSimples apenas por Nome
 * @body {nome: string, uf: string, registro?: string}
 * @returns {success: boolean, data?: object, header?: object, siteReceipts?: string[]}
 */
router.post('/consultar-nome', InfoSimplesController.consultarPorNome);

export default router;

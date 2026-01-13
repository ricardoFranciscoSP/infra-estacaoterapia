import { Request, Response } from 'express';
import InfoSimplesService from '../services/infoSimples';
import {
    ConsultarCadastroInfoSimplesRequest,
    ConsultarCadastroInfoSimplesResponse,
} from '../interfaces/infoSimples.interface';

const infoSimplesService = new InfoSimplesService(
    process.env.TOKEN_INFO_SIMPLES_API_KEY || ''
);

export class InfoSimplesController {
    /**
     * Consulta cadastro de pessoa ou empresa na InfoSimples
     * @param req Request com CPF/CNPJ, UF e dados opcionais
     * @param res Response com resultado da consulta
     */
    static async consultarCadastro(req: Request, res: Response) {
        const { crp, cpf, cnpj, uf, nome, registro } =
            req.body as ConsultarCadastroInfoSimplesRequest;

        // Validações básicas
        if (!crp && !cpf && !cnpj && !nome) {
            return res
                .status(400)
                .json({ error: 'CRP, CPF, CNPJ ou Nome é obrigatório.' });
        }

        if (!uf || uf.trim().length === 0) {
            return res.status(400).json({ error: 'UF é obrigatório.' });
        }

        try {
            const resultado = await infoSimplesService.consultarCadastro({
                crp,
                cpf,
                cnpj,
                uf,
                nome,
                registro,
            });

            if (!resultado.success) {
                return res.status(resultado.error?.code || 400).json({
                    error: resultado.error?.message,
                    details: resultado.error?.details,
                });
            }

            const response: ConsultarCadastroInfoSimplesResponse = {
                success: true,
                data: resultado.data,
                header: resultado.header,
                siteReceipts: resultado.siteReceipts,
            };

            return res.status(200).json(response);
        } catch (error) {
            console.error('Erro ao consultar InfoSimples:', error);
            return res.status(500).json({
                error: 'Erro ao consultar cadastro na InfoSimples.',
                message: error instanceof Error ? error.message : 'Erro desconhecido',
            });
        }
    }

    /**
     * Consulta cadastro apenas por CPF
     */
    static async consultarPorCPF(req: Request, res: Response) {
        const { cpf, uf, nome } = req.body;

        if (!cpf || cpf.trim().length === 0) {
            return res.status(400).json({ error: 'CPF é obrigatório.' });
        }

        if (!uf || uf.trim().length === 0) {
            return res.status(400).json({ error: 'UF é obrigatório.' });
        }

        try {
            const resultado = await infoSimplesService.consultarCadastro({
                cpf: cpf.trim(),
                uf: uf.trim().toUpperCase(),
                nome: nome?.trim(),
            });

            if (!resultado.success) {
                return res.status(resultado.error?.code || 400).json({
                    error: resultado.error?.message,
                    details: resultado.error?.details,
                });
            }

            return res.status(200).json({
                success: true,
                data: resultado.data,
                header: resultado.header,
            });
        } catch (error) {
            console.error('Erro ao consultar CPF:', error);
            return res.status(500).json({
                error: 'Erro ao consultar CPF na InfoSimples.',
            });
        }
    }

    /**
     * Consulta cadastro apenas por CNPJ
     */
    static async consultarPorCNPJ(req: Request, res: Response) {
        const { cnpj, uf, registro } = req.body;

        if (!cnpj || cnpj.trim().length === 0) {
            return res.status(400).json({ error: 'CNPJ é obrigatório.' });
        }

        if (!uf || uf.trim().length === 0) {
            return res.status(400).json({ error: 'UF é obrigatório.' });
        }

        try {
            const resultado = await infoSimplesService.consultarCadastro({
                cnpj: cnpj.trim(),
                uf: uf.trim().toUpperCase(),
                registro: registro?.trim(),
            });

            if (!resultado.success) {
                return res.status(resultado.error?.code || 400).json({
                    error: resultado.error?.message,
                    details: resultado.error?.details,
                });
            }

            return res.status(200).json({
                success: true,
                data: resultado.data,
                header: resultado.header,
                siteReceipts: resultado.siteReceipts,
            });
        } catch (error) {
            console.error('Erro ao consultar CNPJ:', error);
            return res.status(500).json({
                error: 'Erro ao consultar CNPJ na InfoSimples.',
            });
        }
    }

    /**
     * Consulta cadastro apenas por CRP
     */
    static async consultarPorCRP(req: Request, res: Response) {
        const { crp, uf, nome } = req.body;

        if (!crp || crp.trim().length === 0) {
            return res.status(400).json({ error: 'CRP é obrigatório.' });
        }

        if (!uf || uf.trim().length === 0) {
            return res.status(400).json({ error: 'UF é obrigatório.' });
        }

        try {
            const resultado = await infoSimplesService.consultarCadastro({
                crp: crp.trim(),
                uf: uf.trim().toUpperCase(),
                nome: nome?.trim(),
            });

            if (!resultado.success) {
                return res.status(resultado.error?.code || 400).json({
                    error: resultado.error?.message,
                    details: resultado.error?.details,
                });
            }

            return res.status(200).json({
                success: true,
                data: resultado.data,
                header: resultado.header,
                siteReceipts: resultado.siteReceipts,
            });
        } catch (error) {
            console.error('Erro ao consultar CRP:', error);
            return res.status(500).json({
                error: 'Erro ao consultar CRP na InfoSimples.',
            });
        }
    }

    /**
     * Consulta cadastro apenas por Nome
     */
    static async consultarPorNome(req: Request, res: Response) {
        const { nome, uf, registro } = req.body;

        if (!nome || nome.trim().length === 0) {
            return res.status(400).json({ error: 'Nome é obrigatório.' });
        }

        if (!uf || uf.trim().length === 0) {
            return res.status(400).json({ error: 'UF é obrigatório.' });
        }

        try {
            const resultado = await infoSimplesService.consultarCadastro({
                nome: nome.trim(),
                uf: uf.trim().toUpperCase(),
                registro: registro?.trim(),
            });

            if (!resultado.success) {
                return res.status(resultado.error?.code || 400).json({
                    error: resultado.error?.message,
                    details: resultado.error?.details,
                });
            }

            return res.status(200).json({
                success: true,
                data: resultado.data,
                header: resultado.header,
                siteReceipts: resultado.siteReceipts,
            });
        } catch (error) {
            console.error('Erro ao consultar Nome:', error);
            return res.status(500).json({
                error: 'Erro ao consultar Nome na InfoSimples.',
            });
        }
    }
}

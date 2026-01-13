import prisma from "../../prisma/client";
import { Module, ActionType, RedesSociais } from "../../types/permissions.types";
import { User } from "../../types/user.types";
import { AuthorizationService } from "../authorization.service";
import { IConfiguracoes } from "../../interfaces/adm/iConfiguracoes.interface";
import { Request, Response } from "express";
import { FAQ } from "../../types/configuracoes.types";
import { normalizeQueryString, normalizeParamString } from "../../utils/validation.util";

export class ConfiguracoesService implements IConfiguracoes {
    constructor(private authService: AuthorizationService) { }

    // ===================== REDES SOCIAIS =====================

    /**
     * Busca todas as redes sociais cadastradas.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com lista de redes sociais ou erro.
     */
    async getRedes(req: Request, res: Response): Promise<Response> {
        try {
            const redes = await prisma.redesSociais.findMany();
            return res.status(200).json(redes);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao buscar redes sociais." });
        }
    }

    /**
     * Busca redes sociais públicas (sem autenticação) para o frontend.
     * @returns Objeto com redes sociais ou null.
     */
    async getRedesPublic(): Promise<RedesSociais[] | null> {
        try {
            const redes = await prisma.redesSociais.findMany();
            return redes;
        } catch (error) {
            console.error("Erro ao buscar redes sociais públicas:", error);
            return null;
        }
    }

    /**
     * Cria uma nova rede social.
     * @param req Request do Express contendo dados da rede.
     * @param res Response do Express.
     * @param user Usuário autenticado.
     * @returns Response com rede criada ou erro.
     */
    async createRedes(req: Request, res: Response, user: User): Promise<Response> {
        try {
            if (this.authService && typeof this.authService.checkPermission === "function") {
                const hasPermission = await this.authService.checkPermission(
                    user.Id,
                    Module.RedesSociais,
                    ActionType.Create
                );
                if (!hasPermission) {
                    throw new Error("Acesso negado ao módulo de redes sociais.");
                }
            }
            const data = req.body as Partial<RedesSociais>;
            const novaRede = await prisma.redesSociais.create({ data });
            return res.status(201).json(novaRede);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao criar rede social." });
        }
    }

    /**
     * Atualiza uma rede social existente.
     * @param req Request do Express contendo id e dados.
     * @param res Response do Express.
     * @param user Usuário autenticado.
     * @returns Response com rede atualizada ou erro.
     */
    async updateRedes(req: Request, res: Response, user: User): Promise<Response> {
        try {
            if (this.authService && typeof this.authService.checkPermission === "function") {
                const hasPermission = await this.authService.checkPermission(
                    user.Id,
                    Module.RedesSociais,
                    ActionType.Update
                );
                if (!hasPermission) {
                    throw new Error("Acesso negado ao módulo de redes sociais.");
                }
            }
            const data = req.body as Partial<RedesSociais>;

            // Busca primeiro registro ou cria um novo se não existir
            const redesExistentes = await prisma.redesSociais.findMany();

            if (redesExistentes.length > 0) {
                // Atualiza o primeiro registro
                const redeAtualizada = await prisma.redesSociais.update({
                    where: { Id: redesExistentes[0].Id },
                    data,
                });
                return res.status(200).json(redeAtualizada);
            } else {
                // Cria um novo registro
                const novaRede = await prisma.redesSociais.create({ data });
                return res.status(201).json(novaRede);
            }
        } catch (error) {
            console.error("Erro ao atualizar rede social:", error);
            return res.status(500).json({ error: "Erro ao atualizar rede social." });
        }
    }

    /**
     * Exclui uma rede social existente.
     * @param req Request do Express contendo id.
     * @param res Response do Express.
     * @param user Usuário autenticado.
     * @returns Response de sucesso ou erro.
     */
    async deleteRedes(req: Request, res: Response, user: User): Promise<Response> {
        try {
            if (this.authService && typeof this.authService.checkPermission === "function") {
                const hasPermission = await this.authService.checkPermission(
                    user.Id,
                    Module.RedesSociais,
                    ActionType.Delete
                );
                if (!hasPermission) {
                    throw new Error("Acesso negado ao módulo de redes sociais.");
                }
            }
            const { id } = req.params;
            await prisma.redesSociais.delete({ where: { Id: id } });
            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ error: "Erro ao deletar rede social." });
        }
    }

    // ===================== FAQ =====================

    /**
     * Busca todas as FAQs cadastradas.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com lista de FAQs ou erro.
     */
    async getFaq(req: Request, res: Response): Promise<Response> {
        try {
            const redes = await prisma.faq.findMany();
            return res.status(200).json(redes);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao buscar FAQs." });
        }
    }

    /**
     * Busca FAQs públicas (apenas com Status "Ativo").
     * Permite filtrar por Tipo (Paciente ou Psicologo).
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com lista de FAQs ativas ou erro.
     */
    /**
     * ⚡ OTIMIZAÇÃO: Endpoint público de FAQs com cache HTTP
     */
    async getFaqPublic(req: Request, res: Response): Promise<Response> {
        try {
            const tipo = normalizeQueryString(req.query.tipo);

            // ⚡ OTIMIZAÇÃO: Monta where clause diretamente
            const faqs = await prisma.faq.findMany({
                where: {
                    Status: "Ativo",
                    ...(tipo && (tipo === "Paciente" || tipo === "Psicologo") ? { Tipo: tipo as "Paciente" | "Psicologo" } : {}),
                },
                orderBy: {
                    CreatedAt: 'asc'
                },
                // ⚡ OTIMIZAÇÃO: Select apenas campos necessários
                select: {
                    Id: true,
                    Pergunta: true,
                    Resposta: true,
                    Tipo: true,
                    Status: true,
                    CreatedAt: true,
                    UpdatedAt: true,
                }
            });

            // ⚡ OTIMIZAÇÃO: Cache HTTP para FAQs (10 minutos)
            // FAQs mudam raramente, cache é seguro
            res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=600, stale-while-revalidate=1200');

            return res.status(200).json(faqs);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao buscar FAQs públicas." });
        }
    }

    /**
     * Cria uma nova FAQ.
     * @param req Request do Express contendo dados da FAQ.
     * @param res Response do Express.
     * @param user Usuário autenticado.
     * @returns Response com FAQ criada ou erro.
     */
    async createFaq(req: Request, res: Response, user: User): Promise<Response> {
        try {
            if (this.authService && typeof this.authService.checkPermission === "function") {
                const hasPermission = await this.authService.checkPermission(
                    user.Id,
                    Module.Faq,
                    ActionType.Create
                );
                if (!hasPermission) {
                    throw new Error("Acesso negado ao módulo de FAQs.");
                }
            }
            const { Pergunta, Resposta, Status, Tipo } = req.body;
            if (!Pergunta || !Resposta) {
                return res.status(400).json({ error: "Pergunta e Resposta são obrigatórias." });
            }
            const novaFaq = await prisma.faq.create({
                data: {
                    Pergunta,
                    Resposta,
                    Status: Status || "Ativo",
                    Tipo: Tipo || "Paciente",
                }
            });
            return res.status(201).json(novaFaq);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao criar FAQ." });
        }
    }

    /**
     * Atualiza uma FAQ existente.
     * @param req Request do Express contendo id e dados.
     * @param res Response do Express.
     * @param user Usuário autenticado.
     * @returns Response com FAQ atualizada ou erro.
     */
    async updateFaq(req: Request, res: Response, user: User): Promise<Response> {
        try {
            if (this.authService && typeof this.authService.checkPermission === "function") {
                const hasPermission = await this.authService.checkPermission(
                    user.Id,
                    Module.Faq,
                    ActionType.Update
                );
                if (!hasPermission) {
                    throw new Error("Acesso negado ao módulo de FAQs.");
                }
            }
            const { id } = req.params;
            const { Status, Tipo, ...rest } = req.body as Partial<FAQ>;
            const faqAtualizada = await prisma.faq.update({
                where: { Id: id },
                data: {
                    ...rest,
                    ...(Status && { Status: Status as "Ativo" | "Inativo" }),
                    ...(Tipo && { Tipo: Tipo as "Paciente" | "Psicologo" })
                },
            });
            return res.status(200).json(faqAtualizada);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao atualizar FAQ." });
        }
    }

    /**
     * Cria múltiplas FAQs de uma vez (cadastro em lote).
     * @param req Request do Express contendo array de FAQs.
     * @param res Response do Express.
     * @param user Usuário autenticado.
     * @returns Response com FAQs criadas ou erro.
     */
    async createFaqsBulk(req: Request, res: Response, user: User): Promise<Response> {
        try {
            if (this.authService && typeof this.authService.checkPermission === "function") {
                const hasPermission = await this.authService.checkPermission(
                    user.Id,
                    Module.Faq,
                    ActionType.Create
                );
                if (!hasPermission) {
                    throw new Error("Acesso negado ao módulo de FAQs.");
                }
            }
            const faqs = req.body;

            // Verifica se é um array
            if (!Array.isArray(faqs)) {
                return res.status(400).json({ error: "O corpo da requisição deve ser um array de FAQs." });
            }

            // Valida cada FAQ
            for (const faq of faqs) {
                if (!faq.Pergunta || !faq.Resposta) {
                    return res.status(400).json({
                        error: `FAQ inválida: Pergunta e Resposta são obrigatórias. Item: ${JSON.stringify(faq)}`
                    });
                }
            }

            // Cria todas as FAQs
            const faqsCriadas = await prisma.faq.createMany({
                data: faqs.map(faq => ({
                    Pergunta: faq.Pergunta,
                    Resposta: faq.Resposta,
                    Status: faq.Status || "Ativo",
                    Tipo: faq.Tipo || "Paciente",
                })),
            });

            // Busca as FAQs criadas para retornar
            const todasFaqs = await prisma.faq.findMany({
                orderBy: { CreatedAt: 'desc' },
                take: faqsCriadas.count,
            });

            return res.status(201).json({
                message: `${faqsCriadas.count} FAQ(s) criada(s) com sucesso.`,
                count: faqsCriadas.count,
                faqs: todasFaqs.slice(0, faqsCriadas.count),
            });
        } catch (error) {
            console.error("Erro ao criar FAQs em lote:", error);
            return res.status(500).json({ error: "Erro ao criar FAQs em lote." });
        }
    }

    /**
     * Exclui uma FAQ existente.
     * @param req Request do Express contendo id.
     * @param res Response do Express.
     * @param user Usuário autenticado.
     * @returns Response de sucesso ou erro.
     */
    async deleteFaq(req: Request, res: Response, user: User): Promise<Response> {
        try {
            if (this.authService && typeof this.authService.checkPermission === "function") {
                const hasPermission = await this.authService.checkPermission(
                    user.Id,
                    Module.Faq,
                    ActionType.Delete
                );
                if (!hasPermission) {
                    throw new Error("Acesso negado ao módulo de FAQs.");
                }
            }
            const id = normalizeParamString(req.params.id);
            await prisma.faq.delete({ where: { Id: id || "" } });
            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ error: "Erro ao deletar FAQ." });
        }
    }

    // ===================== CONFIGURAÇÕES GERAIS =====================

    /**
     * Busca todas as configurações do sistema.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com lista de configurações ou erro.
     */
    async getAll(req: Request, res: Response): Promise<Response> {
        try {
            const configuracoes = await prisma.configuracao.findMany();
            return res.status(200).json(configuracoes);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao buscar configurações." });
        }

    }

    /**
     * Busca configuração por ID.
     * @param req Request do Express contendo id.
     * @param res Response do Express.
     * @returns Response com configuração ou erro.
     */
    async getById(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const configuracao = await prisma.configuracao.findUnique({ where: { Id: id } });
            if (!configuracao) {
                return res.status(404).json({ error: "Configuração não encontrada." });
            }
            return res.status(200).json(configuracao);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao buscar configuração." });
        }
    }

    /**
     * Cria uma nova configuração.
     * @param req Request do Express contendo dados da configuração.
     * @param res Response do Express.
     * @param user Usuário autenticado.
     * @returns Response com configuração criada ou erro.
     */
    async create(req: Request, res: Response, user: User): Promise<Response> {
        try {
            if (this.authService && typeof this.authService.checkPermission === "function") {
                const hasPermission = await this.authService.checkPermission(
                    user.Id,
                    Module.Configuracoes,
                    ActionType.Create
                );
                if (!hasPermission) {
                    throw new Error("Acesso negado ao módulo de Configurações.");
                }
            }
            // Recebe todos os campos do body, exceto Id, CreatedAt, UpdatedAt
            const {
                googleTagManager,
                googleAnalytics,
                googleAds,
                agoraAppId,
                agoraAppCertificate,
                vindiApiKey,
                darkMode,
                idiomaPadrao,
                idiomasDisponiveis,
                logoUrl,
                tituloSistema,
                fusoHorarioPadrao,
                duracaoConsultaMin,
                intervaloEntreConsultas,
                antecedenciaMinAgendamento,
                antecedenciaMaxAgendamento,
                antecedenciaCancelamento,
                horarioGeracaoAutomaticaAgenda,
                percentualRepasseJuridico,
                percentualRepasseAutonomo,
                emitirNotaFiscal,
                emailHost,
                emailPort,
                emailUser,
                emailPassword,
                emailFrom,
                lembreteAntesConsulta,
                enviarNotificacaoSMS,
                enviarNotificacaoPush,
                politicaPrivacidadeUrl,
                termosUsoUrl,
                consentimentoGravacao,
                tempoRetencaoDadosMeses,
                anonimizarDadosInativos,
                tempoExpiracaoSessaoMinutos,
                politicaSenhaMinCaracteres,
                exigir2FA,
                bloqueioTentativasFalhas,
                manutencao
            } = req.body;

            const novaConfiguracao = await prisma.configuracao.create({
                data: {
                    googleTagManager,
                    googleAnalytics,
                    googleAds,
                    agoraAppId,
                    agoraAppCertificate,
                    vindiApiKey,
                    darkMode,
                    idiomaPadrao,
                    idiomasDisponiveis,
                    logoUrl,
                    tituloSistema,
                    fusoHorarioPadrao,
                    duracaoConsultaMin,
                    intervaloEntreConsultas,
                    antecedenciaMinAgendamento,
                    antecedenciaMaxAgendamento,
                    antecedenciaCancelamento,
                    horarioGeracaoAutomaticaAgenda,
                    percentualRepasseJuridico,
                    percentualRepasseAutonomo,
                    emitirNotaFiscal,
                    emailHost,
                    emailPort,
                    emailUser,
                    emailPassword,
                    emailFrom,
                    lembreteAntesConsulta,
                    enviarNotificacaoSMS,
                    enviarNotificacaoPush,
                    politicaPrivacidadeUrl,
                    termosUsoUrl,
                    consentimentoGravacao,
                    tempoRetencaoDadosMeses,
                    anonimizarDadosInativos,
                    tempoExpiracaoSessaoMinutos,
                    politicaSenhaMinCaracteres,
                    exigir2FA,
                    bloqueioTentativasFalhas,
                    manutencao
                }
            });
            return res.status(201).json(novaConfiguracao);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao criar configuração." });
        }
    }

    /**
     * Atualiza uma configuração existente.
     * @param req Request do Express contendo id e dados.
     * @param res Response do Express.
     * @param user Usuário autenticado.
     * @returns Response com configuração atualizada ou erro.
     */
    async update(req: Request, res: Response, user: User): Promise<Response> {
        try {
            if (this.authService && typeof this.authService.checkPermission === "function") {
                const hasPermission = await this.authService.checkPermission(
                    user.Id,
                    Module.Configuracoes,
                    ActionType.Update
                );
                if (!hasPermission) {
                    throw new Error("Acesso negado ao módulo de Configurações.");
                }
            }
            const id = normalizeParamString(req.params.id);
            const configuracaoAtualizada = await prisma.configuracao.update({
                where: { Id: id || "" },
                data: req.body
            });
            return res.status(200).json(configuracaoAtualizada);
        } catch (error) {
            return res.status(500).json({ error: "Erro ao atualizar configuração." });
        }
    }

    /**
     * Exclui uma configuração existente.
     * @param req Request do Express contendo id.
     * @param res Response do Express.
     * @param user Usuário autenticado.
     * @returns Response de sucesso ou erro.
     */
    async delete(req: Request, res: Response, user: User): Promise<Response> {
        try {
            if (this.authService && typeof this.authService.checkPermission === "function") {
                const hasPermission = await this.authService.checkPermission(
                    user.Id,
                    Module.Configuracoes,
                    ActionType.Delete
                );
                if (!hasPermission) {
                    throw new Error("Acesso negado ao módulo de Configurações.");
                }
            }
            const id = normalizeParamString(req.params.id);
            await prisma.configuracao.delete({ where: { Id: id || "" } });
            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ error: "Erro ao deletar configuração." });
        }
    }

    /**
     * Busca apenas Google Tag Manager e Google Analytics (endpoint público).
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com GTM e GA4 ou erro.
     */
    /**
     * ⚡ OTIMIZAÇÃO: Endpoint público de integrações com cache HTTP
     */
    async getIntegrationsPublic(req: Request, res: Response): Promise<Response> {
        try {
            const configuracao = await prisma.configuracao.findFirst({
                select: {
                    googleTagManager: true,
                    googleAnalytics: true,
                },
                orderBy: {
                    CreatedAt: 'desc',
                },
            });

            // ⚡ OTIMIZAÇÃO: Cache HTTP para integrações (15 minutos)
            // Integrações mudam muito raramente, cache longo é seguro
            res.setHeader('Cache-Control', 'public, max-age=900, s-maxage=900, stale-while-revalidate=1800');

            return res.status(200).json({
                googleTagManager: configuracao?.googleTagManager || null,
                googleAnalytics: configuracao?.googleAnalytics || null,
            });
        } catch (error) {
            return res.status(500).json({ error: "Erro ao buscar integrações." });
        }
    }

    /**
     * Busca status de manutenção (endpoint público - sem autenticação).
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com status de manutenção ou erro.
     */
    async getMaintenanceStatus(req: Request, res: Response): Promise<Response> {
        try {
            const configuracao = await prisma.configuracao.findFirst({
                orderBy: {
                    CreatedAt: 'desc',
                },
            });

            return res.status(200).json({
                manutencao: configuracao && configuracao.manutencao === true,
            });
        } catch (error) {
            console.error("Erro ao buscar status de manutenção:", error);
            // Em caso de erro, retorna false para não bloquear o sistema
            return res.status(200).json({
                manutencao: false,
            });
        }
    }
}
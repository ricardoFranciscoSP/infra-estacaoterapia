import { Request, Response } from "express";
import prisma from "../prisma/client";
import { AuthorizationService } from "../services/authorization.service";
import { VindiService } from "../services/vindi.service";
import { normalizeParamStringRequired } from "../utils/validation.util";

export class PlanosController {
    private authService: AuthorizationService;

    constructor() {
        this.authService = new AuthorizationService();
    }

    /**
     * Cria um ou mais planos (apenas Admin).
     * @param req Request do Express contendo array de planos.
     * @param res Response do Express.
     * @returns Response com planos criados e erros, se houver.
     */
    async createPlano(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);

            if (!userId) {
                return res.status(401).json({ message: "Usuário não autenticado", success: false });
            }

            const user = await prisma.user.findUnique({ where: { Id: userId } });

            if (!user || user.Role !== "Admin") {
                return res.status(403).json({ message: "Apenas Administradores podem criar planos.", success: false });
            }

            interface PlanoInput {
                Nome: string;
                Descricao?: string | Record<string, unknown> | Array<unknown>;
                Preco: number;
                Duracao: number;
                Tipo: string;
                Status?: string;
                Destaque?: boolean;
                VindiPlanId?: string;
                ProductId?: string;
            }

            const planosData = req.body as PlanoInput[];

            if (!Array.isArray(planosData)) {
                return res.status(400).json({ message: "O campo 'data' deve ser um array de objetos." });
            }

            const results = await Promise.all(
                planosData.map(async (plano: PlanoInput) => {
                    try {
                        // Cria produto na Vindi se não tiver ProductId
                        let productId = plano.ProductId;
                        if (!productId) {
                            try {
                                // Converte descrição para string se necessário
                                const descricaoString = typeof plano.Descricao === 'string'
                                    ? plano.Descricao
                                    : JSON.stringify(plano.Descricao || '');

                                const vindiProduct = await VindiService.createProduct({
                                    name: plano.Nome,
                                    code: `plano-${plano.Tipo.toLowerCase()}-${Date.now()}`,
                                    unit: "unit",
                                    status: "active",
                                    description: descricaoString.substring(0, 500), // Limita a 500 caracteres
                                    invoice: "always",
                                    pricing_schema: {
                                        price: plano.Preco,
                                        minimum_price: plano.Preco,
                                        schema_type: "per_unit"
                                    },
                                    body: descricaoString
                                });

                                productId = String((vindiProduct as { id?: number | string }).id || '');
                            } catch (vindiError) {
                                console.error('Erro ao criar produto na Vindi:', vindiError);
                                // Continua mesmo se falhar na Vindi
                            }
                        }

                        // Garantir que Descricao seja JSON válido
                        let descricaoJson = null;
                        if (plano.Descricao) {
                            if (typeof plano.Descricao === 'string') {
                                try {
                                    descricaoJson = JSON.parse(plano.Descricao);
                                } catch {
                                    descricaoJson = { texto: plano.Descricao };
                                }
                            } else if (typeof plano.Descricao === 'object' && !Array.isArray(plano.Descricao)) {
                                descricaoJson = plano.Descricao;
                            }
                        }

                        const created = await prisma.planoAssinatura.create({
                            data: {
                                Nome: plano.Nome,
                                Preco: plano.Preco,
                                Duracao: plano.Duracao,
                                Tipo: plano.Tipo,
                                Descricao: descricaoJson,
                                AdminId: userId,
                                ProductId: productId,
                                Status: plano.Status || "ativo",
                                Destaque: plano.Destaque,
                                VindiPlanId: plano.VindiPlanId
                            }
                        });
                        return { success: true, plano: created };
                    } catch (error: unknown) {
                        const prismaError = error as { code?: string; message?: string };
                        if (prismaError.code === 'P2002') {
                            return { success: false, error: `Plano com VindiPlanId '${plano.VindiPlanId}' já existe.` };
                        }
                        return { success: false, error: prismaError.message || 'Erro desconhecido' };
                    }
                })
            );
            const createdPlanos = results.filter(r => r.success).map(r => r.plano);
            const failedPlanos = results.filter(r => !r.success).map(r => r.error);
            return res.status(201).json({
                message: "Processamento concluído",
                createdPlanos,
                failedPlanos
            });
        } catch (error) {
            console.error("Erro ao criar planos:", error);
            res.status(500).json({ message: "Erro interno no servidor", error: (error as Error).message });
        }
    }

    /**
     * Busca todos os planos ativos ordenados por tipo.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com lista de planos.
     * ⚡ OTIMIZAÇÃO: Evita query extra para admin em rotas públicas, adiciona cache HTTP
     */
    async fetchPlanos(req: Request, res: Response) {
        try {
            // ⚡ OTIMIZAÇÃO: Só verifica admin se houver token na requisição
            // Para rotas públicas sem token, sempre retorna apenas planos ativos
            const userId = this.authService.getLoggedUserId(req);
            let isAdmin = false;

            // Só faz query se houver userId (evita query desnecessária para rotas públicas)
            if (userId) {
                isAdmin = await prisma.user.findUnique({
                    where: { Id: userId },
                    select: { Role: true }
                }).then(user => user?.Role === "Admin") ?? false;
            }

            // ⚡ OTIMIZAÇÃO: Query otimizada - filtra no banco ao invés de buscar tudo
            const planos = await prisma.planoAssinatura.findMany({
                where: isAdmin ? {} : {
                    Status: "ativo",
                    NOT: [
                        { Tipo: "Unica" },
                        { Tipo: "Avulsa" }
                    ]
                },
                select: {
                    Id: true,
                    Nome: true,
                    Descricao: true,
                    Preco: true,
                    Duracao: true,
                    Tipo: true,
                    Status: true,
                    Destaque: true,
                    AdminId: true,
                    VindiPlanId: true,
                    ProductId: true,
                    CreatedAt: true,
                    UpdatedAt: true
                },
                // ⚡ OTIMIZAÇÃO: Ordena no banco ao invés de na aplicação
                orderBy: [
                    { Tipo: 'asc' }, // Ordena por tipo primeiro
                    { Preco: 'asc' } // Depois por preço
                ]
            });

            // ⚡ OTIMIZAÇÃO: Ordenação customizada apenas quando necessário
            interface PlanoOrdenado {
                Tipo?: string | null;
            }

            const orderedPlanos = planos.sort((a: PlanoOrdenado, b: PlanoOrdenado) => {
                const order: Record<string, number> = { mensal: 1, trimestral: 2, semestral: 3, anual: 4 };
                const tipoA = a.Tipo?.toLowerCase() || '';
                const tipoB = b.Tipo?.toLowerCase() || '';
                return (order[tipoA] || 99) - (order[tipoB] || 99);
            });

            // ⚡ OTIMIZAÇÃO: Cache HTTP para planos públicos (5 minutos)
            // Planos mudam raramente, então cache é seguro para rotas públicas
            if (!isAdmin) {
                res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
            }

            return res.status(200).json(orderedPlanos);
        } catch (error) {
            console.error("Erro ao buscar planos:", error);
            res.status(500).json({ message: "Erro interno no servidor", error: (error as Error).message });
        }
    }

    /**
     * Busca todos os planos ativos para o paciente autenticado.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com lista de planos.
     */
    async getPlanosPaciente(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ message: "Usuário não autenticado", success: false });
            }


            const planos = await prisma.planoAssinatura.findMany({
                where: {
                    Status: "ativo",
                    NOT: [
                        { Tipo: "Unica" }
                    ]
                },
                select: {
                    Id: true,
                    Nome: true,
                    Descricao: true,
                    Preco: true,
                    Duracao: true,
                    Tipo: true,
                    Status: true,
                    Destaque: true,
                    AdminId: true,
                    VindiPlanId: true,
                    ProductId: true,
                    CreatedAt: true,
                    UpdatedAt: true
                }
            });

            interface PlanoOrdenado {
                Tipo?: string | null;
            }

            const orderedPlanos = planos.sort((a: PlanoOrdenado, b: PlanoOrdenado) => {
                const order: Record<string, number> = { mensal: 1, trimestral: 2, semestral: 3, anual: 4 };
                const tipoA = a.Tipo?.toLowerCase() || '';
                const tipoB = b.Tipo?.toLowerCase() || '';
                return (order[tipoA] || 99) - (order[tipoB] || 99);
            });
            return res.status(200).json(orderedPlanos);
        } catch (error) {
            console.error("Erro ao buscar planos:", error);
            res.status(500).json({ message: "Erro interno no servidor", error: (error as Error).message });
        }
    }

    /**
     * Busca plano por ID.
     * @param req Request do Express contendo parâmetro id.
     * @param res Response do Express.
     * @returns Response com plano ou erro.
     */
    async fetchPlanoById(req: Request, res: Response) {
        try {
            const id = normalizeParamStringRequired(req.params.id);
            if (!id) {
                return res.status(400).json({ message: "ID é obrigatório" });
            }
            // Busca por ProductId ou Tipo
            const plano = await prisma.planoAssinatura.findFirst({
                where: {
                    OR: [
                        { ProductId: id },
                        { Tipo: id },
                        { Id: id }
                    ]
                },
                select: {
                    Id: true,
                    Nome: true,
                    Descricao: true,
                    Preco: true,
                    Duracao: true,
                    Tipo: true,
                    Status: true,
                    Destaque: true,
                    AdminId: true,
                    VindiPlanId: true,
                    ProductId: true,
                    CreatedAt: true,
                    UpdatedAt: true
                }
            });
            if (!plano) {
                return res.status(404).json({ message: `Plano com identificador '${id}' não encontrado` });
            }
            return res.status(200).json(plano);
        } catch (error) {
            console.error("Erro ao buscar plano por ProductId ou Tipo:", error);
            res.status(500).json({ message: "Erro interno no servidor", error: (error as Error).message });
        }
    }

    /**
     * Atualiza um plano existente (apenas Admin).
     * @param req Request do Express contendo parâmetro id e dados do plano.
     * @param res Response do Express.
     * @returns Response com plano atualizado ou erro.
     */
    async updatePlano(req: Request, res: Response) {
        try {
            const id = normalizeParamStringRequired(req.params.id);
            if (!id) {
                return res.status(400).json({ message: "ID é obrigatório", success: false });
            }
            const userId = this.authService.getLoggedUserId(req);

            if (!userId) {
                return res.status(401).json({ message: "Usuário não autenticado", success: false });
            }

            const user = await prisma.user.findUnique({ where: { Id: userId } });

            if (!user || user.Role !== "Admin") {
                return res.status(403).json({ message: "Apenas Administradores podem atualizar planos." });
            }

            const plano = await prisma.planoAssinatura.findUnique({ where: { Id: id } });

            if (!plano) {
                return res.status(404).json({ message: `Plano com ID ${id} não encontrado` });
            }

            const updatedPlano = await prisma.planoAssinatura.update({
                where: { Id: id },
                data: req.body
            });
            return res.status(200).json({ message: "Plano atualizado com sucesso", updatedPlano });
        } catch (error) {
            console.error("Erro ao atualizar plano:", error);
            res.status(500).json({ message: "Erro interno no servidor", error: (error as Error).message });
        }
    }

    /**
     * Deleta um plano existente (apenas Admin).
     * @param req Request do Express contendo parâmetro id.
     * @param res Response do Express.
     * @returns Response de sucesso ou erro.
     */
    async deletePlano(req: Request, res: Response) {
        try {
            const id = normalizeParamStringRequired(req.params.id);
            if (!id) {
                return res.status(400).json({ message: "ID é obrigatório", success: false });
            }
            const userId = this.authService.getLoggedUserId(req);

            if (!userId) {
                return res.status(401).json({ message: "Usuário não autenticado", success: false });
            }

            const user = await prisma.user.findUnique({ where: { Id: userId } });

            if (!user || user.Role !== "Admin") {
                return res.status(403).json({ message: "Apenas Administradores podem deletar planos." });
            }

            const plano = await prisma.planoAssinatura.findUnique({ where: { Id: id } });

            if (!plano) {
                return res.status(404).json({ message: `Plano com ID ${id} não encontrado` });
            }

            await prisma.planoAssinatura.delete({ where: { Id: id } });
            return res.status(200).json({ message: "Plano deletado com sucesso" });
        } catch (error) {
            console.error("Erro ao deletar plano:", error);
            res.status(500).json({ message: "Erro interno no servidor", error: (error as Error).message });
        }
    }
}

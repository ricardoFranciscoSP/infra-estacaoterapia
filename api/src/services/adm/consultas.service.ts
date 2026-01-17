import prisma from "../../prisma/client";
import { Module, ActionType } from "../../types/permissions.types";
import { User } from "../../types/user.types";
import { ConsultasMensaisResult, ConsultasRealizadasResult } from "../../types/consultas.types";
import { STATUS } from "../../constants/status.constants";

import { AuthorizationService } from "../authorization.service";

export class ConsultasService {
    private authorizationService: AuthorizationService | undefined;

    constructor(authorizationService?: AuthorizationService) {
        this.authorizationService = authorizationService;
    }

    /**
     * Retorna o total de consultas realizadas (status "Completed")
     * @param user - Usuário autenticado
     * @returns Total de consultas realizadas
     */
    async getConsultasRealizadas(user: User): Promise<ConsultasRealizadasResult> {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Sessions,
                ActionType.Read
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de consultas.");
            }
        }

        const total = await prisma.consulta.count({
            where: {
                Status: 'Realizada'
            }
        });

        return { total };
    }

    /**
     * Retorna as consultas concluídas agrupadas por mês do ano informado.
     * @param user Usuário autenticado
     * @param year Ano de referência (padrão: ano atual)
     */
    async getConsultasMensais(user: User, year?: number): Promise<ConsultasMensaisResult> {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Sessions,
                ActionType.Read
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de consultas.");
            }
        }

        const targetYear = year ?? new Date().getFullYear();

        // Consulta agregada por mês via SQL nativo para melhor performance
        interface QueryResult {
            month: number;
            total: bigint | number;
        }
        const rows: QueryResult[] = await prisma.$queryRaw<QueryResult[]>`
            SELECT
                EXTRACT(MONTH FROM "Date") AS month,
                COUNT(*) AS total
            FROM "Consulta"
            WHERE "Status" = ${STATUS.COMPLETED}
              AND EXTRACT(YEAR FROM "Date") = ${targetYear}
            GROUP BY month
            ORDER BY month`;

        const counts = Array(12).fill(0) as number[];
        for (const r of rows) {
            const m = Number(r.month); // 1..12
            const t = Number(r.total);
            if (m >= 1 && m <= 12) counts[m - 1] = t;
        }
        const total = counts.reduce((acc, v) => acc + v, 0);

        return { year: targetYear, counts, total };
    }

    /**
     * Retorna o total de consultas canceladas (todos os status de cancelamento)
     * @param user - Usuário autenticado
     * @returns Total de consultas canceladas
     */
    async getConsultasCanceladas(user: User): Promise<{ total: number }> {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Sessions,
                ActionType.Read
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de consultas.");
            }
        }

        // Busca todas as consultas com status de cancelamento
        const total = await prisma.consulta.count({
            where: {
                Status: {
                    in: [
                        'CanceladaPacienteNoPrazo',
                        'CanceladaPacienteForaDoPrazo',
                        'CanceladaPsicologoNoPrazo',
                        'CanceladaPsicologoForaDoPrazo',
                        'CanceladaNaoCumprimentoContratualPaciente',
                        'CanceladaNaoCumprimentoContratualPsicologo',
                        'CanceladaForcaMaior',
                        'CanceladoAdministrador',
                        'Cancelado', // Status legado
                    ]
                }
            }
        });

        return { total };
    }

    /**
     * Retorna o total de consultas do mês atual (todas, independente do status)
     * @param user - Usuário autenticado
     * @returns Total de consultas do mês atual
     */
    async getConsultasMesAtual(user: User): Promise<{ total: number }> {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Sessions,
                ActionType.Read
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de consultas.");
            }
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-11 (JavaScript)

        // Primeiro dia do mês atual (00:00:00)
        const startDate = new Date(year, month, 1, 0, 0, 0, 0);
        // Último dia do mês atual (23:59:59.999)
        const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const total = await prisma.consulta.count({
            where: {
                Date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        return { total };
    }

    /**
     * Retorna a lista de consultas do mês atual (todas, independente do status)
     * @param user - Usuário autenticado
     * @returns Lista de consultas do mês atual
     */
    async getConsultasMesAtualLista(user: User) {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Sessions,
                ActionType.Read
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de consultas.");
            }
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-11

        const startDate = new Date(year, month, 1, 0, 0, 0, 0);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const consultas = await prisma.consulta.findMany({
            where: {
                Date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                Paciente: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true
                    }
                },
                Psicologo: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true
                    }
                },
                ReservaSessao: {
                    select: {
                        Status: true,
                        VideoCallLink: true
                    }
                }
            },
            orderBy: [
                { Date: 'asc' },
                { Time: 'asc' }
            ]
        });

        return consultas;
    }

    /**
     * Retorna as consultas agrupadas por mês do ano informado (TODAS as consultas, não apenas realizadas)
     * @param user Usuário autenticado
     * @param year Ano de referência (padrão: ano atual)
     */
    async getConsultasMensaisTodas(user: User, year?: number): Promise<ConsultasMensaisResult> {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Sessions,
                ActionType.Read
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de consultas.");
            }
        }

        const targetYear = year ?? new Date().getFullYear();

        // Consulta agregada por mês via SQL nativo para melhor performance
        // Conta TODAS as consultas, não apenas realizadas
        interface QueryResult {
            month: number;
            total: bigint | number;
        }
        const rows: QueryResult[] = await prisma.$queryRaw<QueryResult[]>`
            SELECT
                EXTRACT(MONTH FROM "Date") AS month,
                COUNT(*) AS total
            FROM "Consulta"
            WHERE EXTRACT(YEAR FROM "Date") = ${targetYear}
            GROUP BY month
            ORDER BY month`;

        const counts = Array(12).fill(0) as number[];
        for (const r of rows) {
            const m = Number(r.month); // 1..12
            const t = Number(r.total);
            if (m >= 1 && m <= 12) counts[m - 1] = t;
        }
        const total = counts.reduce((acc, v) => acc + v, 0);

        return { year: targetYear, counts, total };
    }
}

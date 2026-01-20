import prisma from "../prisma/client";
import { ActionType, Module } from "../generated/prisma";
import ExcelJS from "exceljs";
import puppeteer from "puppeteer";
import { getPuppeteerLaunchOptions } from "../utils/puppeteer";

export interface AuditLogData {
    userId: string;
    actionType: ActionType;
    module: Module;
    description: string;
    ipAddress?: string;
    status?: string;
    metadata?: Record<string, unknown>;
}

interface AuditFilters {
    page?: number;
    limit?: number;
    actionType?: ActionType;
    module?: Module;
    userId?: string;
    status?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
}

interface PaginatedAuditResult {
    audits: Array<{
        Id: string;
        UserId: string;
        ActionType: ActionType;
        Module: Module;
        Description: string;
        IpAddress: string | null;
        Status: string | null;
        Metadata: string | null;
        Timestamp: Date;
        User: {
            Id: string;
            Nome: string;
            Email: string;
            Role: string;
        } | null;
    }>;
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export class AuditService {
    /**
     * Registra um evento de auditoria no banco de dados
     */
    async log(auditData: AuditLogData): Promise<void> {
        try {
            // Validação dos dados antes de salvar
            if (!auditData.userId) {
                console.error("❌ [AuditService] userId é obrigatório");
                return;
            }
            if (auditData.userId === 'system') {
                console.warn("⚠️  [AuditService] userId 'system' não é válido para auditoria. Pulando registro.");
                return;
            }
            if (!auditData.actionType) {
                console.error("❌ [AuditService] actionType é obrigatório");
                return;
            }
            if (!auditData.module) {
                console.error("❌ [AuditService] module é obrigatório");
                return;
            }
            if (!auditData.description) {
                console.error("❌ [AuditService] description é obrigatório");
                return;
            }

            console.log(`📝 [AuditService] Tentando registrar auditoria:`, {
                userId: auditData.userId,
                actionType: auditData.actionType,
                module: auditData.module,
                description: auditData.description.substring(0, 100),
            });

            const result = await prisma.adminActionLog.create({
                data: {
                    UserId: auditData.userId,
                    ActionType: auditData.actionType,
                    Module: auditData.module,
                    Description: auditData.description,
                    IpAddress: auditData.ipAddress || null,
                    Status: auditData.status || "Sucesso",
                    Metadata: auditData.metadata ? JSON.stringify(auditData.metadata) : null,
                    Timestamp: new Date(),
                },
            });

            console.log(`✅ [AuditService] Auditoria registrada com sucesso. ID: ${result.Id} | Module: ${auditData.module} | ActionType: ${auditData.actionType} | UserId: ${auditData.userId}`);
        } catch (error) {
            // Log detalhado do erro
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            
            // Verifica se é um erro do Prisma
            let prismaErrorDetails = {};
            if (error && typeof error === 'object' && 'code' in error) {
                prismaErrorDetails = {
                    code: (error as { code?: string }).code,
                    meta: (error as { meta?: unknown }).meta,
                };
            }

            console.error("❌ [AuditService] Erro ao registrar auditoria:", {
                message: errorMessage,
                stack: errorStack,
                prismaError: prismaErrorDetails,
                auditData: {
                    userId: auditData.userId,
                    actionType: auditData.actionType,
                    module: auditData.module,
                    description: auditData.description?.substring(0, 100),
                },
            });
            
            // Se for um erro de foreign key (usuário não existe), logamos mas não lançamos
            if (prismaErrorDetails && typeof prismaErrorDetails === 'object' && 'code' in prismaErrorDetails) {
                if ((prismaErrorDetails as { code?: string }).code === 'P2003') {
                    console.error("❌ [AuditService] Erro de Foreign Key: UserId não existe no banco:", auditData.userId);
                }
            }
            
            // Não lança erro para não interromper o fluxo principal
        }
    }

    /**
     * Registra auditoria de pagamento (método legado - mantido para compatibilidade)
     */
    async logPaymentAudit(event: {
        userId?: string;
        eventType: string;
        status: string;
        paymentId?: string;
        amount?: number;
        cardLast4?: string;
        message?: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const actionType = this.mapEventToActionType(event.eventType);
        const description = this.buildDescription(event);

        await this.log({
            userId: event.userId || "system",
            actionType,
            module: "Payments",
            description,
            status: event.status,
            metadata: event.metadata,
        });
    }

    /**
     * Lista todas as auditorias com filtros opcionais
     */
    async listAudits(filters?: AuditFilters): Promise<PaginatedAuditResult> {
        try {
            const page = filters?.page || 1;
            const limit = filters?.limit || 50;
            const skip = (page - 1) * limit;

            const where: {
                UserId?: string;
                ActionType?: ActionType;
                Module?: Module;
                Status?: string;
                Timestamp?: {
                    gte?: Date;
                    lte?: Date;
                };
                OR?: Array<{
                    Id?: { contains: string; mode?: "insensitive" };
                    Description?: { contains: string; mode?: "insensitive" };
                    IpAddress?: { contains: string; mode?: "insensitive" };
                }>;
            } = {};

        if (filters?.userId) {
            where.UserId = filters.userId;
        }

        if (filters?.actionType) {
            where.ActionType = filters.actionType;
        }

        if (filters?.module) {
            where.Module = filters.module;
        }

        if (filters?.status) {
            where.Status = filters.status;
        }

        if (filters?.startDate || filters?.endDate) {
            where.Timestamp = {};
            if (filters.startDate) {
                where.Timestamp.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.Timestamp.lte = filters.endDate;
            }
        }

        if (filters?.search) {
            where.OR = [
                { Id: { contains: filters.search, mode: "insensitive" } },
                { Description: { contains: filters.search, mode: "insensitive" } },
                { IpAddress: { contains: filters.search, mode: "insensitive" } },
            ];
        }

            const [audits, total] = await Promise.all([
                prisma.adminActionLog.findMany({
                    where,
                    orderBy: { Timestamp: "desc" },
                    take: limit,
                    skip,
                    include: {
                        User: {
                            select: {
                                Id: true,
                                Nome: true,
                                Email: true,
                                Role: true,
                            },
                        },
                    },
                }),
                prisma.adminActionLog.count({ where }),
            ]);

            console.log(`📊 [AuditService] Listando auditorias: ${audits.length} de ${total}`);

            return {
                audits: audits.map((audit) => ({
                    Id: audit.Id,
                    UserId: audit.UserId,
                    ActionType: audit.ActionType,
                    Module: audit.Module,
                    Description: audit.Description,
                    IpAddress: audit.IpAddress,
                    Status: audit.Status,
                    Metadata: audit.Metadata,
                    Timestamp: audit.Timestamp,
                    User: audit.User
                        ? {
                              Id: audit.User.Id,
                              Nome: audit.User.Nome,
                              Email: audit.User.Email,
                              Role: audit.User.Role.toString(),
                          }
                        : null,
                })),
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            console.error("❌ [AuditService] Erro ao listar auditorias:", {
                message: errorMessage,
                stack: errorStack,
                filters,
            });
            throw error; // Re-lança o erro para ser tratado pelo controller
        }
    }

    /**
     * Busca uma auditoria específica por ID
     */
    async getAuditById(id: string): Promise<{
        Id: string;
        UserId: string;
        ActionType: ActionType;
        Module: Module;
        Description: string;
        IpAddress: string | null;
        Status: string | null;
        Metadata: string | null;
        Timestamp: Date;
        User: {
            Id: string;
            Nome: string;
            Email: string;
            Role: string;
        } | null;
    } | null> {
        console.log(`🔍 [AuditService] Buscando auditoria: ${id}`);

        const audit = await prisma.adminActionLog.findUnique({
            where: { Id: id },
            include: {
                User: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true,
                        Role: true,
                    },
                },
            },
        });

        if (!audit) {
            console.log("❌ [AuditService] Auditoria não encontrada");
            return null;
        }

        console.log("✅ [AuditService] Auditoria encontrada:", audit.Id);

        return {
            Id: audit.Id,
            UserId: audit.UserId,
            ActionType: audit.ActionType,
            Module: audit.Module,
            Description: audit.Description,
            IpAddress: audit.IpAddress,
            Status: audit.Status,
            Metadata: audit.Metadata,
            Timestamp: audit.Timestamp,
            User: audit.User
                ? {
                      Id: audit.User.Id,
                      Nome: audit.User.Nome,
                      Email: audit.User.Email,
                      Role: audit.User.Role.toString(),
                  }
                : null,
        };
    }

    /**
     * Busca auditorias por usuário
     */
    async getAuditsByUser(userId: string): Promise<Array<{
        Id: string;
        ActionType: ActionType;
        Module: Module;
        Description: string;
        IpAddress: string | null;
        Status: string | null;
        Timestamp: Date;
    }>> {
        console.log(`🔍 [AuditService] Buscando auditorias do usuário: ${userId}`);

        const audits = await prisma.adminActionLog.findMany({
            where: { UserId: userId },
            orderBy: { Timestamp: "desc" },
            select: {
                Id: true,
                ActionType: true,
                Module: true,
                Description: true,
                IpAddress: true,
                Status: true,
                Timestamp: true,
            },
        });

        console.log(`✅ [AuditService] ${audits.length} auditorias encontradas`);
        return audits;
    }

    /**
     * Busca auditorias por tipo de evento
     */
    async getAuditsByEventType(actionType: ActionType): Promise<Array<{
        Id: string;
        UserId: string;
        ActionType: ActionType;
        Module: Module;
        Description: string;
        IpAddress: string | null;
        Status: string | null;
        Timestamp: Date;
        User: {
            Id: string;
            Nome: string;
            Email: string;
            Role: string;
        } | null;
    }>> {
        console.log(`🔍 [AuditService] Buscando auditorias do tipo: ${actionType}`);

        const audits = await prisma.adminActionLog.findMany({
            where: { ActionType: actionType },
            orderBy: { Timestamp: "desc" },
            include: {
                User: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true,
                        Role: true,
                    },
                },
            },
        });

        console.log(`✅ [AuditService] ${audits.length} auditorias encontradas`);

        return audits.map((audit) => ({
            Id: audit.Id,
            UserId: audit.UserId,
            ActionType: audit.ActionType,
            Module: audit.Module,
            Description: audit.Description,
            IpAddress: audit.IpAddress,
            Status: audit.Status,
            Timestamp: audit.Timestamp,
            User: audit.User
                ? {
                      Id: audit.User.Id,
                      Nome: audit.User.Nome,
                      Email: audit.User.Email,
                      Role: audit.User.Role.toString(),
                  }
                : null,
        }));
    }

    /**
     * Mapeia o tipo de evento para ActionType do Prisma
     */
    private mapEventToActionType(eventType: string): ActionType {
        const mapping: Record<string, ActionType> = {
            payment_created: "Create",
            payment_updated: "Update",
            payment_failed: "Update",
            payment_approved: "Approve",
            payment_deleted: "Delete",
            payment_viewed: "Read",
            subscription_created: "Create",
            subscription_cancelled: "Delete",
            refund_processed: "Update",
        };

        return mapping[eventType] || "Manage";
    }

    /**
     * Constrói a descrição do evento de auditoria
     */
    private buildDescription(event: {
        eventType: string;
        status: string;
        paymentId?: string;
        amount?: number;
        cardLast4?: string;
        message?: string;
        metadata?: Record<string, unknown>;
    }): string {
        let description = `Evento: ${event.eventType} | Status: ${event.status}`;

        if (event.paymentId) {
            description += ` | Payment ID: ${event.paymentId}`;
        }

        if (event.amount) {
            description += ` | Valor: R$ ${(event.amount / 100).toFixed(2)}`;
        }

        if (event.cardLast4) {
            description += ` | Cartão: **** ${event.cardLast4}`;
        }

        if (event.message) {
            description += ` | Mensagem: ${event.message}`;
        }

        if (event.metadata) {
            description += ` | Metadata: ${JSON.stringify(event.metadata)}`;
        }

        return description;
    }

    /**
     * Exporta auditorias para Excel formatado
     */
    async exportToExcel(filters?: AuditFilters): Promise<Buffer> {
        try {
            // Buscar todas as auditorias (sem paginação para exportação completa)
            const where: {
                UserId?: string;
                ActionType?: ActionType;
                Module?: Module;
                Status?: string;
                Timestamp?: {
                    gte?: Date;
                    lte?: Date;
                };
                OR?: Array<{
                    Id?: { contains: string; mode?: "insensitive" };
                    Description?: { contains: string; mode?: "insensitive" };
                    IpAddress?: { contains: string; mode?: "insensitive" };
                }>;
            } = {};

            if (filters?.userId) {
                where.UserId = filters.userId;
            }

            if (filters?.actionType) {
                where.ActionType = filters.actionType;
            }

            if (filters?.module) {
                where.Module = filters.module;
            }

            if (filters?.status) {
                where.Status = filters.status;
            }

            if (filters?.startDate || filters?.endDate) {
                where.Timestamp = {};
                if (filters.startDate) {
                    where.Timestamp.gte = filters.startDate;
                }
                if (filters.endDate) {
                    where.Timestamp.lte = filters.endDate;
                }
            }

            if (filters?.search) {
                where.OR = [
                    { Id: { contains: filters.search, mode: "insensitive" } },
                    { Description: { contains: filters.search, mode: "insensitive" } },
                    { IpAddress: { contains: filters.search, mode: "insensitive" } },
                ];
            }

            const audits = await prisma.adminActionLog.findMany({
                where,
                orderBy: { Timestamp: "desc" },
                include: {
                    User: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true,
                            Role: true,
                        },
                    },
                },
            });

            // Criar workbook Excel
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Relatório de Auditoria");

            // Definir colunas
            worksheet.columns = [
                { header: "ID", key: "id", width: 15 },
                { header: "Data/Hora", key: "timestamp", width: 20 },
                { header: "Usuário", key: "usuario", width: 30 },
                { header: "Email", key: "email", width: 30 },
                { header: "Perfil", key: "perfil", width: 15 },
                { header: "Módulo", key: "modulo", width: 20 },
                { header: "Tipo de Ação", key: "acao", width: 15 },
                { header: "Descrição", key: "descricao", width: 50 },
                { header: "Status", key: "status", width: 15 },
                { header: "IP", key: "ip", width: 18 },
                { header: "Metadata", key: "metadata", width: 30 },
            ];

            // Estilizar cabeçalho
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
            headerRow.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF4472C4" },
            };
            headerRow.alignment = { vertical: "middle", horizontal: "center" };
            headerRow.height = 20;

            // Adicionar dados
            audits.forEach((audit) => {
                const metadata = audit.Metadata ? JSON.parse(audit.Metadata) : null;
                const metadataStr = metadata ? JSON.stringify(metadata).substring(0, 100) : "";

                worksheet.addRow({
                    id: audit.Id.substring(0, 8),
                    timestamp: audit.Timestamp.toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "medium",
                    }),
                    usuario: audit.User?.Nome || "N/A",
                    email: audit.User?.Email || "N/A",
                    perfil: audit.User?.Role || "N/A",
                    modulo: audit.Module,
                    acao: audit.ActionType,
                    descricao: audit.Description,
                    status: audit.Status || "N/A",
                    ip: audit.IpAddress || "N/A",
                    metadata: metadataStr,
                });
            });

            // Estilizar linhas alternadas
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    if (rowNumber % 2 === 0) {
                        row.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "FFF2F2F2" },
                        };
                    }
                }
                row.alignment = { vertical: "middle", horizontal: "left" };
                row.height = 20;
            });

            // Congelar primeira linha
            worksheet.views = [{ state: "frozen", ySplit: 1 }];

            // Gerar buffer
            const buffer = await workbook.xlsx.writeBuffer();
            return Buffer.from(buffer);
        } catch (error) {
            console.error("❌ [AuditService] Erro ao exportar para Excel:", error);
            throw error;
        }
    }

    /**
     * Exporta auditorias para PDF formatado
     */
    async exportToPDF(filters?: AuditFilters): Promise<Buffer> {
        try {
            // Buscar todas as auditorias
            const where: {
                UserId?: string;
                ActionType?: ActionType;
                Module?: Module;
                Status?: string;
                Timestamp?: {
                    gte?: Date;
                    lte?: Date;
                };
                OR?: Array<{
                    Id?: { contains: string; mode?: "insensitive" };
                    Description?: { contains: string; mode?: "insensitive" };
                    IpAddress?: { contains: string; mode?: "insensitive" };
                }>;
            } = {};

            if (filters?.userId) {
                where.UserId = filters.userId;
            }

            if (filters?.actionType) {
                where.ActionType = filters.actionType;
            }

            if (filters?.module) {
                where.Module = filters.module;
            }

            if (filters?.status) {
                where.Status = filters.status;
            }

            if (filters?.startDate || filters?.endDate) {
                where.Timestamp = {};
                if (filters.startDate) {
                    where.Timestamp.gte = filters.startDate;
                }
                if (filters.endDate) {
                    where.Timestamp.lte = filters.endDate;
                }
            }

            if (filters?.search) {
                where.OR = [
                    { Id: { contains: filters.search, mode: "insensitive" } },
                    { Description: { contains: filters.search, mode: "insensitive" } },
                    { IpAddress: { contains: filters.search, mode: "insensitive" } },
                ];
            }

            const audits = await prisma.adminActionLog.findMany({
                where,
                orderBy: { Timestamp: "desc" },
                include: {
                    User: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true,
                            Role: true,
                        },
                    },
                },
            });

            // Gerar HTML para o PDF
            const html = this.generatePDFHTML(audits, filters);

            // Converter HTML para PDF usando Puppeteer
            const browser = await puppeteer.launch(getPuppeteerLaunchOptions());

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: "networkidle0" });
            const pdfBuffer = await page.pdf({
                format: "A4",
                landscape: true,
                margin: {
                    top: "20mm",
                    right: "15mm",
                    bottom: "20mm",
                    left: "15mm",
                },
                printBackground: true,
            });

            await browser.close();

            return Buffer.from(pdfBuffer);
        } catch (error) {
            console.error("❌ [AuditService] Erro ao exportar para PDF:", error);
            throw error;
        }
    }

    /**
     * Gera HTML formatado para o PDF
     */
    private generatePDFHTML(
        audits: Array<{
            Id: string;
            UserId: string;
            ActionType: ActionType;
            Module: Module;
            Description: string;
            IpAddress: string | null;
            Status: string | null;
            Metadata: string | null;
            Timestamp: Date;
            User: {
                Id: string;
                Nome: string;
                Email: string;
                Role: string;
            } | null;
        }>,
        filters?: AuditFilters
    ): string {
        const total = audits.length;
        const dataGeracao = new Date().toLocaleString("pt-BR");

        let filtrosAplicados = "Nenhum filtro aplicado";
        if (filters) {
            const filtros: string[] = [];
            if (filters.actionType) filtros.push(`Tipo: ${filters.actionType}`);
            if (filters.module) filtros.push(`Módulo: ${filters.module}`);
            if (filters.status) filtros.push(`Status: ${filters.status}`);
            if (filters.startDate) filtros.push(`De: ${filters.startDate.toLocaleDateString("pt-BR")}`);
            if (filters.endDate) filtros.push(`Até: ${filters.endDate.toLocaleDateString("pt-BR")}`);
            if (filtros.length > 0) {
                filtrosAplicados = filtros.join(" | ");
            }
        }

        const rows = audits
            .map((audit) => {
                return `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${audit.Id.substring(0, 8)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${audit.Timestamp.toLocaleString("pt-BR")}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${audit.User?.Nome || "N/A"}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${audit.User?.Email || "N/A"}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${audit.User?.Role || "N/A"}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${audit.Module}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${audit.ActionType}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${audit.Description.substring(0, 60)}${audit.Description.length > 60 ? "..." : ""}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${audit.Status || "N/A"}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${audit.IpAddress || "N/A"}</td>
                </tr>
            `;
            })
            .join("");

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #4472C4;
                    padding-bottom: 20px;
                }
                .header h1 {
                    color: #4472C4;
                    margin: 0;
                    font-size: 24px;
                }
                .info {
                    margin-bottom: 20px;
                    font-size: 12px;
                    color: #666;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th {
                    background-color: #4472C4;
                    color: white;
                    padding: 10px;
                    text-align: left;
                    font-size: 11px;
                    font-weight: bold;
                }
                td {
                    padding: 8px;
                    border: 1px solid #ddd;
                    font-size: 10px;
                }
                tr:nth-child(even) {
                    background-color: #f2f2f2;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Relatório de Auditoria</h1>
            </div>
            <div class="info">
                <p><strong>Data de Geração:</strong> ${dataGeracao}</p>
                <p><strong>Total de Registros:</strong> ${total}</p>
                <p><strong>Filtros Aplicados:</strong> ${filtrosAplicados}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Data/Hora</th>
                        <th>Usuário</th>
                        <th>Email</th>
                        <th>Perfil</th>
                        <th>Módulo</th>
                        <th>Tipo de Ação</th>
                        <th>Descrição</th>
                        <th>Status</th>
                        <th>IP</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </body>
        </html>
        `;
    }
}

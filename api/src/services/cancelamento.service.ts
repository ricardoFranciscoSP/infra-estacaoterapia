import prisma from "../prisma/client";
import { ICancelamentoService } from "../interfaces/cancelamento.interface";
import { CancelamentoData, CancelamentoStatus, CancelamentoTipo, CancelamentoResponse, CancelamentoWithUsers } from "../types/cancelamento.types";
import { ProximaConsultaService } from "./proximaConsulta.service";
import { AgendaStatus, User, CancelamentoSessaoStatus, AutorTipoCancelamento } from "../generated/prisma/client";
import { ConsultaOrigemStatus } from "../constants/consultaStatus.constants";
import { StatusConsulta } from "../types/statusConsulta.types";
import { determinarRepasse, determinarDevolucaoSessao } from "../utils/statusConsulta.util";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Serviço responsável pelo gerenciamento de cancelamentos de sessões.
 */
export class CancelamentoService implements ICancelamentoService {
    private proximaConsultaService: ProximaConsultaService;

    constructor() {
        this.proximaConsultaService = new ProximaConsultaService();
    }

    // ===================== CRIAÇÃO =====================

    /**
     * Cria um novo registro de cancelamento de sessão.
     * Atualiza o status da Consulta, ReservaSessao e Agenda para "Cancelado".
     * @param data Dados do cancelamento.
     * @returns Registro criado.
     */
    async create(data: CancelamentoData): Promise<CancelamentoResponse> {
        // Tipos dos enums conforme Prisma
        type PrismaStatus = "EmAnalise" | "Deferido" | "Indeferido" | "Cancelado";
        type PrismaTipo = "Paciente" | "Psicologo" | "Admin" | "Management" | "Sistema";

        // Validação dos campos obrigatórios
        if (!data.idconsulta || !data.idPaciente || !data.motivo || !data.protocolo || !data.horario || !data.idPsicologo) {
            throw new Error("Campos obrigatórios ausentes para criar cancelamento: idconsulta, idPaciente, motivo, protocolo, horario, idPsicologo");
        }

        // Busca a consulta com suas relações
        const consulta = await prisma.consulta.findUnique({
            where: { Id: data.idconsulta },
            include: {
                ReservaSessao: true,
                Agenda: true
            }
        });

        if (!consulta) {
            throw new Error("Consulta não encontrada");
        }

        const tipoAutor = (data.tipo ?? "Paciente") as PrismaTipo;
        const autorId = tipoAutor === "Psicologo" ? data.idPsicologo : data.idPaciente;

        // Calcula se está dentro do prazo (24h antes da consulta) ANTES de criar o cancelamento
        // Regra: "Caso precise reagendar ou cancelar sua consulta, se possível efetue com uma 
        // antecedência maior a 24 horas da mesma, caso contrário ela será cobrada normalmente."
        // - >= 24h de antecedência: não é cobrado (devolve sessão) - Status: "Deferido"
        // - < 24h de antecedência: é cobrado normalmente (não devolve sessão) - Status: "EmAnalise"
        // Usa timezone de São Paulo para ser consistente com o frontend
        const dataCancelamento = dayjs(data.data ? new Date(data.data) : new Date()).tz('America/Sao_Paulo');
        let dataConsultaStr: string;
        const consultaDateRaw: unknown = consulta.Date;
        if (consultaDateRaw instanceof Date) {
            dataConsultaStr = dayjs(consultaDateRaw).format('YYYY-MM-DD');
        } else if (typeof consultaDateRaw === 'string') {
            dataConsultaStr = consultaDateRaw.split('T')[0].split(' ')[0];
        } else if (consultaDateRaw !== null && consultaDateRaw !== undefined) {
            // Se não é Date nem string, mas também não é null/undefined, tenta converter
            if (consultaDateRaw instanceof Date) {
                dataConsultaStr = dayjs(consultaDateRaw).format('YYYY-MM-DD');
            } else if (typeof consultaDateRaw === 'string') {
                dataConsultaStr = consultaDateRaw.split('T')[0].split(' ')[0];
            } else {
                dataConsultaStr = dayjs().format('YYYY-MM-DD');
            }
        } else {
            dataConsultaStr = dayjs().format('YYYY-MM-DD');
        }
        const timeStrRaw: unknown = consulta.Time;
        const timeStr = (typeof timeStrRaw === 'string' ? timeStrRaw : null) || '00:00';
        const [horas, minutos] = timeStr.split(':').map(Number);
        const dataConsulta = dayjs.tz(
            `${dataConsultaStr} ${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:00`,
            'America/Sao_Paulo'
        );
        
        const diffHoras = dataConsulta.diff(dataCancelamento, 'hour', true); // true para retornar decimal
        const dentroDoPrazo = diffHoras >= 24;
        
        // Determina o status baseado no prazo
        // Se dentro do prazo (>24h): Deferido (aprovado automaticamente)
        // Se fora do prazo (<24h): EmAnalise (precisa de aprovação)
        const statusCancelamento: PrismaStatus = dentroDoPrazo ? "Deferido" : "EmAnalise";
        
        console.log('[CancelamentoService] Verificação de prazo', {
            dataConsulta: dataConsulta.format('YYYY-MM-DD HH:mm:ss'),
            dataCancelamento: dataCancelamento.format('YYYY-MM-DD HH:mm:ss'),
            diffHoras: diffHoras.toFixed(2),
            dentroDoPrazo,
            statusCancelamento
        });

        const mapped = {
            SessaoId: data.idconsulta,
            AutorId: autorId, // idPsicologo se tipo for Psicologo, senão idPaciente
            Motivo: data.motivo,
            Protocolo: data.protocolo,
            Tipo: tipoAutor,
            Data: data.data ? new Date(data.data) : new Date(),
            PacienteId: data.idPaciente,
            PsicologoId: data.idPsicologo,
            Horario: data.horario,
            LinkDock: data.linkDock,
            Status: statusCancelamento, // Status determinado pelo prazo, não pelo frontend
        };

        // Atualiza todos os status relacionados em uma transação
        const result = await prisma.$transaction(async (tx) => {
            // Cria o registro de cancelamento
            const cancelamento = await tx.cancelamentoSessao.create({ data: mapped });

            // O status da consulta será atualizado pelo ConsultaStatusService após a transação
            // Mantém o status legado temporariamente para não quebrar o fluxo
            await tx.consulta.update({
                where: { Id: data.idconsulta },
                data: { Status: "Cancelado" } // Status legado, será normalizado pelo ConsultaStatusService
            });

            // Atualiza o status da ReservaSessao baseado no tipo de cancelamento (se existir)
            if (consulta.ReservaSessao) {
                // Determina o status baseado no tipo de cancelamento
                let statusReservaSessao: AgendaStatus = AgendaStatus.Cancelado;
                if (tipoAutor === "Paciente") {
                    statusReservaSessao = AgendaStatus.Cancelled_by_patient;
                } else if (tipoAutor === "Psicologo") {
                    statusReservaSessao = AgendaStatus.Cancelled_by_psychologist;
                } else if (tipoAutor === "Sistema") {
                    statusReservaSessao = AgendaStatus.Cancelled_no_show;
                }
                
                await tx.reservaSessao.update({
                    where: { Id: consulta.ReservaSessao.Id },
                    data: { Status: statusReservaSessao }
                });
            }

            // Atualiza o status da Agenda - só libera se for deferido (dentro do prazo)
            // Se não for deferido (fora do prazo), mantém como cancelado até ser deferido
            if (consulta.Agenda) {
                const isPacienteCancelamento = data.tipo === 'Paciente';
                
                // Só libera a agenda se for deferido (dentro do prazo)
                if (isPacienteCancelamento && statusCancelamento === 'Deferido') {
                    await tx.agenda.update({
                        where: { Id: consulta.Agenda.Id },
                        data: { 
                            Status: AgendaStatus.Disponivel,
                            PacienteId: null
                        }
                    });
                    console.log(`[CancelamentoService] Agenda ${consulta.Agenda.Id} atualizada para Disponivel (cancelamento deferido - dentro do prazo)`);
                } else {
                    // Se não estiver dentro do prazo, marca como cancelado (aguardando deferimento)
                    await tx.agenda.update({
                        where: { Id: consulta.Agenda.Id },
                        data: { 
                            Status: AgendaStatus.Cancelado,
                            PacienteId: null
                        }
                    });
                    console.log(`[CancelamentoService] Agenda ${consulta.Agenda.Id} atualizada para Cancelado (aguardando deferimento)`);
                }
            }

            return cancelamento;
        });

        // Buscar cancelamento completo com usuários para retornar (operação rápida)
        const cancelamentoCompleto = await this.findByIdWithUsers(result.Id);
        
        // Mover operações pesadas para execução assíncrona (não bloqueia a resposta)
        setImmediate(async () => {
            try {
                // Atualiza o status da consulta usando ConsultaStatusService
                const { ConsultaStatusService } = await import('./consultaStatus.service');
                const statusService = new ConsultaStatusService();
                
                // Atualiza o status baseado no tipo de cancelamento e prazo
                if (tipoAutor === 'Paciente') {
                    await statusService.cancelarPorPaciente(data.idconsulta, data.idPaciente, dentroDoPrazo);
                } else if (tipoAutor === 'Psicologo') {
                    await statusService.cancelarPorPsicologo(data.idconsulta, data.idPsicologo, dentroDoPrazo);
                } else if (tipoAutor === 'Sistema') {
                    // Cancelamento por força maior
                    await statusService.atualizarStatus({
                        consultaId: data.idconsulta,
                        novoStatus: 'CanceladaForcaMaior',
                        origem: ConsultaOrigemStatus.Sistemico,
                        usuarioId: undefined
                    });
                }
                
                // Processa repasse e devolução de saldo baseado no status normalizado
                const { 
                    determinarRepasse, 
                    determinarDevolucaoSessao
                } = await import('../utils/statusConsulta.util');
                
                // Busca a consulta atualizada para pegar o status correto
                const consultaAtualizada = await prisma.consulta.findUnique({
                    where: { Id: data.idconsulta }
                });
                
                if (consultaAtualizada) {
                    const motivo = (data.motivo || '').toLowerCase();
                    const statusAtual = consultaAtualizada.Status as string;
                    
                    // Processa repasse baseado no status normalizado
                    const statusNormalizado = statusAtual as StatusConsulta;
                    const deveFazerRepasse = determinarRepasse(statusNormalizado, false);
                    if (deveFazerRepasse) {
                        const tipoRepasse = (motivo.includes('inatividade') || motivo.includes('no-show') || motivo.includes('ausente'))
                            ? 'cancelamento_inatividade'
                            : 'cancelamento_paciente';
                        
                        const { processRepasseAsync } = await import('../controllers/agora.controller');
                        processRepasseAsync(data.idconsulta, tipoRepasse);
                    }
                    
                    // Processa devolução de saldo se necessário
                    const deveDevolver = determinarDevolucaoSessao(statusNormalizado, false);
                    if (deveDevolver) {
                        await this.devolverSessaoCliente(data.idconsulta, consulta);
                    }
                }
            } catch (err) {
                // Apenas loga, não bloqueia o cancelamento
                console.error('[CancelamentoService] Erro ao processar repasse/devolução pós-cancelamento:', err);
            }

            // Notifica atualização via WebSocket para ambos os usuários
            try {
                await this.proximaConsultaService.notificarAposCancelamento(
                    consulta.PsicologoId || '',
                    consulta.PacienteId,
                    data.idconsulta
                );
            } catch (err) {
                console.error('[CancelamentoService] Erro ao notificar atualização via WebSocket:', err);
            }
        });
        if (!cancelamentoCompleto) {
            throw new Error("Erro ao buscar cancelamento criado");
        }
        return cancelamentoCompleto;
    }

    /**
     * Devolve sessão ao cliente (incrementa saldo)
     * Prioriza: CicloPlano > ConsultaAvulsa > CreditoAvulso
     * 
     * @param consultaId - ID da consulta cancelada
     * @param consulta - Dados da consulta
     */
    private async devolverSessaoCliente(
        consultaId: string,
        consulta: { CicloPlanoId?: string | null; PacienteId?: string | null }
    ): Promise<void> {
        if (!consulta.PacienteId) {
            console.warn(`[CancelamentoService] PacienteId não encontrado para devolução de sessão: ${consultaId}`);
            return;
        }

        const pacienteId = consulta.PacienteId;
        const agora = new Date();

        try {
            // 1. PRIORIDADE: Se a consulta tinha CicloPlanoId, devolve no CicloPlano
            if (consulta.CicloPlanoId) {
                const cicloPlano = await prisma.cicloPlano.findUnique({
                    where: { Id: consulta.CicloPlanoId }
                });

                if (cicloPlano && cicloPlano.Status === 'Ativo') {
                    // Verifica se o ciclo ainda está válido (CreatedAt + 30 dias)
                    const dataCriacao = new Date(cicloPlano.CreatedAt);
                    const dataValidade = new Date(dataCriacao);
                    dataValidade.setDate(dataValidade.getDate() + 30);

                    if (agora <= dataValidade) {
                        const novasConsultasDisponiveis = (cicloPlano.ConsultasDisponiveis || 0) + 1;
                        const novasConsultasUsadas = Math.max(0, (cicloPlano.ConsultasUsadas || 0) - 1);

                        await prisma.cicloPlano.update({
                            where: { Id: cicloPlano.Id },
                            data: {
                                ConsultasDisponiveis: novasConsultasDisponiveis,
                                ConsultasUsadas: novasConsultasUsadas,
                                Status: novasConsultasDisponiveis > 0 ? 'Ativo' : cicloPlano.Status
                            }
                        });

                        // Atualiza ControleConsultaMensal relacionado
                        await prisma.controleConsultaMensal.updateMany({
                            where: { CicloPlanoId: cicloPlano.Id },
                            data: {
                                ConsultasDisponiveis: novasConsultasDisponiveis,
                                Available: novasConsultasDisponiveis,
                                Used: novasConsultasUsadas
                            }
                        });

                        console.log(`[CancelamentoService] Sessão devolvida no CicloPlano ${cicloPlano.Id} para paciente ${pacienteId}`);
                        return;
                    }
                }
            }

            // 2. Se não tinha CicloPlanoId ou ciclo inválido, tenta ConsultaAvulsa
            const consultaAvulsa = await prisma.consultaAvulsa.findFirst({
                where: {
                    PacienteId: pacienteId,
                    Status: 'Ativa',
                    Quantidade: { gt: 0 }
                },
                orderBy: { DataCriacao: 'desc' }
            });

            if (consultaAvulsa) {
                await prisma.consultaAvulsa.update({
                    where: { Id: consultaAvulsa.Id },
                    data: {
                        Quantidade: consultaAvulsa.Quantidade + 1
                    }
                });
                console.log(`[CancelamentoService] Sessão devolvida no ConsultaAvulsa ${consultaAvulsa.Id} para paciente ${pacienteId}`);
                return;
            }

            // 3. Se não encontrou ConsultaAvulsa, tenta CreditoAvulso
            const creditoAvulso = await prisma.creditoAvulso.findFirst({
                where: {
                    UserId: pacienteId,
                    Status: 'Ativa',
                    Quantidade: { gt: 0 },
                    ValidUntil: { gt: agora }
                },
                orderBy: { ValidUntil: 'asc' }
            });

            if (creditoAvulso) {
                await prisma.creditoAvulso.update({
                    where: { Id: creditoAvulso.Id },
                    data: {
                        Quantidade: creditoAvulso.Quantidade + 1
                    }
                });
                console.log(`[CancelamentoService] Sessão devolvida no CreditoAvulso ${creditoAvulso.Id} para paciente ${pacienteId}`);
                return;
            }

            // 4. Se não encontrou nenhum, cria um CreditoAvulso
            const novoCredito = await prisma.creditoAvulso.create({
                data: {
                    UserId: pacienteId,
                    Quantidade: 1,
                    Valor: 0,
                    Status: 'Ativa',
                    ValidUntil: new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 dias
                }
            });
            console.log(`[CancelamentoService] Novo CreditoAvulso criado ${novoCredito.Id} para paciente ${pacienteId} (devolução de sessão)`);
        } catch (error) {
            console.error(`[CancelamentoService] Erro ao devolver sessão para paciente ${pacienteId}:`, error);
            // Não lança erro para não bloquear o cancelamento
        }
    }

    /**
     * Mapeia um cancelamento do Prisma para CancelamentoResponse
     */
    private mapToCancelamentoResponse(cancelamento: {
        Id: string;
        SessaoId: string;
        AutorId: string;
        Motivo: string;
        Protocolo: string;
        Tipo: AutorTipoCancelamento;
        Data: Date;
        PacienteId: string;
        PsicologoId: string;
        Horario: string;
        LinkDock: string | null;
        Status: CancelamentoSessaoStatus;
    }): CancelamentoResponse {
        return {
            ...cancelamento,
            Autor: null,
            Paciente: null,
            Psicologo: null
        };
    }

    // ===================== CONSULTA =====================

    /**
     * Retorna todos os registros de cancelamento.
     * @returns Lista de cancelamentos.
     */
    async findAll(): Promise<CancelamentoResponse[]> {
        const cancelamentos = await prisma.cancelamentoSessao.findMany();
        return cancelamentos.map(c => this.mapToCancelamentoResponse(c));
    }

    /**
     * Retorna todos os registros de cancelamento incluindo dados dos usuários envolvidos.
     * @returns Lista de cancelamentos com dados de Autor e Psicólogo.
     */
    async findAllWithUsers(): Promise<CancelamentoWithUsers[]> {
        const cancelamentos = await prisma.cancelamentoSessao.findMany({
            include: {
                Autor: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true,
                        Telefone: true,
                        Cpf: true,
                    }
                },
                Sessao: {
                    include: {
                        Paciente: {
                            select: {
                                Id: true,
                                Nome: true,
                                Email: true,
                                Telefone: true,
                                Cpf: true,
                            }
                        },
                        Psicologo: {
                            select: {
                                Id: true,
                                Nome: true,
                                Email: true,
                                Telefone: true,
                                Cpf: true,
                                Crp: true,
                            }
                        }
                    }
                },
            },
        });

        // Buscar documentos relacionados separadamente
        const cancelamentoIds = cancelamentos.map(c => c.Id);
        const documents = await prisma.document.findMany({
            where: {
                CancelamentoSessaoId: {
                    in: cancelamentoIds
                }
            },
            select: {
                Id: true,
                Url: true,
                Type: true,
                Description: true,
                CreatedAt: true,
                CancelamentoSessaoId: true,
            },
            orderBy: {
                CreatedAt: 'desc'
            }
        });

        // Combinar documentos com cancelamentos e mapear para CancelamentoWithUsers
        return cancelamentos.map(cancelamento => {
            const consulta = cancelamento.Sessao;
            return {
                ...cancelamento,
                Autor: cancelamento.Autor as User | null,
                Paciente: consulta?.Paciente as User | null,
                Psicologo: consulta?.Psicologo as User | null,
                Documents: documents.filter(doc => doc.CancelamentoSessaoId === cancelamento.Id)
            } as CancelamentoWithUsers;
        });
    }

    /**
     * Retorna cancelamentos filtrados por status.
     * @param status Status do cancelamento.
     * @returns Lista de cancelamentos com o status especificado.
     */
    async findByStatus(status: string): Promise<CancelamentoWithUsers[]> {
        const validStatus = status as CancelamentoSessaoStatus;
        const cancelamentos = await prisma.cancelamentoSessao.findMany({
            where: {
                Status: validStatus,
            },
            include: {
                Autor: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true,
                        Telefone: true,
                        Cpf: true,
                    }
                },
                Sessao: {
                    include: {
                        Paciente: {
                            select: {
                                Id: true,
                                Nome: true,
                                Email: true,
                                Telefone: true,
                                Cpf: true,
                            }
                        },
                        Psicologo: {
                            select: {
                                Id: true,
                                Nome: true,
                                Email: true,
                                Telefone: true,
                                Cpf: true,
                                Crp: true,
                            }
                        }
                    }
                },
            },
        });
        
        return cancelamentos.map(cancelamento => {
            const consulta = cancelamento.Sessao;
            return {
                ...cancelamento,
                Autor: cancelamento.Autor as User | null,
                Paciente: consulta?.Paciente as User | null,
                Psicologo: consulta?.Psicologo as User | null
            } as CancelamentoWithUsers;
        });
    }

    /**
     * Conta cancelamentos por status.
     * @param status Status do cancelamento.
     * @returns Número de cancelamentos com o status especificado.
     */
    async countByStatus(status: string): Promise<number> {
        const validStatus = status as CancelamentoSessaoStatus;
        return prisma.cancelamentoSessao.count({
            where: {
                Status: validStatus,
            },
        });
    }

    /**
     * Busca um registro de cancelamento pelo ID.
     * @param id ID do cancelamento.
     * @returns Registro encontrado ou null.
     */
    async findById(id: string): Promise<CancelamentoResponse | null> {
        const cancelamento = await prisma.cancelamentoSessao.findUnique({ where: { Id: id } });
        return cancelamento ? this.mapToCancelamentoResponse(cancelamento) : null;
    }

    /**
     * Busca um registro de cancelamento pelo ID incluindo dados dos usuários.
     * @param id ID do cancelamento.
     * @returns Registro encontrado ou null, com dados de Autor e Psicólogo.
     */
    async findByIdWithUsers(id: string): Promise<CancelamentoWithUsers | null> {
        const cancelamento = await prisma.cancelamentoSessao.findUnique({
            where: { Id: id },
            include: {
                Autor: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true,
                        Telefone: true,
                        Cpf: true,
                    }
                },
                Sessao: {
                    include: {
                        Psicologo: {
                            select: {
                                Id: true,
                                Nome: true,
                                Email: true,
                                Telefone: true,
                                Cpf: true,
                                Crp: true,
                            }
                        }
                    }
                },
            },
        });

        if (!cancelamento) return null;

        // Buscar documentos relacionados ao cancelamento
        const documents = await prisma.document.findMany({
            where: {
                CancelamentoSessaoId: cancelamento.Id
            },
            select: {
                Id: true,
                Url: true,
                Type: true,
                Description: true,
                CreatedAt: true,
                CancelamentoSessaoId: true,
            },
            orderBy: {
                CreatedAt: 'desc'
            }
        });

        // Buscar Paciente da consulta
        const consulta = await prisma.consulta.findUnique({
            where: { Id: cancelamento.SessaoId },
            include: {
                Paciente: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true,
                        Telefone: true,
                        Cpf: true,
                    }
                }
            }
        });

        // Retornar cancelamento com usuários mapeados corretamente
        return {
            ...cancelamento,
            Autor: cancelamento.Autor as User | null,
            Paciente: consulta?.Paciente as User | null,
            Psicologo: cancelamento.Sessao?.Psicologo as User | null,
            Documents: documents
        } as CancelamentoWithUsers;
    }

    // ===================== ATUALIZAÇÃO =====================

    /**
     * Atualiza um registro de cancelamento.
     * @param id ID do cancelamento.
     * @param data Dados para atualização.
     * @returns Registro atualizado ou null.
     */
    async update(id: string, data: Partial<CancelamentoData>): Promise<CancelamentoWithUsers | null> {
        // Mapear campos para o formato do Prisma (PascalCase)
        const mappedData: {
            Status?: CancelamentoSessaoStatus;
            Motivo?: string;
            Protocolo?: string;
            Tipo?: AutorTipoCancelamento;
            Data?: Date;
            Horario?: string;
            LinkDock?: string | null;
            PacienteId?: string;
            PsicologoId?: string;
            SessaoId?: string;
        } = {};
        
        if (data.status !== undefined) {
            mappedData.Status = data.status as CancelamentoSessaoStatus;
        }
        if (data.motivo !== undefined) {
            mappedData.Motivo = data.motivo;
        }
        if (data.protocolo !== undefined) {
            mappedData.Protocolo = data.protocolo;
        }
        if (data.tipo !== undefined) {
            mappedData.Tipo = data.tipo as AutorTipoCancelamento;
        }
        if (data.data !== undefined) {
            mappedData.Data = data.data ? new Date(data.data) : new Date();
        }
        if (data.horario !== undefined) {
            mappedData.Horario = data.horario;
        }
        if (data.linkDock !== undefined) {
            mappedData.LinkDock = data.linkDock;
        }
        if (data.idPaciente !== undefined) {
            mappedData.PacienteId = data.idPaciente;
        }
        if (data.idPsicologo !== undefined) {
            mappedData.PsicologoId = data.idPsicologo;
        }
        if (data.idconsulta !== undefined) {
            mappedData.SessaoId = data.idconsulta;
        }
        
        await prisma.cancelamentoSessao.update({ 
            where: { Id: id }, 
            data: mappedData 
        });
        return this.findByIdWithUsers(id);
    }

    /**
     * Atualiza dados específicos de um cancelamento (gestão).
     * @param id ID do cancelamento.
     * @param data Dados para atualização.
     * @returns Registro atualizado ou null.
     */
    async manage(id: string, data: Partial<CancelamentoData>): Promise<CancelamentoWithUsers | null> {
        const mappedData: {
            Status?: CancelamentoSessaoStatus;
            Motivo?: string;
            Protocolo?: string;
            Tipo?: AutorTipoCancelamento;
            Data?: Date;
            Horario?: string;
            LinkDock?: string | null;
            PacienteId?: string;
            PsicologoId?: string;
            SessaoId?: string;
        } = {};
        
        if (data.status !== undefined) {
            mappedData.Status = data.status as CancelamentoSessaoStatus;
        }
        if (data.motivo !== undefined) {
            mappedData.Motivo = data.motivo;
        }
        if (data.protocolo !== undefined) {
            mappedData.Protocolo = data.protocolo;
        }
        if (data.tipo !== undefined) {
            mappedData.Tipo = data.tipo as AutorTipoCancelamento;
        }
        if (data.data !== undefined) {
            mappedData.Data = data.data ? new Date(data.data) : new Date();
        }
        if (data.horario !== undefined) {
            mappedData.Horario = data.horario;
        }
        if (data.linkDock !== undefined) {
            mappedData.LinkDock = data.linkDock;
        }
        if (data.idPaciente !== undefined) {
            mappedData.PacienteId = data.idPaciente;
        }
        if (data.idPsicologo !== undefined) {
            mappedData.PsicologoId = data.idPsicologo;
        }
        if (data.idconsulta !== undefined) {
            mappedData.SessaoId = data.idconsulta;
        }
        
        await prisma.cancelamentoSessao.update({ where: { Id: id }, data: mappedData });
        return this.findByIdWithUsers(id);
    }

    // ===================== EXCLUSÃO =====================

    /**
     * Exclui um registro de cancelamento.
     * @param id ID do cancelamento.
     * @returns Registro excluído ou null.
     */
    async delete(id: string): Promise<CancelamentoResponse | null> {
        const cancelamento = await prisma.cancelamentoSessao.delete({ where: { Id: id } });
        return this.mapToCancelamentoResponse(cancelamento);
    }

    // ===================== AÇÕES ESPECÍFICAS =====================

    /**
     * Aprova (deferimento) um cancelamento de sessão.
     * @param id ID do cancelamento.
     * @returns Registro atualizado com status deferido.
     */
    async approve(id: string): Promise<CancelamentoWithUsers | null> {
        // Busca o cancelamento antes de aprovar para obter informações da consulta
        const cancelamento = await prisma.cancelamentoSessao.findUnique({
            where: { Id: id },
            include: {
                Sessao: {
                    select: {
                        PsicologoId: true,
                        PacienteId: true
                    }
                }
            }
        });

        await prisma.cancelamentoSessao.update({ where: { Id: id }, data: { Status: "Deferido" } });

        // Notifica sobre a mudança na próxima consulta após aprovação do cancelamento
        if (cancelamento?.Sessao) {
            await this.proximaConsultaService.notificarAposCancelamento(
                cancelamento.Sessao.PsicologoId || '',
                cancelamento.Sessao.PacienteId || null,
                cancelamento.SessaoId
            );
        }

        return this.findByIdWithUsers(id);
    }
}

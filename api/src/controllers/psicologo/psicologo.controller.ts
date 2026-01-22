import { Request, Response } from "express";
import { PrismaClient, Sexo as SexoEnum, TipoPessoaJuridica, TipoAtendimento, Queixa, Abordagem, Languages, Pronome, ExperienciaClinica, TipoFormacao, ProfessionalProfileStatus, Prisma } from "../../generated/prisma";
import { UserStatus } from "../../types/userStatus.enum";
import { AuthorizationService } from "../../services/authorization.service";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { PsicologoService } from "../../services/getPsicologos";
import { AgendaStatus, Role, Module, ActionType } from "../../types/permissions.types";
import { normalizeQueryIntWithDefault, normalizeQueryArray, normalizeParamString } from "../../utils/validation.util";
import { refreshAgendaAvailabilityView } from "../../utils/agendaAvailabilityView.util";

dayjs.extend(utc);
dayjs.extend(timezone);

// Constantes para evitar magic strings
enum UserRole {
    Psychologist = "Psychologist",
    Patient = "Patient",
    Admin = "Admin",
    Manager = "Manager"
}

enum TimePeriod {
    MORNING = "manha",
    AFTERNOON = "tarde",
    EVENING = "noite"
}

class DateUtils {
    private static readonly TIMEZONE = 'America/Sao_Paulo';
    private static readonly DATE_FORMAT = 'YYYY-MM-DD';
    private static readonly TIME_FORMAT = 'HH:mm';

    static now(): string {
        return dayjs().tz(this.TIMEZONE).format(this.DATE_FORMAT);
    }

    static currentTime(): string {
        return dayjs().tz(this.TIMEZONE).format(this.TIME_FORMAT);
    }

    static isFutureDate(date: string): boolean {
        return dayjs(date).tz(this.TIMEZONE).isAfter(dayjs().tz(this.TIMEZONE));
    }

    static isCurrentDateWithFutureTime(date: string, time: string): boolean {
        const currentDate = this.now();
        const currentTime = this.currentTime();
        return date === currentDate && time >= currentTime;
    }

    static formatDate(date: string): string {
        return dayjs(date).tz(this.TIMEZONE).format(this.DATE_FORMAT);
    }
}

interface PsychologistCreateData {
    nome: string;
    email: string;
    cpf: string;
    crp: string;
    telefone: string;
    dataNascimento: string;
    sexo: string;
    password: string;
    address: Record<string, unknown> | null;
    professionalProfile: Record<string, unknown> | null;
}

interface PsychologistFilterOptions {
    queixas?: string | string[];
    abordagens?: string | string[];
    sexo?: string | string[];
    atende?: string | string[];
    languages?: string | string[];
    dataDisponivel?: string;
    periodo?: TimePeriod;
    page?: number;
    pageSize?: number;
    nome?: string;
}

/**
 * Mapeia valores de sexo do frontend (lowercase) para valores do enum do banco de dados
 */
function mapSexoFromFrontend(frontendValue: string): SexoEnum | null {
    const normalized = frontendValue.toLowerCase().trim();
    switch (normalized) {
        case 'feminino':
            return SexoEnum.Feminino;
        case 'masculino':
            return SexoEnum.Masculino;
        case 'outros':
        case 'naobinario':
        case 'nao-binario':
            return SexoEnum.NaoBinario;
        case 'prefironaodeclarar':
        case 'prefiro-nao-declarar':
            return SexoEnum.PrefiroNaoDeclarar;
        default:
            // Se já estiver no formato correto do enum, retorna como está
            if (Object.values(SexoEnum).includes(frontendValue as SexoEnum)) {
                return frontendValue as SexoEnum;
            }
            return null;
    }
}

/**
 * Converte string para enum TipoPessoaJuridica ou null
 */
function normalizeTipoPessoaJuridicaEnum(value: unknown): TipoPessoaJuridica | null {
    const validValues = Object.values(TipoPessoaJuridica) as TipoPessoaJuridica[];
    let normalizedValue: string | null = null;
    if (Array.isArray(value) && value.length > 0) {
        normalizedValue = String(value[0]).trim();
    } else if (value !== null && value !== undefined) {
        normalizedValue = String(value).trim();
    }

    // Se já for um valor válido do enum, retorna diretamente
    if (normalizedValue && validValues.includes(normalizedValue as TipoPessoaJuridica)) {
        return normalizedValue as TipoPessoaJuridica;
    }

    // Se não for, tenta mapear strings comuns para o enum
    if (normalizedValue) {
        const lowerValue = normalizedValue.toLowerCase();
        const map: Record<string, TipoPessoaJuridica> = {
            'autonomo': TipoPessoaJuridica.Autonomo,
            'juridico': TipoPessoaJuridica.Juridico,
            'pjautonomo': TipoPessoaJuridica.PjAutonomo,
            'ei': TipoPessoaJuridica.Ei,
            'mei': TipoPessoaJuridica.Mei,
            'sociedadeltda': TipoPessoaJuridica.SociedadeLtda,
            'eireli': TipoPessoaJuridica.Eireli,
            'slu': TipoPessoaJuridica.Slu,
            'outro': TipoPessoaJuridica.Outro,
        };
        const mapped = map[lowerValue.replace(/[\s_\-]/g, '')];
        if (mapped) {
            return mapped;
        }
    }

    return null;
}

/**
 * Converte array de strings para array de enum TipoAtendimento
 */
function normalizeEnumToken(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\s_\-]+/g, "");
}

function normalizeEnumArray<T extends string>(value: unknown, validValues: T[]): T[] {
    if (!value) return [];
    const stringArray = Array.isArray(value) ? value.map(String) : [String(value)];
    return stringArray
        .map((v) => {
            const direct = validValues.find((ev) => ev === v);
            if (direct) return direct;
            const normalized = normalizeEnumToken(v);
            return validValues.find((ev) => normalizeEnumToken(String(ev)) === normalized);
        })
        .filter((v): v is T => v !== undefined);
}

function normalizeEnumArrayWithPartial<T extends string>(value: unknown, validValues: T[]): T[] {
    if (!value) return [];
    const stringArray = Array.isArray(value) ? value.map(String) : [String(value)];
    const normalizedTerms = stringArray.map((v) => normalizeEnumToken(v)).filter(Boolean);
    const matches = new Set<T>();
    validValues.forEach((ev) => {
        const normalizedEv = normalizeEnumToken(String(ev));
        if (!normalizedEv) return;
        normalizedTerms.forEach((term) => {
            if (normalizedEv.includes(term)) {
                matches.add(ev);
            }
        });
    });
    return Array.from(matches);
}

function normalizeTipoAtendimentoArray(value: unknown): TipoAtendimento[] {
    const validValues = Object.values(TipoAtendimento) as TipoAtendimento[];
    return normalizeEnumArray(value, validValues);
}

/**
 * Converte array de strings para array de enum Queixa
 */
function normalizeQueixaArray(value: unknown): Queixa[] {
    const validValues = Object.values(Queixa) as Queixa[];
    // Mapeamento explícito de nomes exibidos para enums técnicos
    const queixaMap: Record<string, Queixa> = {
        "Ansiedade": "Ansiedade",
        "Depressão": "Depressao",
        "Compulsão Alimentar": "CompulsaoAlimentar",
        "Borderline": "Borderline",
        "Agressividade": "Agressividade",
        "Alteração de Humor": "AlteracaoHumor",
        "Conflitos Amorosos": "ConflitosAmorosos",
        "Descontrole Emocional": "DescontroleEmocional",
        "Desmotivação": "Desmotivacao",
        "Falta de Propósito de Vida": "FaltaPropositoVida",
        "Impulsividade": "Impulsividade",
        "LGBTQIA+ / Identidade de Gênero": "LgbtqiapnIdentidadeGenero",
        "Procrastinação": "Procrastinacao",
        "Transtorno Bipolar": "TranstornoBipolar",
        "Supervisão Clínica de Psicologia": "SupervisaoClinicaPsicologia",
        "Transtorno do Pânico": "TranstornoPanico",
        "Transtorno Obsessivo Compulsivo": "TranstornoObsessivoCompulsivo",
        "Vícios/Jogos": "ViciosJogos"
        // Adicione todos os demais nomes exibidos aqui
    };
    let inputArray = Array.isArray(value) ? value : [value];
    inputArray = inputArray.map((v) => queixaMap[v] || v);
    const partialMatches = normalizeEnumArrayWithPartial(inputArray, validValues);
    return partialMatches.length > 0 ? partialMatches : normalizeEnumArray(inputArray, validValues);
}

/**
 * Converte array de strings para array de enum Abordagem
 */
function normalizeAbordagemArray(value: unknown): Abordagem[] {
    const validValues = Object.values(Abordagem) as Abordagem[];
    // Mapeamento explícito de nomes exibidos para enums técnicos
    const abordagemMap: Record<string, Abordagem> = {
        "Terapia Cognitivo-Comportamental (TCC)": "TerapiaCognitivaComportamentalTcc",
        "Terapia do Esquema": "TerapiaEsquemaJeffreyYoungTe",
        "Mindfulness": "Mindfulness",
        "Evolução Emocional": "EvolucaoEmocional",
        "Terapia Baseada em Mindfulness": "TerapiaBaseadaMindfulnessTbm",
        "Terapia Cognitiva-Comportamental Baseada em Processos": "TerapiaCognitivaComportamentalBaseadaProcessos",
        "Análise Existencial": "AnaliseExistencial",
        "Análise do Comportamento": "AnaliseComportamento",
        "Cuidados Paliativos": "CuidadosPaliativos",
        "Neurociências": "Neurociencias",
        "Psicologia Organizacional e do Trabalho": "PsicologiaOrganizacionalTrabalho"
        // Adicione todos os demais nomes exibidos aqui
    };
    let inputArray = Array.isArray(value) ? value : [value];
    inputArray = inputArray.map((v) => abordagemMap[v] || v);
    const partialMatches = normalizeEnumArrayWithPartial(inputArray, validValues);
    return partialMatches.length > 0 ? partialMatches : normalizeEnumArray(inputArray, validValues);
}

/**
 * Converte array de strings para array de enum Languages
 */
function normalizeLanguagesArray(value: unknown): Languages[] {
    const validValues = Object.values(Languages) as Languages[];
    return normalizeEnumArray(value, validValues);
}

/**
 * Converte string para enum ExperienciaClinica ou undefined
 */
function normalizeExperienciaClinicaEnum(value: unknown): ExperienciaClinica | undefined {
    if (!value) return undefined;
    const validValues = Object.values(ExperienciaClinica) as ExperienciaClinica[];
    const normalized = String(value);
    if (validValues.includes(normalized as ExperienciaClinica)) {
        return normalized as ExperienciaClinica;
    }
    return undefined;
}

/**
 * Converte string para enum Pronome ou undefined
 */
function normalizePronomeEnum(value: unknown): Pronome | undefined {
    if (!value) return undefined;
    const validValues = Object.values(Pronome) as Pronome[];
    const normalized = String(value);
    if (validValues.includes(normalized as Pronome)) {
        return normalized as Pronome;
    }
    return undefined;
}

export class PsicologoController {
    constructor(
        private prisma: PrismaClient,
        private authService: AuthorizationService
    ) { }

    /**
   * Cria um novo psicólogo no sistema
   */
    async criarPsicologo(req: Request, res: Response): Promise<Response> {
        try {
            const createData: PsychologistCreateData = req.body;
            const user = req.user;
            if (!user) {
                return this.sendErrorResponse(res, 401, 'Unauthorized');
            }

            const hasPermission = await this.authService.checkPermission(
                user.Id,
                Module.Psychologists,
                ActionType.Read
            );
            if (!hasPermission) {
                return res.status(403).json({ message: "Acesso negado" });
            }

            const psychologist = await this.createPsychologist(createData);
            return this.sendSuccessResponse(res, 201, psychologist);
        } catch (error) {
            return this.sendErrorResponse(res, 400, "Erro ao criar psicólogo.", error);
        }
    }

    /**
     * Lista todos os psicólogos ativos com paginação
     */
    async listarPsicologos(req: Request, res: Response): Promise<Response> {
        const { page = 1, pageSize = 20 } = req.query;
        const pageNumber = parseInt(page as string);
        const size = parseInt(pageSize as string);

        try {
            const nowDate = new Date(DateUtils.now());
            const nowTime = DateUtils.currentTime();

            // Busca psicólogos e agendas
            const psychologists = await this.prisma.user.findMany({
                where: {
                    Role: UserRole.Psychologist as unknown as Role,
                    Status: UserStatus.Ativo,
                    ProfessionalProfiles: {
                        some: {
                            Status: ProfessionalProfileStatus.Preenchido
                        }
                    },
                },
                select: {
                    ...this.getCommonSelectFields(true),
                    ReviewsReceived: {
                        select: {
                            Id: true,
                            Rating: true,
                            Comentario: true,
                            Status: true,
                            CreatedAt: true,
                            UpdatedAt: true,
                            User: {
                                select: {
                                    Id: true,
                                    Nome: true,
                                    Email: true
                                }
                            }
                        }
                    },
                    PsychologistAgendas: {
                        where: {
                            // Retorna APENAS agendas com status 'Disponivel' (case-sensitive)
                            Status: AgendaStatus.Disponivel,
                            OR: [
                                { Data: { gt: nowDate } },
                                {
                                    AND: [
                                        { Data: nowDate },
                                        { Horario: { gte: nowTime } }
                                    ]
                                }
                            ]
                        },
                        select: { Id: true, Data: true, Horario: true, Status: true }
                    }
                },
                skip: (pageNumber - 1) * size,
                take: size,
            });

            // Ordena psicólogos por quantidade de agendas (desc), depois por nome
            const sortedPsychologists = psychologists.sort((a, b) => {
                const aCount = a.PsychologistAgendas?.length || 0;
                const bCount = b.PsychologistAgendas?.length || 0;
                if (bCount !== aCount) return bCount - aCount;
                return a.Nome.localeCompare(b.Nome);
            });

            return this.sendSuccessResponse(res, 200, sortedPsychologists);
        } catch (error) {
            console.error('Erro ao listar psicólogos:', error);
            return this.sendErrorResponse(res, 400, "Erro ao listar psicólogos.", error);
        }
    }

    /**
     * Obtém detalhes de um psicólogo específico
     */
    async obterPsicologo(req: Request, res: Response): Promise<Response> {
        const id = normalizeParamString(req.params.id);
        if (!id) {
            return res.status(400).json({ error: 'ID é obrigatório' });
        }
        try {
            const nowDate = new Date(DateUtils.now());
            const nowTime = DateUtils.currentTime();

            type PsychologistWithProfiles = Prisma.UserGetPayload<{
                include: {
                    Address: true;
                    Images: { select: { Id: true, Url: true } };
                    ReviewsMade: { include: { Psicologo: true } };
                    ReviewsReceived: { include: { User: true } };
                    ProfessionalProfiles: { include: { Formacoes: true; Documents: true } };
                    PsychologistAgendas: true;
                    WorkSchedules: true;
                    ConsultaPsicologos: { include: { Paciente: true; Agenda: true } };
                };
            }>;

            const psychologist = await this.prisma.user.findFirst({
                where: {
                    Id: id,
                    Status: UserStatus.Ativo,
                    ProfessionalProfiles: {
                        some: {
                            Status: ProfessionalProfileStatus.Preenchido
                        }
                    }
                },
                include: {
                    Address: true,
                    Images: { select: { Id: true, Url: true } },
                    ReviewsMade: {
                        include: {
                            Psicologo: true,
                        }
                    },
                    ReviewsReceived: {
                        include: {
                            User: true,
                        }
                    },
                    ProfessionalProfiles: {
                        include: {
                            Formacoes: true,
                            Documents: true,
                        }
                    },
                    PsychologistAgendas: {
                        where: {
                            Status: AgendaStatus.Disponivel,
                            OR: [
                                { Data: { gt: nowDate } },
                                {
                                    Data: nowDate,
                                    Horario: { gte: nowTime }
                                }
                            ]
                        },
                        distinct: ['Data', 'Horario'],
                    },
                    WorkSchedules: true,
                    ConsultaPsicologos: {
                        include: {
                            Paciente: true,
                            Agenda: true,
                        },
                    },
                },
            }) as PsychologistWithProfiles | null;

            if (!psychologist) {
                return this.sendErrorResponse(res, 404, "Psicólogo não encontrado.");
            }

            // Normaliza ProfessionalProfiles.TipoPessoaJuridico para enum válido ou null
            const validValues: TipoPessoaJuridica[] = Object.values(TipoPessoaJuridica) as TipoPessoaJuridica[];
            if (Array.isArray(psychologist.ProfessionalProfiles)) {
                psychologist.ProfessionalProfiles = psychologist.ProfessionalProfiles.map((profile) => {
                    let tipoPessoaJuridico: TipoPessoaJuridica | null = null;
                    const tipoPessoaValue = profile.TipoPessoaJuridico;
                    if (tipoPessoaValue !== null && tipoPessoaValue !== undefined) {
                        if (typeof tipoPessoaValue === 'string' && tipoPessoaValue.trim() !== '') {
                            if (validValues.includes(tipoPessoaValue as TipoPessoaJuridica)) {
                                tipoPessoaJuridico = tipoPessoaValue as TipoPessoaJuridica;
                            } else {
                                tipoPessoaJuridico = null;
                            }
                        } else if (typeof tipoPessoaValue === 'object') {
                            tipoPessoaJuridico = null;
                        }
                    }
                    return {
                        ...profile,
                        TipoPessoaJuridico: tipoPessoaJuridico
                    };
                });
            }

            return this.sendSuccessResponse(res, 200, psychologist);
        } catch (error) {
            console.error('Erro ao obter psicólogo:', error);
            return this.sendErrorResponse(res, 400, "Erro ao obter psicólogo.", error);
        }
    }

    /**
       * Atualiza os dados de um psicólogo
       */
    async atualizarPsicologo(req: Request, res: Response): Promise<Response> {
        try {
            const updateData = req.body;
            const user = req.user;
            if (!user) {
                return this.sendErrorResponse(res, 401, 'Unauthorized');
            }

            const hasPermission = await this.authService.checkPermission(
                user.Id,
                Module.Psychologists,
                ActionType.Update
            );
            if (!hasPermission) {
                return res.status(403).json({ message: "Acesso negado" });
            }


            // Verificar se o psicólogo está ativo antes de permitir a edição
            const existingPsychologist = await this.prisma.user.findUnique({
                where: { Id: user.Id },
                select: { Id: true, Status: true, Role: true }
            });

            if (!existingPsychologist) {
                return this.sendErrorResponse(res, 404, "Psicólogo não encontrado.");
            }

            if (existingPsychologist.Status !== UserStatus.Ativo) {
                return this.sendErrorResponse(res, 400, "Apenas psicólogos com status Ativo podem ser editados.");
            }

            if (existingPsychologist.Role !== (UserRole.Psychologist as unknown as Role)) {
                return this.sendErrorResponse(res, 400, "O usuário não é um psicólogo.");
            }

            const psychologist = await this.updatePsychologist(user.Id, updateData);
            return this.sendSuccessResponse(res, 200, psychologist);
        } catch (error) {
            console.error('Error updating psychologist:', error);
            return this.sendErrorResponse(res, 400, "Erro ao atualizar psicólogo.", error);
        }
    }
    /**
     * Remove um psicólogo do sistema
     */
    async deletarPsicologo(req: Request, res: Response): Promise<Response> {
        const { id } = req.params;

        try {
            const user = req.user;
            if (!user) {
                return this.sendErrorResponse(res, 401, 'Unauthorized');
            }

            const hasPermission = await this.authService.checkAnyPermission(
                user.Id,
                [{ module: Module.Psychologists, action: ActionType.Delete }]
            );
            if (!hasPermission) {
                return this.sendForbiddenResponse(res);
            }

            // Atualiza o status para INATIVO ao invés de deletar
            await this.prisma.user.update({
                where: { Id: user.Id },
                data: { Status: UserStatus.Inativo }
            });
            return this.sendSuccessResponse(res, 200, { message: "Psicólogo inativado com sucesso." });
        } catch (error) {
            return this.sendErrorResponse(res, 400, "Erro ao inativar psicólogo.", error);
        }
    }

    /**
     * Filtra psicólogos com base em critérios específicos
     */
    async filtrarPsicologos(req: Request, res: Response): Promise<Response> {
        const filterOptions: PsychologistFilterOptions = {
            queixas: normalizeQueryArray(req.query.queixas),
            abordagens: normalizeQueryArray(req.query.abordagens),
            sexo: normalizeQueryArray(req.query.sexo),
            atende: normalizeQueryArray(req.query.atende),
            languages: normalizeQueryArray(req.query.languages),
            dataDisponivel: typeof req.query.dataDisponivel === 'string' ? req.query.dataDisponivel : undefined,
            periodo: typeof req.query.periodo === 'string' ? req.query.periodo as TimePeriod : undefined,
            nome: typeof req.query.nome === 'string' ? req.query.nome : undefined,
            page: normalizeQueryIntWithDefault(req.query.page, 1),
            pageSize: normalizeQueryIntWithDefault(req.query.pageSize, 10),
        };
        const pageNumber = filterOptions.page ?? 1;
        const size = filterOptions.pageSize ?? 10;

        try {
            const psychologists = await this.filterPsychologists(filterOptions, pageNumber, size);
            return this.sendSuccessResponse(res, 200, psychologists);
        } catch (error) {
            console.error('Error filtering psychologists:', error);
            return this.sendErrorResponse(
                res,
                400,
                "Erro ao filtrar psicólogos.",
                error instanceof Error ? error.message : error
            );
        }
    }

    /**
     * Retorna todos os psicólogos ativos com campos e relacionamentos resumidos,
     * listando apenas horários ativos (status: available) a partir da data/hora atual (nunca retroativos)
     */
    async listarPsicologosAtivosResumo(req: Request, res: Response): Promise<Response> {
        try {
            const nowDate = new Date(DateUtils.now());
            const nowTime = DateUtils.currentTime();

            // Busca psicólogos ativos e inclui dados necessários para o filtro
            const psicologos = await this.prisma.user.findMany({
                where: {
                    Role: UserRole.Psychologist as unknown as Role,
                    Status: UserStatus.Ativo,
                    ProfessionalProfiles: {
                        some: {
                            Status: ProfessionalProfileStatus.Preenchido
                        }
                    },
                },
                select: {
                    Id: true,
                    Nome: true,
                    Crp: true,
                    RatingAverage: true,
                    RatingCount: true,
                    Images: {
                        select: {
                            Id: true,
                            Url: true,
                        },
                    },
                    ReviewsReceived: {
                        select: {
                            Rating: true,
                        },
                    },
                    ProfessionalProfiles: {
                        select: {
                            Documents: true,
                            Formacoes: true,
                            SobreMim: true,
                            Queixas: true,
                            Abordagens: true,
                            TipoAtendimento: true,
                            Idiomas: true,
                            ExperienciaClinica: true,
                        }
                    },
                    Address: true,
                    PsychologistAgendas: {
                        where: {
                            // Retorna APENAS agendas com status 'Disponivel' (case-sensitive)
                            Status: AgendaStatus.Disponivel,
                            OR: [
                                { Data: { gt: nowDate } },
                                {
                                    AND: [
                                        { Data: nowDate },
                                        { Horario: { gte: nowTime } }
                                    ]
                                }
                            ]
                        },
                        select: { Id: true, Data: true, Horario: true, Status: true }
                    }
                }
            });

            // Garante que todos os requisitos estão presentes
            const psicologosCompletos = psicologos.filter((psicologo) => {
                // Valida se há pelo menos um ProfessionalProfile
                if (!Array.isArray(psicologo.ProfessionalProfiles) || psicologo.ProfessionalProfiles.length === 0) return false;
                const profile = psicologo.ProfessionalProfiles[0];
                // Valida se há pelo menos um Document
                if (!Array.isArray(profile.Documents) || profile.Documents.length === 0) return false;
                // Valida se há pelo menos uma Formacao
                if (!Array.isArray(profile.Formacoes) || profile.Formacoes.length === 0) return false;
                // Valida se há pelo menos um Address
                if (!Array.isArray(psicologo.Address) || psicologo.Address.length === 0) return false;
                return true;
            });

            const resultado = psicologosCompletos.length > 0 ? psicologosCompletos : psicologos;

            // Ordena pelo total de horários disponíveis via banco (mais performático)
            const ids = resultado.map((psicologo) => psicologo.Id);
            let disponiveisPorPsicologo = new Map<string, number>();

            if (ids.length > 0) {
                try {
                    await refreshAgendaAvailabilityView(this.prisma);
                    const disponiveis = await this.prisma.$queryRaw<
                        { PsicologoId: string; Disponiveis: number }[]
                    >(Prisma.sql`
                        SELECT "PsicologoId", "Disponiveis"
                        FROM "AgendaDisponibilidadeResumo"
                        WHERE "PsicologoId" IN (${Prisma.join(ids)})
                    `);

                    disponiveisPorPsicologo = new Map(
                        disponiveis.map((item) => [item.PsicologoId, item.Disponiveis])
                    );
                } catch (error) {
                    console.error("[AgendaDisponibilidadeResumo] Erro ao consultar view:", error);
                }
            }

            const ordenados = resultado.sort((a, b) => {
                const aCount = disponiveisPorPsicologo.get(a.Id) ?? 0;
                const bCount = disponiveisPorPsicologo.get(b.Id) ?? 0;
                if (bCount !== aCount) return bCount - aCount;
                return a.Nome.localeCompare(b.Nome);
            });

            return res.status(200).json(ordenados);
        } catch (error) {
            return res.status(200).json([]);
        }
    }

    async listarPsicologosComFiltros(req: Request, res: Response): Promise<Response> {
        try {
            const psicologoService = new PsicologoService();
            const filtrosNormalizados = {
                queixas: normalizeQueryArray(req.query.queixas),
                abordagem: normalizeQueryArray(req.query.abordagem ?? req.query.abordagens),
                sexo: typeof req.query.sexo === 'string' ? req.query.sexo : undefined,
                atende: normalizeQueryArray(req.query.atende ?? req.query.atendimentos),
                idiomas: normalizeQueryArray(req.query.idiomas),
                dataDisponivel: typeof req.query.dataDisponivel === 'string'
                    ? req.query.dataDisponivel
                    : typeof req.query.data === 'string'
                        ? req.query.data
                        : undefined,
                periodo: normalizeQueryArray(req.query.periodo),
                nome: typeof req.query.nome === 'string' ? req.query.nome : undefined,
            };
            const psicologos = await psicologoService.getPsicologosComFiltros(filtrosNormalizados);
            return res.status(200).json(psicologos);
        } catch (error) {
            console.error('Erro ao listar psicólogos com filtros:', error);
            return this.sendErrorResponse(res, 400, "Erro ao listar psicólogos com filtros.", error);
        }
    }

    // Métodos auxiliares privados
    private async createPsychologist(data: PsychologistCreateData) {
        // Normaliza Address conforme schema Prisma
        const addressData: Prisma.AddressCreateWithoutUserInput | undefined = data.address ? {
            Rua: String(data.address.rua || data.address.Rua || data.address.endereco || data.address.Endereco || ''),
            Numero: String(data.address.numero || data.address.Numero || ''),
            Complemento: data.address.complemento ? String(data.address.complemento) : data.address.Complemento ? String(data.address.Complemento) : undefined,
            Bairro: String(data.address.bairro || data.address.Bairro || ''),
            Cidade: String(data.address.cidade || data.address.Cidade || ''),
            Estado: String(data.address.estado || data.address.Estado || ''),
            Cep: String(data.address.cep || data.address.Cep || ''),
        } : undefined;

        // Normaliza ProfessionalProfile conforme schema Prisma
        const profile = data.professionalProfile as Record<string, unknown> | null;
        const professionalProfileData: Prisma.ProfessionalProfileCreateWithoutUserInput | undefined = profile ? {
            TipoPessoaJuridico: normalizeTipoPessoaJuridicaEnum(profile.tipoPessoaJuridica || profile.TipoPessoaJuridico),
            TipoAtendimento: normalizeTipoAtendimentoArray(profile.tipoAtendimento || profile.TipoAtendimento),
            ExperienciaClinica: normalizeExperienciaClinicaEnum(profile.experienciaClinica || profile.ExperienciaClinica),
            Idiomas: normalizeLanguagesArray(profile.idiomas || profile.Idiomas),
            Abordagens: normalizeAbordagemArray(profile.abordagens || profile.Abordagens),
            Queixas: normalizeQueixaArray(profile.queixas || profile.Queixas),
            SobreMim: profile.sobreMim ? String(profile.sobreMim) : profile.SobreMim ? String(profile.SobreMim) : undefined,
            AreasAtuacao: profile.areasAtuacao ? String(profile.areasAtuacao) : profile.AreasAtuacao ? String(profile.AreasAtuacao) : undefined,
        } : undefined;

        return this.prisma.user.create({
            data: {
                Nome: data.nome,
                Email: data.email,
                Cpf: data.cpf,
                Crp: data.crp,
                Telefone: data.telefone,
                DataNascimento: new Date(data.dataNascimento),
                Sexo: mapSexoFromFrontend(data.sexo) || (data.sexo as SexoEnum),
                Password: data.password,
                Role: UserRole.Psychologist as unknown as Role,
                Address: addressData ? { create: addressData } : undefined,
                ProfessionalProfiles: professionalProfileData ? { create: professionalProfileData } : undefined,
            },
            include: {
                Address: true,
                ProfessionalProfiles: true,
            },
        });
    }

    private async updatePsychologist(id: string, data: Record<string, unknown>) {
        // Normaliza formacoes
        const formacoes: Prisma.FormacaoCreateWithoutProfessionalProfileInput[] = [];
        if (data.professionalProfile && typeof data.professionalProfile === 'object') {
            const profile = data.professionalProfile as Record<string, unknown>;
            if (profile.formacoes || profile.Formacoes) {
                const formacoesData = (profile.formacoes || profile.Formacoes) as Array<Record<string, unknown>>;
                formacoes.push(...formacoesData.map((f) => {
                    const tipoFormacaoStr = String(f.tipo || f.TipoFormacao || '');
                    const tipoFormacaoEnum = Object.values(TipoFormacao).find(v => v === tipoFormacaoStr) as TipoFormacao | undefined;
                    return {
                        TipoFormacao: tipoFormacaoEnum || TipoFormacao.Outro,
                        Instituicao: String(f.instituicao || f.Instituicao || ''),
                        Curso: String(f.curso || f.Curso || ''),
                        DataInicio: f.dataInicio ? String(f.dataInicio) : f.DataInicio ? String(f.DataInicio) : '',
                        DataConclusao: f.dataConclusao ? String(f.dataConclusao) : f.DataConclusao ? String(f.DataConclusao) : null,
                        Status: String(f.status || f.Status || "Em Andamento"),
                    };
                }));
            }
        }

        // Normaliza professionalProfile
        const profile = data.professionalProfile as Record<string, unknown> | undefined;
        const professionalProfileData: Prisma.ProfessionalProfileCreateWithoutUserInput = {
            TipoPessoaJuridico: normalizeTipoPessoaJuridicaEnum(profile?.tipoPessoaJuridica || profile?.TipoPessoaJuridico),
            TipoAtendimento: normalizeTipoAtendimentoArray(profile?.tipoAtendimento || profile?.TipoAtendimento),
            ExperienciaClinica: normalizeExperienciaClinicaEnum(profile?.experienciaClinica || profile?.ExperienciaClinica),
            Idiomas: normalizeLanguagesArray(profile?.idiomas || profile?.Idiomas),
            Abordagens: normalizeAbordagemArray(profile?.abordagens || profile?.Abordagens),
            Queixas: normalizeQueixaArray(profile?.queixas || profile?.Queixas),
            SobreMim: profile?.sobreMim ? String(profile.sobreMim) : profile?.SobreMim ? String(profile.SobreMim) : undefined,
            AreasAtuacao: profile?.areasAtuacao ? String(profile.areasAtuacao) : profile?.AreasAtuacao ? String(profile.AreasAtuacao) : undefined,
            ...(formacoes.length > 0 ? { Formacoes: { create: formacoes } } : {}),
        };

        // Normaliza Address conforme schema Prisma
        const addressData: Prisma.AddressCreateWithoutUserInput | undefined = data.address && typeof data.address === 'object' ? {
            Rua: String((data.address as Record<string, unknown>).rua || (data.address as Record<string, unknown>).Rua || (data.address as Record<string, unknown>).endereco || (data.address as Record<string, unknown>).Endereco || ''),
            Numero: String((data.address as Record<string, unknown>).numero || (data.address as Record<string, unknown>).Numero || ''),
            Complemento: (data.address as Record<string, unknown>).complemento ? String((data.address as Record<string, unknown>).complemento) : (data.address as Record<string, unknown>).Complemento ? String((data.address as Record<string, unknown>).Complemento) : undefined,
            Bairro: String((data.address as Record<string, unknown>).bairro || (data.address as Record<string, unknown>).Bairro || ''),
            Cidade: String((data.address as Record<string, unknown>).cidade || (data.address as Record<string, unknown>).Cidade || ''),
            Estado: String((data.address as Record<string, unknown>).estado || (data.address as Record<string, unknown>).Estado || ''),
            Cep: String((data.address as Record<string, unknown>).cep || (data.address as Record<string, unknown>).Cep || ''),
        } : undefined;

        return this.prisma.user.update({
            where: { Id: id },
            data: {
                Nome: data.nome ? String(data.nome) : undefined,
                Email: data.email ? String(data.email) : undefined,
                Telefone: data.telefone ? String(data.telefone) : undefined,
                Sexo: data.sexo ? (mapSexoFromFrontend(String(data.sexo)) || (String(data.sexo) as SexoEnum)) : undefined,
                Pronome: data.pronome ? normalizePronomeEnum(data.pronome) : undefined,
                DataNascimento: data.dataNascimento ? new Date(String(data.dataNascimento)) : undefined,
                Address: addressData
                    ? {
                        deleteMany: {},
                        create: addressData,
                    }
                    : undefined,
                ProfessionalProfiles: data.professionalProfile
                    ? {
                        deleteMany: {},
                        create: professionalProfileData,
                    }
                    : undefined,
            },
            include: {
                Address: true,
                ProfessionalProfiles: true,
            },
        });
    }

    private async filterPsychologists(
        filters: PsychologistFilterOptions,
        pageNumber: number,
        size: number
    ) {
        const { queixas, abordagens, sexo, atende, languages, dataDisponivel, periodo } = filters;

        if (this.noFiltersApplied(filters)) {
            return this.getDefaultPsychologistsList(pageNumber, size);
        }

        const where = this.buildFilterConditions(
            queixas,
            abordagens,
            sexo,
            atende,
            languages,
            dataDisponivel,
            periodo
        );

        return this.prisma.user.findMany({
            where,
            select: this.getPsychologistSelectFields(),
            skip: (pageNumber - 1) * size,
            take: size,
        });
    }

    private buildFilterConditions = (
        queixas?: string | string[],
        abordagens?: string | string[],
        sexo?: string | string[],
        atende?: string | string[],
        languages?: string | string[],
        dataDisponivel?: string,
        periodo?: TimePeriod,
        nome?: string
    ): Prisma.UserWhereInput => {
        const andConditions: Prisma.UserWhereInput[] = [
            { Role: UserRole.Psychologist as unknown as Role },
            { Status: UserStatus.Ativo },
            {
                ProfessionalProfiles: {
                    some: {
                        Status: ProfessionalProfileStatus.Preenchido
                    }
                }
            }
        ];

        if (queixas) {
            const queixasArray = normalizeQueixaArray(queixas);
            if (queixasArray.length > 0) {
                andConditions.push({
                    ProfessionalProfiles: {
                        some: {
                            Queixas: { hasSome: queixasArray }
                        }
                    }
                });
            }
        }

        if (abordagens) {
            const abordagensArray = normalizeAbordagemArray(abordagens);
            if (abordagensArray.length > 0) {
                andConditions.push({
                    ProfessionalProfiles: {
                        some: {
                            Abordagens: { hasSome: abordagensArray }
                        }
                    }
                });
            }
        }

        if (sexo) {
            // Mapeia valores do frontend para valores do enum do banco
            const sexoArray = Array.isArray(sexo) ? sexo : [sexo];
            const mappedSexoValues = sexoArray
                .map(mapSexoFromFrontend)
                .filter((value): value is SexoEnum => value !== null);

            // Se houver valores válidos mapeados, aplica o filtro estrito
            if (mappedSexoValues.length > 0) {
                andConditions.push({
                    Sexo: { in: mappedSexoValues }
                });
            } else {
                // Se nenhum valor foi mapeado corretamente, retorna lista vazia
                andConditions.push({
                    Id: '__NO_MATCH__'
                });
            }
        }

        if (atende) {
            const atendeArray = normalizeTipoAtendimentoArray(atende);
            if (atendeArray.length > 0) {
                andConditions.push({
                    ProfessionalProfiles: {
                        some: {
                            TipoAtendimento: { hasEvery: atendeArray }
                        }
                    }
                });
            }
        }

        if (languages) {
            const languagesArray = normalizeLanguagesArray(languages);
            if (languagesArray.length > 0) {
                andConditions.push({
                    ProfessionalProfiles: {
                        some: {
                            Idiomas: { hasEvery: languagesArray }
                        }
                    }
                });
            }
        }

        if (dataDisponivel) {
            const dateObj = new Date(dataDisponivel);
            const agendaWhere: Prisma.AgendaWhereInput = {
                Data: dateObj,
                Status: AgendaStatus.Disponivel
            };

            if (periodo) {
                const timeRange = this.getPeriodTimeRange(periodo);
                if (timeRange.gte && timeRange.lt) {
                    agendaWhere.Horario = {
                        gte: timeRange.gte,
                        lt: timeRange.lt
                    };
                }
            }

            andConditions.push({
                PsychologistAgendas: {
                    some: agendaWhere
                }
            });
        }

        if (nome && nome.trim().length >= 3) {
            andConditions.push({
                Nome: { contains: nome.trim(), mode: 'insensitive' }
            });
        } else if (nome && nome.trim().length > 0) {
            // Se o termo for menor que 3 caracteres, retorna lista vazia
            andConditions.push({
                Id: '__NO_MATCH__'
            });
        }

        return { AND: andConditions };
    }

    /**
     * Retorna o range de horários para um período do dia.
     */
    private getPeriodTimeRange(periodo: TimePeriod): { gte?: string; lt?: string } {
        switch (periodo) {
            case TimePeriod.MORNING:
                return { gte: "06:00", lt: "12:01" };
            case TimePeriod.AFTERNOON:
                return { gte: "12:01", lt: "18:01" };
            case TimePeriod.EVENING:
                return { gte: "18:01", lt: "23:01" };
            default:
                return {};
        }
    }

    private noFiltersApplied(filters: PsychologistFilterOptions): boolean {
        return !Object.entries(filters).some(([key, value]) => {
            // Ignora page e pageSize
            if (key === 'page' || key === 'pageSize') {
                return false;
            }
            // Verifica se o valor não está vazio
            if (value === undefined || value === null) {
                return false;
            }
            if (typeof value === 'string' && value.trim() === '') {
                return false;
            }
            if (Array.isArray(value) && value.length === 0) {
                return false;
            }
            return true;
        });
    }

    private async getDefaultPsychologistsList(pageNumber: number, size: number) {
        return this.prisma.user.findMany({
            where: {
                Role: UserRole.Psychologist as unknown as Role,
                Status: UserStatus.Ativo,
                ProfessionalProfiles: {
                    some: {
                        Status: ProfessionalProfileStatus.Preenchido
                    }
                }
            },
            select: this.getPsychologistSelectFields(),
            skip: (pageNumber - 1) * size,
            take: size,
        });
    }

    private getPsychologistSelectFields(): object {
        const nowDate = new Date(DateUtils.now());
        const nowTime = DateUtils.currentTime();

        return {
            Id: true,
            Nome: true,
            Email: true,
            Telefone: true,
            Sexo: true,
            DataNascimento: true,
            Crp: true,
            Address: {
                select: {
                    Id: true,
                    Rua: true,
                    Numero: true,
                    Complemento: true,
                    Bairro: true,
                    Cidade: true,
                    Estado: true,
                    Cep: true,
                    CreatedAt: true,
                    UpdatedAt: true,
                },
            },
            Images: { select: { Id: true, Url: true } },
            ReviewsReceived: {
                select: {
                    Rating: true,
                },
            },
            ProfessionalProfiles: {
                select: {
                    Id: true,
                    SobreMim: true,
                    Idiomas: true, // array de enum
                    TipoAtendimento: true, // array de enum
                    ExperienciaClinica: true,
                    Abordagens: true, // array de enum
                    Queixas: true, // array de enum
                    Status: true,
                    AreasAtuacao: true,
                    TipoPessoaJuridico: true, // enum
                    CreatedAt: true,
                    UpdatedAt: true,
                },
            },
            PsychologistAgendas: {
                where: {
                    // Retorna APENAS agendas com status 'Disponivel' (case-sensitive)
                    Status: AgendaStatus.Disponivel,
                    OR: [
                        { Data: { gt: nowDate } },
                        {
                            AND: [
                                { Data: nowDate },
                                { Horario: { gte: nowTime } }
                            ]
                        }
                    ]
                },
                select: { Id: true, Data: true, Horario: true, Status: true }
            },
            WorkSchedules: true,
        };
    }

    private getCommonSelectFields(includeDetails: boolean = false) {
        return {
            Id: true,
            Nome: true,
            Email: true,
            Telefone: true,
            Sexo: true,
            DataNascimento: true,
            Crp: true,
            Address: includeDetails ? this.getAddressSelectFields() : false,
            Images: includeDetails ? { select: { Id: true, Url: true } } : false,
            ReviewsMade: includeDetails ? { select: { Id: true, Rating: true, Comentario: true } } : false,
            ProfessionalProfiles: includeDetails ? this.getProfessionalProfileSelectFields() : false,
            PsychologistAgendas: includeDetails ? this.getAgendaSelectFields() : false,
            WorkSchedules: includeDetails ? { select: { Id: true, DiaDaSemana: true, HorarioInicio: true, HorarioFim: true } } : false,
        };
    }

    private getAddressSelectFields() {
        return {
            select: {
                Id: true,
                Rua: true,
                Numero: true,
                Complemento: true,
                Bairro: true,
                Cidade: true,
                Estado: true,
                Cep: true,
            },
        };
    }

    private getProfessionalProfileSelectFields() {
        return {
            select: {
                Id: true,
                SobreMim: true,
                Idiomas: true, // array de enum
                TipoAtendimento: true, // array de enum
                ExperienciaClinica: true,
                Abordagens: true, // array de enum
                Queixas: true, // array de enum
                Status: true,
                AreasAtuacao: true,
                TipoPessoaJuridico: true, // enum
                CreatedAt: true,
                UpdatedAt: true,
            },
        };
    }


    private getAgendaSelectFields() {
        // Converta as strings de data para objetos Date
        const nowDate = new Date(DateUtils.now());
        const nowTime = DateUtils.currentTime();

        return {
            where: {
                // Retorna APENAS agendas com status 'Disponivel' (case-sensitive)
                Status: AgendaStatus.Disponivel,
                OR: [
                    { Data: { gt: nowDate } },
                    {
                        AND: [
                            { Data: nowDate },
                            { Horario: { gte: nowTime } }
                        ]
                    }
                ],
            },
            select: { Id: true, Data: true, Horario: true, Status: true },
        };
    }

    private getReservationsSelectFields() {
        return {
            include: {
                Paciente: { select: { Id: true, Nome: true, Email: true } },
                Agenda: { select: { Id: true, Data: true, Horario: true } },
            },
        };
    }
    // Métodos de resposta padronizados
    private sendSuccessResponse(res: Response, status: number, data: unknown): Response {
        return res.status(status).json(data);
    }

    private sendErrorResponse(res: Response, status: number, message: string, error?: unknown): Response {
        // Evita logar no console quando o status for 401 (Unauthorized)
        if (status !== 401) {
            if (error) {
                console.error(`[${status}] ${message}`, error instanceof Error ? (error.stack || error.message) : error);
            } else {
                console.error(`[${status}] ${message}`);
            }
        }

        const payload: { error: string; details?: string } = { error: message };
        // Não expõe detalhes adicionais em 401
        if (status !== 401 && error) {
            payload.details = error instanceof Error ? error.message : String(error);
        }

        return res.status(status).json(payload);
    }

    private sendForbiddenResponse(res: Response): Response {
        return res.status(403).json({ error: "você não tem acesso a este recurso" });
    }
}

import { PrismaClient, Prisma, Sexo, Queixa, Abordagem, TipoAtendimento, Languages, ProfessionalProfileStatus } from "../generated/prisma";
import { refreshAgendaAvailabilityView } from "../utils/agendaAvailabilityView.util";
import prismaDefault from "../prisma/client";

interface FiltroPsicologo {
    queixas?: string[];
    abordagem?: string[];
    sexo?: 'Feminino' | 'Masculino' | 'Outros' | string;
    atende?: string[];
    idiomas?: string[];
    dataDisponivel?: string; // YYYY-MM-DD
    periodo?: string[]; // ['manhã', 'tarde', 'noite']
    nome?: string;
}

export class PsicologoService {
    private prisma: PrismaClient;

    constructor(prisma?: PrismaClient) {
        this.prisma = prisma ?? prismaDefault;
    }

    async getPsicologosComFiltros(filtros: FiltroPsicologo) {
        const {
            queixas,
            abordagem,
            sexo,
            atende,
            idiomas,
            dataDisponivel,
            periodo,
            nome,
        } = filtros;

        const where: Prisma.UserWhereInput = {
            Status: 'Ativo',
            Role: 'Psychologist',
            ProfessionalProfiles: {
                some: {
                    Status: ProfessionalProfileStatus.Preenchido,
                }
            },
        };

        if (nome) {
            where.Nome = {
                contains: nome,
                mode: 'insensitive',
            };
        }

        if (sexo) {
            const sexoEnum = Object.values(Sexo).find(s => s === sexo) as Sexo | undefined;
            if (sexoEnum) {
                where.Sexo = sexoEnum;
            }
        }

        // Constrói condições para ProfessionalProfiles
        const profileConditions: Prisma.ProfessionalProfileWhereInput[] = [];
        
        if (queixas && queixas.length > 0) {
            const queixasEnums = queixas
                .map(q => Object.values(Queixa).find(v => v === q))
                .filter((q): q is Queixa => q !== undefined);
            if (queixasEnums.length > 0) {
                profileConditions.push({
                    Queixas: {
                        hasSome: queixasEnums
                    }
                });
            }
        }

        if (abordagem && abordagem.length > 0) {
            const abordagensEnums = abordagem
                .map(a => Object.values(Abordagem).find(v => v === a))
                .filter((a): a is Abordagem => a !== undefined);
            if (abordagensEnums.length > 0) {
                profileConditions.push({
                    Abordagens: {
                        hasSome: abordagensEnums
                    }
                });
            }
        }

        if (atende && atende.length > 0) {
            const atendeEnums = atende
                .map(a => Object.values(TipoAtendimento).find(v => v === a))
                .filter((a): a is TipoAtendimento => a !== undefined);
            if (atendeEnums.length > 0) {
                profileConditions.push({
                    TipoAtendimento: {
                        hasSome: atendeEnums
                    }
                });
            }
        }

        if (idiomas && idiomas.length > 0) {
            const idiomasEnums = idiomas
                .map(i => Object.values(Languages).find(v => v === i))
                .filter((i): i is Languages => i !== undefined);
            if (idiomasEnums.length > 0) {
                profileConditions.push({
                    Idiomas: {
                        hasSome: idiomasEnums
                    }
                });
            }
        }

        if (profileConditions.length > 0) {
            where.ProfessionalProfiles = {
                some: {
                    Status: ProfessionalProfileStatus.Preenchido,
                    AND: profileConditions
                }
            };
        }

        // Horários disponíveis por período (manhã, tarde, noite)
        const horariosPorPeriodo: Record<string, [string, string]> = {
            manhã: ['06:00', '11:59'],
            tarde: ['12:00', '17:59'],
            noite: ['18:00', '23:59'],
        };

        const nowDate = new Date();
        const nowDateOnly = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
        const nowTime = nowDate.toTimeString().slice(0, 5);
        const filtroData = dataDisponivel ? new Date(dataDisponivel) : null;

        const baseAgendaWhere: Prisma.AgendaWhereInput = {
            Status: 'Disponivel',
            OR: [
                { Data: { gt: nowDateOnly } },
                {
                    AND: [
                        { Data: nowDateOnly },
                        { Horario: { gte: nowTime } },
                    ],
                },
            ],
        };

        const horariosWhere: Prisma.AgendaListRelationFilter | undefined = periodo?.length
            ? {
                some: {
                    ...baseAgendaWhere,
                    ...(filtroData ? { Data: filtroData } : {}),
                    Horario: {
                        in: periodo
                            .flatMap((p) => {
                                const periodoRange = horariosPorPeriodo[p];
                                if (!periodoRange) return [];
                                const [inicio, fim] = periodoRange;
                                const range: string[] = [];

                                const [startHour] = inicio.split(':').map(Number);
                                const [endHour] = fim.split(':').map(Number);

                                for (let h = startHour; h <= endHour; h++) {
                                    range.push(`${String(h).padStart(2, '0')}:00`);
                                    range.push(`${String(h).padStart(2, '0')}:30`);
                                }

                                return range;
                            })
                            .filter((h) => {
                                const lastPeriodo = periodo[periodo.length - 1];
                                const lastRange = horariosPorPeriodo[lastPeriodo];
                                return lastRange ? h <= lastRange[1] : true;
                            }),
                    },
                },
            }
            : filtroData
                ? {
                    some: {
                        ...baseAgendaWhere,
                        Data: filtroData,
                    },
                }
                : undefined;

        // Adiciona filtro de agendas se necessário
        if (horariosWhere) {
            where.PsychologistAgendas = horariosWhere;
        }

        const psicologos = await this.prisma.user.findMany({
            where,
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
                    },
                },
                Address: true,
                PsychologistAgendas: {
                    where: baseAgendaWhere,
                    select: {
                        Id: true,
                        Data: true,
                        Horario: true,
                        Status: true,
                    },
                },
            },
        });

        // Ordena pelo total de horários disponíveis via banco (mais performático)
        const ids = psicologos.map((psicologo) => psicologo.Id);
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

        return psicologos.sort((a, b) => {
            const aCount = disponiveisPorPsicologo.get(a.Id) ?? 0;
            const bCount = disponiveisPorPsicologo.get(b.Id) ?? 0;
            if (bCount !== aCount) return bCount - aCount;
            return a.Nome.localeCompare(b.Nome);
        });
    }
}
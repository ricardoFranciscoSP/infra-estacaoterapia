import prisma from "../../prisma/client";
import { ContratoService } from "../gerarPdf.service";
import { ContratoPsicologoData } from "../../types/contrato.types";
import { AuthorizationService } from "../authorization.service";
import * as fs from 'fs';
import * as path from 'path';
import { User } from "../../types/user.types";
import { ActionType, Module } from "../../types/permissions.types";
import { GerarAgendaService } from "../gerarAgenda.service";
import { prismaAgendaRepository } from "../../repositories/prismaAgenda.repository";
import { prismaUserRepository } from "../../repositories/prismaUser.repository";
import { IEmailService } from "../../interfaces/communication.interface";
import { EmailService } from "../email.service";
import { UserService } from "../user.service";

export class PsicologoService {
    private calcularStatusPorPercentual(percentual: number) {
        if (percentual >= 75) return "Ótimo";
        if (percentual >= 50) return "Bom";
        if (percentual >= 25) return "Regular";
        return "Ruim";
    }

    private normalizeContratoText(text: string) {
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\uFFFD/g, "")
            .toUpperCase();
    }

    private hasParceriaTitle(text: string) {
        const normalized = this.normalizeContratoText(text);
        return normalized.includes("CONTRATO DE PARCERIA") && (
            normalized.includes("INTERMEDIACAO") ||
            normalized.includes("INTERMEDIAO") ||
            normalized.includes("INTERMEDIA")
        );
    }

    private hasPacienteTitle(text: string) {
        return this.normalizeContratoText(text).includes(
            "CONTRATO DE PRESTACAO DE SERVICOS PSICOLOGICOS VIA PLATAFORMA VIRTUAL"
        );
    }

    private calcularPercentualPerfil(psicologo: {
        Telefone?: string | null;
        Sexo?: string | null;
        Pronome?: string | null;
        RacaCor?: string | null;
        Address?: { Cep?: string | null; Rua?: string | null; Numero?: string | null; Complemento?: string | null; Bairro?: string | null; Cidade?: string | null; Estado?: string | null } | Array<{ Cep?: string | null; Rua?: string | null; Numero?: string | null; Complemento?: string | null; Bairro?: string | null; Cidade?: string | null; Estado?: string | null }>;
        ProfessionalProfiles?: Array<{
            SobreMim?: string | null;
            ExperienciaClinica?: string | null;
            Idiomas?: string[] | null;
            TipoAtendimento?: string[] | null;
            Abordagens?: string[] | null;
            Queixas?: string[] | null;
            TipoPessoaJuridico?: string[] | string | null;
            Formacoes?: Array<{ TipoFormacao?: string | null; Tipo?: string | null; Curso?: string | null; Instituicao?: string | null }> | null;
        }>;
        PessoalJuridica?: { InscricaoEstadual?: string | null } | null;
    } | null | undefined): number {
        if (!psicologo) return 48;

        const profile = psicologo.ProfessionalProfiles?.[0];
        const addressRaw = psicologo.Address;
        const address = Array.isArray(addressRaw) ? addressRaw[0] : addressRaw;

        const percentualBase = 48;
        const tipoPessoaJuridico = profile?.TipoPessoaJuridico;
        const tiposArray = Array.isArray(tipoPessoaJuridico)
            ? tipoPessoaJuridico
            : tipoPessoaJuridico
                ? [tipoPessoaJuridico]
                : [];

        const isAutonomo = tiposArray.some((t) => t === "Autonomo") &&
            !tiposArray.some((t) => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");
        const isPJ = !isAutonomo && tiposArray.some((t) => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");
        const totalCamposEditaveis = isAutonomo ? 17 : 19;

        let camposPreenchidos = 0;

        if (psicologo.Telefone && psicologo.Telefone.trim() !== "") camposPreenchidos++;
        if (psicologo.Sexo && psicologo.Sexo.trim() !== "") camposPreenchidos++;
        if (psicologo.Pronome && psicologo.Pronome.trim() !== "") camposPreenchidos++;
        if (psicologo.RacaCor && psicologo.RacaCor.trim() !== "") camposPreenchidos++;

        if (isPJ && psicologo.PessoalJuridica?.InscricaoEstadual && psicologo.PessoalJuridica.InscricaoEstadual.trim() !== "") {
            camposPreenchidos++;
        }

        if (address?.Cep && address.Cep.trim() !== "") camposPreenchidos++;
        if (address?.Rua && address.Rua.trim() !== "") camposPreenchidos++;
        if (address?.Numero && address.Numero.trim() !== "") camposPreenchidos++;
        if (!isAutonomo && address?.Complemento && address.Complemento.trim() !== "") camposPreenchidos++;
        if (address?.Bairro && address.Bairro.trim() !== "") camposPreenchidos++;
        if (address?.Cidade && address.Cidade.trim() !== "") camposPreenchidos++;
        if (address?.Estado && address.Estado.trim() !== "") camposPreenchidos++;

        if (profile?.SobreMim && profile.SobreMim.trim() !== "") camposPreenchidos++;

        if (profile?.ExperienciaClinica && profile.ExperienciaClinica.trim() !== "") camposPreenchidos++;
        if (profile?.Idiomas && profile.Idiomas.length > 0) camposPreenchidos++;
        if (profile?.TipoAtendimento && profile.TipoAtendimento.length > 0) camposPreenchidos++;
        if (profile?.Abordagens && profile.Abordagens.length > 0) camposPreenchidos++;
        if (profile?.Queixas && profile.Queixas.length > 0) camposPreenchidos++;

        if (profile?.Formacoes && profile.Formacoes.length > 0) {
            const formacaoCompleta = profile.Formacoes.some((f) => {
                const tipoFormacao = f.TipoFormacao || f.Tipo || "";
                return tipoFormacao.trim() !== "" &&
                    (f.Curso || "").trim() !== "" &&
                    (f.Instituicao || "").trim() !== "";
            });
            if (formacaoCompleta) camposPreenchidos++;
        }

        const percentualAdicional = totalCamposEditaveis > 0
            ? Math.round((camposPreenchidos / totalCamposEditaveis) * 52)
            : 0;

        return Math.min(100, percentualBase + percentualAdicional);
    }
    private authorizationService: AuthorizationService | undefined;
    private contratoService: ContratoService;
    private emailService: IEmailService;
    private userService: UserService;

    constructor(authorizationService?: AuthorizationService, emailService?: IEmailService) {
        this.authorizationService = authorizationService;
        this.contratoService = new ContratoService();
        this.emailService = emailService ?? new EmailService();
        this.userService = new UserService();
    }

    async list(user: User) {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Psychologists,
                ActionType.Read
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de psicólogos.");
            }
        }

        const psicologos = await prisma.user.findMany({
            where: {
                Role: "Psychologist",
                deletedAt: null,
                Status: { not: "Deletado" },
            },
            orderBy: {
                CreatedAt: "asc",
            },
            select: {
                Id: true,
                Nome: true,
                Email: true,
                Crp: true,
                Status: true,
                CreatedAt: true,
                Telefone: true,
                WhatsApp: true,
                Sexo: true,
                Pronome: true,
                RacaCor: true,
                RatingAverage: true,
                RatingCount: true,
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
                    },
                },
                ProfessionalProfiles: {
                    select: {
                        Id: true,
                        SobreMim: true,
                        ExperienciaClinica: true,
                        Idiomas: true,
                        TipoAtendimento: true,
                        Abordagens: true,
                        Queixas: true,
                        TipoPessoaJuridico: true,
                        Status: true,
                        Formacoes: {
                            select: {
                                Id: true,
                                TipoFormacao: true,
                                Instituicao: true,
                                Curso: true,
                                DataInicio: true,
                                DataConclusao: true,
                                Status: true,
                            },
                        },
                    },
                },
                PessoalJuridica: {
                    select: {
                        InscricaoEstadual: true,
                    },
                },
            },
        });

        return psicologos.map((psicologo) => ({
            ...psicologo,
            ProfilePercent: this.calcularPercentualPerfil(psicologo),
        }));
    }

    async delete(user: User, id: string) {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Psychologists,
                ActionType.Delete
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de psicólogos.");
            }
        }
        const existing = await prisma.user.findUnique({
            where: { Id: id },
            select: { Id: true, Role: true }
        });
        if (!existing || existing.Role !== "Psychologist") {
            throw new Error("Psicólogo não encontrado.");
        }

        // Soft delete com limpeza de storage/arquivos, mantendo histórico de consultas/financeiro
        return this.userService.deleteUser(id);
    }

    private async assertPsychologistExists(id: string) {
        const psicologo = await prisma.user.findUnique({
            where: { Id: id, Role: "Psychologist" },
            select: { Id: true }
        });
        if (!psicologo) {
            throw new Error("Psicólogo não encontrado.");
        }
        return psicologo;
    }

    async uploadImage(user: User, psicologoId: string, file: Express.Multer.File) {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Psychologists,
                ActionType.Update
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de psicólogos.");
            }
        }

        await this.assertPsychologistExists(psicologoId);
        return this.userService.uploadImage(psicologoId, file);
    }

    async updateImage(user: User, psicologoId: string, imageId: string, file: Express.Multer.File) {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Psychologists,
                ActionType.Update
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de psicólogos.");
            }
        }

        await this.assertPsychologistExists(psicologoId);
        const image = await prisma.image.findUnique({ where: { Id: imageId } });
        if (!image || image.UserId !== psicologoId) {
            throw new Error("Imagem não encontrada para este psicólogo.");
        }

        return this.userService.updateImage(psicologoId, imageId, file);
    }

    async deleteImage(user: User, psicologoId: string, imageId: string) {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Psychologists,
                ActionType.Update
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de psicólogos.");
            }
        }

        await this.assertPsychologistExists(psicologoId);
        const image = await prisma.image.findUnique({ where: { Id: imageId } });
        if (!image || image.UserId !== psicologoId) {
            throw new Error("Imagem não encontrada para este psicólogo.");
        }

        return this.userService.deleteImage(psicologoId, imageId);
    }

    async update(user: User, id: string, data: Record<string, unknown>) {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Psychologists,
                ActionType.Update
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de psicólogos.");
            }
        }

        // Busca o psicólogo antes da atualização para verificar se está sendo aprovado
        const psicologoAntes = await prisma.user.findUnique({
            where: { Id: id, Role: "Psychologist" },
            select: { Id: true, Status: true, DataAprovacao: true, Nome: true, Email: true }
        });

        // Lista de campos que não devem ser incluídos no update direto do User
        // pois são relações ou campos não pertencentes ao modelo User
        const relationFields = [
            'ProfessionalProfiles',
            'PsychologistAgendas',
            'ReviewsReceived',
            'FavoritesReceived',
            'FavoritesGiven',
            'Images',
            'Address',
            'BillingAddress',
            'PlanoAssinaturas',
            'FinanceiroEntries',
            'Onboardings',
            'Commissions',
            'CreditosAvulsos',
            'CancelamentosPsi',
            'WorkSchedules',
            'RefreshTokens',
            'NotificationStatus',
            'ConsultaPsicologos',
            'PessoalJuridica',
            'AssinaturaPlanos',
            'CiclosPlano',
            'ConsultaPacientes',
            'ConsultaAvulsaPaciente',
            'ConsultaAvulsaPsicologo',
            'ControleConsultaMensal',
            'Document',
            'Document_fiscal',
            'FinanceiroPsicologoEntries',
            'FormularioSaqueAutonomo',
            'LoginLog',
            'PlanoAssinaturasAdmin',
            'PolicyDocumentsCreated',
            'PolicyDocumentsUpdated',
            'Solicitacoes',
            'UserPermissions',
            'AdminActionLogs',
            'PatientAgendas',
            'BannersCreated',
            'BannersUpdated',
            'CancelamentosPac',
            'ConsultaParticipacao',
            'CreatedPasswordResets',
            'PasswordResets',
            'ReviewsMade'
        ];

        const nonModelFields = [
            'RatingPercent',
            'RatingStatus',
            'ProfilePercent',
        ];

        const normalizeUserStatus = (status: string): string | undefined => {
            const normalized = status
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toUpperCase()
                .replace(/[^A-Z]/g, "");

            const map: Record<string, string> = {
                ATIVO: "Ativo",
                EMANALISE: "EmAnalise",
                PENDENTEDOCUMENTACAO: "PendenteDocumentacao",
                ANALISECONTRATO: "AnaliseContrato",
                INATIVO: "Inativo",
                REPROVADO: "Reprovado",
                DESCREDENCIADOVOLUNTARIO: "DescredenciadoVoluntario",
                DESCREDENCIADOINVOLUNTARIO: "DescredenciadoInvoluntario",
                BLOQUEADO: "Bloqueado",
                PENDENTE: "Pendente",
                DELETADO: "Deletado",
                EMANALISECONTRATO: "AnaliseContrato",
            };

            return map[normalized];
        };

        const normalizeProfessionalProfileStatus = (status: string): string | undefined => {
            const normalized = status
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toUpperCase()
                .replace(/[^A-Z]/g, "");

            const map: Record<string, string> = {
                PREENCHIDO: "Preenchido",
                INCOMPLETO: "Incompleto",
            };

            return map[normalized];
        };

        // Filtra os dados removendo apenas campos de relação
        // Permite editar TODOS os campos do modelo User (exceto Password que é tratado separadamente)
        const updateData: Record<string, unknown> = {};
        for (const key in data) {
            // Normaliza o campo Whatsapp para o nome correto no schema
            if (key === 'Whatsapp') {
                updateData['WhatsApp'] = data[key];
                continue;
            }
            // Permite todos os campos do User, exceto relações e Password
            if (!relationFields.includes(key) && !nonModelFields.includes(key) && key !== 'Password') {
                updateData[key] = data[key];
            }
        }

        if (typeof updateData.Status === "string") {
            const normalizedStatus = normalizeUserStatus(updateData.Status);
            if (normalizedStatus) {
                updateData.Status = normalizedStatus;
            } else {
                throw new Error("Status inválido. Use um status válido do sistema.");
            }
        }

        // Permite atualizar senha se explicitamente solicitado (com validação de segurança)
        // Nota: Senha deve ser atualizada via endpoint específico de reset de senha
        // Mas se o admin quiser forçar uma nova senha, pode ser feito aqui com hash adequado

        // Pré-processamento para campos DateTime - trata todos os campos de data
        const dateFields = [
            'DataAprovacao',
            'DataNascimento',
            'LastLogin',
            'CreatedAt',
            'UpdatedAt',
            'deletedAt',
            'ResetPasswordTokenExpiresAt'
        ];

        for (const field of dateFields) {
            if (field in updateData) {
                if (!updateData[field] || updateData[field] === null || updateData[field] === '') {
                    // Permite setar como null se explicitamente enviado
                    if (updateData[field] === null) {
                        updateData[field] = null;
                    } else {
                        delete updateData[field];
                    }
                } else if (typeof updateData[field] === 'string' && !isNaN(Date.parse(updateData[field]))) {
                    updateData[field] = new Date(updateData[field]);
                }
                // Se já for Date, mantém
            }
        }

        // Tratamento especial para campos booleanos
        const booleanFields = [
            'TermsAccepted',
            'PrivacyAccepted',
            'IsOnboard',
            'AssinaturaContrato',
            'isTwoFAEnabled',
            'MustChangePassword'
        ];

        for (const field of booleanFields) {
            if (field in updateData) {
                const value = updateData[field];
                if (typeof value === 'string') {
                    updateData[field] = ['true', 'TRUE', '1', 'yes', 'YES'].includes(value);
                } else if (typeof value !== 'boolean') {
                    updateData[field] = Boolean(value);
                }
            }
        }

        // Verifica se o psicólogo está sendo aprovado
        // Aprovação ocorre quando o status muda de não-Ativo para Ativo
        // e a DataAprovacao está sendo definida
        const estaSendoAprovado =
            psicologoAntes &&
            psicologoAntes.Status !== 'Ativo' &&
            updateData.Status === 'Ativo' &&
            updateData.DataAprovacao !== undefined &&
            updateData.DataAprovacao !== null;

        // Atualiza endereços se fornecidos
        if (data.Address && typeof data.Address === 'object') {
            const addressData = data.Address as Record<string, unknown>;
            const addressPayload: Record<string, string | null> = {
                Rua: (addressData.Rua as string) ?? undefined,
                Numero: (addressData.Numero as string | null) ?? undefined,
                Complemento: (addressData.Complemento as string | null) ?? undefined,
                Bairro: (addressData.Bairro as string) ?? undefined,
                Cidade: (addressData.Cidade as string) ?? undefined,
                Estado: (addressData.Estado as string) ?? undefined,
                Cep: (addressData.Cep as string) ?? undefined,
            };
            Object.keys(addressPayload).forEach((key) => {
                if (addressPayload[key] === undefined) {
                    delete addressPayload[key];
                }
            });
            const hasRequiredAddressFields =
                !!addressPayload.Rua &&
                !!addressPayload.Bairro &&
                !!addressPayload.Cidade &&
                !!addressPayload.Estado &&
                !!addressPayload.Cep;

            const existingAddress = await prisma.address.findFirst({
                where: { UserId: id }
            });

            if (existingAddress && Object.keys(addressPayload).length > 0) {
                await prisma.address.update({
                    where: { Id: existingAddress.Id },
                    data: addressPayload
                });
            } else if (!existingAddress && hasRequiredAddressFields) {
                await prisma.address.create({
                    data: {
                        UserId: id,
                        ...(addressPayload as {
                            Rua: string;
                            Bairro: string;
                            Cidade: string;
                            Estado: string;
                            Cep: string;
                            Numero?: string | null;
                            Complemento?: string | null;
                        })
                    }
                });
            }
        }

        // Atualiza endereço de cobrança se fornecido
        if (data.BillingAddress && typeof data.BillingAddress === 'object') {
            const billingData = data.BillingAddress as Record<string, unknown>;
            const billingPayload: Record<string, string | null> = {
                Rua: (billingData.Rua as string) ?? undefined,
                Numero: (billingData.Numero as string | null) ?? undefined,
                Complemento: (billingData.Complemento as string | null) ?? undefined,
                Bairro: (billingData.Bairro as string) ?? undefined,
                Cidade: (billingData.Cidade as string) ?? undefined,
                Estado: (billingData.Estado as string) ?? undefined,
                Cep: (billingData.Cep as string) ?? undefined,
            };
            Object.keys(billingPayload).forEach((key) => {
                if (billingPayload[key] === undefined) {
                    delete billingPayload[key];
                }
            });
            const hasRequiredBillingFields =
                !!billingPayload.Rua &&
                !!billingPayload.Bairro &&
                !!billingPayload.Cidade &&
                !!billingPayload.Estado &&
                !!billingPayload.Cep;

            const existingBilling = await prisma.billingAddress.findFirst({
                where: { UserId: id }
            });

            if (existingBilling && Object.keys(billingPayload).length > 0) {
                await prisma.billingAddress.update({
                    where: { Id: existingBilling.Id },
                    data: billingPayload
                });
            } else if (!existingBilling && hasRequiredBillingFields) {
                await prisma.billingAddress.create({
                    data: {
                        UserId: id,
                        ...(billingPayload as {
                            Rua: string;
                            Bairro: string;
                            Cidade: string;
                            Estado: string;
                            Cep: string;
                            Numero?: string | null;
                            Complemento?: string | null;
                        })
                    }
                });
            }
        }

        // Atualiza dados profissionais (ProfessionalProfile) se fornecidos
        if (data.ProfessionalProfiles && Array.isArray(data.ProfessionalProfiles) && data.ProfessionalProfiles[0]) {
            const profileData = data.ProfessionalProfiles[0] as Record<string, unknown>;
            const profileId = typeof profileData.Id === 'string' ? profileData.Id : undefined;
            const existingProfile = profileId
                ? await prisma.professionalProfile.findUnique({ where: { Id: profileId } })
                : await prisma.professionalProfile.findFirst({ where: { UserId: id } });

            if (existingProfile) {
                const profileUpdate: Record<string, unknown> = {};
                if (profileData.ExperienciaClinica !== undefined) profileUpdate.ExperienciaClinica = profileData.ExperienciaClinica;
                if (profileData.Idiomas !== undefined) profileUpdate.Idiomas = profileData.Idiomas;
                if (profileData.Abordagens !== undefined) profileUpdate.Abordagens = profileData.Abordagens;
                if (profileData.Queixas !== undefined) profileUpdate.Queixas = profileData.Queixas;
                if (profileData.SobreMim !== undefined) profileUpdate.SobreMim = profileData.SobreMim;
                if (profileData.TipoAtendimento !== undefined) profileUpdate.TipoAtendimento = profileData.TipoAtendimento;
                if (profileData.TipoPessoaJuridico !== undefined) profileUpdate.TipoPessoaJuridico = profileData.TipoPessoaJuridico;
                if (profileData.AreasAtuacao !== undefined) profileUpdate.AreasAtuacao = profileData.AreasAtuacao;
                if (typeof profileData.Status === "string") {
                    const normalizedProfileStatus = normalizeProfessionalProfileStatus(profileData.Status);
                    if (normalizedProfileStatus) {
                        profileUpdate.Status = normalizedProfileStatus;
                    } else {
                        throw new Error("Status de preenchimento inválido. Use Preenchido ou Incompleto.");
                    }
                }

                if (Object.keys(profileUpdate).length > 0) {
                    await prisma.professionalProfile.update({
                        where: { Id: existingProfile.Id },
                        data: profileUpdate,
                    });
                }

                const dadosBancarios = profileData.DadosBancarios as Record<string, unknown> | undefined;
                const chavePix = typeof dadosBancarios?.ChavePix === 'string' ? dadosBancarios.ChavePix.trim() : '';
                if (chavePix) {
                    const existingDb = await prisma.dadosBancarios.findFirst({
                        where: { PsicologoAutonomoId: existingProfile.Id }
                    });
                    if (existingDb) {
                        await prisma.dadosBancarios.update({
                            where: { Id: existingDb.Id },
                            data: { ChavePix: chavePix }
                        });
                    } else {
                        await prisma.dadosBancarios.create({
                            data: {
                                ChavePix: chavePix,
                                PsicologoAutonomoId: existingProfile.Id,
                            }
                        });
                    }
                }
            }
        }

        // Atualiza dados de Pessoa Jurídica se fornecidos
        if (data.PessoalJuridica && typeof data.PessoalJuridica === 'object') {
            const pjData = data.PessoalJuridica as Record<string, unknown>;
            const existingPj = await prisma.pessoalJuridica.findUnique({
                where: { PsicologoId: id },
                include: { DadosBancarios: true }
            });

            const pjPayload: Record<string, unknown> = {};
            if (pjData.RazaoSocial !== undefined) pjPayload.RazaoSocial = pjData.RazaoSocial;
            if (pjData.NomeFantasia !== undefined) pjPayload.NomeFantasia = pjData.NomeFantasia;
            if (pjData.CNPJ !== undefined) pjPayload.CNPJ = pjData.CNPJ;
            if (pjData.InscricaoEstadual !== undefined) pjPayload.InscricaoEstadual = pjData.InscricaoEstadual;
            if (pjData.SimplesNacional !== undefined) pjPayload.SimplesNacional = pjData.SimplesNacional;
            if (pjData.DescricaoExtenso !== undefined) pjPayload.DescricaoExtenso = pjData.DescricaoExtenso;

            let pjId = existingPj?.Id;
            if (existingPj) {
                if (Object.keys(pjPayload).length > 0) {
                    await prisma.pessoalJuridica.update({
                        where: { Id: existingPj.Id },
                        data: pjPayload,
                    });
                }
            } else if (Object.keys(pjPayload).length > 0) {
                const razaoSocial = typeof pjPayload.RazaoSocial === "string" ? pjPayload.RazaoSocial : undefined;
                const cnpj = typeof pjPayload.CNPJ === "string" ? pjPayload.CNPJ : undefined;
                if (razaoSocial && cnpj) {
                    const created = await prisma.pessoalJuridica.create({
                        data: {
                            ...(pjPayload as {
                                RazaoSocial: string;
                                NomeFantasia?: string | null;
                                CNPJ: string;
                                InscricaoEstadual?: string | null;
                                SimplesNacional?: boolean | null;
                                DescricaoExtenso?: string | null;
                            }),
                            Psicologo: { connect: { Id: id } }
                        }
                    });
                    pjId = created.Id;
                } else {
                    console.warn("[PsicologoService] Dados PJ incompletos para criação (RazaoSocial/CNPJ ausentes).");
                }
            }

            const pjDadosBancarios = pjData.DadosBancarios as Record<string, unknown> | undefined;
            const pjChavePix = typeof pjDadosBancarios?.ChavePix === 'string' ? pjDadosBancarios.ChavePix.trim() : '';
            if (pjId && pjChavePix) {
                const existingDb = existingPj?.DadosBancarios;
                if (existingDb) {
                    await prisma.dadosBancarios.update({
                        where: { Id: existingDb.Id },
                        data: { ChavePix: pjChavePix }
                    });
                } else {
                    await prisma.dadosBancarios.create({
                        data: {
                            ChavePix: pjChavePix,
                            PessoalJuridicaId: pjId,
                        }
                    });
                }
            }
        }

        const resultado = await prisma.user.update({
            where: { Id: id, Role: "Psychologist" },
            data: updateData,
            include: {
                ProfessionalProfiles: {
                    include: {
                        Documents: true,
                        Formacoes: true,
                    }
                },
                PsychologistAgendas: true,
                ReviewsReceived: true,
                FavoritesReceived: true,
                Images: {
                    select: {
                        Id: true,
                        Url: true,
                    },
                },
                Address: true,
                BillingAddress: true,
                PlanoAssinaturas: true,
                FinanceiroEntries: true,
                Onboardings: true,
                Commissions: true,
                CreditosAvulsos: true,
                WorkSchedules: true,
                RefreshTokens: true,
                NotificationStatus: true,
                ConsultaPsicologos: {
                    include: {
                        ReservaSessao: true
                    }
                },
            }
        });

        const statusLabelMap: Record<string, string> = {
            Ativo: "Ativo",
            EmAnalise: "Em Análise",
            PendenteDocumentacao: "Pendente Documentação",
            AnaliseContrato: "Análise Contrato",
            Inativo: "Inativo",
            Reprovado: "Reprovado",
            DescredenciadoVoluntario: "Descredenciado Voluntário",
            DescredenciadoInvoluntario: "Descredenciado Involuntário",
            Bloqueado: "Bloqueado",
            Pendente: "Pendente",
            Deletado: "Deletado",
            EmAnaliseContrato: "Em Análise Contrato",
        };

        const statusAtual = typeof resultado.Status === "string" ? resultado.Status : String(resultado.Status);
        const statusLabel = statusLabelMap[statusAtual] || statusAtual;
        const statusAlterado = psicologoAntes?.Status && updateData.Status && psicologoAntes.Status !== updateData.Status;
        const responsavelAlterado = typeof updateData.Nome === "string" && psicologoAntes?.Nome && updateData.Nome !== psicologoAntes.Nome;

        if ((statusAlterado || responsavelAlterado) && resultado.Email && resultado.Nome) {
            try {
                await this.emailService.sendStatusAtualizadoPsicologoEmail(resultado.Email, resultado.Nome, statusLabel);
            } catch (emailError) {
                console.error('[PsicologoService] Erro ao enviar email de status do psicólogo:', emailError);
            }
        }

        // Se o psicólogo foi aprovado, gera a agenda automaticamente e envia email
        if (estaSendoAprovado) {
            try {
                console.log(`[PsicologoService] Psicólogo ${id} foi aprovado. Gerando agenda automaticamente e enviando email...`);

                // Registra aprovação na auditoria
                try {
                    const { logPsychologistApproval } = await import('../../utils/auditLogger.util');
                    await logPsychologistApproval(
                        user.Id,
                        id,
                        'approve',
                        undefined, // motivo não disponível aqui
                        undefined // IP não disponível aqui
                    );
                } catch (auditError) {
                    console.error('[PsicologoService] Erro ao registrar auditoria de aprovação:', auditError);
                    // Não interrompe o fluxo
                }

                // Envia email de aprovação
                try {
                    if (resultado.Email && resultado.Nome) {
                        await this.emailService.sendAprovacaoPsicologoEmail(resultado.Email, resultado.Nome);
                        console.log(`[PsicologoService] ✅ Email de aprovação enviado para ${resultado.Email}`);
                    } else {
                        console.warn(`[PsicologoService] ⚠️ Não foi possível enviar email de aprovação: Email ou Nome não disponível`);
                    }
                } catch (emailError) {
                    console.error(`[PsicologoService] Erro ao enviar email de aprovação para psicólogo ${id}:`, emailError);
                    // Não interrompe o fluxo
                }

                // Gera agenda automaticamente
                const gerarAgendaService = new GerarAgendaService(prismaAgendaRepository, prismaUserRepository);
                const resultadoAgenda = await gerarAgendaService.generateAgendaForPsychologist(id);

                if (resultadoAgenda.error) {
                    console.error(`[PsicologoService] Erro ao gerar agenda para psicólogo ${id}:`, resultadoAgenda.error);
                } else {
                    console.log(`[PsicologoService] ✅ Agenda gerada com sucesso para psicólogo ${id}. Total de agendas criadas: ${resultadoAgenda.criados || 0}`);
                }
            } catch (error) {
                console.error(`[PsicologoService] Erro ao processar aprovação do psicólogo ${id}:`, error);
                // Não lança erro para não interromper o fluxo de aprovação
            }
        }

        return resultado;
    }

    async getById(user: User, id: string) {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Psychologists,
                ActionType.Read
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de psicólogos.");
            }
        }
        const psicologo = await prisma.user.findFirst({
            where: { Id: id, Role: "Psychologist" },
            include: {
                ProfessionalProfiles: {
                    include: {
                        Documents: true,
                        Formacoes: true,
                        DadosBancarios: true,
                    }
                },
                PsychologistAgendas: true,
                ReviewsReceived: true,
                FavoritesReceived: true,
                Images: {
                    select: {
                        Id: true,
                        Url: true,
                    },
                },
                Address: true,
                BillingAddress: true,
                Commissions: true,
                WorkSchedules: true,
                PessoalJuridica: {
                    include: {
                        DadosBancarios: true,
                        EnderecoEmpresa: true
                    }
                },
                ConsultaPsicologos: {
                    include: {
                        Paciente: {
                            select: {
                                Id: true,
                                Nome: true,
                                Email: true
                            }
                        },
                        ReservaSessao: true
                    }
                },
            }
        });

        if (!psicologo) return null;
        const { Password, ...rest } = psicologo;
        const ratingAverage = typeof psicologo.RatingAverage === "number" ? psicologo.RatingAverage : 0;
        const ratingCount = typeof psicologo.RatingCount === "number" ? psicologo.RatingCount : 0;
        const ratingPercent = Math.max(0, Math.min(100, Math.round((ratingAverage / 5) * 100)));
        const ratingStatus = this.calcularStatusPorPercentual(ratingPercent);

        return {
            ...rest,
            RatingAverage: ratingAverage,
            RatingCount: ratingCount,
            // RatingPercent é só visual, nunca deve ser enviado ao banco
            RatingStatus: ratingStatus,
            ProfilePercent: this.calcularPercentualPerfil(psicologo),
        };
    }


    async gerarContrato(psicologo: ContratoPsicologoData, templateName?: string): Promise<{ urlContrato: string }> {
        // Gera o contrato usando o serviço e retorna o resultado
        const resultado = await this.contratoService.gerarContrato(psicologo, templateName);
        return resultado;
    }

    async previaContrato(idUser: string): Promise<string> {
        try {
            console.log(`[Previa Contrato Service] Buscando psicólogo com ID: ${idUser}`);
            // Busca APENAS os dados necessários para o contrato (otimizado!)
            const psicologo = await prisma.user.findFirst({
                where: { Id: idUser, Role: "Psychologist" },
                include: {
                    Address: true,
                    PessoalJuridica: {
                        include: {
                            EnderecoEmpresa: true
                        }
                    },
                }
            });

            if (!psicologo) {
                console.error(`[Previa Contrato Service] ❌ Psicólogo não encontrado para ID: ${idUser}`);
                throw new Error(`Psicólogo não encontrado com ID: ${idUser}`);
            }

            console.log(`[Previa Contrato Service] ✅ Psicólogo encontrado: ${psicologo.Nome}`);

            // Prepara os dados no formato ContratoPsicologoData (igual ao controller)
            const endereco = Array.isArray(psicologo.Address) && psicologo.Address.length > 0 ? psicologo.Address[0] : undefined;
            const pessoaJuridica = psicologo.PessoalJuridica;

            console.log(`[Previa Contrato Service] Dados do psicólogo:`);
            console.log(`[Previa Contrato Service] - Nome: ${psicologo.Nome}`);
            console.log(`[Previa Contrato Service] - CRP: ${psicologo.Crp}`);
            console.log(`[Previa Contrato Service] - CPF: ${psicologo.Cpf}`);
            console.log(`[Previa Contrato Service] - Tem PessoalJuridica?: ${!!pessoaJuridica}`);
            if (pessoaJuridica) {
                console.log(`[Previa Contrato Service] - Razão Social: ${pessoaJuridica.RazaoSocial}`);
                console.log(`[Previa Contrato Service] - CNPJ: ${pessoaJuridica.CNPJ}`);
            }

            const psicologoData: ContratoPsicologoData = {
                id: psicologo.Id,
                nome: psicologo.Nome || '',
                crp: psicologo.Crp || '',
                cpf: psicologo.Cpf || '',
                email: psicologo.Email || '',
                ipNavegador: '',
                contratante: {
                    nome: psicologo.Nome || '',
                    rg: psicologo.Rg || '',
                    cpf: psicologo.Cpf || '',
                    logradouro: endereco?.Rua || '',
                    numero: endereco?.Numero || '',
                    bairro: endereco?.Bairro || '',
                    cidade: endereco?.Cidade || '',
                    uf: endereco?.Estado || '',
                    complemento: endereco?.Complemento || ''
                },
                pessoaJuridica: pessoaJuridica ? {
                    razaoSocial: pessoaJuridica.RazaoSocial || '',
                    cnpj: pessoaJuridica.CNPJ || '',
                    representanteLegalNome: psicologo.Nome || '',
                    representanteLegalRg: psicologo.Rg || '',
                    representanteLegalCpf: psicologo.Cpf || '',
                    representanteLegalEndereco: endereco?.Rua || '',
                    representanteLegalNumero: endereco?.Numero || '',
                    representanteLegalComplemento: endereco?.Complemento || '',
                    representanteLegalBairro: endereco?.Bairro || '',
                    representanteLegalCidade: endereco?.Cidade || '',
                    representanteLegalUf: endereco?.Estado || '',
                    enderecoEmpresa: pessoaJuridica.EnderecoEmpresa ? {
                        rua: pessoaJuridica.EnderecoEmpresa.Rua || '',
                        numero: pessoaJuridica.EnderecoEmpresa.Numero || '',
                        complemento: pessoaJuridica.EnderecoEmpresa.Complemento || '',
                        bairro: pessoaJuridica.EnderecoEmpresa.Bairro || '',
                        cidade: pessoaJuridica.EnderecoEmpresa.Cidade || '',
                        estado: pessoaJuridica.EnderecoEmpresa.Estado || ''
                    } : undefined
                } : undefined,
                plano: {},
                pagamento: {},
                rescisao: {},
                anexoI: {}
            };

            console.log(`[Previa Contrato] Dados do psicólogo preparados:`);
            console.log(`[Previa Contrato] - Nome: ${psicologoData.nome}`);
            console.log(`[Previa Contrato] - CRP: ${psicologoData.crp}`);
            console.log(`[Previa Contrato] - CPF: ${psicologoData.cpf}`);
            console.log(`[Previa Contrato] - Email: ${psicologoData.email}`);
            console.log(`[Previa Contrato] - Contratante: ${JSON.stringify(psicologoData.contratante, null, 2).substring(0, 300)}`);
            console.log(`[Previa Contrato] - Tem PessoaJuridica?: ${!!psicologoData.pessoaJuridica}`);
            if (psicologoData.pessoaJuridica) {
                console.log(`[Previa Contrato] - Razão Social: ${psicologoData.pessoaJuridica.razaoSocial}`);
                console.log(`[Previa Contrato] - CNPJ: ${psicologoData.pessoaJuridica.cnpj}`);
            }

            // Usa o serviço de contrato para gerar a prévia (mesma lógica da geração)
            console.log(`[Previa Contrato] ==========================================`);
            console.log(`[Previa Contrato] INICIANDO PRÉVIA DO CONTRATO DE PARCERIA`);
            console.log(`[Previa Contrato] Template: (auto)`);
            console.log(`[Previa Contrato] ID do psicólogo: ${idUser}`);
            console.log(`[Previa Contrato] ==========================================`);

            // Usa o método renderHtml do ContratoService para garantir consistência
            const html = await this.contratoService.renderHtmlForPreview(psicologoData);

            // Validações rigorosas do HTML gerado
            console.log(`[Previa Contrato] HTML gerado. Tamanho: ${html.length} caracteres`);

            // Verifica se contém o título CORRETO do contrato de parceria
            if (!this.hasParceriaTitle(html)) {
                console.error(`[Previa Contrato] ❌ ERRO CRÍTICO: HTML não contém título de PARCERIA!`);
                console.error(`[Previa Contrato] Primeiros 1000 caracteres do HTML:`, html.substring(0, 1000));

                // Verifica se contém o título ERRADO (de paciente)
                if (this.hasPacienteTitle(html)) {
                    console.error(`[Previa Contrato] ❌ ERRO: Template de PACIENTE detectado! Isso não deveria acontecer!`);
                    throw new Error(`Template incorreto: Foi detectado o template de paciente em vez do template de parceria do psicólogo. Verifique a configuração do serviço.`);
                }

                throw new Error(`Template incorreto gerado. O HTML não contém 'CONTRATO DE PARCERIA E INTERMEDIAÇÃO'. Esperado: contrato-parceria-psicologo.html`);
            }

            // Verifica se NÃO contém o título ERRADO (de paciente)
            if (this.hasPacienteTitle(html)) {
                console.error(`[Previa Contrato] ❌ ERRO CRÍTICO: Template de PACIENTE detectado no HTML!`);
                console.error(`[Previa Contrato] Isso indica que o template errado está sendo usado!`);
                throw new Error(`Template incorreto: Foi detectado o template de paciente. O sistema deve usar 'contrato-parceria-psicologo.html' para psicólogos.`);
            }

            console.log(`[Previa Contrato] ✅ HTML validado corretamente - Contém título de PARCERIA`);
            console.log(`[Previa Contrato] ✅ HTML NÃO contém título de PACIENTE`);
            console.log(`[Previa Contrato] ==========================================`);

            return html;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao gerar prévia do contrato';
            const errorStack = err instanceof Error ? err.stack : 'N/A';

            console.error(`[Previa Contrato Service] ❌ ERRO CAPTURADO:`);
            console.error(`[Previa Contrato Service] Mensagem: ${errorMessage}`);
            console.error(`[Previa Contrato Service] Stack: ${errorStack}`);

            // Re-lança o erro para ser capturado pelo controller
            throw new Error(`Erro ao gerar prévia do contrato: ${errorMessage}`);
        }
    }
}
import { IUserPsicologoService } from "../../interfaces/psicoologo/user.psicologo.interface";
import prisma from "../../prisma/client";
import { UserPsicologo, TipoFormacao, Formacao } from "../../types/user.psicologo.types";
import { supabase, supabaseAdmin, STORAGE_BUCKET_PUBLIC } from "../storage.services";
import {
    Languages,
    TipoAtendimento,
    Abordagem,
    Queixa,
    TipoPessoaJuridica,
    Sexo,
    Pronome,
    ExperienciaClinica,
    ProfessionalProfileStatus,
    UserStatus,
    Role,
    RacaCor,
    Prisma
} from "../../generated/prisma";
import {
    UserUpdateData,
    AddressUpdateData,
    BillingAddressUpdateData,
    PessoalJuridicaUpdateData,
    ProfessionalProfileUpdateData,
    PsychologistDocumentUpdateData,
    PrismaTransactionClient,
    GrauInstrucao
} from "../../types/user.update.types";

const reviewSelectWithTitulo: Prisma.ReviewSelect = {
    Id: true,
    UserId: true,
    PsicologoId: true,
    Rating: true,
    Titulo: true,
    Comentario: true,
    Status: true,
    MostrarNaHome: true,
    MostrarNaPsicologo: true,
    CreatedAt: true,
    UpdatedAt: true
};

const reviewSelectWithoutTitulo: Prisma.ReviewSelect = {
    Id: true,
    UserId: true,
    PsicologoId: true,
    Rating: true,
    Comentario: true,
    Status: true,
    MostrarNaHome: true,
    MostrarNaPsicologo: true,
    CreatedAt: true,
    UpdatedAt: true
};

const userPsicologoSelect = {
    Id: true,
    Nome: true,
    Email: true,
    Cpf: true,
    Crp: true,
    GoogleId: true,
    Telefone: true,
    WhatsApp: true,
    DataNascimento: true,
    Sexo: true,
    RacaCor: true,
    Status: true,
    Role: true,
    DataAprovacao: true,
    Pronome: true,
    Rg: true,
    AssinaturaContrato: true,
    twoFASecret: true,
    isTwoFAEnabled: true,
    Address: {
        select: {
            Id: true,
            UserId: true,
            Rua: true,
            Numero: true,
            Complemento: true,
            Bairro: true,
            Cidade: true,
            Estado: true,
            Cep: true,
            CreatedAt: true,
            UpdatedAt: true
        }
    },
    BillingAddress: {
        select: {
            Id: true,
            UserId: true,
            Rua: true,
            Numero: true,
            Complemento: true,
            Bairro: true,
            Cidade: true,
            Estado: true,
            Cep: true,
            CreatedAt: true,
            UpdatedAt: true
        }
    },
    Images: {
        select: {
            Id: true,
            UserId: true,
            Url: true,
            CreatedAt: true,
            UpdatedAt: true
        }
    },
    ReviewsMade: {
        select: reviewSelectWithTitulo
    },
    ReviewsReceived: {
        select: reviewSelectWithTitulo
    },
    ProfessionalProfiles: {
        select: {
            Id: true,
            TipoPessoaJuridico: true,
            TipoAtendimento: true,
            ExperienciaClinica: true,
            Idiomas: true,
            SobreMim: true,
            Abordagens: true,
            Queixas: true,
            Status: true,
            CreatedAt: true,
            UpdatedAt: true,
            AreasAtuacao: true,
            DadosBancarios: {
                select: {
                    Id: true,
                    PessoalJuridicaId: true,
                    PsicologoAutonomoId: true,
                    ChavePix: true,
                    CreatedAt: true,
                    UpdatedAt: true
                }
            },
            Formacoes: {
                select: {
                    Id: true,
                    ProfessionalProfileId: true,
                    TipoFormacao: true,
                    Instituicao: true,
                    Curso: true,
                    Status: true,
                    DataInicio: true,
                    DataConclusao: true,
                    CreatedAt: true,
                    UpdatedAt: true
                }
            },
            Documents: {
                select: {
                    Id: true,
                    ProfessionalProfileId: true,
                    Url: true,
                    Type: true,
                    Description: true,
                    CreatedAt: true,
                    UpdatedAt: true
                }
            }
        }
    },
    PessoalJuridica: {
        select: {
            Id: true,
            CNPJ: true,
            RazaoSocial: true,
            NomeFantasia: true,
            InscricaoEstadual: true,
            SimplesNacional: true,
            CreatedAt: true,
            UpdatedAt: true,
            DadosBancarios: {
                select: {
                    Id: true,
                    PessoalJuridicaId: true,
                    ChavePix: true,
                    CreatedAt: true,
                    UpdatedAt: true
                }
            }
        }
    },
    Document: {
        select: {
            Id: true,
            Url: true,
            Type: true,
            Description: true,
            DataHoraAceite: true,
            IpNavegador: true,
            AssinaturaDigital: true,
            CreatedAt: true,
            UpdatedAt: true
        }
    },
    Solicitacoes: {
        select: {
            Id: true,
            Title: true,
            Tipo: true,
            Status: true,
            Protocol: true,
            Descricao: true,
            Documentos: true,
            Log: true,
            SLA: true,
            CreatedAt: true,
            UpdatedAt: true
        }
    },
    LoginLog: {
        select: {
            Id: true,
            Email: true,
            Ip: true,
            UserAgent: true,
            Success: true,
            Message: true,
            CreatedAt: true
        }
    }
} satisfies Prisma.UserSelect;

const userPsicologoSelectLegacy: Prisma.UserSelect = {
    ...userPsicologoSelect,
    WhatsApp: false,
    RacaCor: false,
    ReviewsMade: {
        select: reviewSelectWithoutTitulo
    },
    ReviewsReceived: {
        select: reviewSelectWithoutTitulo
    }
};

const isMissingColumnError = (error: unknown): boolean => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return error.code === 'P2022';
    }
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return message.includes('column') && message.includes('does not exist');
    }
    return false;
};


export class UserPsicologoService implements IUserPsicologoService {
    async fetchUsersPsicologo(userId: string): Promise<UserPsicologo[]> {
        try {
            const psicologos = await prisma.user.findMany({
                where: {
                    Id: userId,
                    Role: "Psychologist"
                },
                select: userPsicologoSelect
            });

            return this.formatUserPsicologo(psicologos);
        } catch (error) {
            if (!isMissingColumnError(error)) {
                throw error;
            }

            const psicologosLegacy = await prisma.user.findMany({
                where: {
                    Id: userId,
                    Role: "Psychologist"
                },
                select: userPsicologoSelectLegacy
            });

            return this.formatUserPsicologo(psicologosLegacy, {
                includeMissingFields: true
            });
        }
    }

    private formatUserPsicologo(
        psicologos: Array<
            Omit<UserPsicologo, "RacaCor" | "WhatsApp" | "ReviewsMade" | "ReviewsReceived"> & {
                RacaCor?: string | null;
                WhatsApp?: string | null;
                ReviewsMade?: Array<{ Titulo?: string | null }>;
                ReviewsReceived?: Array<{ Titulo?: string | null }>;
            }
        >,
        options?: { includeMissingFields?: boolean }
    ): UserPsicologo[] {
        const includeMissingFields = options?.includeMissingFields === true;
        return psicologos.map((p) => {
            const address = Array.isArray(p.Address) ? p.Address[0] : p.Address;
            const addressFormatted = address ? {
                ...address,
                Numero: address.Numero ?? ''
            } : {
                Id: '',
                UserId: p.Id,
                Rua: '',
                Numero: '',
                Bairro: '',
                Cidade: '',
                Estado: '',
                Cep: ''
            };

            const billingAddress = Array.isArray(p.BillingAddress) && p.BillingAddress.length > 0
                ? p.BillingAddress[0]
                : (p.BillingAddress || null);

            const reviewsMade = p.ReviewsMade?.map((review) => ({
                ...review,
                ...(includeMissingFields ? { Titulo: review.Titulo ?? null } : {})
            })) ?? [];
            const reviewsReceived = p.ReviewsReceived?.map((review) => ({
                ...review,
                ...(includeMissingFields ? { Titulo: review.Titulo ?? null } : {})
            })) ?? [];

            return {
                ...p,
                ...(includeMissingFields ? { RacaCor: p.RacaCor ?? null, WhatsApp: p.WhatsApp ?? null } : {}),
                Address: addressFormatted,
                BillingAddress: billingAddress,
                ReviewsMade: reviewsMade,
                ReviewsReceived: reviewsReceived
            } as unknown as UserPsicologo;
        });
    }

    async updateUserPsicologo(userId: string, data: Partial<UserPsicologo>): Promise<UserPsicologo | null> {
        console.log("[updateUserPsicologo] ========== INÍCIO DA ATUALIZAÇÃO ==========");
        console.log("[updateUserPsicologo] userId:", userId);
        console.log("[updateUserPsicologo] Data recebida:", JSON.stringify(data, null, 2));

        try {
            return await prisma.$transaction(async (tx) => {

                // Busca todos os Ids dos relacionamentos se não vierem no JSON
                const userWithRelations = await tx.user.findUnique({
                    where: { Id: userId },
                    select: {
                        Address: { select: { Id: true } },
                        BillingAddress: { select: { Id: true } },
                        PessoalJuridica: { select: { Id: true } },
                        ProfessionalProfiles: { select: { Id: true } }
                    }
                });

                // Address
                let addressData = Array.isArray(data.Address) ? data.Address[0] : data.Address;
                if (addressData && !addressData.Id) {
                    let addressId;
                    if (Array.isArray(userWithRelations?.Address)) {
                        addressId = userWithRelations.Address[0]?.Id;
                    } else if (userWithRelations?.Address && 'Id' in userWithRelations.Address) {
                        addressId = (userWithRelations.Address as { Id: string }).Id;
                    }
                    if (addressId) {
                        addressData = { ...addressData, Id: addressId };
                    }
                }

                // BillingAddress
                let billingAddressData: BillingAddressUpdateData | undefined = Array.isArray(data.BillingAddress)
                    ? data.BillingAddress[0]
                    : (data.BillingAddress ?? undefined);
                if (billingAddressData && !billingAddressData.Id) {
                    let billingId: string | undefined;
                    if (Array.isArray(userWithRelations?.BillingAddress)) {
                        billingId = userWithRelations.BillingAddress[0]?.Id;
                    } else if (userWithRelations?.BillingAddress && 'Id' in userWithRelations.BillingAddress) {
                        billingId = (userWithRelations.BillingAddress as { Id: string }).Id;
                    }
                    if (billingId) {
                        billingAddressData = { ...billingAddressData, Id: billingId };
                    }
                }

                // ProfessionalProfiles - precisa ser processado primeiro para verificar se é autônomo
                let professionalProfileData: ProfessionalProfileUpdateData | undefined = undefined;
                if (data.ProfessionalProfiles) {
                    const rawProfile = Array.isArray(data.ProfessionalProfiles) ? data.ProfessionalProfiles[0] : data.ProfessionalProfiles;
                    // Converte ProfessionalProfile para ProfessionalProfileUpdateData
                    if (rawProfile) {
                        professionalProfileData = {
                            Id: rawProfile.Id,
                            TipoPessoaJuridico: rawProfile.TipoPessoaJuridico as TipoPessoaJuridica[] | undefined,
                            TipoAtendimento: rawProfile.TipoAtendimento as TipoAtendimento[] | undefined,
                            ExperienciaClinica: rawProfile.ExperienciaClinica as ExperienciaClinica | null | undefined,
                            Idiomas: rawProfile.Idiomas as Languages[] | undefined,
                            SobreMim: rawProfile.SobreMim,
                            Abordagens: rawProfile.Abordagens as Abordagem[] | undefined,
                            Queixas: rawProfile.Queixas as Queixa[] | undefined,
                            GrauInstrucao: rawProfile.GrauInstrucao ? (rawProfile.GrauInstrucao as GrauInstrucao) : null
                        };
                    }
                    if (professionalProfileData && !professionalProfileData.Id) {
                        let profId: string | undefined;
                        if (Array.isArray(userWithRelations?.ProfessionalProfiles)) {
                            profId = userWithRelations.ProfessionalProfiles[0]?.Id;
                        } else if (userWithRelations?.ProfessionalProfiles && 'Id' in userWithRelations.ProfessionalProfiles) {
                            profId = (userWithRelations.ProfessionalProfiles as { Id: string }).Id;
                        }
                        if (profId) {
                            professionalProfileData = { ...professionalProfileData, Id: profId };
                        }
                    }
                }

                // PessoalJuridica - só processa se NÃO for autônomo
                let pessoalJuridicaData = data.PessoalJuridica;
                let pessoalJuridicaId: string | undefined;

                // Verifica se é autônomo ANTES de processar PessoalJuridica
                const isAutonomoCheck = professionalProfileData?.TipoPessoaJuridico &&
                    Array.isArray(professionalProfileData.TipoPessoaJuridico) &&
                    professionalProfileData.TipoPessoaJuridico.some((t: string) => t === "Autonomo") &&
                    !professionalProfileData.TipoPessoaJuridico.some((t: string) => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");

                // Só processa PessoalJuridica se NÃO for autônomo
                if (!isAutonomoCheck) {
                    // Busca o Id existente se não vier no JSON
                    if (pessoalJuridicaData && !pessoalJuridicaData.Id) {
                        if (Array.isArray(userWithRelations?.PessoalJuridica)) {
                            pessoalJuridicaId = userWithRelations.PessoalJuridica[0]?.Id;
                        } else {
                            pessoalJuridicaId = userWithRelations?.PessoalJuridica?.Id;
                        }
                        if (pessoalJuridicaId) {
                            pessoalJuridicaData = { ...pessoalJuridicaData, Id: pessoalJuridicaId };
                        }
                    } else if (pessoalJuridicaData?.Id) {
                        pessoalJuridicaId = pessoalJuridicaData.Id;
                    }

                    // Se não existe PessoalJuridica mas há dados para salvar (ex: PIX), cria novo
                    if (pessoalJuridicaData && !pessoalJuridicaId && (pessoalJuridicaData.DadosBancarios?.ChavePix || pessoalJuridicaData.CNPJ || pessoalJuridicaData.RazaoSocial)) {
                        console.log("Creating new PessoalJuridica for user:", userId);
                        const newPJ = await tx.pessoalJuridica.create({
                            data: {
                                PsicologoId: userId,
                                CNPJ: pessoalJuridicaData.CNPJ || "",
                                RazaoSocial: pessoalJuridicaData.RazaoSocial || "",
                                NomeFantasia: pessoalJuridicaData.NomeFantasia || "",
                                InscricaoEstadual: pessoalJuridicaData.InscricaoEstadual || "",
                                SimplesNacional: pessoalJuridicaData.SimplesNacional ?? false
                            }
                        });
                        pessoalJuridicaId = newPJ.Id;
                        pessoalJuridicaData = { ...pessoalJuridicaData, Id: pessoalJuridicaId };
                        console.log("Created PessoalJuridica with ID:", pessoalJuridicaId);
                    }
                } else {
                    // Se for autônomo, limpa os dados de PessoalJuridica para não processar
                    console.log("User is autonomo, skipping PessoalJuridica processing");
                    pessoalJuridicaData = undefined;
                    pessoalJuridicaId = undefined;
                }

                // ProfessionalProfiles já foi processado acima (antes de PessoalJuridica)

                // Atualiza dados principais do usuário
                const userUpdateData: UserUpdateData = {};

                // Campos básicos obrigatórios
                if (data.Nome !== undefined) userUpdateData.Nome = data.Nome;
                if (data.Email !== undefined) userUpdateData.Email = data.Email;
                if (data.Telefone !== undefined) userUpdateData.Telefone = data.Telefone;
                if (data.Cpf !== undefined) userUpdateData.Cpf = data.Cpf;

                // Campos opcionais de identificação
                if (data.Crp !== undefined) userUpdateData.Crp = data.Crp;
                if (data.GoogleId !== undefined) userUpdateData.GoogleId = data.GoogleId;
                if (data.Rg !== undefined) userUpdateData.Rg = data.Rg;

                // Campos de perfil
                if (data.Sexo !== undefined) {
                    userUpdateData.Sexo = data.Sexo && data.Sexo.trim() !== "" ? (data.Sexo as Sexo) : null;
                }
                if (data.Pronome !== undefined) {
                    userUpdateData.Pronome = data.Pronome && data.Pronome.trim() !== "" ? (data.Pronome as Pronome) : null;
                }
                if (data.RacaCor !== undefined) {
                    // Valida se o valor é um enum válido antes de atribuir
                    const validRacaCorValues = ['Branca', 'Preta', 'Parda', 'Amarela', 'Indigena', 'PrefiroNaoInformar'];
                    if (data.RacaCor && data.RacaCor.trim() !== "" && validRacaCorValues.includes(data.RacaCor)) {
                        userUpdateData.RacaCor = data.RacaCor as RacaCor;
                    } else {
                        userUpdateData.RacaCor = null;
                    }
                }
                if (data.WhatsApp !== undefined) userUpdateData.WhatsApp = data.WhatsApp;

                // Campos booleanos
                if (data.AssinaturaContrato !== undefined) userUpdateData.AssinaturaContrato = data.AssinaturaContrato;
                // TermsAccepted, PrivacyAccepted, IsOnboard, isTwoFAEnabled não estão no tipo UserPsicologo, mas podem vir no data
                const extendedData = data as Partial<UserPsicologo> & { TermsAccepted?: boolean; PrivacyAccepted?: boolean; IsOnboard?: boolean; isTwoFAEnabled?: boolean };
                if (extendedData.TermsAccepted !== undefined) userUpdateData.TermsAccepted = extendedData.TermsAccepted;
                if (extendedData.PrivacyAccepted !== undefined) userUpdateData.PrivacyAccepted = extendedData.PrivacyAccepted;
                if (extendedData.IsOnboard !== undefined) userUpdateData.IsOnboard = extendedData.IsOnboard;
                if (extendedData.isTwoFAEnabled !== undefined) userUpdateData.isTwoFAEnabled = extendedData.isTwoFAEnabled;

                // Campos de pagamento/assinatura
                const paymentData = data as Partial<UserPsicologo> & { VindiCustomerId?: string; PaymentToken?: string; PaymentProfileId?: string; SubscriptionId?: string };
                if (paymentData.VindiCustomerId !== undefined) userUpdateData.VindiCustomerId = paymentData.VindiCustomerId;
                if (paymentData.PaymentToken !== undefined) userUpdateData.PaymentToken = paymentData.PaymentToken;
                if (paymentData.PaymentProfileId !== undefined) userUpdateData.PaymentProfileId = paymentData.PaymentProfileId;
                if (paymentData.SubscriptionId !== undefined) userUpdateData.SubscriptionId = paymentData.SubscriptionId;

                // Campos de segurança (geralmente não atualizados por esta rota, mas incluindo)
                const securityData = data as Partial<UserPsicologo> & { Password?: string; ResetPasswordToken?: string; twoFASecret?: string; backupCodes?: string };
                if (securityData.Password !== undefined) userUpdateData.Password = securityData.Password;
                if (securityData.ResetPasswordToken !== undefined) userUpdateData.ResetPasswordToken = securityData.ResetPasswordToken;
                if (securityData.twoFASecret !== undefined) userUpdateData.twoFASecret = securityData.twoFASecret;
                if (securityData.backupCodes !== undefined) userUpdateData.backupCodes = securityData.backupCodes;

                // Campos de status e role
                if (data.Status !== undefined) userUpdateData.Status = data.Status as UserStatus;
                if (data.Role !== undefined) userUpdateData.Role = data.Role as Role;

                // Campos de data
                if (data.DataAprovacao !== undefined) {
                    const da = data.DataAprovacao;
                    if (da === "" || da === null) {
                        userUpdateData.DataAprovacao = null;
                    } else {
                        const asDate = da instanceof Date ? da : new Date(da);
                        if (!isNaN(asDate.getTime())) {
                            userUpdateData.DataAprovacao = asDate;
                        }
                    }
                }

                const loginData = data as Partial<UserPsicologo> & { LastLogin?: Date | string | null };
                if (loginData.LastLogin !== undefined) {
                    const ll = loginData.LastLogin;
                    if (ll === "" || ll === null) {
                        userUpdateData.LastLogin = null;
                    } else {
                        const asDate = ll instanceof Date ? ll : new Date(ll);
                        if (!isNaN(asDate.getTime())) {
                            userUpdateData.LastLogin = asDate;
                        }
                    }
                }

                // Trata DataNascimento
                if (data.DataNascimento !== undefined) {
                    const dn = data.DataNascimento;
                    if (dn === "" || dn === null) {
                        userUpdateData.DataNascimento = null;
                    } else {
                        const asDate = dn instanceof Date ? dn : new Date(dn);
                        if (!isNaN(asDate.getTime())) {
                            userUpdateData.DataNascimento = asDate;
                        }
                    }
                }

                console.log("User update data:", JSON.stringify(userUpdateData, null, 2));
                console.log("User update data fields:", Object.keys(userUpdateData));

                if (Object.keys(userUpdateData).length > 0) {
                    await tx.user.update({
                        where: { Id: userId },
                        data: userUpdateData
                    });
                    console.log("User updated successfully with fields:", Object.keys(userUpdateData));
                } else {
                    console.log("No user fields to update");
                }

                // Atualizações paralelas
                const updatePromises: Promise<unknown>[] = [];

                // Atualiza Address
                if (addressData && addressData.Id) {
                    console.log("Processing Address data:", JSON.stringify(addressData, null, 2));
                    const addrUpdate: Partial<AddressUpdateData> = {};

                    if (addressData.Rua !== undefined) addrUpdate.Rua = addressData.Rua;
                    if (addressData.Numero !== undefined) addrUpdate.Numero = addressData.Numero;
                    if (addressData.Bairro !== undefined) addrUpdate.Bairro = addressData.Bairro;
                    if (addressData.Cidade !== undefined) addrUpdate.Cidade = addressData.Cidade;
                    if (addressData.Estado !== undefined) addrUpdate.Estado = addressData.Estado;
                    if (addressData.Cep !== undefined) addrUpdate.Cep = addressData.Cep;
                    if (addressData.Complemento !== undefined) addrUpdate.Complemento = addressData.Complemento;

                    console.log("Address update data:", JSON.stringify(addrUpdate, null, 2));
                    console.log("Address update data keys:", Object.keys(addrUpdate).length);

                    if (Object.keys(addrUpdate).length > 0) {
                        console.log("Updating Address with ID:", addressData.Id);
                        updatePromises.push(
                            tx.address.update({
                                where: { Id: addressData.Id },
                                data: addrUpdate
                            }).then(() => console.log("Address updated successfully"))
                                .catch((err: unknown) => console.error("Error updating Address:", err))
                        );
                    }
                }

                // Atualiza BillingAddress
                if (billingAddressData && billingAddressData.Id) {
                    console.log("Processing BillingAddress data:", JSON.stringify(billingAddressData, null, 2));
                    const billAddrUpdate: Partial<BillingAddressUpdateData> = {};

                    if (billingAddressData.Rua !== undefined) billAddrUpdate.Rua = billingAddressData.Rua;
                    if (billingAddressData.Numero !== undefined) billAddrUpdate.Numero = billingAddressData.Numero;
                    if (billingAddressData.Bairro !== undefined) billAddrUpdate.Bairro = billingAddressData.Bairro;
                    if (billingAddressData.Cidade !== undefined) billAddrUpdate.Cidade = billingAddressData.Cidade;
                    if (billingAddressData.Estado !== undefined) billAddrUpdate.Estado = billingAddressData.Estado;
                    if (billingAddressData.Cep !== undefined) billAddrUpdate.Cep = billingAddressData.Cep;
                    if (billingAddressData.Complemento !== undefined) billAddrUpdate.Complemento = billingAddressData.Complemento;

                    console.log("BillingAddress update data:", JSON.stringify(billAddrUpdate, null, 2));
                    console.log("BillingAddress update data keys:", Object.keys(billAddrUpdate).length);

                    if (Object.keys(billAddrUpdate).length > 0) {
                        console.log("Updating BillingAddress with ID:", billingAddressData.Id);
                        updatePromises.push(
                            tx.billingAddress.update({ where: { Id: billingAddressData.Id }, data: billAddrUpdate })
                                .then(() => console.log("BillingAddress updated successfully"))
                                .catch((err: unknown) => console.error("Error updating BillingAddress:", err))
                        );
                    }
                }

                // Atualiza PessoalJuridica (agora sempre tem Id se existir) - só se NÃO for autônomo
                const isAutonomoForUpdate = professionalProfileData?.TipoPessoaJuridico &&
                    Array.isArray(professionalProfileData.TipoPessoaJuridico) &&
                    professionalProfileData.TipoPessoaJuridico.some((t: string) => t === "Autonomo") &&
                    !professionalProfileData.TipoPessoaJuridico.some((t: string) => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");

                if (pessoalJuridicaData && pessoalJuridicaId && !isAutonomoForUpdate) {
                    console.log("Processing PessoalJuridica data:", JSON.stringify(pessoalJuridicaData, null, 2));
                    const pjUpdate: Partial<PessoalJuridicaUpdateData> = {};

                    if (pessoalJuridicaData.CNPJ !== undefined) {
                        pjUpdate.CNPJ = pessoalJuridicaData.CNPJ;
                    }
                    if (pessoalJuridicaData.RazaoSocial !== undefined) {
                        pjUpdate.RazaoSocial = pessoalJuridicaData.RazaoSocial;
                    }
                    if (pessoalJuridicaData.NomeFantasia !== undefined) {
                        pjUpdate.NomeFantasia = pessoalJuridicaData.NomeFantasia;
                    }
                    if (pessoalJuridicaData.InscricaoEstadual !== undefined) {
                        pjUpdate.InscricaoEstadual = pessoalJuridicaData.InscricaoEstadual;
                    }
                    if (pessoalJuridicaData.SimplesNacional !== undefined) {
                        pjUpdate.SimplesNacional = pessoalJuridicaData.SimplesNacional;
                    }

                    console.log("PessoalJuridica update data:", JSON.stringify(pjUpdate, null, 2));
                    console.log("PessoalJuridica update data keys:", Object.keys(pjUpdate).length);

                    if (Object.keys(pjUpdate).length > 0) {
                        console.log("Updating PessoalJuridica with ID:", pessoalJuridicaId);
                        updatePromises.push(
                            tx.pessoalJuridica.update({ where: { Id: pessoalJuridicaId }, data: pjUpdate })
                                .then(() => console.log("PessoalJuridica updated successfully"))
                                .catch((err: unknown) => console.error("Error updating PessoalJuridica:", err))
                        );
                    }
                }

                // Atualiza a referência para usar o Id correto
                if (pessoalJuridicaData && pessoalJuridicaId) {
                    pessoalJuridicaData.Id = pessoalJuridicaId;
                }

                // Atualiza ProfessionalProfiles
                // Só atualiza se houver campos além de DadosBancarios para atualizar
                // Se só houver DadosBancarios, não atualiza o ProfessionalProfile (DadosBancarios é processado separadamente)
                if (professionalProfileData && professionalProfileData.Id) {
                    console.log("Processing ProfessionalProfile data:", JSON.stringify(professionalProfileData, null, 2));
                    const profUpdate: Partial<ProfessionalProfileUpdateData> = {};

                    // Arrays de enums com validação
                    if (Array.isArray(professionalProfileData.TipoPessoaJuridico) && professionalProfileData.TipoPessoaJuridico.length > 0) {
                        const validValues = professionalProfileData.TipoPessoaJuridico.filter((v: string) =>
                            Object.values(TipoPessoaJuridica).includes(v as TipoPessoaJuridica)
                        ) as TipoPessoaJuridica[];
                        if (validValues.length > 0) {
                            profUpdate.TipoPessoaJuridico = validValues;
                        }
                    }

                    if (Array.isArray(professionalProfileData.TipoAtendimento) && professionalProfileData.TipoAtendimento.length > 0) {
                        const validValues = professionalProfileData.TipoAtendimento.filter((v: string) =>
                            Object.values(TipoAtendimento).includes(v as TipoAtendimento)
                        ) as TipoAtendimento[];
                        if (validValues.length > 0) {
                            profUpdate.TipoAtendimento = validValues;
                        }
                    }

                    if (Array.isArray(professionalProfileData.Idiomas) && professionalProfileData.Idiomas.length > 0) {
                        const validValues = professionalProfileData.Idiomas.filter((v: string) =>
                            Object.values(Languages).includes(v as Languages)
                        ) as Languages[];
                        if (validValues.length > 0) {
                            profUpdate.Idiomas = validValues;
                        }
                        console.log("Idiomas - Input:", professionalProfileData.Idiomas, "Valid:", validValues);
                    }

                    if (Array.isArray(professionalProfileData.Abordagens) && professionalProfileData.Abordagens.length > 0) {
                        const validValues = professionalProfileData.Abordagens.filter((v: string) =>
                            Object.values(Abordagem).includes(v as Abordagem)
                        ) as Abordagem[];
                        if (validValues.length > 0) {
                            profUpdate.Abordagens = validValues;
                        }
                    }

                    if (Array.isArray(professionalProfileData.Queixas) && professionalProfileData.Queixas.length > 0) {
                        const validValues = professionalProfileData.Queixas.filter((v: string) =>
                            Object.values(Queixa).includes(v as Queixa)
                        ) as Queixa[];
                        if (validValues.length > 0) {
                            profUpdate.Queixas = validValues;
                        }
                    }

                    // Campos de texto - só atualiza se não for undefined ou null
                    if (professionalProfileData.ExperienciaClinica !== undefined && professionalProfileData.ExperienciaClinica !== null) {
                        profUpdate.ExperienciaClinica = professionalProfileData.ExperienciaClinica as ExperienciaClinica | null;
                    }
                    if (professionalProfileData.SobreMim !== undefined && professionalProfileData.SobreMim !== null && professionalProfileData.SobreMim !== "") {
                        profUpdate.SobreMim = professionalProfileData.SobreMim;
                    }
                    if (professionalProfileData.GrauInstrucao !== undefined && professionalProfileData.GrauInstrucao !== null) {
                        profUpdate.GrauInstrucao = professionalProfileData.GrauInstrucao as GrauInstrucao | null;
                    }

                    // Status removido - não existe no modelo ProfessionalProfile do Prisma

                    console.log("ProfessionalProfile update data:", JSON.stringify(profUpdate, null, 2));
                    console.log("ProfessionalProfile update data keys:", Object.keys(profUpdate).length);

                    // Só atualiza ProfessionalProfile se houver campos válidos para atualizar (além de DadosBancarios)
                    if (Object.keys(profUpdate).length > 0) {
                        // Converter para o formato esperado pelo Prisma
                        const prismaUpdateData: {
                            TipoPessoaJuridico?: TipoPessoaJuridica | null;
                            TipoAtendimento?: { set: TipoAtendimento[] };
                            Idiomas?: { set: Languages[] };
                            Abordagens?: { set: Abordagem[] };
                            Queixas?: { set: Queixa[] };
                            ExperienciaClinica?: ExperienciaClinica | null;
                            SobreMim?: string | null;
                            GrauInstrucao?: GrauInstrucao | null;
                        } = {};

                        if (profUpdate.TipoPessoaJuridico && profUpdate.TipoPessoaJuridico.length > 0) {
                            prismaUpdateData.TipoPessoaJuridico = profUpdate.TipoPessoaJuridico[0] as TipoPessoaJuridica;
                        }
                        if (profUpdate.TipoAtendimento) prismaUpdateData.TipoAtendimento = { set: profUpdate.TipoAtendimento };
                        if (profUpdate.Idiomas) prismaUpdateData.Idiomas = { set: profUpdate.Idiomas };
                        if (profUpdate.Abordagens) prismaUpdateData.Abordagens = { set: profUpdate.Abordagens };
                        if (profUpdate.Queixas) prismaUpdateData.Queixas = { set: profUpdate.Queixas };
                        if (profUpdate.ExperienciaClinica !== undefined) prismaUpdateData.ExperienciaClinica = profUpdate.ExperienciaClinica;
                        if (profUpdate.SobreMim !== undefined) prismaUpdateData.SobreMim = profUpdate.SobreMim;
                        if (profUpdate.GrauInstrucao !== undefined) prismaUpdateData.GrauInstrucao = profUpdate.GrauInstrucao;

                        if (Object.keys(prismaUpdateData).length > 0) {
                            console.log("Updating ProfessionalProfile with ID:", professionalProfileData.Id);
                            updatePromises.push(
                                tx.professionalProfile.update({ where: { Id: professionalProfileData.Id }, data: prismaUpdateData })
                                    .then(() => console.log("ProfessionalProfile updated successfully"))
                                    .catch((err: unknown) => console.error("Error updating ProfessionalProfile:", err))
                            );
                        }
                    }

                    // Documents (PsychologistDocument) parcial
                    let documentos: PsychologistDocumentUpdateData[] | undefined;
                    const profData = Array.isArray(data.ProfessionalProfiles) ? data.ProfessionalProfiles[0] : data.ProfessionalProfiles;
                    if (profData && 'Documents' in profData && Array.isArray(profData.Documents)) {
                        documentos = profData.Documents as PsychologistDocumentUpdateData[];
                    }

                    if (Array.isArray(documentos)) {
                        console.log("Processing Documents:", documentos.length);
                        for (const doc of documentos) {
                            if (doc?.Id) {
                                const docUpdate: Partial<PsychologistDocumentUpdateData> = {};
                                if (doc.Url !== undefined) docUpdate.Url = doc.Url;
                                if (doc.Type !== undefined) docUpdate.Type = doc.Type;
                                if (doc.Description !== undefined) docUpdate.Description = doc.Description;

                                if (Object.keys(docUpdate).length > 0) {
                                    console.log("Updating Document with ID:", doc.Id, "fields:", Object.keys(docUpdate));
                                    updatePromises.push(
                                        tx.psychologistDocument.update({ where: { Id: doc.Id }, data: docUpdate })
                                            .then(() => console.log("Document updated successfully:", doc.Id))
                                            .catch((err: unknown) => console.error("Error updating Document:", err))
                                    );
                                }
                            } else {
                                // Create: requer Url
                                if (doc?.Url && doc.Url !== "") {
                                    const createDoc: {
                                        ProfessionalProfileId: string;
                                        Url: string;
                                        Type?: string | null;
                                        Description?: string | null;
                                    } = {
                                        ProfessionalProfileId: professionalProfileData.Id,
                                        Url: doc.Url
                                    };
                                    if (doc.Type !== undefined) createDoc.Type = doc.Type;
                                    if (doc.Description !== undefined) createDoc.Description = doc.Description;

                                    console.log("Creating new Document:", createDoc);
                                    updatePromises.push(
                                        tx.psychologistDocument.create({ data: createDoc })
                                            .then(() => console.log("Document created successfully"))
                                            .catch((err: unknown) => console.error("Error creating Document:", err))
                                    );
                                }
                            }
                        }
                    }
                }

                // Atualiza ou cria formação do profissional
                let formacoes: import("../../types/user.psicologo.types").Formacao[] | undefined;
                if (Array.isArray(data.ProfessionalProfiles) && data.ProfessionalProfiles[0]?.Formacoes) {
                    formacoes = data.ProfessionalProfiles[0].Formacoes;
                    console.log("Formacoes encontradas em ProfessionalProfiles[0]:", formacoes.length);
                } else if (data.ProfessionalProfiles && (data.ProfessionalProfiles as any).Formacoes) {
                    formacoes = (data.ProfessionalProfiles as any).Formacoes;
                    console.log("Formacoes encontradas em ProfessionalProfiles (não array):", Array.isArray(formacoes) ? formacoes.length : "não é array");
                } else {
                    console.log("Nenhuma Formacao encontrada no data.ProfessionalProfiles");
                    console.log("data.ProfessionalProfiles:", JSON.stringify(data.ProfessionalProfiles, null, 2));
                }

                if (formacoes && Array.isArray(formacoes) && formacoes.length > 0 && professionalProfileData && professionalProfileData.Id) {
                    console.log("Processing Formacoes:", formacoes.length, "for ProfessionalProfileId:", professionalProfileData.Id);

                    for (const formacao of formacoes) {
                        console.log("Processing Formacao:", JSON.stringify(formacao, null, 2));

                        // Verifica se tem ID válido para atualizar (não null, não undefined, não string vazia)
                        if (formacao.Id && formacao.Id !== null && formacao.Id !== "" && formacao.Id !== "null") {
                            console.log("Updating existing Formacao with ID:", formacao.Id);
                            console.log("ProfessionalProfileId for update:", professionalProfileData.Id);
                            const updateData: {
                                TipoFormacao?: TipoFormacao;
                                Instituicao?: string;
                                Curso?: string;
                                Status?: string;
                                DataInicio?: string;
                                DataConclusao?: string | null;
                            } = {};

                            // Aceita TipoFormacao se estiver no enum, caso contrário tenta mapear ou usa "Outro"
                            if (formacao.TipoFormacao) {
                                const tipoFormacaoValue = String(formacao.TipoFormacao).trim();
                                if (Object.values(TipoFormacao).includes(tipoFormacaoValue as TipoFormacao)) {
                                    updateData.TipoFormacao = tipoFormacaoValue as TipoFormacao;
                                } else if (tipoFormacaoValue !== "") {
                                    // Se não estiver no enum mas tiver valor, usa "Outro" como fallback
                                    updateData.TipoFormacao = TipoFormacao.Outro;
                                }
                            }
                            if (formacao.Instituicao !== undefined) updateData.Instituicao = formacao.Instituicao;
                            if (formacao.Curso !== undefined) updateData.Curso = formacao.Curso;
                            if (formacao.Status !== undefined && formacao.Status !== "") {
                                updateData.Status = formacao.Status;
                            }

                            // Validação e tratamento de DataInicio
                            if (formacao.DataInicio !== undefined) {
                                const diTrimmed = String(formacao.DataInicio).trim();
                                if (diTrimmed !== "") {
                                    updateData.DataInicio = diTrimmed;
                                }
                            }

                            // Validação e tratamento de DataConclusao
                            if (formacao.DataConclusao !== undefined) {
                                const dcTrimmed = String(formacao.DataConclusao).trim();
                                if (dcTrimmed !== "") {
                                    updateData.DataConclusao = dcTrimmed;
                                } else {
                                    // Se vier vazio, define como null para limpar o campo
                                    updateData.DataConclusao = null;
                                }
                            }

                            console.log("Formacao update data:", JSON.stringify(updateData, null, 2));
                            console.log("Formacao update data keys:", Object.keys(updateData).length);

                            if (Object.keys(updateData).length > 0) {
                                console.log("Executing UPDATE for Formacao ID:", formacao.Id);
                                try {
                                    const result = await tx.formacao.update({
                                        where: { Id: formacao.Id },
                                        data: updateData
                                    });
                                    console.log("Formacao updated successfully:", formacao.Id);
                                    console.log("Updated Formacao result:", JSON.stringify(result, null, 2));
                                } catch (err: unknown) {
                                    const errorMessage = err instanceof Error ? err.message : String(err);
                                    console.error("Error updating Formacao:", errorMessage, err);
                                    console.error("Formacao update data that failed:", JSON.stringify(updateData, null, 2));
                                    // Re-throw o erro para que a transação seja revertida
                                    throw new Error(`Erro ao atualizar formação: ${errorMessage}`);
                                }
                            } else {
                                console.log("No fields to update for Formacao:", formacao.Id);
                                console.log("UpdateData keys:", Object.keys(updateData));
                                console.log("Formacao data:", JSON.stringify(formacao, null, 2));
                            }
                        } else {
                            // Criar nova formação
                            console.log("Attempting to create new Formacao");
                            console.log("ProfessionalProfileId available:", professionalProfileData.Id);

                            // Validação de campos obrigatórios
                            // TipoFormacao: aceita se estiver no enum, caso contrário considera válido se tiver algum valor (será mapeado para "Outro")
                            const tipoFormacaoValue = formacao.TipoFormacao ? String(formacao.TipoFormacao).trim() : "";
                            const hasTipo = tipoFormacaoValue !== ""; // Aceita qualquer valor, será mapeado para enum
                            const hasInst = !!formacao.Instituicao && String(formacao.Instituicao).trim() !== "";
                            const hasCurso = !!formacao.Curso && String(formacao.Curso).trim() !== "";
                            const hasDataInicio = !!formacao.DataInicio && String(formacao.DataInicio).trim() !== "";

                            // Validação da DataConclusao (opcional, mas se vier deve ser válida)
                            let dataConclusaoValue: string | undefined;
                            if (formacao.DataConclusao !== undefined && formacao.DataConclusao !== null) {
                                const dcTrimmed = String(formacao.DataConclusao).trim();
                                if (dcTrimmed !== "") {
                                    dataConclusaoValue = dcTrimmed;
                                }
                            }

                            console.log("Validation:", {
                                hasTipo,
                                hasInst,
                                hasCurso,
                                hasDataInicio,
                                ProfessionalProfileId: professionalProfileData.Id,
                                TipoFormacao: formacao.TipoFormacao,
                                Instituicao: formacao.Instituicao,
                                Curso: formacao.Curso,
                                DataInicio: formacao.DataInicio,
                                DataConclusao: formacao.DataConclusao
                            });

                            if (hasTipo && hasInst && hasCurso && hasDataInicio) {
                                // Mapeia TipoFormacao para o enum, usando "Outro" como fallback
                                let tipoFormacaoEnum: TipoFormacao;
                                if (Object.values(TipoFormacao).includes(tipoFormacaoValue as TipoFormacao)) {
                                    tipoFormacaoEnum = tipoFormacaoValue as TipoFormacao;
                                } else {
                                    tipoFormacaoEnum = TipoFormacao.Outro;
                                }

                                const createData: {
                                    ProfessionalProfileId: string;
                                    TipoFormacao: TipoFormacao;
                                    Instituicao: string;
                                    Curso: string;
                                    DataInicio: string;
                                    DataConclusao?: string | null;
                                    Status: string;
                                } = {
                                    ProfessionalProfileId: professionalProfileData.Id,
                                    TipoFormacao: tipoFormacaoEnum,
                                    Instituicao: String(formacao.Instituicao).trim(),
                                    Curso: String(formacao.Curso).trim(),
                                    DataInicio: String(formacao.DataInicio).trim(),
                                    Status: formacao.Status || "EmAndamento"
                                };

                                if (formacao.Status !== undefined && formacao.Status !== "") {
                                    createData.Status = formacao.Status;
                                }

                                if (dataConclusaoValue) {
                                    createData.DataConclusao = dataConclusaoValue;
                                }

                                console.log("Formacao create data:", JSON.stringify(createData, null, 2));
                                console.log("Executing CREATE for Formacao");

                                try {
                                    const result = await tx.formacao.create({ data: createData });
                                    console.log("Formacao created successfully with ID:", result.Id);
                                    console.log("Created Formacao result:", JSON.stringify(result, null, 2));
                                } catch (err: any) {
                                    const errorMessage = err instanceof Error ? err.message : String(err);
                                    console.error("Error creating Formacao:", errorMessage, err);
                                    console.error("Formacao data that failed:", JSON.stringify(createData, null, 2));
                                    // Re-throw o erro para que a transação seja revertida
                                    throw new Error(`Erro ao criar formação: ${errorMessage}`);
                                }
                            } else {
                                console.log("Skipping Formacao creation - validation failed:", {
                                    hasTipo,
                                    hasInst,
                                    hasCurso,
                                    hasDataInicio
                                });
                            }
                        }
                    }
                } else {
                    if (!formacoes) {
                        console.log("No Formacoes data provided");
                    } else if (Array.isArray(formacoes) && formacoes.length === 0) {
                        console.log("Formacoes array is empty");
                    } else {
                        console.log("Formacoes is not an array or has invalid structure:", formacoes);
                    }
                    if (!professionalProfileData) {
                        console.log("No ProfessionalProfile data");
                    } else if (!professionalProfileData.Id) {
                        console.log("ProfessionalProfile has no Id");
                    }
                }

                // Remove formações que não estão mais na lista (soft delete ou hard delete conforme necessário)
                // Por enquanto, vamos apenas processar as que vieram no request
                // Se necessário, podemos adicionar lógica para remover as que não estão mais na lista

                // DadosBancarios - Verifica se é autônomo ou PJ
                // Prioriza DadosBancarios do ProfessionalProfile (autônomo) se existir
                let dadosBancariosData: { Id?: string; ChavePix?: string; PsicologoAutonomoId?: string; PessoalJuridicaId?: string } | undefined =
                    (professionalProfileData as { DadosBancarios?: { Id?: string; ChavePix?: string; PsicologoAutonomoId?: string } } | undefined)?.DadosBancarios ||
                    (pessoalJuridicaData as { DadosBancarios?: { Id?: string; ChavePix?: string; PessoalJuridicaId?: string } } | undefined)?.DadosBancarios;
                let dadosBancariosId: string | undefined;

                // Verifica se é autônomo baseado no TipoPessoaJuridico do ProfessionalProfile
                // É autônomo se contém "Autonomo" mas não contém nenhum tipo de PJ
                const isAutonomo = professionalProfileData?.TipoPessoaJuridico &&
                    Array.isArray(professionalProfileData.TipoPessoaJuridico) &&
                    professionalProfileData.TipoPessoaJuridico.some((t: string) => t === "Autonomo") &&
                    !professionalProfileData.TipoPessoaJuridico.some((t: string) => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");

                const professionalProfileId = professionalProfileData?.Id;

                // Se for autônomo, busca DadosBancarios pelo ProfessionalProfile
                if (isAutonomo && professionalProfileId) {
                    console.log("Psicólogo é autônomo, buscando DadosBancarios pelo ProfessionalProfileId:", professionalProfileId);
                    const profWithBank = await tx.professionalProfile.findUnique({
                        where: { Id: professionalProfileId },
                        select: { DadosBancarios: { select: { Id: true, PsicologoAutonomoId: true } } }
                    });

                    if (profWithBank?.DadosBancarios?.Id) {
                        dadosBancariosId = profWithBank.DadosBancarios.Id;
                        dadosBancariosData = {
                            ...dadosBancariosData,
                            Id: dadosBancariosId,
                            PsicologoAutonomoId: profWithBank.DadosBancarios.PsicologoAutonomoId ?? professionalProfileId,
                        };
                    } else if (dadosBancariosData && dadosBancariosData.ChavePix && dadosBancariosData.ChavePix.trim() !== "") {
                        // Cria novo DadosBancarios para autônomo
                        console.log("Criando DadosBancarios para autônomo");
                        updatePromises.push(
                            tx.dadosBancarios.create({
                                data: {
                                    PsicologoAutonomoId: professionalProfileId,
                                    ChavePix: dadosBancariosData.ChavePix
                                }
                            }).then(() => console.log("DadosBancarios criado com sucesso para autônomo"))
                                .catch((err: any) => console.error("Erro ao criar DadosBancarios para autônomo:", err))
                        );
                    }
                }
                // Se for PJ, busca DadosBancarios pelo PessoalJuridica
                else if (!isAutonomo && pessoalJuridicaId) {
                    console.log("Psicólogo é PJ, buscando DadosBancarios pelo PessoalJuridicaId:", pessoalJuridicaId);
                    const pjWithBank = await tx.pessoalJuridica.findUnique({
                        where: { Id: pessoalJuridicaId },
                        select: { DadosBancarios: { select: { Id: true, PessoalJuridicaId: true } } }
                    });

                    if (pjWithBank?.DadosBancarios?.Id) {
                        dadosBancariosId = pjWithBank.DadosBancarios.Id;
                        dadosBancariosData = {
                            ...dadosBancariosData,
                            Id: dadosBancariosId,
                            PessoalJuridicaId: pjWithBank.DadosBancarios.PessoalJuridicaId ?? pessoalJuridicaId,
                        } as import("../../types/user.psicologo.types").DadosBancarios;
                    } else if (dadosBancariosData && dadosBancariosData.ChavePix && dadosBancariosData.ChavePix.trim() !== "") {
                        // Cria novo DadosBancarios para PJ
                        console.log("Criando DadosBancarios para PJ");
                        updatePromises.push(
                            tx.dadosBancarios.create({
                                data: {
                                    PessoalJuridicaId: pessoalJuridicaId,
                                    ChavePix: dadosBancariosData.ChavePix
                                }
                            }).then(() => console.log("DadosBancarios criado com sucesso para PJ"))
                                .catch((err: any) => console.error("Erro ao criar DadosBancarios para PJ:", err))
                        );
                    }
                } else if (dadosBancariosData?.Id) {
                    dadosBancariosId = dadosBancariosData.Id;
                }

                // Atualiza DadosBancarios se já existir
                if (dadosBancariosData && dadosBancariosId) {
                    console.log("Processando DadosBancarios data:", JSON.stringify(dadosBancariosData, null, 2));
                    const bankUpdate: { ChavePix?: string; PsicologoAutonomoId?: string; PessoalJuridicaId?: string } = {};

                    // Adiciona ChavePix se estiver presente e não vazio
                    const chavePixValue = dadosBancariosData.ChavePix;
                    if (chavePixValue !== undefined && chavePixValue !== null && String(chavePixValue).trim() !== "") {
                        bankUpdate.ChavePix = String(chavePixValue).trim();
                    }

                    // Atualiza o ID correto baseado no tipo (só se houver ChavePix para atualizar)
                    if (bankUpdate.ChavePix) {
                        if (isAutonomo && professionalProfileId) {
                            bankUpdate.PsicologoAutonomoId = professionalProfileId;
                        } else if (!isAutonomo && pessoalJuridicaId) {
                            bankUpdate.PessoalJuridicaId = pessoalJuridicaId;
                        }

                        console.log("DadosBancarios update data:", JSON.stringify(bankUpdate, null, 2));
                        console.log("DadosBancarios update data keys:", Object.keys(bankUpdate).length);

                        if (Object.keys(bankUpdate).length > 0) {
                            console.log("Atualizando DadosBancarios com ID:", dadosBancariosId);
                            updatePromises.push(
                                tx.dadosBancarios.update({ where: { Id: dadosBancariosId }, data: bankUpdate })
                                    .then(() => console.log("DadosBancarios atualizado com sucesso"))
                                    .catch((err: any) => {
                                        console.error("Erro ao atualizar DadosBancarios:", err);
                                        throw err; // Propaga o erro para ser capturado pela transação
                                    })
                            );
                        }
                    } else {
                        console.log("ChavePix não fornecida ou vazia, pulando atualização de DadosBancarios");
                    }
                }

                // Executa todas as atualizações em paralelo
                console.log("Executing", updatePromises.length, "update operations in parallel");
                await Promise.all(updatePromises);
                console.log("All updates completed successfully");

                // Busca o usuário atualizado para calcular o percentual e atualizar o Status
                const updatedUser = await tx.user.findUnique({
                    where: { Id: userId },
                    select: userPsicologoSelect
                });

                // Calcula o percentual de preenchimento e atualiza o Status se necessário
                if (updatedUser && updatedUser.ProfessionalProfiles && updatedUser.ProfessionalProfiles.length > 0) {
                    const profile = updatedUser.ProfessionalProfiles[0];
                    const address = Array.isArray(updatedUser.Address) ? updatedUser.Address[0] : updatedUser.Address;

                    // Verifica se é Autônomo
                    const tipoPessoaJuridico = profile.TipoPessoaJuridico;
                    const tiposArray = Array.isArray(tipoPessoaJuridico)
                        ? tipoPessoaJuridico
                        : tipoPessoaJuridico
                            ? [tipoPessoaJuridico]
                            : [];
                    const isAutonomo = tiposArray.some((t: string) => t === "Autonomo") &&
                        !tiposArray.some((t: string) => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");
                    const isPJ = !isAutonomo && tiposArray.some((t: string) => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");

                    let camposPreenchidos = 0;
                    // Contagem correta de campos editáveis (PIX não conta para percentual):
                    // Autônomo: 4 (dados pessoais) + 6 (endereço sem complemento) + 1 (sobre mim) + 5 (atendimento) + 1 (formação) = 17 campos
                    // PJ: 4 (dados pessoais) + 1 (inscrição municipal) + 7 (endereço com complemento) + 1 (sobre mim) + 5 (atendimento) + 1 (formação) = 19 campos
                    const totalCamposEditaveis = isAutonomo ? 17 : 19;
                    const percentualBase = 48;

                    // Dados pessoais (4 campos - Telefone, Sexo, Pronome, Raça/Cor)
                    if (updatedUser.Telefone && updatedUser.Telefone.trim() !== "") camposPreenchidos++;
                    if (updatedUser.Sexo && updatedUser.Sexo.trim() !== "") camposPreenchidos++;
                    if (updatedUser.Pronome && updatedUser.Pronome.trim() !== "") camposPreenchidos++;
                    if (updatedUser.RacaCor && updatedUser.RacaCor.trim() !== "") camposPreenchidos++;

                    // Dados empresa (1 campo - só conta para PJ)
                    if (isPJ && updatedUser.PessoalJuridica?.InscricaoEstadual && updatedUser.PessoalJuridica.InscricaoEstadual.trim() !== "") camposPreenchidos++;

                    // Endereço (6 campos para Autônomo, 7 para PJ - com complemento)
                    if (address?.Cep && address.Cep.trim() !== "") camposPreenchidos++;
                    if (address?.Rua && address.Rua.trim() !== "") camposPreenchidos++;
                    if (address?.Numero && address.Numero.trim() !== "") camposPreenchidos++;
                    if (!isAutonomo && address?.Complemento && address.Complemento.trim() !== "") camposPreenchidos++;
                    if (address?.Bairro && address.Bairro.trim() !== "") camposPreenchidos++;
                    if (address?.Cidade && address.Cidade.trim() !== "") camposPreenchidos++;
                    if (address?.Estado && address.Estado.trim() !== "") camposPreenchidos++;

                    // Sobre mim (1 campo)
                    if (profile.SobreMim && profile.SobreMim.trim() !== "") camposPreenchidos++;

                    // Atendimento e Experiência (5 campos)
                    // Verifica se ExperienciaClinica existe e não é vazio (mesma lógica do frontend)
                    if (profile.ExperienciaClinica && profile.ExperienciaClinica.trim() !== "") camposPreenchidos++;
                    if (profile.Idiomas && profile.Idiomas.length > 0) camposPreenchidos++;
                    if (profile.TipoAtendimento && profile.TipoAtendimento.length > 0) camposPreenchidos++;
                    if (profile.Abordagens && profile.Abordagens.length > 0) camposPreenchidos++;
                    if (profile.Queixas && profile.Queixas.length > 0) camposPreenchidos++;

                    // Formação acadêmica (1 campo)
                    if (profile.Formacoes && profile.Formacoes.length > 0) {
                        const formacaoCompleta = profile.Formacoes.some((f: Formacao) =>
                            f.TipoFormacao && f.TipoFormacao.trim() !== "" &&
                            f.Curso && f.Curso.trim() !== "" &&
                            f.Instituicao && f.Instituicao.trim() !== ""
                        );
                        if (formacaoCompleta) camposPreenchidos++;
                    }

                    // Dados bancários (PIX) - NÃO conta para percentual de preenchimento

                    // Calcula o percentual
                    // Se todos os campos estão preenchidos, garante 100%
                    const percentualAdicional = totalCamposEditaveis > 0
                        ? Math.round((camposPreenchidos / totalCamposEditaveis) * 52)
                        : 0;
                    const percentualTotal = Math.min(100, percentualBase + percentualAdicional);

                    // Se atingiu 100%, atualiza o Status para "Preenchido"
                    if (percentualTotal === 100 && profile.Status !== ProfessionalProfileStatus.Preenchido) {
                        console.log("Perfil atingiu 100% de preenchimento, atualizando Status para Preenchido");
                        await tx.professionalProfile.update({
                            where: { Id: profile.Id },
                            data: { Status: ProfessionalProfileStatus.Preenchido }
                        });
                    } else if (percentualTotal < 100 && profile.Status !== ProfessionalProfileStatus.Incompleto) {
                        // Se não atingiu 100%, atualiza para "Incompleto" se necessário
                        await tx.professionalProfile.update({
                            where: { Id: profile.Id },
                            data: { Status: ProfessionalProfileStatus.Incompleto }
                        });
                    }
                }

                // Retorna o usuário atualizado com todos os relacionamentos
                const user = await tx.user.findUnique({
                    where: { Id: userId },
                    select: userPsicologoSelect
                });

                if (!user) return null;

                // Converte Address array para objeto único se necessário para compatibilidade com UserPsicologo
                const userData = {
                    ...user,
                    Address: Array.isArray(user.Address) && user.Address.length > 0 ? user.Address[0] : null
                };

                return userData as unknown as UserPsicologo;
            }, {
                timeout: 30000 // 30 segundos de timeout
            });
        } catch (error: any) {
            console.error("[updateUserPsicologo] ========== ERRO NA TRANSAÇÃO ==========");
            console.error("[updateUserPsicologo] userId:", userId);
            console.error("[updateUserPsicologo] Tipo do erro:", error?.constructor?.name);
            console.error("[updateUserPsicologo] Mensagem do erro:", error?.message);
            console.error("[updateUserPsicologo] Stack do erro:", error?.stack);
            console.error("[updateUserPsicologo] Código do erro:", error?.code);
            console.error("[updateUserPsicologo] Meta do erro:", error?.meta);
            console.error("[updateUserPsicologo] Erro completo:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

            // Propaga o erro com mensagem mais descritiva
            if (error?.code === 'P2002') {
                throw new Error(`Erro de validação: Já existe um registro com esses dados únicos. ${error?.meta?.target || ''}`);
            } else if (error?.code === 'P2025') {
                throw new Error(`Registro não encontrado: ${error?.meta?.cause || 'O registro que você está tentando atualizar não existe.'}`);
            } else if (error?.code === 'P2003') {
                throw new Error(`Erro de relacionamento: ${error?.meta?.field_name || 'Relacionamento inválido.'}`);
            } else if (error?.message) {
                throw new Error(error.message);
            } else {
                throw new Error(`Erro ao atualizar perfil: ${error?.toString() || 'Erro desconhecido'}`);
            }
        } finally {
            console.log("[updateUserPsicologo] ========== FIM DA ATUALIZAÇÃO ==========");
        }
    }

    async uploadImage(userId: string, file: any): Promise<any> {
        if (!file) throw new Error("Nenhum arquivo enviado");
        const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml"];
        if (!allowedTypes.includes(file.mimetype)) throw new Error("Tipo de imagem inválido");
        const bucketName = STORAGE_BUCKET_PUBLIC; // bucket público para imagens
        const filePath = `users/${userId}/${Date.now()}_${file.originalname}`;

        // Faz upload do arquivo para o storage do Supabase
        // Usar supabaseAdmin se disponível para evitar erros de assinatura
        const storageClient = (supabaseAdmin || supabase).storage;
        const uploadResult = await storageClient.from(bucketName).upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
        });

        console.log("Upload result:", uploadResult);
        if (uploadResult.error) {
            // Tratamento específico para erro de verificação de assinatura
            if (uploadResult.error.message?.toLowerCase().includes('signature verification failed') ||
                uploadResult.error.message?.toLowerCase().includes('signature') ||
                (uploadResult.error as any).statusCode === '403' || (uploadResult.error as any).status === 403) {
                throw new Error("Erro de verificação de assinatura. Verifique se SUPABASE_SERVICE_ROLE_KEY está configurada.");
            }
            throw new Error("Erro ao enviar imagem: " + uploadResult.error.message);
        }
        // Obtém a URL pública da imagem
        const { data } = storageClient.from(bucketName).getPublicUrl(filePath);
        if (!data || !data.publicUrl) throw new Error("Falha ao obter a URL pública da imagem");
        const imageUrl = data.publicUrl;
        // Salva no banco a url e o userId
        const image = await prisma.image.create({ data: { Url: imageUrl, UserId: userId } });

        // Retorna o usuário completo atualizado
        return this.fetchUsersPsicologo(userId);
    }

    async updateImage(userId: string, id: string, file: any): Promise<any> {
        if (!id) throw new Error("ID da imagem não fornecido");
        if (!file) throw new Error("Nenhum arquivo enviado");
        const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml"];
        if (!allowedTypes.includes(file.mimetype)) throw new Error("Tipo de imagem inválido");
        const bucketName = STORAGE_BUCKET_PUBLIC; // bucket público para imagens
        const filePath = `users/${userId}/${Date.now()}_${file.originalname}`;
        // Usar supabaseAdmin se disponível para evitar erros de assinatura
        const storageClient = (supabaseAdmin || supabase).storage;
        const uploadResult = await storageClient.from(bucketName).upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
        });
        if (uploadResult.error) {
            // Tratamento específico para erro de verificação de assinatura
            if (uploadResult.error.message?.toLowerCase().includes('signature verification failed') ||
                uploadResult.error.message?.toLowerCase().includes('signature') ||
                (uploadResult.error as any).statusCode === '403' || (uploadResult.error as any).status === 403) {
                throw new Error("Erro de verificação de assinatura. Verifique se SUPABASE_SERVICE_ROLE_KEY está configurada.");
            }
            throw new Error("Erro ao enviar imagem: " + uploadResult.error.message);
        }
        const { data } = storageClient.from(bucketName).getPublicUrl(filePath);
        if (!data) throw new Error("Falha ao obter a URL pública da imagem");
        const imageUrl = data.publicUrl;
        await prisma.image.update({
            where: { Id: id },
            data: { Url: imageUrl },
        });

        // Retorna o usuário completo atualizado
        return this.fetchUsersPsicologo(userId);
    }

    /**
     * Remove uma formação acadêmica pelo Id.
     * @param formacaoId Id da formação a ser removida
     * @returns boolean indicando sucesso
     */
    async removeFormacao(formacaoId: string): Promise<boolean> {
        try {
            await prisma.formacao.delete({
                where: { Id: formacaoId }
            });
            return true;
        } catch (error) {
            // Se não encontrar ou erro, retorna false
            return false;
        }
    }

    // Métodos específicos para atualizações parciais
    async updateDadosBancarios(userId: string, chavePix: string): Promise<UserPsicologo | null> {
        return await prisma.$transaction(async (tx) => {
            // Busca o usuário e seus relacionamentos
            const user = await tx.user.findUnique({
                where: { Id: userId },
                select: {
                    Id: true,
                    ProfessionalProfiles: {
                        select: {
                            Id: true,
                            TipoPessoaJuridico: true,
                            DadosBancarios: { select: { Id: true } }
                        }
                    },
                    PessoalJuridica: {
                        select: {
                            Id: true,
                            DadosBancarios: { select: { Id: true } }
                        }
                    }
                }
            });

            if (!user) throw new Error("Usuário não encontrado");

            const profile = user.ProfessionalProfiles?.[0];
            if (!profile) throw new Error("Perfil profissional não encontrado");

            // Verifica se é autônomo baseado no TipoPessoaJuridico
            const tipoPessoa = profile.TipoPessoaJuridico;
            const isAutonomo = tipoPessoa &&
                Array.isArray(tipoPessoa) &&
                tipoPessoa.some((t: string) => t === "Autonomo") &&
                !tipoPessoa.some((t: string) => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");

            // Se tem PessoalJuridica, usa DadosBancarios dela (pessoa jurídica)
            // Se não tem PessoalJuridica, usa DadosBancarios do ProfessionalProfile (autônomo)
            const pessoalJuridica = user.PessoalJuridica;
            const hasPessoalJuridica = !!pessoalJuridica;

            if (hasPessoalJuridica) {
                // Atualiza DadosBancarios da pessoa jurídica
                if (pessoalJuridica.DadosBancarios?.Id) {
                    await tx.dadosBancarios.update({
                        where: { Id: pessoalJuridica.DadosBancarios.Id },
                        data: { ChavePix: chavePix }
                    });
                } else {
                    await tx.dadosBancarios.create({
                        data: {
                            PessoalJuridicaId: pessoalJuridica.Id,
                            ChavePix: chavePix
                        }
                    });
                }
            } else {
                // Atualiza DadosBancarios do autônomo (via ProfessionalProfile)
                if (profile.DadosBancarios?.Id) {
                    await tx.dadosBancarios.update({
                        where: { Id: profile.DadosBancarios.Id },
                        data: { ChavePix: chavePix }
                    });
                } else {
                    await tx.dadosBancarios.create({
                        data: {
                            PsicologoAutonomoId: profile.Id,
                            ChavePix: chavePix
                        }
                    });
                }
            }

            const result = await this.fetchUsersPsicologo(userId);
            return result && result.length > 0 ? result[0] : null;
        });
    }

    async updateDadosPessoais(userId: string, data: {
        Nome?: string;
        Email?: string;
        Telefone?: string;
        WhatsApp?: string;
        Sexo?: string;
        Pronome?: string;
        RacaCor?: string;
        Rg?: string;
    }): Promise<UserPsicologo | null> {
        return await prisma.$transaction(async (tx) => {
            const updateData: any = {};
            if (data.Nome !== undefined) updateData.Nome = data.Nome;
            if (data.Email !== undefined) updateData.Email = data.Email;
            if (data.Telefone !== undefined) updateData.Telefone = data.Telefone;
            if (data.WhatsApp !== undefined) updateData.WhatsApp = data.WhatsApp;
            if (data.Sexo !== undefined) updateData.Sexo = data.Sexo as Sexo | null;
            if (data.Pronome !== undefined) updateData.Pronome = data.Pronome as Pronome | null;
            if (data.RacaCor !== undefined) updateData.RacaCor = data.RacaCor as RacaCor | null;
            if (data.Rg !== undefined) updateData.Rg = data.Rg;

            if (Object.keys(updateData).length === 0) {
                const result = await this.fetchUsersPsicologo(userId);
                return result && result.length > 0 ? result[0] : null;
            }

            await tx.user.update({
                where: { Id: userId },
                data: updateData
            });

            const result = await this.fetchUsersPsicologo(userId);
            return result && result.length > 0 ? result[0] : null;
        });
    }

    async updateSobreMim(userId: string, sobreMim: string): Promise<UserPsicologo | null> {
        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { Id: userId },
                select: {
                    Id: true,
                    ProfessionalProfiles: { select: { Id: true } }
                }
            });

            if (!user) throw new Error("Usuário não encontrado");

            const profile = user.ProfessionalProfiles?.[0];
            if (!profile) throw new Error("Perfil profissional não encontrado");

            await tx.professionalProfile.update({
                where: { Id: profile.Id },
                data: { SobreMim: sobreMim }
            });

            const result = await this.fetchUsersPsicologo(userId);
            return result && result.length > 0 ? result[0] : null;
        });
    }

    async updateEspecialidades(userId: string, data: {
        ExperienciaClinica?: string | null;
        TipoAtendimento?: string[];
        Abordagens?: string[];
        Queixas?: string[];
        Idiomas?: string[];
    }): Promise<UserPsicologo | null> {
        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { Id: userId },
                select: {
                    Id: true,
                    ProfessionalProfiles: { select: { Id: true } }
                }
            });

            if (!user) throw new Error("Usuário não encontrado");

            const profile = user.ProfessionalProfiles?.[0];
            if (!profile) throw new Error("Perfil profissional não encontrado");

            const updateData: any = {};

            // Atualiza ExperienciaClinica se fornecido
            if (data.ExperienciaClinica !== undefined) {
                if (data.ExperienciaClinica === null || data.ExperienciaClinica === '') {
                    updateData.ExperienciaClinica = null;
                } else {
                    // Valida se o valor está no enum ExperienciaClinica
                    const validValues = Object.values(ExperienciaClinica);
                    if (validValues.includes(data.ExperienciaClinica as ExperienciaClinica)) {
                        updateData.ExperienciaClinica = data.ExperienciaClinica;
                    }
                }
            }

            if (data.TipoAtendimento && Array.isArray(data.TipoAtendimento) && data.TipoAtendimento.length > 0) {
                const validValues = data.TipoAtendimento.filter((v: string) =>
                    Object.values(TipoAtendimento).includes(v as TipoAtendimento)
                ) as TipoAtendimento[];
                if (validValues.length > 0) {
                    updateData.TipoAtendimento = { set: validValues };
                }
            }

            if (data.Abordagens && Array.isArray(data.Abordagens) && data.Abordagens.length > 0) {
                const validValues = data.Abordagens.filter((v: string) =>
                    Object.values(Abordagem).includes(v as Abordagem)
                ) as Abordagem[];
                if (validValues.length > 0) {
                    updateData.Abordagens = { set: validValues };
                }
            }

            if (data.Queixas && Array.isArray(data.Queixas) && data.Queixas.length > 0) {
                const validValues = data.Queixas.filter((v: string) =>
                    Object.values(Queixa).includes(v as Queixa)
                ) as Queixa[];
                if (validValues.length > 0) {
                    updateData.Queixas = { set: validValues };
                }
            }

            if (data.Idiomas && Array.isArray(data.Idiomas) && data.Idiomas.length > 0) {
                const validValues = data.Idiomas.filter((v: string) =>
                    Object.values(Languages).includes(v as Languages)
                ) as Languages[];
                if (validValues.length > 0) {
                    updateData.Idiomas = { set: validValues };
                }
            }

            if (Object.keys(updateData).length > 0) {
                await tx.professionalProfile.update({
                    where: { Id: profile.Id },
                    data: updateData
                });
            }

            const result = await this.fetchUsersPsicologo(userId);
            return result && result.length > 0 ? result[0] : null;
        });
    }

    async updateEndereco(userId: string, addressData: {
        Rua?: string;
        Numero?: string;
        Bairro?: string;
        Cidade?: string;
        Estado?: string;
        Cep?: string;
        Complemento?: string;
    }, isBillingAddress: boolean = false): Promise<UserPsicologo | null> {
        return await prisma.$transaction(async (tx) => {
            if (isBillingAddress) {
                // Atualiza BillingAddress
                const user = await tx.user.findUnique({
                    where: { Id: userId },
                    select: {
                        Id: true,
                        PessoalJuridica: { select: { Id: true } }
                    }
                });

                if (!user?.PessoalJuridica) {
                    throw new Error("Pessoa jurídica não encontrada");
                }

                const billingAddress = await tx.billingAddress.findFirst({
                    where: { UserId: userId }
                });

                const updateData: any = {};
                if (addressData.Rua !== undefined) updateData.Rua = addressData.Rua;
                if (addressData.Numero !== undefined) updateData.Numero = addressData.Numero;
                if (addressData.Bairro !== undefined) updateData.Bairro = addressData.Bairro;
                if (addressData.Cidade !== undefined) updateData.Cidade = addressData.Cidade;
                if (addressData.Estado !== undefined) updateData.Estado = addressData.Estado;
                if (addressData.Cep !== undefined) updateData.Cep = addressData.Cep;
                if (addressData.Complemento !== undefined) updateData.Complemento = addressData.Complemento;

                if (billingAddress) {
                    await tx.billingAddress.update({
                        where: { Id: billingAddress.Id },
                        data: updateData
                    });
                } else {
                    await tx.billingAddress.create({
                        data: {
                            UserId: userId,
                            ...updateData
                        }
                    });
                }
            } else {
                // Atualiza Address
                const address = await tx.address.findFirst({
                    where: { UserId: userId }
                });

                const updateData: any = {};
                if (addressData.Rua !== undefined) updateData.Rua = addressData.Rua;
                if (addressData.Numero !== undefined) updateData.Numero = addressData.Numero;
                if (addressData.Bairro !== undefined) updateData.Bairro = addressData.Bairro;
                if (addressData.Cidade !== undefined) updateData.Cidade = addressData.Cidade;
                if (addressData.Estado !== undefined) updateData.Estado = addressData.Estado;
                if (addressData.Cep !== undefined) updateData.Cep = addressData.Cep;
                if (addressData.Complemento !== undefined) updateData.Complemento = addressData.Complemento;

                if (address) {
                    await tx.address.update({
                        where: { Id: address.Id },
                        data: updateData
                    });
                } else {
                    await tx.address.create({
                        data: {
                            UserId: userId,
                            ...updateData
                        }
                    });
                }
            }

            const result = await this.fetchUsersPsicologo(userId);
            // Retorna o primeiro elemento do array ou null
            return result && result.length > 0 ? result[0] : null;
        });
    }

    async updatePessoalJuridica(userId: string, data: {
        CNPJ?: string;
        RazaoSocial?: string;
        NomeFantasia?: string;
        InscricaoEstadual?: string;
        SimplesNacional?: boolean;
        DescricaoExtenso?: string;
    }): Promise<UserPsicologo | null> {
        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { Id: userId },
                select: {
                    Id: true,
                    PessoalJuridica: { select: { Id: true } }
                }
            });

            if (!user) throw new Error("Usuário não encontrado");

            const updateData: any = {};
            if (data.CNPJ !== undefined) updateData.CNPJ = data.CNPJ;
            if (data.RazaoSocial !== undefined) updateData.RazaoSocial = data.RazaoSocial;
            if (data.NomeFantasia !== undefined) updateData.NomeFantasia = data.NomeFantasia;
            if (data.InscricaoEstadual !== undefined) updateData.InscricaoEstadual = data.InscricaoEstadual;
            if (data.SimplesNacional !== undefined) updateData.SimplesNacional = data.SimplesNacional;
            if (data.DescricaoExtenso !== undefined) updateData.DescricaoExtenso = data.DescricaoExtenso;

            if (Object.keys(updateData).length === 0) {
                const result = await this.fetchUsersPsicologo(userId);
                return result && result.length > 0 ? result[0] : null;
            }

            if (user.PessoalJuridica) {
                await tx.pessoalJuridica.update({
                    where: { Id: user.PessoalJuridica.Id },
                    data: updateData
                });
            } else {
                await tx.pessoalJuridica.create({
                    data: {
                        PsicologoId: userId,
                        CNPJ: data.CNPJ || "",
                        RazaoSocial: data.RazaoSocial || "",
                        NomeFantasia: data.NomeFantasia || "",
                        InscricaoEstadual: data.InscricaoEstadual || "",
                        SimplesNacional: data.SimplesNacional ?? false,
                        DescricaoExtenso: data.DescricaoExtenso || null
                    }
                });
            }

            const result = await this.fetchUsersPsicologo(userId);
            return result && result.length > 0 ? result[0] : null;
        });
    }

    async updateFormacoes(userId: string, formacoes: Array<{
        Id?: string;
        TipoFormacao?: string;
        Instituicao?: string;
        Curso?: string;
        DataInicio?: string;
        DataConclusao?: string;
        Status?: string;
    }>): Promise<UserPsicologo | null> {
        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { Id: userId },
                select: {
                    Id: true,
                    ProfessionalProfiles: { select: { Id: true } }
                }
            });

            if (!user) throw new Error("Usuário não encontrado");

            const profile = user.ProfessionalProfiles?.[0];
            if (!profile) throw new Error("Perfil profissional não encontrado");

            for (const formacao of formacoes) {
                if (formacao.Id && formacao.Id !== "" && formacao.Id !== "null") {
                    // Atualiza formação existente
                    const updateData: any = {
                        ProfessionalProfileId: profile.Id
                    };
                    if (formacao.TipoFormacao) {
                        const tipoValue = String(formacao.TipoFormacao).trim();
                        if (Object.values(TipoFormacao).includes(tipoValue as TipoFormacao)) {
                            updateData.TipoFormacao = tipoValue as TipoFormacao;
                        } else if (tipoValue !== "") {
                            updateData.TipoFormacao = TipoFormacao.Outro;
                        }
                    }
                    if (formacao.Instituicao !== undefined) updateData.Instituicao = formacao.Instituicao;
                    if (formacao.Curso !== undefined) updateData.Curso = formacao.Curso;
                    if (formacao.Status !== undefined && formacao.Status !== "") updateData.Status = formacao.Status;
                    if (formacao.DataInicio !== undefined && formacao.DataInicio.trim() !== "") updateData.DataInicio = formacao.DataInicio.trim();
                    if (formacao.DataConclusao !== undefined) {
                        updateData.DataConclusao = formacao.DataConclusao.trim() !== "" ? formacao.DataConclusao.trim() : null;
                    }

                    if (Object.keys(updateData).length > 1) {
                        await tx.formacao.update({
                            where: { Id: formacao.Id },
                            data: updateData
                        });
                    }
                } else {
                    // Cria nova formação
                    const tipoValue = formacao.TipoFormacao ? String(formacao.TipoFormacao).trim() : "";
                    const tipoFormacaoEnum = tipoValue && Object.values(TipoFormacao).includes(tipoValue as TipoFormacao)
                        ? tipoValue as TipoFormacao
                        : TipoFormacao.Outro;

                    if (formacao.Instituicao && formacao.Curso && formacao.DataInicio) {
                        await tx.formacao.create({
                            data: {
                                ProfessionalProfileId: profile.Id,
                                TipoFormacao: tipoFormacaoEnum,
                                Instituicao: formacao.Instituicao.trim(),
                                Curso: formacao.Curso.trim(),
                                DataInicio: formacao.DataInicio.trim(),
                                DataConclusao: formacao.DataConclusao?.trim() || null,
                                Status: formacao.Status || "EmAndamento"
                            }
                        });
                    }
                }
            }

            const result = await this.fetchUsersPsicologo(userId);
            return result && result.length > 0 ? result[0] : null;
        });
    }
}
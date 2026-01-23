import prisma from "../../prisma/client";
import { Module, ActionType } from "../../types/permissions.types";
import { User } from "../../types/user.types";

export class PacienteService {
    private authorizationService: any;

    constructor(authorizationService?: any) {
        this.authorizationService = authorizationService;
    }

    async list(user: User) {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Patients,
                ActionType.Read
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de pacientes.");
            }
        }

        const pacientes = await prisma.user.findMany({
            where: { Role: "Patient" },
            include: {
                Address: true,
                BillingAddress: true,
                Images: true,
                ReviewsMade: true,
                FavoritesGiven: true,
                PlanoAssinaturas: true,
                FinanceiroEntries: true,
                Onboardings: true,
                CreditosAvulsos: true,
                NotificationStatus: true,
                ConsultaPacientes: {
                    include: {
                        ReservaSessao: true
                    }
                },
                CancelamentosPac: true,
                WorkSchedules: true,
                RefreshTokens: true,
            }
        });

        return pacientes.map(({ Password, ...rest }: any) => rest);
    }

    async delete(user: User, id: string) {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Patients,
                ActionType.Delete
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de pacientes.");
            }
        }

        return prisma.user.delete({
            where: { Id: id, Role: "Patient" },
            include: {
                Address: true,
                BillingAddress: true,
                Images: true,
                ReviewsMade: true,
                FavoritesGiven: true,
                PlanoAssinaturas: true,
                FinanceiroEntries: true,
                Onboardings: true,
                CreditosAvulsos: true,
                NotificationStatus: true,
                ConsultaPacientes: {
                    include: {
                        ReservaSessao: true
                    }
                },
                CancelamentosPac: true,
                WorkSchedules: true,
                RefreshTokens: true,
            }
        });
    }

    async update(user: User, id: string, data: any) {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Patients,
                ActionType.Update
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de pacientes.");
            }
        }

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
            'CancelamentosPac',
            'WorkSchedules',
            'RefreshTokens',
            'NotificationStatus',
            'ConsultaPacientes',
            'ConsultaAvulsaPaciente',
            'AssinaturaPlanos',
            'CiclosPlano',
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
            'ConsultaParticipacao',
            'CreatedPasswordResets',
            'PasswordResets',
            'ReviewsMade',
            'PessoalJuridica',
            'ConsultaPsicologos',
            'CancelamentosPsi'
        ];

        // Filtra os dados removendo apenas campos de relação
        // Permite editar TODOS os campos do modelo User (exceto Password que é tratado separadamente)
        const updateData: Record<string, unknown> = {};
        for (const key in data) {
            // Permite todos os campos do User, exceto relações e Password
            if (!relationFields.includes(key) && key !== 'Password') {
                updateData[key] = data[key];
            }
        }

        // Pré-processamento para campos DateTime - trata todos os campos de data
        const dateFields = [
            'DataAprovacao',
            'dataAprovacao', // Suporta ambos os formatos
            'DataNascimento',
            'dataNascimento',
            'LastLogin',
            'lastLogin',
            'CreatedAt',
            'createdAt',
            'UpdatedAt',
            'updatedAt',
            'deletedAt',
            'ResetPasswordTokenExpiresAt',
            'resetPasswordTokenExpiresAt'
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
            'termsAccepted',
            'PrivacyAccepted',
            'privacyAccepted',
            'IsOnboard',
            'isOnboard',
            'AssinaturaContrato',
            'assinaturaContrato',
            'isTwoFAEnabled',
            'MustChangePassword',
            'mustChangePassword'
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

        // Atualiza endereços se fornecidos
        if (data.Address && typeof data.Address === 'object') {
            const addressData = data.Address as Record<string, unknown>;
            const existingAddress = await prisma.address.findFirst({
                where: { UserId: id }
            });
            
            if (existingAddress) {
                await prisma.address.update({
                    where: { Id: existingAddress.Id },
                    data: {
                        Rua: addressData.Rua as string,
                        Numero: addressData.Numero as string | null,
                        Complemento: addressData.Complemento as string | null,
                        Bairro: addressData.Bairro as string,
                        Cidade: addressData.Cidade as string,
                        Estado: addressData.Estado as string,
                        Cep: addressData.Cep as string,
                    }
                });
            } else {
                await prisma.address.create({
                    data: {
                        UserId: id,
                        Rua: addressData.Rua as string,
                        Numero: addressData.Numero as string | null,
                        Complemento: addressData.Complemento as string | null,
                        Bairro: addressData.Bairro as string,
                        Cidade: addressData.Cidade as string,
                        Estado: addressData.Estado as string,
                        Cep: addressData.Cep as string,
                    }
                });
            }
        }
        
        // Atualiza endereço de cobrança se fornecido
        if (data.BillingAddress && typeof data.BillingAddress === 'object') {
            const billingData = data.BillingAddress as Record<string, unknown>;
            const billingPayload = {
                Rua: typeof billingData.Rua === 'string' ? billingData.Rua : undefined,
                Numero:
                    typeof billingData.Numero === 'string'
                        ? billingData.Numero
                        : billingData.Numero === null
                            ? null
                            : undefined,
                Complemento:
                    typeof billingData.Complemento === 'string'
                        ? billingData.Complemento
                        : billingData.Complemento === null
                            ? null
                            : undefined,
                Bairro: typeof billingData.Bairro === 'string' ? billingData.Bairro : undefined,
                Cidade: typeof billingData.Cidade === 'string' ? billingData.Cidade : undefined,
                Estado: typeof billingData.Estado === 'string' ? billingData.Estado : undefined,
                Cep: typeof billingData.Cep === 'string' ? billingData.Cep : undefined,
            };
            const hasBillingFields = Object.values(billingPayload).some((value) => value !== undefined);
            const existingBilling = await prisma.billingAddress.findFirst({
                where: { UserId: id }
            });

            if (hasBillingFields && existingBilling) {
                const billingUpdate: Record<string, string | null> = {};
                if (billingPayload.Rua !== undefined) billingUpdate.Rua = billingPayload.Rua;
                if (billingPayload.Numero !== undefined) billingUpdate.Numero = billingPayload.Numero;
                if (billingPayload.Complemento !== undefined) billingUpdate.Complemento = billingPayload.Complemento;
                if (billingPayload.Bairro !== undefined) billingUpdate.Bairro = billingPayload.Bairro;
                if (billingPayload.Cidade !== undefined) billingUpdate.Cidade = billingPayload.Cidade;
                if (billingPayload.Estado !== undefined) billingUpdate.Estado = billingPayload.Estado;
                if (billingPayload.Cep !== undefined) billingUpdate.Cep = billingPayload.Cep;

                if (Object.keys(billingUpdate).length > 0) {
                    await prisma.billingAddress.update({
                        where: { Id: existingBilling.Id },
                        data: billingUpdate,
                    });
                }
            } else if (hasBillingFields && !existingBilling) {
                if (
                    billingPayload.Rua &&
                    billingPayload.Bairro &&
                    billingPayload.Cidade &&
                    billingPayload.Estado &&
                    billingPayload.Cep
                ) {
                    await prisma.billingAddress.create({
                        data: {
                            UserId: id,
                            Rua: billingPayload.Rua,
                            Numero: billingPayload.Numero ?? undefined,
                            Complemento: billingPayload.Complemento ?? undefined,
                            Bairro: billingPayload.Bairro,
                            Cidade: billingPayload.Cidade,
                            Estado: billingPayload.Estado,
                            Cep: billingPayload.Cep,
                        }
                    });
                }
            }
        }

        return prisma.user.update({
            where: { Id: id, Role: "Patient" },
            data: updateData,
            include: {
                Address: true,
                BillingAddress: true,
                Images: true,
                ReviewsMade: true,
                FavoritesGiven: true,
                PlanoAssinaturas: true,
                FinanceiroEntries: true,
                Onboardings: true,
                CreditosAvulsos: true,
                NotificationStatus: true,
                ConsultaPacientes: {
                    include: {
                        ReservaSessao: true
                    }
                },
                CancelamentosPac: true,
                WorkSchedules: true,
                RefreshTokens: true,
            }
        });
    }

    async getById(user: any, id: string) {
        if (this.authorizationService && typeof this.authorizationService.checkPermission === "function") {
            const hasPermission = await this.authorizationService.checkPermission(
                user.Id,
                Module.Patients,
                ActionType.Read
            );
            if (!hasPermission) {
                throw new Error("Acesso negado ao módulo de pacientes.");
            }
        }
        const paciente = await prisma.user.findFirst({
            where: { Id: id, Role: "Patient" },
            include: {
                Address: true,
                BillingAddress: true,
                Images: true,
                ReviewsMade: true,
                FavoritesGiven: true,
                PlanoAssinaturas: true,
                FinanceiroEntries: true,
                Onboardings: true,
                CreditosAvulsos: true,
                NotificationStatus: true,
                ConsultaPacientes: {
                    include: {
                        ReservaSessao: true
                    }
                },
                CancelamentosPac: true,
                WorkSchedules: true,
                RefreshTokens: true,
            }
        });

        if (!paciente) return null;
        const { Password, ...rest } = paciente;
        return rest;
    }
}
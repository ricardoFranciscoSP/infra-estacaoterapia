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
            include: {
                ProfessionalProfiles: {
                    include: {
                        Documents: true,
                        Formacoes: true,
                    }
                },
                PsychologistAgendas: true,
                ReviewsReceived: true,
                FavoritesGiven: true,
                Images: true,
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
                Address: true
            }
        });

        // Retorna todos os psicólogos, independentemente de estarem completos
        return psicologos.map(({ Password, ...rest }) => rest);
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
            select: { Id: true, Status: true, DataAprovacao: true }
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

        // Filtra os dados removendo apenas campos de relação
        // Permite editar TODOS os campos do modelo User (exceto Password que é tratado separadamente)
        const updateData: Record<string, unknown> = {};
        for (const key in data) {
            // Permite todos os campos do User, exceto relações e Password
            if (!relationFields.includes(key) && key !== 'Password') {
                updateData[key] = data[key];
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
            const existingBilling = await prisma.billingAddress.findFirst({
                where: { UserId: id }
            });

            if (existingBilling) {
                await prisma.billingAddress.update({
                    where: { Id: existingBilling.Id },
                    data: {
                        Rua: billingData.Rua as string,
                        Numero: billingData.Numero as string | null,
                        Complemento: billingData.Complemento as string | null,
                        Bairro: billingData.Bairro as string,
                        Cidade: billingData.Cidade as string,
                        Estado: billingData.Estado as string,
                        Cep: billingData.Cep as string,
                    }
                });
            } else {
                await prisma.billingAddress.create({
                    data: {
                        UserId: id,
                        Rua: billingData.Rua as string,
                        Numero: billingData.Numero as string | null,
                        Complemento: billingData.Complemento as string | null,
                        Bairro: billingData.Bairro as string,
                        Cidade: billingData.Cidade as string,
                        Estado: billingData.Estado as string,
                        Cep: billingData.Cep as string,
                    }
                });
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
                Images: true,
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
                Images: true,
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
        return rest;
    }


    async gerarContrato(psicologo: ContratoPsicologoData, templateName: string): Promise<{ urlContrato: string }> {
        // Valida que o template é o correto
        if (templateName !== 'contrato-parceria-psicologo.html') {
            console.warn(`[PsicologoService] ATENÇÃO: Template recebido (${templateName}) não é o esperado (contrato-parceria-psicologo.html)`);
        }
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
            const templateName = 'contrato-parceria-psicologo.html';
            console.log(`[Previa Contrato] ==========================================`);
            console.log(`[Previa Contrato] INICIANDO PRÉVIA DO CONTRATO DE PARCERIA`);
            console.log(`[Previa Contrato] Template: ${templateName}`);
            console.log(`[Previa Contrato] ID do psicólogo: ${idUser}`);
            console.log(`[Previa Contrato] ==========================================`);

            // Usa o método renderHtml do ContratoService para garantir consistência
            const html = await this.contratoService.renderHtmlForPreview(psicologoData, templateName);

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
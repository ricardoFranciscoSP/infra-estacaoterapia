import prisma from '../prisma/client';
import { PlanoCompraStatus, Prisma, TipoFatura, ControleFinanceiroStatus } from '../generated/prisma/client';
import { IUserService, Plano } from '../interfaces/user.interface';
import { ROLES } from '../constants/roles.constants';
import { comparePassword, hashPassword } from '../utils/hashPassword';
import { supabase, supabaseAdmin, STORAGE_BUCKET, STORAGE_BUCKET_PUBLIC } from '../services/storage.services';
import * as fs from 'fs';
import * as path from 'path';
import { ContratoService, getTemplateContratoByTipoPlano } from './gerarPdf.service';
import { estaDentroDaPermanenciaMinima, calcularMultaPlano } from '../utils/differenceInMonths';

export class UserService implements IUserService {
    /**
     * Retorna as consultas avulsas do usuário.
     * @param userId ID do usuário.
     * @returns Array de ConsultaAvulsa ou vazio.
     */
    async getConsultaAvulsaByUser(userId: string): Promise<import("../interfaces/consultaAvulsa.model").ConsultaAvulsa[]> {
        const consultas = await prisma.consultaAvulsa.findMany({ where: { PacienteId: userId } });
        return consultas.map(c => ({
            Id: c.Id,
            UserId: c.PacienteId,
            Data: c.DataCriacao.toISOString(),
            Status: c.Status,
            Valor: 0, // Adapte se houver campo de valor
            Quantidade: c.Quantidade,
            CreatedAt: c.DataCriacao.toISOString(),
            UpdatedAt: c.DataCriacao.toISOString()
        }));
    }

    /**
     * Retorna os créditos avulsos do usuário.
     * @param userId ID do usuário.
     * @returns Array de CreditoAvulso ou vazio.
     */
    async getCreditoAvulsoByUser(userId: string): Promise<import("../interfaces/creditoAvulso.model").CreditoAvulso[]> {
        const creditos = await prisma.creditoAvulso.findMany({ where: { UserId: userId } });
        return creditos.map(c => ({
            Id: c.Id,
            UserId: c.UserId,
            Valor: c.Valor,
            Status: c.Status,
            Data: c.Data ? c.Data.toISOString() : '',
            ValidUntil: c.ValidUntil ? c.ValidUntil.toISOString() : '',
            Quantidade: c.Quantidade,
            CodigoFatura: c.CodigoFatura || '',
            Tipo: c.Tipo || null,
            CreatedAt: c.Data ? c.Data.toISOString() : '',
            UpdatedAt: c.Data ? c.Data.toISOString() : ''
        }));
    }
    private contratoService: ContratoService;
    constructor() {
        this.contratoService = new ContratoService();
    }

    /**
     * Retorna o ID do usuário logado a partir do request.
     * @param req Objeto de request.
     * @returns ID do usuário ou null.
     */
    getLoggedUserId(req: any): string | null {
        return req.user?.Id || null;
    }

    // ===================== MÉTODOS DE USUÁRIO =====================

    /**
     * Busca todos os usuários se o usuário logado for Admin ou Manager.
     * @param userId ID do usuário logado.
     * @returns Array de usuários sem senha.
     */
    async fetchUsers(userId: string): Promise<any[]> {
        const user = await prisma.user.findUnique({ where: { Id: userId } });
        // Apenas Admin ou Manager podem listar todos os usuários
        if (!user || !['Admin', 'Manager'].includes(user.Role)) return [];
        const users = await prisma.user.findMany({
            include: { Images: true, Address: true, ReviewsMade: true, Onboardings: true },
        });
        return users.map((u: { Password: string }) => {
            const { Password, ...rest } = u;
            return rest;
        });
    }

    /**
     * Busca usuário por ID, apenas se for o próprio ou Admin/MANAGEMENT.
     * @param id ID do usuário buscado.
     * @param loggedUser Usuário logado.
     * @returns Usuário sem senha ou null.
     */
    async fetchUserById(id: string, loggedUser: any): Promise<any | null> {
        if (!loggedUser) return null;
        // Só permite se for o próprio usuário ou se for Admin/MANAGEMENT
        if (loggedUser.id !== id && !['Admin', 'MANAGEMENT'].includes(loggedUser.role)) {
            return null;
        }
        const user = await prisma.user.findUnique({
            where: { Id: id },
            include: { Images: true, Address: true, Onboardings: true },
        });
        if (!user) return null;
        const { Password, ...sanitizedUser } = user;
        return sanitizedUser;
    }

    /**
     * Atualiza dados do usuário e endereço.
     * @param userId ID do usuário.
     * @param data Dados para atualização.
     * @returns Usuário atualizado sem senha ou null.
     */
    async updateUser(userId: string, data: any): Promise<any | null> {
        const user = await prisma.user.findUnique({
            where: { Id: userId },
            include: { Images: true, Address: true, BillingAddress: true, ProfessionalProfiles: true },
        });

        if (!user) return null;

        // Remover qualquer campo image ou imageFile do objeto data para evitar erro no update do usuário
        if (data.image) delete data.image;
        if (data.imageFile) delete data.imageFile;

        // Separar dados de endereço residencial e cobrança
        const addressArray = Array.isArray(data.Address) ? data.Address : [];
        const billingAddressData = data.BillingAddress || null;
        delete data.Address;
        delete data.BillingAddress;

        // Atualizar o usuário (apenas campos do usuário)
        await prisma.user.update({
            where: { Id: userId },
            data: {
                Nome: data.nome,
                Email: data.email,
                Cpf: data.cpf,
                Telefone: data.telefone,
                DataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : undefined,
                Status: data.status,
                Role: data.role,
            },
        });

        // Atualizar ou criar endereço residencial
        if (addressArray.length > 0) {
            if (user.Address && user.Address.length > 0) {
                await prisma.address.update({
                    where: { Id: user.Address[0].Id },
                    data: {
                        Rua: addressArray[0].rua,
                        Numero: addressArray[0].numero,
                        Complemento: addressArray[0].complemento,
                        Bairro: addressArray[0].bairro,
                        Cidade: addressArray[0].cidade,
                        Estado: addressArray[0].estado,
                        Cep: addressArray[0].cep,
                    }
                });
            } else {
                await prisma.address.create({
                    data: {
                        Rua: addressArray[0].rua,
                        Numero: addressArray[0].numero,
                        Complemento: addressArray[0].complemento,
                        Bairro: addressArray[0].bairro,
                        Cidade: addressArray[0].cidade,
                        Estado: addressArray[0].estado,
                        Cep: addressArray[0].cep,
                        UserId: userId
                    }
                });
            }
        }

        // Atualizar ou criar endereço de cobrança
        if (billingAddressData && billingAddressData.Rua) {
            const existingBilling = user.BillingAddress && user.BillingAddress.length > 0 ? user.BillingAddress[0] : null;
            if (existingBilling) {
                await prisma.billingAddress.update({
                    where: { Id: existingBilling.Id },
                    data: {
                        Rua: billingAddressData.Rua,
                        Numero: billingAddressData.Numero,
                        Complemento: billingAddressData.Complemento ?? '',
                        Bairro: billingAddressData.Bairro,
                        Cidade: billingAddressData.Cidade,
                        Estado: billingAddressData.Estado,
                        Cep: billingAddressData.Cep
                    }
                });
            } else {
                await prisma.billingAddress.create({
                    data: {
                        UserId: userId,
                        Rua: billingAddressData.Rua,
                        Numero: billingAddressData.Numero,
                        Complemento: billingAddressData.Complemento ?? '',
                        Bairro: billingAddressData.Bairro,
                        Cidade: billingAddressData.Cidade,
                        Estado: billingAddressData.Estado,
                        Cep: billingAddressData.Cep
                    }
                });
            }
        }

        const updatedUser = await prisma.user.findUnique({
            where: { Id: userId },
            include: {
                Images: true,
                Address: true,
                BillingAddress: true,
                ProfessionalProfiles: user.Role === 'Psychologist',
            },
        });

        if (!updatedUser) return null;
        const { Password, ...sanitizedUser } = updatedUser;
        return sanitizedUser;
    }

    /**
     * Altera a senha do usuário.
     * @param userId ID do usuário.
     * @param oldPassword Senha antiga.
     * @param newPassword Nova senha.
     */
    async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
        const user = await prisma.user.findUnique({ where: { Id: userId } });
        if (!user) throw new Error('User not found');
        const isPasswordValid = await comparePassword(oldPassword, user.Password);
        if (!isPasswordValid) throw new Error('Invalid old password');
        const hashedNewPassword = await hashPassword(newPassword);
        await prisma.user.update({
            where: { Id: userId },
            data: { Password: hashedNewPassword },
        });
    }

    /**
     * Exclui usuário e seus arquivos do storage (soft delete).
     * @param id ID do usuário.
     * @returns Dados do usuário excluído, imagens e documentos removidos.
     */
    async deleteUser(id: string): Promise<any> {
        // Busca usuário completo
        const user = await prisma.user.findUnique({
            where: { Id: id },
            include: {
                Images: true,
                Address: true,
                ProfessionalProfiles: {
                    include: { Documents: true }
                },
                Document: true,
            }
        });
        if (!user) throw new Error('Usuário não encontrado');
        const publicBucket = STORAGE_BUCKET_PUBLIC;
        const storageClient = (supabaseAdmin || supabase).storage;
        // Remove imagens do usuário do storage e banco
        for (const img of user.Images) {
            if (img.Url) {
                const fileName = img.Url.split('/').pop();
                if (fileName) {
                    const filePath = `users/${id}/${fileName}`;
                    await storageClient.from(publicBucket).remove([filePath]);
                }
            }
            await prisma.image.deleteMany({ where: { Id: img.Id } });
        }
        // Remove documentos do usuário do storage e banco
        let deletedDocuments: string[] = [];
        for (const doc of user.Document) {
            if (doc.Url) {
                deletedDocuments.push(doc.Url);
                const fileName = doc.Url.split('/').pop();
                if (fileName) {
                    const filePath = `documents/${id}/${fileName}`;
                    await storageClient.from(STORAGE_BUCKET).remove([filePath]);
                }
            }
            await prisma.document.deleteMany({ where: { Id: doc.Id } });
        }
        // Remove documentos de perfis profissionais do storage e banco
        if (user.ProfessionalProfiles) {
            for (const profile of user.ProfessionalProfiles) {
                for (const doc of profile.Documents) {
                    if (doc.Url) {
                        deletedDocuments.push(doc.Url);
                        const fileName = doc.Url.split('/').pop();
                        if (fileName) {
                            const filePath = `documents/${id}/${fileName}`;
                            await storageClient.from(STORAGE_BUCKET).remove([filePath]);
                        }
                    }
                    await prisma.document.deleteMany({ where: { Id: doc.Id } });
                }
            }
        }
        // Remove endereços do usuário
        for (const addr of user.Address) {
            await prisma.address.deleteMany({ where: { Id: addr.Id } });
        }
        // Soft delete: atualiza deletedAt, mantém histórico de consultas e financeiro
        const deletedUser = await prisma.user.update({
            where: { Id: id },
            data: { deletedAt: new Date(), Status: 'Deletado' }
        });

        // Auditoria: registra ação de exclusão
        await prisma.adminActionLog.create({
            data: {
                UserId: id,
                ActionType: 'Delete',
                Module: 'Users',
                Description: `Usuário deletado. Imagens, documentos e endereços removidos.`,
                Status: 'Sucesso',
                Metadata: JSON.stringify({ deletedImages: user.Images.map((img: { Url: string }) => img.Url), deletedDocuments }),
            }
        });

        const { Password, ...sanitizedUser } = deletedUser;
        return {
            user: sanitizedUser,
            deletedImages: user.Images.map((img: { Url: string }) => img.Url),
            deletedDocuments
        };
    }

    // ===================== MÉTODOS DE IMAGEM =====================

    /**
     * Faz upload de imagem do usuário para o storage.
     * @param userId ID do usuário.
     * @param file Arquivo da imagem.
     * @returns Imagem criada no banco.
     */
    async uploadImage(userId: string, file: any): Promise<any> {
        if (!file) throw new Error("Nenhum arquivo enviado");
        const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml"];
        if (!allowedTypes.includes(file.mimetype)) throw new Error("Tipo de imagem inválido");
        const bucketName = STORAGE_BUCKET_PUBLIC; // bucket público para imagens
        const filePath = `users/${userId}/${Date.now()}_${file.originalname}`;

        // Verifica se já existe imagem cadastrada para o usuário
        const existingImage = await prisma.image.findFirst({ where: { UserId: userId } });
        if (existingImage) {
            // Atualiza a imagem existente
            return this.updateImage(userId, existingImage.Id, file);
        }

        // Faz upload do arquivo para o storage do Supabase
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
        // Obtém a URL pública da imagem
        const { data } = storageClient.from(bucketName).getPublicUrl(filePath);
        if (!data || !data.publicUrl) throw new Error("Falha ao obter a URL pública da imagem");
        const imageUrl = data.publicUrl;
        // Salva no banco a url e o userId
        return prisma.image.create({ data: { Url: imageUrl, UserId: userId } });
    }

    /**
     * Lista imagens do usuário.
     * @param userId ID do usuário.
     * @returns Array de imagens.
     */
    async listImages(userId: string): Promise<any[]> {
        return prisma.image.findMany({ where: { UserId: userId } });
    }

    /**
     * Atualiza imagem existente do usuário.
     * @param userId ID do usuário.
     * @param id ID da imagem.
     * @param file Arquivo da imagem.
     * @returns Imagem atualizada.
     */
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
        return prisma.image.update({
            where: { Id: id },
            data: { Url: imageUrl },
        });
    }

    /**
     * Exclui imagem do usuário do banco e storage.
     * @param userId ID do usuário.
     * @param imageId ID da imagem.
     * @returns Imagem excluída.
     */
    async deleteImage(userId: string, imageId: string): Promise<any> {
        const deletedImage = await prisma.image.delete({ where: { Id: imageId } });
        if (!deletedImage) return null;
        const bucketName = STORAGE_BUCKET_PUBLIC; // bucket público para imagens
        const filePath = `users/${userId}/${deletedImage.Url.split('/').pop()}`;
        // Usar supabaseAdmin se disponível para consistência
        const storageClient = (supabaseAdmin || supabase).storage;
        await storageClient.from(bucketName).remove([filePath]);
        return deletedImage;
    }

    // ===================== MÉTODOS DE ENDEREÇO =====================

    /**
     * Cria endereço de cobrança para o usuário.
     * @param userId ID do usuário.
     * @param data Dados do endereço.
     * @returns Endereço criado ou null.
     */
    async createEnderecoCobranca(userId: string, data: any): Promise<any | null> {
        try {
            if (!data || !data.Rua || !data.Numero || !data.Bairro || !data.Cidade || !data.Estado || !data.Cep) {
                throw new Error('Dados de endereço de cobrança incompletos ou ausentes.');
            }
            const updatedEndereco = await prisma.billingAddress.create({
                data: {
                    UserId: userId,
                    Rua: data.Rua,
                    Numero: data.Numero,
                    Complemento: data.Complemento ?? '',
                    Bairro: data.Bairro,
                    Cidade: data.Cidade,
                    Estado: data.Estado,
                    Cep: data.Cep
                }
            });
            return updatedEndereco;
        } catch (error) {
            console.error('Erro ao criar endereço de cobrança:', error);
            return null;
        }
    }

    // ===================== MÉTODOS DE CONTRATO =====================

    /**
     * Faz upload de contrato do psicólogo para o storage e registra no banco.
     * @param userId ID do usuário.
     * @param file Arquivo do contrato.
     * @returns Contrato registrado.
     */
    async envioContrato(userId: string, file: any): Promise<any> {
        if (!file) throw new Error("Nenhum arquivo enviado");
        const bucketName = STORAGE_BUCKET; // documentos devem ficar privados
        const filePath = `documents/${userId}/${Date.now()}_${file.originalname}`;
        // Upload para Supabase - sempre usar supabaseAdmin para buckets privados
        if (!supabaseAdmin) {
            throw new Error(
                "SUPABASE_SERVICE_ROLE_KEY não definido. " +
                "Uploads para buckets privados requerem service role key para evitar erros de verificação de assinatura."
            );
        }
        const uploadResult = await supabaseAdmin.storage.from(bucketName).upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
        });
        if (uploadResult.error) {
            // Tratamento específico para erro de verificação de assinatura
            if (uploadResult.error.message?.toLowerCase().includes('signature verification failed') ||
                uploadResult.error.message?.toLowerCase().includes('signature') ||
                (uploadResult.error as any).statusCode === '403' || (uploadResult.error as any).status === 403) {
                throw new Error("Erro de verificação de assinatura. Verifique se SUPABASE_SERVICE_ROLE_KEY está configurada corretamente.");
            }
            throw new Error("Erro ao enviar contrato: " + uploadResult.error.message);
        }
        const { data } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);
        if (!data || !data.publicUrl) throw new Error("Falha ao obter a URL pública do contrato");
        const contratoUrl = data.publicUrl;

        // Buscar perfil profissional do usuário
        const profile = await prisma.professionalProfile.findFirst({ where: { UserId: userId } });
        if (!profile) throw new Error("Perfil profissional não encontrado");

        // Registrar contrato
        const contrato = await prisma.psychologistDocument.create({
            data: {
                ProfessionalProfileId: profile.Id,
                Url: contratoUrl,
                Type: file.mimetype,
                Description: "Contrato enviado",
            }
        });

        // Atualizar status e data de aprovação do perfil profissional
        await prisma.user.update({
            where: { Id: userId },
            data: {
                Status: "Ativo",
                DataAprovacao: new Date(),
            }
        });

        return contrato;
    }

    /**
     * Gera prévia do contrato do paciente em HTML.
     * @param userId ID do paciente.
     * @param planos Plano(s) do paciente.
     * @returns HTML do contrato.
     */
    async previaContrato(userId: string, planos: Plano[] | Plano): Promise<string> {
        const paciente = await prisma.user.findFirst({
            where: { Id: userId, Role: "Patient" },
            include: {
                Address: true,
            }
        });
        if (!paciente) throw new Error("Paciente não encontrado");

        const Handlebars = require('handlebars');
        const endereco = Array.isArray(paciente.Address) && paciente.Address.length > 0 ? paciente.Address[0] : undefined;

        const empresa = {
            nome: "MINDFLUENCE PSICOLOGIA LTDA.",
            cnpj: "54.222.003/0001-07",
            endereco: "Av. Brigadeiro Luís Antonio, 1811 – Sala 1119, Jardim Paulistano – São Paulo/SP",
            cep: "01452-001"
        };
        const plataforma = {
            nome: "ESTAÇÃO TERAPIA",
            prazo_analise_horas: 72
        };

        // Aceita tanto array quanto objeto único
        let planoSelecionado: Plano | null = null;
        if (Array.isArray(planos)) {
            planoSelecionado = planos.length > 0 ? planos[0] : null;
        } else if (typeof planos === 'object' && planos !== null) {
            planoSelecionado = planos;
        }

        const nomePlano = planoSelecionado?.Nome || planoSelecionado?.Tipo || '';
        const tipoPlano = planoSelecionado?.Tipo || '';

        // Determina o template baseado no tipo do plano
        const templateName = getTemplateContratoByTipoPlano(tipoPlano);
        const templatePath = path.resolve(__dirname, './../templates', templateName);
        let templateHtml = '';
        try {
            templateHtml = fs.readFileSync(templatePath, 'utf8');
        } catch (err) {
            throw new Error(`Erro ao carregar template do contrato: ${templatePath}`);
        }

        // Processa o Preco corretamente (pode ser number ou string)
        let precoNumero: number = 0;
        if (planoSelecionado?.Preco !== null && planoSelecionado?.Preco !== undefined) {
            const preco = planoSelecionado.Preco as number | string;
            if (typeof preco === 'string') {
                const cleaned = preco.replace(/[^\d,.-]/g, '').replace(',', '.');
                precoNumero = parseFloat(cleaned) || 0;
            } else if (typeof preco === 'number') {
                precoNumero = preco;
            }
        }

        const valorPlano = precoNumero >= 0 && !isNaN(precoNumero)
            ? precoNumero.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })
            : '0,00';

        // Processa a duração (pode ser number, string ou null/undefined)
        let duracaoMeses: number = 6; // Valor padrão
        if (planoSelecionado?.Duracao) {
            if (typeof planoSelecionado.Duracao === 'string') {
                duracaoMeses = parseInt(planoSelecionado.Duracao) || 6;
            } else if (typeof planoSelecionado.Duracao === 'number') {
                duracaoMeses = planoSelecionado.Duracao;
            }
        }

        // Função helper para converter número em extenso
        const numeroPorExtenso = (num: number): string => {
            const unidades = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
                'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
            const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];

            if (num < 20) return unidades[num];
            if (num < 100) {
                const dez = Math.floor(num / 10);
                const un = num % 10;
                return un === 0 ? dezenas[dez] : `${dezenas[dez]} e ${unidades[un]}`;
            }
            return num.toString();
        };

        const dataContrato = {
            empresa,
            plataforma,
            contratante: {
                nome: paciente.Nome || '',
                rg: paciente.Rg || '',
                cpf: paciente.Cpf || '',
                logradouro: endereco ? endereco.Rua : '',
                numero: endereco ? endereco.Numero : '',
                bairro: endereco ? endereco.Bairro : '',
                cidade: endereco ? endereco.Cidade : '',
                uf: endereco ? endereco.Estado : '',
            },
            plano: {
                nome: nomePlano,
                tipo: tipoPlano,
                valor: valorPlano,
                duracao_meses: duracaoMeses,
                duracao_extenso: numeroPorExtenso(duracaoMeses)
            },
            data_assinatura: new Date().toLocaleDateString('pt-BR')
        };

        const template = Handlebars.compile(templateHtml);
        return template(dataContrato);
    }

    /**
     * Gera contrato do paciente e retorna URL.
     * @param userId ID do paciente.
     * @param planos Plano(s) do paciente.
     * @param templatePath Caminho do template HTML.
     * @returns URL do contrato gerado.
     */
    async gerarContrato(userId: string, planos: Plano[] | Plano, templatePath: string): Promise<{ urlContrato: string }> {
        const resultado = await this.contratoService.gerarContratoPaciente(userId, planos, templatePath);
        return resultado;
    }

    // ===================== MÉTODOS DE ONBOARDING =====================

    /**
     * Atualiza ou cria onboarding do usuário.
     * @param userId ID do usuário.
     * @param status Status do onboarding.
     * @param objetivo Objetivo(s) do onboarding.
     * @returns Onboarding atualizado/criado.
     */
    async onboarding(userId: string, status: string | boolean, objetivo: string | string[]): Promise<any> {
        // Aceita status como boolean ou string
        let statusBoolean: boolean;
        if (typeof status === 'boolean') {
            statusBoolean = status;
        } else {
            statusBoolean = status === 'true' || status === '1';
        }

        // Garante que objetivo seja sempre um array de string válido
        let objetivoArray: string[] = [];
        if (Array.isArray(objetivo)) {
            objetivoArray = objetivo.filter((o) => typeof o === 'string' && o.trim() !== '');
        } else if (typeof objetivo === 'string' && objetivo.trim() !== '') {
            objetivoArray = [objetivo];
        }

        let onboarding = await prisma.onboarding.findUnique({ where: { Id: userId } });
        if (!onboarding) {
            onboarding = await prisma.onboarding.create({
                data: {
                    Id: userId,
                    Completed: statusBoolean, // Corrigido de 'status' para 'Status'
                    Step: objetivoArray.join(', '),
                    User: { connect: { Id: userId } }
                },
            });
        } else {
            onboarding = await prisma.onboarding.update({
                where: { Id: userId },
                data: {
                    Completed: statusBoolean,
                    Step: objetivoArray.join(', '),
                },
            });
        }
        return onboarding;
    }

    /**
     * Atualiza flag de onboarding do usuário.
     * @param userId ID do usuário.
     * @param data Dados contendo IsOnboarding.
     * @returns Usuário atualizado sem senha.
     */
    async updateIsOnboarding(userId: string, data: any): Promise<any> {
        const isOnboardingValue = data.IsOnboarding;

        const updatedUser = await prisma.user.update({
            where: { Id: userId },
            data: {
                IsOnboard: isOnboardingValue,
            },
        });
        if (!updatedUser) return null;
        const { Password, ...sanitizedUser } = updatedUser;
        return sanitizedUser;
    }

    // ===================== MÉTODOS DE VERIFICAÇÃO =====================

    /**
     * Verifica se usuário é paciente.
     * @param userId ID do usuário.
     * @returns Dados do usuário ou null.
     */
    async verifyUserIsPatient(userId: string): Promise<any | null> {
        try {
            const user = await prisma.user.findUnique({
                where: { Id: userId },
                select: { Id: true, Role: true, Nome: true, Email: true },
            });

            if (!user || user.Role !== ROLES.Patient) {
                return null;
            }
            return user;
        } catch (error) {
            console.error('Erro ao verificar usuário paciente:', error);
            // Retornar null ou lançar erro personalizado, dependendo da necessidade
            return null;
        }
    }

    /**
     * Verifica se usuário possui um dos papéis informados.
     * @param userId ID do usuário.
     * @param roles Array de papéis permitidos.
     * @returns Dados do usuário ou null.
     */
    async verifyUserRole(userId: string, roles: string[]): Promise<any | null> {
        const user = await prisma.user.findUnique({
            where: { Id: userId },
            select: { Id: true, Role: true, Nome: true, Email: true },
        });

        if (!user || !roles.includes(user.Role)) {
            return null;
        }
        return user;
    }

    // ===================== MÉTODOS DE RELACIONAMENTO =====================

    /**
     * Retorna todos os dados do usuário autenticado, incluindo relacionamentos.
     * @param userId ID do usuário.
     * @returns Usuário com relacionamentos ou null.
     */
    async getUserWithRelations(userId: string): Promise<any | null> {
        const user = await prisma.user.findUnique({
            where: { Id: userId },
            select: { Role: true },
        });
        if (!user) return null;

        const includeRelations: any = {
            Images: true,
            Address: true,
            ReviewsMade: true,
            Onboardings: true,
            ConsultaAvulsaPaciente: true,
            PlanoAssinaturas: {
                include: {
                    Assinaturas: true
                }
            },
            FinanceiroEntries: true, // Adicionado relacionamento financeiro
        };
        if (user.Role !== 'Patient') {
            includeRelations.ProfessionalProfiles = true;
        }

        const userWithRelations = await prisma.user.findUnique({
            where: { Id: userId },
            include: includeRelations,
        });
        if (!userWithRelations) return null;
        // Remover o campo Password do retorno
        const { Password, ...sanitizedUser } = userWithRelations;
        return sanitizedUser;
    }

    /**
     * Retorna os planos do usuário.
     * @param userId ID do usuário.
     * @returns Array de planos ou null.
     */
    async getUserPlano(userId: string): Promise<Array<{
        Id: string;
        UserId: string;
        PlanoAssinaturaId: string;
        DataInicio: Date;
        DataFim: Date | null;
        Status: string;
        VindiSubscriptionId: string | null;
        CreatedAt: Date;
        UpdatedAt: Date;
        Ciclos: Array<{
            Id: string;
            AssinaturaPlanoId: string;
            UserId: string;
            CicloInicio: Date;
            CicloFim: Date;
            Status: string;
            ConsultasDisponiveis: number;
            ConsultasUsadas: number;
            CreatedAt: Date;
            UpdatedAt: Date;
            ControleConsultaMensal: Array<unknown>;
            Financeiro: Array<unknown>;
        }>;
        ControleConsultaMensal: Array<unknown>;
        Financeiro: Array<unknown>;
        PlanoAssinatura: {
            Id: string;
            Nome: string;
            Descricao: string[];
            Preco: number;
            Duracao: number;
            Tipo: string;
            Status: string;
            Destaque: boolean | null;
            VindiPlanId: string | null;
            ProductId: string | null;
            CreatedAt: Date;
            UpdatedAt: Date;
        } | null;
    }> | null> {
        try {
            // Busca TODOS os planos do usuário, incluindo cancelados
            // Isso permite que consultas sejam usadas mesmo com plano cancelado, desde que o ciclo esteja válido
            const planos = await prisma.assinaturaPlano.findMany({
                where: {
                    UserId: userId,
                    // Busca planos Ativos, Cancelados ou AguardandoPagamento
                    // Planos cancelados podem ter ciclos válidos ainda
                    Status: { in: ['Ativo', 'Cancelado', 'AguardandoPagamento'] }
                },
                include: {
                    Ciclos: {
                        where: {
                            // Retorna TODOS os ciclos ativos (mesmo sem consultas disponíveis)
                            // Isso permite que o frontend exiba o plano mesmo quando não há consultas no momento
                            Status: 'Ativo'
                        },
                        orderBy: { CicloInicio: 'desc' },
                        include: {
                            ControleConsultaMensal: true,
                            Financeiro: true,
                        }
                        // CreatedAt e UpdatedAt são retornados automaticamente pelo Prisma
                    },
                    ControleConsultaMensal: true,
                    Financeiro: true,
                    PlanoAssinatura: {
                        select: {
                            Id: true,
                            Nome: true,
                            Descricao: true,
                            Preco: true,
                            Duracao: true,
                            Tipo: true,
                            Status: true,
                            Destaque: true,
                            VindiPlanId: true,
                            ProductId: true,
                            CreatedAt: true,
                            UpdatedAt: true
                        }
                    }
                }
            });
            if (!planos || planos.length === 0) return null;

            // Transforma Descricao em array de strings para cada plano
            type PlanoComInclude = Prisma.AssinaturaPlanoGetPayload<{
                include: {
                    Ciclos: {
                        include: {
                            ControleConsultaMensal: true;
                            Financeiro: true;
                        };
                    };
                    ControleConsultaMensal: true;
                    Financeiro: true;
                    PlanoAssinatura: {
                        select: {
                            Id: true;
                            Nome: true;
                            Descricao: true;
                            Preco: true;
                            Duracao: true;
                            Tipo: true;
                            Status: true;
                            Destaque: true;
                            VindiPlanId: true;
                            ProductId: true;
                            CreatedAt: true;
                            UpdatedAt: true;
                        };
                    };
                };
            }>;

            // Função auxiliar para converter JsonValue para string[]
            const converterDescricaoParaArray = (descricao: Prisma.JsonValue): string[] => {
                if (!descricao) return [];

                // Se já é um array de strings
                if (Array.isArray(descricao)) {
                    return descricao.filter((item): item is string => typeof item === 'string');
                }

                // Se é string, tenta parsear como JSON
                if (typeof descricao === 'string') {
                    try {
                        const parsed = JSON.parse(descricao);
                        if (Array.isArray(parsed)) {
                            return parsed.filter((item): item is string => typeof item === 'string');
                        }
                        return [parsed].filter((item): item is string => typeof item === 'string');
                    } catch {
                        return [descricao];
                    }
                }

                // Se é objeto, converte para string
                if (typeof descricao === 'object' && descricao !== null) {
                    return [JSON.stringify(descricao)];
                }

                return [];
            };

            type PlanoRetorno = {
                Id: string;
                UserId: string;
                PlanoAssinaturaId: string;
                DataInicio: Date;
                DataFim: Date | null;
                Status: string;
                VindiSubscriptionId: string | null;
                CreatedAt: Date;
                UpdatedAt: Date;
                Ciclos: Array<{
                    Id: string;
                    AssinaturaPlanoId: string;
                    UserId: string;
                    CicloInicio: Date;
                    CicloFim: Date;
                    Status: string;
                    ConsultasDisponiveis: number;
                    ConsultasUsadas: number;
                    CreatedAt: Date;
                    UpdatedAt: Date;
                    ControleConsultaMensal: Array<unknown>;
                    Financeiro: Array<unknown>;
                }>;
                ControleConsultaMensal: Array<unknown>;
                Financeiro: Array<unknown>;
                PlanoAssinatura: {
                    Id: string;
                    Nome: string;
                    Descricao: string[];
                    Preco: number;
                    Duracao: number;
                    Tipo: string;
                    Status: string;
                    Destaque: boolean | null;
                    VindiPlanId: string | null;
                    ProductId: string | null;
                    CreatedAt: Date;
                    UpdatedAt: Date;
                } | null;
            };

            const planosComDescricao: PlanoRetorno[] = planos.map((plano: PlanoComInclude): PlanoRetorno => {
                if (!plano.PlanoAssinatura) {
                    return {
                        Id: plano.Id,
                        UserId: plano.UserId,
                        PlanoAssinaturaId: plano.PlanoAssinaturaId,
                        DataInicio: plano.DataInicio,
                        DataFim: plano.DataFim,
                        Status: plano.Status,
                        VindiSubscriptionId: plano.VindiSubscriptionId,
                        CreatedAt: plano.CreatedAt,
                        UpdatedAt: plano.UpdatedAt,
                        Ciclos: plano.Ciclos.map(ciclo => ({
                            Id: ciclo.Id,
                            AssinaturaPlanoId: ciclo.AssinaturaPlanoId,
                            UserId: ciclo.UserId,
                            CicloInicio: ciclo.CicloInicio,
                            CicloFim: ciclo.CicloFim,
                            Status: ciclo.Status,
                            ConsultasDisponiveis: ciclo.ConsultasDisponiveis,
                            ConsultasUsadas: ciclo.ConsultasUsadas,
                            CreatedAt: ciclo.CreatedAt,
                            UpdatedAt: ciclo.UpdatedAt,
                            ControleConsultaMensal: Array.isArray(ciclo.ControleConsultaMensal) ? ciclo.ControleConsultaMensal : [],
                            Financeiro: Array.isArray(ciclo.Financeiro) ? ciclo.Financeiro : []
                        })),
                        ControleConsultaMensal: Array.isArray(plano.ControleConsultaMensal) ? plano.ControleConsultaMensal : [],
                        Financeiro: Array.isArray(plano.Financeiro) ? plano.Financeiro : [],
                        PlanoAssinatura: null
                    };
                }

                const planoAssinatura = plano.PlanoAssinatura;
                const descricaoArray = converterDescricaoParaArray(planoAssinatura.Descricao);

                return {
                    Id: plano.Id,
                    UserId: plano.UserId,
                    PlanoAssinaturaId: plano.PlanoAssinaturaId,
                    DataInicio: plano.DataInicio,
                    DataFim: plano.DataFim,
                    Status: plano.Status,
                    VindiSubscriptionId: plano.VindiSubscriptionId,
                    CreatedAt: plano.CreatedAt,
                    UpdatedAt: plano.UpdatedAt,
                    Ciclos: plano.Ciclos.map(ciclo => ({
                        Id: ciclo.Id,
                        AssinaturaPlanoId: ciclo.AssinaturaPlanoId,
                        UserId: ciclo.UserId,
                        CicloInicio: ciclo.CicloInicio,
                        CicloFim: ciclo.CicloFim,
                        Status: ciclo.Status,
                        ConsultasDisponiveis: ciclo.ConsultasDisponiveis,
                        ConsultasUsadas: ciclo.ConsultasUsadas,
                        CreatedAt: ciclo.CreatedAt,
                        UpdatedAt: ciclo.UpdatedAt,
                        ControleConsultaMensal: Array.isArray(ciclo.ControleConsultaMensal) ? ciclo.ControleConsultaMensal : [],
                        Financeiro: Array.isArray(ciclo.Financeiro) ? ciclo.Financeiro : []
                    })),
                    ControleConsultaMensal: Array.isArray(plano.ControleConsultaMensal) ? plano.ControleConsultaMensal : [],
                    Financeiro: Array.isArray(plano.Financeiro) ? plano.Financeiro : [],
                    PlanoAssinatura: {
                        Id: planoAssinatura.Id,
                        Nome: planoAssinatura.Nome,
                        Descricao: descricaoArray,
                        Preco: planoAssinatura.Preco,
                        Duracao: planoAssinatura.Duracao,
                        Tipo: planoAssinatura.Tipo,
                        Status: planoAssinatura.Status,
                        Destaque: planoAssinatura.Destaque,
                        VindiPlanId: planoAssinatura.VindiPlanId,
                        ProductId: planoAssinatura.ProductId,
                        CreatedAt: planoAssinatura.CreatedAt,
                        UpdatedAt: planoAssinatura.UpdatedAt
                    }
                };
            });

            return planosComDescricao;
        } catch (error) {
            console.error('Erro ao buscar planos do usuário:', error);
            return null;
        }
    }

    /**
     * Movimenta o plano do usuário (cancelamento, downgrade, upgrade) conforme schema e relacionamentos.
     */
    async movimentarPlano({
        userId,
        tipoMovimentacao,
        novoPlanoAssinaturaId
    }: {
        userId: string;
        tipoMovimentacao: "cancelamento" | "downgrade" | "upgrade";
        novoPlanoAssinaturaId?: string;
    }): Promise<any> {
        // Busca assinatura ativa
        const assinatura = await prisma.assinaturaPlano.findFirst({
            where: { UserId: userId, Status: PlanoCompraStatus.Ativo },
            include: { PlanoAssinatura: true }
        });

        if (!assinatura) throw new Error("Assinatura não encontrada.");

        // Verifica permanência mínima (ajuste conforme sua regra de negócio)
        const dentro = estaDentroDaPermanenciaMinima(
            assinatura.DataInicio,
            assinatura.PlanoAssinatura?.Duracao || 0 // Exemplo: usa duração do plano
        );

        // Calcula multa se aplicável
        const multa = calcularMultaPlano(
            tipoMovimentacao,
            dentro,
            assinatura.PlanoAssinatura?.Preco || 0
        );

        // Registro da movimentação financeira/multa (se houver)
        if (multa > 0) {
            await prisma.financeiro.create({
                data: {
                    UserId: userId,
                    PlanoAssinaturaId: assinatura.PlanoAssinaturaId,
                    Valor: multa,
                    DataVencimento: new Date(),
                    Status: ControleFinanceiroStatus.AguardandoPagamento,
                    Tipo: TipoFatura.Multa,
                }
            });
        }

        // Atualizações
        if (tipoMovimentacao === "cancelamento") {
            return prisma.assinaturaPlano.update({
                where: { Id: assinatura.Id },
                data: { Status: PlanoCompraStatus.Cancelado, DataFim: new Date() }
            });
        }

        if ((tipoMovimentacao === "downgrade" || tipoMovimentacao === "upgrade") && novoPlanoAssinaturaId) {
            return prisma.assinaturaPlano.update({
                where: { Id: assinatura.Id },
                data: { PlanoAssinaturaId: novoPlanoAssinaturaId }
            });
        }

        return assinatura;
    }
    // Removido fechamento extra de chave
}

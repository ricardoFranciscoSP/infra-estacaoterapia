import bcrypt from 'bcryptjs';
import { IAuthService, RegisterInput, ProfessionalProfileInput } from '../interfaces/auth.interface';
import { User } from '../types/user.types';
import { IEmailService, ISMSService, IWhatsAppService } from '../interfaces/communication.interface';
import { supabase, supabaseAdmin, STORAGE_BUCKET } from '../services/storage.services';
import { randomUUID } from 'crypto';
import { VindiService } from './vindi.service';
import prisma from '../prisma/client';
import { isValidCPF } from '../utils/validation.util';
import { verifyToken } from '../utils/verifyToken';
import { TipoPessoaJuridica, Role, TipoAtendimento, Languages, Abordagem, Queixa, ProfessionalProfileStatus, Prisma, ExperienciaClinica } from '../generated/prisma';
import { PsychologistDocumentInput } from '../interfaces/auth.interface';

interface PessoaJuridicaInput {
    psicologoId: string;
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string;
    inscricaoEstadual?: string;
    simplesNacional?: boolean;
}

interface ExtendedProfessionalProfileInput {
    userId?: string;
    UserId?: string;
    TipoPessoaJuridico?: unknown;
    professionalProfile?: Record<string, unknown>;
}

export class AuthService implements IAuthService {
    constructor(
        private emailService: IEmailService,
        private smsService: ISMSService,
        private whatsAppService: IWhatsAppService
    ) { }

    async register(data: RegisterInput, files?: { [key: string]: Express.Multer.File[] }): Promise<{ success: boolean; message: string; user?: User }> {
        const userData = this.parseData(data);
        if (!userData.nome || !userData.email || !userData.role || !userData.password) {
            return { success: false, message: 'Nome, email, role e senha são obrigatórios.' };
        }
        const password = typeof userData.password === 'string' ? userData.password : String(userData.password || '');
        const hashedPassword = await this.hashPassword(password);

        if (!hashedPassword) {
            return { success: false, message: 'Senha é obrigatória.' };
        }

        // Validações de unicidade
        const conflict = await this.checkForConflicts(userData);
        if (conflict) return conflict;
        // Despacha para o fluxo correto
        switch (userData.role) {
            case 'Patient':
                return await this.registerPatient(userData, hashedPassword);
            case 'Finance':
                return await this.registerDefaultUser(userData, hashedPassword);
            case 'Management':
                return await this.registerDefaultUser(userData, hashedPassword);
            case 'Psychologist':
                // Mescla arquivos vindos do Multer (multipart) e fallback JSON/base64
                let filesArray: Express.Multer.File[] | undefined = files ? Object.values(files).flat() : undefined;
                if (!filesArray || filesArray.length === 0) {
                    const jsonFiles = this.extractFilesFromJsonBody(userData);
                    if (jsonFiles.length > 0) {
                        // Converter para formato compatível com Express.Multer.File
                        filesArray = jsonFiles.map(file => ({
                            ...file,
                            encoding: '7bit',
                            size: file.buffer.length,
                            stream: null as unknown as NodeJS.ReadableStream,
                            destination: '',
                            filename: file.originalname,
                            path: '',
                            fieldname: file.fieldname
                        })) as Express.Multer.File[];
                    }
                }
                return await this.registerPsychologist(userData, hashedPassword, filesArray);
            default:
                return await this.registerDefaultUser(userData, hashedPassword);
        }
    }

    // ========================
    // FUNÇÕES AUXILIARES
    // ========================
    private formatNumericIdentifier(identifier: string): string {
        // Não formata mais o CRP, pois agora aceita letras e números sem máscara
        // Mantém apenas para compatibilidade com outros identificadores se necessário
        return identifier;
    }

    /**
     * Normaliza o CRP removendo caracteres especiais (/, -, espaços) e convertendo para uppercase
     * Retorna apenas os caracteres alfanuméricos para comparação
     * @param crp - CRP a ser normalizado
     * @returns CRP normalizado (apenas caracteres alfanuméricos em uppercase)
     */
    private normalizeCrp(crp: string): string {
        if (!crp) return '';
        // Remove caracteres especiais: /, -, espaços e outros não alfanuméricos
        // Mantém apenas letras e números, converte para uppercase
        return crp.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
    }
    private parseData(data: RegisterInput): Record<string, unknown> {
        let parsed = typeof data === 'string' ? JSON.parse(data) : { ...data };

        if (typeof data.professionalProfile === 'string') {
            parsed.professionalProfile = JSON.parse(data.professionalProfile);
        }

        // Normaliza campos booleanos
        parsed.termsAccepted = this.toBoolean(parsed.termsAccepted);
        parsed.privacyAccepted = this.toBoolean(parsed.privacyAccepted);

        // Normaliza 'role' para os valores esperados no backend
        if (parsed.role && typeof parsed.role === 'string') {
            const r = parsed.role.toString().trim().toLowerCase();
            const roleMap: Record<string, string> = {
                patient: 'Patient',
                paciente: 'Patient',
                psychologist: 'Psychologist',
                psicologo: 'Psychologist',
                admin: 'Admin',
            };
            parsed.role = roleMap[r] || parsed.role;
        }

        return parsed;
    }

    private toBoolean(value: unknown): boolean {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') return ['true', 'TRUE', '1'].includes(value);
        if (typeof value === 'number') return value === 1;
        return false;
    }

    // Helpers de data/idade
    private isValidDate(d: unknown): boolean {
        return d instanceof Date && !isNaN(d.getTime());
    }
    private calculateAge(date: Date): number {
        const today = new Date();
        let age = today.getFullYear() - date.getFullYear();
        const m = today.getMonth() - date.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
            age--;
        }
        return age;
    }

    private isAdult(date: Date, minAge = 18): boolean {
        const age = this.calculateAge(date);
        return age >= minAge;
    }

    private async hashPassword(password: string): Promise<string | null> {
        return password ? await bcrypt.hash(password, 10) : null;
    }

    /**
     * Normaliza a senha removendo espaços e caracteres de controle
     * Garante que a senha seja tratada da mesma forma em reset e login
     */
    private normalizePassword(password: string): string {
        if (!password || typeof password !== 'string') {
            return '';
        }
        // Remove espaços no início e fim
        let normalized = password.trim();
        // Remove caracteres de controle (exceto caracteres visíveis)
        normalized = normalized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        return normalized;
    }

    private async checkForConflicts(userData: Record<string, unknown>) {
        const [existingEmail, existingPhone, existingCRP] = await Promise.all([
            typeof userData.email === 'string' && userData.email ? this.findUserByIdentifier(userData.email) : null,
            typeof userData.telefone === 'string' && userData.telefone ? this.findUserByIdentifier(userData.telefone) : null,
            typeof userData.crp === 'string' && userData.crp ? this.findUserByIdentifier(userData.crp) : null,
        ]);

        if (existingEmail) return { success: false, message: 'Email já cadastrado.' };
        if (existingPhone) return { success: false, message: 'Telefone já cadastrado.' };
        if (existingCRP) return { success: false, message: 'CRP já cadastrado.' };

        return null;
    }

    // ========================
    // FLUXO PATIENT
    // ========================

    private async registerPatient(userData: Record<string, unknown>, hashedPassword: string) {
        // Validação: paciente deve ser maior de 18 anos
        const birthInput = userData.dataNascimento;
        if (!birthInput) {
            return { success: false, message: 'Atenção, data de nascimento é obrigatória para pacientes.' };
        }

        // Converte a data do formato ISO para objeto Date
        const birthDate = typeof birthInput === 'string' || birthInput instanceof Date || typeof birthInput === 'number'
            ? new Date(birthInput)
            : new Date(String(birthInput));
        if (!this.isValidDate(birthDate)) {
            return { success: false, message: 'Atenção, data de nascimento inválida.' };
        }

        // Valida se o paciente tem 18 anos ou mais
        if (!this.isAdult(birthDate, 18)) {
            const idade = this.calculateAge(birthDate);
            return {
                success: false,
                message: `Atenção, paciente deve ter 18 anos ou mais. Idade atual: ${idade} anos.`
            };
        }

        // Novo paciente: cria primeiro na Vindi
        const start = Date.now();
        const vindiResult = await this.createVindiCustomer(userData);
        if (!vindiResult.success) {
            return { success: false, message: vindiResult.message };
        }
        // Busca o cliente na Vindi para garantir o ID correto
        let vindiCustomerId = null;
        try {
            // Sempre busque pelo ID retornado, mas se não encontrar, tente buscar pelo CPF
            if (vindiResult.id) {
                const vindiCustomer = await VindiService.getCustomerById(vindiResult.id);
                vindiCustomerId = vindiCustomer?.id ?? null;
            }
        } catch (err) {
            return { success: false, message: 'Erro ao buscar cliente na Vindi após criação.' };
        }

        // Se ainda não encontrou, retorna erro
        if (!vindiCustomerId) {
            return { success: false, message: 'Não foi possível obter o ID do cliente na Vindi.' };
        }

        const normalizedData = this.normalizePatientData(userData, vindiCustomerId, hashedPassword);
        // Persista o usuário diretamente antes de chamar o register externo
        const createdUser = await this.createUser(normalizedData);
        if (!createdUser) {
            return { success: false, message: 'Erro ao criar usuário no banco.' };
        }

        // Envia email transacional de confirmação de cadastro
        console.log('[AuthService] 📧 Disparando email de confirmação de cadastro...');
        console.log('[AuthService] Email:', userData.email);
        console.log('[AuthService] Template ID: 1');

        // Constrói o link de login
        const frontendUrl = process.env.FRONTEND_URL || 'https://estacaoterapia.com.br';
        const loginLink = `${frontendUrl}/login`;
        // Envia email de confirmação de cadastro via EmailService (não transacional)
        console.log('[AuthService] 📧 Disparando email de confirmação de cadastro...');
        console.log('[AuthService] Email:', userData.email);
        console.log('[AuthService] Template: welcome');
        console.log('[AuthService] Link de login:', loginLink);

        try {
            await this.emailService.sendWelcomeEmail(
                typeof userData.email === 'string' ? userData.email : '',
                typeof userData.nome === 'string' ? userData.nome : ''
            );
            console.log('[AuthService] ✅ Email de confirmação de cadastro enviado com sucesso');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error('[AuthService] ❌ Erro ao enviar e-mail de confirmação de cadastro:', errorMessage);
            // Log não bloqueia o fluxo de registro
        }

        const elapsed = Date.now() - start;
        if (elapsed > 1000) {
            console.warn(`registerDefaultUser demorou ${elapsed}ms`);
        }
        return this.successResponse(createdUser);
    }

    private async createVindiCustomer(payload: Record<string, unknown>): Promise<{ success: boolean; id?: string; message: string }> {
        try {
            // Mapeia os campos do payload da requisição para os campos esperados pela Vindi
            const name = (typeof payload.nome === 'string' ? payload.nome : null) || (typeof payload.name === 'string' ? payload.name : null);
            const email = typeof payload.email === 'string' ? payload.email : '';
            const registry_code = ((typeof payload.cpf === 'string' ? payload.cpf : '') || (typeof payload.registry_code === 'string' ? payload.registry_code : '') || '').replace(/\D/g, '');
            const telefone = typeof payload.telefone === 'string' ? payload.telefone : '';

            if (!registry_code || registry_code.length !== 11 || !isValidCPF(registry_code)) {
                console.error('[Vindi] CPF inválido:', payload.cpf || payload.registry_code);
                return { success: false, message: 'CPF inválido para cadastro na Vindi.' };
            }

            // Formata telefone para padrão Vindi: 5511XXXXXXXXX
            let phone: string | undefined = telefone ? telefone.replace(/\D/g, '') : undefined;
            if (phone) {
                if (phone.length === 11 && !phone.startsWith('55')) {
                    // Ex: 11999999999 -> 5511999999999
                    phone = `55${phone}`;
                } else if (phone.length === 13 && phone.startsWith('55')) {
                    // já está correto
                } else if (phone.length === 10 && !phone.startsWith('55')) {
                    // Ex: 1199999999 -> 551199999999
                    phone = `55${phone}`;
                } else if (!phone.startsWith('55')) {
                    // fallback: adiciona 55
                    phone = `55${phone}`;
                }
            }

            if (!name) {
                return { success: false, message: 'Nome é obrigatório para cadastro na Vindi.' };
            }

            const customerData: { name: string; email: string; registry_code: string; telefone?: string } = {
                name,
                email,
                registry_code,
            };
            if (phone) {
                customerData.telefone = phone;
            }

            const response = await VindiService.createCustomer(customerData);

            const customerId = response?.id || response?.customer?.id;
            if (!customerId) {
                console.error('[Vindi] ID não retornado:', response);
                return { success: false, message: 'Falha ao criar cliente na Vindi: ID não retornado.' };
            }

            return { success: true, id: String(customerId), message: 'Cliente criado com sucesso na Vindi.' };
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : String(err);
            console.error('[Vindi] Erro ao criar cliente:', errorMessage);
            return { success: false, message: 'Erro ao criar cliente na Vindi.' };
        }
    }

    private normalizePatientData(userData: Record<string, unknown>, vindiCustomerId: string, hashedPassword: string): RegisterInput {
        const sexo = this.normalizeSexo(typeof userData.sexo === 'string' ? userData.sexo : '');
        const dataNascimento = userData.dataNascimento ? new Date(String(userData.dataNascimento)) : null;

        return {
            nome: typeof userData.nome === 'string' ? userData.nome : '',
            cpf: typeof userData.cpf === 'string' ? userData.cpf : '',
            email: typeof userData.email === 'string' ? userData.email : '',
            telefone: typeof userData.telefone === 'string' ? userData.telefone : '',
            role: typeof userData.role === 'string' ? userData.role : 'Patient',
            password: hashedPassword,
            sexo: typeof sexo === 'string' ? sexo : undefined,
            dataNascimento,
            vindiCustomerId: vindiCustomerId ? String(vindiCustomerId) : undefined,
            termsAccepted: this.toBoolean(userData.termsAccepted),
            privacyAccepted: this.toBoolean(userData.privacyAccepted),
        };
    }

    // ========================
    // FLUXO PSYCHOLOGIST
    // ========================
    private async registerPsychologist(userData: Record<string, unknown>, hashedPassword: string, files?: Express.Multer.File[]) {

        console.log('Iniciando registro de psicólogo para:', userData.email);

        // 1) Validação de payload e documentos obrigatórios
        const validation = this.validatePsychologistRegistrationInput(userData, files);
        if (!validation.ok) {
            return { success: false, message: validation.message || 'Dados inválidos para cadastro do psicólogo.' };
        }

        // 2) Mapeia os campos recebidos para os esperados pelo banco
        const mappedUserData: RegisterInput = {
            nome: typeof userData.nome === 'string' ? userData.nome : '',
            email: typeof userData.email === 'string' ? userData.email : '',
            cpf: typeof userData.cpf === 'string' ? userData.cpf : (typeof userData.cnpj === 'string' ? userData.cnpj : ''),
            crp: typeof userData.crp === 'string' ? userData.crp : undefined,
            telefone: typeof userData.telefone === 'string' ? userData.telefone : '',
            whatsapp: typeof userData.whatsapp === 'string' ? userData.whatsapp : undefined,
            password: hashedPassword,
            role: typeof userData.role === 'string' ? userData.role : 'Patient',
            termsAccepted: this.toBoolean(userData.termosAceitos ?? userData.termsAccepted),
            privacyAccepted: this.toBoolean(userData.privacyAccepted ?? userData.termosAceitos),
            sexo: typeof userData.sexo === 'string' ? userData.sexo : undefined,
            pronome: typeof userData.pronome === 'string' ? userData.pronome : undefined,
            racaCor: typeof userData.racaCor === 'string' ? userData.racaCor : undefined,
            dataNascimento: userData.dataNascimento ? (userData.dataNascimento instanceof Date ? userData.dataNascimento : new Date(String(userData.dataNascimento))) : null,
        };
        // Cria o usuário
        const user = await this.createUser(mappedUserData);
        if (!user || !user.Id) {
            return { success: false, message: 'Erro ao criar usuário.' };
        }

        // Cria o endereço pessoal (para autônomo E representante legal da empresa)
        // Este é o endereço do psicólogo (seja autônomo ou representante legal)
        const address = await prisma.address.create({
            data: {
                UserId: user.Id,
                Cep: typeof userData.cep === 'string' ? userData.cep : '',
                Rua: typeof userData.endereco === 'string' ? userData.endereco : '',
                Numero: typeof userData.numero === 'string' ? userData.numero : '',
                Complemento: typeof userData.complemento === 'string' ? userData.complemento : null,
                Bairro: typeof userData.bairro === 'string' ? userData.bairro : '',
                Cidade: typeof userData.cidade === 'string' ? userData.cidade : '',
                Estado: typeof userData.estado === 'string' ? userData.estado : '',
            }
        });
        if (!address || !address.Id) {
            return { success: false, message: 'Erro ao criar endereço.' };
        }

        // Cria Pessoa Juridica (apenas se for tipo Jurídico)
        const tipoNormalized = (userData.TipoPessoaJuridico || '').toString().trim().toLowerCase();
        let pessoaJuridica = null;
        if (tipoNormalized === 'juridico') {
            pessoaJuridica = await prisma.pessoalJuridica.create({
                data: {
                    PsicologoId: user.Id,
                    CNPJ: typeof userData.cnpj === 'string' ? userData.cnpj : '',
                    RazaoSocial: typeof userData.razaoSocial === 'string' ? userData.razaoSocial : '',
                    NomeFantasia: typeof userData.nomeFantasia === 'string' ? userData.nomeFantasia : null,
                    InscricaoEstadual: typeof userData.inscricaoEstadual === 'string' ? userData.inscricaoEstadual : null,
                    SimplesNacional: userData.simplesNacional === 'sim' || userData.simplesNacional === true,
                }
            });

            if (!pessoaJuridica || !pessoaJuridica.Id) {
                return { success: false, message: 'Erro ao criar pessoa jurídica.' };
            }

            // Cria o endereço da empresa (apenas para pessoa jurídica)
            // Verifica se os campos do endereço da empresa foram enviados
            const cepEmpresa = typeof userData.cepEmpresa === 'string' ? userData.cepEmpresa : '';
            const enderecoEmpresa = typeof userData.enderecoEmpresa === 'string' ? userData.enderecoEmpresa : '';

            if (cepEmpresa && enderecoEmpresa) {
                await prisma.enderecoEmpresa.create({
                    data: {
                        PessoalJuridicaId: pessoaJuridica.Id,
                        Cep: cepEmpresa,
                        Rua: enderecoEmpresa,
                        Numero: typeof userData.numeroEmpresa === 'string' ? userData.numeroEmpresa : null,
                        Complemento: typeof userData.complementoEmpresa === 'string' ? userData.complementoEmpresa : null,
                        Bairro: typeof userData.bairroEmpresa === 'string' ? userData.bairroEmpresa : '',
                        Cidade: typeof userData.cidadeEmpresa === 'string' ? userData.cidadeEmpresa : '',
                        Estado: typeof userData.estadoEmpresa === 'string' ? userData.estadoEmpresa : '',
                    }
                });
            }
        }

        // Cria o perfil profissional
        // Garante que TipoPessoaJuridico seja "Autonomo" ou "Juridico" (com primeira letra maiúscula)
        const tipoPessoaRaw = (userData.TipoPessoaJuridico || 'Autonomo').toString().trim();
        const tipoPessoaNormalized = tipoPessoaRaw === 'Juridico' || tipoPessoaRaw === 'juridico'
            ? 'Juridico'
            : 'Autonomo';

        const professionalProfileId = await this.createProfessionalProfile({
            UserId: user.Id,
            TipoPessoaJuridico: tipoPessoaNormalized,
        });
        if (!professionalProfileId) {
            return { success: false, message: 'Erro ao criar perfil profissional.' };
        }

        // Agrupa arquivos por tipo
        const fileTypes: { [key: string]: string } = {
            crpDocumento: 'CRP',
            rgCpfDocumento: 'RG_CPF_REPRESENTANTE',
            cartaoCnpjDocumento: 'CNPJ',
            contratoSocialDocumento: 'CONTRATO_SOCIAL',
            comprovanteEndEmpresaDocumento: 'COMPROVANTE_ENDERECO',
            rgCpfSocioDocumento: 'RG_CPF_SOCIO',
            rgDocumento: 'RG',
            comprovanteEndereco: 'COMPROVANTE_ENDERECO',
            simplesNacionalDocumento: 'SIMPLES_NACIONAL',
            comprovacaoIss: 'COMPROVACAO_ISS',
        };

        // Ajuste: files já é um array de arquivos, cada um pode ter um campo 'fieldname' que indica o tipo
        interface FileWithMetadata extends Express.Multer.File {
            description?: string;
        }
        const allFiles: { file: FileWithMetadata; type: string }[] = [];
        if (Array.isArray(files)) {
            files.forEach(file => {
                // Tenta identificar o tipo pelo fieldname do arquivo
                const fieldname = file.fieldname || '';
                const normalizedField = fieldname.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                const fileWithMeta = file as FileWithMetadata;
                const type = fileTypes[fieldname] || normalizedField || 'OUTRO';
                if (file.buffer) {
                    // Se não houver descrição, usa o fieldname como fallback
                    if (!fileWithMeta.description) fileWithMeta.description = fieldname;
                    allFiles.push({ file: fileWithMeta, type });
                }
            });
        }

        // Faz upload e salva os documentos
        const uploadResults = await this.uploadAndSaveDocuments(allFiles, professionalProfileId);

        // Validação dos documentos (resultado do upload)
        if (!uploadResults || uploadResults.length === 0 || uploadResults.some(r => r.uploadStatus !== 'success')) {
            return { success: false, message: 'Erro ao salvar documentos. Verifique os arquivos enviados.' };
        }

        // Garante que TODOS os documentos obrigatórios foram enviados com sucesso
        const tipoRaw = (userData?.TipoPessoaJuridico ?? '').toString().trim().toLowerCase();
        const isAutonomo = tipoRaw === 'autonomo';
        const isJuridico = tipoRaw === 'juridico';

        const hasType = (types: string | string[]) => {
            const list = Array.isArray(types) ? types : [types];
            return uploadResults.some((r) => list.includes(r.type) && r.uploadStatus === 'success');
        };

        let missingTypes: string[] = [];
        if (isAutonomo) {
            // Autônomo: Apenas CRP e RG são obrigatórios
            // COMPROVANTE_ENDERECO e COMPROVACAO_ISS são opcionais
            if (!hasType('CRP')) missingTypes.push('CRP');
            if (!hasType(['RG', 'RG_CPF_REPRESENTANTE'])) missingTypes.push('RG');
            // COMPROVANTE_ENDERECO e COMPROVACAO_ISS são opcionais, não validar
        } else if (isJuridico) {
            // Jurídico: Apenas 3 documentos obrigatórios no pré-cadastro
            // RG/CPF do Representante, CRP, Cartão CNPJ
            if (!hasType(['RG', 'RG_CPF_REPRESENTANTE'])) missingTypes.push('RG/CPF_REPRESENTANTE');
            if (!hasType('CRP')) missingTypes.push('CRP');
            if (!hasType('CNPJ')) missingTypes.push('CNPJ');
            // Documentos opcionais (não validados como obrigatórios):
            // - RG_CPF_SOCIO (opcional)
            // - CONTRATO_SOCIAL (opcional)
            // - COMPROVANTE_ENDERECO_EMPRESA (opcional)
            // - SIMPLES_NACIONAL (opcional, apenas se simplesNacional === "sim")
        } else {
            // fallback: manter regra mínima para não bloquear outros tipos futuros
            // Apenas CRP e RG são obrigatórios
            if (!hasType('CRP')) missingTypes.push('CRP');
            if (!hasType(['RG', 'RG_CPF_REPRESENTANTE'])) missingTypes.push('RG');
            // COMPROVANTE_ENDERECO e outros são opcionais no fallback
        }

        if (missingTypes.length > 0) {
            return { success: false, message: `Documentos obrigatórios faltando ou com erro: ${missingTypes.join(', ')}` };
        }

        // Só envia o e-mail se tudo foi preenchido corretamente
        // Envia email transacional de cadastro em análise com link do guia
        // Constrói a URL da API para o download do guia
        let apiUrl = process.env.API_URL;
        if (!apiUrl && process.env.FRONTEND_URL) {
            // Se não tiver API_URL, tenta derivar da FRONTEND_URL
            const frontendUrl = process.env.FRONTEND_URL;
            // Remove paths comuns do frontend
            apiUrl = frontendUrl.replace(/\/painel.*$/, '').replace(/\/painel-psicologo.*$/, '');
        }
        if (!apiUrl) {
            // Fallback para produção
            apiUrl = process.env.NODE_ENV === 'production'
                ? 'https://api.pre.estacaoterapia.com.br'
                : 'http://localhost:3001';
        }
        const guiaLink = `${apiUrl}/api/files/guia-psicologo`;

        // Envia email de cadastro em análise via EmailService (não transacional)
        console.log('[AuthService] 📧 Disparando email de cadastro em análise para psicólogo...');
        console.log('[AuthService] Email:', user.Email);
        console.log('[AuthService] Link do guia:', guiaLink);

        try {
            await this.emailService.sendWelcomePsicologoEmail(user.Email, user.Nome);
            console.log('[AuthService] ✅ Email de cadastro em análise enviado com sucesso');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error('Erro ao enviar e-mail de cadastro em análise:', errorMessage);
        }

        return this.successResponse(user);
    }

    private async uploadAndSaveDocuments(allFiles: { file: Express.Multer.File & { description?: string }; type: string }[], professionalProfileId: string) {
        const bucketName = STORAGE_BUCKET;
        const results: Array<{ uploadStatus: string; fileName: string; type: string }> = [];

        // Sempre usar supabaseAdmin para uploads, pois buckets privados requerem service role key
        // Usar cliente público pode causar erro de "signature verification failed"
        if (!supabaseAdmin) {
            console.error('[AuthService] SUPABASE_SERVICE_ROLE_KEY não definido');
            throw new Error(
                "SUPABASE_SERVICE_ROLE_KEY não definido. " +
                "Uploads para buckets privados requerem service role key para evitar erros de verificação de assinatura. " +
                "Configure a variável de ambiente SUPABASE_SERVICE_ROLE_KEY."
            );
        }

        console.log('[AuthService] Fazendo upload de documentos:', {
            bucketName,
            filesCount: allFiles.length,
            professionalProfileId: professionalProfileId.substring(0, 20) + '...'
        });

        // Validação adicional: verifica se o bucket pode ser acessado
        try {
            const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
            if (listError) {
                console.error('[AuthService] ❌ Erro ao listar buckets do Supabase:', listError);
                throw new Error(`Erro ao verificar buckets do Supabase: ${listError.message}. Verifique SUPABASE_SERVICE_ROLE_KEY e SUPABASE_URL.`);
            }

            const bucketExists = buckets?.some(b => b.name === bucketName);
            if (!bucketExists) {
                console.error('[AuthService] ❌ Bucket não encontrado:', bucketName);
                console.log('[AuthService] Buckets disponíveis:', buckets?.map(b => b.name).join(', ') || 'nenhum');
                throw new Error(`Bucket '${bucketName}' não encontrado no Supabase Storage. Verifique se o bucket existe e se SUPABASE_BUCKET está configurado corretamente.`);
            }

            console.log('[AuthService] ✅ Bucket encontrado:', bucketName);
        } catch (validationError) {
            // Se a validação falhar, ainda tenta o upload (pode ser um problema temporário)
            console.warn('[AuthService] ⚠️ Validação do bucket falhou, mas continuando com o upload:', validationError instanceof Error ? validationError.message : validationError);
        }

        const storageClient = supabaseAdmin.storage;
        const bucket = storageClient.from(bucketName);

        // Limite de concorrência para evitar saturar o servidor / rede
        const CONCURRENCY = Math.max(1, Number(process.env.UPLOAD_CONCURRENCY || 5));
        for (let i = 0; i < allFiles.length; i += CONCURRENCY) {
            const slice = allFiles.slice(i, i + CONCURRENCY);
            await Promise.all(
                slice.map(async ({ file, type }) => {
                    let publicUrl = '';
                    let uploadStatus: 'success' | 'error' | 'invalid_file' | 'exception' = 'success';
                    const originalName: string = file?.originalname || '';
                    const fileName = originalName;
                    const fileExtension = (fileName.split('.').pop() || '').toLowerCase();

                    try {
                        if (file && file.buffer && originalName) {
                            const safeName = this.sanitizeFilename(originalName);
                            const unique = (typeof randomUUID === 'function' ? randomUUID() : Math.random().toString(36).slice(2, 10));
                            const filePath = `documents/${professionalProfileId}/${Date.now()}_${unique}_${safeName}`;

                            const { error: uploadError } = await bucket.upload(
                                filePath,
                                file.buffer,
                                { contentType: file.mimetype || 'application/octet-stream', upsert: true }
                            );

                            if (uploadError) {
                                uploadStatus = 'error';
                                console.error('❌ Erro ao fazer upload do arquivo:', {
                                    error: uploadError,
                                    message: uploadError.message,
                                    statusCode: (uploadError as { statusCode?: string }).statusCode,
                                    status: (uploadError as { status?: number }).status,
                                    bucketName,
                                    filePath,
                                    fileName: originalName
                                });

                                // Se for erro de verificação de assinatura, log adicional com soluções
                                if (uploadError.message?.toLowerCase().includes('signature verification failed') ||
                                    (uploadError as { statusCode?: string }).statusCode === '403' ||
                                    (uploadError as { status?: number }).status === 403) {
                                    console.error('[AuthService] ❌❌❌ ERRO DE VERIFICAÇÃO DE ASSINATURA ❌❌❌');
                                    console.error('[AuthService] Possíveis causas:');
                                    console.error('[AuthService] 1. SUPABASE_SERVICE_ROLE_KEY está incorreta ou não corresponde ao projeto');
                                    console.error('[AuthService] 2. SUPABASE_URL não corresponde ao projeto da SERVICE_ROLE_KEY');
                                    console.error('[AuthService] 3. O bucket não existe ou não tem permissões corretas');
                                    console.error('[AuthService] 4. A SERVICE_ROLE_KEY não tem permissões de Storage');
                                    console.error('[AuthService] Solução: Verifique as variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
                                    console.error('[AuthService] Bucket usado:', bucketName);
                                }
                            } else {
                                // Sempre usa public URL (bucket deve ter política pública configurada)
                                const { data: urlData } = bucket.getPublicUrl(filePath);
                                publicUrl = urlData?.publicUrl || '';
                            }
                        } else {
                            uploadStatus = 'invalid_file';
                        }
                    } catch (err) {
                        uploadStatus = 'exception';
                        console.error('Erro ao processar upload do documento:', err);
                    }

                    // Sempre grava na tabela, mesmo que o upload falhe
                    try {
                        await this.createPsychologistDocument({
                            professionalProfileId,
                            url: publicUrl,
                            type,
                            description: file?.description || '',
                        });
                    } catch (err) {
                        uploadStatus = 'exception';
                        console.error('❌ Erro ao gravar documento na tabela PsychologistDocument:', err);
                    }
                    results.push({ uploadStatus, fileName, type });
                })
            );
        }
        return results;
    }

    private sanitizeFilename(name: string): string {
        // Remove diretórios, normaliza espaços, limita tamanho e remove caracteres inseguros
        const base = (name || '').split(/[\\/]/).pop() || '';
        const withoutAccents = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
        const cleaned = withoutAccents.replace(/[^a-zA-Z0-9._-]/g, '_');
        // Evita nomes absurdamente longos que podem quebrar providers
        return cleaned.slice(0, 120);
    }

    // ========================
    // Validações do cadastro de Psicólogo
    // ========================
    private validatePsychologistRegistrationInput(userData: Record<string, unknown>, files?: Express.Multer.File[]): { ok: boolean; message?: string } {
        const errors: string[] = [];

        // Identifica o tipo de pessoa (Autônomo ou Jurídico)
        const tipoRaw = (userData?.TipoPessoaJuridico ?? '').toString().trim().toLowerCase();
        const isAutonomo = tipoRaw === 'autonomo';
        const isJuridico = tipoRaw === 'juridico';

        // Campos obrigatórios básicos (comuns a todos)
        const requiredFields: Array<{ key: string; label: string }> = [
            { key: 'nome', label: 'Nome' },
            { key: 'email', label: 'Email' },
            { key: 'crp', label: 'CRP' },
            { key: 'telefone', label: 'Telefone' },
            { key: 'cep', label: 'CEP' },
            { key: 'endereco', label: 'Endereço' },
            { key: 'numero', label: 'Número' },
            { key: 'bairro', label: 'Bairro' },
            { key: 'cidade', label: 'Cidade' },
            { key: 'estado', label: 'Estado' },
            { key: 'password', label: 'Senha' },
            { key: 'confirmarSenha', label: 'Confirmar Senha' },
        ];

        // Campos específicos para Autônomo
        if (isAutonomo) {
            requiredFields.push(
                { key: 'cpf', label: 'CPF' },
                { key: 'dataNascimento', label: 'Data de Nascimento' },
                { key: 'sexo', label: 'Sexo' },
                { key: 'pronome', label: 'Pronome' }
            );
        }

        // Campos específicos para Jurídico
        if (isJuridico) {
            requiredFields.push(
                { key: 'cnpj', label: 'CNPJ' },
                { key: 'razaoSocial', label: 'Razão Social' },
                { key: 'cepEmpresa', label: 'CEP Empresa' },
                { key: 'enderecoEmpresa', label: 'Endereço Empresa' },
                { key: 'numeroEmpresa', label: 'Número Empresa' },
                { key: 'bairroEmpresa', label: 'Bairro Empresa' },
                { key: 'cidadeEmpresa', label: 'Cidade Empresa' },
                { key: 'estadoEmpresa', label: 'Estado Empresa' }
            );
        }

        requiredFields.forEach(({ key, label }) => {
            if (userData[key] === undefined || userData[key] === null || String(userData[key]).trim() === '') {
                errors.push(`${label} é obrigatório`);
            }
        });

        // Conferência de senha
        if (userData.password && userData.confirmarSenha && userData.password !== userData.confirmarSenha) {
            errors.push('Senha e Confirmar Senha não conferem');
        }

        // Termos e privacidade precisam ser aceitos
        const terms = this.toBoolean(userData.termosAceitos ?? userData.termsAccepted);
        const privacy = this.toBoolean(userData.privacyAccepted ?? false);
        if (!terms) errors.push('É necessário aceitar os Termos de Uso');
        if (!privacy) errors.push('É necessário aceitar a Política de Privacidade');

        // Validações específicas para Autônomo
        if (isAutonomo) {
            // Data válida
            if (userData.dataNascimento) {
                const dataNascInput = userData.dataNascimento;
                const d = typeof dataNascInput === 'string' || dataNascInput instanceof Date || typeof dataNascInput === 'number'
                    ? new Date(dataNascInput)
                    : new Date(String(dataNascInput));
                if (!this.isValidDate(d)) errors.push('Data de Nascimento inválida');
            }

            // Sexo normalizado
            const sx = this.normalizeSexo(userData.sexo as string);
            if (!sx) errors.push('Sexo inválido');

            // Pronome válido
            const pron = this.normalizePronome(userData.pronome as string);
            if (!pron) errors.push('Pronome inválido. Ex.: EleDele, ElaDela, EluDelu, Dr, Dra...');
        }

        // Documentos obrigatórios por tipo
        const presentDocs = new Set<string>((files || []).map((f: Express.Multer.File) => (f?.fieldname || '').toString()));

        if (isAutonomo) {
            // Autônomo (2 obrigatórios: CRP e RG/CPF)
            // Opcionais: comprovanteEndereco e comprovacaoIss
            const missing: string[] = [];
            if (!(presentDocs.has('crpDocumento'))) missing.push('crpDocumento');
            if (!(presentDocs.has('rgDocumento') || presentDocs.has('rgCpfDocumento'))) missing.push('rgDocumento');
            // comprovanteEndereco e comprovacaoIss são opcionais
            if (missing.length > 0) errors.push(`Documentos obrigatórios ausentes (Autônomo): ${missing.join(', ')}`);
        } else if (isJuridico) {
            // Jurídico (apenas 3 obrigatórios no pré-cadastro)
            const missing: string[] = [];
            if (!(presentDocs.has('rgDocumento') || presentDocs.has('rgCpfDocumento'))) missing.push('rgDocumento'); // RG/CPF Representante
            if (!presentDocs.has('crpDocumento')) missing.push('crpDocumento');
            if (!presentDocs.has('cartaoCnpjDocumento')) missing.push('cartaoCnpjDocumento');
            // Documentos opcionais: rgCpfSocioDocumento, contratoSocialDocumento, comprovanteEndEmpresaDocumento, simplesNacionalDocumento
            if (missing.length > 0) errors.push(`Documentos obrigatórios ausentes (Jurídico): ${missing.join(', ')}`);
        } else {
            // Fallback genérico
            const missing: string[] = [];
            if (!presentDocs.has('crpDocumento')) missing.push('crpDocumento');
            if (!(presentDocs.has('rgDocumento') || presentDocs.has('rgCpfDocumento'))) missing.push('rgDocumento');
            if (!(presentDocs.has('comprovanteEndereco') || presentDocs.has('comprovanteEndEmpresaDocumento'))) missing.push('comprovanteEndereco');
            if (missing.length > 0) errors.push(`Documentos obrigatórios ausentes: ${missing.join(', ')}`);
        }

        // Tipos de arquivo aceitos e tamanho máximo (2MB)
        if (Array.isArray(files) && files.length > 0) {
            const MAX_SIZE = 2 * 1024 * 1024; // 2MB
            const allowedExt = new Set(['pdf', 'docx', 'png', 'jpg', 'jpeg']);
            const allowedMime = new Set([
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'image/png',
                'image/jpeg'
            ]);

            for (const f of files) {
                const name: string = f?.originalname || (f as { filename?: string }).filename || '';
                const ext = (name.split('.').pop() || '').toLowerCase();
                const mimetype: string = f?.mimetype || '';
                const size: number = typeof f?.size === 'number' ? f.size : (f?.buffer?.length || 0);

                // valida tipo
                const typeOk = (ext && allowedExt.has(ext)) || (mimetype && allowedMime.has(mimetype));
                if (!typeOk) {
                    errors.push(`Arquivo inválido (tipo não permitido): ${name || '(sem nome)'} - aceitos: PDF, DOCX, PNG, JPG`);
                }

                // valida tamanho
                if (size > MAX_SIZE) {
                    errors.push(`Arquivo excede o tamanho máximo de 2MB: ${name || '(sem nome)'} (${(size / (1024 * 1024)).toFixed(2)}MB)`);
                }
            }
        }

        if (errors.length > 0) return { ok: false, message: errors.join(' | ') };
        return { ok: true };
    }

    // ========================
    // FALLBACK: Extrai arquivos do corpo JSON (base64 / dataURL)
    // ========================
    private extractFilesFromJsonBody(userData: Record<string, unknown>): Array<{
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        fieldname: string;
        description?: string;
    }> {
        const fileFields = [
            'crpDocumento',
            'rgCpfDocumento',
            'cartaoCnpjDocumento',
            'contratoSocialDocumento',
            'comprovanteEndEmpresaDocumento',
            'rgCpfSocioDocumento',
            'rgDocumento',
            'comprovanteEndereco',
            'simplesNacionalDocumento',
            'comprovacaoIss',
        ];

        const results: Array<{ buffer: Buffer; originalname: string; mimetype: string; fieldname: string; description?: string; }> = [];

        for (const field of fileFields) {
            const value = userData[field];
            if (!value) continue;

            try {
                const parsed = this.parseJsonFileValue(field, value, userData);
                if (parsed) results.push(parsed);
            } catch (err) {
                console.warn(`⚠️ [FALLBACK] Não foi possível extrair arquivo de ${field}:`, err);
            }
        }
        return results;
    }

    private parseJsonFileValue(
        fieldname: string,
        value: unknown,
        body: Record<string, unknown>
    ): { buffer: Buffer; originalname: string; mimetype: string; fieldname: string; description?: string } | null {
        // Formatos aceitos:
        // 1) string dataURL: "data:application/pdf;base64,...."
        // 2) string base64 pura (sem prefixo) + nome em <fieldname>Name ou <fieldname>FileName
        // 3) objeto { data: string(base64|dataURL), name?: string, mimetype?: string, description?: string }

        let dataStr: string | null = null;
        let name: string | undefined = undefined;
        let mimetype: string | undefined = undefined;
        let description: string | undefined = undefined;

        if (typeof value === 'string') {
            dataStr = value;
        } else if (value && typeof value === 'object' && value !== null) {
            const obj = value as Record<string, unknown>;
            dataStr = (typeof obj.data === 'string' ? obj.data : typeof obj.base64 === 'string' ? obj.base64 : typeof obj.content === 'string' ? obj.content : null);
            name = (typeof obj.name === 'string' ? obj.name : typeof obj.filename === 'string' ? obj.filename : undefined);
            mimetype = (typeof obj.mimetype === 'string' ? obj.mimetype : typeof obj.type === 'string' ? obj.type : undefined);
            description = (typeof obj.description === 'string' ? obj.description : undefined);
        }

        if (!dataStr) {
            // tenta achar nome/mimetype auxiliares
            const nameField = body?.[`${fieldname}Name`] || body?.[`${fieldname}FileName`];
            const mimeField = body?.[`${fieldname}Mime`] || body?.[`${fieldname}Type`];
            name = name || (typeof nameField === 'string' ? nameField : `${fieldname}.bin`);
            mimetype = mimetype || (typeof mimeField === 'string' ? mimeField : 'application/octet-stream');
            return null; // sem dados binários, não cria arquivo
        }

        // Se veio dataURL
        let buffer: Buffer | null = null;
        if (/^data:[^;]+;base64,/.test(dataStr)) {
            const match = dataStr.match(/^data:([^;]+);base64,(.*)$/);
            if (match) {
                mimetype = mimetype || match[1];
                buffer = Buffer.from(match[2], 'base64');
            }
        } else if (dataStr.includes('base64,')) {
            // tentativa genérica
            const parts = dataStr.split('base64,');
            const b64 = parts[1] || '';
            buffer = Buffer.from(b64, 'base64');
        } else {
            // base64 puro
            try {
                buffer = Buffer.from(dataStr, 'base64');
            } catch {
                buffer = null;
            }
        }

        if (!buffer || buffer.length === 0) return null;

        // Deriva mimetype pelo nome se necessário
        const nameField = body?.[`${fieldname}Name`];
        name = name || (typeof nameField === 'string' ? nameField : `${fieldname}.bin`);
        if (!mimetype) mimetype = this.mimetypeFromName(name as string);

        return {
            buffer,
            originalname: name as string,
            mimetype,
            fieldname,
            description,
        };
    }

    private mimetypeFromName(name: string): string {
        const ext = (name.split('.').pop() || '').toLowerCase();
        const map: Record<string, string> = {
            pdf: 'application/pdf',
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            webp: 'image/webp',
            heic: 'image/heic',
        };
        return map[ext] || 'application/octet-stream';
    }

    // ========================
    // FLUXO DEFAULT
    // ========================

    private async registerDefaultUser(userData: Record<string, unknown>, hashedPassword: string) {
        const start = Date.now();
        const registerData: RegisterInput = {
            nome: typeof userData.nome === 'string' ? userData.nome : '',
            cpf: typeof userData.cpf === 'string' ? userData.cpf : '',
            email: typeof userData.email === 'string' ? userData.email : '',
            telefone: typeof userData.telefone === 'string' ? userData.telefone : '',
            role: typeof userData.role === 'string' ? userData.role : 'Patient',
            password: hashedPassword,
            termsAccepted: this.toBoolean(userData.termsAccepted),
            privacyAccepted: this.toBoolean(userData.privacyAccepted),
        };
        const newUser = await this.createUser(registerData);
        // Envia o e-mail de boas-vindas de forma assíncrona, sem bloquear a resposta
        const userEmail = typeof userData.email === 'string' ? userData.email : '';
        const userName = typeof userData.nome === 'string' ? userData.nome : '';
        if (userEmail && userName) {
            this.emailService.sendWelcomeEmail(userEmail, userName)
                .catch((err: unknown) => {
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    console.error('Erro ao enviar e-mail de boas-vindas:', errorMessage);
                });
        }
        const elapsed = Date.now() - start;
        if (elapsed > 1000) {
            console.warn(`registerDefaultUser demorou ${elapsed}ms`);
        }
        return this.successResponse(newUser);
    }

    // ========================
    // UTILITÁRIOS

    private mapToPrismaSexo(sexo: 'MASCULINO' | 'FEMININO' | 'NAO_BINARIO' | 'PREFIRO_NAO_DECLARAR' | null): string | null {
        const map: { [key: string]: string } = {
            MASCULINO: 'Masculino',
            FEMININO: 'Feminino',
            NAO_BINARIO: 'Nao_Binario',
            PREFIRO_NAO_DECLARAR: 'Prefiro_Nao_Declarar'
        };
        return sexo ? map[sexo] || null : null;
    }

    private normalizePronome(pronome: string): string | null {
        if (!pronome) return null;
        const map: { [key: string]: string } = {
            'eledele': 'EleDele',
            'ele/dele': 'EleDele',
            'eladela': 'ElaDela',
            'ela/dela': 'ElaDela',
            'elesdeles': 'ElesDeles',
            'eles/deles': 'ElesDeles',
            'elasdelas': 'ElasDelas',
            'elas/delas': 'ElasDelas',
            'eludelu': 'EluDelu',
            'elu/delu': 'EluDelu',
            'outro': 'Outro',
            'dr': 'Dr',
            'dra': 'Dra',
            'psic': 'Psic',
            'prof': 'Prof',
            'mestre': 'Mestre',
            'phd': 'Phd',
        };
        const key = pronome.trim().toLowerCase().replace(/[\s\/]/g, '');
        return map[key] || null;
    }
    // ========================

    private normalizeSexo(sexo: string): 'MASCULINO' | 'FEMININO' | 'NAO_BINARIO' | 'PREFIRO_NAO_DECLARAR' | null {
        const map: { [key: string]: string } = {
            MASCULINO: 'MASCULINO',
            FEMININO: 'FEMININO',
            MASCULINA: 'MASCULINO',
            FEMININA: 'FEMININO',
            NAO_BINARIO: 'NAO_BINARIO',
            PREFIRO_NAO_DECLARAR: 'PREFIRO_NAO_DECLARAR',
        };
        const key = (sexo || '').trim().toUpperCase();
        return (map[key] as 'MASCULINO' | 'FEMININO' | 'NAO_BINARIO' | 'PREFIRO_NAO_DECLARAR') || null;
    }

    private successResponse(user: User, message = 'Usuário registrado com sucesso.') {
        const { Password, ...safeUser } = user;
        return { success: true, message, user: { ...safeUser, Password: '' } };
    }

    // ========================
    // OUTROS MÉTODOS 
    // ========================

    async login(
        identifier: string,
        password: string,
        ip?: string,
        userAgent?: string
    ): Promise<{ success: boolean; message: string; user?: User; userId?: string }> {
        let user: User | null = null;
        let success = false;
        let message = '';
        const fail = (msg: string) => ({ success: false, message: msg, userId: user?.Id });
        try {
            // Debug: Log da DATABASE_URL (sem senha) para comparar com local
            if (process.env.DATABASE_URL) {
                try {
                    const dbUrl = new URL(process.env.DATABASE_URL);
                    const safeUrl = `${dbUrl.protocol}//${dbUrl.username}:***@${dbUrl.hostname}:${dbUrl.port}${dbUrl.pathname}${dbUrl.search}`;
                    console.log('[LOGIN] 🔍 DATABASE_URL (sem senha):', safeUrl);
                } catch (e) {
                    console.log('[LOGIN] 🔍 DATABASE_URL (formato não-URL):', process.env.DATABASE_URL?.substring(0, 50) + '...');
                }
            }

            if (!identifier || !password) {
                message = 'Por favor, preencha todos os campos obrigatórios.';
                return fail(message);
            }

            const originalIdentifier = identifier;
            // Para CRP, normaliza removendo caracteres especiais antes da busca
            // Isso garante que "06/98765" seja normalizado para "0698765" antes de buscar
            const isEmailLogin = identifier.includes('@');
            const normalizedForSearch = isEmailLogin
                ? identifier.toLowerCase().trim()
                : this.normalizeCrp(identifier);

            identifier = this.formatNumericIdentifier(identifier);
            console.log('[LOGIN] Identifier após normalização:', {
                original: originalIdentifier,
                normalizedForSearch: normalizedForSearch,
                formatted: identifier,
                isEmail: isEmailLogin
            });
            // Usa o identifier normalizado para busca se não for email
            const searchIdentifier = isEmailLogin ? identifier : normalizedForSearch;
            user = await this.findUserByIdentifier(searchIdentifier);
            if (!user) {
                message = 'Usuário não cadastrado em nossa plataforma.';
                return { success: false, message };
            }

            // Log para verificar se o user.Id está presente
            console.log('[LOGIN] Usuário encontrado:', {
                Id: user.Id,
                Email: user.Email,
                hasId: !!user.Id,
                idType: typeof user.Id,
                idValue: user.Id || 'NULL/UNDEFINED'
            });

            // IMPORTANTE: Usa a senha EXATAMENTE como vem, sem normalização
            // Isso garante que seja tratada da mesma forma que no register e reset
            // O register usa userData.password diretamente, sem trim ou normalização
            const passwordToCompare = password;

            // Logs seguros (apenas flags booleanas, nunca a senha em si)
            if (process.env.NODE_ENV !== 'production') {
                console.log('[LOGIN] Tentativa de login para:', user.Email);
                console.log('[LOGIN] Senha recebida: [REDACTED]');
                console.log('[LOGIN] Tamanho da senha:', passwordToCompare.length);
            }

            // Valida que o hash no banco está completo (bcrypt sempre tem 60 caracteres)
            if (!user.Password || user.Password.length !== 60) {
                console.error('[LOGIN] ERRO: Hash no banco está incompleto ou inválido!');
                console.error('[LOGIN] Tamanho do hash:', user.Password?.length, 'Esperado: 60');
                // NUNCA logar o hash em si
                message = 'Usuário ou senha incorretos.';
                return fail(message);
            }

            // Garante que o hash seja uma string pura
            const cleanHash = String(user.Password).trim();

            // Logs seguros (nunca logar o hash completo)
            if (process.env.NODE_ENV !== 'production') {
                console.log('[LOGIN] Hash válido:', cleanHash.length === 60);
                console.log('[LOGIN] Hash começa com:', cleanHash.substring(0, 2)); // Apenas prefixo
            }

            // Testa a comparação com a senha exatamente como foi recebida
            let isMatch = await bcrypt.compare(passwordToCompare, cleanHash);
            console.log('[LOGIN] Resultado da comparação bcrypt (senha original):', isMatch);

            // Se falhar, tenta com variações da senha (igual ao reset)
            if (!isMatch) {
                // Tenta com trim
                const trimmedPassword = password.trim();
                isMatch = await bcrypt.compare(trimmedPassword, cleanHash);
                console.log('[LOGIN] Teste com senha após trim():', isMatch);

                // Se ainda não funcionar, tenta sem espaços
                if (!isMatch) {
                    const noSpacesPassword = password.replace(/\s/g, '');
                    isMatch = await bcrypt.compare(noSpacesPassword, cleanHash);
                    console.log('[LOGIN] Teste sem espaços:', isMatch);
                }
            }

            if (!isMatch) {
                message = 'Usuário ou senha incorretos.';
                return fail(message);
            }

            // Validação de tipo de identificador usado no login
            if (user.Role === 'Psychologist') {
                // Para psicólogos, aceita CRP (com ou sem formatação)
                // Normaliza removendo caracteres especiais (/, -, espaços) e compara apenas alfanuméricos
                const normalizedCrp = this.normalizeCrp(user.Crp || '');
                // Usa o identifier original (antes de formatNumericIdentifier) para normalização
                const normalizedIdentifier = this.normalizeCrp(originalIdentifier);
                const isEmail = originalIdentifier.includes('@');

                // Verifica se o identificador normalizado corresponde exatamente ao CRP normalizado
                // Exemplo: banco tem "06/98765" -> normaliza para "0698765"
                // Login vem "0698765" -> normaliza para "0698765"
                // Compara: "0698765" === "0698765" ✓
                // Ou: Login vem "06/98765" -> normaliza para "0698765"
                // Compara: "0698765" === "0698765" ✓
                const isCrpMatch = normalizedCrp === normalizedIdentifier && normalizedCrp.length > 0;

                if (!isCrpMatch && !isEmail) {
                    message = 'Psicólogo deve fazer login com CRP ou email cadastrado.';
                    return fail(message);
                }
            }

            if ((user.Role === 'Admin' || user.Role === 'Patient') && user.Email !== identifier && user.Telefone !== identifier) {
                message = 'Paciente deve fazer login com email ou telefone cadastrado.';
                return fail(message);
            }

            const statusKey = String(user.Status || '')
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toUpperCase()
                .replace(/[^A-Z]/g, "");
            if (statusKey === "INATIVO") {
                message = "Você não tem acesso à plataforma. Entre em contato com o suporte.";
                return fail(message);
            }

            const { Password: _password, ...userWithoutPassword } = user;

            // 2. Atualizar último login
            await prisma.user.update({
                where: { Id: user.Id },
                data: { LastLogin: new Date() }
            });

            success = true;
            message = 'Login bem-sucedido';

            // Log de login bem-sucedido
            await prisma.loginLog.create({
                data: {
                    UserId: user.Id,
                    Email: user.Email,
                    Ip: ip,
                    UserAgent: userAgent,
                    Success: true,
                    Message: message,
                }
            });

            return {
                success: true,
                message,
                user: {
                    ...userWithoutPassword,
                    Password: '',
                }
            };
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            // Log de login com erro
            await prisma.loginLog.create({
                data: {
                    UserId: user?.Id ?? '',
                    Email: user?.Email ?? identifier,
                    Ip: ip,
                    UserAgent: userAgent,
                    Success: false,
                    Message: errorMessage || 'Erro desconhecido no login',
                }
            });
            return { success: false, message: 'Erro interno ao tentar login.', userId: user?.Id };
        }
    }

    async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
        const user = await prisma.user.findUnique({ where: { Email: email } });
        if (!user) {
            return { success: false, message: 'Atenção, usuário não cadastrado. Por favor verifique as informações inseridas e tente novamente!' };
        }
        const resetCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await this.updateResetToken(user.Id, resetCode);

        // Envia email de reset de senha via EmailService (não transacional)
        console.log('[AuthService] 📧 Disparando email de reset de senha...');
        console.log('[AuthService] Email:', user.Email);
        console.log('[AuthService] Template: resetPassword');
        console.log('[AuthService] Código de reset:', resetCode);

        try {
            await this.emailService.sendResetPasswordEmail(user.Email, user.Nome, resetCode);
            console.log('[AuthService] ✅ Email de reset de senha enviado com sucesso');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error('[AuthService] ❌ Erro ao enviar e-mail de redefinição de senha:', errorMessage);
        }

        try {
            await this.smsService.sendResetCode(user.Telefone, resetCode);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error('[AuthService] Erro ao enviar SMS de redefinição de senha:', errorMessage);
        }

        try {
            await this.whatsAppService.sendResetCode(user.Telefone, resetCode);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error('[AuthService] Erro ao enviar WhatsApp de redefinição de senha:', errorMessage);
        }

        return { success: true, message: 'E-mail de redefinição de senha enviado! Verifique sua caixa de entrada.' };
    }

    async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
        const user = await this.findUserByResetToken(token);
        if (!user) {
            return { success: false, message: 'Atenção, usuário não cadastrado. Por favor verifique as informações inseridas e tente novamente!' };
        }

        // Valida se a senha foi fornecida
        if (!newPassword || typeof newPassword !== 'string' || !newPassword.trim()) {
            return { success: false, message: 'Atenção, senha é obrigatória.' };
        }

        // IMPORTANTE: Usa a senha EXATAMENTE como vem do request, sem nenhuma modificação
        // Isso garante que seja tratada da mesma forma que no register
        const passwordToHash = newPassword;

        console.log('[RESET_PASSWORD] ========================================');
        console.log('[RESET_PASSWORD] Senha recebida:', JSON.stringify(passwordToHash));
        console.log('[RESET_PASSWORD] Tamanho:', passwordToHash.length);
        console.log('[RESET_PASSWORD] Bytes:', Array.from(passwordToHash).map(c => c.charCodeAt(0)));

        // Gera o hash usando o mesmo método do register
        const hashedPassword = await this.hashPassword(passwordToHash);

        if (!hashedPassword || hashedPassword.length !== 60) {
            console.error('[RESET_PASSWORD] ERRO: Hash inválido!');
            return { success: false, message: 'Erro ao processar a nova senha. Tente novamente.' };
        }

        console.log('[RESET_PASSWORD] Hash gerado:', hashedPassword);
        console.log('[RESET_PASSWORD] Tamanho do hash:', hashedPassword.length);

        // Salva a senha no banco
        await prisma.user.update({
            where: { Id: user.Id },
            data: {
                Password: hashedPassword,
                ResetPasswordToken: null
            }
        });

        // CRÍTICO: Testa imediatamente se a senha funciona fazendo um login de teste
        const verifyUser = await prisma.user.findUnique({ where: { Id: user.Id } });
        if (!verifyUser) {
            return { success: false, message: 'Erro ao verificar a senha salva.' };
        }

        console.log('[RESET_PASSWORD] Hash salvo no banco:', verifyUser.Password);
        console.log('[RESET_PASSWORD] Hash gerado === Hash salvo?', hashedPassword === verifyUser.Password);

        // Testa a comparação com a senha original
        const testCompare = await bcrypt.compare(passwordToHash, verifyUser.Password);
        console.log('[RESET_PASSWORD] Teste de comparação (senha original vs hash salvo):', testCompare);

        // Se não funcionar, tenta com variações da senha para identificar o problema
        if (!testCompare) {
            console.error('[RESET_PASSWORD] ❌ ERRO: Comparação falhou!');

            // Testa com senha após trim
            const trimmedPassword = passwordToHash.trim();
            const testTrimmed = await bcrypt.compare(trimmedPassword, verifyUser.Password);
            console.log('[RESET_PASSWORD] Teste com senha trim():', testTrimmed, 'Senha:', JSON.stringify(trimmedPassword));

            // Testa com senha sem espaços
            const noSpacesPassword = passwordToHash.replace(/\s/g, '');
            const testNoSpaces = await bcrypt.compare(noSpacesPassword, verifyUser.Password);
            console.log('[RESET_PASSWORD] Teste sem espaços:', testNoSpaces, 'Senha:', JSON.stringify(noSpacesPassword));

            // Se nenhuma funcionar, retorna erro
            if (!testTrimmed && !testNoSpaces) {
                console.error('[RESET_PASSWORD] ❌ Nenhuma variação da senha funcionou!');
                return { success: false, message: 'Erro ao salvar a nova senha. Tente novamente.' };
            }

            // Se alguma funcionar, atualiza com a versão correta
            if (testTrimmed && trimmedPassword !== passwordToHash) {
                console.log('[RESET_PASSWORD] ✅ Senha com trim() funciona! Atualizando...');
                const correctedHash = await this.hashPassword(trimmedPassword);
                if (correctedHash) {
                    await prisma.user.update({
                        where: { Id: user.Id },
                        data: { Password: correctedHash }
                    });
                    console.log('[RESET_PASSWORD] ✅ Senha corrigida e salva!');
                }
            } else if (testNoSpaces && noSpacesPassword !== passwordToHash) {
                console.log('[RESET_PASSWORD] ✅ Senha sem espaços funciona! Atualizando...');
                const correctedHash = await this.hashPassword(noSpacesPassword);
                if (correctedHash) {
                    await prisma.user.update({
                        where: { Id: user.Id },
                        data: { Password: correctedHash }
                    });
                    console.log('[RESET_PASSWORD] ✅ Senha corrigida e salva!');
                }
            }
        } else {
            console.log('[RESET_PASSWORD] ✅ Senha salva e verificada com sucesso!');
        }

        await this.emailService.sendPasswordResetConfirmation(user.Email, user.Nome);
        return { success: true, message: 'Senha redefinida com sucesso.' };
    }

    async getAuthenticatedUser(token: string): Promise<{ success: boolean; message: string; user?: User }> {
        if (!token) {
            return { success: false, message: 'Token de autenticação não encontrado' };
        }

        let userId: string | null = null;
        try {
            const decoded: unknown = verifyToken(token);
            if (decoded === null || typeof decoded !== 'object') {
                return { success: false, message: 'Token inválido' };
            }
            const payload = decoded as { userId?: unknown };
            if (typeof payload.userId !== 'string' || !payload.userId.trim()) {
                return { success: false, message: 'Token inválido' };
            }
            userId = payload.userId.trim();
        } catch (err) {
            return { success: false, message: 'Token inválido' };
        }

        const invalidIds = ['undefined', 'null', ''];
        if (!userId || invalidIds.includes(userId)) {
            return { success: false, message: 'Token inválido' };
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
            return { success: false, message: 'Token inválido' };
        }

        let user;
        try {
            user = await prisma.user.findUnique({ where: { Id: userId } });
        } catch (err) {
            console.error('[getAuthenticatedUser] Erro ao buscar usuário:', err);
            return { success: false, message: 'Erro ao validar autenticação' };
        }
        if (!user) {
            return { success: false, message: 'Usuário não encontrado' };
        }
        const { Password: _, ...userWithoutPassword } = user;

        const normalizeStatus = (status: string):
            | "Ativo"
            | "Em Análise"
            | "Pendente Documentação"
            | "Análise Contrato"
            | "Inativo"
            | "Reprovado"
            | "Descredenciado Voluntário"
            | "Descredenciado Involuntário"
            | "Bloqueado"
            | "Pendente"
            | "Deletado"
            | "Em Análise Contrato" => {
            const map: { [key: string]:
                | "Ativo"
                | "Em Análise"
                | "Pendente Documentação"
                | "Análise Contrato"
                | "Inativo"
                | "Reprovado"
                | "Descredenciado Voluntário"
                | "Descredenciado Involuntário"
                | "Bloqueado"
                | "Pendente"
                | "Deletado"
                | "Em Análise Contrato" } = {
                'ATIVO': 'Ativo',
                'Ativo': 'Ativo',
                'EM_ANALISE': 'Em Análise',
                'EmAnalise': 'Em Análise',
                'Em Análise': 'Em Análise',
                'PENDENTE_DOCUMENTACAO': 'Pendente Documentação',
                'PendenteDocumentacao': 'Pendente Documentação',
                'Pendente Documentação': 'Pendente Documentação',
                'ANALISE_CONTRATO': 'Análise Contrato',
                'AnaliseContrato': 'Análise Contrato',
                'Análise Contrato': 'Análise Contrato',
                'INATIVO': 'Inativo',
                'Inativo': 'Inativo',
                'REPROVADO': 'Reprovado',
                'Reprovado': 'Reprovado',
                'DESCREDENCIADOVOLUNTARIO': 'Descredenciado Voluntário',
                'DescredenciadoVoluntario': 'Descredenciado Voluntário',
                'Descredenciado Voluntário': 'Descredenciado Voluntário',
                'DESCREDENCIADOINVOLUNTARIO': 'Descredenciado Involuntário',
                'DescredenciadoInvoluntario': 'Descredenciado Involuntário',
                'Descredenciado Involuntário': 'Descredenciado Involuntário',
                'BLOQUEADO': 'Bloqueado',
                'Bloqueado': 'Bloqueado',
                'PENDENTE': 'Pendente',
                'Pendente': 'Pendente',
                'DELETADO': 'Deletado',
                'Deletado': 'Deletado',
                'EM_ANALISE_CONTRATO': 'Em Análise Contrato',
                'EmAnaliseContrato': 'Em Análise Contrato',
                'Em Análise Contrato': 'Em Análise Contrato'
            };
            return map[status] || 'Pendente';
        };

        const mappedUser: User = {
            Id: user.Id,
            Nome: user.Nome,
            Email: user.Email,
            Cpf: user.Cpf,
            Crp: user.Crp,
            GoogleId: user.GoogleId,
            Telefone: user.Telefone,
            DataNascimento: user.DataNascimento,
            Sexo: this.mapToUserSexo(user.Sexo as string),
            Role: user.Role,
            TermsAccepted: user.TermsAccepted,
            PrivacyAccepted: user.PrivacyAccepted,
            VindiCustomerId: user.VindiCustomerId,
            Status: normalizeStatus(user.Status),
            CreatedAt: user.CreatedAt,
            UpdatedAt: user.UpdatedAt,
            Password: ''
        };

        return {
            success: true,
            message: 'Usuário autenticado',
            user: mappedUser
        };
    }

    // ========================
    // NOVOS MÉTODOS
    // ========================
    async createPessoaJuridica(data: PessoaJuridicaInput): Promise<string | null> {
        if (!data || !data.psicologoId || !data.razaoSocial) return null;
        const pessoaJuridica = await prisma.pessoalJuridica.create({
            data: {
                PsicologoId: data.psicologoId,
                CNPJ: data.cnpj,
                RazaoSocial: data.razaoSocial,
                NomeFantasia: data.nomeFantasia,
                InscricaoEstadual: data.inscricaoEstadual,
                SimplesNacional: typeof data.simplesNacional === 'boolean' ? data.simplesNacional : false,
            }
        });
        return pessoaJuridica.Id;
    }

    async createDadosBancarios(data: Record<string, unknown>): Promise<string | null> {
        if (!data || !data.pessoalJuridicaId || !data.chavePix) return null;
        const pessoalJuridicaId = typeof data.pessoalJuridicaId === 'string' ? data.pessoalJuridicaId : String(data.pessoalJuridicaId);
        const chavePix = typeof data.chavePix === 'string' ? data.chavePix : String(data.chavePix);
        const dadosBancarios = await prisma.dadosBancarios.create({
            data: {
                PessoalJuridicaId: pessoalJuridicaId,
                ChavePix: chavePix,
            }
        });
        return dadosBancarios.Id;
    }

    // ========================
    // Métodos implementados do IAuthService
    // ========================
    async createUser(data: RegisterInput): Promise<User> {
        // Função utilitária para validar datas
        function isValidDate(d: unknown): boolean {
            return d instanceof Date && !isNaN(d.getTime());
        }

        // Garante que DataNascimento seja null se for inválida
        let dataNascimento: Date | null = null;
        if (data.dataNascimento) {
            const dateObj = new Date(data.dataNascimento);
            dataNascimento = isValidDate(dateObj) ? dateObj : null;
        }

        // Validação adicional: Paciente deve ser maior de 18 anos
        if (data.role === 'Patient') {
            if (!dataNascimento) {
                throw new Error('Data de nascimento é obrigatória para pacientes.');
            }

            if (!this.isAdult(dataNascimento, 18)) {
                const idade = this.calculateAge(dataNascimento);
                throw new Error(`Paciente deve ter 18 anos ou mais. Idade atual: ${idade} anos.`);
            }
        }

        // Ajuste: Para psicólogo, usar cpf se existir, senão deixar vazio
        let cpfValue = '';
        if (data.role === 'Psychologist') {
            cpfValue = typeof data.cpf === 'string' && data.cpf ? data.cpf : '';
        } else {
            cpfValue = typeof data.cpf === 'string' && data.cpf ? data.cpf : '';
        }

        // Verifica se já existe usuário com o mesmo CPF antes de criar
        if (cpfValue) {
            const existingUser = await prisma.user.findFirst({
                where: { Cpf: cpfValue }
            });
            if (existingUser) {
                throw new Error('CPF já cadastrado.');
            }
        }

        const user = await prisma.user.create({
            data: {
                Nome: data.nome,
                Email: data.email,
                Cpf: cpfValue,
                Telefone: data.telefone,
                WhatsApp: (typeof data.whatsapp === 'string' ? data.whatsapp : null),
                Password: data.password,
                Role: data.role as 'Admin' | 'Patient' | 'Psychologist' | 'Management' | 'Finance',
                IsOnboard: this.toBoolean(data.IsOnboard),
                TermsAccepted: this.toBoolean(data.termsAccepted),
                PrivacyAccepted: this.toBoolean(data.privacyAccepted),
                Sexo: this.mapToPrismaSexo(this.normalizeSexo(data.sexo as string)) as 'Masculino' | 'Feminino' | 'NaoBinario' | 'PrefiroNaoDeclarar' | null,
                RacaCor: (typeof data.racaCor === 'string' && ['Branca', 'Preta', 'Parda', 'Amarela', 'Indigena', 'PrefiroNaoInformar'].includes(data.racaCor)) ? data.racaCor as 'Branca' | 'Preta' | 'Parda' | 'Amarela' | 'Indigena' | 'PrefiroNaoInformar' : null,
                DataNascimento: dataNascimento,
                VindiCustomerId: data.vindiCustomerId ?? null,
                Crp: data.crp,
                GoogleId: data.googleId,
                Pronome: this.normalizePronome(data.pronome as string) as 'EleDele' | 'ElaDela' | 'ElesDeles' | 'ElasDelas' | 'EluDelu' | 'Outro' | 'Dr' | 'Dra' | 'Psic' | 'Prof' | 'Mestre' | 'Phd' | null,
                // Força status "EmAnalise" para qualquer psicólogo
                Status: data.role === 'Psychologist' ? 'EmAnalise' : undefined,
            }
        });
        return user as unknown as User;
    }

    async findUserByIdentifier(identifier: string): Promise<User | null> {
        // Normaliza o identifier (trim e remove caracteres especiais para CRP)
        const normalizedIdentifier = identifier?.trim() || '';
        const isEmail = normalizedIdentifier.includes('@');

        // Extrai apenas dígitos para análise
        const onlyDigits = normalizedIdentifier.replace(/\D/g, '');
        const hasLetters = /[a-zA-Z]/.test(normalizedIdentifier);

        // Considera telefone apenas se:
        // - Não tem letras
        // - Tem apenas dígitos
        // - Tem entre 10-13 dígitos (formato brasileiro com/sem código país)
        const isPhone = !hasLetters &&
            /^\d+$/.test(normalizedIdentifier) &&
            onlyDigits.length >= 10 &&
            onlyDigits.length <= 13;

        // CRP pode ter letras, números, barras, hífens, até 12 caracteres alfanuméricos
        // Se não é email nem telefone, trata como CRP
        const isCrp = !isEmail && !isPhone;

        // Para CRP, normaliza removendo caracteres especiais e mantém apenas alfanuméricos
        // Para email: lowercase, para telefone: mantém
        const searchIdentifier = isEmail
            ? normalizedIdentifier.toLowerCase()
            : isCrp
                ? this.normalizeCrp(normalizedIdentifier)
                : normalizedIdentifier;

        console.log('[findUserByIdentifier] Buscando usuário:', {
            original: identifier,
            normalized: searchIdentifier,
            isEmail,
            isPhone,
            isCrp,
            hasLetters,
            identifierLength: identifier?.length,
            normalizedLength: searchIdentifier.length,
            onlyDigitsLength: onlyDigits.length
        });

        // Busca o usuário sem incluir Onboardings para evitar problemas com UserId NULL
        // Os Onboardings podem ser buscados separadamente se necessário
        // Para CRP, não faz busca direta pois pode ter caracteres especiais no banco
        let user = !isCrp ? await prisma.user.findFirst({
            where: {
                OR: [
                    { Email: searchIdentifier },
                    { Telefone: searchIdentifier }
                ]
            }
        }) : null;

        // Se não encontrou e é telefone/whatsapp, faz busca por número normalizado (apenas dígitos)
        if (!user && isPhone) {
            try {
                const onlyDigits = normalizedIdentifier.replace(/\D/g, '');
                // Tenta com país (55) e sem país
                const candidates: string[] = [onlyDigits];
                if (onlyDigits.startsWith('55')) {
                    candidates.push(onlyDigits.slice(2));
                }

                console.log('[findUserByIdentifier] 🔍 Busca por telefone/whatsapp normalizado:', {
                    original: normalizedIdentifier,
                    digits: onlyDigits,
                    candidates
                });

                // Busca usando normalização via regexp_replace para remover não-dígitos
                // 1ª tentativa: número como informado
                let byPhone = await prisma.$queryRaw<Array<{ Id: string; Telefone: string | null; WhatsApp: string | null }>>`
                    SELECT "Id", "Telefone", "WhatsApp"
                    FROM "public"."User"
                    WHERE regexp_replace(COALESCE("Telefone", ''), '\\D', '', 'g') = ${onlyDigits}
                       OR regexp_replace(COALESCE("WhatsApp", ''), '\\D', '', 'g') = ${onlyDigits}
                    LIMIT 1
                `;

                // 2ª tentativa: se tiver país (55), tenta sem ele
                if ((!byPhone || byPhone.length === 0) && onlyDigits.startsWith('55')) {
                    const withoutCountry = onlyDigits.slice(2);
                    byPhone = await prisma.$queryRaw<Array<{ Id: string; Telefone: string | null; WhatsApp: string | null }>>`
                        SELECT "Id", "Telefone", "WhatsApp"
                        FROM "public"."User"
                        WHERE regexp_replace(COALESCE("Telefone", ''), '\\D', '', 'g') = ${withoutCountry}
                           OR regexp_replace(COALESCE("WhatsApp", ''), '\\D', '', 'g') = ${withoutCountry}
                        LIMIT 1
                    `;
                }

                if (byPhone && byPhone.length > 0) {
                    user = await prisma.user.findUnique({ where: { Id: byPhone[0].Id } });
                    console.log('[findUserByIdentifier] ✅ Usuário encontrado via telefone/whatsapp normalizado:', {
                        Id: byPhone[0].Id,
                        TelefoneEncontrado: byPhone[0].Telefone,
                        WhatsAppEncontrado: byPhone[0].WhatsApp,
                    });
                } else {
                    console.log('[findUserByIdentifier] ❌ Nenhum usuário encontrado por telefone/whatsapp normalizado');
                }
            } catch (err) {
                console.error('[findUserByIdentifier] Erro na busca por telefone/whatsapp normalizado:', err);
            }
        }

        // Para CRP, sempre usa busca com remoção de caracteres especiais
        if (!user && isCrp) {
            // Valida que o CRP normalizado tenha no máximo 12 caracteres alfanuméricos
            if (searchIdentifier.length > 12) {
                console.log('[findUserByIdentifier] CRP excede 12 caracteres alfanuméricos:', {
                    searchIdentifier,
                    length: searchIdentifier.length
                });
                return null;
            }

            console.log('[findUserByIdentifier] Buscando CRP com normalização:', {
                searchIdentifier,
                length: searchIdentifier.length
            });
            try {
                // Busca removendo caracteres especiais tanto do banco quanto do input
                // searchIdentifier já vem normalizado (apenas alfanuméricos, uppercase)
                // Remove /, -, espaços e outros caracteres não alfanuméricos do banco
                const users = await prisma.$queryRaw<Array<{ Id: string; Crp: string }>>`
                    SELECT "Id", "Crp" 
                    FROM "public"."User" 
                    WHERE REGEXP_REPLACE(UPPER(COALESCE("Crp", '')), '[^A-Z0-9]', '', 'g') = ${searchIdentifier}
                    AND "Role" = 'Psychologist'
                    LIMIT 1
                `;

                if (users && users.length > 0) {
                    user = await prisma.user.findUnique({ where: { Id: users[0].Id } });
                    console.log('[findUserByIdentifier] ✅ Usuário encontrado via CRP:', {
                        foundCrp: users[0].Crp,
                        searchedCrp: searchIdentifier,
                        normalizedFoundCrp: this.normalizeCrp(users[0].Crp),
                        userId: users[0].Id
                    });
                } else {
                    console.log('[findUserByIdentifier] ❌ Nenhum usuário encontrado com CRP:', searchIdentifier);
                }
            } catch (error) {
                console.error('[findUserByIdentifier] Erro na busca para CRP:', error);
            }
        }

        // Se não encontrou e é email, tenta buscar com case-insensitive usando raw query
        if (!user && isEmail) {
            console.log('[findUserByIdentifier] Tentando busca case-insensitive para email');
            try {
                // Debug: Verifica informações da conexão
                try {
                    const dbInfo = await prisma.$queryRaw<Array<{ current_database: string; current_schema: string }>>`
                        SELECT current_database(), current_schema()
                    `;
                    console.log('[findUserByIdentifier] 🔍 Informações da conexão:', dbInfo);
                } catch (e) {
                    console.error('[findUserByIdentifier] Erro ao buscar info da conexão:', e);
                }

                // Verifica se a tabela User existe
                try {
                    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = 'User'
                        ) as exists
                    `;
                    console.log('[findUserByIdentifier] 🔍 Tabela User existe?', tableExists);
                } catch (e) {
                    console.error('[findUserByIdentifier] Erro ao verificar tabela:', e);
                }

                // Primeiro, verifica se há usuários no banco (para debug de conexão)
                const totalUsers = await prisma.user.count();
                console.log('[findUserByIdentifier] Total de usuários no banco (via Prisma):', totalUsers);

                // Tenta contar via raw query também
                try {
                    const rawCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
                        SELECT COUNT(*)::bigint as count FROM "public"."User"
                    `;
                    console.log('[findUserByIdentifier] Total de usuários no banco (via raw query):', rawCount);
                } catch (e) {
                    console.error('[findUserByIdentifier] Erro na raw query de contagem:', e);
                }

                // Verifica quais schemas existem e quais tabelas estão em cada schema
                try {
                    const schemas = await prisma.$queryRaw<Array<{ schema_name: string }>>`
                        SELECT schema_name 
                        FROM information_schema.schemata 
                        WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                        ORDER BY schema_name
                    `;
                    console.log('[findUserByIdentifier] 🔍 Schemas disponíveis:', schemas);

                    const tablesInPublic = await prisma.$queryRaw<Array<{ table_name: string }>>`
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name LIKE '%User%'
                        ORDER BY table_name
                    `;
                    console.log('[findUserByIdentifier] 🔍 Tabelas com "User" no schema public:', tablesInPublic);
                } catch (e) {
                    console.error('[findUserByIdentifier] Erro ao listar schemas/tabelas:', e);
                }

                // Tenta buscar diretamente o email usando raw query (sem especificar schema)
                try {
                    const directUser = await prisma.$queryRaw<Array<{ Id: string; Email: string; Nome: string }>>`
                        SELECT "Id", "Email", "Nome" 
                        FROM "User" 
                        WHERE "Email" = ${searchIdentifier}
                        LIMIT 1
                    `;
                    console.log('[findUserByIdentifier] 🔍 Busca direta por email (raw query, sem schema):', directUser);
                    if (directUser && directUser.length > 0) {
                        // Se encontrou via raw query, busca o usuário completo
                        user = await prisma.user.findUnique({
                            where: { Id: directUser[0].Id }
                        });
                        console.log('[findUserByIdentifier] ✅ Usuário encontrado via raw query direta!');
                    }
                } catch (e) {
                    console.error('[findUserByIdentifier] Erro na busca direta (sem schema):', e);
                    // Tenta com schema public explícito
                    try {
                        const directUserPublic = await prisma.$queryRaw<Array<{ Id: string; Email: string; Nome: string }>>`
                            SELECT "Id", "Email", "Nome" 
                            FROM "public"."User" 
                            WHERE "Email" = ${searchIdentifier}
                            LIMIT 1
                        `;
                        console.log('[findUserByIdentifier] 🔍 Busca direta por email (raw query, schema public):', directUserPublic);
                        if (directUserPublic && directUserPublic.length > 0) {
                            user = await prisma.user.findUnique({
                                where: { Id: directUserPublic[0].Id }
                            });
                            console.log('[findUserByIdentifier] ✅ Usuário encontrado via raw query com schema public!');
                        }
                    } catch (e2) {
                        console.error('[findUserByIdentifier] Erro na busca direta (com schema public):', e2);
                    }
                }

                // Busca com case-insensitive usando raw query
                const users = await prisma.$queryRaw<Array<{ Id: string; Email: string; Nome: string }>>`
                    SELECT "Id", "Email", "Nome" 
                    FROM "public"."User" 
                    WHERE LOWER("Email") = LOWER(${searchIdentifier})
                    LIMIT 1
                `;
                if (users && users.length > 0) {
                    // Busca o usuário completo pelo Id encontrado
                    user = await prisma.user.findUnique({
                        where: { Id: users[0].Id }
                    });
                    console.log('[findUserByIdentifier] ✅ Usuário encontrado via case-insensitive:', {
                        foundEmail: users[0].Email,
                        searchedEmail: searchIdentifier,
                        match: users[0].Email.toLowerCase() === searchIdentifier.toLowerCase()
                    });
                } else {
                    console.log('[findUserByIdentifier] ❌ Nenhum usuário encontrado mesmo com case-insensitive');
                    // Tenta buscar qualquer email que contenha parte do identifier (para debug)
                    // Sanitizar input para prevenir SQL injection
                    const emailPart = searchIdentifier.split('@')[0];
                    // Remover caracteres perigosos, manter apenas alfanuméricos e alguns caracteres seguros
                    const sanitizedSearch = emailPart.replace(/[^a-zA-Z0-9._-]/g, '');
                    
                    // Usar Prisma query segura ao invés de raw query
                    const partialMatch = await prisma.user.findMany({
                        where: {
                            Email: {
                                contains: sanitizedSearch,
                                mode: 'insensitive',
                            },
                        },
                        select: {
                            Email: true,
                        },
                        take: 3,
                    });
                    if (partialMatch && partialMatch.length > 0) {
                        console.log('[findUserByIdentifier] Emails parciais encontrados (para debug):', partialMatch);
                    }
                }
            } catch (error) {
                console.error('[findUserByIdentifier] Erro na busca case-insensitive:', error);
            }
        }

        // Log para debug - verificar se o Id está presente
        if (user) {
            console.log('[findUserByIdentifier] ✅ Usuário encontrado:', {
                Id: user.Id,
                Email: user.Email,
                searchedEmail: searchIdentifier,
                emailsMatch: user.Email?.toLowerCase() === searchIdentifier.toLowerCase(),
                hasId: !!user.Id,
                idType: typeof user.Id
            });
        } else {
            console.log('[findUserByIdentifier] ❌ Usuário não encontrado para identifier:', {
                original: identifier,
                normalized: searchIdentifier,
                isEmail
            });
        }

        return user as unknown as User | null;
    }

    async updateUser(id: string, data: Partial<User>): Promise<User> {
        // Corrigido: converte campos para PascalCase e trata booleans
        interface UpdateData {
            Nome?: string;
            Email?: string;
            Cpf?: string;
            Telefone?: string;
            WhatsApp?: string | null;
            Password?: string;
            Role?: Role;
            TermsAccepted?: boolean;
            PrivacyAccepted?: boolean;
            Sexo?: 'Masculino' | 'Feminino' | 'NaoBinario' | 'PrefiroNaoDeclarar' | null;
            RacaCor?: 'Branca' | 'Preta' | 'Parda' | 'Amarela' | 'Indigena' | 'PrefiroNaoInformar' | null;
            DataNascimento?: Date | null;
            VindiCustomerId?: string | null;
            Crp?: string | null;
            GoogleId?: string | null;
        }
        const updateData: UpdateData = {};
        if (data.Nome !== undefined) updateData.Nome = data.Nome;
        if (data.Email !== undefined) updateData.Email = data.Email;
        if (data.Cpf !== undefined) updateData.Cpf = data.Cpf;
        if (data.Telefone !== undefined) updateData.Telefone = data.Telefone;
        const userDataWithWhatsApp = data as Partial<User & { WhatsApp?: string | null }>;
        if (userDataWithWhatsApp.WhatsApp !== undefined) updateData.WhatsApp = userDataWithWhatsApp.WhatsApp;
        if (data.Password !== undefined) updateData.Password = data.Password;
        if (data.Role !== undefined) {
            const roleValue = data.Role;
            if (typeof roleValue === 'string' && ['Admin', 'Patient', 'Psychologist', 'Management', 'Finance'].includes(roleValue)) {
                updateData.Role = roleValue as Role;
            }
        }
        if (data.TermsAccepted !== undefined) {
            const termsValue = data.TermsAccepted;
            updateData.TermsAccepted = typeof termsValue === 'boolean' ? termsValue : [true, 'true', 'TRUE', '1', 1].includes(termsValue);
        }
        if (data.PrivacyAccepted !== undefined) {
            const privacyValue = data.PrivacyAccepted;
            updateData.PrivacyAccepted = typeof privacyValue === 'boolean' ? privacyValue : [true, 'true', 'TRUE', '1', 1].includes(privacyValue);
        }
        if (data.Sexo !== undefined) {
            const normalizedSexo = this.mapToPrismaSexo(this.normalizeSexo(data.Sexo as string));
            updateData.Sexo = normalizedSexo as 'Masculino' | 'Feminino' | 'NaoBinario' | 'PrefiroNaoDeclarar' | null;
        }
        const userDataWithRacaCor = data as Partial<User & { RacaCor?: 'Branca' | 'Preta' | 'Parda' | 'Amarela' | 'Indigena' | 'PrefiroNaoInformar' | null }>;
        if (userDataWithRacaCor.RacaCor !== undefined) updateData.RacaCor = userDataWithRacaCor.RacaCor;
        if (data.DataNascimento !== undefined) updateData.DataNascimento = data.DataNascimento ? new Date(data.DataNascimento) : null;
        if (data.VindiCustomerId !== undefined) updateData.VindiCustomerId = data.VindiCustomerId;
        if (data.Crp !== undefined) updateData.Crp = data.Crp;
        if (data.GoogleId !== undefined) updateData.GoogleId = data.GoogleId;
        // Adicione outros campos conforme necessário

        return prisma.user.update({ where: { Id: id }, data: updateData }) as unknown as User;
    }

    async updateResetToken(userId: string, resetCode: string): Promise<void> {
        await prisma.user.update({ where: { Id: userId }, data: { ResetPasswordToken: resetCode } });
    }

    async findUserByResetToken(token: string): Promise<User | null> {
        const user = await prisma.user.findFirst({ where: { ResetPasswordToken: token } });
        return user as unknown as User | null;
    }

    async updatePassword(userId: string, hashedPassword: string): Promise<void> {
        await prisma.user.update({ where: { Id: userId }, data: { Password: hashedPassword } });
    }

    async createProfessionalProfile(data: ProfessionalProfileInput | ExtendedProfessionalProfileInput): Promise<string> {
        // Aceita tanto { userId, professionalProfile } quanto chaves planas { UserId, TipoPessoaJuridico, ... }
        const extendedData = data as ExtendedProfessionalProfileInput;
        const userId = 'userId' in data ? data.userId : extendedData.UserId;
        if (!userId || typeof userId !== 'string') {
            throw new Error('UserId é obrigatório para criar o perfil profissional.');
        }

        const prof = extendedData.professionalProfile || {};

        // Normaliza TipoPessoaJuridico: aceita string ou array e mapeia para o enum do Prisma
        // O Prisma espera um único valor do enum, não um array
        const normalizeTipoPessoaJuridico = (input: unknown): TipoPessoaJuridica | null => {
            if (!input) return null;

            // Primeiro, tenta verificar se já é um valor válido do enum (case-sensitive)
            const validValues = Object.values(TipoPessoaJuridica) as TipoPessoaJuridica[];
            const inputStr = String(input).trim();

            // Se já for um valor válido do enum (ex: "Autonomo", "Juridico"), retorna diretamente
            if (validValues.includes(inputStr as TipoPessoaJuridica)) {
                return inputStr as TipoPessoaJuridica;
            }

            // Se não for, tenta mapear de strings comuns para o enum
            const arr = Array.isArray(input) ? input : [input];
            const map: Record<string, TipoPessoaJuridica> = {
                autonomo: TipoPessoaJuridica.Autonomo,
                juridico: TipoPessoaJuridica.Juridico,
                pjautonomo: TipoPessoaJuridica.PjAutonomo,
                ei: TipoPessoaJuridica.Ei,
                mei: TipoPessoaJuridica.Mei,
                sociedadeltda: TipoPessoaJuridica.SociedadeLtda,
                eireli: TipoPessoaJuridica.Eireli,
                slu: TipoPessoaJuridica.Slu,
                outro: TipoPessoaJuridica.Outro,
            };
            const normalized = arr
                .map((v) => {
                    const key = (v ?? '')
                        .toString()
                        .replace(/[\s_\-]/g, '')
                        .toLowerCase();
                    return map[key];
                })
                .filter(Boolean)[0]; // Pega apenas o primeiro valor válido
            return normalized || null;
        };

        const tipoPessoaJuridicoRaw =
            extendedData.TipoPessoaJuridico ?? (prof?.TipoPessoaJuridico as unknown);

        // Normaliza o valor para garantir que seja "Autonomo" ou "Juridico"
        const tipoPessoaNormalized = normalizeTipoPessoaJuridico(tipoPessoaJuridicoRaw);

        // Log para debug
        console.log('[createProfessionalProfile] TipoPessoaJuridico recebido:', tipoPessoaJuridicoRaw);
        console.log('[createProfessionalProfile] TipoPessoaJuridico normalizado:', tipoPessoaNormalized);

        // Monta payload com defaults seguros para arrays obrigatórios
        const payload: Prisma.ProfessionalProfileCreateInput = {
            User: { connect: { Id: userId } },
            TipoPessoaJuridico: tipoPessoaNormalized,
            TipoAtendimento: Array.isArray(prof?.TipoAtendimento) ? { set: prof.TipoAtendimento as TipoAtendimento[] } : { set: [] },
            ExperienciaClinica: (prof?.ExperienciaClinica as ExperienciaClinica) ?? null,
            Idiomas: Array.isArray(prof?.Idiomas) ? { set: prof.Idiomas as Languages[] } : { set: [] },
            SobreMim: typeof prof?.SobreMim === 'string' ? prof.SobreMim : null,
            Abordagens: Array.isArray(prof?.Abordagens) ? { set: prof.Abordagens as Abordagem[] } : { set: [] },
            Queixas: Array.isArray(prof?.Queixas) ? { set: prof.Queixas as Queixa[] } : { set: [] },
            Status: (prof?.Status as ProfessionalProfileStatus) ?? ProfessionalProfileStatus.Incompleto,
        };

        const profile = await prisma.professionalProfile.create({
            data: payload,
        });
        return profile.Id;
    }

    async createPsychologistDocument(data: PsychologistDocumentInput): Promise<string> {
        const doc = await prisma.psychologistDocument.create({
            data: {
                ProfessionalProfileId: data.professionalProfileId,
                Url: data.url,
                Type: data.type,
                Description: data.description || '',
            }
        });
        return doc.Id;
    }

    private mapToUserSexo(sexo: string | null | undefined): "Masculino" | "Feminino" | "Não Binário" | "Prefiro Não Declarar" | null {
        const map: { [key: string]: "Masculino" | "Feminino" | "Não Binário" | "Prefiro Não Declarar" } = {
            MASCULINO: "Masculino",
            FEMININO: "Feminino",
            NAO_BINARIO: "Não Binário",
            PREFIRO_NAO_DECLARAR: "Prefiro Não Declarar",
            MASCULINA: "Masculino",
            FEMININA: "Feminino"
        };
        if (!sexo) return null;
        const key = sexo.trim().toUpperCase();
        return map[key] ?? null;
    }
}
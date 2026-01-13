import { User } from "../types/user.types";

export interface PsychologistDocumentInput {
    professionalProfileId: string;
    url: string;
    type: string;
    description?: string;
}

export interface ProfessionalProfileInput {
    userId: string;
}

export interface RegisterInput {
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
    crp?: string;
    role: string;
    password: string;
    vindiCustomerId?: string;
    sexo?: string;
    pronome?: string;
    whatsapp?: string;
    racaCor?: string;
    IsOnboard?: boolean;
    dataNascimento?: Date | string | null;
    termsAccepted: boolean | string;
    privacyAccepted: boolean | string;
    professionalProfile?: ProfessionalProfileInput;
    documents?: PsychologistDocumentInput[];
    googleId?: string | null;
    cnpj?: string;
    razaoSocial?: string;
    nomeFantasia?: string;
    simplesNacional?: string;
    cep?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    confirmarSenha?: string;
    termosAceitos?: boolean | string;
    TipoPessoaJuridico?: string;
}

export interface IAuthService {
    // Métodos de autenticação
    login(identifier: string, password: string): Promise<{ success: boolean; message: string; user?: User }>;
    register(data: RegisterInput, files?: { [key: string]: Express.Multer.File[] }): Promise<{ success: boolean; message: string; user?: User }>;
    createUser(data: RegisterInput): Promise<User>;
    forgotPassword(email: string): Promise<{ success: boolean; message: string }>;
    resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }>;
    getAuthenticatedUser(token: string): Promise<{ success: boolean; message: string; user?: User }>;
    findUserByResetToken(token: string): Promise<User | null>;
    updateResetToken(userId: string, resetCode: string): Promise<void>;
    updatePassword(userId: string, hashedPassword: string): Promise<void>;
    createProfessionalProfile(data: ProfessionalProfileInput): Promise<string>;
    createPsychologistDocument(data: PsychologistDocumentInput): Promise<string>;
    updateUser(id: string, data: Partial<User>): Promise<User>;
    findUserByIdentifier(identifier: string): Promise<User | null>;
}
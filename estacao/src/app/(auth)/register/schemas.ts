import { z } from "zod";
import { isValidCPF, isValidCNPJ, isValidCRP } from "@/utils/validateDocuments";
import { validateBrazilianPhone } from "@/utils/phoneCountries";

// Evitar z.any(): utilitários para arquivos (FileList)
const isFileList = (val: unknown): val is FileList =>
    typeof FileList !== "undefined" && val instanceof FileList;

const fileList = z.custom<FileList>((val) => isFileList(val), "Arquivo inválido");
const fileListOptional = z.custom<FileList | undefined>((val) => val === undefined || isFileList(val), "Arquivo inválido");
const fileListNonEmpty = fileList.refine((f) => f.length > 0, { message: "Documento obrigatório" });

// Validação de telefone brasileiro
const telefoneSchema = z.string()
    .min(1, "Telefone é obrigatório")
    .refine(
        (val) => {
            const digits = val.replace(/\D/g, "");
            if (digits.length < 10 || digits.length > 11) return false;
            const validation = validateBrazilianPhone(digits);
            return validation.valid;
        },
        { message: "Telefone inválido. Verifique o DDD e o número" }
    );

export const pacienteRegisterSchema = z.object({
    nome: z.string().min(2, "Nome obrigatório"),
    email: z.string().email("Digite um e-mail válido"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmarSenha: z.string().min(6, "Confirme sua senha"),
    telefone: telefoneSchema,
    cpf: z
        .string()
        .min(11, "CPF obrigatório")
        .refine((val) => isValidCPF(val), { message: "CPF inválido" }),
    aceitaTermos: z.boolean().refine(val => val, {
        message: "Você deve aceitar os termos de uso e a política de privacidade",
    }),
    dataNascimento: z.string()
        .min(1, "Data de nascimento é obrigatória")
        .refine((val) => {
            if (!val) return false;
            // Tenta parsear a data
            let dateValue: Date;
            if (val.includes("-")) {
                // Formato ISO (YYYY-MM-DD)
                const [y, m, d] = val.split("-").map(Number);
                dateValue = new Date(y, (m || 1) - 1, d || 1);
            } else {
                dateValue = new Date(val);
            }
            if (isNaN(dateValue.getTime())) return false;
            
            // Calcula a idade
            const today = new Date();
            let age = today.getFullYear() - dateValue.getFullYear();
            const mDiff = today.getMonth() - dateValue.getMonth();
            if (mDiff < 0 || (mDiff === 0 && today.getDate() < dateValue.getDate())) age--;
            
            return age >= 18;
        }, { message: "Idade mínima: 18 anos" }),
    sexo: z.string().optional(),
    rg: z.string().optional()
}).refine((data) => data.password === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
});

export type PacienteRegisterForm = z.infer<typeof pacienteRegisterSchema>;

export const psicologoRegisterSchema = z.object({
    pronome: z.string().min(1, "Selecione como quer ser chamado"),
    nome: z.string().min(3, "Nome obrigatório"),
    email: z.string().email("Digite um e-mail válido"),
    cpf: z
        .string()
        .min(11, "CPF obrigatório")
        .refine((val) => isValidCPF(val), { message: "CPF inválido" }),
    crp: z
        .string()
        .min(1, "CRP obrigatório")
        .max(12, "CRP deve ter no máximo 12 caracteres")
        .refine((val) => isValidCRP(val), { message: "CRP (PF ou PJ com letras sem \"/\")" }),
    role: z.string().optional(),
    dataNascimento: z.string().min(1, "Data de nascimento obrigatória"),
    telefone: telefoneSchema,
    password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres")
        .regex(/[A-Z]/, { message: "Deve conter letra maiúscula" })
        .regex(/[a-z]/, { message: "Deve conter letra minúscula" })
        .regex(/\d/, { message: "Deve conter número" })
        .regex(/[!@%$&]/, { message: "Deve conter caractere especial" }),
    confirmarSenha: z.string().min(6, "Confirme sua senha"),
    termosAceitos: z.boolean().refine(val => val === true, { message: "Você deve aceitar os termos" }),
    crpDocumento: z.boolean().refine(val => val === true, { message: "Documento CRP obrigatório" }),
    rgDocumento: z.boolean().refine(val => val === true, { message: "Documento RG obrigatório" }),
    cnpjDocumento: z.boolean().refine(val => val === true, { message: "Documento CNPJ obrigatório" }),
    simplesNacionalDocumento: z.boolean().refine(val => val === true, { message: "Documento Simples Nacional obrigatório" }),
    comprovacaoIss: fileListOptional,
}).refine((data) => data.password === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
});

export type PsicologoRegisterForm = z.infer<typeof psicologoRegisterSchema>;

export const psicologoAutonomoRegisterSchema = z.object({
    pronome: z.enum(["EleDele", "ElaDela", "ElesDeles", "ElasDelas", "EluDelu", "Outro", "Dr", "Dra", "Psic", "Prof", "Mestre", "Phd"] as const, {
        message: "Selecione como quer ser chamado"
    }),
    nome: z.string().min(3, "Nome obrigatório"),
    email: z.string().email("Digite um e-mail válido"),
    cpf: z
        .string()
        .min(11, "CPF obrigatório")
        .refine((val) => isValidCPF(val), { message: "CPF inválido" }),
    crp: z
        .string()
        .min(1, "CRP obrigatório")
        .max(12, "CRP deve ter no máximo 12 caracteres")
        .refine((val) => isValidCRP(val), { message: "CRP (PF ou PJ com letras sem \"/\")" }),
    role: z.string().optional(),
    tipo: z.enum(["autonomo", "juridico"]).optional(),
    telefone: telefoneSchema,
    whatsapp: telefoneSchema,
    dataNascimento: z.string().min(1, "Data de nascimento obrigatória"),
    sexo: z.enum(["Masculino", "Feminino", "NaoBinario", "PrefiroNaoDeclarar"] as const).optional(),
    racaCor: z.string().optional(),
    cep: z.string().min(8, "CEP obrigatório"),
    endereco: z.string().min(2, "Endereço residencial obrigatório"),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().min(2, "Cidade obrigatória"),
    estado: z.string().min(2, "Estado obrigatório"),
    password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres")
        .regex(/[A-Z]/, { message: "Deve conter letra maiúscula" })
        .regex(/[a-z]/, { message: "Deve conter letra minúscula" })
        .regex(/\d/, { message: "Deve conter número" })
        .regex(/[!@%$&]/, { message: "Deve conter caractere especial" }),
    confirmarSenha: z.string().min(6, "Confirme sua senha"),
    termosAceitos: z.boolean().refine(val => val === true, { message: "Você deve aceitar os termos" }),
    crpDocumento: fileListNonEmpty.refine((f) => f.length > 0, { message: "Documento CRP obrigatório" }),
    rgDocumento: fileListNonEmpty.refine((f) => f.length > 0, { message: "Documento CPF obrigatório" }),
    comprovanteEndereco: fileListOptional,
    comprovacaoIss: fileListOptional,
}).refine((data) => data.password === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
});

export type PsicologoAutonomoRegisterForm = z.infer<typeof psicologoAutonomoRegisterSchema>;

export const psicologoJuridicoRegisterSchema = z.object({
    nome: z.string().min(2, "Nome completo obrigatório"),
    email: z.string().email("Digite um e-mail válido"),
    telefone: telefoneSchema,
    whatsapp: telefoneSchema,
    cnpj: z
        .string()
        .min(14, "CNPJ obrigatório")
        .refine((val) => isValidCNPJ(val), { message: "CNPJ inválido" }),
    crp: z
        .string()
        .min(1, "CRP obrigatório")
        .max(12, "CRP deve ter no máximo 12 caracteres")
        .refine((val) => isValidCRP(val), { message: "CRP (PF ou PJ com letras sem \"/\")" }),
    razaoSocial: z.string().min(2, "Razão Social obrigatória"),
    nomeFantasia: z.string().min(0).optional(),
    simplesNacional: z.enum(["sim", "nao"], { message: "Selecione uma opção" }),
    descricaoExtenso: z.string().optional(),
    racaCor: z.string().optional(),
    // Endereço pessoal (obrigatório)
    cep: z.string().min(8, "CEP obrigatório"),
    endereco: z.string().min(2, "Endereço residencial obrigatório"),
    numero: z.string().min(1, "Número obrigatório"),
    complemento: z.string().optional(),
    bairro: z.string().min(2, "Bairro obrigatório"),
    cidade: z.string().min(2, "Cidade obrigatória"),
    estado: z.string().min(2, "Estado obrigatório"),
    // Endereço empresa (obrigatório)
    cepEmpresa: z.string().min(8, "CEP empresa obrigatório"),
    enderecoEmpresa: z.string().min(2, "Endereço empresa obrigatório"),
    numeroEmpresa: z.string().min(1, "Número empresa obrigatório"),
    complementoEmpresa: z.string().optional(),
    bairroEmpresa: z.string().min(2, "Bairro empresa obrigatório"),
    cidadeEmpresa: z.string().min(2, "Cidade empresa obrigatória"),
    estadoEmpresa: z.string().min(2, "Estado empresa obrigatório"),
    password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres")
        .regex(/[A-Z]/, { message: "Deve conter letra maiúscula" })
        .regex(/[a-z]/, { message: "Deve conter letra minúscula" })
        .regex(/\d/, { message: "Deve conter número" })
        .regex(/[@!%$&#]/, { message: "Deve conter caractere especial" }),
    confirmarSenha: z.string().min(6, "Confirme sua senha"),
    termosAceitos: z.boolean().refine(val => val === true, { message: "Você deve aceitar os termos" }),
    // Documentos obrigatórios
    crpDocumento: fileListNonEmpty.refine((f) => f.length > 0, { message: "Documento CRP obrigatório" }),
    rgDocumento: fileListNonEmpty.refine((f) => f.length > 0, { message: "RG/CPF Representante obrigatório" }),
    cartaoCnpjDocumento: fileListNonEmpty.refine((f) => f.length > 0, { message: "Cartão CNPJ obrigatório" }),
    // Documentos opcionais
    contratoSocialDocumento: fileListOptional,
    comprovanteEndEmpresaDocumento: fileListOptional,
    simplesNacionalDocumento: fileListOptional,
    // Documentos opcionais
    rgCpfSocioDocumento: fileListOptional,
    role: z.string().optional(),
}).refine((data) => data.password === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
}).refine((data) => {
    // Se simplesNacional for "sim", então simplesNacionalDocumento é obrigatório
    if (data.simplesNacional === "sim") {
        return data.simplesNacionalDocumento && data.simplesNacionalDocumento.length > 0;
    }
    return true;
}, {
    message: "Documento Simples Nacional obrigatório quando selecionado 'Sim'",
    path: ["simplesNacionalDocumento"],
});



export type PsicologoJuridicoRegisterForm = z.infer<typeof psicologoJuridicoRegisterSchema>;

import { z } from "zod";

export const psicologoSchema = z.object({
    responsavel: z.string().min(3, "Nome obrigatório"),
    emailEmpresa: z.string().email("Digite um e-mail válido"),
    telefoneEmpresa: z.string().refine(
        (val) => {
            const digits = val.replace(/\D/g, "");
            return digits.length >= 6 && digits.length <= 15;
        },
        { message: "Digite um telefone válido" }
    ),
    cnpj: z.string().min(14, "CNPJ obrigatório"),
    crp: z.string().min(1, "CRP obrigatório").max(12, "CRP deve ter no máximo 12 caracteres"),
    razaoSocial: z.string().min(3, "Razão social obrigatória"),
    nomeFantasia: z.string().min(3, "Nome fantasia obrigatório"),
    simplesNacional: z.enum(["sim", "nao"]),
    cep: z.string().min(9, "CEP obrigatório"),
    endereco: z.string().min(3, "Endereço obrigatório"),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().min(3, "Bairro obrigatório"),
    cidade: z.string().min(3, "Cidade obrigatória"),
    estado: z.string().min(2, "Estado obrigatório"),
});

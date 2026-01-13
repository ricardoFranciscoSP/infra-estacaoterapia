import * as z from "zod";
import { isValidCRP } from "@/utils/validateDocuments";

// Esquema para o formulário de paciente
export const pacienteSchema = z.object({
    email: z.string().email("Digite um e-mail válido").min(1, "Email é obrigatório"),
    senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

// Esquema para o formulário de psicólogo
export const psicologoSchema = z.object({
    crp: z
        .string()
        .min(1, "CRP é obrigatório")
        .max(12, "CRP deve ter no máximo 12 caracteres")
        .refine((val) => isValidCRP(val), { message: "CRP (PF ou PJ com letras sem \"/\")" }),
    senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

// Tipos inferidos dos esquemas
export type PacienteForm = z.infer<typeof pacienteSchema>;
export type PsicologoForm = z.infer<typeof psicologoSchema>;
import * as z from "zod";

// Esquema para o formulário de esqueci a senha (apenas email)
export const esqueciSenhaSchema = z.object({
    email: z.string().email("Digite um e-mail válido").min(1, "Email é obrigatório"),
});


// Tipos inferidos dos esquemas
export type EsqueciSenhaForm = z.infer<typeof esqueciSenhaSchema>;

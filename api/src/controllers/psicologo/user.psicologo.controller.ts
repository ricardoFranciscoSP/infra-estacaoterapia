import { Request, Response } from "express";
import { AuthorizationService } from "../../services/authorization.service";
import { UserPsicologoService } from "../../services/psicologo/user.psicologo.service";


export class UserPsicologoController {
    constructor(
        private authService: AuthorizationService,
        private userPsicologoService: UserPsicologoService
    ) { }

    async getUser(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });
            }

            const user = await this.userPsicologoService.fetchUsersPsicologo(userId);
            if (!user) {
                return res.status(404).json({ success: false, error: "Usuário não encontrado." });
            }

            return res.status(200).json({ success: true, user });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Erro ao buscar usuário." });
        }
    }

    async updateUserPsicologo(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                console.error("[updateUserPsicologo] Usuário não autenticado");
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });
            }

            const data = req.body;
            console.log("[updateUserPsicologo] Iniciando atualização para userId:", userId);
            console.log("[updateUserPsicologo] Payload recebido:", JSON.stringify(data, null, 2));

            const updatedUser = await this.userPsicologoService.updateUserPsicologo(userId, data);

            if (!updatedUser) {
                console.error("[updateUserPsicologo] Usuário não encontrado ou não atualizado. userId:", userId);
                return res.status(404).json({ success: false, error: "Usuário não encontrado ou não atualizado." });
            }

            console.log("[updateUserPsicologo] Atualização concluída com sucesso para userId:", userId);
            return res.status(200).json({ success: true, user: updatedUser });
        } catch (error: any) {
            const errorMessage = error?.message || "Erro desconhecido";
            const errorStack = error?.stack || "";
            const errorName = error?.name || "Error";
            
            console.error("[updateUserPsicologo] ERRO ao atualizar usuário:");
            console.error("  - Mensagem:", errorMessage);
            console.error("  - Nome:", errorName);
            console.error("  - Stack:", errorStack);
            console.error("  - Erro completo:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
            
            // Retorna mensagem de erro mais específica
            let userFriendlyMessage = "Erro ao atualizar perfil. ";
            if (errorMessage.includes("Formacao") || errorMessage.includes("formação")) {
                userFriendlyMessage += "Erro ao processar formação acadêmica. Verifique os dados e tente novamente.";
            } else if (errorMessage.includes("DadosBancarios") || errorMessage.includes("PIX")) {
                userFriendlyMessage += "Erro ao processar dados bancários. Verifique a chave PIX e tente novamente.";
            } else if (errorMessage.includes("ProfessionalProfile") || errorMessage.includes("perfil profissional")) {
                userFriendlyMessage += "Erro ao processar perfil profissional. Verifique os dados e tente novamente.";
            } else if (errorMessage.includes("Address") || errorMessage.includes("endereço")) {
                userFriendlyMessage += "Erro ao processar endereço. Verifique os dados e tente novamente.";
            } else if (errorMessage.includes("validation") || errorMessage.includes("validação")) {
                userFriendlyMessage += "Dados inválidos. Verifique os campos preenchidos e tente novamente.";
            } else {
                userFriendlyMessage += "Tente novamente ou entre em contato com o suporte se o problema persistir.";
            }
            
            return res.status(500).json({ 
                success: false, 
                error: userFriendlyMessage,
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            });
        }
    }

    async uploadImage(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });
            }
            const fileData = req.file;
            if (!fileData) {
                return res.status(400).json({ success: false, error: "Nenhum arquivo enviado." });
            }
            const uploadResult = await this.userPsicologoService.uploadImage(userId, fileData);
            if (!uploadResult) {
                return res.status(404).json({ success: false, error: "Usuário não encontrado ou não atualizado." });
            }
            return res.status(201).json({ success: true, user: uploadResult });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Erro ao fazer upload da imagem." });
        }
    }

    async updateImage(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });
            }
            const { imageId } = req.params;
            if (!imageId) {
                return res.status(400).json({ success: false, error: "ID da imagem não fornecido." });
            }
            const fileData = req.file;
            if (!fileData) {
                return res.status(400).json({ success: false, error: "Nenhum arquivo enviado." });
            }
            const updateResult = await this.userPsicologoService.updateImage(userId, imageId, fileData);
            if (!updateResult) {
                return res.status(404).json({ success: false, error: "Usuário não encontrado ou não atualizado." });
            }
            return res.status(200).json({ success: true, user: updateResult });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Erro ao atualizar imagem." });
        }
    }

    async removeFormacao(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });
            }

            const { formacaoId } = req.params;

            const result = await this.userPsicologoService.removeFormacao(formacaoId);
            if (!result) {
                return res.status(404).json({ success: false, error: "Formação não encontrada." });
            }

            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ success: false, error: "Erro ao remover formação." });
        }
    }

    async updateDadosBancarios(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });
            }

            const { chavePix } = req.body;
            if (!chavePix || chavePix.trim() === "") {
                return res.status(400).json({ success: false, error: "Chave PIX é obrigatória." });
            }

            const updatedUser = await this.userPsicologoService.updateDadosBancarios(userId, chavePix.trim());
            if (!updatedUser) {
                return res.status(404).json({ success: false, error: "Usuário não encontrado ou não atualizado." });
            }

            return res.status(200).json({ success: true, user: updatedUser });
        } catch (error: any) {
            console.error("Erro ao atualizar dados bancários:", error);
            return res.status(500).json({ success: false, error: error.message || "Erro ao atualizar dados bancários." });
        }
    }

    async updateDadosPessoais(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });
            }

            const data = req.body;
            const updatedUser = await this.userPsicologoService.updateDadosPessoais(userId, data);
            if (!updatedUser) {
                return res.status(404).json({ success: false, error: "Usuário não encontrado ou não atualizado." });
            }

            return res.status(200).json({ success: true, user: updatedUser });
        } catch (error: any) {
            console.error("Erro ao atualizar dados pessoais:", error);
            return res.status(500).json({ success: false, error: error.message || "Erro ao atualizar dados pessoais." });
        }
    }

    async updateSobreMim(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });
            }

            const { sobreMim } = req.body;
            const updatedUser = await this.userPsicologoService.updateSobreMim(userId, sobreMim || "");
            if (!updatedUser) {
                return res.status(404).json({ success: false, error: "Usuário não encontrado ou não atualizado." });
            }

            return res.status(200).json({ success: true, user: updatedUser });
        } catch (error: any) {
            console.error("Erro ao atualizar sobre mim:", error);
            return res.status(500).json({ success: false, error: error.message || "Erro ao atualizar sobre mim." });
        }
    }

    async updateEspecialidades(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });
            }

            const data = req.body;
            const updatedUser = await this.userPsicologoService.updateEspecialidades(userId, data);
            if (!updatedUser) {
                return res.status(404).json({ success: false, error: "Usuário não encontrado ou não atualizado." });
            }

            return res.status(200).json({ success: true, user: updatedUser });
        } catch (error: any) {
            console.error("Erro ao atualizar especialidades:", error);
            return res.status(500).json({ success: false, error: error.message || "Erro ao atualizar especialidades." });
        }
    }

    async updateEndereco(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });
            }

            const { isBillingAddress, ...addressData } = req.body;
            const updatedUser = await this.userPsicologoService.updateEndereco(userId, addressData, isBillingAddress || false);
            if (!updatedUser) {
                return res.status(404).json({ success: false, error: "Usuário não encontrado ou não atualizado." });
            }

            return res.status(200).json({ success: true, user: updatedUser });
        } catch (error: any) {
            console.error("Erro ao atualizar endereço:", error);
            return res.status(500).json({ success: false, error: error.message || "Erro ao atualizar endereço." });
        }
    }

    async updatePessoalJuridica(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });
            }

            const data = req.body;
            const updatedUser = await this.userPsicologoService.updatePessoalJuridica(userId, data);
            if (!updatedUser) {
                return res.status(404).json({ success: false, error: "Usuário não encontrado ou não atualizado." });
            }

            return res.status(200).json({ success: true, user: updatedUser });
        } catch (error: any) {
            console.error("Erro ao atualizar pessoa jurídica:", error);
            return res.status(500).json({ success: false, error: error.message || "Erro ao atualizar pessoa jurídica." });
        }
    }

    async updateFormacoes(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ success: false, error: "Usuário não autenticado." });
            }

            const { formacoes } = req.body;
            if (!Array.isArray(formacoes)) {
                return res.status(400).json({ success: false, error: "Formações devem ser um array." });
            }

            const updatedUser = await this.userPsicologoService.updateFormacoes(userId, formacoes);
            if (!updatedUser) {
                return res.status(404).json({ success: false, error: "Usuário não encontrado ou não atualizado." });
            }

            return res.status(200).json({ success: true, user: updatedUser });
        } catch (error: any) {
            console.error("Erro ao atualizar formações:", error);
            return res.status(500).json({ success: false, error: error.message || "Erro ao atualizar formações." });
        }
    }
}
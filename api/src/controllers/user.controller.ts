import { Request, Response } from 'express';
import { IUserService } from '../interfaces/user.interface';
import { emitirEventoUsuario } from '../utils/emitirEventoUsuario';
import { Server } from 'socket.io';
import { AuthorizationService } from '../services/authorization.service';
import { GetUserBasicService } from '../services/getUserBasic.Service';
import { GetUserDetailsService } from '../services/getUserDetails.service';
import * as path from 'path';
import { ContratoService, getTemplateContratoByTipoPlano } from '../services/gerarPdf.service';
import { normalizeParamStringRequired } from '../utils/validation.util';
interface IUserPayload {
    Id: string;
    Nome: string;
    Email: string;
    Cpf: string;
    Crp: string | null;
    GoogleId: string | null;
    Telefone: string;
    DataNascimento: Date | null;
    Sexo: any; // Ajuste para o tipo correto se houver enum Sexo
    TermsAccepted: boolean;
    Rg: string;
    Address: { Rua: string; Numero: string; Bairro: string; Cidade: string; Estado: string; Cep: string; }[];
    // Adicione os demais campos conforme necessário
}
export class UserController {
    /**
     * Retorna as consultas avulsas do usuário autenticado.
     */
    async getConsultaAvulsa(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const consultas = await this.userService.getConsultaAvulsaByUser(userId);
            return res.status(200).json(consultas);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch ConsultaAvulsa' });
        }
    }

    /**
     * Retorna os créditos avulsos do usuário autenticado.
     */
    async getCreditoAvulso(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const creditos = await this.userService.getCreditoAvulsoByUser(userId);
            return res.status(200).json(creditos);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch CreditoAvulso' });
        }
    }
    constructor(
        private authService: AuthorizationService,
        private userService: IUserService,
        private getUserBasicService: GetUserBasicService,
        private getUserDetailsService: GetUserDetailsService
    ) { }

    /**
     * Retorna todos os dados do usuário autenticado, incluindo relacionamentos.
     * Apenas o próprio usuário pode acessar.
     * @param req Request
     * @param res Response
     */
    async me(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // O serviço deve retornar o usuário com todos os relacionamentos necessários
            const userWithRelations = await this.userService.getUserWithRelations(userId);
            if (!userWithRelations) {
                return res.status(404).json({ error: 'User not found' });
            }
            return res.status(200).json(userWithRelations);
        } catch (error) {
            console.error('Error fetching user data:', error);
            return res.status(500).json({ error: 'Failed to fetch user data' });
        }
    }

    /**
     * Busca todos os usuários relacionados ao usuário autenticado.
     * @param req Request
     * @param res Response
     */
    async fetch(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const users = await this.userService.fetchUsers(userId);
            return res.status(200).json(users);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch users' });
        }
    }

    /**
     * Busca um usuário pelo ID, validando se o usuário autenticado pode acessar.
     * @param req Request
     * @param res Response
     */
    async fetchById(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Passe o userId como segundo argumento
            const user = await this.userService.fetchUserById(id, { id: userId });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            return res.status(200).json(user);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch user by ID' });
        }
    }

    /**
     * Atualiza os dados do usuário autenticado.
     * @param req Request
     * @param res Response
     */
    async update(req: Request, res: Response): Promise<Response> {
        try {
            const data = req.body;
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!data) {
                return res.status(400).json({ error: 'No data provided' });
            }
            const updatedUser = await this.userService.updateUser(userId, data);
            if (!updatedUser) {
                return res.status(404).json({ error: 'Failed to fetch updated user' });
            }

            // Emite evento de bloqueio se o status foi alterado para 'Bloqueado'
            if (data.Status === 'Bloqueado') {
                // Obtém o io do app principal (ajuste conforme sua injeção de dependência)
                const io: Server = req.app.get('io');
                if (io) {
                    await emitirEventoUsuario(io, userId, 'user:blocked', { reason: data?.motivoBloqueio || 'Bloqueio administrativo' });
                }
            }

            // Exemplo: emitir evento de status-update
            if (data.Status && data.Status !== updatedUser.Status) {
                const io: Server = req.app.get('io');
                if (io) {
                    await emitirEventoUsuario(io, userId, 'user:status-update', { status: data.Status, message: 'Status atualizado!' });
                }
            }

            return res.status(200).json(updatedUser);
        } catch (error) {
            console.error('Error updating user:', error);
            return res.status(500).json({ error: 'Failed to update user' });
        }
    }

    /**
     * Altera a senha do usuário autenticado.
     * @param req Request
     * @param res Response
     */
    async changeUserPassword(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { oldPassword, newPassword } = req.body;
            if (!oldPassword || !newPassword) {
                return res.status(400).json({ error: 'Old password and new password are required' });
            }
            await this.userService.changePassword(userId, oldPassword, newPassword);
            return res.status(200).json({ message: 'Password changed successfully' });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to change password' });
        }
    }

    /**
     * Deleta um usuário pelo ID.
     * @param req Request
     * @param res Response
     */
    async delete(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const deletedUser = await this.userService.deleteUser(id);
            return res.status(200).json(deletedUser);
        } catch (error: any) {
            return res.status(500).json({ error: 'Failed to delete user', details: error.message });
        }
    }

    /**
     * Realiza o onboarding do usuário autenticado.
     * @param req Request
     * @param res Response
     */
    async onboarding(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { status, objetivo } = req.body;
            const onboarding = await this.userService.onboarding(userId, status, objetivo);
            return res.status(200).json(onboarding);
        } catch (error) {
            console.error('Error during onboarding:', error);
            return res.status(500).json({ error: 'Failed to update onboarding status' });
        }
    }

    /**
     * Atualiza o status de onboarding do usuário autenticado.
     * @param req Request
     * @param res Response
     */
    async isOnboarding(req: Request, res: Response): Promise<Response> {
        console.log("isOnboarding");
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(200).json({ success: false, message: 'Usuário não autenticado' });
            }
            const isOnboarding = await this.userService.updateIsOnboarding(userId, { IsOnboarding: true });
            return res.status(200).json({ success: true, isOnboarding });
        } catch (error) {
            console.error('Error updating onboarding status:', error);
            return res.status(500).json({ error: 'Failed to check onboarding status' });
        }
    }

    /**
     * Busca dados básicos do usuário autenticado.
     * @param req Request
     * @param res Response
     */
    async getUserBasic(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(200).json({ success: false, message: 'Usuário não autenticado' });
            }
            const userBasicData = await this.getUserBasicService.execute(userId);
            return res.status(200).json(userBasicData);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch user basic data' });
        }
    }
    /**
     * Busca detalhes completos do usuário autenticado.
     * @param req Request
     * @param res Response
     */
    async getUserFullDetails(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(200).json({ success: false, message: 'Usuário não autenticado' });
            }
            const userFullDetails = await this.getUserDetailsService.execute(userId);
            return res.status(200).json(userFullDetails);
        } catch (error) {
            console.error('Error fetching user full details:', error);
            return res.status(500).json({ error: 'Failed to fetch user full details' });
        }
    }

    /**
     * Busca o plano do usuário autenticado.
     * @param req Request
     * @param res Response
     */
    async getUserPlano(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(200).json({ success: false, message: 'Usuário não autenticado' });
            }
            const userPlano = await this.userService.getUserPlano(userId);
            return res.status(200).json(userPlano);
        } catch (error) {
            console.error('Error fetching user plan:', error);
            return res.status(500).json({ error: 'Failed to fetch user plan' });
        }
    }

    /**
     * Cria endereço de cobrança para o usuário autenticado.
     * @param req Request
     * @param res Response
     */
    async createEnderecoCobranca(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { data } = req.body;
            const enderecoCobranca = await this.userService.createEnderecoCobranca(userId, data);
            return res.status(200).json(enderecoCobranca);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to create billing address' });
        }
    }

    /**
     * Envia imagem do usuário autenticado.
     * @param req Request
     * @param res Response
     */
    async uploadUserImage(req: Request, res: Response) {
        try {
            console.log("Uploading user image...");
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            console.log("Request file:", req.file);
            console.log("User ID:", userId);
            // O multer coloca o arquivo em req.file
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado' });
            }
            const savedImage = await this.userService.uploadImage(userId, file);
            return res.status(201).json({ message: "Imagem enviada com sucesso", data: savedImage });
        } catch (error) {
            console.error('Error uploading user image:', error);
            return res.status(500).json({ error: 'Failed to upload user image' });
        }
    }

    /**
     * Lista imagens do usuário autenticado.
     * @param req Request
     * @param res Response
     */
    async listUserImages(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const images = await this.userService.listImages(userId);
            if (!images) {
                return res.status(404).json({ error: 'No images found for this user' });
            }
            return res.status(200).json(images);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to list user images' });
        }
    }

    /**
     * Atualiza imagem do usuário autenticado.
     * @param req Request
     * @param res Response
     */
    async updateUserImage(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado' });
            }
            const updatedImage = await this.userService.updateImage(userId, id, file);
            if (!updatedImage) {
                return res.status(404).json({ message: "Imagem não encontrada", success: false });
            }
            return res.status(200).json({ message: "Imagem atualizada com sucesso", data: updatedImage });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to update user image' });
        }
    }

    /**
     * Deleta imagem do usuário autenticado.
     * @param req Request
     * @param res Response
     */
    async deleteUserImage(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const imageId = normalizeParamStringRequired(req.params.imageId);
            if (!imageId) {
                return res.status(400).json({ message: "ID da imagem é obrigatório", success: false });
            }
            const deletedImage = await this.userService.deleteImage(userId, imageId);
            if (!deletedImage) {
                return res.status(404).json({ message: "Imagem não encontrada", success: false });
            }
            return res.status(200).json({ message: "Imagem deletada com sucesso", data: deletedImage });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to delete user image' });
        }
    }

    /**
     * Envia contrato do usuário autenticado.
     * @param req Request
     * @param res Response
     */
    async envioContrato(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(200).json({ success: false, message: 'Usuário não autenticado' });
            }
            const file = req.file;
            if (!file) {
                return res.status(400).json({ success: false, message: 'Arquivo não enviado' });
            }
            const contrato = await this.userService.envioContrato(userId, file);
            return res.status(200).json(contrato);
        } catch (error) {
            console.error('Error sending contract:', error);
            return res.status(500).json({ error: 'Failed to send contract' });
        }
    }

    /**
     * Gera prévia do contrato do usuário autenticado.
     * @param req Request
     * @param res Response
     */
    previaContrato = async (req: Request, res: Response): Promise<Response> => {
        const { planos, plano } = req.body;
        const planoData = planos || plano; // Aceita ambos para compatibilidade
        const userId = this.authService.getLoggedUserId(req);
        if (!userId) {
            return res.status(200).json({ success: false, message: 'Usuário não autenticado' });
        }
        try {
            const htmlContrato = await this.userService.previaContrato(userId, planoData);
            return res.status(200).send(htmlContrato);
        } catch (err: any) {
            console.error('Error generating contract preview:', err);
            return res.status(500).json({ error: err.message || 'Erro ao gerar prévia do contrato.' });
        }
    }

    /**
     * Gera contrato do usuário autenticado.
     * @param req Request
     * @param res Response
     */
    async gerarContrato(req: Request, res: Response): Promise<Response> {
        try {
            const { plano, assinaturaBase64 } = req.body;
            const userRaw = req.user as unknown;

            if (!userRaw || typeof userRaw !== 'object' || !(userRaw as IUserPayload).Id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Busca o usuário completo com relacionamentos
            const userFull = await this.userService.getUserWithRelations((userRaw as IUserPayload).Id);
            if (!userFull) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
            // Garante que Address existe como array
            const user = {
                ...userFull,
                Address: Array.isArray(userFull.Address) ? userFull.Address : []
            };
            if (!plano) return res.status(400).json({ error: "Parâmetro 'plano' ausente" });

            const contratoService = new ContratoService();
            
            // Determina o template baseado no tipo do plano
            let planoSelecionado: any = null;
            if (Array.isArray(plano)) {
                planoSelecionado = plano.length > 0 ? plano[0] : null;
            } else if (typeof plano === 'object' && plano !== null) {
                planoSelecionado = plano;
            }
            
            const tipoPlano = planoSelecionado?.Tipo || null;
            const templateName = getTemplateContratoByTipoPlano(tipoPlano);
            const templatePath = path.resolve(__dirname, '../../src/templates', templateName);
            
            const result = await contratoService.contratoPaciente(user, plano, templatePath, assinaturaBase64);

            if (!result || !result.urlContrato) {
                return res.status(400).json({ error: 'Falha ao gerar contrato.' });
            }

            return res.json({ message: "Contrato gerado com sucesso.", url: result.urlContrato });
        } catch (err: any) {
            console.error('[Contrato] Erro:', err);
            return res.status(500).json({ error: err.message || 'Erro ao gerar contrato.' });
        }
    }
}
import { Request, Response } from "express";
import { IPsicologoController } from "../../interfaces/adm/ipsicologo.controller";
import { PsicologoService } from "../../services/adm/psicologo.service";
import { AuthorizationService } from "../../services/authorization.service";
import { ActionType, Module } from "../../types/permissions.types";
import { ContratoPsicologoData } from "../../types/contrato.types";
import { logAuditFromRequest, logUserOperation, logPsychologistApproval } from "../../utils/auditLogger.util";
import { getClientIp } from "../../utils/getClientIp.util";
import prisma from "../../prisma/client";
import { normalizeParamStringRequired } from "../../utils/validation.util";

const normalizeContratoText = (text: string) =>
    text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\uFFFD/g, "")
        .toUpperCase();

const hasParceriaTitle = (text: string) => {
    const normalized = normalizeContratoText(text);
    return normalized.includes("CONTRATO DE PARCERIA") && (
        normalized.includes("INTERMEDIACAO") ||
        normalized.includes("INTERMEDIAO") ||
        normalized.includes("INTERMEDIA")
    );
};

const hasPacienteTitle = (text: string) =>
    normalizeContratoText(text).includes("CONTRATO DE PRESTACAO DE SERVICOS PSICOLOGICOS VIA PLATAFORMA VIRTUAL");

export class PsicologoController implements IPsicologoController {
    private service: PsicologoService;
    private authService: AuthorizationService;

    constructor(
        authService: AuthorizationService = new AuthorizationService(),
        service: PsicologoService = new PsicologoService(authService)
    ) {
        this.authService = authService;
        this.service = service;
    }

    async list(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Psychologists,
            ActionType.Read
        );
        if (!hasPermission) {
            return res.status(403).json({ message: "Acesso negado" });
        }
        const psicologos = await this.service.list(user);
        return res.json(psicologos);
    }

    async delete(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Psychologists,
            ActionType.Delete
        );
        if (!hasPermission) {
            return res.status(403).json({ message: "Acesso negado" });
        }
        const id = normalizeParamStringRequired(req.params.id);

        // Buscar dados do psicólogo antes de deletar para auditoria
        const psicologo = await prisma.user.findUnique({
            where: { Id: id, Role: "Psychologist" },
            select: { Id: true, Nome: true, Email: true, Crp: true }
        });

        const result = await this.service.delete(user, id);

        // Registrar auditoria
        if (psicologo) {
            try {
                await logUserOperation(
                    user.Id,
                    ActionType.Delete,
                    id,
                    'deletado',
                    `Psicólogo: ${psicologo.Nome} (CRP: ${psicologo.Crp || 'N/A'})`,
                    getClientIp(req)
                );
            } catch (auditError) {
                console.error('[PsicologoController] Erro ao registrar auditoria:', auditError);
            }
        }

        return res.json(result);
    }

    async update(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Psychologists,
            ActionType.Update
        );
        if (!hasPermission) {
            return res.status(403).json({ message: "Acesso negado" });
        }
        const id = normalizeParamStringRequired(req.params.id);
        const data = req.body;

        // Buscar dados do psicólogo antes de atualizar para auditoria
        const psicologoAntes = await prisma.user.findUnique({
            where: { Id: id, Role: "Psychologist" },
            select: { Id: true, Nome: true, Email: true, Crp: true, Status: true }
        });

        const result = await this.service.update(user, id, data);

        // Registrar auditoria
        if (psicologoAntes) {
            try {
                const statusAnterior = psicologoAntes.Status;
                const statusNovo = data.Status || statusAnterior;

                // Verificar se foi aprovação ou rejeição
                if (statusAnterior !== statusNovo) {
                    if (statusNovo === 'Ativo' && statusAnterior !== 'Ativo') {
                        // Aprovação
                        await logPsychologistApproval(
                            user.Id,
                            id,
                            'approve',
                            undefined,
                            getClientIp(req)
                        );
                    } else if (statusNovo === 'EmAnalise' || statusNovo === 'Bloqueado') {
                        // Rejeição ou bloqueio
                        await logPsychologistApproval(
                            user.Id,
                            id,
                            'reject',
                            `Status alterado de ${statusAnterior} para ${statusNovo}`,
                            getClientIp(req)
                        );
                    }
                }

                // Registrar atualização geral
                await logUserOperation(
                    user.Id,
                    ActionType.Update,
                    id,
                    'atualizado',
                    `Psicólogo: ${psicologoAntes.Nome} (CRP: ${psicologoAntes.Crp || 'N/A'}) - Status: ${statusAnterior} → ${statusNovo}`,
                    getClientIp(req)
                );
            } catch (auditError) {
                console.error('[PsicologoController] Erro ao registrar auditoria:', auditError);
            }
        }

        return res.json(result);
    }

    async uploadImage(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Psychologists,
            ActionType.Update
        );
        if (!hasPermission) {
            return res.status(403).json({ message: "Acesso negado" });
        }

        const psicologoId = normalizeParamStringRequired(req.params.id);
        const file = req.file as Express.Multer.File | undefined;
        if (!file) {
            return res.status(400).json({ error: "Nenhum arquivo enviado." });
        }

        try {
            const savedImage = await this.service.uploadImage(user, psicologoId, file);
            return res.status(201).json({ message: "Imagem enviada com sucesso", data: savedImage });
        } catch (error: any) {
            const message = error?.message || "Erro ao fazer upload da imagem.";
            const status = message.includes("não encontrado") ? 404 : 500;
            return res.status(status).json({ error: message });
        }
    }

    async updateImage(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Psychologists,
            ActionType.Update
        );
        if (!hasPermission) {
            return res.status(403).json({ message: "Acesso negado" });
        }

        const psicologoId = normalizeParamStringRequired(req.params.id);
        const imageId = normalizeParamStringRequired(req.params.imageId);
        const file = req.file as Express.Multer.File | undefined;
        if (!file) {
            return res.status(400).json({ error: "Nenhum arquivo enviado." });
        }

        try {
            const updatedImage = await this.service.updateImage(user, psicologoId, imageId, file);
            return res.status(200).json({ message: "Imagem atualizada com sucesso", data: updatedImage });
        } catch (error: any) {
            const message = error?.message || "Erro ao atualizar a imagem.";
            const status = message.includes("não encontrada") || message.includes("não encontrado") ? 404 : 500;
            return res.status(status).json({ error: message });
        }
    }

    async deleteImage(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Psychologists,
            ActionType.Update
        );
        if (!hasPermission) {
            return res.status(403).json({ message: "Acesso negado" });
        }

        const psicologoId = normalizeParamStringRequired(req.params.id);
        const imageId = normalizeParamStringRequired(req.params.imageId);

        try {
            const deletedImage = await this.service.deleteImage(user, psicologoId, imageId);
            return res.status(200).json({ message: "Imagem deletada com sucesso", data: deletedImage });
        } catch (error: any) {
            const message = error?.message || "Erro ao excluir a imagem.";
            const status = message.includes("não encontrada") || message.includes("não encontrado") ? 404 : 500;
            return res.status(status).json({ error: message });
        }
    }

    async getById(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Psychologists,
            ActionType.Read
        );
        if (!hasPermission) {
            return res.status(403).json({ message: "Acesso negado" });
        }
        const id = normalizeParamStringRequired(req.params.id);
        const psicologo = await this.service.getById(user, id);
        if (!psicologo) {
            return res.status(404).json({ message: "Psicólogo não encontrado" });
        }
        return res.json(psicologo);
    }

    async gerarContrato(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Psychologists,
            ActionType.Read
        );
        if (!hasPermission) {
            return res.status(403).json({ message: "Acesso negado" });
        }

        const { id } = req.body;
        console.log(`[Contrato] Valor recebido de id na requisição:`, id);
        if (!id) {
            console.warn(`[Contrato] Parâmetro 'id' do psicólogo ausente na requisição!`);
            return res.status(400).json({ error: "Parâmetro 'id' do psicólogo ausente" });
        }

        try {
            // Busca os dados completos do psicólogo
            console.log(`[Contrato] Buscando dados do psicólogo com id:`, id);
            const psicologoData = await this.service.getById(user, id);
            if (!psicologoData) {
                console.warn(`[Contrato] Nenhum psicólogo encontrado para o id:`, id);
                return res.status(404).json({ error: "Psicólogo não encontrado" });
            }

            // Type assertion para acessar Address que está incluído no query
            const psicologoDataWithAddress = psicologoData as typeof psicologoData & {
                Address?: Array<{
                    Rua: string;
                    Numero: string;
                    Bairro: string;
                    Cidade: string;
                    Estado: string;
                    Cep: string;
                    Complemento: string;
                }>;
                PessoalJuridica?: {
                    RazaoSocial: string;
                    CNPJ: string;
                    EnderecoEmpresa?: {
                        Rua: string;
                        Numero: string;
                        Complemento: string;
                        Bairro: string;
                        Cidade: string;
                        Estado: string;
                    };
                };
            };

            const endereco = psicologoDataWithAddress.Address && Array.isArray(psicologoDataWithAddress.Address) && psicologoDataWithAddress.Address.length > 0
                ? psicologoDataWithAddress.Address[0]
                : undefined;

            const pessoaJuridica = psicologoDataWithAddress.PessoalJuridica;

            console.log(`[Gerar Contrato Controller] Dados do psicólogo:`);
            console.log(`[Gerar Contrato Controller] - Nome: ${psicologoData.Nome}`);
            console.log(`[Gerar Contrato Controller] - CRP: ${psicologoData.Crp}`);
            console.log(`[Gerar Contrato Controller] - CPF: ${psicologoData.Cpf}`);
            console.log(`[Gerar Contrato Controller] - Tem PessoalJuridica?: ${!!pessoaJuridica}`);
            if (pessoaJuridica) {
                console.log(`[Gerar Contrato Controller] - Razão Social: ${pessoaJuridica.RazaoSocial}`);
                console.log(`[Gerar Contrato Controller] - CNPJ: ${pessoaJuridica.CNPJ}`);
            }

            // Prepara os dados do psicólogo no formato esperado pelo serviço
            const psicologo: ContratoPsicologoData = {
                id: psicologoData.Id,
                nome: psicologoData.Nome || '',
                crp: psicologoData.Crp || '',
                cpf: psicologoData.Cpf || '',
                email: psicologoData.Email || '',
                ipNavegador: req.ip || req.socket.remoteAddress || '',
                contratante: {
                    nome: psicologoData.Nome || '',
                    rg: psicologoData.Rg || '',
                    cpf: psicologoData.Cpf || '',
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
                    representanteLegalNome: psicologoData.Nome || '',
                    representanteLegalRg: psicologoData.Rg || '',
                    representanteLegalCpf: psicologoData.Cpf || '',
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

            // Gera o contrato usando o serviço (que agora faz upload automático)
            const { urlContrato } = await this.service.gerarContrato(psicologo);

            console.log('[Contrato] Contrato gerado com sucesso:', urlContrato);

            return res.json({
                message: "Contrato gerado, enviado para storage e link enviado por e-mail com sucesso.",
                url: urlContrato
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar contrato.';
            const errorStack = err instanceof Error ? err.stack : undefined;
            console.error('[Contrato] Erro ao gerar contrato:', err);
            return res.status(500).json({
                error: errorMessage,
                details: errorStack
            });
        }
    }

    async previaContrato(req: Request, res: Response): Promise<Response> {
        const { id } = req.body;

        console.log('[Previa Contrato Controller] ==========================================');
        console.log('[Previa Contrato Controller] REQUISIÇÃO DE PRÉVIA DO CONTRATO DE PARCERIA');
        console.log('[Previa Contrato Controller] ID do psicólogo:', id);
        console.log('[Previa Contrato Controller] Body completo:', JSON.stringify(req.body, null, 2));

        if (!id) {
            console.error('[Previa Contrato Controller] ❌ ERRO: Parâmetro id ausente');
            return res.status(400).json({ error: "Parâmetro 'id' ausente" });
        }

        try {
            console.log('[Previa Contrato Controller] Chamando service.previaContrato...');
            const htmlContrato = await this.service.previaContrato(id);
            console.log('[Previa Contrato Controller] Service retornou HTML. Tamanho:', htmlContrato?.length || 0);

            if (!htmlContrato || typeof htmlContrato !== 'string') {
                console.error('[Previa Contrato Controller] ❌ ERRO: HTML não é uma string válida');
                return res.status(500).json({
                    error: 'Erro ao gerar prévia: HTML inválido retornado pelo serviço.',
                    details: typeof htmlContrato
                });
            }

            // Validações rigorosas do HTML retornado
            console.log('[Previa Contrato Controller] HTML recebido do serviço. Tamanho:', htmlContrato.length);

            // Verifica se o HTML retornado é do contrato de parceria
            if (!hasParceriaTitle(htmlContrato)) {
                console.error('[Previa Contrato Controller] ❌ ERRO CRÍTICO: HTML retornado NÃO é do contrato de parceria!');
                console.error('[Previa Contrato Controller] Primeiros 1000 caracteres:', htmlContrato.substring(0, 1000));

                // Verifica se é o template ERRADO (de paciente)
                if (hasPacienteTitle(htmlContrato)) {
                    console.error('[Previa Contrato Controller] ❌ ERRO: Template de PACIENTE detectado!');
                    return res.status(500).json({
                        error: 'Template incorreto: O sistema retornou o template de paciente em vez do template de parceria do psicólogo. Por favor, contate o suporte técnico.'
                    });
                }

                return res.status(500).json({
                    error: 'Template incorreto: O HTML retornado não contém o título esperado do contrato de parceria.'
                });
            }

            // Verifica se NÃO contém o título ERRADO (de paciente)
            if (hasPacienteTitle(htmlContrato)) {
                console.error('[Previa Contrato Controller] ❌ ERRO CRÍTICO: Template de PACIENTE detectado no HTML!');
                return res.status(500).json({
                    error: 'Template incorreto: O sistema retornou o template de paciente. Deve usar um template de psicólogo válido.'
                });
            }

            console.log('[Previa Contrato Controller] ✅ HTML validado: Contém título de PARCERIA');
            console.log('[Previa Contrato Controller] ✅ HTML validado: NÃO contém título de PACIENTE');
            console.log('[Previa Contrato Controller] Enviando HTML para o cliente...');
            console.log('[Previa Contrato Controller] ==========================================');

            // Define o Content-Type como HTML
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.status(200).send(htmlContrato);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar prévia do contrato.';
            const errorStack = err instanceof Error ? err.stack : 'N/A';
            const errorName = err instanceof Error ? err.name : 'Unknown';

            console.error('[Previa Contrato Controller] ❌ ERRO CAPTURADO:');
            console.error('[Previa Contrato Controller] Nome:', errorName);
            console.error('[Previa Contrato Controller] Mensagem:', errorMessage);
            console.error('[Previa Contrato Controller] Stack:', errorStack);

            // Se for erro de template não encontrado, retorna mensagem mais clara
            if (errorMessage.includes('Não foi possível localizar template') || errorMessage.includes('Template não encontrado')) {
                return res.status(500).json({
                    error: 'Template não encontrado',
                    details: 'O arquivo de template do contrato não foi encontrado no servidor. Contate o suporte técnico.',
                    message: errorMessage
                });
            }

            return res.status(500).json({
                error: errorMessage,
                details: errorStack ? errorStack.substring(0, 500) : 'Erro desconhecido' // Limita o stack trace
            });
        }
    }
}
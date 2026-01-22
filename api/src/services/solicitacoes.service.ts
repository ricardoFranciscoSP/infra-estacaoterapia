import prisma from '../prisma/client';
import { Prisma } from '../generated/prisma';
import { ISolicitacoesService } from '../interfaces/solicitacoes.interface';
import { ISolicitacao } from '../types/solicitacoes.types';
import { supabaseAdmin, STORAGE_BUCKET, uploadFile, createSignedUrl } from './storage.services';
import { Role } from '../types/permissions.types';
import { isSolicitacaoFinanceira } from '../constants/tiposSolicitacao';
import { TIPOS_SOLICITACAO_SUPORTE } from '../constants/tiposSolicitacaoSuporte';
function isSolicitacaoSuporte(tipo: string | null | undefined): boolean {
    if (!tipo) return false;
    return TIPOS_SOLICITACAO_SUPORTE.some(opt =>
        tipo.toLowerCase() === opt.value.toLowerCase() ||
        tipo.toLowerCase().includes(opt.value.toLowerCase())
    );
}
import { NotificationService } from './notification.service';
import { WebSocketNotificationService } from './websocketNotification.service';

const gerarProtocol = (): string => `PRT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

type SolicitacaoWithDocs = Prisma.SolicitacoesGetPayload<{
    include: {
        User: {
            select: {
                Id: true;
                Nome: true;
                Email: true;
            };
        };
        Documents: {
            select: {
                Id: true;
                Url: true;
                Type: true;
                Description: true;
                CreatedAt: true;
                UpdatedAt: true;
            };
        };
    };
}>;

type SolicitacaoWithUser = Prisma.SolicitacoesGetPayload<{
    include: {
        User: {
            select: {
                Id: true;
                Nome: true;
                Email: true;
            };
        };
    };
}>;

type Thread = {
    mensagens: Array<{
        id: string;
        autor: 'paciente' | 'admin';
        autorNome?: string;
        mensagem: string;
        data: string;
    }>;
};

const mapSolicitacaoBase = (s: Prisma.SolicitacoesGetPayload<{}> & { User?: SolicitacaoWithUser['User'] }): ISolicitacao & { Documents: [] } => ({
    Id: s.Id,
    Title: s.Title,
    UserId: s.UserId,
    User: s.User ? { Id: s.User.Id, Nome: s.User.Nome, Email: s.User.Email } : undefined,
    Tipo: s.Tipo,
    Status: s.Status,
    Protocol: s.Protocol,
    Descricao: s.Descricao ?? undefined,
    Documentos: s.Documentos ?? undefined,
    Log: s.Log ?? undefined,
    SLA: s.SLA ?? undefined,
    PublicoTodos: s.PublicoTodos ?? false,
    PublicoPacientes: s.PublicoPacientes ?? false,
    PublicoPsicologos: s.PublicoPsicologos ?? false,
    PublicoFinanceiro: s.PublicoFinanceiro ?? false,
    CreatedAt: s.CreatedAt,
    UpdatedAt: s.UpdatedAt,
    Documents: []
});

const mapSolicitacaoWithDocs = (s: SolicitacaoWithDocs): ISolicitacao & { Documents: SolicitacaoWithDocs['Documents'] } => ({
    Id: s.Id,
    Title: s.Title,
    UserId: s.UserId,
    User: s.User ? { Id: s.User.Id, Nome: s.User.Nome, Email: s.User.Email } : undefined,
    Tipo: s.Tipo,
    Status: s.Status,
    Protocol: s.Protocol,
    Descricao: s.Descricao ?? undefined,
    Documentos: s.Documentos ?? undefined,
    Log: s.Log ?? undefined,
    SLA: s.SLA ?? undefined,
    PublicoTodos: s.PublicoTodos ?? false,
    PublicoPacientes: s.PublicoPacientes ?? false,
    PublicoPsicologos: s.PublicoPsicologos ?? false,
    PublicoFinanceiro: s.PublicoFinanceiro ?? false,
    CreatedAt: s.CreatedAt,
    UpdatedAt: s.UpdatedAt,
    Documents: s.Documents ?? []
});

const toErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const hasStatusFields = (error: unknown): error is { status?: string | number; statusCode?: string | number } =>
    typeof error === 'object' && error !== null && ('status' in error || 'statusCode' in error);

export class SolicitacoesService implements ISolicitacoesService {
    async createSolicitacao(
        userId: string,
        data: Omit<ISolicitacao, 'Id' | 'CreatedAt' | 'UpdatedAt' | 'Protocol'>,
        file?: Express.Multer.File,
        protocol?: string // Protocolo opcional, se não fornecido será gerado
    ): Promise<{ success: boolean; message: string; protocol?: string }> {
        try {
            let documentoUrl: string | undefined = undefined;
            let documentId: string | undefined = undefined;

            // Gerar protocolo antes do upload (para nomeação do arquivo)
            const finalProtocol = protocol || gerarProtocol();

            // Se houver arquivo, faça upload
            // Mas só se o arquivo realmente tiver buffer (não foi enviado anteriormente)
            if (file && file.buffer) {
                console.log('[SolicitacoesService] Fazendo upload do arquivo:', {
                    fileName: file.originalname,
                    size: file.size,
                    protocol: finalProtocol
                });

                const fileName = file.originalname || 'documento';
                const filePath = `solicitacoes/${finalProtocol}/${fileName}`;

                // Usar função uploadFile que já tem tratamento adequado de erros e usa STORAGE_BUCKET
                if (!supabaseAdmin) {
                    return {
                        success: false,
                        message: 'SUPABASE_SERVICE_ROLE_KEY não configurada. Erro ao fazer upload do documento.'
                    };
                }

                try {
                    const uploadResult = await uploadFile(filePath, file.buffer, {
                        bucket: STORAGE_BUCKET,
                        contentType: file.mimetype || 'application/octet-stream',
                        upsert: true
                    });
                    // Salvar apenas o path (caminho) do arquivo, não a URL pública, pois o bucket é privado
                    documentoUrl = uploadResult.path;
                    console.log('[SolicitacoesService] Upload concluído, path:', documentoUrl);
                } catch (error: any) {
                    console.error('[SolicitacoesService] Erro no upload:', error);
                    // Tratamento específico para erro de bucket não encontrado
                    if (error.message?.toLowerCase().includes('bucket not found') ||
                        error.message?.toLowerCase().includes('not found')) {
                        return {
                            success: false,
                            message: `Bucket '${STORAGE_BUCKET}' não encontrado. Verifique se o bucket existe no Supabase Storage e se a variável SUPABASE_BUCKET está configurada corretamente.`
                        };
                    }
                    // Tratamento específico para erro de assinatura
                    if (error.message?.toLowerCase().includes('signature verification failed') ||
                        error.message?.toLowerCase().includes('signature') ||
                        (hasStatusFields(error) && (error.statusCode === '403' || error.status === 403 || error.status === '403'))) {
                        return {
                            success: false,
                            message: 'Erro de verificação de assinatura. Verifique se SUPABASE_SERVICE_ROLE_KEY está configurada. Erro: ' + error.message
                        };
                    }
                    return { success: false, message: 'Erro ao fazer upload do documento: ' + (error.message || 'Erro desconhecido') };
                }
            } else if (file) {
                console.log('[SolicitacoesService] Arquivo fornecido mas sem buffer, assumindo que upload já foi feito');
            }

            // Definir SLA automático (3 dias úteis)
            const slaAutomatico = 3;

            // Criar thread inicial com a descrição da solicitação
            const threadInicial = JSON.stringify({
                mensagens: [{
                    id: `${Date.now()}-initial`,
                    autor: 'paciente',
                    mensagem: data.Descricao || '',
                    data: new Date().toISOString()
                }]
            });

            // Criar solicitação no banco
            const documentosValue = documentoUrl || null;

            console.log('[SolicitacoesService] Criando solicitação no banco:', {
                userId,
                title: data.Title,
                tipo: data.Tipo,
                status: data.Status,
                documentos: documentosValue ? 'URL' : 'nenhum'
            });

            const solicitacao = await prisma.solicitacoes.create({
                data: {
                    UserId: userId,
                    Title: data.Title,
                    Tipo: data.Tipo,
                    Status: data.Status || 'Pendente',
                    Protocol: finalProtocol,
                    Descricao: data.Descricao,
                    Documentos: documentoUrl || null,
                    Log: threadInicial,
                    SLA: slaAutomatico,
                    PublicoTodos: data.PublicoTodos ?? false,
                    PublicoPacientes: data.PublicoPacientes ?? false,
                    PublicoPsicologos: data.PublicoPsicologos ?? false,
                    PublicoFinanceiro: data.PublicoFinanceiro ?? false
                }
            });

            // Criar destinatários específicos (se houver)
            const destinatariosIds = Array.isArray(data.DestinatariosIds) ? data.DestinatariosIds : [];
            if (destinatariosIds.length > 0 && !(data.PublicoTodos ?? false)) {
                const uniqueIds = Array.from(new Set(destinatariosIds));
                try {
                    await prisma.solicitacaoDestinatario.createMany({
                        data: uniqueIds.map((destId) => ({
                            SolicitacaoId: solicitacao.Id,
                            UserId: destId
                        })),
                        skipDuplicates: true
                    });
                } catch (destError) {
                    console.error('[SolicitacoesService] ⚠️ Erro ao criar destinatários, mas solicitação foi criada:', destError);
                }
            }

            // Se houver URL do documento, criar registro Document vinculado à solicitação
            if (documentoUrl && file) {
                try {
                    console.log('[SolicitacoesService] Criando registro Document para solicitação:', solicitacao.Id);
                    const document = await prisma.document.create({
                        data: {
                            UserId: userId,
                            SolicitacaoId: solicitacao.Id,
                            Url: documentoUrl,
                            Type: 'Documento Fiscal', // Tipo genérico para solicitações gerais
                            Description: `${file.originalname} - Solicitação ${finalProtocol}`,
                            DataHoraAceite: new Date(),
                            IpNavegador: 'API' // Preenchimento padrão para uploads via API
                        }
                    });
                    documentId = document.Id;
                    console.log('[SolicitacoesService] ✅ Document criado com sucesso:', documentId);
                } catch (docError) {
                    console.error('[SolicitacoesService] ⚠️ Erro ao criar Document, mas solicitação foi criada:', docError);
                    // Não falha a solicitação se o documento falhar
                }

                // Também criar registro na tabela Document_fiscal (específica para documentos fiscais)
                try {
                    console.log('[SolicitacoesService] Criando registro Document_fiscal para solicitação:', solicitacao.Id);
                    const documentFiscal = await prisma.document_fiscal.create({
                        data: {
                            UserId: userId,
                            SolicitacaoId: solicitacao.Id,
                            Url: documentoUrl,
                            NomeArquivo: file.originalname,
                            TipoDocumento: 'Documento de Solicitação', // Tipo genérico
                            TamanhoByte: file.size,
                            MimeType: file.mimetype || 'application/octet-stream'
                        }
                    });
                    console.log('[SolicitacoesService] ✅ Document_fiscal criado com sucesso:', documentFiscal.Id);
                } catch (docFiscalError) {
                    console.error('[SolicitacoesService] ⚠️ Erro ao criar Document_fiscal, mas solicitação foi criada:', docFiscalError);
                    // Não falha a solicitação se o documento fiscal falhar
                }
            }

            console.log('[SolicitacoesService] ✅ Solicitação criada com sucesso, protocolo:', finalProtocol);

            // Notificações: Suporte → Admin, Financeiro → Finance, ambos notificam criador
            try {
                const wsService = new WebSocketNotificationService();
                const notificationService = new NotificationService(wsService);
                let rolesToNotify: Role[] = [];
                if (isSolicitacaoFinanceira(data.Tipo)) {
                    rolesToNotify = [Role.Finance];
                } else if (isSolicitacaoSuporte(data.Tipo)) {
                    rolesToNotify = [Role.Admin];
                }
                if (rolesToNotify.length > 0) {
                    const usersToNotify = await prisma.user.findMany({
                        where: {
                            Role: { in: rolesToNotify },
                            Status: 'Ativo'
                        },
                        select: { Id: true }
                    });
                    for (const user of usersToNotify) {
                        try {
                            // Notificação persistente (banco + socket) para Admin/Finance
                            await notificationService.sendNotification({
                                userId: user.Id,
                                title: `Nova solicitação ${isSolicitacaoFinanceira(data.Tipo) ? 'financeira' : 'de suporte'} criada`,
                                message: `Protocolo: ${finalProtocol} - ${data.Title}`,
                                type: 'info'
                            });
                        } catch (notifError) {
                            console.error(`[SolicitacoesService] ⚠️ Erro ao enviar notificação via WebSocket para usuário ${user.Id}:`, notifError);
                        }
                    }
                }
                // Notificar o criador da solicitação (paciente)
                try {
                    await notificationService.sendNotification({
                        userId,
                        title: 'Solicitação criada com sucesso',
                        message: `Sua solicitação foi registrada. Protocolo: ${finalProtocol} - ${data.Title}`,
                        type: 'info'
                    });
                } catch (creatorNotifError) {
                    console.error('[SolicitacoesService] ⚠️ Erro ao notificar criador da solicitação:', creatorNotifError);
                }
            } catch (notificationError) {
                console.error('[SolicitacoesService] ⚠️ Erro ao enviar notificações via WebSocket (não impede a criação da solicitação):', notificationError);
            }

            return { success: true, message: 'Solicitação criada com sucesso', protocol: finalProtocol };
        } catch (error: unknown) {
            console.error('[SolicitacoesService] ❌ Erro ao criar solicitação:', error);
            return { success: false, message: 'Erro ao criar solicitação: ' + toErrorMessage(error) };
        }
    }

    async getSolicitacoesByUserId(userId: string, userRole?: Role): Promise<{ success: boolean; solicitacoes?: ISolicitacao[]; message?: string }> {
        try {
            if (typeof userId !== 'string' || !userId) {
                return { success: false, message: 'userId inválido' };
            }
            const role = userRole || (await prisma.user.findUnique({
                where: { Id: userId },
                select: { Role: true }
            }))?.Role;

            const roleFilters: Prisma.SolicitacoesWhereInput[] = [];
            if (role === Role.Patient) {
                roleFilters.push({ PublicoPacientes: true });
            }
            if (role === Role.Psychologist) {
                roleFilters.push({ PublicoPsicologos: true });
            }
            if (role === Role.Finance) {
                roleFilters.push({ PublicoFinanceiro: true });
            }

            const roleScopedFilter: Prisma.SolicitacoesWhereInput | null = roleFilters.length
                ? {
                    AND: [
                        { Destinatarios: { none: {} } },
                        { OR: roleFilters }
                    ]
                }
                : null;

            const orFilters: Prisma.SolicitacoesWhereInput[] = [
                { UserId: userId },
                { PublicoTodos: true },
                { Destinatarios: { some: { UserId: userId } } }
            ];
            if (roleScopedFilter) {
                orFilters.push(roleScopedFilter);
            }

            const solicitacoesRaw = await prisma.solicitacoes.findMany({
                where: {
                    OR: orFilters
                },
                include: {
                    User: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true
                        }
                    },
                    Documents: {
                        select: {
                            Id: true,
                            Url: true,
                            Type: true,
                            Description: true,
                            CreatedAt: true,
                            UpdatedAt: true
                        }
                    }
                }
            });
            const solicitacoes = solicitacoesRaw.map(mapSolicitacaoWithDocs);
            return { success: true, solicitacoes, message: 'Solicitações recuperadas com sucesso' };
        } catch (error: unknown) {
            return { success: false, message: 'Erro ao buscar solicitações: ' + toErrorMessage(error) };
        }
    }

    async updateSolicitacaoStatus(solicitacaoId: string, status: string): Promise<{ success: boolean; message: string }> {
        try {
            await prisma.solicitacoes.update({
                where: { Id: solicitacaoId },
                data: { Status: status }
            });
            return { success: true, message: 'Status da solicitação atualizado com sucesso' };
        } catch (error: unknown) {
            return { success: false, message: 'Erro ao atualizar status: ' + toErrorMessage(error) };
        }
    }

    async getAll(userId?: string, userRole?: Role): Promise<{ success: boolean; solicitacoes?: ISolicitacao[]; message?: string }> {
        try {
            // Construir filtro baseado no role do usuário
            const where: Prisma.SolicitacoesWhereInput = {};

            // Se for psicólogo, mostrar apenas suas próprias solicitações
            if (userRole === Role.Psychologist && userId) {
                where.UserId = userId;
            }
            // Se for financeiro, filtrar apenas solicitações financeiras
            // Admin e Management veem todas (sem filtro)

            const solicitacoesRaw = await prisma.solicitacoes.findMany({
                where,
                include: {
                    User: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true
                        }
                    }
                },
                orderBy: {
                    CreatedAt: 'desc'
                }
            });

            let solicitacoes = solicitacoesRaw.map(mapSolicitacaoBase);

            // Se for financeiro, filtrar apenas solicitações financeiras
            if (userRole === Role.Finance) {
                solicitacoes = solicitacoes.filter(s => isSolicitacaoFinanceira(s.Tipo));
            }

            return { success: true, solicitacoes, message: 'Solicitações recuperadas com sucesso' };
        } catch (error: unknown) {
            console.error('[SolicitacoesService] Erro ao buscar solicitações:', error);
            return { success: false, message: 'Erro ao buscar solicitações: ' + toErrorMessage(error) };
        }
    }

    async getFinanceSolicitacoes(): Promise<{ success: boolean; solicitacoes?: ISolicitacao[]; message?: string }> {
        try {
            const solicitacoesRaw = await prisma.solicitacoes.findMany({
                include: {
                    User: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true
                        }
                    }
                },
                orderBy: { CreatedAt: 'desc' },
            });

            const solicitacoes = solicitacoesRaw
                .map(mapSolicitacaoBase)
                .filter((s) => isSolicitacaoFinanceira(s.Tipo));

            return { success: true, solicitacoes, message: 'Solicitações financeiras recuperadas com sucesso' };
        } catch (error: unknown) {
            console.error('[SolicitacoesService] Erro ao buscar solicitações financeiras:', error);
            return { success: false, message: 'Erro ao buscar solicitações financeiras: ' + toErrorMessage(error) };
        }
    }

    async delete(solicitacaoId: string): Promise<{ success: boolean; message: string }> {
        try {
            await prisma.solicitacoes.delete({
                where: { Id: solicitacaoId }
            });
            return { success: true, message: 'Solicitação excluída com sucesso' };
        } catch (error: unknown) {
            return { success: false, message: 'Erro ao excluir solicitação: ' + toErrorMessage(error) };
        }
    }

    async filter(params: {
        tipo?: string;
        status?: string;
        Protocol?: string;
        Title?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{ success: boolean; solicitacoes?: ISolicitacao[]; message?: string }> {
        try {
            const where: Prisma.SolicitacoesWhereInput = {};
            if (params.tipo) where.Tipo = params.tipo;
            if (params.status) where.Status = params.status;
            if (params.Protocol) where.Protocol = params.Protocol;
            if (params.Title) where.Title = params.Title;
            if (params.startDate || params.endDate) {
                where.CreatedAt = {};
                if (params.startDate) where.CreatedAt.gte = params.startDate;
                if (params.endDate) where.CreatedAt.lte = params.endDate;
            }

            const solicitacoesRaw = await prisma.solicitacoes.findMany({
                where,
                include: {
                    User: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true
                        }
                    },
                    Documents: {
                        select: {
                            Id: true,
                            Url: true,
                            Type: true,
                            Description: true,
                            CreatedAt: true,
                            UpdatedAt: true
                        }
                    }
                }
            });
            const solicitacoes = solicitacoesRaw.map(mapSolicitacaoWithDocs);
            return { success: true, solicitacoes, message: 'Solicitações filtradas com sucesso' };
        } catch (error: unknown) {
            return { success: false, message: 'Erro ao filtrar solicitações: ' + toErrorMessage(error) };
        }
    }

    async addResponse(
        solicitacaoId: string,
        mensagem: string,
        autor: 'paciente' | 'admin',
        autorNome?: string,
        status?: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            // Buscar solicitação atual
            const solicitacao = await prisma.solicitacoes.findUnique({
                where: { Id: solicitacaoId }
            });

            if (!solicitacao) {
                return { success: false, message: 'Solicitação não encontrada' };
            }

            // Parse da thread existente ou criar nova
            let thread: Thread = { mensagens: [] };
            if (solicitacao.Log) {
                try {
                    const parsed = JSON.parse(solicitacao.Log) as Partial<Thread>;
                    if (parsed.mensagens && Array.isArray(parsed.mensagens)) {
                        thread = { mensagens: parsed.mensagens };
                    }
                } catch {
                    thread = { mensagens: [] };
                }
            }

            // Adicionar nova mensagem
            const novaMensagem: Thread['mensagens'][number] = {
                id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
                autor,
                autorNome,
                mensagem,
                data: new Date().toISOString()
            };

            thread.mensagens.push(novaMensagem);
            const logAtualizado = JSON.stringify(thread);

            // Atualizar solicitação
            const updateData: Prisma.SolicitacoesUpdateInput = { Log: logAtualizado };
            if (status) {
                updateData.Status = status;
            }

            await prisma.solicitacoes.update({
                where: { Id: solicitacaoId },
                data: updateData
            });

            return { success: true, message: 'Resposta adicionada com sucesso' };
        } catch (error: unknown) {
            return { success: false, message: 'Erro ao adicionar resposta: ' + toErrorMessage(error) };
        }
    }

    /**
     * Gera uma signed URL para o documento de uma solicitação
     * Verifica permissões: apenas o dono da solicitação, Admin, Management ou Finance podem acessar
     */
    async getSolicitacaoDocumentUrl(
        solicitacaoId: string,
        userId: string,
        userRole?: Role
    ): Promise<{ success: boolean; url?: string; expiresAt?: Date; message?: string }> {
        try {
            // Buscar a solicitação
            const solicitacao = await prisma.solicitacoes.findUnique({
                where: { Id: solicitacaoId },
                select: {
                    Id: true,
                    UserId: true,
                    Documentos: true
                }
            });

            if (!solicitacao) {
                return { success: false, message: 'Solicitação não encontrada' };
            }

            // Verificar permissões: apenas o dono, Admin, Management ou Finance
            const isOwner = solicitacao.UserId === userId;
            const isAuthorized = userRole === Role.Admin || userRole === Role.Management || userRole === Role.Finance;

            if (!isOwner && !isAuthorized) {
                return { success: false, message: 'Você não tem permissão para acessar este documento' };
            }

            if (!solicitacao.Documentos) {
                return { success: false, message: 'Solicitação não possui documento anexado' };
            }

            // Gerar signed URL usando o path armazenado
            const { signedUrl, expiresAt } = await createSignedUrl(solicitacao.Documentos, {
                bucket: STORAGE_BUCKET,
                expiresIn: 3600 // 1 hora
            });

            return {
                success: true,
                url: signedUrl,
                expiresAt
            };
        } catch (error: unknown) {
            console.error('[SolicitacoesService] Erro ao gerar signed URL:', error);
            return { success: false, message: 'Erro ao gerar URL do documento: ' + toErrorMessage(error) };
        }
    }
}
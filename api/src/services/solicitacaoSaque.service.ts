import prisma from '../prisma/client';
import { SolicitacoesService } from './solicitacoes.service';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { WebSocketNotificationService } from './websocketNotification.service';
import { uploadFile, STORAGE_BUCKET, supabaseAdmin } from './storage.services';

interface SolicitacaoSaqueData {
    userId: string;
    valor: number;
    periodo: string;
    quantidadeConsultas: number;
    notaFiscalFile?: Express.Multer.File;
}

function gerarProtocol(): string {
    return 'PRT-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export class SolicitacaoSaqueService {
    private solicitacoesService: SolicitacoesService;
    private notificationService: NotificationService;
    private emailService: EmailService;
    private wsService: WebSocketNotificationService;

    constructor() {
        this.solicitacoesService = new SolicitacoesService();
        this.wsService = new WebSocketNotificationService();
        this.notificationService = new NotificationService(this.wsService);
        this.emailService = new EmailService();
    }

    /**
     * Verifica se o psicólogo é autônomo ou pessoa jurídica
     */
    async verificarTipoPsicologo(userId: string): Promise<{ isAutonomo: boolean; isPessoaJuridica: boolean; error?: string }> {
        try {
            const user = await prisma.user.findUnique({
                where: { Id: userId },
                include: {
                    ProfessionalProfiles: true,
                    PessoalJuridica: true
                }
            });

            if (!user) {
                return { isAutonomo: false, isPessoaJuridica: false, error: 'Usuário não encontrado' };
            }

            if (user.Role !== 'Psychologist') {
                return { isAutonomo: false, isPessoaJuridica: false, error: 'Usuário não é psicólogo' };
            }

            // Verificar se tem PessoalJuridica cadastrada
            const temPessoaJuridica = !!user.PessoalJuridica;

            // Verificar TipoPessoaJuridico no ProfessionalProfile
            const professionalProfile = user.ProfessionalProfiles?.[0];
            let isAutonomo = false;
            let isPessoaJuridica = false;

            if (professionalProfile?.TipoPessoaJuridico) {
                const tipoPessoa = professionalProfile.TipoPessoaJuridico;
                
                if (Array.isArray(tipoPessoa)) {
                    const temAutonomo = tipoPessoa.some((t: string) => t === "Autonomo");
                    const temPJ = tipoPessoa.some((t: string) => 
                        t === "Juridico" || t === "PjAutonomo" || t === "Ei" || 
                        t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu"
                    );
                    isAutonomo = temAutonomo && !temPJ;
                    isPessoaJuridica = temPJ || temPessoaJuridica;
                } else {
                    isAutonomo = tipoPessoa === "Autonomo";
                    isPessoaJuridica = tipoPessoa === "Juridico" || tipoPessoa === "PjAutonomo" || 
                                     tipoPessoa === "Ei" || tipoPessoa === "Mei" || 
                                     tipoPessoa === "SociedadeLtda" || tipoPessoa === "Eireli" || 
                                     tipoPessoa === "Slu" || temPessoaJuridica;
                }
            } else {
                // Se não tem TipoPessoaJuridico definido, verificar apenas PessoalJuridica
                isPessoaJuridica = temPessoaJuridica;
                isAutonomo = !temPessoaJuridica;
            }

            return { isAutonomo, isPessoaJuridica };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return { isAutonomo: false, isPessoaJuridica: false, error: errorMessage };
        }
    }

    /**
     * Verifica se o formulário de saque autônomo está preenchido
     */
    async verificarFormularioSaqueAutonomo(userId: string): Promise<{ status: boolean; formulario?: any }> {
        try {
            const formulario = await prisma.formularioSaqueAutonomo.findUnique({
                where: { PsicologoAutonomoId: userId }
            });

            if (!formulario) {
                return { status: false };
            }

            return { status: formulario.Status, formulario };
        } catch (error) {
            return { status: false };
        }
    }

    /**
     * Cria uma solicitação de saque
     */
    async criarSolicitacaoSaque(data: SolicitacaoSaqueData): Promise<{ success: boolean; message: string; protocolo?: string }> {
        try {
            // Verificar tipo de psicólogo
            const tipoVerificacao = await this.verificarTipoPsicologo(data.userId);
            
            if (tipoVerificacao.error) {
                return { success: false, message: tipoVerificacao.error };
            }

            // Se for autônomo, verificar se o formulário está preenchido
            if (tipoVerificacao.isAutonomo) {
                const formularioStatus = await this.verificarFormularioSaqueAutonomo(data.userId);
                if (!formularioStatus.status) {
                    return { 
                        success: false, 
                        message: 'É necessário preencher o formulário de saque autônomo antes de solicitar o saque' 
                    };
                }
            }

            // Buscar dados do usuário para email
            const user = await prisma.user.findUnique({
                where: { Id: data.userId },
                select: {
                    Nome: true,
                    Email: true,
                    Cpf: true
                }
            });

            if (!user) {
                return { success: false, message: 'Usuário não encontrado' };
            }

            // Gerar protocolo (usar o mesmo para arquivo e solicitação)
            const protocol = gerarProtocol();

            // Upload da nota fiscal se houver
            let documentoUrl: string | undefined = undefined;
            let documentId: string | undefined = undefined;
            
            console.log('[SolicitacaoSaqueService] Verificando arquivo:', {
                hasFile: !!data.notaFiscalFile,
                fileName: data.notaFiscalFile?.originalname,
                fileSize: data.notaFiscalFile?.size,
                hasBuffer: !!data.notaFiscalFile?.buffer,
                bufferLength: data.notaFiscalFile?.buffer?.length
            });

            if (data.notaFiscalFile) {
                try {
                    // Validar que o arquivo tem buffer
                    if (!data.notaFiscalFile.buffer) {
                        console.error('[SolicitacaoSaqueService] Arquivo sem buffer!');
                        return { success: false, message: 'Erro: arquivo sem dados (buffer vazio)' };
                    }

                    // Sanitizar nome do arquivo
                    const originalName = data.notaFiscalFile.originalname || 'documento';
                    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
                    const fileName = `nota_fiscal_${protocol}_${sanitizedName}`;
                    const filePath = `notas_fiscais/${data.userId}/${fileName}`;
                    
                    console.log('[SolicitacaoSaqueService] Iniciando upload:', {
                        filePath,
                        contentType: data.notaFiscalFile.mimetype,
                        bufferSize: data.notaFiscalFile.buffer.length
                    });
                    
                    // Upload para Supabase storage usando a função uploadFile
                    const uploadResult = await uploadFile(
                        filePath,
                        data.notaFiscalFile.buffer,
                        {
                            bucket: STORAGE_BUCKET,
                            contentType: data.notaFiscalFile.mimetype || 'application/octet-stream',
                            upsert: true
                        }
                    );
                    
                    // Salvar apenas o path (caminho) do arquivo, não a URL pública, pois o bucket é privado
                    documentoUrl = uploadResult.path;
                    
                    console.log('[SolicitacaoSaqueService] Upload concluído:', {
                        path: uploadResult.path
                    });
                    
                    if (!documentoUrl) {
                        console.error('[SolicitacaoSaqueService] Path não retornado após upload!');
                        return { success: false, message: 'Erro ao obter path do documento' };
                    }

                    // Gravar na tabela Document
                    try {
                        // Determinar o tipo de documento baseado no tipo de psicólogo
                        const tipoVerificacao = await this.verificarTipoPsicologo(data.userId);
                        const tipoDocumento = tipoVerificacao.isPessoaJuridica 
                            ? 'NotaFiscal' 
                            : 'ReceitaSaude';
                        
                        const document = await prisma.document.create({
                            data: {
                                UserId: data.userId,
                                Url: documentoUrl, // Armazena o path do arquivo
                                Type: tipoDocumento,
                                Description: `${tipoVerificacao.isPessoaJuridica ? 'Nota fiscal' : 'Receita saúde'} - Solicitação de Saque - Protocolo: ${protocol} - Período: ${data.periodo}`,
                                DataHoraAceite: new Date(),
                                IpNavegador: '0.0.0.0', // IP não disponível no backend
                            }
                        });
                        documentId = document.Id;
                        console.log('[SolicitacaoSaqueService] Documento gravado na tabela Document:', {
                            Id: documentId,
                            Type: tipoDocumento,
                            Url: documentoUrl
                        });
                    } catch (docError) {
                        console.error('[SolicitacaoSaqueService] Erro ao gravar documento na tabela Document:', docError);
                        // Não falha a solicitação se o documento não for gravado, mas loga o erro
                    }
                } catch (uploadError) {
                    const errorMessage = uploadError instanceof Error ? uploadError.message : 'Erro desconhecido ao fazer upload';
                    console.error('[SolicitacaoSaqueService] Erro ao fazer upload da nota fiscal:', uploadError);
                    return { success: false, message: 'Erro ao fazer upload da nota fiscal: ' + errorMessage };
                }
            } else {
                console.log('[SolicitacaoSaqueService] Nenhum arquivo enviado');
            }

            // Criar descrição com período e valor
            const descricao = `Período: ${data.periodo} - Valor: R$ ${data.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            // Calcular data de pagamento (dia 05 do mês seguinte)
            const now = new Date();
            const mesAtual = now.getMonth(); // 0-indexado
            const anoAtual = now.getFullYear();
            const mesSeguinte = mesAtual === 11 ? 0 : mesAtual + 1;
            const anoSeguinte = mesAtual === 11 ? anoAtual + 1 : anoAtual;
            const dataPagamento = new Date(anoSeguinte, mesSeguinte, 5, 0, 0, 0, 0);

            // Criar registro na tabela FinanceiroPsicologo ANTES de criar a solicitação
            // Isso garante que os dados financeiros sejam registrados mesmo se a solicitação falhar
            try {
                console.log('[SolicitacaoSaqueService] Criando registro em FinanceiroPsicologo:', {
                    UserId: data.userId,
                    Periodo: data.periodo,
                    ConsultasRealizadas: data.quantidadeConsultas,
                    DataPagamento: dataPagamento.toISOString(),
                    Valor: data.valor,
                    Status: 'PagamentoEmAnalise',
                    UrlDocumentoStorage: documentoUrl || null
                });

                const financeiroRecord = await prisma.financeiroPsicologo.create({
                    data: {
                        UserId: data.userId,
                        Periodo: data.periodo,
                        ConsultasRealizadas: data.quantidadeConsultas,
                        DataPagamento: dataPagamento,
                        Valor: data.valor,
                        Status: 'PagamentoEmAnalise',
                        DataVencimento: dataPagamento, // Usar a mesma data de pagamento
                        UrlDocumentoStorage: documentoUrl || null,
                        Tipo: 'Saque'
                    }
                });
                console.log('[SolicitacaoSaqueService] ✅ Registro criado na tabela FinanceiroPsicologo:', {
                    Id: financeiroRecord.Id,
                    UrlDocumentoStorage: financeiroRecord.UrlDocumentoStorage
                });
            } catch (financeiroError) {
                console.error('[SolicitacaoSaqueService] ❌ Erro ao criar registro em FinanceiroPsicologo:', financeiroError);
                // Falha a solicitação se não conseguir criar o registro financeiro
                return { 
                    success: false, 
                    message: 'Erro ao registrar dados financeiros. Tente novamente.' 
                };
            }

            // Criar solicitação
            // Vincular o documento à solicitação através do ID do documento
            // Se houver documento, salvar o ID no campo Documentos para facilitar a busca
            console.log('[SolicitacaoSaqueService] Criando solicitação:', {
                userId: data.userId,
                hasFile: !!data.notaFiscalFile,
                documentId: documentId || 'não fornecido',
                documentoUrl: documentoUrl || 'não fornecido',
                protocol
            });

            // Se houver documento, salvar o ID do documento no campo Documentos
            // Isso permite vincular o documento diretamente à solicitação
            const documentosValue = documentId 
                ? documentId // Salvar o ID do documento para facilitar a busca
                : (data.notaFiscalFile ? 'true' : undefined);

            const resultado = await this.solicitacoesService.createSolicitacao(
                data.userId,
                {
                    UserId: data.userId,
                    Title: 'Solicitação de Saque',
                    Tipo: 'Saque',
                    Status: 'PagamentoEmAnalise', // Status inicial: PagamentoEmAnalise (pendente)
                    Descricao: descricao,
                    Documentos: documentosValue // ID do documento ou 'true' se houver arquivo
                },
                undefined, // Não passar o arquivo novamente, pois já foi feito upload
                protocol // Passar o protocolo gerado anteriormente
            );

            if (!resultado.success) {
                console.error('[SolicitacaoSaqueService] Erro ao criar solicitação:', resultado.message);
                return resultado;
            }

            console.log('[SolicitacaoSaqueService] Solicitação criada com sucesso, buscando protocolo...');

            // Buscar a solicitação criada para obter o protocolo e vincular o documento
            const solicitacoes = await this.solicitacoesService.getSolicitacoesByUserId(data.userId);
            const solicitacaoCriada = solicitacoes.solicitacoes?.find(s => s.Protocol === protocol);
            
            if (!solicitacaoCriada) {
                console.warn('[SolicitacaoSaqueService] Solicitação criada mas não encontrada pelo protocolo:', protocol);
            } else if (documentId && solicitacaoCriada.Id) {
                // Vincular o documento à solicitação usando SolicitacaoId
                try {
                    await prisma.document.update({
                        where: { Id: documentId },
                        data: { SolicitacaoId: solicitacaoCriada.Id }
                    });
                    console.log('[SolicitacaoSaqueService] ✅ Documento vinculado à solicitação:', {
                        DocumentId: documentId,
                        SolicitacaoId: solicitacaoCriada.Id
                    });
                } catch (updateError) {
                    console.error('[SolicitacaoSaqueService] Erro ao vincular documento à solicitação:', updateError);
                    // Não falha a solicitação se não conseguir vincular o documento
                }
            }

            // Enviar notificação via WebSocket
            try {
                await this.notificationService.sendNotification({
                    userId: data.userId,
                    title: 'Solicitação de Saque Criada',
                    message: `Sua solicitação de saque foi criada com sucesso. Protocolo: ${protocol}`,
                    type: 'success'
                });
            } catch (notifError) {
                console.error('Erro ao enviar notificação:', notifError);
            }

            // Enviar email
            try {
                const { sendEmail } = await import('./send.email.service');
                const emailText = `Solicitação de Saque Criada

Olá ${user.Nome},

Sua solicitação de saque foi criada com sucesso!

Detalhes da Solicitação:
- Protocolo: ${protocol}
- Valor: R$ ${data.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Período: ${data.periodo}
- Quantidade de Consultas: ${data.quantidadeConsultas}
- Tipo: ${tipoVerificacao.isAutonomo ? 'Autônomo' : 'Pessoa Jurídica'}
- Data da Solicitação: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}

Sua solicitação está em análise e você será notificado sobre o status.

Atenciosamente,
Equipe Estação`;

                await sendEmail({
                    to: user.Email,
                    subject: `Solicitação de Saque Criada - Protocolo ${protocol}`,
                    text: emailText
                });
            } catch (emailError) {
                console.error('Erro ao enviar email:', emailError);
                // Não falha a solicitação se o email falhar
            }

            return {
                success: true,
                message: 'Solicitação de saque criada com sucesso',
                protocolo: protocol
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao criar solicitação de saque';
            return { success: false, message: errorMessage };
        }
    }

    /**
     * Busca a última solicitação de saque do usuário
     */
    async getUltimaSolicitacaoSaque(userId: string): Promise<{ success: boolean; solicitacao?: any; message?: string }> {
        try {
            // Buscar o último registro de FinanceiroPsicologo do tipo 'Saque'
            const financeiroRecord = await prisma.financeiroPsicologo.findFirst({
                where: {
                    UserId: userId,
                    Tipo: 'Saque'
                },
                orderBy: {
                    CreatedAt: 'desc'
                }
            });

            if (!financeiroRecord) {
                return { success: true, solicitacao: null };
            }

            return {
                success: true,
                solicitacao: {
                    id: financeiroRecord.Id,
                    status: financeiroRecord.Status,
                    periodo: financeiroRecord.Periodo,
                    valor: financeiroRecord.Valor,
                    dataPagamento: financeiroRecord.DataPagamento,
                    createdAt: financeiroRecord.CreatedAt,
                    updatedAt: financeiroRecord.UpdatedAt
                }
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao buscar solicitação de saque';
            return { success: false, message: errorMessage };
        }
    }
}

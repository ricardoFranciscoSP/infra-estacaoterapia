import { Request, Response } from "express";
import { ICancelamentoService } from "../interfaces/cancelamento.interface";
import { EmailService } from "../services/email.service";
import { IEmailService } from "../interfaces/email.interface";
import { SolicitacoesService } from "../services/solicitacoes.service";
import { NotificationService } from "../services/notification.service";
import { WebSocketNotificationService } from "../services/websocketNotification.service";
import { ConsultaCancelamentoService } from "../services/consultaCancelamento.service";
import { MulterRequest } from "../types/multerRequest";
import prisma from "../prisma/client";
import { CancelamentoSessaoStatus } from "../generated/prisma";
import { supabase, STORAGE_BUCKET } from "../services/storage.services";
import { v4 as uuidv4 } from "uuid";
import { CancelamentoResponse } from "../types/cancelamento.types";
import { normalizeParamStringRequired, normalizeQueryString } from "../utils/validation.util";

export class CancelamentoController {
    private emailService: IEmailService;
    private solicitacoesService: SolicitacoesService;
    private notificationService: NotificationService;
    private consultaCancelamentoService: ConsultaCancelamentoService;

    constructor(private cancelamentoService: ICancelamentoService) {
        this.emailService = new EmailService();
        this.solicitacoesService = new SolicitacoesService();
        const wsService = new WebSocketNotificationService();
        this.notificationService = new NotificationService(wsService);
        this.consultaCancelamentoService = new ConsultaCancelamentoService();
    }

    /**
     * Cria um novo cancelamento, cria uma solicitação, envia e-mail para paciente e notifica via socket.
     * @param req Request do Express contendo dados do cancelamento.
     * @param res Response do Express.
     * @returns Response com cancelamento criado.
     */
    async create(req: MulterRequest, res: Response) {
        try {
            const data = req.body;
            const file = req.file;

            // Se houver arquivo, fazer upload antes de criar o cancelamento
            let linkDock: string | null = null;
            if (file) {
                const allowedTypes = [
                    "application/pdf",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "image/jpeg",
                    "image/png"
                ];

                if (!allowedTypes.includes(file.mimetype)) {
                    return res.status(400).json({ error: "Tipo de arquivo não permitido. Envie PDF, DOCX, JPG ou PNG." });
                }

                const protocolo = data.protocolo || `CANCEL-${uuidv4()}`;
                const filePath = `cancelamentos/${protocolo}_${Date.now()}_${file.originalname}`;

                // Sempre usar supabaseAdmin para uploads em buckets privados
                const { supabaseAdmin } = await import('../services/storage.services');
                if (!supabaseAdmin) {
                    return res.status(500).json({ 
                        error: 'SUPABASE_SERVICE_ROLE_KEY não definido. Uploads requerem service role key.' 
                    });
                }

                const uploadResult = await supabaseAdmin.storage
                    .from(STORAGE_BUCKET)
                    .upload(filePath, file.buffer, {
                        contentType: file.mimetype,
                        upsert: true
                    });

                if (uploadResult.error) {
                    // Tratamento específico para erro de verificação de assinatura
                    const error = uploadResult.error;
                    const errorMessage = error.message?.toLowerCase() || '';
                    const hasSignatureError = errorMessage.includes('signature verification failed') || 
                                             errorMessage.includes('signature');
                    const hasStatusError = 'statusCode' in error && (error.statusCode === '403' || error.statusCode === 403) ||
                                         'status' in error && (error.status === 403 || error.status === '403');
                    
                    if (hasSignatureError || hasStatusError) {
                        return res.status(500).json({ 
                            error: 'Erro de verificação de assinatura. Verifique se SUPABASE_SERVICE_ROLE_KEY está configurada corretamente.' 
                        });
                    }
                    return res.status(500).json({ error: `Erro ao enviar documento: ${error.message || 'Erro desconhecido'}` });
                }

                const { data: urlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
                if (!urlData || !urlData.publicUrl) {
                    return res.status(500).json({ error: "Falha ao gerar URL pública do documento." });
                }
                linkDock = urlData.publicUrl;
            }

            // Adicionar linkDock aos dados se houver arquivo
            if (linkDock) {
                data.linkDock = linkDock;
            }

            // Criar cancelamento (operação rápida - apenas cria o registro)
            const cancelamento = await this.cancelamentoService.create(data);

            if (!cancelamento) {
                return res.status(500).json({ error: "Erro ao criar cancelamento" });
            }

            // Retornar resposta imediatamente após criar o cancelamento
            // Operações não críticas serão executadas de forma assíncrona
            res.status(200).json({
                success: true,
                message: "Cancelamento criado com sucesso",
                cancelamento: cancelamento,
                protocolo: cancelamento.Protocolo
            });

            // Executar operações não críticas de forma assíncrona (não bloqueia a resposta)
            setImmediate(async () => {
                try {
                    // Registra cancelamento na auditoria
                    try {
                        const { getClientIp } = await import('../utils/getClientIp.util');
                        const { logConsultaCancel } = await import('../utils/auditLogger.util');
                        const ipAddress = getClientIp(req);
                        const autorId = data.tipo === 'Psicologo' ? data.idPsicologo : data.idPaciente;
                        
                        if (autorId && cancelamento) {
                            await logConsultaCancel(
                                autorId,
                                data.idconsulta,
                                data.motivo || 'Motivo não informado',
                                cancelamento.Protocolo || data.protocolo || `CANCEL-${cancelamento.Id}`,
                                data.tipo || 'Paciente',
                                ipAddress
                            );
                        }
                    } catch (auditError) {
                        console.error('[CancelamentoController] Erro ao registrar auditoria:', auditError);
                        // Não interrompe o fluxo
                    }

                    // Buscar dados completos do cancelamento com consulta e usuários
                    const cancelamentoCompleto = await this.cancelamentoService.findByIdWithUsers(cancelamento.Id);
                    
                    if (!cancelamentoCompleto) {
                        console.error("[CancelamentoController] Erro ao buscar dados do cancelamento");
                        return;
                    }

                    // Busca a consulta para calcular o prazo
                    const consultaParaPrazo = await prisma.consulta.findUnique({
                        where: { Id: data.idconsulta },
                        include: {
                            Paciente: { select: { Id: true } },
                            Agenda: { select: { Data: true, Horario: true } }
                        }
                    });

                    // Calcula se está dentro do prazo (24h antes da consulta) para regras de devolução
                    let diffHoras = 0;
                    let dentroDoPrazo = false;
                    if (consultaParaPrazo?.Agenda?.Data && consultaParaPrazo?.Agenda?.Horario) {
                        const dataCancelamento = new Date(data.data || new Date());
                        const dataConsulta = new Date(consultaParaPrazo.Agenda.Data);
                        const [horas, minutos] = consultaParaPrazo.Agenda.Horario.split(':').map(Number);
                        dataConsulta.setHours(horas, minutos, 0, 0);
                        diffHoras = (dataConsulta.getTime() - dataCancelamento.getTime()) / (1000 * 60 * 60);
                        dentroDoPrazo = diffHoras >= 24;
                    }

                    // Se houver arquivo e cancelamento criado, salvar na tabela Document e enviar email
                    if (file && linkDock) {
                        try {
                            const cancelamentoId = cancelamento.Id;
                            const autorId = cancelamentoCompleto.AutorId || data.idPaciente || data.idPsicologo;

                            if (autorId) {
                                await prisma.document.create({
                                    data: {
                                        UserId: autorId,
                                        Url: linkDock,
                                        Type: "CancelamentoComprovante",
                                        Description: `Documento comprobatório de cancelamento - Protocolo: ${data.protocolo || cancelamentoCompleto.Protocolo}`,
                                        DataHoraAceite: new Date(),
                                        IpNavegador: req.ip || req.socket.remoteAddress || (Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : req.headers['x-forwarded-for']) || '',
                                        CancelamentoSessaoId: cancelamentoId
                                    }
                                });
                                console.log(`[CancelamentoController] Documento salvo na tabela Document para cancelamento ${cancelamentoId}`);

                                // Buscar dados do paciente para enviar email
                                const paciente = await prisma.user.findUnique({
                                    where: { Id: data.idPaciente },
                                    select: {
                                        Nome: true,
                                        Cpf: true,
                                        Email: true,
                                    }
                                });

                                // Enviar email para privacidade@estacaoterapia.com.br quando houver documento
                                if (paciente) {
                                    try {
                                        const motivo = data.motivo || 'Não informado';
                                        const motivoLower = motivo.toLowerCase();
                                        const isForcaMaior = motivoLower.includes('doenca') || 
                                                            motivoLower.includes('doença') || 
                                                            motivoLower.includes('força maior') || 
                                                            motivoLower.includes('forca maior') ||
                                                            motivoLower.includes('falecimento') ||
                                                            motivoLower.includes('emergência') ||
                                                            motivoLower.includes('emergencia') ||
                                                            motivoLower.includes('acidente') ||
                                                            motivoLower.includes('hospitalização') ||
                                                            motivoLower.includes('crise');

                                        if (isForcaMaior) {
                                            const assunto = `Cancelamento de consulta - ${paciente.Nome} | ${paciente.Cpf}`;
                                            
                                            // Criar HTML do email
                                            const emailHtml = `
                                                <!DOCTYPE html>
                                                <html>
                                                <head>
                                                    <meta charset="UTF-8">
                                                    <style>
                                                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                                        .header { background-color: #8494E9; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
                                                        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                                                        .info-row { margin: 10px 0; }
                                                        .label { font-weight: bold; color: #555; }
                                                        .value { color: #333; }
                                                        .link { color: #8494E9; text-decoration: none; }
                                                        .link:hover { text-decoration: underline; }
                                                    </style>
                                                </head>
                                                <body>
                                                    <div class="container">
                                                        <div class="header">
                                                            <h2>Novo Cancelamento com Documento</h2>
                                                        </div>
                                                        <div class="content">
                                                            <div class="info-row">
                                                                <span class="label">Protocolo:</span>
                                                                <span class="value">${cancelamentoCompleto.Protocolo || data.protocolo}</span>
                                                            </div>
                                                            <div class="info-row">
                                                                <span class="label">Nome do Cliente:</span>
                                                                <span class="value">${paciente.Nome}</span>
                                                            </div>
                                                            <div class="info-row">
                                                                <span class="label">CPF:</span>
                                                                <span class="value">${paciente.Cpf}</span>
                                                            </div>
                                                            <div class="info-row">
                                                                <span class="label">Email:</span>
                                                                <span class="value">${paciente.Email}</span>
                                                            </div>
                                                            <div class="info-row">
                                                                <span class="label">Motivo:</span>
                                                                <span class="value">${motivo}</span>
                                                            </div>
                                                            <div class="info-row">
                                                                <span class="label">Data/Hora da Consulta:</span>
                                                                <span class="value">${data.data || ''} ${data.horario || ''}</span>
                                                            </div>
                                                            <div class="info-row">
                                                                <span class="label">Link do Documento:</span>
                                                                <a href="${linkDock}" class="link" target="_blank">${linkDock}</a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </body>
                                                </html>
                                            `;

                                            await this.emailService.send({
                                                to: 'privacidade@estacaoterapia.com.br',
                                                subject: assunto,
                                                htmlTemplate: emailHtml,
                                                templateData: {
                                                    protocolo: cancelamentoCompleto.Protocolo || data.protocolo || '',
                                                    nomeCliente: paciente.Nome,
                                                    cpf: paciente.Cpf || '',
                                                    email: paciente.Email || '',
                                                    motivo: motivo,
                                                    dataHora: `${data.data || ''} ${data.horario || ''}`,
                                                    linkDocumento: linkDock,
                                                }
                                            });

                                            console.log(`[CancelamentoController] Email enviado para privacidade@estacaoterapia.com.br sobre cancelamento ${cancelamentoId}`);
                                        }
                                    } catch (emailError) {
                                        console.error("[CancelamentoController] Erro ao enviar email para privacidade:", emailError);
                                        // Não bloqueia o cancelamento se falhar o envio de email
                                    }
                                }
                            }
                        } catch (docError) {
                            console.error("[CancelamentoController] Erro ao salvar documento na tabela Document:", docError);
                            // Não bloqueia o cancelamento se falhar ao salvar o documento
                        }
                    }

                    // Buscar dados da consulta para obter informações do paciente e CicloPlanoId
                    const consulta = await prisma.consulta.findUnique({
                        where: { Id: data.idconsulta },
                        select: {
                            Id: true,
                            CicloPlanoId: true,
                            PacienteId: true,
                            PsicologoId: true,
                            Date: true,
                            Time: true,
                            Status: true,
                            Agenda: {
                                select: {
                                    Id: true,
                                    Status: true,
                                    PacienteId: true
                                }
                            },
                            Paciente: {
                                select: {
                                    Id: true,
                                    Nome: true,
                                    Email: true
                                }
                            },
                            Psicologo: {
                                select: {
                                    Id: true,
                                    Nome: true,
                                    Email: true
                                }
                            }
                        }
                    });

                    if (!consulta) {
                        console.error("[CancelamentoController] Consulta não encontrada");
                        return;
                    }

                    // Determinar o autor do cancelamento (quem está fazendo a solicitação)
                    const autorId = data.tipo === 'Psicologo' ? data.idPsicologo : data.idPaciente;
                    const pacienteId = data.idPaciente;

                    // Determinar status da solicitação baseado no status do cancelamento
                    // Se cancelamento for "Deferido" (dentro do prazo), solicitação é "Aprovado"
                    // Se cancelamento for "EmAnalise" (fora do prazo), solicitação é "Pendente"
                    const statusSolicitacao = cancelamentoCompleto.Status === "Deferido" ? "Aprovado" : "Pendente";

                    // Criar solicitação de cancelamento (sempre cria, mas com status baseado no prazo)
                    try {
                        const solicitacaoResult = await this.solicitacoesService.createSolicitacao(
                            autorId,
                            {
                                UserId: autorId,
                                Title: `Cancelamento de Consulta - Protocolo ${cancelamentoCompleto.Protocolo}`,
                                Tipo: "cancelamento-consulta",
                                Status: statusSolicitacao,
                                Descricao: `Solicitação de cancelamento da consulta.\nMotivo: ${data.motivo}\nProtocolo: ${cancelamentoCompleto.Protocolo}\nStatus: ${cancelamentoCompleto.Status === "Deferido" ? "Aprovado automaticamente (dentro do prazo de 24h)" : "Aguardando análise (fora do prazo de 24h)"}`
                            }
                        );
                        
                        // Se houver documento no cancelamento, vincular à solicitação também
                        if (linkDock && solicitacaoResult.success && solicitacaoResult.protocol) {
                            try {
                                // Buscar a solicitação criada pelo protocolo
                                const solicitacao = await prisma.solicitacoes.findUnique({
                                    where: { Protocol: solicitacaoResult.protocol }
                                });
                                
                                if (solicitacao) {
                                    // Buscar documento do cancelamento
                                    const documentoCancelamento = await prisma.document.findFirst({
                                        where: { CancelamentoSessaoId: cancelamento.Id }
                                    });
                                    
                                    if (documentoCancelamento) {
                                        // Atualizar documento para incluir SolicitacaoId (mantém CancelamentoSessaoId)
                                        await prisma.document.update({
                                            where: { Id: documentoCancelamento.Id },
                                            data: {
                                                SolicitacaoId: solicitacao.Id
                                            }
                                        });
                                        console.log(`[CancelamentoController] Documento ${documentoCancelamento.Id} vinculado à solicitação ${solicitacao.Id}`);
                                    } else if (linkDock) {
                                        // Se não encontrou documento, criar novo vinculado à solicitação e cancelamento
                                        await prisma.document.create({
                                            data: {
                                                UserId: autorId,
                                                SolicitacaoId: solicitacao.Id,
                                                Url: linkDock,
                                                Type: "CancelamentoComprovante",
                                                Description: `Documento comprobatório de cancelamento - Protocolo: ${cancelamentoCompleto.Protocolo}`,
                                                DataHoraAceite: new Date(),
                                                IpNavegador: req.ip || req.socket.remoteAddress || (Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : req.headers['x-forwarded-for']) || '',
                                                CancelamentoSessaoId: cancelamento.Id
                                            }
                                        });
                                        console.log(`[CancelamentoController] Novo documento criado e vinculado à solicitação ${solicitacao.Id}`);
                                    }
                                }
                            } catch (docError) {
                                console.error("[CancelamentoController] Erro ao vincular documento à solicitação:", docError);
                                // Não bloqueia o processo
                            }
                        }
                        
                        console.log(`[CancelamentoController] Solicitação criada com status: ${statusSolicitacao} (cancelamento: ${cancelamentoCompleto.Status})`);
                    } catch (solicitacaoError) {
                        console.error("[CancelamentoController] Erro ao criar solicitação:", solicitacaoError);
                        // Continua o processo mesmo se falhar a criação da solicitação
                    }

                    // Enviar emails transacionais para paciente e psicólogo usando ConsultaCancelamentoService
                    try {
                        await this.consultaCancelamentoService.notificarCancelamento({
                            consultaId: data.idconsulta,
                            motivo: data.motivo || 'Cancelamento de consulta',
                            tipo: data.tipo || 'Paciente'
                        });
                        console.log(`[CancelamentoController] Emails transacionais de cancelamento enviados para paciente e psicólogo`);
                    } catch (emailError) {
                        console.error("[CancelamentoController] Erro ao enviar emails transacionais:", emailError);
                        // Não bloqueia o processo, mas tenta enviar via método alternativo
                        try {
                            const reservationData = {
                                paciente: {
                                    nome: consulta.Paciente?.Nome || 'Paciente',
                                    email: consulta.Paciente?.Email || ''
                                },
                                psicologo: {
                                    nome: consulta.Psicologo?.Nome || 'Psicólogo',
                                    email: consulta.Psicologo?.Email || ''
                                },
                                date: consulta.Date ? new Date(consulta.Date).toLocaleDateString('pt-BR') : '',
                                time: consulta.Time || ''
                            };

                            await this.emailService.sendCancelamentoCriadoEmail(
                                reservationData,
                                data.motivo,
                                cancelamentoCompleto.Protocolo
                            );
                        } catch (fallbackError) {
                            console.error("[CancelamentoController] Erro ao enviar email alternativo:", fallbackError);
                        }
                    }

                    // Enviar notificação via socket para o paciente (sempre envia)
                    try {
                        const mensagemPaciente = cancelamentoCompleto.Status === "Deferido"
                            ? `Sua sessão foi cancelada com sucesso. O crédito foi devolvido ao seu saldo. Protocolo: ${cancelamentoCompleto.Protocolo}`
                            : `Sua solicitação de cancelamento foi recebida e está em análise. Protocolo: ${cancelamentoCompleto.Protocolo}`;

                        await this.notificationService.sendNotification({
                            userId: pacienteId,
                            title: cancelamentoCompleto.Status === "Deferido" ? "Sessão Cancelada" : "Cancelamento em Análise",
                            message: mensagemPaciente,
                            type: cancelamentoCompleto.Status === "Deferido" ? "success" : "warning"
                        });
                        
                        // Atualiza o contador de notificações não lidas para o paciente
                        const unreadCountPaciente = await this.notificationService.countUnread(pacienteId);
                        const wsService = new WebSocketNotificationService();
                        await wsService.emitUnreadCount(pacienteId, unreadCountPaciente);
                        console.log(`[CancelamentoController] Notificação enviada para paciente ${pacienteId} e contador atualizado: ${unreadCountPaciente}`);
                    } catch (notificationError) {
                        console.error("[CancelamentoController] Erro ao enviar notificação para paciente:", notificationError);
                        // Continua o processo mesmo se falhar a notificação
                    }

                    // Enviar notificação via socket para o psicólogo (sempre envia)
                    if (consulta.Psicologo?.Id) {
                        try {
                            const psicologoId = consulta.Psicologo.Id;
                            const mensagemPsicologo = cancelamentoCompleto.Status === "Deferido"
                                ? `O paciente ${consulta.Paciente?.Nome || 'Paciente'} cancelou a sessão agendada para ${consulta.Date ? new Date(consulta.Date).toLocaleDateString('pt-BR') : ''} às ${consulta.Time || ''}. O horário foi liberado para novos agendamentos. Protocolo: ${cancelamentoCompleto.Protocolo}`
                                : `O paciente ${consulta.Paciente?.Nome || 'Paciente'} solicitou o cancelamento da sessão agendada para ${consulta.Date ? new Date(consulta.Date).toLocaleDateString('pt-BR') : ''} às ${consulta.Time || ''}. Protocolo: ${cancelamentoCompleto.Protocolo}`;

                            await this.notificationService.sendNotification({
                                userId: psicologoId,
                                title: cancelamentoCompleto.Status === "Deferido" ? "Horário Liberado" : "Cancelamento Solicitado",
                                message: mensagemPsicologo,
                                type: cancelamentoCompleto.Status === "Deferido" ? "info" : "warning"
                            });
                            
                            // Atualiza o contador de notificações não lidas para o psicólogo
                            const unreadCountPsicologo = await this.notificationService.countUnread(psicologoId);
                            const wsServicePsicologo = new WebSocketNotificationService();
                            await wsServicePsicologo.emitUnreadCount(psicologoId, unreadCountPsicologo);
                            console.log(`[CancelamentoController] Notificação enviada para psicólogo ${psicologoId} e contador atualizado: ${unreadCountPsicologo}`);
                        } catch (notificationError) {
                            console.error("[CancelamentoController] Erro ao enviar notificação para psicólogo:", notificationError);
                            // Continua o processo mesmo se falhar a notificação
                        }
                    }

                    // Só devolve consulta ao paciente se o cancelamento for DEFERIDO
                    // Cancelamentos "EmAnalise" (fora do prazo) só devem ser creditados após aprovação administrativa
                    // Nota: O status já foi determinado no service baseado no prazo
                    // A Agenda já foi atualizada no service se for deferido
                    if (cancelamentoCompleto.Status === "Deferido" && data.tipo === 'Paciente' && consultaParaPrazo?.Paciente?.Id) {
                        // Creditar consulta no saldo
                        try {
                            const pacienteId = consultaParaPrazo.Paciente.Id;

                            // Se a consulta tem CicloPlanoId, creditar no CicloPlano (mesma lógica do débito, mas inversa)
                            if (consulta?.CicloPlanoId) {
                                const cicloPlano = await prisma.cicloPlano.findUnique({
                                    where: { Id: consulta.CicloPlanoId }
                                });

                                if (cicloPlano) {
                                    // Incrementar consultas disponíveis no CicloPlano
                                    const novasConsultasDisponiveis = (cicloPlano.ConsultasDisponiveis || 0) + 1;
                                    const novasConsultasUsadas = Math.max(0, (cicloPlano.ConsultasUsadas || 0) - 1);

                                    // Se estava completo e agora tem consultas disponíveis, volta para ativo
                                    const novoStatus = cicloPlano.Status === 'Completo' && novasConsultasDisponiveis > 0 ? 'Ativo' : cicloPlano.Status;

                                    await prisma.cicloPlano.update({
                                        where: { Id: cicloPlano.Id },
                                        data: {
                                            ConsultasDisponiveis: novasConsultasDisponiveis,
                                            ConsultasUsadas: novasConsultasUsadas,
                                            Status: novoStatus
                                        }
                                    });

                                    // Atualizar também o ControleConsultaMensal vinculado
                                    await prisma.controleConsultaMensal.updateMany({
                                        where: { CicloPlanoId: cicloPlano.Id },
                                        data: {
                                            ConsultasDisponiveis: novasConsultasDisponiveis,
                                            Used: novasConsultasUsadas,
                                            Available: novasConsultasDisponiveis
                                        }
                                    });

                                    console.log(`[CancelamentoController] Consulta creditada no CicloPlano ${cicloPlano.Id} para paciente ${pacienteId} (cancelamento deferido na criação)`);
                                }
                            } else {
                                // Se não tem CicloPlanoId, pode ser ConsultaAvulsa ou CreditoAvulso
                                // Buscar ControleConsultaMensal ativo do paciente
                                const controleAtivo = await prisma.controleConsultaMensal.findFirst({
                                    where: {
                                        UserId: pacienteId,
                                        Status: "Ativo"
                                    },
                                    orderBy: {
                                        CreatedAt: 'desc'
                                    }
                                });

                                if (controleAtivo) {
                                    // Incrementar consultas disponíveis no controle mensal ativo
                                    await prisma.controleConsultaMensal.update({
                                        where: { Id: controleAtivo.Id },
                                        data: {
                                            ConsultasDisponiveis: {
                                                increment: 1
                                            },
                                            Available: {
                                                increment: 1
                                            }
                                        }
                                    });
                                    console.log(`[CancelamentoController] Consulta creditada no ControleConsultaMensal ${controleAtivo.Id} para paciente ${pacienteId} (cancelamento deferido na criação)`);
                                } else {
                                    // Se não houver controle mensal ativo, criar um crédito avulso
                                    const validUntil = new Date();
                                    validUntil.setDate(validUntil.getDate() + 90); // 90 dias a partir de hoje

                                    await prisma.creditoAvulso.create({
                                        data: {
                                            UserId: pacienteId,
                                            Valor: 0,
                                            Status: "Ativa", // Enum ConsultaAvulsaStatus
                                            Quantidade: 1,
                                            Data: new Date(),
                                            ValidUntil: validUntil
                                        }
                                    });
                                    console.log(`[CancelamentoController] CreditoAvulso criado para paciente ${pacienteId} devido a cancelamento deferido na criação`);
                                }
                            }
                        } catch (creditoError) {
                            console.error("[CancelamentoController] Erro ao creditar consulta na criação:", creditoError);
                            // Continua o processo mesmo se falhar o crédito
                        }
                    }
                } catch (asyncError) {
                    console.error("[CancelamentoController] Erro em operações assíncronas:", asyncError);
                }
            }); // Fim do setImmediate
        } catch (error: unknown) {
            console.error("[CancelamentoController] Erro ao criar cancelamento:", error);
            const errorMessage = error instanceof Error ? error.message : "Erro ao criar cancelamento";
            return res.status(500).json({ error: errorMessage });
        }
    }

    /**
     * Lista todos os cancelamentos, incluindo dados de paciente e psicólogo.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com lista de cancelamentos.
     */
    async findAll(req: Request, res: Response) {
        // Busca já trazendo paciente e psicólogo
        const cancelamentos = await this.cancelamentoService.findAllWithUsers();
        return res.status(200).json(cancelamentos);
    }

    /**
     * Conta cancelamentos por status.
     * @param req Request do Express contendo query param status.
     * @param res Response do Express.
     * @returns Response com contagem de cancelamentos.
     */
    async countByStatus(req: Request, res: Response) {
        const status = normalizeQueryString(req.query.status);
        if (!status) {
            return res.status(400).json({ error: "Status é obrigatório" });
        }
        const count = await this.cancelamentoService.countByStatus(status);
        return res.status(200).json({ count });
    }

    /**
     * Atualiza apenas o status de um cancelamento.
     * @param req Request do Express contendo parâmetro id e status no body.
     * @param res Response do Express.
     * @returns Response com cancelamento atualizado ou erro.
     */
    async updateStatus(req: Request, res: Response) {
        try {
            const id = normalizeParamStringRequired(req.params.id);
            if (!id) {
                return res.status(400).json({ error: "ID é obrigatório" });
            }
            const { status } = req.body;

            if (!status || typeof status !== 'string') {
                return res.status(400).json({ error: "Status é obrigatório" });
            }

            // Validar se o status é um valor válido do enum
            const validStatuses: CancelamentoSessaoStatus[] = [
                CancelamentoSessaoStatus.EmAnalise,
                CancelamentoSessaoStatus.Deferido,
                CancelamentoSessaoStatus.Indeferido,
                CancelamentoSessaoStatus.Cancelado
            ];

            if (!validStatuses.includes(status as CancelamentoSessaoStatus)) {
                return res.status(400).json({ error: "Status inválido" });
            }

            const cancelamento = await this.cancelamentoService.update(id, { status: status as CancelamentoSessaoStatus });
            if (!cancelamento) {
                return res.status(404).json({ error: "Cancelamento não encontrado" });
            }

            // Buscar cancelamento completo com usuários
            const cancelamentoCompleto = await this.cancelamentoService.findByIdWithUsers(id);
            if (!cancelamentoCompleto) {
                return res.status(404).json({ error: "Cancelamento não encontrado" });
            }

        // Buscar dados da consulta para obter informações do paciente e agenda
        const consulta = await prisma.consulta.findUnique({
            where: { Id: cancelamentoCompleto.SessaoId },
            include: {
                Paciente: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true
                    }
                },
                Psicologo: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true
                    }
                },
                Agenda: {
                    select: {
                        Id: true,
                        Status: true,
                        PacienteId: true
                    }
                }
            }
        });

        if (!consulta) {
            return res.status(404).json({ error: "Consulta não encontrada" });
        }

            // Determinar o dono do cancelamento (AutorId)
            const autorId = cancelamentoCompleto.AutorId;
            const autorEmail = cancelamentoCompleto.Autor?.Email;
            const autorNome = cancelamentoCompleto.Autor?.Nome;
            const pacienteEmail = consulta.Paciente?.Email;
            const pacienteNome = consulta.Paciente?.Nome;
            const psicologoEmail = consulta.Psicologo?.Email;
            const psicologoNome = consulta.Psicologo?.Nome;

            // Determinar tipo do autor
            const tipoAutor = cancelamentoCompleto.Tipo === 'Psicologo' ? 'PSICOLOGO' : 'PACIENTE';
            const emailDestinatario = tipoAutor === 'PSICOLOGO' ? psicologoEmail : pacienteEmail;
            const nomeDestinatario = tipoAutor === 'PSICOLOGO' ? psicologoNome : pacienteNome;

            // Use data/hora atuais para o evento de atualização
            const now = new Date();
            const dataAtual = now.toLocaleDateString('pt-BR');
            const horarioAtual = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Enviar email para o dono do cancelamento
            try {
                await this.emailService.sendCancelamentoAtualizadoEmail(
                    {
                        ...cancelamentoCompleto,
                        paciente: consulta.Paciente,
                        psicologo: consulta.Psicologo
                    },
                    cancelamentoCompleto.Motivo,
                    cancelamentoCompleto.Protocolo,
                    status,
                    dataAtual,
                    horarioAtual,
                    tipoAutor
                );
            } catch (emailError) {
                console.error("[CancelamentoController] Erro ao enviar email:", emailError);
                // Continua o processo mesmo se falhar o email
            }

            // Enviar notificação via socket para o dono do cancelamento
            try {
                await this.notificationService.sendNotification({
                    userId: autorId,
                    title: "Status do Cancelamento Atualizado",
                    message: `O status do seu cancelamento foi atualizado para: ${status === 'Deferido' ? 'Deferido' : status === 'Indeferido' ? 'Indeferido' : status === 'EmAnalise' ? 'Em Análise' : status}`,
                    type: "cancelamento"
                });
            } catch (notificationError) {
                console.error("[CancelamentoController] Erro ao enviar notificação:", notificationError);
                // Continua o processo mesmo se falhar a notificação
            }

            // Atualizar solicitação relacionada
            try {
                // Buscar solicitação pelo protocolo do cancelamento no título
                const protocolo = cancelamentoCompleto?.Protocolo || cancelamentoCompleto?.Id;
                const solicitacao = await prisma.solicitacoes.findFirst({
                    where: {
                        Tipo: "cancelamento-consulta",
                        OR: [
                            {
                                Title: {
                                    contains: protocolo
                                }
                            },
                            {
                                Descricao: {
                                    contains: protocolo
                                }
                            }
                        ]
                    }
                });

                if (solicitacao) {
                    // Mapear status do cancelamento para status da solicitação
                    let statusSolicitacao = "Pendente";
                    if (status === "Deferido") {
                        statusSolicitacao = "Aprovado";
                    } else if (status === "Indeferido") {
                        statusSolicitacao = "Reprovado";
                    } else if (status === "EmAnalise") {
                        statusSolicitacao = "Pendente";
                    } else if (status === "Cancelado") {
                        statusSolicitacao = "Cancelado";
                    }

                    await this.solicitacoesService.updateSolicitacaoStatus(solicitacao.Id, statusSolicitacao);

                    // Adicionar mensagem no log da solicitação
                    const statusFormatado = status === 'Deferido' ? 'Deferido' :
                        status === 'Indeferido' ? 'Indeferido' :
                            status === 'EmAnalise' ? 'Em Análise' :
                                status === 'Cancelado' ? 'Cancelado' : status;

                    await this.solicitacoesService.addResponse(
                        solicitacao.Id,
                        `Status do cancelamento atualizado para: ${statusFormatado}`,
                        'admin',
                        'Sistema',
                        statusSolicitacao
                    );

                    console.log(`[CancelamentoController] Solicitação ${solicitacao.Id} atualizada para status: ${statusSolicitacao}`);
                } else {
                    console.log(`[CancelamentoController] Solicitação não encontrada para cancelamento ${id} com protocolo: ${protocolo}`);
                }
            } catch (solicitacaoError) {
                console.error("[CancelamentoController] Erro ao atualizar solicitação:", solicitacaoError);
                // Continua o processo mesmo se falhar a atualização da solicitação
            }

            // Se o cancelamento foi deferido, a Agenda já é sincronizada via trigger
            if (status === "Deferido") {

                // Processa repasse e devolução de saldo baseado no status normalizado após atualização
                try {
                    const { 
                        determinarStatusNormalizado, 
                        determinarRepasse, 
                        determinarDevolucaoSessao,
                        verificarPrazoCancelamento 
                    } = await import('../utils/statusConsulta.util');
                    
                    const cancelamentoDeferido = (status as CancelamentoSessaoStatus) === CancelamentoSessaoStatus.Deferido;
                    const cancelamentoIndeferido = (status as CancelamentoSessaoStatus) === CancelamentoSessaoStatus.Indeferido;
                    
                    // Verifica se está dentro do prazo
                    const dentroPrazo = await verificarPrazoCancelamento(consulta.Date);
                    
                    // Determina o status normalizado
                    const statusNormalizado = await determinarStatusNormalizado(consulta.Status, {
                        tipoAutor: cancelamentoCompleto.Tipo,
                        dataConsulta: consulta.Date,
                        motivo: cancelamentoCompleto.Motivo,
                        cancelamentoDeferido,
                        pacienteNaoCompareceu: consulta.Status === 'PacienteNaoCompareceu' || (consulta.Status === 'Cancelado' && cancelamentoCompleto.Tipo === 'Paciente'),
                        psicologoNaoCompareceu: consulta.Status === 'PsicologoNaoCompareceu' || (consulta.Status === 'Cancelado' && cancelamentoCompleto.Tipo === 'Psicologo')
                    });
                    
                    // Processa repasse baseado no status normalizado e se foi deferido
                    const deveFazerRepasse = determinarRepasse(statusNormalizado, cancelamentoDeferido);
                    
                    if (deveFazerRepasse && !cancelamentoIndeferido) {
                        // Se deve fazer repasse e não foi indeferido, processa repasse
                        const motivo = (cancelamentoCompleto.Motivo || '').toLowerCase();
                        const tipoRepasse = (motivo.includes('inatividade') || motivo.includes('no-show') || motivo.includes('ausente'))
                            ? 'cancelamento_inatividade'
                            : 'cancelamento_paciente';
                        
                        const { processRepasseAsync } = await import('../controllers/agora.controller');
                        processRepasseAsync(consulta.Id, tipoRepasse);
                    } else if (!deveFazerRepasse || cancelamentoIndeferido) {
                        // Se não deve fazer repasse ou foi indeferido, remove comissão se existir
                        const comissaoExistente = await prisma.commission.findFirst({
                            where: { ConsultaId: consulta.Id }
                        });
                        
                        if (comissaoExistente) {
                            await prisma.commission.delete({
                                where: { Id: comissaoExistente.Id }
                            });
                            console.log(`[CancelamentoController] Comissão removida para consulta ${consulta.Id} (status não repassável ou indeferido)`);
                        }
                    }
                    
                    // Processa devolução de saldo se necessário
                    const deveDevolver = determinarDevolucaoSessao(statusNormalizado, cancelamentoDeferido);
                    if (deveDevolver && consulta.Paciente?.Id) {
                        try {
                            const pacienteId = consulta.Paciente.Id;

                            // Se a consulta tem CicloPlanoId, creditar no CicloPlano
                            if (consulta.CicloPlanoId) {
                                const cicloPlano = await prisma.cicloPlano.findUnique({
                                    where: { Id: consulta.CicloPlanoId }
                                });

                                if (cicloPlano) {
                                    const novasConsultasDisponiveis = (cicloPlano.ConsultasDisponiveis || 0) + 1;
                                    const novasConsultasUsadas = Math.max(0, (cicloPlano.ConsultasUsadas || 0) - 1);
                                    const novoStatus = cicloPlano.Status === 'Completo' && novasConsultasDisponiveis > 0 ? 'Ativo' : cicloPlano.Status;

                                    await prisma.cicloPlano.update({
                                        where: { Id: cicloPlano.Id },
                                        data: {
                                            ConsultasDisponiveis: novasConsultasDisponiveis,
                                            ConsultasUsadas: novasConsultasUsadas,
                                            Status: novoStatus
                                        }
                                    });

                                    await prisma.controleConsultaMensal.updateMany({
                                        where: { CicloPlanoId: cicloPlano.Id },
                                        data: {
                                            ConsultasDisponiveis: novasConsultasDisponiveis,
                                            Used: novasConsultasUsadas,
                                            Available: novasConsultasDisponiveis
                                        }
                                    });

                                    console.log(`[CancelamentoController] Consulta creditada no CicloPlano ${cicloPlano.Id} para paciente ${pacienteId} (cancelamento deferido)`);
                                    
                                    // Notifica via WebSocket
                                    try {
                                        await this.notificationService.sendNotification({
                                            userId: pacienteId,
                                            title: "Plano Atualizado",
                                            message: "Uma consulta foi creditada ao seu saldo após cancelamento deferido.",
                                            type: "success"
                                        });
                                        const wsService = new WebSocketNotificationService();
                                        await wsService.emitToUser(
                                            pacienteId,
                                            'plano:atualizado',
                                            { motivo: 'cancelamento_deferido', cancelamentoId: id }
                                        );
                                    } catch (wsError) {
                                        console.error("[CancelamentoController] Erro ao notificar via WebSocket:", wsError);
                                    }
                                }
                            } else {
                                // Se não tem CicloPlanoId, tenta ConsultaAvulsa ou CreditoAvulso
                                const consultaAvulsa = await prisma.consultaAvulsa.findFirst({
                                    where: {
                                        PacienteId: pacienteId,
                                        Status: 'Ativa',
                                        Quantidade: { gt: 0 }
                                    },
                                    orderBy: { DataCriacao: 'desc' }
                                });

                                if (consultaAvulsa) {
                                    await prisma.consultaAvulsa.update({
                                        where: { Id: consultaAvulsa.Id },
                                        data: {
                                            Quantidade: consultaAvulsa.Quantidade + 1
                                        }
                                    });
                                    console.log(`[CancelamentoController] Consulta creditada no ConsultaAvulsa ${consultaAvulsa.Id} para paciente ${pacienteId}`);
                                } else {
                                    // Cria CreditoAvulso se não encontrou
                                    const validUntil = new Date();
                                    validUntil.setDate(validUntil.getDate() + 90);

                                    await prisma.creditoAvulso.create({
                                        data: {
                                            UserId: pacienteId,
                                            Valor: 0,
                                            Status: "Ativa",
                                            Quantidade: 1,
                                            Data: new Date(),
                                            ValidUntil: validUntil
                                        }
                                    });
                                    console.log(`[CancelamentoController] CreditoAvulso criado para paciente ${pacienteId} devido a cancelamento deferido`);
                                    
                                    // Notifica via WebSocket
                                    try {
                                        const wsService = new WebSocketNotificationService();
                                        await wsService.emitToUser(
                                            pacienteId,
                                            'plano:atualizado',
                                            { motivo: 'credito_avulso_criado', cancelamentoId: id }
                                        );
                                    } catch (wsError) {
                                        console.error("[CancelamentoController] Erro ao notificar via WebSocket:", wsError);
                                    }
                                }
                            }
                        } catch (creditoError) {
                            console.error("[CancelamentoController] Erro ao creditar consulta:", creditoError);
                        }
                    }
                } catch (repasseError) {
                    console.error("[CancelamentoController] Erro ao processar repasse/devolução:", repasseError);
                }
            }

            return res.status(200).json(cancelamento);
        } catch (error: unknown) {
            console.error("[CancelamentoController] Erro ao atualizar status:", error);
            const errorMessage = error instanceof Error ? error.message : "Erro ao atualizar status";
            return res.status(500).json({ error: errorMessage });
        }
    }

    /**
     * Busca cancelamento por ID, incluindo dados de paciente e psicólogo.
     * @param req Request do Express contendo parâmetro id.
     * @param res Response do Express.
     * @returns Response com cancelamento ou erro.
     */
    async findById(req: Request, res: Response) {
        const id = normalizeParamStringRequired(req.params.id);
        if (!id) {
            return res.status(400).json({ error: "ID é obrigatório" });
        }
        // Busca já trazendo paciente e psicólogo
        const cancelamento = await this.cancelamentoService.findByIdWithUsers(id);
        if (!cancelamento) return res.status(404).json({ error: "Cancelamento não encontrado" });
        return res.status(200).json(cancelamento);
    }

    /**
     * Atualiza um cancelamento e envia e-mail de atualização conforme autorTipo.
     * @param req Request do Express contendo parâmetro id e dados.
     * @param res Response do Express.
     * @returns Response com cancelamento atualizado ou erro.
     */
    async update(req: Request, res: Response) {
        const id = normalizeParamStringRequired(req.params.id);
        if (!id) {
            return res.status(400).json({ error: "ID é obrigatório" });
        }
        const data = req.body;
        const cancelamento = await this.cancelamentoService.update(id, data);
        if (!cancelamento) return res.status(404).json({ error: "Cancelamento não encontrado" });

        // Use data/hora atuais para o evento de atualização
        const now = new Date();
        const dataAtual = now.toLocaleDateString('pt-BR');
        const horarioAtual = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const status = cancelamento.Status || data.status || '';

        // Só envia email para o dono do cancelamento de acordo com autorTipo
        if (cancelamento && data.autorTipo === 'PACIENTE') {
            await this.emailService.sendCancelamentoAtualizadoEmail(
                {
                    ...cancelamento,
                    paciente: cancelamento.Paciente,
                    psicologo: cancelamento.Psicologo
                },
                cancelamento.Motivo,
                cancelamento.Protocolo,
                status,
                dataAtual,
                horarioAtual,
                data.autorTipo
            );
        } else if (cancelamento && data.autorTipo === 'PSICOLOGO') {
            await this.emailService.sendCancelamentoAtualizadoEmail(
                {
                    ...cancelamento,
                    paciente: cancelamento.Paciente,
                    psicologo: cancelamento.Psicologo
                },
                cancelamento.Motivo,
                cancelamento.Protocolo,
                status,
                dataAtual,
                horarioAtual,
                data.autorTipo
            );
        }

        return res.status(200).json(cancelamento);
    }

    /**
     * Exclui um cancelamento por ID.
     * @param req Request do Express contendo parâmetro id.
     * @param res Response do Express.
     * @returns Response de sucesso ou erro.
     */
    async delete(req: Request, res: Response) {
        const id = normalizeParamStringRequired(req.params.id);
        if (!id) {
            return res.status(400).json({ error: "ID é obrigatório" });
        }
        const cancelamento = await this.cancelamentoService.delete(id);
        if (!cancelamento) return res.status(404).json({ error: "Cancelamento não encontrado" });
        return res.status(200).json({ message: "Cancelamento deletado com sucesso" });
    }

    /**
     * Aprova um cancelamento e envia e-mail de aprovação.
     * @param req Request do Express contendo parâmetro id.
     * @param res Response do Express.
     * @returns Response com cancelamento aprovado ou erro.
     */
    async approve(req: Request, res: Response) {
        try {
            const id = normalizeParamStringRequired(req.params.id);
            if (!id) {
                return res.status(400).json({ error: "ID é obrigatório" });
            }
            const cancelamento = await this.cancelamentoService.approve(id);
            if (!cancelamento) return res.status(404).json({ error: "Cancelamento não encontrado" });

            // Buscar dados completos da consulta
            const consulta = await prisma.consulta.findUnique({
                where: { Id: cancelamento.SessaoId },
                include: {
                    Agenda: {
                        select: {
                            Id: true,
                            Status: true,
                            PacienteId: true,
                            Data: true,
                            Horario: true
                        }
                    },
                    Paciente: {
                        select: { 
                            Id: true,
                            Nome: true,
                            Email: true
                        }
                    },
                    Psicologo: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true
                        }
                    },
                    CicloPlano: true
                }
            });

            if (!consulta) {
                return res.status(404).json({ error: "Consulta não encontrada" });
            }

            // Verifica se é cancelamento do paciente dentro de 24h (CanceladaPacienteForaDoPrazo)
            const isCancelamentoPacienteForaPrazo = consulta.Status === "CanceladaPacienteForaDoPrazo";
            const isCancelamentoPaciente = cancelamento.Tipo === "Paciente";

            // Agenda já é sincronizada via trigger após atualização do status da Consulta

            // Se é cancelamento do paciente dentro de 24h, devolve a consulta após aprovação
            if (isCancelamentoPaciente && isCancelamentoPacienteForaPrazo && consulta.Paciente?.Id) {
                try {
                    const pacienteId = consulta.Paciente.Id;

                    // Se a consulta tem CicloPlanoId, creditar no CicloPlano
                    if (consulta.CicloPlanoId) {
                        const cicloPlano = await prisma.cicloPlano.findUnique({
                            where: { Id: consulta!.CicloPlanoId! }
                        });

                        if (cicloPlano) {
                            // Validação de idempotência: verifica se já foi creditado
                            // Incrementa exatamente 1 sessão
                            await prisma.cicloPlano.update({
                                where: { Id: cicloPlano.Id },
                                data: {
                                    ConsultasDisponiveis: {
                                        increment: 1
                                    },
                                    ConsultasUsadas: {
                                        decrement: 1
                                    }
                                }
                            });

                            // Atualizar também o ControleConsultaMensal vinculado
                            await prisma.controleConsultaMensal.updateMany({
                                where: { CicloPlanoId: cicloPlano.Id },
                                data: {
                                    ConsultasDisponiveis: {
                                        increment: 1
                                    },
                                    Used: {
                                        decrement: 1
                                    },
                                    Available: {
                                        increment: 1
                                    }
                                }
                            });

                            console.log(`[CancelamentoController] 1 sessão devolvida para paciente ${pacienteId} após aprovação de cancelamento dentro de 24h`);
                        }
                    } else {
                        // Se não tem CicloPlanoId, tenta ConsultaAvulsa ou CreditoAvulso
                        const consultaAvulsa = await prisma.consultaAvulsa.findFirst({
                            where: {
                                PacienteId: pacienteId,
                                Status: 'Ativa',
                                Quantidade: { gt: 0 }
                            },
                            orderBy: { DataCriacao: 'desc' }
                        });

                        if (consultaAvulsa) {
                            await prisma.consultaAvulsa.update({
                                where: { Id: consultaAvulsa.Id },
                                data: {
                                    Quantidade: {
                                        increment: 1
                                    }
                                }
                            });
                            console.log(`[CancelamentoController] 1 sessão devolvida no ConsultaAvulsa ${consultaAvulsa.Id} para paciente ${pacienteId}`);
                        } else {
                            // Cria CreditoAvulso se não encontrou
                            const validUntil = new Date();
                            validUntil.setDate(validUntil.getDate() + 90);

                            await prisma.creditoAvulso.create({
                                data: {
                                    UserId: pacienteId,
                                    Valor: 0,
                                    Status: "Ativa",
                                    Quantidade: 1,
                                    Data: new Date(),
                                    ValidUntil: validUntil
                                }
                            });
                            console.log(`[CancelamentoController] CreditoAvulso criado com 1 sessão para paciente ${pacienteId} após aprovação de cancelamento`);
                        }
                    }

                    // Notifica via WebSocket
                    try {
                        const { WebSocketNotificationService } = await import('../services/websocketNotification.service');
                        const wsService = new WebSocketNotificationService();
                        await wsService.emitToUser(
                            pacienteId,
                            'plano:atualizado',
                            { motivo: 'cancelamento_deferido_24h', cancelamentoId: id }
                        );
                    } catch (wsError) {
                        console.error("[CancelamentoController] Erro ao notificar via WebSocket:", wsError);
                    }
                } catch (creditoError) {
                    console.error("[CancelamentoController] Erro ao devolver consulta após aprovação:", creditoError);
                    // Continua o processo mesmo se falhar a devolução
                }
            }

            // Processa repasse: se cancelamento foi solicitado até 3 horas antes do horário da consulta
            if (isCancelamentoPaciente && consulta.Agenda?.Data && consulta.Agenda?.Horario) {
                try {
                    // Calcula se foi cancelado até 3 horas antes
                    const dataCancelamento = new Date(cancelamento.Data);
                    const dataConsulta = new Date(consulta.Agenda.Data);
                    const [horas, minutos] = consulta.Agenda.Horario.split(':').map(Number);
                    dataConsulta.setHours(horas, minutos, 0, 0);

                    const diffHoras = (dataConsulta.getTime() - dataCancelamento.getTime()) / (1000 * 60 * 60);
                    const canceladoAte3hAntes = diffHoras >= 3;

                    if (canceladoAte3hAntes) {
                        // Faz repasse ao psicólogo
                        const { processRepasseAsync } = await import('../controllers/agora.controller');
                        await processRepasseAsync(consulta.Id, 'cancelamento_paciente');
                        console.log(`[CancelamentoController] Repasse processado para psicólogo (cancelamento até 3h antes da consulta)`);
                    } else {
                        // Não faz repasse se foi cancelado com menos de 3h de antecedência
                        const comissaoExistente = await prisma.commission.findFirst({
                            where: { ConsultaId: consulta.Id }
                        });
                        
                        if (comissaoExistente) {
                            await prisma.commission.delete({
                                where: { Id: comissaoExistente.Id }
                            });
                            console.log(`[CancelamentoController] Comissão removida - cancelamento com menos de 3h de antecedência`);
                        }
                    }
                } catch (repasseError) {
                    console.error("[CancelamentoController] Erro ao processar repasse:", repasseError);
                    // Continua o processo mesmo se falhar o repasse
                }
            }

            // Enviar email de aprovação para paciente e psicólogo
            if (cancelamento && consulta) {
                // Verifica se está dentro do prazo para enviar o email correto
                const dentroDoPrazo = !isCancelamentoPacienteForaPrazo;
                await this.emailService.sendCancelamentoAprovadoEmail(
                    {
                        paciente: consulta.Paciente ? {
                            Id: consulta.Paciente.Id,
                            nome: consulta.Paciente.Nome || undefined,
                            email: consulta.Paciente.Email || undefined
                        } : null,
                        psicologo: consulta.Psicologo ? {
                            Id: consulta.Psicologo.Id,
                            nome: consulta.Psicologo.Nome || undefined,
                            email: consulta.Psicologo.Email || undefined
                        } : null,
                        tipo: cancelamento.Tipo || undefined,
                        date: consulta.Agenda?.Data,
                        time: consulta.Agenda?.Horario
                    },
                    cancelamento.Motivo || '',
                    cancelamento.Protocolo || '',
                    dentroDoPrazo
                );
            }
            return res.status(200).json(cancelamento);
        } catch (error: unknown) {
            console.error("[CancelamentoController] Erro ao aprovar cancelamento:", error);
            const errorMessage = error instanceof Error ? error.message : "Erro ao aprovar cancelamento";
            return res.status(500).json({ error: errorMessage });
        }
    }

    /**
     * Gerencia um cancelamento (ação administrativa).
     * @param req Request do Express contendo parâmetro id e dados.
     * @param res Response do Express.
     * @returns Response com cancelamento gerenciado ou erro.
     */
    async manage(req: Request, res: Response) {
        const id = normalizeParamStringRequired(req.params.id);
        if (!id) {
            return res.status(400).json({ error: "ID é obrigatório" });
        }
        const data = req.body;
        const cancelamento = await this.cancelamentoService.manage(id, data);
        if (!cancelamento) return res.status(404).json({ error: "Cancelamento não encontrado" });
        return res.status(200).json(cancelamento);
    }
}

import prisma from "../prisma/client";
import { WebSocketNotificationService } from "./websocketNotification.service";
import { emailQueue } from "../queues/emailQueue";
import { readFileSync } from "fs";
import { join } from "path";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Interface para dados de cancelamento
 */
export interface NotificacaoCancelamentoData {
    consultaId: string;
    motivo?: string;
    tipo?: "Paciente" | "Psicologo" | "Admin" | "Sistema";
}

/**
 * Serviço responsável por enviar notificações de cancelamento de consulta
 * via email e socket para paciente e psicólogo
 */
export class ConsultaCancelamentoService {
    private wsNotify: WebSocketNotificationService;

    constructor() {
        this.wsNotify = new WebSocketNotificationService();
    }

    /**
     * Envia notificações de cancelamento via email e socket
     * para paciente e psicólogo
     */
    async notificarCancelamento(data: NotificacaoCancelamentoData): Promise<void> {
        try {
            console.log(`[ConsultaCancelamentoService] Processando notificações de cancelamento para consulta ${data.consultaId}`);

            // Busca dados da consulta com relações
            const consulta = await prisma.consulta.findUnique({
                where: { Id: data.consultaId },
                include: {
                    Paciente: true,
                    Psicologo: true,
                    ReservaSessao: true,
                },
            });

            if (!consulta) {
                console.error(`[ConsultaCancelamentoService] Consulta ${data.consultaId} não encontrada`);
                return;
            }

            if (!consulta.Paciente || !consulta.Psicologo) {
                console.error(`[ConsultaCancelamentoService] Consulta sem paciente ou psicólogo`);
                return;
            }

            // Formata dados para template de email
            const dataConsulta = consulta.Date instanceof Date ? consulta.Date : new Date(consulta.Date);
            const dataFormatada = dayjs(dataConsulta).tz('America/Sao_Paulo').format('DD/MM/YYYY');
            const horaFormatada = (typeof consulta.Time === 'string') ? consulta.Time : '00:00';

            const motivo = data.motivo || 'Cancelamento de consulta';

            // ===== ENVIA EMAIL PARA PACIENTE =====
            if (consulta.Paciente.Email) {
                await this.enviarEmailCancelamentoPaciente({
                    destinatarioNome: consulta.Paciente.Nome || 'Paciente',
                    emailDestino: consulta.Paciente.Email,
                    psicologoNome: consulta.Psicologo.Nome || 'Psicólogo',
                    pacienteNome: consulta.Paciente.Nome || 'Paciente',
                    data: dataFormatada,
                    horario: horaFormatada,
                    motivo: motivo,
                    contato: process.env.CONTACT_WHATSAPP || '(11) 98765-4321',
                });

                console.log(`[ConsultaCancelamentoService] Email de cancelamento agendado para paciente ${consulta.Paciente.Id}`);
            }

            // ===== ENVIA EMAIL PARA PSICÓLOGO =====
            if (consulta.Psicologo.Email) {
                await this.enviarEmailCancelamentoPsicologo({
                    destinatarioNome: consulta.Psicologo.Nome || 'Psicólogo',
                    emailDestino: consulta.Psicologo.Email,
                    psicologoNome: consulta.Psicologo.Nome || 'Psicólogo',
                    pacienteNome: consulta.Paciente.Nome || 'Paciente',
                    data: dataFormatada,
                    horario: horaFormatada,
                    motivo: motivo,
                    contato: process.env.CONTACT_WHATSAPP || '(11) 98765-4321',
                });

                console.log(`[ConsultaCancelamentoService] Email de cancelamento agendado para psicólogo ${consulta.Psicologo.Id}`);
            }

            // ===== NOTIFICA VIA SOCKET =====
            // Notifica paciente
            if (consulta.Paciente.Id) {
                await this.notificarViSocket(
                    consulta.Paciente.Id,
                    'consulta:cancelada',
                    {
                        consultaId: data.consultaId,
                        psicologoNome: consulta.Psicologo.Nome,
                        data: dataFormatada,
                        horario: horaFormatada,
                        motivo: motivo,
                        tipoUsuario: 'paciente'
                    }
                );

                console.log(`[ConsultaCancelamentoService] Notificação via socket enviada para paciente ${consulta.Paciente.Id}`);
            }

            // Notifica psicólogo
            if (consulta.Psicologo.Id) {
                await this.notificarViSocket(
                    consulta.Psicologo.Id,
                    'consulta:cancelada',
                    {
                        consultaId: data.consultaId,
                        pacienteNome: consulta.Paciente.Nome,
                        data: dataFormatada,
                        horario: horaFormatada,
                        motivo: motivo,
                        tipoUsuario: 'psicologo'
                    }
                );

                console.log(`[ConsultaCancelamentoService] Notificação via socket enviada para psicólogo ${consulta.Psicologo.Id}`);
            }

        } catch (error) {
            console.error('[ConsultaCancelamentoService] Erro ao notificar cancelamento:', error);
            // Não relança para não quebrar o fluxo de cancelamento
        }
    }

    /**
     * Envia email de cancelamento para o paciente
     */
    private async enviarEmailCancelamentoPaciente(dados: {
        destinatarioNome: string;
        emailDestino: string;
        psicologoNome: string;
        pacienteNome: string;
        data: string;
        horario: string;
        motivo: string;
        contato: string;
    }): Promise<void> {
        try {
            if (!emailQueue) {
                console.warn('[ConsultaCancelamentoService] Email queue não disponível (Redis offline)');
                return;
            }

            // Lê o template
            const templatePath = join(__dirname, '../templates/cancelamentoConsulta.html');
            let htmlTemplate = readFileSync(templatePath, 'utf-8');

            // Substitui placeholders
            htmlTemplate = htmlTemplate
                .replace(/{{destinatarioNome}}/g, dados.destinatarioNome)
                .replace(/{{psicologoNome}}/g, dados.psicologoNome)
                .replace(/{{pacienteNome}}/g, dados.pacienteNome)
                .replace(/{{data}}/g, dados.data)
                .replace(/{{horario}}/g, dados.horario)
                .replace(/{{motivo}}/g, dados.motivo)
                .replace(/{{contato}}/g, dados.contato);

            await emailQueue.add(
                'send-email',
                {
                    type: 'other',
                    to: dados.emailDestino,
                    nome: dados.destinatarioNome,
                    subject: `Sua consulta foi cancelada - ${dados.data} às ${dados.horario}`,
                    htmlTemplate: htmlTemplate,
                    templateData: {},
                },
                {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                }
            );
        } catch (error) {
            console.error('[ConsultaCancelamentoService] Erro ao enviar email para paciente:', error);
        }
    }

    /**
     * Envia email de cancelamento para o psicólogo
     */
    private async enviarEmailCancelamentoPsicologo(dados: {
        destinatarioNome: string;
        emailDestino: string;
        psicologoNome: string;
        pacienteNome: string;
        data: string;
        horario: string;
        motivo: string;
        contato: string;
    }): Promise<void> {
        try {
            if (!emailQueue) {
                console.warn('[ConsultaCancelamentoService] Email queue não disponível (Redis offline)');
                return;
            }

            // Lê o template
            const templatePath = join(__dirname, '../templates/cancelamentoConsulta.html');
            let htmlTemplate = readFileSync(templatePath, 'utf-8');

            // Substitui placeholders
            htmlTemplate = htmlTemplate
                .replace(/{{destinatarioNome}}/g, dados.destinatarioNome)
                .replace(/{{psicologoNome}}/g, dados.psicologoNome)
                .replace(/{{pacienteNome}}/g, dados.pacienteNome)
                .replace(/{{data}}/g, dados.data)
                .replace(/{{horario}}/g, dados.horario)
                .replace(/{{motivo}}/g, dados.motivo)
                .replace(/{{contato}}/g, dados.contato);

            await emailQueue.add(
                'send-email',
                {
                    type: 'other',
                    to: dados.emailDestino,
                    nome: dados.destinatarioNome,
                    subject: `Consulta cancelada - ${dados.pacienteNome} - ${dados.data}`,
                    htmlTemplate: htmlTemplate,
                    templateData: {},
                },
                {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                }
            );
        } catch (error) {
            console.error('[ConsultaCancelamentoService] Erro ao enviar email para psicólogo:', error);
        }
    }

    /**
     * Notifica via WebSocket
     */
    private async notificarViSocket(
        usuarioId: string,
        evento: string,
        dados: unknown
    ): Promise<void> {
        try {
            await this.wsNotify.emitToUser(usuarioId, evento, dados);
        } catch (error) {
            console.error(`[ConsultaCancelamentoService] Erro ao notificar ${usuarioId} via socket:`, error);
        }
    }
}

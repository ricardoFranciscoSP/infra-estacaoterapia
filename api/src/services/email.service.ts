import dayjs from 'dayjs';
import path from 'path';
import fs from 'fs';
import { IEmailService, SendEmailParams, ReservationEmailData } from '../interfaces/email.interface';
import { sendEmail } from './send.email.service';

// Helper function to convert reservation/consulta objects to ReservationEmailData
function convertToReservationEmailData(reservation: {
    Paciente?: { Id?: string; Nome?: string; Email?: string } | null;
    Psicologo?: { Id?: string; Nome?: string; Email?: string } | null;
    paciente?: { Id?: string; nome?: string; email?: string } | null;
    psicologo?: { Id?: string; nome?: string; email?: string } | null;
    Agenda?: { Data?: Date | string; Horario?: string } | null;
    date?: Date | string;
    time?: string;
}): ReservationEmailData {
    return {
        paciente: reservation.Paciente ? {
            Id: reservation.Paciente.Id,
            nome: reservation.Paciente.Nome,
            email: reservation.Paciente.Email
        } : reservation.paciente ? {
            Id: reservation.paciente.Id,
            nome: reservation.paciente.nome,
            email: reservation.paciente.email
        } : null,
        psicologo: reservation.Psicologo ? {
            Id: reservation.Psicologo.Id,
            nome: reservation.Psicologo.Nome,
            email: reservation.Psicologo.Email
        } : reservation.psicologo ? {
            Id: reservation.psicologo.Id,
            nome: reservation.psicologo.nome,
            email: reservation.psicologo.email
        } : null,
        date: reservation.Agenda?.Data || reservation.date,
        time: reservation.Agenda?.Horario || reservation.time
    };
}

// Helper para obter o caminho dos assets dos templates
const getTemplateAssetsPath = (filename: string): string | null => {
    // Prioriza caminhos de desenvolvimento (localhost) e depois produção
    const possiblePaths = [
        // Desenvolvimento (ts-node-dev): src/templates/assets
        path.resolve(process.cwd(), 'src', 'templates', 'assets', filename),
        path.resolve(__dirname, '..', '..', 'src', 'templates', 'assets', filename),
        // Produção (compilado): dist/templates/assets
        path.resolve(process.cwd(), 'dist', 'templates', 'assets', filename),
        path.resolve(__dirname, '..', 'templates', 'assets', filename),
    ];

    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            console.log(`[EmailService] ✅ Asset encontrado: ${filename} em ${filePath}`);
            return filePath;
        }
    }

    // Log detalhado para debug
    console.error(`[EmailService] ❌ Asset não encontrado: ${filename}`);
    console.error(`[EmailService] __dirname: ${__dirname}`);
    console.error(`[EmailService] process.cwd(): ${process.cwd()}`);
    console.error(`[EmailService] Caminhos testados:`);
    possiblePaths.forEach(p => console.error(`  - ${p} (existe: ${fs.existsSync(p)})`));

    return null;
};

// Helper para criar attachments de imagens usando Buffer
const createImageAttachments = (filenames: string[]) => {
    const attachments = filenames
        .map((filename) => {
            const filePath = getTemplateAssetsPath(filename);
            if (!filePath) {
                console.warn(`[EmailService] ⚠️ Pulando ${filename} - arquivo não encontrado`);
                return null;
            }

            // Lê o arquivo como Buffer
            let imageBuffer: Buffer;
            try {
                imageBuffer = fs.readFileSync(filePath);
            } catch (error) {
                console.error(`[EmailService] ❌ Erro ao ler arquivo ${filename}:`, error);
                return null;
            }

            const ext = path.extname(filename).toLowerCase();
            const contentType = ext === '.svg' ? 'image/svg+xml' :
                ext === '.png' ? 'image/png' :
                    ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                        ext === '.gif' ? 'image/gif' :
                            ext === '.webp' ? 'image/webp' :
                                undefined;

            const attachment = {
                filename,
                content: imageBuffer, // Buffer aqui
                cid: filename,
                contentType,
            };

            console.log(`[EmailService] 📎 Attachment configurado: ${filename} (CID: ${filename}, Content-Type: ${contentType}, Buffer size: ${imageBuffer.length} bytes)`);

            return attachment;
        })
        .filter((att): att is NonNullable<typeof att> => att !== null);

    console.log(`[EmailService] ✅ Total de ${attachments.length} attachments criados de ${filenames.length} arquivos solicitados`);

    return attachments;
};


export class EmailService implements IEmailService {
    async sendContatoEmail(params: { nome: string; email: string; telefone: string; assunto: string; mensagem: string }): Promise<void> {
        await sendEmail({
            to: process.env.CONTACT_EMAIL || 'contato@estacaoterapia.com.br',
            subject: `Contato: ${params.assunto}`,
            htmlTemplate: 'contato',
            templateData: {
                nome: params.nome,
                email: params.email,
                telefone: params.telefone,
                assunto: params.assunto,
                mensagem: params.mensagem
            }
        });
    }
    async send(params: SendEmailParams): Promise<void> {
        await sendEmail(params);
    }

    async sendConfirmationEmail(user: { email: string; nome: string }, reservation: ReservationEmailData): Promise<void> {
        try {
            if (reservation.psicologo) {
                await sendEmail({
                    to: user.email,
                    subject: 'Confirmação de Consulta',
                    htmlTemplate: 'confirmAppointment',
                    templateData: {
                        pacienteNome: user.nome,
                        psicologoNome: reservation.psicologo.nome,
                        data: reservation.date,
                        horario: reservation.time,
                    },
                });
            }
        } catch (emailError) {
            console.error('Erro ao enviar e-mail de confirmação:', emailError);
        }
    }

    async sendAppointmentConfirmationEmailPaciente(email: string, nome: string, psicologoNome: string, data: string, horario: string): Promise<void> {
        try {
            // Anexa explicitamente todas as imagens necessárias
            const attachments = createImageAttachments([
                'logo.svg',
                'facebook.png',
                'instagram.png',
                'linkedin.png',
                'tiktok.png',
                'youtube.png',
            ]);

            await sendEmail({
                to: email,
                subject: 'Confirmação de Consulta',
                htmlTemplate: 'confirmAppointment',
                templateData: {
                    pacienteNome: nome,
                    psicologoNome: psicologoNome,
                    data: data,
                    horario: horario,
                },
                attachments,
            });
            console.log(`[EmailService] ✅ Email de confirmação de agendamento enviado para paciente: ${email}`);
        } catch (emailError) {
            console.error('[EmailService] ❌ Erro ao enviar e-mail de confirmação para paciente:', emailError);
            throw emailError;
        }
    }

    async sendAppointmentConfirmationEmailPsicologo(email: string, nome: string, pacienteNome: string, pacienteEmail: string, data: string, horario: string): Promise<void> {
        try {
            // Extrai o primeiro nome do psicólogo
            const primeiroNome = nome.split(' ')[0];

            // URL do dashboard do psicólogo
            const dashboardUrl = process.env.FRONTEND_URL
                ? `${process.env.FRONTEND_URL}/painel-psicologo`
                : 'https://pre.estacaoterapia.com.br/painel-psicologo';

            await sendEmail({
                to: email,
                subject: 'Parabéns! Um cliente agendou consulta com você na ESTAÇÃO TERAPIA 💜 - Fique atento e confira já os detalhes do seu atendimento!',
                htmlTemplate: 'confirmAppointmentPsicologo',
                templateData: {
                    nome,
                    primeiro_nome: primeiroNome,
                    nome_paciente: pacienteNome,
                    email_paciente: pacienteEmail,
                    data_sessao: data,
                    horario_sessao: horario,
                    dashboardUrl,
                },
            });
            console.log(`[EmailService] ✅ Email de confirmação de agendamento enviado para psicólogo: ${email}`);
        } catch (emailError) {
            console.error('[EmailService] ❌ Erro ao enviar e-mail de confirmação para psicólogo:', emailError);
            throw emailError;
        }
    }

    async sendCancellationEmail(reservation: ReservationEmailData | { Paciente?: { Nome?: string; Email?: string } | null; Psicologo?: { Nome?: string; Email?: string } | null; Agenda?: { Data?: Date | string; Horario?: string } | null; date?: Date | string; time?: string }, motivo: string, protocolo: string): Promise<void> {
        try {
            const emailData = 'paciente' in reservation ? reservation as ReservationEmailData : convertToReservationEmailData(reservation);
            await sendEmail({
                to: emailData.paciente?.email ?? '',
                subject: 'Cancelamento de Consulta',
                htmlTemplate: 'cancelAppointment',
                templateData: {
                    pacienteNome: emailData.paciente?.nome ?? 'Paciente não identificado',
                    psicologoNome: emailData.psicologo?.nome ?? 'Psicólogo não identificado',
                    data: emailData.date ? (typeof emailData.date === 'string' ? emailData.date : emailData.date.toISOString().split('T')[0]) : '',
                    horario: emailData.time ?? '',
                    motivo,
                    dataCancelamento: dayjs().format('YYYY-MM-DD'),
                    horarioCancelamento: dayjs().format('HH:mm'),
                    protocolo
                }
            });
        } catch (emailError) {
            console.error('Erro ao enviar e-mail de cancelamento:', emailError);
        }
    }

    async sendAutoCancellationEmail(reservation: ReservationEmailData | { Paciente?: { Nome?: string; Email?: string } | null; Psicologo?: { Nome?: string; Email?: string } | null; Agenda?: { Data?: Date | string; Horario?: string } | null; date?: Date | string; time?: string }): Promise<void> {
        const whatsappContact = process.env.WHATSAPP_CONTACT || 'Contato via WhatsApp: +55 11 99999-9999';
        try {
            const emailData = 'paciente' in reservation ? reservation as ReservationEmailData : convertToReservationEmailData(reservation);
            if (emailData.paciente?.email) {
                await sendEmail({
                    to: emailData.paciente.email,
                    subject: 'Cancelamento Automático de Consulta',
                    htmlTemplate: 'cancelarReservaAutomatico',
                    templateData: {
                        destinatarioNome: emailData.paciente.nome || 'Paciente',
                        psicologoNome: emailData.psicologo?.nome || 'Psicólogo não identificado',
                        data: emailData.date ? (typeof emailData.date === 'string' ? emailData.date : emailData.date.toISOString().split('T')[0]) : '',
                        horario: emailData.time || '',
                        mensagem: 'Este é um e-mail automático. Por favor, não responda.',
                        contato: whatsappContact,
                    },
                });
            }

            if (emailData.psicologo?.email) {
                await sendEmail({
                    to: emailData.psicologo.email,
                    subject: 'Cancelamento Automático de Consulta',
                    htmlTemplate: 'template/cancelarReservaAutomatico.html',
                    templateData: {
                        destinatarioNome: emailData.psicologo.nome || 'Psicólogo',
                        pacienteNome: emailData.paciente?.nome || 'Paciente não identificado',
                        data: emailData.date ? (typeof emailData.date === 'string' ? emailData.date : emailData.date.toISOString().split('T')[0]) : '',
                        horario: emailData.time || '',
                        mensagem: 'Este é um e-mail automático. Por favor, não responda.',
                        contato: whatsappContact,
                    },
                });
            }
        } catch (emailError) {
            console.error('Erro ao enviar e-mail de cancelamento automático:', emailError);
        }
    }

    async sendWelcomeEmail(email: string, nome: string): Promise<void> {
        // URL do login baseada no ambiente
        const loginUrl = process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/login`
            : process.env.NODE_ENV === 'production'
                ? 'https://estacaoterapia.com.br/login'
                : process.env.NODE_ENV === 'pre' || process.env.NODE_ENV === 'staging'
                    ? 'https://pre.estacaoterapia.com.br/login'
                    : 'http://localhost:3000/login';

        await sendEmail({
            to: email,
            subject: 'Bem-vindo à plataforma!',
            htmlTemplate: 'welcome',
            templateData: { nome, email, loginUrl }
        });
    }

    async sendWelcomePsicologoEmail(email: string, nome: string): Promise<void> {
        // Extrai o primeiro nome
        const primeiroNome = nome.split(' ')[0];

        // Anexa explicitamente todas as imagens necessárias
        // logo.svg e redes sociais são usados no layout.html
        const attachments = createImageAttachments([
            'logo.svg',
            'facebook.png',
            'instagram.png',
            'linkedin.png',
            'tiktok.png',
            'youtube.png',
        ]);

        await sendEmail({
            to: email,
            subject: `Seu pré-cadastro na Estação Terapia foi concluído com sucesso ${primeiroNome} – ESTAÇÃO TERAPIA 💜`,
            htmlTemplate: 'welcomePsicologo',
            templateData: {
                nome,
                primeiro_nome: primeiroNome,
            },
            attachments,
        });
    }

    async sendAprovacaoPsicologoEmail(email: string, nome: string): Promise<void> {
        console.log('[EmailService] 📧 Preparando email de aprovação de psicólogo...');

        // Anexa explicitamente todas as imagens necessárias para o template de aprovação
        const attachments = createImageAttachments([
            'f20dfcd1510ae5368b1e845df200e817.png',
            '8676943812655b783ae9e5069df4066d.png',
            '292325fc96280962903f4792fc7eefe4.png',
            'logo.svg',
            'facebook.png',
            'instagram.png',
            'linkedin.png',
            'tiktok.png',
            'youtube.png',
        ]);

        if (attachments.length === 0) {
            console.error('[EmailService] ⚠️ ATENÇÃO: Nenhum attachment foi criado! As imagens podem não aparecer no email.');
        } else {
            console.log(`[EmailService] ✅ ${attachments.length} imagens serão anexadas ao email de aprovação`);
        }

        await sendEmail({
            to: email,
            subject: 'Parabéns! O seu credenciamento foi aprovado pela ESTAÇÃO TERAPIA 💜',
            htmlTemplate: 'aprovacaoPsicologo',
            templateData: {
                nome,
            },
            attachments,
        });

        console.log('[EmailService] ✅ Email de aprovação enviado para:', email);
    }

    async sendStatusAtualizadoPsicologoEmail(email: string, nome: string, statusLabel: string): Promise<void> {
        console.log('[EmailService] 📧 Preparando email de atualização de status do psicólogo...');
        const primeiroNome = nome.split(' ')[0];

        const attachments = createImageAttachments([
            'logo.svg',
            'facebook.png',
            'instagram.png',
            'linkedin.png',
            'tiktok.png',
            'youtube.png',
        ]);

        await sendEmail({
            to: email,
            subject: `Atualização de status do seu credenciamento – ESTAÇÃO TERAPIA 💜`,
            htmlTemplate: 'statusAtualizadoPsicologo',
            templateData: {
                nome,
                primeiro_nome: primeiroNome,
                status: statusLabel,
            },
            attachments,
        });

        console.log('[EmailService] ✅ Email de status enviado para:', email);
    }

    async sendCompletePerfilPsicologoEmail(email: string, nome: string): Promise<void> {
        // Extrai o primeiro nome
        const primeiroNome = nome.split(' ')[0];

        // URL do dashboard do psicólogo
        const dashboardUrl = process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/painel-psicologo/pos-cadastro`
            : 'https://pre.estacaoterapia.com.br/painel-psicologo/pos-cadastro';

        // Anexa explicitamente todas as imagens necessárias
        const attachments = createImageAttachments([
            'logo.svg',
            'facebook.png',
            'instagram.png',
            'linkedin.png',
            'tiktok.png',
            'youtube.png',
        ]);

        await sendEmail({
            to: email,
            subject: 'Complete seu perfil e já comece a atender conosco!',
            htmlTemplate: 'completePerfilPsicologo',
            templateData: {
                nome,
                primeiro_nome: primeiroNome,
                dashboardUrl,
            },
            attachments,
        });

        console.log('[EmailService] ✅ Email de lembrete para completar perfil enviado para:', email);
    }

    async sendResetPasswordEmail(to: string, nome: string, resetCode: string): Promise<void> {
        console.log('[EmailService] 📧 Preparando email de reset de senha...');

        // Extrai o primeiro nome
        const primeiroNome = nome.split(' ')[0];

        // Anexa explicitamente todas as imagens necessárias
        // communication.svg é usado no template resetPassword
        // logo.svg e redes sociais são usados no layout.html
        console.log('[EmailService] 🔍 Buscando assets para anexar...');
        const attachments = createImageAttachments([
            'communication.svg',
            'logo.svg',
            'facebook.png',
            'instagram.png',
            'linkedin.png',
            'tiktok.png',
            'youtube.png',
        ]);

        if (attachments.length === 0) {
            console.error('[EmailService] ⚠️ ATENÇÃO: Nenhum attachment foi criado! As imagens podem não aparecer no email.');
        } else {
            console.log(`[EmailService] ✅ ${attachments.length} imagens serão anexadas ao email`);
        }

        await sendEmail({
            to,
            subject: 'Redefinição de Senha - ESTAÇÃO TERAPIA 💜',
            htmlTemplate: 'resetPassword',
            templateData: {
                nome,
                primeiro_nome: primeiroNome,
                resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetCode}`,
                resetCode,
            },
            attachments,
        });

        console.log('[EmailService] ✅ Email de reset de senha enviado');
    }

    async sendResetPasswordLinkEmail(to: string, nome: string, resetLink: string, expirationHours: number): Promise<void> {
        await sendEmail({
            to,
            subject: 'Redefinição de Senha - Link Seguro',
            htmlTemplate: 'resetPasswordLink',
            templateData: {
                nome,
                resetLink,
                expirationHours,
            },
        });
    }

    async sendRandomPasswordEmail(to: string, nome: string, password: string): Promise<void> {
        await sendEmail({
            to,
            subject: 'Nova Senha Gerada',
            htmlTemplate: 'randomPassword',
            templateData: {
                nome,
                password,
                warning: 'Por segurança, você será obrigado a alterar esta senha no próximo login.',
            },
        });
    }

    async sendPasswordResetConfirmation(to: string, nome: string): Promise<void> {
        await sendEmail({
            to,
            subject: 'Confirmação de Alteração de Senha',
            htmlTemplate: 'confirmResetPassword',
            templateData: { nome },
        });
    }

    async sendPlanoCompraConfirmationEmail(user: any, plano: any, dataExpiracao: Date): Promise<void> {
        const couponByPlan: Record<string, string> = {
            jornada: 'JORET40',
            viagem: 'VIAG30',
            embarque: 'EMBQ20',
        };
        const planoNome = plano?.nome ?? '';
        const normalizedPlanName = planoNome.trim().toLowerCase();
        const cupomTintaDoce = couponByPlan[normalizedPlanName] ?? '—';

        await sendEmail({
            to: user?.email!,
            subject: "Confirmação de Compra de Plano",
            htmlTemplate: "compraPlano",
            templateData: {
                nome: user?.nome,
                planoNome,
                valor: plano.preco,
                dataExpiracao: dataExpiracao.toLocaleDateString(),
                cupomTintaDoce,
            },
        });
    }

    async sendCartaoCadastroConfirmationEmail(
        user: any,
        nomeTitular: string,
        ultimos4Digitos: string,
        bandeira: string,
        validadeMes: string,
        validadeAno: string
    ): Promise<void> {
        await sendEmail({
            to: user?.email!,
            subject: "Confirmação de Cadastro de Cartão",
            htmlTemplate: "cadastroCartao",
            templateData: {
                nome: user?.nome,
                nomeTitular,
                ultimos4Digitos,
                bandeira,
                validade: `${validadeMes}/${validadeAno}`,
            },
        });
    }

    async sendPlanoCancelamentoConfirmationEmail(user: any, plano: any, dataCancelamento: Date): Promise<void> {
        await sendEmail({
            to: user?.email!,
            subject: "Confirmação de Cancelamento de Plano",
            htmlTemplate: "cancelamentoPlano",
            templateData: {
                nome: user?.nome,
                planoNome: plano.nome,
                dataCancelamento: dataCancelamento.toLocaleDateString(),
            },
        });
    }

    async sendPlanoCancelamentoComMultaEmail(
        user: any,
        plano: any,
        valorMulta: number,
        dataLimiteFidelidade: Date
    ): Promise<void> {
        await sendEmail({
            to: user?.email!,
            subject: "Cancelamento de Plano com Multa",
            htmlTemplate: "cancelamentoPlanoComMulta",
            templateData: {
                nome: user?.nome,
                planoNome: plano.nome,
                valorMulta: valorMulta.toFixed(2),
                dataLimiteFidelidade: dataLimiteFidelidade.toLocaleDateString(),
            },
        });
    }

    async sendPlanoUpgradeConfirmationEmail(
        user: any,
        planoAtual: any,
        novoPlano: any,
        valorProporcional: number,
        dataExpiracao: Date
    ): Promise<void> {
        await sendEmail({
            to: user?.email!,
            subject: "Confirmação de Upgrade de Plano",
            htmlTemplate: "upgradePlano",
            templateData: {
                nome: user?.nome,
                planoAtual: planoAtual.nome,
                novoPlano: novoPlano.nome,
                valorProporcional: valorProporcional.toFixed(2),
                dataExpiracao: dataExpiracao.toLocaleDateString(),
            },
        });
    }

    async enviarConfirmacaoPagamento({ to, nome, valor, statusPagamento }: { to: string; nome: string; valor: number; statusPagamento: string }) {
        await sendEmail({
            to,
            subject: "Confirmação de Pagamento",
            htmlTemplate: "confirmacaoPagamento",
            templateData: { nome, valor, statusPagamento },
        });
    }

    async enviarAtualizacaoStatusRecorrencia({ to, nome, recorrenciaId, statusPagamento }: { to: string; nome: string; recorrenciaId: string; statusPagamento: string }) {
        await sendEmail({
            to,
            subject: "Atualização de Status de Recorrência",
            htmlTemplate: "atualizacaoStatusRecorrencia",
            templateData: { nome, recorrenciaId, statusPagamento },
        });
    }

    async sendCancelamentoCriadoEmail(reservation: ReservationEmailData, motivo: string, protocolo: string): Promise<void> {
        // Envia para paciente
        if (reservation.paciente?.email) {
            await sendEmail({
                to: reservation.paciente.email,
                subject: 'Solicitação de Cancelamento Recebida',
                htmlTemplate: 'cancelamentoCriadoPaciente',
                templateData: {
                    pacienteNome: reservation.paciente.nome,
                    psicologoNome: reservation.psicologo?.nome ?? 'Psicólogo não identificado',
                    data: reservation.date,
                    horario: reservation.time,
                    motivo,
                    protocolo
                }
            });
        }
        // Envia para psicólogo
        if (reservation.psicologo?.email) {
            await sendEmail({
                to: reservation.psicologo.email,
                subject: 'Solicitação de Cancelamento Recebida',
                htmlTemplate: 'cancelamentoCriadoPsicologo',
                templateData: {
                    psicologoNome: reservation.psicologo.nome,
                    pacienteNome: reservation.paciente?.nome ?? 'Paciente não identificado',
                    data: reservation.date,
                    horario: reservation.time,
                    motivo,
                    protocolo
                }
            });
        }
    }

    async sendCancelamentoAtualizadoEmail(reservation: ReservationEmailData, motivo: string, protocolo: string, status: string, data: string, horario: string, autorTipo: string): Promise<void> {
        // Envia para paciente
        if (reservation.paciente?.email && autorTipo === 'PACIENTE') {
            await sendEmail({
                to: reservation.paciente.email,
                subject: 'Atualização na Solicitação de Cancelamento',
                htmlTemplate: 'cancelamentoAtualizadoPaciente',
                templateData: {
                    pacienteNome: reservation.paciente.nome,
                    psicologo: reservation.psicologo?.nome ?? 'Psicólogo não identificado',
                    data,
                    horario,
                    status,
                    protocolo,
                    motivo
                }
            });
        }
        // Envia para psicólogo
        if (reservation.psicologo?.email && autorTipo === 'PSICOLOGO') {
            await sendEmail({
                to: reservation.psicologo.email,
                subject: 'Atualização na Solicitação de Cancelamento',
                htmlTemplate: 'cancelamentoAtualizadoPsicologo',
                templateData: {
                    psicologoNome: reservation.psicologo.nome,
                    paciente: reservation.paciente?.nome ?? 'Paciente não identificado',
                    data,
                    horario,
                    status,
                    protocolo,
                    motivo
                }
            });
        }
    }

    async sendCancelamentoAprovadoEmail(reservation: ReservationEmailData, motivo: string, protocolo: string, dentroDoPrazo?: boolean): Promise<void> {
        // Envia para paciente
        if (reservation.paciente?.email) {
            await sendEmail({
                to: reservation.paciente.email,
                subject: 'Cancelamento Aprovado',
                htmlTemplate: 'cancelamentoAprovadoPaciente',
                templateData: {
                    pacienteNome: reservation.paciente.nome,
                    psicologoNome: reservation.psicologo?.nome ?? 'Psicólogo não identificado',
                    data: reservation.date,
                    horario: reservation.time,
                    motivo,
                    protocolo
                }
            });
        }
        // Envia para psicólogo - verifica se é cancelamento do paciente e se está dentro ou fora do prazo
        if (reservation.psicologo?.email && reservation.tipo === 'Paciente') {
            const primeiroNome = reservation.psicologo.nome?.split(' ')[0] ?? 'Psicólogo';
            const nomePaciente = reservation.paciente?.nome ?? 'Paciente não identificado';

            // Se dentroDoPrazo não foi informado, assume true (comportamento padrão)
            const isDentroPrazo = dentroDoPrazo !== undefined ? dentroDoPrazo : true;

            if (isDentroPrazo) {
                // Cancelamento dentro do prazo
                await this.sendCancelamentoConsultaDentroPrazoEmail(
                    reservation.psicologo.email,
                    primeiroNome,
                    nomePaciente
                );
            } else {
                // Cancelamento fora do prazo
                await this.sendCancelamentoConsultaForaPrazoEmail(
                    reservation.psicologo.email,
                    primeiroNome,
                    nomePaciente
                );
            }
        } else if (reservation.psicologo?.email) {
            // Se não for cancelamento do paciente, usa o template padrão
            await sendEmail({
                to: reservation.psicologo.email,
                subject: 'Cancelamento Aprovado',
                htmlTemplate: 'cancelamentoAprovadoPsicologo',
                templateData: {
                    psicologoNome: reservation.psicologo.nome,
                    pacienteNome: reservation.paciente?.nome ?? 'Paciente não identificado',
                    data: reservation.date,
                    horario: reservation.time,
                    motivo,
                    protocolo
                }
            });
        }
    }

    async sendPlanoRenovacaoAvisoEmail(user: any, plano: any, dataExpiracao: Date): Promise<void> {
        await sendEmail({
            to: user?.email!,
            subject: "Aviso de Renovação Automática do Plano",
            htmlTemplate: "renovacaoAutomatica",
            templateData: {
                nome: user?.nome,
                planoNome: plano.nome,
                dataExpiracao: dataExpiracao.toLocaleDateString(),
            },
        });
    }

    async sendContratoGeradoEmail({ to, nome, linkContrato, pdfBuffer }: { to: string, nome: string, linkContrato: string, pdfBuffer?: Buffer }): Promise<void> {
        const attachments = pdfBuffer ? [{
            filename: `contrato-parceria-${nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
        }] : [];

        await sendEmail({
            to,
            subject: "Contrato Gerado",
            htmlTemplate: "contratoPsicologo",
            templateData: {
                nome,
                linkContrato
            },
            attachments
        });
    }

    async sendCancelamentoConsultaDentroPrazoEmail(email: string, primeiroNome: string, nomePaciente: string): Promise<void> {
        try {
            await sendEmail({
                to: email,
                subject: 'Infelizmente seu paciente cancelou a sessão agendada com você na ESTAÇÃO TERAPIA - Lamentamos',
                htmlTemplate: 'cancelamentoConsultaDentroPrazo',
                templateData: {
                    primeiro_nome: primeiroNome,
                    nome_paciente: nomePaciente,
                },
            });
            console.log(`[EmailService] ✅ Email de cancelamento dentro do prazo enviado para psicólogo: ${email}`);
        } catch (emailError) {
            console.error('[EmailService] ❌ Erro ao enviar e-mail de cancelamento dentro do prazo:', emailError);
            throw emailError;
        }
    }

    async sendCancelamentoConsultaForaPrazoEmail(email: string, primeiroNome: string, nomePaciente: string): Promise<void> {
        try {
            await sendEmail({
                to: email,
                subject: 'Infelizmente seu paciente cancelou a sessão agendada com você na ESTAÇÃO TERAPIA - Lamentamos',
                htmlTemplate: 'cancelamentoConsultaForaPrazo',
                templateData: {
                    primeiro_nome: primeiroNome,
                    nome_paciente: nomePaciente,
                },
            });
            console.log(`[EmailService] ✅ Email de cancelamento fora do prazo enviado para psicólogo: ${email}`);
        } catch (emailError) {
            console.error('[EmailService] ❌ Erro ao enviar e-mail de cancelamento fora do prazo:', emailError);
            throw emailError;
        }
    }
}
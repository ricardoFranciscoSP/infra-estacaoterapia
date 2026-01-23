import { Socket, Server } from "socket.io";
import { getConnectedUsers } from "./onConnect";
// Tipos locais para evitar importar Prisma Client no socket-server
const AgendaStatus = {
    Reservado: 'Reservado',
    Agendada: 'Agendada',
    EmAndamento: 'EmAndamento',
    Concluido: 'Concluido',
    Cancelado: 'Cancelado'
} as const;
import { AutorTipoCancelamento } from "../../types/permissions.types";
import * as apiClient from "../utils/apiClient";

// Interface equivalente ao payload do join-consulta
interface ConsultationJoinPayload {
    consultationId: string;
    userId: string;
    role: "Patient" | "Psicologo";
}

// Interface para o payload de levantar mão
interface HandRaisePayload {
    consultationId: string;
    userId: string;
    role: "Patient" | "Psychologist";
    isRaised: boolean;
}

// Função para lidar com inatividade quando um ou ambos os participantes não entram após 10 minutos do início
async function handleInactivity(
    io: Server,
    consultationId: string,
    missingRole: "Patient" | "Psychologist" | "Both"
) {
    try {
        let missingRolePt: string;
        let motivo: string;
        let autorId: string | null = null;
        let tipoCancelamento: AutorTipoCancelamento;

        if (missingRole === "Both") {
            missingRolePt = "Ambos";
            motivo = "Paciente e psicólogo não compareceram após 10 minutos do início da consulta";
            tipoCancelamento = AutorTipoCancelamento.Sistema;
            console.log(`⚠️ [handleInactivity] Consulta ${consultationId} cancelada por inatividade: nenhum participante compareceu`);
        } else {
            missingRolePt = missingRole === "Patient" ? "Paciente" : "Psicólogo";
            motivo = `${missingRolePt} não compareceu após 10 minutos do início da consulta`;
            tipoCancelamento = missingRole === "Patient" ? AutorTipoCancelamento.Paciente : AutorTipoCancelamento.Psicologo;
            console.log(`⚠️ [handleInactivity] Consulta ${consultationId} cancelada por inatividade: ${missingRolePt} não compareceu`);
        }

        // Notifica sobre a inatividade antes de cancelar
        const message = missingRole === "Both"
            ? "A consulta foi cancelada automaticamente. Nenhum participante compareceu após 10 minutos do início."
            : `A consulta foi cancelada automaticamente. O ${missingRolePt.toLowerCase()} não compareceu após 10 minutos do início.`;

        io.to(`consulta_${consultationId}`).emit("consultation:inactivity", {
            consultationId,
            message,
            missingRole,
            status: "Cancelado"
        });

        // Processa inatividade via API para evitar usar Prisma no socket-server
        try {
            const consulta = await apiClient.getConsulta(consultationId);

            if (!consulta) {
                console.error(`❌ [handleInactivity] Consulta ${consultationId} não encontrada`);
                return;
            }

            // Determina o AutorId baseado no missingRole
            if (missingRole === "Both") {
                autorId = null; // Sistema cancela
            } else if (missingRole === "Patient") {
                autorId = consulta.PsicologoId || null;
            } else {
                autorId = consulta.PacienteId || null;
            }

            // Processa inatividade via API (evita usar Prisma no socket-server)
            // O endpoint da API processará a inatividade, repasse financeiro e cancelamento
            await apiClient.processInactivity(consultationId, missingRole);

            // Cria registro de cancelamento via API
            await apiClient.createCancelamentoSessao({
                ConsultaId: consultationId,
                Motivo: motivo,
                AutorId: autorId,
                AutorTipo: tipoCancelamento,
            });
        } catch (error) {
            console.error(`❌ [handleInactivity] Erro ao buscar consulta ou criar cancelamento:`, error);
            return;
        }

        // Notifica sobre o cancelamento
        io.to(`consulta_${consultationId}`).emit("consultation:status-changed", {
            status: "Cancelado",
            consultationId,
            reason: "inactivity"
        });

        console.log(`✅ [handleInactivity] Consulta ${consultationId} cancelada e agenda liberada`);
    } catch (error) {
        console.error(`❌ [handleInactivity] Erro ao processar inatividade:`, error);
    }
}

export function handleMessage(io: Server, socket: Socket) {

    // Handler para join-room - adiciona socket à sala especificada
    socket.on("join-room", (roomName: string) => {
        if (typeof roomName === 'string' && roomName.trim()) {
            socket.join(roomName);
            console.log(`✅ [join-room] Socket ${socket.id} entrou na sala: ${roomName}`);
        } else {
            console.warn(`⚠️ [join-room] Nome de sala inválido recebido:`, roomName);
        }
    });

    socket.on("send_notification", (data) => {
        const { toUserId, message, broadcast } = data;

        if (broadcast) {
            // envia para todos os conectados
            io.emit("nova_notificacao", { message, from: socket.id });
            console.log(`📢 Broadcast: ${message}`);
        } else if (toUserId) {
            // envia para TODOS os sockets conectados do usuário
            const users = getConnectedUsers();
            let delivered = false;
            for (const [userId, socketId] of users.entries()) {
                if (userId === toUserId) {
                    io.to(socketId).emit("nova_notificacao", { message, from: socket.id });
                    delivered = true;
                    console.log(`📩 Notificação privada → ${toUserId} (socket: ${socketId}): ${message}`);
                }
            }
            if (!delivered) {
                console.warn(`⚠️ Nenhum socket conectado para o usuário ${toUserId}. Notificação não entregue.`);
            }
        }
    });

    // === Notificações ===
    // Solicita o total de notificações não lidas do usuário conectado
    socket.on("notification:requestCount", async () => {
        try {
            const userId = socket.data?.userId as string | undefined;
            if (!userId) {
                console.warn("[notification:requestCount] Socket sem userId", { socketId: socket.id });
                return;
            }

            const count = await apiClient.countUnreadNotifications(userId);

            // ✅ Emite o contador atualizado em ambos os formatos para compatibilidade
            socket.emit("notification:count", { count });
            socket.emit("notification_counter_update", { unreadCount: count });
        } catch (err) {
            console.error("❌ [notification:requestCount] Erro ao buscar contador:", err);
        }
    });

    // Marca uma notificação como lida e devolve confirmação + novo contador
    socket.on("notification:read", async (payload: { notificationId?: string }) => {
        try {
            const userId = socket.data?.userId as string | undefined;
            const notificationId = payload?.notificationId;

            if (!userId || !notificationId) {
                console.warn("[notification:read] Dados insuficientes", {
                    socketId: socket.id,
                    hasUserId: !!userId,
                    hasNotificationId: !!notificationId,
                });
                return;
            }

            await apiClient.markNotificationAsRead(notificationId, userId);

            socket.emit("notification:read", { notificationId });

            const count = await apiClient.countUnreadNotifications(userId);

            // ✅ Emite o contador atualizado em ambos os formatos para compatibilidade
            socket.emit("notification:count", { count });
            socket.emit("notification_counter_update", { unreadCount: count });
        } catch (err) {
            console.error("❌ [notification:read] Erro ao marcar como lida:", err);
        }
    });

    // consultation:Join
    socket.on("consultation:join", async (data: ConsultationJoinPayload) => {
        try {
            const { consultationId, userId, role } = data;

            // Validação dos dados
            if (!consultationId || !userId || !role) {
                console.warn("❌ [consultation:join] Dados inválidos recebidos:", data);
                return;
            }

            console.log(`📹 [consultation:join] Usuário ${userId} (${role}) entrando na consulta ${consultationId}`);

            // Une o socket à sala específica (garante que está na sala)
            const roomName = `consulta_${consultationId}`;
            socket.join(roomName);
            console.log(`✅ [consultation:join] Socket ${socket.id} entrou na sala ${roomName}`);

            // Atualiza timestamp correto (usa horário de Brasília)
            const field = role === "Patient" ? "PatientJoinedAt" : "PsychologistJoinedAt";
            const { nowBrasiliaDate } = await import('../../utils/timezone.util');
            const now = nowBrasiliaDate();

            await apiClient.updateReservaSessaoJoin(consultationId, field, now);
            
            // Busca a reserva atualizada para usar depois
            const reservaSessao = await apiClient.getReservaSessao(consultationId);

            // Registra entrada no Redis usando ConsultaRoomService
            try {
                const { ConsultaRoomService } = await import('../../services/consultaRoom.service');
                const roomService = new ConsultaRoomService();

                // Busca token para registrar
                const tokenField = role === "Patient" ? "AgoraTokenPatient" : "AgoraTokenPsychologist";
                let token = (reservaSessao?.[tokenField] as string | null | undefined) ?? null;

                // Fallback: se não houver token ainda, gera on-demand (seguro e idempotente)
                if (!token) {
                    try {
                        console.log(`🎫 [consultation:join] Token ausente para ${role}. Gerando on-demand...`);
                        const { generateAgoraTokensForConsulta } = await import('../../utils/scheduleAgoraToken');
                        await generateAgoraTokensForConsulta(
                            consultationId,
                            undefined,
                            'socket'
                        );

                        // Recarrega reserva para obter os tokens recém-gerados
                        const updated = await apiClient.getReservaSessao(consultationId);
                        token = (updated?.[tokenField as keyof typeof updated] as string | null) ?? null;
                    } catch (genErr) {
                        console.error(`❌ [consultation:join] Falha ao gerar token on-demand:`, genErr);
                    }
                }

                if (token) {
                    const roleForRedis = role === "Patient" ? 'patient' : 'psychologist';
                    await roomService.registerParticipantJoin(consultationId, roleForRedis, token);
                } else {
                    console.warn(`⚠️ [consultation:join] Token ainda indisponível após fallback para ${role} em consulta ${consultationId}`);
                }
            } catch (error) {
                console.error(`❌ [consultation:join] Erro ao registrar entrada no Redis:`, error);
                // Não bloqueia o fluxo se Redis falhar
            }

            // Verifica se ambos entraram (PatientJoinedAt e PsychologistJoinedAt preenchidos)
            const patientJoined = reservaSessao.PatientJoinedAt !== null;
            const psychologistJoined = reservaSessao.PsychologistJoinedAt !== null;

            // ℹ️ NOTA: O status EmAndamento é atualizado automaticamente pelo job startConsultation
            // no horário exato do ScheduledAt da ReservaSessao, independente de quem entrou ou não.
            // Não é necessário atualizar aqui quando alguém entra via socket.

            // Se ambos entraram, notifica atualização da próxima consulta
            if (patientJoined && psychologistJoined) {
                try {
                    const consulta = await apiClient.getConsulta(consultationId);
                    if (consulta) {
                        await apiClient.notificarAmbosUsuarios(
                            consulta.PsicologoId || '',
                            consulta.PacienteId || '',
                            'atualizacao'
                        );
                    }
                } catch (err) {
                    console.error(`❌ [consultation:join] Erro ao notificar atualização:`, err);
                }
            }

            // A verificação de inatividade (após 10 minutos do início) é feita pelo job cancelIfNoJoin
            // que verifica os campos PatientJoinedAt e PsychologistJoinedAt

            // Notifica todos na sala sobre o novo participante
            io.to(`consulta_${consultationId}`).emit("user-joined", {
                userId,
                role,
                joinedAt: new Date(),
            });
            // Mensagem de privacidade LGPD
            io.to(`consulta_${consultationId}`).emit("privacy-message", {
                message: "Esta sessão é privada e protegida pela LGPD. Somente você e o(a) psicólogo(a) têm acesso à conversa e à chamada.",
            });

            // Agendar notificação para 15 minutos antes do fim da consulta
            try {
                const reserva = await apiClient.getReservaSessao(consultationId);

                if (reserva && reserva.Consulta) {
                    // Buscar duração da consulta na configuração
                    const config = await apiClient.getConfiguração('duracaoConsultaMin');

                    const duracao = (config && 'Valor' in config ? parseInt(config.Valor) : undefined) || 50; // 50 min padrão
                    const inicio = new Date(reserva.Consulta.Date as string);
                    const fim = new Date(inicio.getTime() + duracao * 60000);
                    const notificarEm = new Date(fim.getTime() - 15 * 60000);
                    const agora = new Date();
                    const delay = notificarEm.getTime() - agora.getTime();

                    if (delay > 0) {
                        setTimeout(() => {
                            io.to(`consulta_${consultationId}`).emit("consulta:aviso-15min", {
                                message: "A consulta se encerra em 15 minutos"
                            });
                        }, delay);
                    }
                }
            } catch (err) {
                console.error("Erro ao agendar aviso de 15 minutos antes do fim da consulta:", err);
            }
        } catch (error) {
            console.error(`❌ [consultation:join] Erro ao processar join na consulta:`, error);
            // Emite erro para o cliente se possível
            if (socket.connected) {
                socket.emit("consultation:join-error", {
                    consultationId: data?.consultationId,
                    error: "Erro ao entrar na consulta. Tente novamente."
                });
            }
        }
    });

    // === Levantar/Abaixar Mão ===
    // Receber do frontend: levantar mão (fora do consultation:join para estar sempre disponível)
    socket.on("hand:raise", async (data: HandRaisePayload) => {
        try {
            // Validação dos dados recebidos
            if (!data || !data.consultationId || !data.userId || !data.role) {
                console.warn("❌ [hand:raise] Dados inválidos recebidos:", data);
                return;
            }

            // Verifica se o socket está na sala da consulta
            const roomName = `consulta_${data.consultationId}`;
            const room = io.sockets.adapter.rooms.get(roomName);
            const isInRoom = room && room.has(socket.id);

            if (!isInRoom) {
                console.warn(`❌ [hand:raise] Socket ${socket.id} não está na sala ${roomName}`);
                // Tenta adicionar o socket à sala caso não esteja
                socket.join(roomName);
                console.log(`✅ [hand:raise] Socket ${socket.id} adicionado à sala ${roomName}`);
            }

            console.log(`✋ [hand:raise] Usuário ${data.userId} (${data.role}) ${data.isRaised ? 'levantou' : 'abaixou'} a mão na consulta ${data.consultationId}`);

            // Emitir para todos na sala "consulta_${data.consultationId}"
            io.to(roomName).emit("hand:raised", {
                userId: data.userId,
                role: data.role,
                isRaised: data.isRaised
            });

            console.log(`✅ [hand:raise] Evento 'hand:raised' emitido para a sala ${roomName}`);
        } catch (error) {
            console.error("❌ [hand:raise] Erro ao processar levantar mão:", error);
        }
    });

    // consultation:Leave - Quando usuário sai da room
    socket.on("consultation:leave", async (data: { consultationId: string; userId: string }) => {
        const { consultationId, userId } = data;

        try {
            // Remove o socket da sala
            socket.leave(`consulta_${consultationId}`);

            console.log(`🚪 [consultation:leave] Usuário ${userId} saiu da consulta ${consultationId}`);

            // Busca informações da reserva para verificar se ambos entraram
            const reservaSessao = await apiClient.getReservaSessao(consultationId);

            if (!reservaSessao || !('Consulta' in reservaSessao) || !reservaSessao.Consulta) {
                console.log(`⚠️ [consultation:leave] ReservaSessao ou Consulta não encontrada para ${consultationId}`);
                return;
            }

            const consulta = reservaSessao.Consulta as {
                Status: string;
                PsicologoId: string | null;
                PacienteId: string | null;
                AgendaId: string | null;
            };

            // Verifica se ambos entraram na sala (ambos têm timestamp de entrada)
            const ambosEntraram = reservaSessao.PatientJoinedAt !== null && reservaSessao.PsychologistJoinedAt !== null;

            // Se ambos entraram e a consulta ainda não está concluída, fecha a sala
            // Independente de quantos usuários ainda estão na sala
            if (ambosEntraram &&
                ((consulta.Status as string) === 'EmAndamento' || (consulta.Status as string) === 'Reservado' || (consulta.Status as string) === 'Agendada' || consulta.Status === AgendaStatus.Reservado)) {

                // Usa ConsultaRoomService para fechar a sala e invalidar tokens
                const { ConsultaRoomService } = await import('../../services/consultaRoom.service');
                const roomService = new ConsultaRoomService();
                await roomService.closeRoom(consultationId, 'completed');

                console.log(`✅ [consultation:leave] Sala ${consultationId} fechada (ambos entraram e alguém saiu)`);

                // Notifica ambos sobre a mudança de status
                io.to(`consulta_${consultationId}`).emit("consultation:status-changed", {
                    status: "Concluido",
                    consultationId
                });

                // Emite evento para forçar fechamento da sala no outro participante
                io.to(`consulta_${consultationId}`).emit("consultation:force-close-room", {
                    consultationId,
                    reason: "user-left",
                    timestamp: new Date().toISOString()
                });

                // Notifica atualização da próxima consulta para ambos os usuários
                try {
                    await apiClient.notificarAmbosUsuarios(
                        consulta.PsicologoId || '',
                        consulta.PacienteId || '',
                        'atualizacao'
                    );
                } catch (err) {
                    console.error(`❌ [consultation:leave] Erro ao notificar atualização:`, err);
                }

                // Notifica ambos usuários sobre a conclusão
                if (consulta.PacienteId) {
                    io.emit("proximaConsultaAtualizada", {
                        userId: consulta.PacienteId,
                        data: { motivo: "consulta_concluida" }
                    });
                }

                if (consulta.PsicologoId) {
                    io.emit("proximaConsultaAtualizada", {
                        userId: consulta.PsicologoId,
                        data: { motivo: "consulta_concluida" }
                    });
                }
            } else if (!ambosEntraram) {
                console.log(`⚠️ [consultation:leave] Não foi possível concluir ${consultationId} - ambos não entraram na sala`);
            } else {
                console.log(`ℹ️ [consultation:leave] Consulta ${consultationId} já está com status ${consulta.Status}`);
            }
        } catch (error) {
            console.error(`❌ [consultation:leave] Erro ao processar saída da consulta:`, error);
        }
    });

    // === Sincronização de Duração da Sessão ===
    // Recebe sincronização de duração de um participante, salva no Redis e repassa para os outros na sala
    socket.on("session:sync-duration", async (data: { consultationId: string; userId: string; role: "Patient" | "Psychologist"; currentDuration: number; timestamp: number }) => {
        try {
            const { consultationId, userId, role, currentDuration, timestamp } = data;

            // Validação dos dados
            if (!consultationId || !userId || !role || currentDuration === undefined) {
                console.warn("❌ [session:sync-duration] Dados inválidos recebidos:", data);
                return;
            }

            const roomName = `consulta_${consultationId}`;

            // Verifica se o socket está na sala da consulta
            const room = io.sockets.adapter.rooms.get(roomName);
            const isInRoom = room && room.has(socket.id);

            if (!isInRoom) {
                console.warn(`❌ [session:sync-duration] Socket ${socket.id} não está na sala ${roomName}`);
                // Tenta adicionar o socket à sala caso não esteja
                socket.join(roomName);
                console.log(`✅ [session:sync-duration] Socket ${socket.id} adicionado à sala ${roomName}`);
            }

            // Busca dados da consulta para calcular tempo restante
            const reservaSessao = await apiClient.getReservaSessao(consultationId);

            let timeRemaining = 0;
            if (reservaSessao?.ScheduledAt) {
                try {
                    // Calcula tempo restante baseado no ScheduledAt + 60 minutos
                    const scheduledAt = new Date(reservaSessao.ScheduledAt);
                    const fimConsulta = new Date(scheduledAt.getTime() + 60 * 60 * 1000);
                    const agora = new Date();
                    const diffMs = fimConsulta.getTime() - agora.getTime();
                    timeRemaining = Math.max(0, Math.floor(diffMs / 1000));
                    // Limita a 60 minutos (3600 segundos)
                    timeRemaining = Math.min(timeRemaining, 3600);
                } catch (error) {
                    console.error("❌ [session:sync-duration] Erro ao calcular tempo restante:", error);
                }
            }

            // Salva no Redis usando ConsultaRoomService
            const { ConsultaRoomService } = await import('../../services/consultaRoom.service');
            const roomService = new ConsultaRoomService();
            await roomService.saveSessionDuration(consultationId, currentDuration, timeRemaining, timestamp);

            console.log(`📤 [session:sync-duration] Recebido de ${userId} (${role}): ${currentDuration}s (restam ${timeRemaining}s) na consulta ${consultationId}`);

            // Notifica tempo restante a cada 5 minutos quando faltar 15 minutos
            const minutesRemaining = Math.ceil(timeRemaining / 60);
            const warningThresholds = [15, 10, 5];
            if (warningThresholds.includes(minutesRemaining)) {
                const durationData = await roomService.getSessionDuration(consultationId);
                const lastWarning = durationData?.lastWarningMinutesSent;

                if (lastWarning !== minutesRemaining) {
                    const warningPayload = {
                        event: 'time-remaining-warning' as const,
                        consultationId,
                        message: `Faltam ${minutesRemaining} minuto(s) para encerrar a sessão.`,
                        minutesRemaining,
                        timestamp: new Date().toISOString()
                    };

                    io.to(roomName).emit('time-remaining-warning', warningPayload);
                    io.to(roomName).emit(`consultation:${consultationId}`, warningPayload);
                    await roomService.saveLastWarningMinutes(consultationId, minutesRemaining);
                    console.log(`⏰ [session:sync-duration] Aviso enviado: ${minutesRemaining} minutos restantes`);
                }
            }

            // Emite para todos os outros na sala (exceto o remetente)
            socket.to(roomName).emit("session:duration-synced", {
                consultationId,
                userId,
                role,
                currentDuration,
                timestamp
            });

            console.log(`✅ [session:sync-duration] Sincronização salva no Redis e repassada para a sala ${roomName}`);
        } catch (error) {
            console.error("❌ [session:sync-duration] Erro ao processar sincronização de duração:", error);
        }
    });

    // === Próxima Consulta ===
    // Solicita a próxima consulta do usuário
    socket.on("proximaConsulta:request", async (payload: { role?: 'Patient' | 'Psychologist' }) => {
        try {
            const userId = socket.data?.userId as string | undefined;
            if (!userId) {
                console.warn("[proximaConsulta:request] Socket sem userId", { socketId: socket.id });
                socket.emit("proximaConsulta:error", { error: "Usuário não identificado" });
                return;
            }

            let proximaConsulta;
            const role = payload?.role;

            if (role === 'Psychologist') {
                proximaConsulta = await apiClient.buscarProximaConsulta(userId);
            } else if (role === 'Patient') {
                proximaConsulta = await apiClient.buscarProximaConsultaPaciente(userId);
            } else {
                // Tenta detectar automaticamente
                const user = await apiClient.getUser(userId);

                if (user?.Role === 'Psychologist') {
                    proximaConsulta = await apiClient.buscarProximaConsulta(userId);
                } else if (user?.Role === 'Patient') {
                    proximaConsulta = await apiClient.buscarProximaConsultaPaciente(userId);
                }
            }

            socket.emit("proximaConsulta:response", {
                consulta: proximaConsulta,
                timestamp: new Date().toISOString()
            });

            console.log(`✅ [proximaConsulta:request] Respondido para userId=${userId}`);
        } catch (err) {
            console.error("❌ [proximaConsulta:request] Erro ao buscar próxima consulta:", err);
            socket.emit("proximaConsulta:error", {
                error: "Erro ao buscar próxima consulta",
                message: err instanceof Error ? err.message : 'Erro desconhecido'
            });
        }
    });
}

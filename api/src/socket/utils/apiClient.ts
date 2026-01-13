/**
 * Cliente HTTP para comunicação com a API principal
 * Usado pelo socket-server para fazer operações no banco sem depender do Prisma diretamente
 */

// URL base da API principal
// No Docker Swarm, os serviços se comunicam pelo nome do serviço na mesma rede
// O serviço da API se chama "api" e roda na porta 3333 em produção
// Pode ser sobrescrita via variável de ambiente API_BASE_URL ou API_URL
const API_BASE_URL = process.env.API_BASE_URL || process.env.API_URL || 'http://localhost:3333';

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Faz uma requisição HTTP para a API principal
 */
async function apiRequest<T = unknown>(
    method: string,
    endpoint: string,
    data?: unknown
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json() as ApiResponse<T>;
        
        if (!result.success) {
            throw new Error(result.error || 'API request failed');
        }

        return result.data as T;
    } catch (error) {
        console.error(`❌ [API Client] Erro ao fazer requisição ${method} ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Busca uma consulta por ID
 */
export async function getConsulta(consultationId: string) {
    return apiRequest<{
        Id: string;
        PacienteId: string | null;
        PsicologoId: string | null;
        Paciente?: { Id: string };
        Psicologo?: { Id: string };
    }>('GET', `/internal/consultas/${consultationId}`);
}

/**
 * Atualiza timestamp de join na reserva de sessão
 */
export async function updateReservaSessaoJoin(
    consultationId: string,
    field: 'PatientJoinedAt' | 'PsychologistJoinedAt',
    timestamp: Date
) {
    return apiRequest('PATCH', `/internal/reserva-sessao/${consultationId}/join`, {
        field,
        timestamp: timestamp.toISOString(),
    });
}

/**
 * Busca reserva de sessão por consulta ID
 */
export async function getReservaSessao(consultationId: string) {
    return apiRequest<{
        Id: string;
        ConsultaId: string;
        PatientJoinedAt: Date | null;
        PsychologistJoinedAt: Date | null;
        ScheduledAt?: Date | null;
        AgoraTokenPatient?: string | null;
        AgoraTokenPsychologist?: string | null;
        Consulta?: {
            Id: string;
            Date?: string;
            Status?: string;
            PsicologoId?: string | null;
            PacienteId?: string | null;
            AgendaId?: string | null;
            [key: string]: unknown;
        };
        [key: string]: unknown;
    }>('GET', `/internal/reserva-sessao/${consultationId}`);
}

/**
 * Conta notificações não lidas de um usuário
 */
export async function countUnreadNotifications(userId: string) {
    return apiRequest<number>('GET', `/internal/notifications/${userId}/unread-count`);
}

/**
 * Marca notificação como lida
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
    return apiRequest('PATCH', `/internal/notifications/${notificationId}/read`, {
        userId,
    });
}

/**
 * Marca todas as notificações de um usuário como lidas
 */
export async function markAllNotificationsAsRead(userId: string) {
    return apiRequest('PATCH', `/internal/notifications/${userId}/read-all`);
}

/**
 * Busca configuração
 */
export async function getConfiguração(key?: string) {
    if (key) {
        return apiRequest<{ Chave: string; Valor: string }>('GET', `/internal/configuracoes/${key}`);
    }
    return apiRequest<{ Chave: string; Valor: string }[]>('GET', '/internal/configuracoes');
}

/**
 * Busca usuário por ID
 */
export async function getUser(userId: string) {
    return apiRequest<{
        Id: string;
        Nome: string;
        Email: string;
        Role?: string;
        [key: string]: unknown;
    }>('GET', `/internal/users/${userId}`);
}

/**
 * Cria cancelamento de sessão
 */
export async function createCancelamentoSessao(data: {
    ConsultaId: string;
    Motivo: string;
    AutorId: string | null;
    AutorTipo: string;
}) {
    return apiRequest('POST', '/internal/cancelamento-sessao', data);
}

/**
 * Processa inatividade de consulta (cancela e processa repasse)
 */
export async function processInactivity(
    consultationId: string,
    missingRole: 'Patient' | 'Psychologist' | 'Both'
) {
    return apiRequest('POST', `/internal/consultas/${consultationId}/inactivity`, {
        missingRole,
    });
}

/**
 * Notifica ambos os usuários sobre atualização da próxima consulta
 */
export async function notificarAmbosUsuarios(
    psicologoId: string,
    pacienteId: string,
    motivo: string
) {
    return apiRequest('POST', '/internal/proxima-consulta/notificar', {
        psicologoId,
        pacienteId,
        motivo,
    });
}

/**
 * Busca próxima consulta do psicólogo
 */
export async function buscarProximaConsulta(psicologoId: string) {
    return apiRequest('GET', `/internal/proxima-consulta/psicologo/${psicologoId}`);
}

/**
 * Busca próxima consulta do paciente
 */
export async function buscarProximaConsultaPaciente(pacienteId: string) {
    return apiRequest('GET', `/internal/proxima-consulta/paciente/${pacienteId}`);
}


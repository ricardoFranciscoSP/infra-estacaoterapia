import { ThreadMessage, SolicitacaoThread } from '@/types/solicitacaoTypes';

// Interface para dados brutos do JSON antes da validação
interface RawThreadMessage {
    id?: string;
    autor?: 'paciente' | 'admin';
    autorNome?: string;
    mensagem?: string;
    data?: string | Date;
}

/**
 * Parse do JSON do Log para Thread de mensagens
 */
export function parseThreadFromLog(log: string | null | undefined): SolicitacaoThread {
    if (!log) {
        return { mensagens: [] };
    }

    try {
        const parsed: unknown = JSON.parse(log);
        
        // Verifica se já é um objeto com mensagens
        if (parsed && typeof parsed === 'object' && 'mensagens' in parsed && Array.isArray((parsed as { mensagens: unknown }).mensagens)) {
            const mensagens = (parsed as { mensagens: RawThreadMessage[] }).mensagens;
            return {
                mensagens: mensagens.map((msg: RawThreadMessage): ThreadMessage => ({
                    id: msg.id || `${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    autor: msg.autor || 'paciente',
                    autorNome: msg.autorNome,
                    mensagem: msg.mensagem || '',
                    data: msg.data ? new Date(msg.data) : new Date(),
                })),
            };
        }
        // Se for um array direto
        if (Array.isArray(parsed)) {
            return {
                mensagens: (parsed as RawThreadMessage[]).map((msg: RawThreadMessage): ThreadMessage => ({
                    id: msg.id || `${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    autor: msg.autor || 'paciente',
                    autorNome: msg.autorNome,
                    mensagem: msg.mensagem || '',
                    data: msg.data ? new Date(msg.data) : new Date(),
                })),
            };
        }
    } catch (error) {
        // Se não for JSON válido, trata como string antiga e retorna vazio
        console.warn('Erro ao parsear thread do Log:', error);
    }

    return { mensagens: [] };
}

/**
 * Adiciona uma nova mensagem à thread existente
 */
export function addMessageToThread(
    thread: SolicitacaoThread,
    mensagem: string,
    autor: 'paciente' | 'admin',
    autorNome?: string
): SolicitacaoThread {
    const novaMensagem: ThreadMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        autor,
        autorNome,
        mensagem,
        data: new Date(),
    };

    return {
        mensagens: [...thread.mensagens, novaMensagem],
    };
}

/**
 * Converte thread para JSON string para salvar no Log
 */
export function threadToLogString(thread: SolicitacaoThread): string {
    return JSON.stringify(thread);
}

/**
 * Cria thread inicial com a descrição da solicitação
 */
export function createInitialThread(descricao: string, autorNome?: string): SolicitacaoThread {
    return {
        mensagens: [
            {
                id: `${Date.now()}-initial`,
                autor: 'paciente',
                autorNome,
                mensagem: descricao,
                data: new Date(),
            },
        ],
    };
}


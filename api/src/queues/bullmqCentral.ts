// src/queues/bullmqCentral.ts
// Centraliza a criação das filas BullMQ, garantindo uso do singleton do Redis

import { Queue, QueueEvents } from 'bullmq';
import { getIORedisClient, waitForIORedisReady } from '../config/redis.config';
import { RenovacaoJobData } from '../types/controleConsulta.types';
import IORedis from 'ioredis';

let redisConnection: IORedis | null = null;
let connectionPromise: Promise<IORedis> | null = null;

// Função para obter a conexão Redis pronta com retry
const getRedisConnection = async (retries = 3): Promise<IORedis> => {
    // Se já tem conexão válida, testa com ping
    if (redisConnection && (redisConnection.status === 'ready' || redisConnection.status === 'connect')) {
        try {
            await redisConnection.ping();
            return redisConnection;
        } catch (err) {
            console.warn('⚠️ [BullMQ] Conexão existente não respondeu ao ping, renovando...');
            redisConnection = null;
            connectionPromise = null;
        }
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`⏳ [BullMQ] Tentando conectar ao Redis (tentativa ${attempt}/${retries})...`);
            connectionPromise = waitForIORedisReady(60000); // 60 segundos de timeout

            redisConnection = await connectionPromise;

            // Valida com ping
            await redisConnection.ping();

            console.log('✅ [BullMQ] Conexão Redis estabelecida e validada para filas');
            return redisConnection;
        } catch (error) {
            console.error(`❌ [BullMQ] Tentativa ${attempt}/${retries} falhou:`, error);
            connectionPromise = null;
            redisConnection = null;

            if (attempt < retries) {
                const delay = attempt * 2000; // 2s, 4s, 6s
                console.log(`⏳ [BullMQ] Aguardando ${delay}ms antes de tentar novamente...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }

    throw new Error('Falha ao conectar Redis após múltiplas tentativas');
};

// Inicializa as conexões de forma lazy
let _agendaQueue: Queue | null = null;
let _agendaQueueEvents: QueueEvents | null = null;
let _webhookQueue: Queue | null = null;
let _webhookQueueEvents: QueueEvents | null = null;
let _notificationQueue: Queue | null = null;
let _notificationQueueEvents: QueueEvents | null = null;
let _renovacaoQueue: Queue<RenovacaoJobData> | null = null;

// Getters que garantem que a conexão está pronta antes de criar as filas
export const getAgendaQueue = async (): Promise<Queue | null> => {
    if (_agendaQueue) return _agendaQueue;
    try {
        const conn = await getRedisConnection();
        _agendaQueue = new Queue('agendaQueue', {
            connection: conn,
            defaultJobOptions: {
                removeOnComplete: {
                    age: 3600, // mantém por 1 hora
                    count: 100, // mantém últimos 100
                },
                removeOnFail: {
                    age: 86400, // mantém por 24 horas
                },
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            },
        });
        console.log('✅ [BullMQ] agendaQueue criada');
        return _agendaQueue;
    } catch (error) {
        console.error('❌ [BullMQ] Erro ao criar agendaQueue:', error);
        return null;
    }
};

export const getAgendaQueueEvents = async (): Promise<QueueEvents | null> => {
    if (_agendaQueueEvents) return _agendaQueueEvents;
    try {
        const conn = await getRedisConnection();
        _agendaQueueEvents = new QueueEvents('agendaQueue', { connection: conn });
        console.log('✅ [BullMQ] agendaQueueEvents criado');
        return _agendaQueueEvents;
    } catch (error) {
        console.error('❌ [BullMQ] Erro ao criar agendaQueueEvents:', error);
        return null;
    }
};

export const getWebhookQueue = async (): Promise<Queue | null> => {
    if (_webhookQueue) return _webhookQueue;
    try {
        const conn = await getRedisConnection();
        _webhookQueue = new Queue('webhookProcessor', {
            connection: conn,
            defaultJobOptions: {
                removeOnComplete: {
                    age: 3600,
                    count: 100,
                },
                removeOnFail: {
                    age: 86400,
                },
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 3000,
                },
            },
        });
        console.log('✅ [BullMQ] webhookQueue criada');
        return _webhookQueue;
    } catch (error) {
        console.error('❌ [BullMQ] Erro ao criar webhookQueue:', error);
        return null;
    }
};

export const getWebhookQueueEvents = async (): Promise<QueueEvents | null> => {
    if (_webhookQueueEvents) return _webhookQueueEvents;
    try {
        const conn = await getRedisConnection();
        _webhookQueueEvents = new QueueEvents('webhookProcessor', { connection: conn });
        console.log('✅ [BullMQ] webhookQueueEvents criado');
        return _webhookQueueEvents;
    } catch (error) {
        console.error('❌ [BullMQ] Erro ao criar webhookQueueEvents:', error);
        return null;
    }
};

export const getNotificationQueue = async (): Promise<Queue | null> => {
    if (_notificationQueue) return _notificationQueue;
    try {
        const conn = await getRedisConnection();
        _notificationQueue = new Queue('notificationQueue', {
            connection: conn,
            defaultJobOptions: {
                removeOnComplete: {
                    age: 3600,
                    count: 50,
                },
                removeOnFail: {
                    age: 86400,
                },
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            },
        });
        console.log('✅ [BullMQ] notificationQueue criada');
        return _notificationQueue;
    } catch (error) {
        console.error('❌ [BullMQ] Erro ao criar notificationQueue:', error);
        return null;
    }
};

export const getNotificationQueueEvents = async (): Promise<QueueEvents | null> => {
    if (_notificationQueueEvents) return _notificationQueueEvents;
    try {
        const conn = await getRedisConnection();
        _notificationQueueEvents = new QueueEvents('notificationQueue', { connection: conn });
        console.log('✅ [BullMQ] notificationQueueEvents criado');
        return _notificationQueueEvents;
    } catch (error) {
        console.error('❌ [BullMQ] Erro ao criar notificationQueueEvents:', error);
        return null;
    }
};

export const getRenovacaoQueue = async (): Promise<Queue<RenovacaoJobData> | null> => {
    if (_renovacaoQueue) return _renovacaoQueue;
    try {
        const conn = await getRedisConnection();
        _renovacaoQueue = new Queue<RenovacaoJobData>('renovacao-controle-consulta', {
            connection: conn,
            defaultJobOptions: {
                removeOnComplete: {
                    age: 3600,
                    count: 100,
                },
                removeOnFail: {
                    age: 86400,
                },
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            },
        });
        console.log('✅ [BullMQ] renovacaoQueue criada');
        return _renovacaoQueue;
    } catch (error) {
        console.error('❌ [BullMQ] Erro ao criar renovacaoQueue:', error);
        return null;
    }
};

// Para compatibilidade com código existente, exporta as variáveis síncronas
// mas use preferencialmente os getters async acima
export let agendaQueue: Queue | null = null;
export let agendaQueueEvents: QueueEvents | null = null;
export let webhookQueue: Queue | null = null;
export let webhookQueueEvents: QueueEvents | null = null;
export let notificationQueue: Queue | null = null;
export let notificationQueueEvents: QueueEvents | null = null;
export let renovacaoQueue: Queue<RenovacaoJobData> | null = null;

// Inicializa as filas na importação do módulo (compatibilidade)
(async () => {
    try {
        const conn = getIORedisClient();

        // Aguarda a conexão estar realmente pronta antes de criar as filas
        if (conn.status !== 'ready') {
            console.log('⏳ [BullMQ] Aguardando conexão Redis...');
            await waitForIORedisReady(30000);
            console.log('✅ [BullMQ] Conexão Redis pronta, criando filas...');
        }

        redisConnection = conn;

        agendaQueue = await getAgendaQueue();
        agendaQueueEvents = await getAgendaQueueEvents();
        webhookQueue = await getWebhookQueue();
        webhookQueueEvents = await getWebhookQueueEvents();
        notificationQueue = await getNotificationQueue();
        notificationQueueEvents = await getNotificationQueueEvents();
        renovacaoQueue = await getRenovacaoQueue();

        console.log('✅ [BullMQ] Todas as filas foram inicializadas com sucesso');
    } catch (error) {
        console.error('❌ [BullMQ] Erro ao inicializar filas:', error);
    }
})();

// Comentário para o time:
// Sempre importe as filas deste módulo para garantir reutilização da conexão Redis singleton.
// Use os getters async (getAgendaQueue, etc) para garantir que a conexão está pronta antes de usar.

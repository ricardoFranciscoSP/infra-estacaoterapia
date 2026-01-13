import { Queue } from 'bullmq';
import { RenovacaoJobData, PagamentoJobData, NotificacaoJobData } from '../types/controleConsulta.types';
import { getIORedisClient } from "../config/redis.config";
const redisConfig = getIORedisClient();

export const renovacaoQueue = redisConfig
    ? new Queue<RenovacaoJobData>('renovacao-controle-consulta', { connection: redisConfig })
    : null;

export const pagamentoQueue = redisConfig
    ? new Queue<PagamentoJobData>('pagamento-controle-consulta', { connection: redisConfig })
    : null;

export const notificacaoQueue = redisConfig
    ? new Queue<NotificacaoJobData>('notificacao-controle-consulta', { connection: redisConfig })
    : null;

if (!redisConfig) {
    console.log('[BullMQ] controleConsultaQueue não inicializada: Redis indisponível (ambiente de desenvolvimento).');
}

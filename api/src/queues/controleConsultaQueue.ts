import { Queue } from 'bullmq';
import { RenovacaoJobData, PagamentoJobData, NotificacaoJobData } from '../types/controleConsulta.types';
import { getBullMQConnectionOptions } from "../config/redis.config";
const redisConfig = getBullMQConnectionOptions();

export const renovacaoQueue = new Queue<RenovacaoJobData>('renovacao-controle-consulta', { connection: redisConfig });

export const pagamentoQueue = new Queue<PagamentoJobData>('pagamento-controle-consulta', { connection: redisConfig });

export const notificacaoQueue = new Queue<NotificacaoJobData, void, "notificacao">(
    'notificacao-controle-consulta',
    { connection: redisConfig }
);

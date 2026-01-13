import { Request, Response } from 'express';
import { getAllQueuesStatus, getAllFailedJobs, getFailedJobs, getAllJobs, getAllJobsByStatus, cleanFailedJobs, cleanAllFailedJobs } from '../../utils/queueStatus';
import { normalizeQueryString, normalizeQueryIntWithDefault, normalizeQueryInt } from '../../utils/validation.util';

export class QueueController {
    /**
     * Lista o status de todas as filas BullMQ
     * GET /api/adm/queues/status
     */
    async getQueuesStatus(req: Request, res: Response): Promise<Response> {
        try {
            const statuses = await getAllQueuesStatus();
            return res.status(200).json({
                success: true,
                data: statuses
            });
        } catch (error) {
            console.error('❌ Erro ao obter status das filas:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro ao obter status das filas',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Lista todos os jobs falhados de todas as filas
     * GET /api/adm/queues/failed-jobs
     * Query params opcionais:
     * - queueName: string (filtra por fila específica)
     * - limit: number (padrão: 100)
     */
    async getFailedJobs(req: Request, res: Response): Promise<Response> {
        try {
            const queueName = normalizeQueryString(req.query.queueName);
            const limit = normalizeQueryIntWithDefault(req.query.limit, 100);

            let failedJobs;
            if (queueName) {
                failedJobs = await getFailedJobs(queueName, limit);
            } else {
                failedJobs = await getAllFailedJobs(limit);
            }

            return res.status(200).json({
                success: true,
                count: failedJobs.length,
                data: failedJobs
            });
        } catch (error) {
            console.error('❌ Erro ao obter jobs falhados:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro ao obter jobs falhados',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Lista todos os jobs de todas as filas BullMQ
     * GET /api/admin/queues/jobs
     * Query params opcionais:
     * - status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' (filtra por status)
     * - limit: number (padrão: 100)
     */
    async getJobs(req: Request, res: Response): Promise<Response> {
        try {
            const status = normalizeQueryString(req.query.status) as 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | undefined;
            const limit = normalizeQueryIntWithDefault(req.query.limit, 100);

            console.log(`[QueueController] Buscando jobs com status: ${status || 'todos'}, limit: ${limit}`);

            let jobs;
            if (status) {
                jobs = await getAllJobsByStatus(status, limit);
            } else {
                jobs = await getAllJobs(limit);
            }

            console.log(`[QueueController] Jobs encontrados: ${jobs.length}`);

            return res.status(200).json({
                success: true,
                count: jobs.length,
                data: jobs
            });
        } catch (error) {
            console.error('❌ Erro ao obter jobs:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            const errorStack = error instanceof Error ? error.stack : undefined;
            console.error('❌ Stack trace:', errorStack);
            
            return res.status(500).json({
                success: false,
                error: 'Erro ao obter jobs',
                message: errorMessage
            });
        }
    }

    /**
     * Remove jobs falhados de uma fila específica ou de todas as filas
     * DELETE /api/adm/queues/failed-jobs
     * Query params opcionais:
     * - queueName: string (filtra por fila específica, se não informado remove de todas)
     * - olderThanMs: number (opcional: remove apenas jobs mais antigos que X ms)
     */
    async cleanFailedJobs(req: Request, res: Response): Promise<Response> {
        try {
            const queueName = normalizeQueryString(req.query.queueName);
            const olderThanMs = normalizeQueryInt(req.query.olderThanMs);

            let result;
            if (queueName) {
                const count = await cleanFailedJobs(queueName, olderThanMs);
                result = { [queueName]: count };
            } else {
                result = await cleanAllFailedJobs(olderThanMs);
            }

            const totalRemoved = Object.values(result).reduce((sum, count) => sum + count, 0);

            return res.status(200).json({
                success: true,
                message: `${totalRemoved} job(s) falhado(s) removido(s)`,
                totalRemoved,
                byQueue: result
            });
        } catch (error) {
            console.error('❌ Erro ao limpar jobs falhados:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro ao limpar jobs falhados',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
}


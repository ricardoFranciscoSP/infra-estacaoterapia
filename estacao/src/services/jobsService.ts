// services/jobsService.ts
import { api } from "@/lib/axios";
import { AxiosResponse } from "axios";

export interface JobInfo {
    jobId: string;
    queueName: string;
    name: string;
    data: unknown;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
    attemptsMade: number;
    timestamp: number;
    processedOn?: number;
    finishedOn?: number;
    failedReason?: string;
    delay?: number;
}

export interface JobsListResponse {
    success: boolean;
    count: number;
    data: JobInfo[];
}

export const jobsService = {
    /**
     * Busca jobs com filtros opcionais
     * @param params Objeto com filtros (status, limit)
     * @returns Promise com resposta
     */
    async list(params: { status?: string; limit?: number } = {}): Promise<AxiosResponse<JobsListResponse>> {
        const queryParams = new URLSearchParams();
        
        if (params.status) queryParams.append('status', params.status);
        if (params.limit) queryParams.append('limit', params.limit.toString());

        const queryString = queryParams.toString();
        return api.get(`/admin/queues/jobs${queryString ? `?${queryString}` : ''}`);
    },
};


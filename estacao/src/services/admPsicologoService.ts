import { api } from "@/lib/axios";
import { PsicologoUpdate } from "@/types/psicologoTypes";

export const admPsicologoService = () => {
    return {
        getPsicologos: () => api.get('/admin/psicologos'),
        getPsicologoById: (id: string) => api.get(`/admin/psicologos/${id}`),
        updatePsicologo: (id: string, psicologo: PsicologoUpdate) => api.put(`/admin/psicologos/${id}`, psicologo),
        deletePsicologo: (id: string) => api.delete(`/admin/psicologos/${id}`),
        previaContrato: (id: string) => api.post(`/admin/psicologos/previa-contrato`, { id }, {
            responseType: 'text', // Importante: recebe HTML como texto
            headers: {
                'Content-Type': 'application/json',
            }
        }),
        calcularPagamento: () => api.get(`/psicologo/financeiro/calcular-pagamento`),
        getHistoricoSessoes: (mes?: number, ano?: number, page?: number, pageSize?: number, todosStatus?: boolean) => {
            const params = new URLSearchParams();
            if (mes !== undefined) params.append('mes', mes.toString());
            if (ano !== undefined) params.append('ano', ano.toString());
            if (page !== undefined) params.append('page', page.toString());
            if (pageSize !== undefined) params.append('pageSize', pageSize.toString());
            if (todosStatus) params.append('todosStatus', '1');
            const queryString = params.toString();
            return api.get(`/psicologo/financeiro/historico-sessoes${queryString ? `?${queryString}` : ''}`);
        },
        getGanhosMensais: (ano?: number, mes?: number) => {
            const params = new URLSearchParams();
            if (ano !== undefined) params.append('ano', ano.toString());
            if (mes !== undefined) params.append('mes', mes.toString());
            const queryString = params.toString();
            return api.get(`/psicologo/financeiro/ganhos-mensais${queryString ? `?${queryString}` : ''}`);
        },
        getAtendimentosMensais: (ano?: number, mes?: number) => {
            const params = new URLSearchParams();
            if (ano !== undefined) params.append('ano', ano.toString());
            if (mes !== undefined) params.append('mes', mes.toString());
            const queryString = params.toString();
            return api.get(`/psicologo/financeiro/atendimentos-mensais${queryString ? `?${queryString}` : ''}`);
        },
        getSaldoDisponivelResgate: () => api.get(`/psicologo/financeiro/saldo-disponivel-resgate`),
        getSaldoRetido: () => api.get(`/psicologo/financeiro/saldo-retido`),
        getFaturaPeriodo: () => api.get(`/psicologo/financeiro/fatura-periodo`),
        consultasRealizadas: () => api.get(`/adm-psicologos/consultas/consultas-realizadas`),
        /**
         * Busca a taxa de ocupação da agenda do psicólogo para um intervalo de datas (ex: mês atual)
         * @param dataInicio string (YYYY-MM-DD)
         * @param dataFim string (YYYY-MM-DD)
         */
        taxaOcupacao: (dataInicio: string, dataFim: string) =>
            api.get(`/adm-psicologos/consultas/taxa-ocupacao-agenda`, {
                params: { dataInicio, dataFim }
            }),
        consultasPendentes: () => api.get(`/adm-psicologos/consultas/consultas-pendentes`),
        proximasConsultas: () => api.get(`/adm-psicologos/consultas/proximas-consultas`),
        proximaConsulta: () => api.get(`/adm-psicologos/consultas/proxima-consulta`),
        contarConsultasPorMes: (mes: number, ano: number) => {
            const params = new URLSearchParams();
            params.append('mes', mes.toString());
            params.append('ano', ano.toString());
            return api.get(`/adm-psicologos/consultas/contar-por-status-e-mes?${params.toString()}`);
        },
        listarHistoricoConsultas: (filtros?: {
            status?: 'todos' | 'efetuada' | 'cancelada';
            buscaPaciente?: string;
            dataInicial?: string;
            dataFinal?: string;
            page?: number;
            pageSize?: number;
        }) => {
            const params = new URLSearchParams();
            if (filtros?.status) params.append('status', filtros.status);
            if (filtros?.buscaPaciente) params.append('buscaPaciente', filtros.buscaPaciente);
            if (filtros?.dataInicial) params.append('dataInicial', filtros.dataInicial);
            if (filtros?.dataFinal) params.append('dataFinal', filtros.dataFinal);
            if (filtros?.page) params.append('page', filtros.page.toString());
            if (filtros?.pageSize) params.append('pageSize', filtros.pageSize.toString());
            const queryString = params.toString();
            return api.get(`/adm-psicologos/consultas/historico${queryString ? `?${queryString}` : ''}`);
        },
        gerarContrato: (id: string) => api.post(`/admin/psicologos/gerar-contrato`, { id }),
        listarConfigAgenda: () => api.get(`/adm-psicologos/config-agenda/agenda`),
        // Upload de imagem no escopo do psicólogo selecionado
        uploadImage: (id: string, file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            return api.post(`/admin/psicologos/${id}/image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        updateImage: (id: string, imageId: string, file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            return api.put(`/admin/psicologos/${id}/image/${imageId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        deleteImage: (id: string, imageId: string) => api.delete(`/admin/psicologos/${id}/image/${imageId}`),
    };
}
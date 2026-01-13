import { api } from "@/lib/axios";
import { FAQ, FAQCreate, FAQUpdate } from "@/types/faq.types";

export const faqService = {
    /**
     * Busca todas as FAQs (requer autenticação admin)
     */
    getFaqs: (): Promise<FAQ[]> => {
        return api.get('/admin/configuracoes/faqs').then(res => res.data);
    },

    /**
     * Busca FAQs públicas (apenas ativas, sem autenticação)
     * @param tipo - Opcional: "Paciente" ou "Psicologo" para filtrar
     */
    getFaqsPublic: (tipo?: string): Promise<FAQ[]> => {
        const params = tipo ? `?tipo=${tipo}` : '';
        return api.get(`/faqs${params}`).then(res => res.data);
    },

    /**
     * Cria uma nova FAQ
     */
    createFaq: (faq: FAQCreate): Promise<FAQ> => {
        return api.post('/admin/configuracoes/faqs', faq).then(res => res.data);
    },

    /**
     * Cria múltiplas FAQs de uma vez (cadastro em lote)
     */
    createFaqsBulk: (faqs: FAQCreate[]): Promise<{ message: string; count: number; faqs: FAQ[] }> => {
        return api.post('/admin/configuracoes/faqs/bulk', faqs).then(res => res.data);
    },

    /**
     * Atualiza uma FAQ existente
     */
    updateFaq: (id: string, faq: FAQUpdate): Promise<FAQ> => {
        return api.put(`/admin/configuracoes/faqs/${id}`, faq).then(res => res.data);
    },

    /**
     * Deleta uma FAQ
     */
    deleteFaq: (id: string): Promise<void> => {
        return api.delete(`/admin/configuracoes/faqs/${id}`).then(() => undefined);
    },
};

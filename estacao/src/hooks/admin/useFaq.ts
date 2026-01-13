import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { faqService } from '@/services/faqService';
import { FAQ, FAQCreate, FAQUpdate } from '@/types/faq.types';
import toast from 'react-hot-toast';

export function useFaqs() {
    return useQuery<FAQ[]>({
        queryKey: ['faqs'],
        queryFn: () => faqService.getFaqs(),
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });
}

export function useCreateFaq() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (faq: FAQCreate) => faqService.createFaq(faq),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['faqs'] });
            toast.success('FAQ criada com sucesso!');
        },
        onError: (error: unknown) => {
            const errorMessage = error && typeof error === 'object' && 'response' in error
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao criar FAQ'
                : 'Erro ao criar FAQ';
            toast.error(errorMessage);
        },
    });
}

export function useUpdateFaq() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, faq }: { id: string; faq: FAQUpdate }) => 
            faqService.updateFaq(id, faq),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['faqs'] });
            toast.success('FAQ atualizada com sucesso!');
        },
        onError: (error: unknown) => {
            const errorMessage = error && typeof error === 'object' && 'response' in error
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao atualizar FAQ'
                : 'Erro ao atualizar FAQ';
            toast.error(errorMessage);
        },
    });
}

export function useDeleteFaq() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => faqService.deleteFaq(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['faqs'] });
            toast.success('FAQ excluída com sucesso!');
        },
        onError: (error: unknown) => {
            const errorMessage = error && typeof error === 'object' && 'response' in error
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao excluir FAQ'
                : 'Erro ao excluir FAQ';
            toast.error(errorMessage);
        },
    });
}

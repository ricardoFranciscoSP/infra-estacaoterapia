import { usePlanosPacienteStore } from '@/store/planosPacienteStore';
import { CancelarPlanoPayload } from '@/services/planoPacienteService';
import { useQuery, useMutation } from '@tanstack/react-query';

// Definição do tipo para planoCompra
interface PlanoCompra {
    tipoRecorrencia?: string;
    createdAt?: string;
    dataCompra?: string;
    plano?: {
        type?: string;
    };
}

// Função utilitária para validação de permanência mínima e fidelidade
export function validarCancelamentoPlano(planoCompra: PlanoCompra) {
    const tipoRecorrencia = planoCompra.tipoRecorrencia?.toUpperCase?.() || "";
    const dataCriacao = new Date(planoCompra.createdAt ?? planoCompra.dataCompra ?? "");
    const dataAtual = new Date();
    let diasMinimos = 0;
    let mensagemMulta = "";

    if (tipoRecorrencia === "SEMESTRAL") {
        diasMinimos = 180;
        mensagemMulta = "Você possui um plano semestral com permanência mínima de 180 dias. Deseja realmente cancelar? O cancelamento implica em multa contratual de 20% do valor do plano.";
    } else if (tipoRecorrencia === "TRIMESTRAL") {
        diasMinimos = 60;
        mensagemMulta = "Você possui um plano trimestral com permanência mínima de 60 dias. Deseja realmente cancelar? O cancelamento implica em multa contratual de 20% do valor do plano.";
    }

    if (diasMinimos > 0) {
        const diffMs = dataAtual.getTime() - dataCriacao.getTime();
        const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDias < diasMinimos) {
            return {
                message: mensagemMulta
            };
        }
    }

    // Fidelidade de 6 meses para planos semestrais
    const fidelidadeMeses = planoCompra.plano?.type === "semestral" ? 6 : 0;
    if (fidelidadeMeses > 0) {
        const dataLimiteFidelidade = new Date(planoCompra.dataCompra ?? "");
        dataLimiteFidelidade.setMonth(dataLimiteFidelidade.getMonth() + fidelidadeMeses);
        if (dataAtual < dataLimiteFidelidade) {
            return {
                message: "Plano possui fidelidade. O cancelamento pode gerar multa proporcional."
            };
        }
    }

    return {};
}

export const usePlanoPaciente = () => {
    const {
        loading,
        error,
        comprarPlano,
        cancelarPlano: cancelarPlanoStore,
        upgradePlano,
        getPlanos,
    } = usePlanosPacienteStore();

    // Envia o payload correto para o backend
    const cancelarPlano = async (payload: CancelarPlanoPayload) => {
        await cancelarPlanoStore(payload);
    };

    // React Query para buscar planos do paciente usando o método da store
    const {
        data: planos,
        refetch: refetchPlanos,
        isLoading: isPlanosLoading,
        error: planosError,
    } = useQuery({
        queryKey: ['planos-paciente'],
        queryFn: getPlanos,
    });

    return {
        loading,
        error,
        comprarPlano,
        cancelarPlano,
        upgradePlano,
        planos,
        refetchPlanos,
        isPlanosLoading,
        planosError,
    };
};

// Hook para comprar plano usando mutation
export function useComprarPlano() {
    const { comprarPlano } = usePlanosPacienteStore();
    const mutation = useMutation({
        mutationFn: comprarPlano
    });
    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        data: mutation.data,
        reset: mutation.reset,
    };
}
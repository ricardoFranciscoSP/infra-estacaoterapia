import useAgendamentoStore from "@/store/agendamentoStore";

// Hook para acessar o store de agendamento
export function useAgendamento() {
    // Exponha os métodos e estados necessários do store
    const agendamento = useAgendamentoStore(state => state);

    return agendamento;
}

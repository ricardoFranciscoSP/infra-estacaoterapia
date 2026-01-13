import { useCallback } from "react";

// Tipos auxiliares
export type AgendaItem = {
    data: string; // formato ISO
    status: string;
    horario: string;
};

export type Psicologo = {
    modalidade?: string;
    publicos?: string[];
    agenda?: AgendaItem[];
    psicologoAgenda?: AgendaItem[];
};

export function usePsicologoValidations() {
    // Validação: verifica se o psicólogo está disponível em uma data específica
    // Filtra APENAS agendas com status exatamente igual a 'Disponivel' (case-sensitive)
    const isDisponivelNoDia = useCallback((agenda: AgendaItem[], data: Date) => {
        const dataStr = data.toISOString().slice(0, 10);
        return agenda?.some(a => a.data && a.data.slice(0, 10) === dataStr && (a.status === "Disponivel" || a.status === "disponivel"));
    }, []);

    // Validação: verifica se o psicólogo atende online/presencial/ambos
    const atendeModalidade = useCallback((psicologo: Psicologo, modalidade: string) => {
        if (!psicologo.modalidade) return false;
        if (modalidade === "ambos") return true;
        return psicologo.modalidade === modalidade;
    }, []);

    // Validação: verifica se o psicólogo atende um público específico
    const atendePublico = useCallback((psicologo: Psicologo, publico: string) => {
        return psicologo.publicos?.includes(publico);
    }, []);

    // Regra de negócio: gera horários por data e psicólogo
    const getHorariosPorData = useCallback(
        (psicologos: Psicologo[], datas: { date: Date }[]) => {
            return (psicologos ?? []).map((p: Psicologo, psicologoIdx: number) => {
                return datas.map((dia, diaIdx) => {
                    if (dia.date.getDay() === 0) return [];
                    // Preferência: usar agenda se existir
                    const agenda: AgendaItem[] =
                        (p.psicologoAgenda && p.psicologoAgenda.length > 0
                            ? p.psicologoAgenda
                            : p.agenda) ?? [];
                    // Filtra horários da agenda para o dia - APENAS status 'Disponivel' (case-sensitive)
                    const dataStr = dia.date.toISOString().slice(0, 10); // yyyy-mm-dd
                    const horariosDoDia = agenda
                        .filter((a: AgendaItem) => a.data && a.data.slice(0, 10) === dataStr && (a.status === "Disponivel" || a.status === "disponivel"))
                        .map((a: AgendaItem) => a.horario);
                    if (horariosDoDia.length > 0) return horariosDoDia;
                    // Fallback: geração automática se não houver agenda
                    const base = 8 + ((psicologoIdx * 3 + diaIdx * 2) % 6);
                    const quantidade = 6 + ((psicologoIdx + diaIdx) % 3);
                    return Array.from({ length: quantidade }, (_, h) => {
                        const hora = base + h * 1;
                        return `${hora.toString().padStart(2, "0")}:00`;
                    });
                });
            });
        },
        []
    );

    return {
        isDisponivelNoDia,
        atendeModalidade,
        atendePublico,
        getHorariosPorData,
        // ...adicione outras validações ou regras conforme necessário
    };
}

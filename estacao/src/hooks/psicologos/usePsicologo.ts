import React, { useState, useEffect } from "react";
import { useVerPsicologos } from "@/hooks/psicologoHook";
import { usePsicologoValidations } from "@/hooks/usePsicologoValidations";
import { PsicologoAtivo } from "@/types/psicologoTypes";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { usePsicologoFilterStore } from "@/store/filters/psicologoFilterStore";
import {
    hasAllSelected,
    hasRelatedMatch,
    normalizeFilterValue,
    normalizarStatus,
    periodoRange,
    toMinutes,
    ymd,
} from "@/utils/psicologoFilters";

export function usePsicologoPage() {
    const { psicologos: psicologosOriginais, isLoading: isPsicologosLoading, refetch } = useVerPsicologos();

    // Seletores separados para evitar criar um novo objeto a cada render
    const queixasFiltro = usePsicologoFilterStore((s) => s.queixas);
    const abordagensFiltro = usePsicologoFilterStore((s) => s.abordagens);
    const sexoFiltro = usePsicologoFilterStore((s) => s.sexo);
    const atendimentosFiltro = usePsicologoFilterStore((s) => s.atendimentos);
    const idiomasFiltro = usePsicologoFilterStore((s) => s.idiomas);
    const dataFiltro = usePsicologoFilterStore((s) => s.data);
    const periodoFiltro = usePsicologoFilterStore((s) => s.periodo);

    const router = useRouter();

    useEffect(() => {
        refetch();
    }, [refetch]);

    const [busca, setBusca] = useState("");
    const [filtro, setFiltro] = useState("online");
    const PAGE_SIZE = 3;
    const [cardsVisiveis, setCardsVisiveis] = useState(PAGE_SIZE);
    const totalDias = 30;
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    // Função para obter a data no formato 'YYYY-MM-DD' (UTC, sem hora)
    function formatDateToYMD(date: Date | string): string {
        const d = typeof date === "string" ? new Date(date) : date;
        // Garante que seja UTC, sem hora
        return d.toISOString().slice(0, 10);
    }

    // Define 'hoje' dinâmico, início do dia em Brasília
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Gera datas para os próximos 30 dias a partir de hoje (todas normalizadas)
    const datas = Array.from({ length: totalDias }, (_, i) => {
        const d = new Date(hoje);
        d.setDate(hoje.getDate() + i);
        d.setHours(0, 0, 0, 0);
        return {
            label: `${diasSemana[d.getDay()]} ${d.getDate().toString().padStart(2, "0")}`,
            date: new Date(d), // sempre no início do dia
        };
    });

    const [startIdx, setStartIdx] = useState(0);
    const diasVisiveis = 7;
    
    const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);

    const { isDisponivelNoDia, atendeModalidade, atendePublico, getHorariosPorData } = usePsicologoValidations();

    // Função para converter string "HH:MM" em minutos absolutos
    function horarioStringParaMinutos(horario: string): number {
        const [h, m] = horario.split(":").map(Number);
        return h * 60 + m;
    }

    function getHorariosPorDataAgenda(psicologos: PsicologoAtivo[], datas: { date: Date }[]) {
        if (!Array.isArray(psicologos)) return [];

        // Hora atual em minutos
        const agora = new Date();
        const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
        const hojeYMD = formatDateToYMD(hoje);
        const periodoMinMax = periodoRange(periodoFiltro);

        return psicologos.map((p) => {
            const agendaArray = Array.isArray(p.PsychologistAgendas) ? p.PsychologistAgendas : [];

            return datas.map((diaRef) => {
                const diaYMD = formatDateToYMD(diaRef.date);

                const horariosDisponiveis = agendaArray
                    .filter((agenda) => {
                        // Filtra APENAS agendas com status de disponível (com/sem acento)
                        if (!agenda) return false;
                        const statusAgenda = normalizarStatus(agenda.Status);
                        if (statusAgenda !== "disponivel") return false;
                        const agendaYMD = formatDateToYMD(agenda.Data);

                        // Só mostra horários para o dia do calendário
                        if (agendaYMD !== diaYMD) return false;

                        // Se for hoje, só mostra horários futuros
                        if (agendaYMD === hojeYMD) {
                            const minutosHorario = horarioStringParaMinutos(agenda.Horario);
                            if (minutosHorario <= minutosAgora) return false;
                        }

                        // Aplica filtro de período na lista de horários do card
                        if (periodoMinMax) {
                            const minutosHorario = toMinutes(agenda.Horario);
                            if (!Number.isFinite(minutosHorario)) return false;
                            if (minutosHorario < periodoMinMax[0] || minutosHorario > periodoMinMax[1]) {
                                return false;
                            }
                        }
                        return true;
                    })
                    .sort((a, b) => a.Horario.localeCompare(b.Horario))
                    .map((agenda) => ({
                        horario: agenda.Horario,
                        id: agenda.Id,
                    }));

                return horariosDisponiveis;
            });
        });
    }

    // Helpers importados em utils

    // Aplica filtros client-side sobre os psicólogos originais
    const psicologos = (psicologosOriginais ?? []).filter((p) => {
        // Busca textual
        const texto = normalizeFilterValue(busca);
        if (texto) {
            const nomeOk = normalizeFilterValue(p.Nome).includes(texto);
            const profiles = Array.isArray(p.ProfessionalProfiles) ? p.ProfessionalProfiles : [];
            const extras = profiles
                .flatMap((profile) => [
                    ...(profile?.Queixas ?? []),
                    ...(profile?.Abordagens ?? []),
                ])
                .map(normalizeFilterValue)
                .join(' ');
            if (!nomeOk && !extras.includes(texto)) return false;
        }

        const profiles = Array.isArray(p.ProfessionalProfiles) ? p.ProfessionalProfiles : [];
        const idiomasArr = profiles.flatMap((profile) => profile?.Idiomas ?? []);
        const abordArr = profiles.flatMap((profile) => profile?.Abordagens ?? []);
        const queixasArr = profiles.flatMap((profile) => profile?.Queixas ?? []);
        const atendArr = profiles.flatMap((profile) => profile?.TipoAtendimento ?? []);

        // Sexo: o resumo pode não conter. Se ausente, não filtra por sexo.
        if (sexoFiltro) {
            const psicologoComSexo = p as PsicologoAtivo & { Sexo?: string };
            const sexoValue = psicologoComSexo.Sexo ?? null;
            if (sexoValue) {
                const sexoNorm = normalizeFilterValue(String(sexoValue));
                if (sexoFiltro === 'feminino' && !sexoNorm.includes('femin')) return false;
                if (sexoFiltro === 'masculino' && !sexoNorm.includes('mascul')) return false;
                if (sexoFiltro === 'outros' && (sexoNorm.includes('femin') || sexoNorm.includes('mascul'))) return false;
            }
        }

        if (!hasAllSelected(idiomasFiltro, idiomasArr)) return false;
        if (!hasRelatedMatch(abordagensFiltro, abordArr)) return false;
        if (!hasRelatedMatch(queixasFiltro, queixasArr)) return false;
        if (!hasAllSelected(atendimentosFiltro, atendArr)) return false;

        // Data/Período: requer pelo menos 1 agenda compatível
        if (dataFiltro || periodoFiltro) {
            const agendas = p.PsychologistAgendas ?? [];
            const pr = periodoRange(periodoFiltro);
            const ok = agendas.some((a) => {
                // Filtra APENAS agendas com status de disponível (com/sem acento)
                const statusAgenda = normalizarStatus(a.Status);
                if (statusAgenda !== 'disponivel') return false;
                if (dataFiltro && ymd(a.Data) < (dataFiltro as string)) return false; // a partir de
                if (pr) {
                    const m = toMinutes(a.Horario);
                    if (!Number.isFinite(m)) return false;
                    return m >= pr[0] && m <= pr[1];
                }
                return true;
            });
            if (!ok) return false;
        }

        return true;
    });

    const horariosPorData = getHorariosPorDataAgenda(psicologos ?? [], datas);

    // Novo estado para controle de seleção de horários por psicólogo
    const [horariosSelecionados, setHorariosSelecionados] = useState<{
        [psicologoId: string]: { diaIdx: number; horaIdx: number; agendaId: string } | null
    }>({});

    // Novo estado para controle de bloqueio dos horários por psicólogo
    const [bloqueioHorarios, setBloqueioHorarios] = useState<{
        [psicologoId: string]: { diaIdx: number; horaIdx: number; agendaId: string } | null
    }>({});

    // Função para selecionar/desmarcar horário e bloquear/desbloquear os demais
    function selecionarHorario(psicologoId: string | number, diaIdx: number, horaIdx: number, agendaId: string) {
        const psicologoKey = String(psicologoId);
        setHorariosSelecionados(prev => {
            const atual = prev[psicologoKey];
            // Se já está selecionado, desmarca e desbloqueia todos
            if (atual && atual.diaIdx === diaIdx && atual.horaIdx === horaIdx) {
                setBloqueioHorarios(prevBloq => ({ ...prevBloq, [psicologoKey]: null }));
                return { ...prev, [psicologoKey]: null };
            }
            // Marca o horário e bloqueia os demais
            setBloqueioHorarios(prevBloq => ({
                ...prevBloq,
                [psicologoKey]: { diaIdx, horaIdx, agendaId }
            }));
            return { ...prev, [psicologoKey]: { diaIdx, horaIdx, agendaId } };
        });
    }

    // Função para formatar data ISO para DD/MM/YYYY (compatível com qualquer formato ISO)
    function formatDateBR(dateIso: string): string {
        if (!dateIso) return "";
        // Garante que só pegue a parte da data
        const isoDate = dateIso.slice(0, 10); // "2025-08-14"
        const [ano, mes, dia] = isoDate.split("-");
        if (!ano || !mes || !dia) return "";
        return `${dia}/${mes}/${ano}`;
    }

    // Novo estado para modal de resumo da agenda
    const [agendaResumo, setAgendaResumo] = useState<{
        PsicologoId: string;
        AgendaId: string;
        Nome: string;
        Data: string;
        Horario: string;
    } | null>(null);

    // Função para abrir o modal de resumo da agenda
    function abrirResumoAgenda({ psicologoId, agendaId }: { psicologoId: string, agendaId: string }) {
        let psicologo = (psicologos ?? []).find(p => String(p.Id) === String(psicologoId));
        if (!psicologo && psicologos && psicologos.length > 0) {
            psicologo = psicologos[0];
        }
        let agenda = psicologo?.PsychologistAgendas?.find(a => String(a.Id) === String(agendaId));
        if (!agenda && psicologo?.PsychologistAgendas && psicologo.PsychologistAgendas.length > 0) {
            agenda = psicologo.PsychologistAgendas[0];
        }
        setAgendaResumo({
            PsicologoId: psicologo?.Id ?? "N/A",
            AgendaId: agenda?.Id ?? "N/A",
            Nome: psicologo?.Nome ?? "Sem nome",
            Data: agenda?.Data ? formatDateBR(agenda.Data) : "01/01/2025",
            Horario: agenda?.Horario ?? "08:00",
        });
    }

    // Função para fechar o modal
    function fecharResumoAgenda() {
        setAgendaResumo(null);
    }

    return {
        psicologos,
        isPsicologosLoading,
        refetch,
        busca,
        setBusca,
        filtro,
        setFiltro,
        PAGE_SIZE,
        cardsVisiveis,
        setCardsVisiveis,
        totalDias,
        diasSemana,
        hoje,
        datas,
        startIdx,
        setStartIdx,
        diasVisiveis,
        diaSelecionado,
        setDiaSelecionado,
        isDisponivelNoDia,
        atendeModalidade,
        atendePublico,
        getHorariosPorData,
        horariosPorData,
        horariosSelecionados,
        setHorariosSelecionados,
        selecionarHorario,
        bloqueioHorarios,
        router,
        motion,
        AnimatePresence,
        agendaResumo,
        abrirResumoAgenda,
        fecharResumoAgenda,
    };
}

// Adicione esta função para seleção de slot de horário
export function useSelectHorario() {
    const [horariosSelecionados, setHorariosSelecionados] = React.useState<{ [psicologoId: number]: { diaIdx: number; horaIdx: number; agendaId: number | string } | null }>({});

    function selecionarHorario(psicologoId: number, diaIdx: number, horaIdx: number, agendaId: number | string) {
        setHorariosSelecionados(prev => ({
            ...prev,
            [psicologoId]: prev[psicologoId] &&
                prev[psicologoId]?.diaIdx === diaIdx &&
                prev[psicologoId]?.horaIdx === horaIdx
                ? null // desmarca se já está selecionado
                : { diaIdx, horaIdx, agendaId }
        }));
    }

    return {
        horariosSelecionados,
        selecionarHorario,
        setHorariosSelecionados,
    };
}
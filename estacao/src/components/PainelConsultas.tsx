'use client';

import { useState, useMemo, useCallback } from "react";
import { useConsultasAgendadas } from "@/hooks/consulta";
import { extrairConsultasFuturas } from "@/utils/consultaUtils";
import { ConsultaApi } from "@/types/consultasTypes";
import { ConsultaCard } from "@/lib/consultas/ConsultaCard";
import ModalCancelarSessao from "@/components/ModalCancelarSessao";
import ModalCancelarSessaoDentroPrazo from "@/components/ModalCancelarSessaoDentroPrazo";
import { isCancelamentoDentroPrazo } from "@/utils/cancelamentoUtils";
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export type Consulta = {
    Id: string | number;
    Agenda?: { Data?: string; Horario?: string };
    Date?: string;
    Time?: string;
    Status?: string;
    PacienteId?: string | number;
    PsicologoId?: string | number;
    AgendaId?: string | number;
    CreatedAt?: string;
    Psicologo?: {
        Id?: string | number;
        Nome?: string;
        Email?: string;
        images?: { url?: string }[];
        Images?: { Url?: string }[]; // Formato da API
    };
    ReservaSessao?: {
        Status?: string;
        AgoraChannel?: string | null;
        VideoCallLink?: string | null;
    };
};

const INITIAL_VISIBLE_COUNT = 3;
const LOAD_MORE_INCREMENT = 3;

/**
 * Converte o tipo Consulta local para ConsultaApi
 */
function converterConsultaParaApi(consulta: Consulta): ConsultaApi {
    // Garante que temos um Id válido
    const consultaId = String(consulta.Id || '');
    const pacienteId = consulta.PacienteId ? String(consulta.PacienteId) : '';
    const psicologoId = consulta.PsicologoId ? String(consulta.PsicologoId) : (consulta.Psicologo?.Id ? String(consulta.Psicologo.Id) : '');
    const agendaId = consulta.AgendaId ? String(consulta.AgendaId) : '';
    
    return {
        Id: consultaId,
        Date: consulta.Date || consulta.Agenda?.Data || '',
        Time: consulta.Time || consulta.Agenda?.Horario || '',
        Status: consulta.Status || consulta.ReservaSessao?.Status || '',
        PacienteId: pacienteId,
        PsicologoId: psicologoId,
        AgendaId: agendaId,
        CreatedAt: consulta.CreatedAt || new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
        Psicologo: consulta.Psicologo ? {
            Id: psicologoId,
            Nome: consulta.Psicologo.Nome || '',
            Images: (consulta.Psicologo.Images || []).filter((img): img is { Url: string } => Boolean(img?.Url)),
        } : undefined,
        Agenda: consulta.Agenda ? {
            Data: consulta.Agenda.Data || '',
            Horario: consulta.Agenda.Horario || '',
            DiaDaSemana: '',
            Status: '',
        } : undefined,
        ReservaSessao: consulta.ReservaSessao ? {
            Status: consulta.ReservaSessao.Status || '',
            VideoCallLink: consulta.ReservaSessao.VideoCallLink || null,
        } : undefined,
    };
}


/**
 * Estado vazio quando não há consultas
 */
function EmptyState() {
    return (
        <div className="flex flex-col justify-center py-8">
            <p className="text-gray-500 fira-sans">Você ainda não possui nenhuma consulta</p>
        </div>
    );
}

interface PainelConsultasProps {
    id?: string;
    consultaExcluirId?: string | null; // ID da consulta a ser excluída (para evitar duplicação com Próxima Consulta)
}

/**
 * Componente principal que exibe as consultas agendadas
 * Sempre mostra quando houver agendamentos disponíveis
 * Exclui a consulta especificada em consultaExcluirId para evitar duplicação
 */
export default function PainelConsultas({ id = "minhas-consulta", consultaExcluirId }: PainelConsultasProps) {
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
    const [showModalCancelar, setShowModalCancelar] = useState(false);
    const [showModalCancelarDentroPrazo, setShowModalCancelarDentroPrazo] = useState(false);
    const [consultaSelecionadaParaCancelar, setConsultaSelecionadaParaCancelar] = useState<ConsultaApi | null>(null);
    const { consultasAgendadas,  isLoading } = useConsultasAgendadas();
    const queryClient = useQueryClient();

    console.log('consultasAgendadas', consultasAgendadas);


    // Extrai e processa as consultas futuras
    const futurasArray = useMemo(() => {
        const extraidas = extrairConsultasFuturas(consultasAgendadas) as Consulta[];
        console.log('futurasArray extraídas:', extraidas);
        
        // Exclui a consulta que está sendo exibida na seção "Próxima Consulta"
        const consultasSemDuplicata = consultaExcluirId
            ? extraidas.filter(consulta => consulta.Id !== consultaExcluirId)
            : extraidas;
        
        // Usa timezone de Brasília para todas as comparações
        const agoraBr = dayjs().tz('America/Sao_Paulo');
        const dataAtualStr = agoraBr.format('YYYY-MM-DD');
        const horaAtualBr = agoraBr.format('HH:mm');
        
        // Agrupa consultas por data
        const consultasPorData = new Map<string, Consulta[]>();
        
        extraidas.forEach(consulta => {
            const dataConsulta = consulta.Agenda?.Data || consulta.Date;
            if (!dataConsulta) return;
            
            const dataConsultaBr = dayjs(dataConsulta).tz('America/Sao_Paulo');
            const dataKey = dataConsultaBr.format('YYYY-MM-DD');
            
            if (!consultasPorData.has(dataKey)) {
                consultasPorData.set(dataKey, []);
            }
            consultasPorData.get(dataKey)!.push(consulta);
        });
        
        // Filtra consultas: nunca mostra datas retroativas (considera data e horário)
        // Observação: não excluímos mais status 'Agendada/Agendado' — o card exibe o status real do banco
        const consultasFiltradas = consultasSemDuplicata.filter(consulta => {
            const dataConsulta = consulta.Agenda?.Data || consulta.Date;
            const horaConsulta = consulta.Agenda?.Horario || consulta.Time;
            if (!dataConsulta) return false;

            const dataConsultaBr = dayjs(dataConsulta).tz('America/Sao_Paulo');
            const dataKey = dataConsultaBr.format('YYYY-MM-DD');

            // Compara primeiro a data
            if (dataKey < dataAtualStr) {
                // Data passada, não é válida
                return false;
            }

            // Se é o mesmo dia, compara o horário
            if (dataKey === dataAtualStr) {
                if (!horaConsulta) return false;
                // Se o horário já passou, não mostra
                if (horaConsulta < horaAtualBr) {
                    return false;
                }
                // Se o horário ainda não passou, mostra
                return true;
            }

            // Mostra todas as datas futuras (incluindo 02/01/2026)
            return dataKey > dataAtualStr;
        });
        
        // Ordena por data e horário
        consultasFiltradas.sort((a, b) => {
            const dataA = a.Agenda?.Data || a.Date || '';
            const dataB = b.Agenda?.Data || b.Date || '';
            const horarioA = a.Agenda?.Horario || a.Time || '';
            const horarioB = b.Agenda?.Horario || b.Time || '';
            
            // Compara datas
            if (dataA !== dataB) {
                return new Date(dataA).getTime() - new Date(dataB).getTime();
            }
            
            // Se for a mesma data, ordena por horário
            return horarioA.localeCompare(horarioB);
        });
        
        return consultasFiltradas;
    }, [consultasAgendadas, consultaExcluirId]);

    const hasConsultas = futurasArray.length > 0;
    const consultasVisiveis = useMemo(
        () => futurasArray.slice(0, visibleCount),
        [futurasArray, visibleCount]
    );
    const podeVerMais = visibleCount < futurasArray.length;

    const handleVerMais = useCallback(() => {
        setVisibleCount((prev) => prev + LOAD_MORE_INCREMENT);
    }, []);

    // Handler para abrir modal de cancelamento
    const handleAbrirCancelar = useCallback((consultaId?: string | number) => {
        console.log('[PainelConsultas] handleAbrirCancelar chamado', { consultaId, futurasArrayLength: futurasArray.length });
        
        // Encontra a consulta pelo ID em todas as consultas agendadas
        const todasConsultas = extrairConsultasFuturas(consultasAgendadas) as Consulta[];
        const consulta = todasConsultas.find(c => String(c.Id) === String(consultaId));
        
        if (!consulta) {
            console.error('[PainelConsultas] Consulta não encontrada para cancelar', { consultaId, todasConsultasLength: todasConsultas.length });
            return;
        }

        const consultaApi = converterConsultaParaApi(consulta);
        setConsultaSelecionadaParaCancelar(consultaApi);

        // Verifica se está dentro ou fora do prazo de 24h
        const dataConsulta = consultaApi.Agenda?.Data || consultaApi.Date || '';
        const horarioConsulta = consultaApi.Agenda?.Horario || consultaApi.Time || '';
        
        const dentroPrazo = isCancelamentoDentroPrazo(dataConsulta, horarioConsulta);
        
        console.log('[PainelConsultas] Verificação de prazo', {
            dataConsulta,
            horarioConsulta,
            dentroPrazo
        });

        if (dentroPrazo) {
            // Dentro do prazo: usa modal simples sem motivo
            console.log('[PainelConsultas] Abrindo modal de cancelamento dentro do prazo');
            setShowModalCancelarDentroPrazo(true);
        } else {
            // Fora do prazo: usa modal com motivo e upload
            console.log('[PainelConsultas] Abrindo modal de cancelamento fora do prazo');
            setShowModalCancelar(true);
        }
    }, [consultasAgendadas, futurasArray.length]);

    // Sempre mostra a seção, mesmo quando está carregando ou não há consultas
    return (
        <section id={id} className="sm:p-6 rounded-lg mt-8 w-full">
            <h3 className="fira-sans font-semibold text-2xl leading-[40px] tracking-normal align-middle text-[#49525A] mb-4">Consultas Agendadas</h3>
            
            {isLoading ? (
                <div className="flex flex-col justify-center py-8">
                    <p className="text-gray-500">Carregando consultas...</p>
                </div>
            ) : !hasConsultas ? (
                <EmptyState />
            ) : (
                <>
                    <div className="flex flex-col gap-4 mb-24">
                        {consultasVisiveis.map((consulta: Consulta) => {
                            const consultaApi = converterConsultaParaApi(consulta);
                            return (
                                <ConsultaCard 
                                    key={consulta.Id} 
                                    consulta={consultaApi}
                                    onAbrirCancelar={handleAbrirCancelar}
                                />
                            );
                        })}
                    </div>
                    {podeVerMais && (
                        <button
                            className="mt-4 px-4 py-2 bg-[#232A5C] text-white rounded hover:bg-[#1a2047] transition"
                            onClick={handleVerMais}
                        >
                            Ver mais
                        </button>
                    )}
                </>
            )}

            {/* Modal de cancelamento dentro do prazo (>24h) */}
            {showModalCancelarDentroPrazo && consultaSelecionadaParaCancelar && (
                <ModalCancelarSessaoDentroPrazo
                    open={showModalCancelarDentroPrazo}
                    onClose={() => {
                        setShowModalCancelarDentroPrazo(false);
                        setTimeout(() => {
                            setConsultaSelecionadaParaCancelar(null);
                        }, 300);
                    }}
                    consulta={{
                        id: consultaSelecionadaParaCancelar.Id ? String(consultaSelecionadaParaCancelar.Id) : undefined,
                        date: consultaSelecionadaParaCancelar.Agenda?.Data || consultaSelecionadaParaCancelar.Date,
                        time: consultaSelecionadaParaCancelar.Agenda?.Horario || consultaSelecionadaParaCancelar.Time,
                        pacienteId: consultaSelecionadaParaCancelar.PacienteId ? String(consultaSelecionadaParaCancelar.PacienteId) : undefined,
                        psicologoId: consultaSelecionadaParaCancelar.PsicologoId ? String(consultaSelecionadaParaCancelar.PsicologoId) : undefined,
                        linkDock: undefined,
                        status: "Deferido",
                        tipo: "Paciente"
                    }}
                    onConfirm={async () => {
                        setShowModalCancelarDentroPrazo(false);
                        // Invalida e refaz as queries relacionadas a consultas
                        await Promise.all([
                            queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] }),
                            queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] }),
                            queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] }),
                            queryClient.refetchQueries({ queryKey: ['consultasAgendadas'] }),
                        ]);
                        setTimeout(() => {
                            setConsultaSelecionadaParaCancelar(null);
                        }, 300);
                    }}
                />
            )}

            {/* Modal de cancelamento fora do prazo (<24h) */}
            {showModalCancelar && consultaSelecionadaParaCancelar && (
                <ModalCancelarSessao
                    open={showModalCancelar}
                    onClose={() => {
                        setShowModalCancelar(false);
                        setTimeout(() => {
                            setConsultaSelecionadaParaCancelar(null);
                        }, 300);
                    }}
                    consulta={{
                        id: consultaSelecionadaParaCancelar.Id ? String(consultaSelecionadaParaCancelar.Id) : undefined,
                        date: consultaSelecionadaParaCancelar.Agenda?.Data || consultaSelecionadaParaCancelar.Date,
                        time: consultaSelecionadaParaCancelar.Agenda?.Horario || consultaSelecionadaParaCancelar.Time,
                        pacienteId: consultaSelecionadaParaCancelar.PacienteId ? String(consultaSelecionadaParaCancelar.PacienteId) : undefined,
                        psicologoId: consultaSelecionadaParaCancelar.PsicologoId ? String(consultaSelecionadaParaCancelar.PsicologoId) : undefined,
                        linkDock: undefined,
                        status: "EmAnalise",
                        tipo: "Paciente"
                    }}
                    onConfirm={async (motivo: string) => {
                        // motivo é necessário para a interface, mas não é usado aqui
                        console.log('Cancelamento confirmado:', motivo);
                        setShowModalCancelar(false);
                        // Invalida e refaz as queries relacionadas a consultas
                        await Promise.all([
                            queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] }),
                            queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] }),
                            queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] }),
                            queryClient.refetchQueries({ queryKey: ['consultasAgendadas'] }),
                        ]);
                        setTimeout(() => {
                            setConsultaSelecionadaParaCancelar(null);
                        }, 300);
                    }}
                />
            )}
        </section>
    );
}

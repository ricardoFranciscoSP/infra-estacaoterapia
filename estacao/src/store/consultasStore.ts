import { create } from 'zustand';
import { ConsultaDia, ConsultasStore, ConsultasStoreSetters, Futuras, HistoricoConsultas, Reserva, Token, ConsultasAgendadasResponse, ConsultaApi, ConsultaAtual } from '@/types/consultasTypes';
import { consultaService } from '@/services/consultaService';
import { obterProximaConsultaReservada } from '@/utils/consultasUtils';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export const useConsultasStore = create<ConsultasStore & ConsultasStoreSetters>((set) => ({
    consultas: [],
    consulta: null,
    consultaFutura: null,
    consultaAgendada: null,
    consultaConcluida: null,
    consultaDia: null,
    token: null,
    setConsultaFutura: (consulta: Futuras[] | Futuras | null) => set({ consultaFutura: consulta }),
    setConsultaDia: (consulta: ConsultaDia | null) => set({ consultaDia: consulta }),
    setConsultaAgendada: (consulta: Futuras[] | Futuras | null) => set({ consultaAgendada: consulta }),
    setConsultaConcluida: (consulta: HistoricoConsultas | HistoricoConsultas[] | null) => set({ consultaConcluida: consulta }),
    setConsultas: (consultas: Reserva[]) => set({ consultas }),
    setConsulta: (consulta: Reserva | null) => set({ consulta }),
    setToken: (token: Token | null) => set({ token }),
}));

// Adicionar interface para erro da API
interface APIError {
    response?: {
        data?: {
            error?: string;
        };
    };
}

// Busca token para video call
export const fetchToken = async (channel: string): Promise<{ appId: string; token: string; uid: string; channel: string }> => {
    try {
        const response = await consultaService().getToken(channel);
        const data = response.data;
        useConsultasStore.getState().setToken(data);
        return data;
    } catch (error: unknown) {
        const apiError = error as APIError;
        const message = apiError?.response?.data?.error || 'Erro ao buscar token.';
        throw new Error(message);
    }
};

export const fetchConsultas = async (): Promise<Reserva[]> => {
    try {
        const response = await consultaService().getConsulta();
        const data = response.data;
        useConsultasStore.getState().setConsultas(data);
        return data; // <- ESSENCIAL para o React Query
    } catch (error) {
        console.error('Failed to fetch consultas:', error);
        throw error; // <- Para o React Query tratar erro corretamente
    }
};

export const fetchConsultaById = async (id: string): Promise<Reserva | null> => {
    try {
        if (!id || id.trim() === '') {
            console.warn('ID da consulta é obrigatório');
            return null;
        }

        console.log('🟡 [fetchConsultaById] Buscando consulta com ID:', id);
        const response = await consultaService().getConsultaById(id);
        const data = response.data;

        if (data) {
            useConsultasStore.getState().setConsulta(data);
            console.log('🟢 [fetchConsultaById] Consulta encontrada:', data);
        }

        return data || null;
    } catch (error: unknown) {
        console.error('🔴 [fetchConsultaById] Erro ao buscar consulta:', error);

        // Se for erro 404 ou 500, retorna null em vez de lançar erro
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { status?: number; data?: { error?: string } } };
            const status = axiosError.response?.status;
            const errorMessage = axiosError.response?.data?.error || 'Erro desconhecido';

            if (status === 404) {
                console.warn(`⚠️ [fetchConsultaById] Consulta com ID ${id} não encontrada (404)`);
                return null;
            }

            if (status === 500) {
                console.error(`🔴 [fetchConsultaById] Erro no servidor ao buscar consulta ${id} (500):`, errorMessage);
                return null;
            }
        }

        // Para outros erros, retorna null em vez de lançar
        // Isso evita quebrar a aplicação se houver problemas de rede, etc.
        return null;
    }
};

export const fetchConsultasFuturas = async (): Promise<Futuras> => {
    try {
        const response = await consultaService().getConsultaFuturas()
        const data = response.data;
        useConsultasStore.getState().setConsultaFutura(data);
        return data; // <- ESSENCIAL para o React Query
    } catch (error) {
        console.error('Failed to fetch consultas futuras:', error);
        throw error; // <- Para o React Query tratar erro corretamente
    }
};

export const fetchConsultasAgendadas = async (): Promise<Futuras[]> => {
    try {
        const response = await consultaService().getAgendadas()
        const data = response.data as ConsultasAgendadasResponse;

        // Se a resposta não for bem-sucedida, retorna array vazio
        if (!data || data.success === false) {
            useConsultasStore.getState().setConsultaAgendada([]);
            return [];
        }

        // Coleta todas as consultas futuras (nextReservation, consultaAtual e futuras)
        const todasFuturas: ConsultaApi[] = [];
        const idsAdicionados = new Set<string>();

        // Adiciona nextReservation se existir e for futura
        if (data.nextReservation) {
            const proxima = obterProximaConsultaReservada(data.nextReservation, null);
            if (proxima && proxima.Id === data.nextReservation.Id) {
                todasFuturas.push(data.nextReservation);
                idsAdicionados.add(data.nextReservation.Id);
            }
        }

        // Adiciona consultaAtual se for diferente de nextReservation e for futura
        if (data.consultaAtual && !idsAdicionados.has(data.consultaAtual.Id)) {
            const proxima = obterProximaConsultaReservada(data.consultaAtual, null);
            if (proxima && proxima.Id === data.consultaAtual.Id) {
                todasFuturas.push(data.consultaAtual);
                idsAdicionados.add(data.consultaAtual.Id);
            }
        }

        // Adiciona todas as futuras do array, filtrando apenas as que são futuras
        if (data.futuras && data.futuras.length > 0) {
            data.futuras.forEach(futura => {
                if (idsAdicionados.has(futura.Id)) return; // Evita duplicatas

                const proxima = obterProximaConsultaReservada(futura, null);
                if (proxima && proxima.Id === futura.Id) {
                    todasFuturas.push(futura);
                    idsAdicionados.add(futura.Id);
                }
            });
        }

        // Ordena todas as futuras por data e horário
        todasFuturas.sort((a, b) => {
            const dataA = dayjs(a.Date).tz('America/Sao_Paulo').format('YYYY-MM-DD');
            const dataB = dayjs(b.Date).tz('America/Sao_Paulo').format('YYYY-MM-DD');
            if (dataA !== dataB) {
                return dataA.localeCompare(dataB);
            }
            return (a.Time || '').localeCompare(b.Time || '');
        });

        // A primeira é sempre a próxima (nextReservation)
        const proximaConsulta = todasFuturas.length > 0 ? todasFuturas[0] : (data.nextReservation || data.consultaAtual);

        // Se encontrou consultas futuras, cria um objeto Futuras compatível
        if (proximaConsulta && todasFuturas.length > 0) {
            const futurasFormatado: Futuras = {
                success: true,
                nextReservation: proximaConsulta,
                idProximaConsulta: proximaConsulta.Id,
                futuras: todasFuturas.slice(1), // Remove a primeira (que é a próxima) das futuras
                consultaAtual: {
                    success: true,
                    consultaAtual: proximaConsulta,
                    futuras: todasFuturas.slice(1)
                }
            };
            useConsultasStore.getState().setConsultaAgendada([futurasFormatado]);
            return [futurasFormatado];
        }

        // Se não encontrou consulta próxima, retorna array vazio
        useConsultasStore.getState().setConsultaAgendada([]);
        return [];
    } catch (error) {
        console.error('Failed to fetch consultas:', error);
        throw error; // <- Para o React Query tratar erro corretamente
    }
};

/**
 * Extrai consultas concluídas das consultas agendadas como fallback
 * Busca consultas com status "Concluído", "Concluido" ou datas passadas
 */
async function extrairConsultasConcluidasFallback(): Promise<HistoricoConsultas> {
    try {
        // Primeiro tenta usar dados já carregados do store
        const consultasAgendadasStore = useConsultasStore.getState().consultaAgendada;

        let consultasAgendadas: Futuras | ConsultasAgendadasResponse | null = null;

        // Se já tiver dados no store, usa eles (mais rápido)
        if (consultasAgendadasStore) {
            if (Array.isArray(consultasAgendadasStore)) {
                // Se for array, pega o primeiro ou combina todos
                consultasAgendadas = consultasAgendadasStore[0] || {};
            } else {
                consultasAgendadas = consultasAgendadasStore;
            }
        }

        // Se não tiver no store, busca da API
        if (!consultasAgendadas || !consultasAgendadas.success) {
            console.info('[extrairConsultasConcluidasFallback] Buscando consultas agendadas da API...');
            const responseAgendadas = await consultaService().getAgendadas();
            consultasAgendadas = responseAgendadas.data;
        }

        if (!consultasAgendadas || consultasAgendadas.success === false) {
            console.warn('[extrairConsultasConcluidasFallback] Sem dados de consultas agendadas disponíveis');
            return {
                completed: [],
                reserved: [],
                consultaAtual: {
                    success: false,
                    consultaAtual: { Id: '', Date: '', Time: '', Status: '' },
                    futuras: [],
                },
            };
        }

        // Extrai todas as consultas do response
        const todasConsultas: ConsultaApi[] = [];

        if (consultasAgendadas.nextReservation) {
            todasConsultas.push(consultasAgendadas.nextReservation);
        }
        // consultaAtual é do tipo ConsultaAtual, não ConsultaApi, então não adicionamos aqui
        // Se necessário, podemos extrair a consulta de dentro de consultaAtual.consultaAtual
        if (consultasAgendadas.consultaAtual && 'consultaAtual' in consultasAgendadas.consultaAtual) {
            // ConsultaAtual tem uma estrutura diferente, não é uma ConsultaApi diretamente
            // Podemos ignorar ou tratar de forma diferente se necessário
        }
        if (Array.isArray(consultasAgendadas.futuras)) {
            todasConsultas.push(...consultasAgendadas.futuras);
        }

        // Filtra consultas concluídas (status "Concluído" ou data passada há mais de 1 hora)
        const agoraBr = dayjs().tz('America/Sao_Paulo');
        const umaHoraAtras = agoraBr.subtract(1, 'hour');

        const consultasConcluidas = todasConsultas.filter((consulta: ConsultaApi) => {
            const status = (consulta.Status || consulta.ReservaSessao?.Status || '').toLowerCase();
            const statusConcluido = status.includes('conclu') ||
                status.includes('finalizada') ||
                status.includes('concluído');

            // Verifica também por data passada (consulta que já passou há mais de 1 hora)
            const dataConsulta = consulta.Date || consulta.Agenda?.Data;
            const horaConsulta = consulta.Time || consulta.Agenda?.Horario;

            if (dataConsulta && horaConsulta) {
                try {
                    const dataHoraConsulta = dayjs.tz(
                        `${dataConsulta} ${horaConsulta}`,
                        'America/Sao_Paulo'
                    );
                    const ehPassada = dataHoraConsulta.isBefore(umaHoraAtras);
                    return statusConcluido || ehPassada;
                } catch {
                    // Se não conseguir parsear data, confia apenas no status
                    return statusConcluido;
                }
            }

            return statusConcluido;
        });

        console.log('[extrairConsultasConcluidasFallback] ✅ Encontradas', consultasConcluidas.length, 'consultas concluídas das agendadas');

        return {
            completed: consultasConcluidas,
            reserved: [],
            consultaAtual: {
                success: false,
                consultaAtual: { Id: '', Date: '', Time: '', Status: '' },
                futuras: [],
            },
        };
    } catch (error) {
        console.warn('[extrairConsultasConcluidasFallback] Erro ao buscar consultas agendadas:', error);
        return {
            completed: [],
            reserved: [],
            consultaAtual: {
                success: false,
                consultaAtual: { Id: '', Date: '', Time: '', Status: '' },
                futuras: [],
            },
        };
    }
}

export const fetchConsultasConcluidas = async (): Promise<HistoricoConsultas> => {
    // Timeout reduzido para 10 segundos (o endpoint está muito lento)
    const timeoutMs = 10000;
    const preferAlternativeEndpoint = true; // Evita chamar o endpoint principal quebrado e reduz erros 500 no console

    const emptyData: HistoricoConsultas = {
        completed: [],
        reserved: [],
        consultaAtual: {
            success: false,
            consultaAtual: {
                Id: '',
                Date: '',
                Time: '',
                Status: '',
            },
            futuras: [],
        },
    };

    const setAndReturn = (data: HistoricoConsultas) => {
        useConsultasStore.getState().setConsultaConcluida(data);
        return data;
    };

    const filtrarSomenteRealizadasOuEncerradas = (consultas: ConsultaApi[]): ConsultaApi[] => {
        if (!Array.isArray(consultas)) {
            console.log('[filtrarSomenteRealizadasOuEncerradas] Consultas não é array:', typeof consultas);
            return [];
        }
        
        console.log('[filtrarSomenteRealizadasOuEncerradas] Total de consultas recebidas:', consultas.length);
        
        const proibidos = ['reservado', 'agendada', 'agendado', 'emandamento'];
        const consultasFiltradas = consultas.filter((c) => {
            const status = (c?.Status || c?.ReservaSessao?.Status || '').toString().toLowerCase();
            if (!status) {
                console.log('[filtrarSomenteRealizadasOuEncerradas] Consulta sem status, incluindo:', c?.Id);
                return true; // Inclui se não tiver status (pode ser legado)
            }
            const deveExcluir = proibidos.some((p) => status.includes(p));
            if (deveExcluir) {
                console.log('[filtrarSomenteRealizadasOuEncerradas] Excluindo consulta com status:', status, c?.Id);
            }
            return !deveExcluir;
        });
        
        console.log('[filtrarSomenteRealizadasOuEncerradas] Consultas após filtro:', consultasFiltradas.length);
        return consultasFiltradas;
    };

    const convertAlternativeResponse = (dataAlt: unknown): HistoricoConsultas => {
        if (Array.isArray(dataAlt)) {
            const consultasArray = dataAlt.filter((item): item is ConsultaApi => 
                item && typeof item === 'object' && 'Id' in item
            );
            return {
                completed: filtrarSomenteRealizadasOuEncerradas(consultasArray),
                reserved: [],
                consultaAtual: {
                    success: false,
                    consultaAtual: {
                        Id: '',
                        Date: '',
                        Time: '',
                        Status: '',
                    },
                    futuras: [],
                },
            };
        }

        if (dataAlt && typeof dataAlt === 'object') {
            const payload = dataAlt as Record<string, unknown>;
            // O endpoint /consultas-paciente/todas-realizadas retorna { success: true, data: [...] }
            const completedList = (Array.isArray(payload.completed) ? payload.completed : 
                Array.isArray(payload.data) ? payload.data : []) as ConsultaApi[];
            const reservedList = (Array.isArray(payload.reserved) ? payload.reserved : []) as ConsultaApi[];
            const consultaAtualData = (payload.consultaAtual && typeof payload.consultaAtual === 'object' 
                ? payload.consultaAtual : null) as ConsultaAtual | null;
            return {
                completed: filtrarSomenteRealizadasOuEncerradas(completedList),
                reserved: reservedList,
                consultaAtual: consultaAtualData || {
                    success: false,
                    consultaAtual: {
                        Id: '',
                        Date: '',
                        Time: '',
                        Status: '',
                    },
                    futuras: [],
                },
            };
        }

        throw new Error('Formato de dados alternativo inválido');
    };

    const tryFallbackExtraction = async () => {
        try {
            const fallbackData = await extrairConsultasConcluidasFallback();
            if (fallbackData.completed.length > 0) {
                console.log('[fetchConsultasConcluidas] ✅ Dados extraídos das consultas agendadas:', {
                    completed: fallbackData.completed.length,
                });
            } else if (process.env.NODE_ENV === 'development') {
                console.info('[fetchConsultasConcluidas] Fallback das agendadas não encontrou consultas concluídas.');
            }
            return setAndReturn(fallbackData);
        } catch (fallbackError) {
            console.warn('[fetchConsultasConcluidas] Erro ao extrair consultas concluídas das agendadas:', fallbackError);
            return null;
        }
    };

    const tryAlternativeEndpoint = async (reason: string) => {
        try {
            console.info(`[fetchConsultasConcluidas] ${reason} Tentando endpoint alternativo com timeout de 8s...`);
            const responseAlt = await consultaService().getConsultaConcluidas(8000);
            const dataAlt = convertAlternativeResponse(responseAlt.data);
            console.log('[fetchConsultasConcluidas] ✅ Dados recebidos do endpoint alternativo:', {
                completed: dataAlt.completed.length,
                reserved: dataAlt.reserved.length,
            });
            return setAndReturn(dataAlt);
        } catch (altError) {
            console.warn('[fetchConsultasConcluidas] Endpoint alternativo falhou:', altError);
            return null;
        }
    };

    try {
        // Primeiro tenta o endpoint principal que retorna todas as consultas realizadas
        try {
            console.log('[fetchConsultasConcluidas] Tentando endpoint principal /consultas-paciente/todas-realizadas...');
            const response = await consultaService().getConsultasCompletas(timeoutMs);
            const data = response.data;

            console.log('[fetchConsultasConcluidas] Resposta completa do endpoint:', {
                hasData: !!data,
                dataType: typeof data,
                isArray: Array.isArray(data),
                keys: data && typeof data === 'object' ? Object.keys(data) : [],
                dataLength: Array.isArray(data) ? data.length : (data && typeof data === 'object' && 'data' in data && Array.isArray((data as Record<string, unknown>).data) ? ((data as Record<string, unknown>).data as unknown[]).length : 0)
            });

            // Valida se os dados estão no formato esperado
            // O endpoint /consultas-paciente/todas-realizadas retorna { success: true, data: [...] }
            if (data && typeof data === 'object') {
                const payload = data as Record<string, unknown>;
                
                // Se tem propriedade 'data' com array, é o formato do endpoint
                if (Array.isArray(payload.data)) {
                    console.log('[fetchConsultasConcluidas] ✅ Dados recebidos do endpoint principal (formato { data: [...] }):', {
                        total: payload.data.length,
                        sample: payload.data.length > 0 ? {
                            id: (payload.data[0] as ConsultaApi)?.Id,
                            status: (payload.data[0] as ConsultaApi)?.Status,
                            date: (payload.data[0] as ConsultaApi)?.Date
                        } : null
                    });
                    const consultasFiltradas = filtrarSomenteRealizadasOuEncerradas(payload.data as ConsultaApi[]);
                    console.log('[fetchConsultasConcluidas] Consultas após filtro:', consultasFiltradas.length);
                    return setAndReturn({
                        completed: consultasFiltradas,
                        reserved: [],
                        consultaAtual: {
                            success: false,
                            consultaAtual: {
                                Id: '',
                                Date: '',
                                Time: '',
                                Status: '',
                            },
                            futuras: [],
                        },
                    });
                }
                
                // Se tem propriedade 'completed', é o formato antigo
                if (Array.isArray(payload.completed) || Array.isArray(payload.reserved)) {
                    console.log('[fetchConsultasConcluidas] ✅ Dados recebidos do endpoint principal (formato antigo):', {
                        completed: Array.isArray(payload.completed) ? payload.completed.length : 0,
                        reserved: Array.isArray(payload.reserved) ? payload.reserved.length : 0,
                    });
                    return setAndReturn(data as HistoricoConsultas);
                }
                
                // Se é um array direto
                if (Array.isArray(data)) {
                    console.log('[fetchConsultasConcluidas] ✅ Dados recebidos do endpoint principal (array direto):', {
                        total: data.length
                    });
                    const consultasFiltradas = filtrarSomenteRealizadasOuEncerradas(data as ConsultaApi[]);
                    console.log('[fetchConsultasConcluidas] Consultas após filtro:', consultasFiltradas.length);
                    return setAndReturn({
                        completed: consultasFiltradas,
                        reserved: [],
                        consultaAtual: {
                            success: false,
                            consultaAtual: {
                                Id: '',
                                Date: '',
                                Time: '',
                                Status: '',
                            },
                            futuras: [],
                        },
                    });
                }
            }
        } catch (mainError) {
            console.error('[fetchConsultasConcluidas] ❌ Endpoint principal falhou:', mainError);
            console.warn('[fetchConsultasConcluidas] Tentando endpoint alternativo...');
        }

        // Se o endpoint principal falhou, tenta o alternativo
        if (preferAlternativeEndpoint) {
            const altFirst = await tryAlternativeEndpoint('Endpoint principal falhou, tentando alternativo.');
            if (altFirst) return altFirst;
        }

        // Se ambos falharam, tenta extrair das consultas agendadas
        const fallbackData = await tryFallbackExtraction();
        if (fallbackData) return fallbackData;
        
        return setAndReturn(emptyData);
    } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number }; message?: string; code?: string; name?: string };
        const statusCode = axiosError?.response?.status;
        const isTimeout = axiosError?.code === 'ECONNABORTED' ||
            axiosError?.message?.includes('timeout') ||
            axiosError?.message?.includes('aborted') ||
            axiosError?.name === 'AbortError';
        const reason = isTimeout
            ? 'Timeout no endpoint principal.'
            : statusCode
                ? `Erro ${statusCode} no endpoint principal.`
                : 'Erro inesperado no endpoint principal.';

        // Sempre tenta o endpoint alternativo antes de desistir
        const altData = await tryAlternativeEndpoint(reason);
        if (altData) return altData;

        // Se alternativo falhar, tenta extrair das consultas agendadas
        const fallbackData = await tryFallbackExtraction();
        if (fallbackData) return fallbackData;

        if (process.env.NODE_ENV === 'development') {
            console.info('[fetchConsultasConcluidas] Todos os métodos falharam. Retornando dados vazios.');
        }
        return setAndReturn(emptyData);
    }
};

export const fetchConsultasDia = async (): Promise<ConsultaDia> => {
    try {
        const response = await consultaService().getConsultaDia()
        const data = response.data;
        useConsultasStore.getState().setConsultaDia(data);
        return data; // <- ESSENCIAL para o React Query
    } catch (error) {
        console.error('Failed to fetch consultas:', error);
        throw error; // <- Para o React Query tratar erro corretamente
    }
};


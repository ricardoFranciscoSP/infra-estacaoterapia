import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    useConfiguracoesStore,
    fetchConfiguracoes,
    fetchConfiguracaoById,
    updateConfiguracao,
    createConfiguracao
} from '@/store/configuracoesStore';
import {
    Configuracao,
    ConfiguracaoAgenda,
    ConfiguracaoIntegracoes,
    ConfiguracaoAparencia,
    ConfiguracaoPagamentos,
    ConfiguracaoComunicacao,
    ConfiguracaoLGPD,
    ConfiguracaoSeguranca
} from '@/services/configuracoesService';

// Hook para buscar todas as configurações
export function useConfiguracoes() {
    const store = useConfiguracoesStore();
    
    const query = useQuery<Configuracao[]>({
        queryKey: ['configuracoes'],
        queryFn: async () => {
            return await fetchConfiguracoes();
        },
        staleTime: Infinity, // Nunca considera os dados como stale - evita refetches automáticos
        gcTime: 10 * 60 * 1000, // 10 minutos (cache time)
        refetchOnWindowFocus: false,
        refetchOnMount: false, // Nunca refaz fetch ao montar - React Query usa cache se disponível
        refetchOnReconnect: false,
        refetchInterval: false, // Desabilita polling
        // O React Query automaticamente usa o cache se disponível, não precisa de enabled
    });
    
    // Sincroniza o store apenas quando a query retorna dados pela primeira vez
    React.useEffect(() => {
        if (query.data && query.data.length > 0) {
            const currentStoreData = store.configuracoes || [];
            // Só atualiza se os dados realmente mudaram
            if (JSON.stringify(currentStoreData) !== JSON.stringify(query.data)) {
                store.SetConfiguracoes(query.data);
                if (!store.configuracaoAtual || store.configuracaoAtual.Id !== query.data[0].Id) {
                    store.SetConfiguracaoAtual(query.data[0]);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query.data]);

    return {
        configuracoes: query.data ?? [],
        isLoading: query.isLoading || store.isLoading,
        isError: query.isError,
        error: query.error || (store.error ? new Error(store.error) : null),
        refetch: query.refetch,
        configuracaoAtual: store.configuracaoAtual,
    };
}

// Hook para buscar configuração por ID
export function useConfiguracaoById(id: string | null) {
    const store = useConfiguracoesStore();
    const query = useQuery<Configuracao | null>({
        queryKey: ['configuracao', id],
        queryFn: async () => {
            if (!id) return null;
            return await fetchConfiguracaoById(id);
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        initialData: id === store.configuracaoAtual?.Id ? store.configuracaoAtual : undefined,
    });

    return {
        configuracao: query.data ?? null,
        isLoading: query.isLoading || store.isLoading,
        isError: query.isError,
        error: query.error || (store.error ? new Error(store.error) : null),
        refetch: query.refetch,
    };
}

// Hook para atualizar configuração
export function useUpdateConfiguracao() {
    const queryClient = useQueryClient();
    const store = useConfiguracoesStore();
    
    const mutation = useMutation<Configuracao, Error, { id: string; data: Partial<Configuracao> }>({
        mutationFn: async ({ id, data }) => {
            const result = await updateConfiguracao(id, data);
            if (!result) {
                throw new Error('Falha ao atualizar configuração');
            }
            return result;
        },
        onSuccess: (updatedConfig) => {
            // Atualiza o cache diretamente sem fazer refetch
            const currentConfigs = queryClient.getQueryData<Configuracao[]>(['configuracoes']) || [];
            const updatedConfigs = currentConfigs.map(c => c.Id === updatedConfig.Id ? updatedConfig : c);
            
            // Atualiza o cache do React Query primeiro (isso não causa re-renders se os dados forem iguais)
            queryClient.setQueryData(['configuracoes'], updatedConfigs);
            queryClient.setQueryData(['configuracao', updatedConfig.Id], updatedConfig);
            
            // Atualiza o store apenas se os dados realmente mudaram
            if (store.configuracaoAtual?.Id !== updatedConfig.Id || 
                JSON.stringify(store.configuracaoAtual) !== JSON.stringify(updatedConfig)) {
                store.SetConfiguracaoAtual(updatedConfig);
            }
            if (JSON.stringify(store.configuracoes) !== JSON.stringify(updatedConfigs)) {
                store.SetConfiguracoes(updatedConfigs);
            }
        },
    });

    return {
        updateConfiguracao: mutation.mutate,
        updateConfiguracaoAsync: mutation.mutateAsync,
        isLoading: mutation.isPending || store.isLoading,
        isError: mutation.isError,
        error: mutation.error || (store.error ? new Error(store.error) : null),
        isSuccess: mutation.isSuccess,
    };
}

// Hook para criar configuração
export function useCreateConfiguracao() {
    const queryClient = useQueryClient();
    const store = useConfiguracoesStore();
    
    const mutation = useMutation<Configuracao, Error, Partial<Configuracao>>({
        mutationFn: async (data) => {
            const result = await createConfiguracao(data);
            if (!result) {
                throw new Error('Falha ao criar configuração');
            }
            return result;
        },
        onSuccess: (newConfig) => {
            // Atualiza o cache diretamente sem fazer refetch
            const currentConfigs = queryClient.getQueryData<Configuracao[]>(['configuracoes']) || [];
            const newConfigs = [...currentConfigs, newConfig];
            
            // Atualiza o cache do React Query primeiro
            queryClient.setQueryData(['configuracoes'], newConfigs);
            queryClient.setQueryData(['configuracao', newConfig.Id], newConfig);
            
            // Atualiza o store apenas se necessário
            if (!store.configuracaoAtual || store.configuracaoAtual.Id !== newConfig.Id) {
                store.SetConfiguracaoAtual(newConfig);
            }
            if (JSON.stringify(store.configuracoes) !== JSON.stringify(newConfigs)) {
                store.SetConfiguracoes(newConfigs);
            }
        },
    });

    return {
        createConfiguracao: mutation.mutate,
        createConfiguracaoAsync: mutation.mutateAsync,
        isLoading: mutation.isPending || store.isLoading,
        isError: mutation.isError,
        error: mutation.error || (store.error ? new Error(store.error) : null),
        isSuccess: mutation.isSuccess,
    };
}

// Hook específico para configurações de agenda (apenas leitura - não faz requisições)
export function useConfiguracaoAgenda() {
    const store = useConfiguracoesStore();
    const queryClient = useQueryClient();
    
    // Lê do cache do React Query primeiro, depois do store
    const cachedData = queryClient.getQueryData<Configuracao[]>(['configuracoes']);
    const configuracoes = cachedData || store.configuracoes || [];
    const configuracaoAtual = store.configuracaoAtual || (configuracoes.length > 0 ? configuracoes[0] : null);
    
    const { updateConfiguracaoAsync } = useUpdateConfiguracao();
    const { createConfiguracaoAsync } = useCreateConfiguracao();

    const configuracao = configuracaoAtual;

    const atualizarConfiguracaoAgenda = async (data: ConfiguracaoAgenda) => {
        const result = !configuracao
            ? await createConfiguracaoAsync({
                fusoHorarioPadrao: data.fusoHorarioPadrao || 'America/Sao_Paulo',
                duracaoConsultaMin: data.duracaoConsultaMin || 50,
                intervaloEntreConsultas: data.intervaloEntreConsultas || 10,
                antecedenciaMinAgendamento: data.antecedenciaMinAgendamento || 1,
                antecedenciaMaxAgendamento: data.antecedenciaMaxAgendamento || 4320,
                antecedenciaCancelamento: data.antecedenciaCancelamento || 24,
                lembreteAntesConsulta: data.lembreteAntesConsulta || 60,
                horarioGeracaoAutomaticaAgenda: data.horarioGeracaoAutomaticaAgenda || null,
            })
            : await updateConfiguracaoAsync({
                id: configuracao.Id,
                data: {
                    fusoHorarioPadrao: data.fusoHorarioPadrao,
                    duracaoConsultaMin: data.duracaoConsultaMin,
                    intervaloEntreConsultas: data.intervaloEntreConsultas,
                    antecedenciaMinAgendamento: data.antecedenciaMinAgendamento,
                    antecedenciaMaxAgendamento: data.antecedenciaMaxAgendamento,
                    antecedenciaCancelamento: data.antecedenciaCancelamento,
                    lembreteAntesConsulta: data.lembreteAntesConsulta,
                    horarioGeracaoAutomaticaAgenda: data.horarioGeracaoAutomaticaAgenda,
                },
            });
        
        // Invalida o cache para forçar reload
        queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
        
        return result;
    };

    return {
        configuracao,
        isLoading: false, // Não está carregando porque é apenas leitura
        atualizarConfiguracaoAgenda,
        dadosAgenda: configuracao ? {
            fusoHorarioPadrao: configuracao.fusoHorarioPadrao || 'America/Sao_Paulo',
            duracaoConsultaMin: configuracao.duracaoConsultaMin || 50,
            intervaloEntreConsultas: configuracao.intervaloEntreConsultas || 10,
            antecedenciaMinAgendamento: configuracao.antecedenciaMinAgendamento || 1,
            antecedenciaMaxAgendamento: configuracao.antecedenciaMaxAgendamento || 4320,
            antecedenciaCancelamento: configuracao.antecedenciaCancelamento || 24,
            lembreteAntesConsulta: configuracao.lembreteAntesConsulta || 60,
            horarioGeracaoAutomaticaAgenda: configuracao.horarioGeracaoAutomaticaAgenda || null,
        } : null,
    };
}

// Hook para atualizar configurações de integrações (apenas leitura - não faz requisições)
export function useConfiguracaoIntegracoes() {
    const store = useConfiguracoesStore();
    const queryClient = useQueryClient();
    
    // Lê do cache do React Query primeiro, depois do store
    const cachedData = queryClient.getQueryData<Configuracao[]>(['configuracoes']);
    const configuracoes = cachedData || store.configuracoes || [];
    const configuracaoAtual = store.configuracaoAtual || (configuracoes.length > 0 ? configuracoes[0] : null);
    
    const { updateConfiguracaoAsync } = useUpdateConfiguracao();
    const { createConfiguracaoAsync } = useCreateConfiguracao();

    const configuracao = configuracaoAtual;

    const atualizarIntegracoes = async (data: ConfiguracaoIntegracoes) => {
        const result = !configuracao
            ? await createConfiguracaoAsync(data)
            : await updateConfiguracaoAsync({
                id: configuracao.Id,
                data,
            });
        
        // Invalida o cache para forçar reload
        queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
        
        return result;
    };

    return {
        configuracao,
        isLoading: false, // Não está carregando porque é apenas leitura
        atualizarIntegracoes,
        dadosIntegracoes: configuracao ? {
            googleTagManager: configuracao.googleTagManager || '',
            googleAnalytics: configuracao.googleAnalytics || '',
            googleAds: configuracao.googleAds || '',
            agoraAppId: configuracao.agoraAppId || '',
            agoraAppCertificate: configuracao.agoraAppCertificate || '',
            vindiApiKey: configuracao.vindiApiKey || '',
        } : null,
    };
}

// Hook para atualizar configurações de aparência (apenas leitura - não faz requisições)
export function useConfiguracaoAparencia() {
    const store = useConfiguracoesStore();
    const queryClient = useQueryClient();
    
    // Lê do cache do React Query primeiro, depois do store
    const cachedData = queryClient.getQueryData<Configuracao[]>(['configuracoes']);
    const configuracoes = cachedData || store.configuracoes || [];
    const configuracaoAtual = store.configuracaoAtual || (configuracoes.length > 0 ? configuracoes[0] : null);
    
    const { updateConfiguracaoAsync } = useUpdateConfiguracao();
    const { createConfiguracaoAsync } = useCreateConfiguracao();

    const configuracao = configuracaoAtual;

    const atualizarAparencia = async (data: ConfiguracaoAparencia) => {
        if (!configuracao) {
            return await createConfiguracaoAsync(data);
        } else {
            return await updateConfiguracaoAsync({
                id: configuracao.Id,
                data,
            });
        }
    };

    return {
        configuracao,
        isLoading: false, // Não está carregando porque é apenas leitura
        atualizarAparencia,
        dadosAparencia: configuracao ? {
            darkMode: configuracao.darkMode || false,
            idiomaPadrao: configuracao.idiomaPadrao || 'pt-BR',
            idiomasDisponiveis: configuracao.idiomasDisponiveis || '',
            logoUrl: configuracao.logoUrl || '',
            tituloSistema: configuracao.tituloSistema || '',
        } : null,
    };
}

// Hook para atualizar configurações de pagamentos
export function useConfiguracaoPagamentos() {
    const store = useConfiguracoesStore();
    const queryClient = useQueryClient();
    
    // Lê do cache do React Query primeiro, depois do store
    const cachedData = queryClient.getQueryData<Configuracao[]>(['configuracoes']);
    const configuracoes = cachedData || store.configuracoes || [];
    const configuracaoAtual = store.configuracaoAtual || (configuracoes.length > 0 ? configuracoes[0] : null);
    
    const { updateConfiguracaoAsync } = useUpdateConfiguracao();
    const { createConfiguracaoAsync } = useCreateConfiguracao();

    const configuracao = configuracaoAtual;

    const atualizarPagamentos = async (data: ConfiguracaoPagamentos) => {
        const result = !configuracao
            ? await createConfiguracaoAsync(data)
            : await updateConfiguracaoAsync({
                id: configuracao.Id,
                data,
            });
        
        // Invalida o cache para forçar reload
        queryClient.invalidateQueries({ queryKey: ['configuracoes'] });
        
        return result;
    };

    return {
        configuracao,
        isLoading: false, // Não está carregando porque é apenas leitura
        atualizarPagamentos,
        dadosPagamentos: configuracao ? {
            percentualRepasseJuridico: configuracao.percentualRepasseJuridico ?? null,
            percentualRepasseAutonomo: configuracao.percentualRepasseAutonomo ?? null,
            emitirNotaFiscal: configuracao.emitirNotaFiscal ?? false,
        } : null,
    };
}

// Hook para atualizar configurações de comunicação (apenas leitura - não faz requisições)
export function useConfiguracaoComunicacao() {
    const store = useConfiguracoesStore();
    const queryClient = useQueryClient();
    
    // Lê do cache do React Query primeiro, depois do store
    const cachedData = queryClient.getQueryData<Configuracao[]>(['configuracoes']);
    const configuracoes = cachedData || store.configuracoes || [];
    const configuracaoAtual = store.configuracaoAtual || (configuracoes.length > 0 ? configuracoes[0] : null);
    
    const { updateConfiguracaoAsync } = useUpdateConfiguracao();
    const { createConfiguracaoAsync } = useCreateConfiguracao();

    const configuracao = configuracaoAtual;

    const atualizarComunicacao = async (data: ConfiguracaoComunicacao) => {
        if (!configuracao) {
            return await createConfiguracaoAsync(data);
        } else {
            return await updateConfiguracaoAsync({
                id: configuracao.Id,
                data,
            });
        }
    };

    return {
        configuracao,
        isLoading: false, // Não está carregando porque é apenas leitura
        atualizarComunicacao,
        dadosComunicacao: configuracao ? {
            emailHost: configuracao.emailHost || '',
            emailPort: configuracao.emailPort || 587,
            emailUser: configuracao.emailUser || '',
            emailPassword: configuracao.emailPassword || '',
            emailFrom: configuracao.emailFrom || '',
            lembreteAntesConsulta: configuracao.lembreteAntesConsulta || 60,
            enviarNotificacaoSMS: configuracao.enviarNotificacaoSMS || false,
            enviarNotificacaoPush: configuracao.enviarNotificacaoPush || false,
        } : null,
    };
}

// Hook para atualizar configurações de LGPD (apenas leitura - não faz requisições)
export function useConfiguracaoLGPD() {
    const store = useConfiguracoesStore();
    const queryClient = useQueryClient();
    
    // Lê do cache do React Query primeiro, depois do store
    const cachedData = queryClient.getQueryData<Configuracao[]>(['configuracoes']);
    const configuracoes = cachedData || store.configuracoes || [];
    const configuracaoAtual = store.configuracaoAtual || (configuracoes.length > 0 ? configuracoes[0] : null);
    
    const { updateConfiguracaoAsync } = useUpdateConfiguracao();
    const { createConfiguracaoAsync } = useCreateConfiguracao();

    const configuracao = configuracaoAtual;

    const atualizarLGPD = async (data: ConfiguracaoLGPD) => {
        if (!configuracao) {
            return await createConfiguracaoAsync(data);
        } else {
            return await updateConfiguracaoAsync({
                id: configuracao.Id,
                data,
            });
        }
    };

    return {
        configuracao,
        isLoading: false, // Não está carregando porque é apenas leitura
        atualizarLGPD,
        dadosLGPD: configuracao ? {
            politicaPrivacidadeUrl: configuracao.politicaPrivacidadeUrl || '',
            termosUsoUrl: configuracao.termosUsoUrl || '',
            consentimentoGravacao: configuracao.consentimentoGravacao || false,
            tempoRetencaoDadosMeses: configuracao.tempoRetencaoDadosMeses || 24,
            anonimizarDadosInativos: configuracao.anonimizarDadosInativos !== null ? configuracao.anonimizarDadosInativos : true,
        } : null,
    };
}

// Hook para atualizar configurações de segurança (apenas leitura - não faz requisições)
export function useConfiguracaoSeguranca() {
    const store = useConfiguracoesStore();
    const queryClient = useQueryClient();
    
    // Lê do cache do React Query primeiro, depois do store
    const cachedData = queryClient.getQueryData<Configuracao[]>(['configuracoes']);
    const configuracoes = cachedData || store.configuracoes || [];
    const configuracaoAtual = store.configuracaoAtual || (configuracoes.length > 0 ? configuracoes[0] : null);
    
    const { updateConfiguracaoAsync } = useUpdateConfiguracao();
    const { createConfiguracaoAsync } = useCreateConfiguracao();

    const configuracao = configuracaoAtual;

    const atualizarSeguranca = async (data: ConfiguracaoSeguranca) => {
        if (!configuracao) {
            return await createConfiguracaoAsync(data);
        } else {
            return await updateConfiguracaoAsync({
                id: configuracao.Id,
                data,
            });
        }
    };

    return {
        configuracao,
        isLoading: false, // Não está carregando porque é apenas leitura
        atualizarSeguranca,
        dadosSeguranca: configuracao ? {
            tempoExpiracaoSessaoMinutos: configuracao.tempoExpiracaoSessaoMinutos || 60,
            politicaSenhaMinCaracteres: configuracao.politicaSenhaMinCaracteres || 8,
            exigir2FA: configuracao.exigir2FA || false,
            bloqueioTentativasFalhas: configuracao.bloqueioTentativasFalhas || 5,
        } : null,
    };
}


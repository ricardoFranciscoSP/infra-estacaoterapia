'use client';

import { useMemo, useCallback, useEffect } from 'react';
import { useConsultasFuturas } from "@/hooks/consulta";
import { useUserBasic } from '@/hooks/user/userHook';
import { usePainelModals } from '@/hooks/usePainelModals';
import { useCreditoAvulso, useConsultaAvulsa } from '@/hooks/useHook';
import { useGetUserPlano } from '@/hooks/user/userHook';
import { isCadastroCompleto, hasCompradoConsultas, hasPrimeiraConsulta, hasConsultaPromocionalUnico } from '@/utils/painelUtils';
import { joinUserRoom, onProximaConsultaAtualizada, offProximaConsultaAtualizada, onConsultationStatusChanged, offConsultationStatusChanged } from '@/lib/socket';
import { queryClient } from '@/lib/queryClient';

import PainelWelcomeCard from "@/components/PainelWelcomeCard";
import PainelPlanoCard from "@/components/PainelPlanoCard";
import PainelConsultas from "@/components/PainelConsultas";
import CadastroIncompletoModal from "@/components/CadastroIncompletoModal";
import ConsultaAtual from "@/components/ConsultaAtual";
import { PsicologosFavoritos } from "@/components/CardFavoritos";
import OnboardingDashboard from '@/components/OnboardingDashboar';
import AlertaCompletarPerfil from '@/components/AlertaCompletarPerfil';
import DraftAgendamentoModal from '@/components/DraftAgendamentoModal';
import { PainelLoadingSkeleton } from '@/components/PainelLoadingSkeleton';
import { PainelLayout } from '@/components/PainelLayout';
import PainelCardConsultaAvulsa from '@/components/PainelCardConsultaAvulsa';
import PainelCardPromocionalAvulsa from '@/components/PainelCardPromocionalAvulsa';
import { useConsultaAtual, useConsultasAgendadas } from '@/hooks/consulta';
import { ProximaConsulta } from '@/lib/consultas/ProximaConsulta';
import { extrairConsultasArray } from '@/lib/consultas/extrair-consultas-array';
import { useProximaConsulta } from '@/lib/consultas/useProximaConsulta';

/**
 * Página principal do painel do usuário
 * 
 * Exibe:
 * - Onboarding (se não completado)
 * - Alerta de perfil incompleto (se aplicável)
 * - Card de boas-vindas ou próximas consultas
 * - Card de plano
 * - Lista de consultas
 * - Psicólogos favoritos
 * 
 * ⚡ OTIMIZAÇÕES DE PERFORMANCE:
 * - useMemo para cálculos pesados (validações, verificações de compras)
 * - useCallback para funções estáveis (evita re-renders de componentes filhos)
 * - Loading não bloqueante (só aguarda user básico, outros hooks em paralelo)
 * - Renderização condicional otimizada (mostra apenas blocos necessários)
 * - Validações cacheadas (evitam recálculos desnecessários a cada render)
 */
export default function PainelPage() {
    const { user, isLoading: userLoading } = useUserBasic();
    const { plano: planos, isLoading: isPlanosLoading } = useGetUserPlano();
    useConsultasFuturas();
    const { creditoAvulso, isCreditoAvulsoLoading } = useCreditoAvulso();
    const { consultaAvulsa, isConsultaAvulsaLoading } = useConsultaAvulsa();
    const { consultaAtual, refetch: refetchConsultaAtual } = useConsultaAtual();
    const { consultasAgendadas, refetch: refetchConsultasAgendadas } = useConsultasAgendadas();
    
    // const { nextConsulta } = useNextConsulta({
    //     consultasFuturas,
    //     userId: user?.Id,
    //     refetch,
    // });

    // Extrai todas as consultas como array para usar nos novos componentes
    const todasConsultas = useMemo(() => {
        return extrairConsultasArray(consultasAgendadas);
    }, [consultasAgendadas]);

    // Escuta atualizações em tempo real via socket
    useEffect(() => {
        const userId = user?.Id;
        if (!userId) return;

        joinUserRoom(userId);

        const handler = () => {
            // Quando recebe atualização via socket, força refetch
            refetchConsultaAtual();
            refetchConsultasAgendadas();
            
            // Invalida queries relacionadas para atualizar em tempo real
            queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] });
            queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] });
            queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] });
            queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] });
        };

        onProximaConsultaAtualizada(handler);
        return () => {
            offProximaConsultaAtualizada();
        };
    }, [user?.Id, refetchConsultaAtual, refetchConsultasAgendadas]);

    // Escuta mudanças de status de consulta em tempo real
    useEffect(() => {
        const consultaIds = new Set<string>();
        
        if (consultaAtual?.Id) {
            consultaIds.add(consultaAtual.Id);
        }
        if (todasConsultas && todasConsultas.length > 0) {
            todasConsultas.forEach((c) => {
                if (c?.Id) consultaIds.add(c.Id);
            });
        }

        const cleanupFunctions: (() => void)[] = [];

        consultaIds.forEach((consultaId) => {
            const handler = (data: { status: string; consultationId: string }) => {
                if (data.consultationId === consultaId) {
                    console.log(`[Painel] Status da consulta ${consultaId} mudou para ${data.status}`);
                    
                    // Força refetch de todas as queries relacionadas
                    refetchConsultaAtual();
                    refetchConsultasAgendadas();
                    
                    // Invalida queries para atualizar em tempo real
                    queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] });
                    queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] });
                    queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] });
                    queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] });
                    queryClient.invalidateQueries({ queryKey: ['reserva-sessao', consultaId] });
                    queryClient.invalidateQueries({ queryKey: ['consulta', consultaId] });
                }
            };

            onConsultationStatusChanged(handler, consultaId);
            cleanupFunctions.push(() => offConsultationStatusChanged(consultaId));
        });

        return () => {
            cleanupFunctions.forEach(cleanup => cleanup());
        };
    }, [consultaAtual?.Id, todasConsultas, refetchConsultaAtual, refetchConsultasAgendadas]);

    // Obtém a próxima consulta e seu ID para evitar duplicação
    const { proximaConsultaId } = useProximaConsulta(todasConsultas);

    const {
        showModal,
        showDraftModal,
        handleConcluirCadastro,
        handleDraftModalNo,
        handleDraftModalYes,
        setShowModal,
    } = usePainelModals({
        user,
        isOnboard: user?.IsOnboard ?? false,
    });

    // ⚡ OTIMIZAÇÃO: Só aguarda user básico, outros hooks carregam em paralelo
    // Isso permite renderizar a página mais rápido
    const isLoadingUser = userLoading || !user;
    
    // ⚡ MEMOIZAÇÃO: Verificação de plano ATIVO (cacheada) - usa useGetUserPlano para dados corretos
    const temPlano = useMemo(() => {
        // Se ainda está carregando, retorna false para não mostrar welcome card prematuramente
        if (isPlanosLoading) return false;
        
        // Verifica se tem planos ativos (Status: 'Ativo' ou 'AguardandoPagamento')
        if (Array.isArray(planos) && planos.length > 0) {
            return planos.some((p: { Status?: string }) => 
                p.Status === 'Ativo' || p.Status === 'AguardandoPagamento'
            );
        }
        
        return false;
    }, [planos, isPlanosLoading]);
    
    // ⚡ MEMOIZAÇÃO: Verificação de perfil incompleto (cacheada - só recalcula se user mudar)
    const hasIncompleteProfile = useMemo(() => {
        if (!user) return false;
        return !isCadastroCompleto(user);
    }, [user]);
    
    // ⚡ MEMOIZAÇÃO: Verificação de compras financeiras (primeira consulta ou consultas avulsas via Financeiro)
    const hasCompradoFinanceiro = useMemo(() => {
        // Se ainda está carregando user, retorna false
        if (userLoading || !user) return false;
        
        // Verifica se tem primeira consulta ou consultas avulsas compradas via FinanceiroEntries
        return hasCompradoConsultas(user);
    }, [userLoading, user]);
    
    // ⚡ MEMOIZAÇÃO: Verifica crédito avulso válido (cacheada)
    const hasCompradoCreditoAvulso = useMemo(() => {
        if (isCreditoAvulsoLoading || !Array.isArray(creditoAvulso) || creditoAvulso.length === 0) {
            return false;
        }
        return creditoAvulso.some((c: { Status?: string; Quantidade?: number }) => 
            (c.Status === 'Ativo' || c.Status === 'Ativa') && (c.Quantidade ?? 0) > 0
        );
    }, [isCreditoAvulsoLoading, creditoAvulso]);
    
    // ⚡ MEMOIZAÇÃO: Verifica consulta avulsa válida (cacheada)
    const hasCompradoConsultaAvulsa = useMemo(() => {
        if (isConsultaAvulsaLoading || !Array.isArray(consultaAvulsa) || consultaAvulsa.length === 0) {
            return false;
        }
        return consultaAvulsa.some((c: { Status?: string; Quantidade?: number }) => 
            (c.Status === 'Ativa' || c.Status === 'Ativo') && (c.Quantidade ?? 0) > 0
        );
    }, [isConsultaAvulsaLoading, consultaAvulsa]);
    
    // ⚡ MEMOIZAÇÃO: Consolidado de compras (cacheado)
    const hasComprado = useMemo(() => {
        return hasCompradoFinanceiro || hasCompradoCreditoAvulso || hasCompradoConsultaAvulsa;
    }, [hasCompradoFinanceiro, hasCompradoCreditoAvulso, hasCompradoConsultaAvulsa]);
    
    // ⚡ MEMOIZAÇÃO: Deve mostrar welcome card APENAS se nunca comprou plano OU consultas avulsas
    // Mostra welcome card se:
    // - NÃO tem plano ativo E
    // - NÃO tem crédito avulso válido E
    // - NÃO tem consulta avulsa válida E
    // - NÃO tem primeira consulta ou consultas avulsas via Financeiro
    const deveMostrarWelcomeCard = useMemo(() => {
        // Se ainda está carregando dados, não mostra welcome card (evita flash)
        if (isPlanosLoading || isCreditoAvulsoLoading || isConsultaAvulsaLoading || userLoading) {
            return false;
        }
        
        // Só mostra welcome card se NÃO tem nenhuma compra válida
        return !temPlano && !hasComprado;
    }, [temPlano, hasComprado, isPlanosLoading, isCreditoAvulsoLoading, isConsultaAvulsaLoading, userLoading]);
    
    // ⚡ MEMOIZAÇÃO: Verifica se deve mostrar o card promocional
    // SIMPLIFICADO: Mostra quando NÃO está mostrando welcome card
    // Ou seja, mostra se tem plano ativo OU consultas avulsas OU primeira consulta OU qualquer compra
    const deveMostrarCardPromocional = useMemo(() => {
        // Se ainda está carregando dados críticos, aguarda um pouco
        if (isPlanosLoading || userLoading || isCreditoAvulsoLoading || isConsultaAvulsaLoading) {
            // Mas se já tem dados de plano ou consultas, pode mostrar mesmo carregando
            const temDadosBasicos = (Array.isArray(planos) && planos.length > 0) || hasCompradoConsultaAvulsa || hasCompradoCreditoAvulso;
            if (!temDadosBasicos) {
                return false;
            }
        }
        
        // Lógica simplificada: mostra se NÃO está mostrando welcome card
        // Basicamente: tem plano OU tem consultas avulsas OU comprou primeira consulta/unico
        const resultado = !deveMostrarWelcomeCard;
        
        // Logs detalhados para debug
        console.log('[Painel] 🔍 Verificando card promocional:', {
            resultado,
            deveMostrarWelcomeCard,
            temPlano,
            hasComprado,
            hasCompradoConsultaAvulsa,
            hasCompradoCreditoAvulso,
            quantidadePlanos: Array.isArray(planos) ? planos.length : 0,
            tiposPlanos: Array.isArray(planos) ? planos.map((p: { PlanoAssinatura?: { Tipo?: string }; Status?: string }) => ({
                tipo: p.PlanoAssinatura?.Tipo,
                status: p.Status
            })) : [],
            temPrimeiraConsulta: user ? hasPrimeiraConsulta(user) : false,
            temUnico: user ? hasConsultaPromocionalUnico(user) : false,
            isPlanosLoading,
            userLoading
        });
        
        if (resultado) {
            console.log('[Painel] ✅ Deve mostrar card promocional');
        } else {
            console.log('[Painel] ❌ NÃO deve mostrar card promocional');
        }
        
        return resultado;
    }, [
        deveMostrarWelcomeCard, 
        temPlano, 
        hasComprado, 
        hasCompradoConsultaAvulsa, 
        hasCompradoCreditoAvulso,
        planos,
        user,
        isPlanosLoading,
        userLoading,
        isCreditoAvulsoLoading,
        isConsultaAvulsaLoading
    ]);
    
    // ⚡ CALLBACK: Função estável para fechar modal
    const handleCloseModal = useCallback(() => {
        setShowModal(false);
    }, [setShowModal]);
    // ⚡ Loading apenas para user básico - outros blocos renderizam conforme dados disponíveis
    if (isLoadingUser) {
        return <PainelLoadingSkeleton />;
    }

    return (
        <>
            {user?.IsOnboard && (
                <CadastroIncompletoModal 
                    open={showModal} 
                    onClose={handleCloseModal}
                    onSubmit={handleConcluirCadastro}
                />
            )}

            <DraftAgendamentoModal
                open={showDraftModal}
                onClose={handleDraftModalNo}
                onConfirm={handleDraftModalYes}
            />

            <main className="flex flex-col items-start w-full px-2 sm:px-4 md:px-8 py-6 md:py-8 gap-6 md:gap-8">
                <div className="w-full max-w-7xl mx-auto px-2">
                    {hasIncompleteProfile && (
                        <AlertaCompletarPerfil className="px-6" />
                    )}

                    {user && !user.IsOnboard && <OnboardingDashboard />}

                    <div className="flex flex-col-reverse md:flex-row w-full gap-6 md:gap-8 items-start justify-start">
                        <div className="w-full md:flex-1 order-2 md:order-1 flex flex-col items-start justify-start p-4">
                            {/* ⚡ Lógica otimizada: Renderiza apenas o necessário */}
                            <div className="w-full md:px-0 flex flex-col gap-4">
                                {/* ⚡ Mostra welcome card apenas se não tem nenhuma compra */}
                                {deveMostrarWelcomeCard && (
                                    <div className="md:px-0">
                                        <PainelWelcomeCard />
                                    </div>
                                )}
                                
                                {/* ⚡ Mostra card promocional ACIMA da próxima consulta quando não está mostrando welcome card */}
                                {/* Deve aparecer sempre que tem plano ativo OU consultas avulsas */}
                                {!deveMostrarWelcomeCard && deveMostrarCardPromocional && (
                                    <div>
                                        <PainelCardPromocionalAvulsa />
                                    </div>
                                )}
                                
                                {/* ⚡ Mostra conteúdo de consultas apenas se não estiver mostrando welcome card */}
                                {!deveMostrarWelcomeCard && (
                                    <>
                                        {/* ⚡ Mostra ConsultaAtual se houver consulta em andamento, senão mostra Próxima Consulta */}
                                        {consultaAtual ? (
                                            <ConsultaAtual consulta={consultaAtual} />
                                        ) : (
                                            <div>
                                                <h3 className="fira-sans font-semibold text-2xl leading-[40px] tracking-normal align-middle text-[#49525A] mb-4">
                                                    Próxima consulta
                                                </h3>
                                                <ProximaConsulta consultas={todasConsultas} />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div 
                            id="plano-card"
                            className="w-full md:w-[384px] flex-shrink-0 order-1 md:order-2 flex flex-col items-start justify-start gap-4 p-4 md:px-0"
                        >
                            <PainelPlanoCard />
                            <PainelCardConsultaAvulsa />
                        </div>
                    </div>

                    <PainelLayout className="p-4 md:px-0" id="proxima-consulta">
                            <PainelConsultas consultaExcluirId={proximaConsultaId} />
                    </PainelLayout>

                    <PainelLayout id="favoritos">
                        <PsicologosFavoritos />
                    </PainelLayout>
                </div>
            </main>
        </>
    );
}

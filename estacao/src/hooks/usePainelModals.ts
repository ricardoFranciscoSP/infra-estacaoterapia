import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isCadastroCompleto, getDraftIdFromStorage, removeDraftIdFromStorage } from '@/utils/painelUtils';
import { User } from '@/hooks/user/userHook';

const CADASTRO_INCOMPLETO_DELAY_MS = 10000;

interface UsePainelModalsProps {
    user: User | undefined;
    isOnboard: boolean;
}

interface UsePainelModalsReturn {
    showModal: boolean;
    showDraftModal: boolean;
    handleConcluirCadastro: () => void;
    handleDraftModalNo: () => void;
    handleDraftModalYes: () => void;
    setShowModal: (show: boolean) => void;
    setShowDraftModal: (show: boolean) => void;
}

/**
 * Hook customizado para gerenciar os modais do painel
 * - Modal de cadastro incompleto
 * - Modal de draft de agendamento
 */
export function usePainelModals({ user, isOnboard }: UsePainelModalsProps): UsePainelModalsReturn {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [wasOnboarding, setWasOnboarding] = useState<boolean | undefined>(undefined);

    // Modal de cadastro incompleto - só mostra se não tiver draftId
    useEffect(() => {
        if (!user || !isOnboard) return;

        const draftId = getDraftIdFromStorage();
        
        // Se tiver draftId, não mostra o modal de cadastro incompleto
        if (draftId) {
            setShowModal(false);
            return;
        }
        
        // Verifica se o cadastro está incompleto
        if (!isCadastroCompleto(user)) {
            const timer = setTimeout(() => setShowModal(true), CADASTRO_INCOMPLETO_DELAY_MS);
            return () => clearTimeout(timer);
        } else {
            setShowModal(false);
        }
    }, [user, isOnboard]);

    // Exibe o DraftAgendamentoModal somente se houver draftId no localStorage ao concluir o onboarding
    useEffect(() => {
        if (!user) return;

        const isOnboardNow = isOnboard;
        const wasOnboardBefore = wasOnboarding;

        // Se o onboarding acabou de ser completado (transição de false para true)
        const onboardingJustCompleted = isOnboardNow && wasOnboardBefore === false;
        // Se é a primeira vez que o usuário é carregado e já está com onboarding completo
        const isFirstLoadWithOnboardComplete = isOnboardNow && wasOnboardBefore === undefined;

        if (isOnboardNow && (onboardingJustCompleted || isFirstLoadWithOnboardComplete)) {
            const draftId = getDraftIdFromStorage();
            if (draftId) {
                setShowDraftModal(true);
                setShowModal(false);
            }
        }

        // Atualiza o estado anterior do onboarding
        if (wasOnboarding !== isOnboardNow) {
            setWasOnboarding(isOnboardNow);
        }
    }, [user, isOnboard, wasOnboarding]);

    const handleConcluirCadastro = useCallback(() => {
        setShowModal(false);
        router.push('/painel/minha-conta/dados-pessoais');
    }, [router]);

    const handleDraftModalNo = useCallback(() => {
        removeDraftIdFromStorage();
        setShowDraftModal(false);
    }, []);

    const handleDraftModalYes = useCallback(() => {
        setShowDraftModal(false);
        router.push('/painel/planos');
    }, [router]);

    return {
        showModal,
        showDraftModal,
        handleConcluirCadastro,
        handleDraftModalNo,
        handleDraftModalYes,
        setShowModal,
        setShowDraftModal,
    };
}


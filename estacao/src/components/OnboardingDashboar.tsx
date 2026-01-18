'use client';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useRouter } from 'next/navigation';
import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useUpdateIsOnboardingComplete } from '@/hooks/user/userHook';
import { useAuthStore } from '@/store/authStore';
import Image from "next/image";

interface Step {
  title: string;
  description: string;
  selector: string;
}

interface Position {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

const CARD_WIDTH = 384;
const CARD_HEIGHT = 96;
const MOBILE_CARD_WIDTH = 300;
const MOBILE_CARD_HEIGHT = 96;
const MARGIN = 24;

// Dimensões específicas para o card sessao
const SESSAO_CARD_HEIGHT = 112;


const allSteps: Step[] = [
  {
    title: 'Agendamento rápido',
    description: `Esse é o botão de "Agendamento rápido". Aqui você poderá escolher o melhor dia e horário para sua sessão e localizar os profissionais disponíveis para o período escolhido. Ao finalizar o agendamento, sua primeira sessão será gerada após o pagamento efetuado.`,
    selector: '#agendamento-rapido',
  },
  {
    title: 'Primeira sessão',
    description: `Você poderá comprar diretamente sua primeira sessão para experimentar a plataforma clicando no botão comprar consulta.`,
    selector: '#consulta-card',
  },
  {
    title: 'Minhas consultas',
    description: `Todas as suas consultas recentes, agendadas e realizadas aparecerão na sessão de minhas consultas.`,
    selector: '#proxima-consulta',
  },
  {
    title: 'Psicólogos favoritos',
    description: `Caso você goste de algum psicólogo(a) e deseje salvar para encontrar de forma prática e rápida, poderá favoritá-lo(a) e acessar aqui em "Psicólogos favoritos".`,
    selector: '#favoritos',
  },
  {
    title: 'Notificações',
    description: `Você poderá ver as notificações diretamente por aqui e acessar as configurações da sua conta através do perfil.`,
    selector: '#notificacao',
  },
  {
    title: 'Planos disponíveis',
    description: `Após realizar sua primeira sessão, liberaremos para você nossos planos e você poderá contratar o que mais atende às suas necessidades.`,
    selector: '#sessao',
  },
];

export default function OnboardingDashboard() {
  const user = useAuthStore((s) => s.user);
  
  // Filtra steps baseado no role do usuário
  const steps = useMemo(() => {
    // Se o usuário for psicólogo, remove o step "Psicólogos favoritos"
    if (user?.Role === "Psychologist") {
      return allSteps.filter(step => step.title !== 'Psicólogos favoritos');
    }
    return allSteps;
  }, [user?.Role]);
  const { mutate: updateUser, isPending } = useUpdateIsOnboardingComplete();
  const { step, nextStep, prevStep, reset } = useOnboardingStore();
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardPosition, setCardPosition] = useState<Position>({ top: 0, left: 0, placement: 'top' });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [finishRequested, setFinishRequested] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  // Detecta se é tela mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const safeStep = Math.min(Math.max(step, 0), steps.length - 1);
  const cardWidth = isMobile ? MOBILE_CARD_WIDTH : CARD_WIDTH;
  const cardHeight = isMobile ? MOBILE_CARD_HEIGHT : (safeStep === 5 ? SESSAO_CARD_HEIGHT : CARD_HEIGHT);

  useEffect(() => {
    if (step !== safeStep) {
      reset();
    }
  }, [reset, safeStep, step]);

  // Refatorado: handleFinish como função normal
  function handleFinish() {
    if (!isPending && !finishRequested) {
      setFinishRequested(true);
      updateUser(
        { isComplete: true },
        {
          onSuccess: () => {
            setFinishRequested(false);
            setShowOnboarding(false); // Esconde o onboarding ao finalizar
            router.refresh?.();
          },
          onError: () => {
            setFinishRequested(false);
          }
        }
      );
    }
  }

  const updatePositions = useCallback(() => {

    // NOVA LÓGICA: sempre usar proporções baseadas em 1366x768 para todos os tamanhos de tela
    const calculateCardPosition = (): Position => {
      const selectors = steps[safeStep].selector.split(', ');
      let element = null;
      for (const selector of selectors) {
        element = document.querySelector(selector.trim());
        if (element) break;
      }
      // Padronizar windowWidth e windowHeight para todo o escopo
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      if (!element) {
        // fallback centralizado
        return {
          top: (windowHeight / 2) - (cardHeight / 2),
          left: (windowWidth / 2) - (cardWidth / 2),
          placement: 'bottom',
        };
      }
      const rect = element.getBoundingClientRect();
      let top = 0;
      let left = 0;
      let placement: Position['placement'] = 'bottom';

      // Todos os steps usam proporções baseadas em 1366x768
      const currentStepTitle = steps[safeStep]?.title;
      switch (currentStepTitle) {
        case 'Agendamento rápido':
          // Mobile: 100px acima do ícone e move um pouco para direita
          if (isMobile) {
            top = rect.top - cardHeight - 135;
            left = rect.left + 45;
          } else {
            top = rect.top - cardHeight - 100;
            left = rect.left + (rect.width / 2) - (cardWidth / 2) + 75;
          }
          placement = 'top';
          break;
        case 'Primeira sessão':
          // Alinha o card ao final (lado direito) do botão, logo abaixo, e move 300px para a direita
          top = rect.bottom + 16; // 16px abaixo do botão
          left = rect.right - cardWidth + 350; // move 350px para a direita
          placement = 'bottom';
          break;
        case 'Minhas consultas':
          // Mobile: card acima do elemento, centralizado em relação ao elemento
          const proximaConsulta = document.querySelector('#proxima-consulta');
          if (proximaConsulta) {
            const proximaRect = proximaConsulta.getBoundingClientRect();
            if (isMobile) {
              // Centraliza o card acima do elemento, com margem de 75px
              top = proximaRect.top - cardHeight - 75;
              left = proximaRect.left + (proximaRect.width / 2) - (cardWidth / 2);
              placement = 'bottom';
            } else {
              // Desktop: 300px abaixo do elemento, alinhado à direita do box central de 1300px
              const maxWidth2 = 1300;
              const boxLeft2 = (windowWidth - maxWidth2) / 2 > 0 ? (windowWidth - maxWidth2) / 2 : 0;
              const boxRight2 = boxLeft2 + maxWidth2;
              let left = boxRight2 - cardWidth - 20;
              if (left < boxLeft2) left = boxLeft2 + 24; // margem mínima
              top = proximaRect.bottom + 25;
              placement = 'top';
              return { top, left, placement };
            }
            return { top, left, placement };
          } else {
            // fallback centralizado
            top = (windowHeight / 2) - (cardHeight / 2);
            left = (windowWidth / 2) - (cardWidth / 2);
            placement = 'top';
            return { top, left, placement };
          }
          break;
        case 'Psicólogos favoritos':
          if (isMobile) {
            // Mobile: card acima do favoritos, alinhado à esquerda da div
            const favoritos = document.querySelector('#favoritos');
            if (favoritos) {
              const favRect = favoritos.getBoundingClientRect();
              top = favRect.top - cardHeight - 80;
              left = favRect.left;
              placement = 'bottom';
            } else {
              // fallback centralizado
              top = (windowHeight / 2) - (cardHeight / 2);
              left = (windowWidth / 2) - (cardWidth / 2);
              placement = 'bottom';
            }
          } else {
            // Desktop: 40px abaixo do elemento favoritos e alinhado à esquerda da div
            const favoritos = document.querySelector('#favoritos');
            if (favoritos) {
              const favRect = favoritos.getBoundingClientRect();
              top = favRect.bottom + 40;
              left = favRect.left;
              placement = 'top';
            } else {
              // fallback centralizado
              top = (windowHeight / 2) - (cardHeight / 2);
              left = (windowWidth / 2) - (cardWidth / 2);
              placement = 'top';
            }
          }
          break;
        case 'Notificações':
          // Mobile: card mais próximo do sino
          const notificacao = document.querySelector('#notificacao');
          const maxWidth = 1300;
          const boxLeft = (windowWidth - maxWidth) / 2 > 0 ? (windowWidth - maxWidth) / 2 : 0;
          const boxRight = boxLeft + maxWidth;
          if (notificacao) {
            const notifRect = notificacao.getBoundingClientRect();
            if (isMobile) {
              top = notifRect.bottom + 24;
              left = notifRect.left + (notifRect.width / 2) - (cardWidth / 2);
              placement = 'top';
            } else {
              top = notifRect.bottom + 100;
              left = boxRight - cardWidth - 25;
              placement = 'top';
            }
          } else {
            // fallback centralizado
            top = (window.innerHeight / 2) - (cardHeight / 2);
            left = (windowWidth / 2) - (cardWidth / 2);
            placement = 'top';
          }
          break;
        case 'Planos disponíveis':
          top = rect.bottom + MARGIN;
          left = rect.left + (rect.width / 2) - (cardWidth / 2);
          placement = 'bottom';
          break;
        default:
          // fallback centralizado
          top = (windowHeight / 2) - (cardHeight / 2);
          left = (windowWidth / 2) - (cardWidth / 2);
          placement = 'bottom';
      }

      // Ajuste para manter na viewport
      const minMargin = Math.max(MARGIN, windowWidth * 0.02);
      const minTopMargin = Math.max(MARGIN, windowHeight * 0.02);
      if (left < minMargin) left = minMargin;
      if (left + cardWidth > windowWidth - minMargin) left = windowWidth - cardWidth - minMargin;
      if (top < minTopMargin) top = minTopMargin;
      if (top + cardHeight > windowHeight - minTopMargin) top = windowHeight - cardHeight - minTopMargin;
      return { top, left, placement };
    };

    const position = calculateCardPosition();
    setCardPosition(position);
    setIsVisible(true);

    // Para o step "Notificações", busca qualquer elemento com id="notificacao"
    if (steps[safeStep]?.title === 'Notificações') {
      // Busca todos os elementos com id="notificacao" e pega o primeiro visível
      const notificationElements = document.querySelectorAll('#notificacao');
      let notificationElement = null;
      
      for (const element of notificationElements) {
        const rect = element.getBoundingClientRect();
        // Verifica se o elemento está visível na tela
        if (rect.width > 0 && rect.height > 0) {
          notificationElement = element;
          break;
        }
      }
      
      if (notificationElement) {
        const rect = notificationElement.getBoundingClientRect();
        setHighlightRect(rect);
        return;
      }
    }

    const selectors = steps[safeStep].selector.split(', ');
    let element = null;
    
    for (const selector of selectors) {
      element = document.querySelector(selector.trim());
      if (element) break;
    }
    
    if (element) {
      const rect = element.getBoundingClientRect();
      setHighlightRect(rect);
    }
  }, [safeStep, cardWidth, cardHeight, isMobile, steps]);

  const getHighlightStyle = (): React.CSSProperties => {
    if (!highlightRect) return { display: 'none' };
    return {
      position: 'fixed',
      top: highlightRect.top - 8,
      left: highlightRect.left - 8,
      width: highlightRect.width + 16,
      height: highlightRect.height + 16,
      borderRadius: '12px',
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
      border: '2px solid #fff',
      zIndex: 50,
      pointerEvents: 'auto',
    };
  };

  // Scroll para o elemento e atualiza posições quando o passo muda
  useEffect(() => {
    setIsVisible(false);
    // Foco e scroll suave para o card em todos os steps
    setTimeout(() => {
      if (cardRef.current) {
        // Para o step "Psicólogos favoritos" no mobile, rola para o final da página para garantir visibilidade
        if (steps[safeStep]?.title === 'Psicólogos favoritos' && isMobile) {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        } else {
          cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      } else {
        // fallback: scroll para o elemento do step
        const selectors = steps[safeStep].selector.split(', ');
        let element = null;
        for (const selector of selectors) {
          element = document.querySelector(selector.trim());
          if (element) break;
        }
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }
    }, 100);
    // Aguarda o scroll terminar e atualiza posição
    const timer = setTimeout(() => {
      updatePositions();
    }, 600);
    return () => clearTimeout(timer);
  }, [safeStep, cardWidth, cardHeight, updatePositions, isMobile, steps]);

  // Atualiza ao redimensionar ou rolar
  useLayoutEffect(() => {
    const handle = () => updatePositions();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);

    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [safeStep, updatePositions]);

  return (
    showOnboarding && (
      <div className="fixed inset-0 z-[9999] pointer-events-none">
        {/* Overlay semi-transparente */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />

        {/* Destaque do elemento */}
        <div style={getHighlightStyle()} />

        {/* Card flutuante */}
        {isVisible && (
          <div
            ref={cardRef}
            style={{
              position: 'fixed',
              top: cardPosition.top,
              left: cardPosition.left,
              maxWidth: cardWidth,
              width: cardWidth,
              minHeight: cardHeight,
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              padding: '20px 32px',
              zIndex: 2147483647, // z-index bem alto para garantir visibilidade
              pointerEvents: 'auto',
              opacity: isVisible ? 1 : 0,
              transition: 'opacity 0.6s cubic-bezier(0.4,0,0.2,1), top 0.6s cubic-bezier(0.4,0,0.2,1), left 0.6s cubic-bezier(0.4,0,0.2,1)',
              display: 'block',
              visibility: isVisible ? 'visible' : 'hidden',
            }}
          >
            {safeStep === 0 ? (
              <FirstStepContent
                text={steps[safeStep].description}
                onNext={nextStep}
                onClose={handleFinish}
                isLoading={isPending || finishRequested}
              />
            ) : (
              <DefaultStepContent
                text={steps[safeStep].description}
                onNext={nextStep}
                onPrevious={prevStep}
                onClose={handleFinish}
                isLoading={isPending || finishRequested}
                currentStep={safeStep}
                totalSteps={steps.length}
              />
            )}
          </div>
        )}
      </div>
    )
  );
}

// --- Componentes de conteúdo unificado ---

interface StepContentProps {
  text: string;
  onNext: () => void;
  onPrevious?: () => void;
  onClose: () => void;
  isLoading?: boolean;
  isFirst?: boolean;
  currentStep?: number;
  totalSteps?: number;
}

const FirstStepContent: React.FC<StepContentProps & { isLoading?: boolean }> = ({
  text,
  onNext,
  onClose,
  isLoading = false,
}) => {
  const [firstLine, ...rest] = text.split('\n\n');
  const fullText = rest.join('\n\n');
  return (
    <>
      <div className="mb-6">
        <p className="fira-sans font-medium text-xs leading-4 text-[#212529] align-middle">
          {firstLine}
        </p>
        {fullText && (
          <p className="fira-sans font-medium text-xs leading-4 text-[#212529] mt-2 align-middle">
            {fullText}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            console.log('Botão Fechar onboarding clicado');
            if (!isLoading && typeof onClose === 'function') {
              onClose();
            }
          }}
          className="flex items-center gap-2 border border-[#B30000] rounded px-3 h-8 text-xs fira-sans font-medium text-[#B30000] cursor-pointer disabled:opacity-60"
          disabled={isLoading}
        >
          <Image src="/assets/icons/cross.svg" alt="Fechar" width={16} height={16} />
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin mr-1 h-4 w-4 text-[#B30000]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#B30000" strokeWidth="4"></circle>
                <path className="opacity-75" fill="#B30000" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              Fechando...
            </span>
          ) : (
            <>Fechar onboarding</>
          )}
        </button>
        <button
          onClick={onNext}
          className="rounded px-3 h-8 bg-[#444D9D] text-white fira-sans font-medium text-xs cursor-pointer"
        >
          Próximo
        </button>
      </div>
    </>
  );
};

const DefaultStepContent: React.FC<StepContentProps & { isLoading?: boolean }> = ({
  text,
  onNext,
  onPrevious,
  onClose,
  isLoading = false,
  currentStep = 0,
  totalSteps = 0,
}) => {
  const isLastStep = currentStep === totalSteps - 1;
  return (
    <>
      <p className="mb-6 fira-sans font-medium text-xs leading-4 text-[#212529] align-middle">
        {text}
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onPrevious}
          disabled={currentStep === 0}
          className="rounded px-3 h-8 bg-[#6c757d] disabled:bg-gray-400 text-white fira-sans font-medium text-xs cursor-pointer disabled:cursor-not-allowed"
        >
          Voltar
        </button>
        {isLastStep ? (
          <button
            onClick={() => {
              console.log('Botão Concluir clicado');
              if (!isLoading && typeof onClose === 'function') {
                onClose();
              }
            }}
            className="rounded px-3 h-8 bg-[#444D9D] text-white fira-sans font-medium text-xs cursor-pointer disabled:opacity-60"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin mr-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                Concluindo...
              </span>
            ) : (
              <>Concluir</>
            )}
          </button>
        ) : (
          <button
            onClick={onNext}
            className="rounded px-3 h-8 bg-[#444D9D] text-white fira-sans font-medium text-xs cursor-pointer"
          >
            Próximo
          </button>
        )}
      </div>
    </>
  );
};
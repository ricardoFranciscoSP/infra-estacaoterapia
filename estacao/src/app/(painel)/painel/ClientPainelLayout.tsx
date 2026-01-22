// components/ClientPainelLayout.tsx
"use client";
import React, { Suspense } from 'react';
import { useUserBasic } from '@/hooks/user/userHook';
import dynamic from 'next/dynamic';
import PainelHeaderSkeleton from '@/components/PainelHeaderSkeleton';
import { PainelLoadingSkeleton } from '@/components/PainelLoadingSkeleton';
import PainelFooter from '@/components/PainelFooter';
import { CustomToastProvider } from '@/components/CustomToastProvider';
import { useNotificacoes } from '@/store/useNotificacoes';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { SocketProvider } from '@/components/SocketProvider';
import LoggedErrorBoundary from '@/components/LoggedErrorBoundary';
import { useClearFiltersOnNavigation } from '@/hooks/useClearFiltersOnNavigation';
import WhatsAppFloatingButton from '@/components/WhatsAppFloatingButton';
import { useRouter } from 'next/navigation';
import { getRedirectRouteByRole } from '@/utils/redirectByRole';

// ⚡ OTIMIZAÇÃO: Dynamic import do PainelHeader com loading skeleton
const PainelHeader = dynamic(() => import('@/components/PainelHeader'), {
  loading: () => <PainelHeaderSkeleton isPainelPsicologo={false} />,
  ssr: true, // Mantém SSR para SEO e primeira renderização
});

const ClientPainelLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Protege o painel para apenas pacientes
  useProtectedRoute("Patient");
  
  // Limpa filtros de psicólogo ao navegar para outras páginas
  useClearFiltersOnNavigation();

  const { user } = useUserBasic();
  const { fetchNotificacoes } = useNotificacoes();
  const router = useRouter();

  // Evita erro de hidratação: renderiza elementos "client-only" apenas após montar
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (user?.Id) {
      fetchNotificacoes();
    }
  }, [user?.Id, fetchNotificacoes]);

  // Redireciona Psychologist para o painel dele automaticamente
  React.useEffect(() => {
    if (user && user.Role === "Psychologist") {
      // Converte o tipo User do hook para o tipo User do authStore
      // Usa cast duplo (unknown) para evitar erro de tipagem
      const authUser = user as unknown as import('@/store/authStore').User;
      const redirectRoute = getRedirectRouteByRole(authUser);
      if (redirectRoute) {
        router.replace(redirectRoute);
        return;
      }
    }
    
    // Bloqueia Finance de acessar painel de paciente
    if (user && user.Role === "Finance") {
      window.location.href = "/no-permission";
    }
  }, [user, router]);

  return (
    <LoggedErrorBoundary>
      <SocketProvider userId={user?.Id}>
        <div className="flex flex-col min-h-screen">
          <Suspense fallback={<PainelHeaderSkeleton isPainelPsicologo={false} />}>
            <PainelHeader user={user} />
          </Suspense>
          <div className="flex-1 pb-20 md:pb-0">
            <Suspense fallback={<PainelLoadingSkeleton />}>
              {children}
            </Suspense>
          </div>
          <CustomToastProvider />
          {/* Botão flutuante do WhatsApp - renderizado apenas após hidratação */}
          {mounted && (
            <WhatsAppFloatingButton 
              phoneNumber="5511960892131"
              message="Olá, preciso de suporte na Estação Terapia."
              position="bottom-right"
            />
          )}
        </div>
      </SocketProvider>
    </LoggedErrorBoundary>
  );
};

export default ClientPainelLayout;
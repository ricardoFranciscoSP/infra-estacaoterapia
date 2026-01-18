"use client";
import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CustomToastProvider } from "@/components/CustomToastProvider";
import PainelFooter from "@/components/PainelFooter";
import dynamic from 'next/dynamic';
import PainelHeaderSkeleton from '@/components/PainelHeaderSkeleton';
import { PainelLoadingSkeleton } from '@/components/PainelLoadingSkeleton';
import { useAuthStore } from "@/store/authStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUserBasic } from "@/hooks/user/userHook";
import { UserProvider } from "@/contexts/UserContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { SocketProvider } from "@/components/SocketProvider";
import { useNotificacoes } from "@/store/useNotificacoes";
import toast from "react-hot-toast";
import LoggedErrorBoundary from "@/components/LoggedErrorBoundary";

// ⚡ OTIMIZAÇÃO: Dynamic import do PainelHeader com loading skeleton
const PainelHeader = dynamic(() => import('@/components/PainelHeader'), {
  loading: () => <PainelHeaderSkeleton isPainelPsicologo={true} />,
  ssr: true, // Mantém SSR para SEO e primeira renderização
});

// QueryClient fora do componente para evitar reinstanciação
const queryClient = new QueryClient();

// Componente de loading otimizado
const LoadingFallback: React.FC = () => (
  <div className="fixed inset-0 z-[1000] bg-white/80 flex flex-col items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8494E9]"></div>
  </div>
);

// Componente interno que precisa do user
const ClientPainelContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isLoadingUser } = useUserBasic();
  const router = useRouter();
  const pathname = usePathname();
  const { fetchNotificacoes } = useNotificacoes();
  const [showToastProvider, setShowToastProvider] = useState<boolean>(false);

  // Busca notificações quando o usuário estiver disponível
  useEffect(() => {
    if (user?.Id) {
      fetchNotificacoes();
    }
  }, [user?.Id, fetchNotificacoes]);

  // Memoiza as flags de rota
  const { isCadastroEmAnalise, isCadastro } = useMemo(
    () => ({
      isCadastroEmAnalise: pathname?.includes("/cadastro-em-analise") ?? false,
      isCadastro: pathname?.includes("/cadastro") ?? false,
    }),
    [pathname]
  );

  // Ativa o ToastProvider apenas uma vez
  useEffect(() => {
    setShowToastProvider(true);
  }, []);

  // Valida permissão de acesso conforme o status do usuário
  useEffect(() => {
    // Aguarda o carregamento completo do usuário antes de verificar
    if (isLoadingUser || !user) return;
    
    // Verifica se é psicólogo
    const isPsychologist = user.Role === "Psychologist";
    
    if (!isPsychologist) return; // Se não for psicólogo, não faz nada aqui
    
    // Normaliza o status para comparação (remove espaços e normaliza acentos)
    const normalizeStatus = (status: string | undefined): string => {
      if (!status) return '';
      return status
        .replace(/\s/g, '') // Remove espaços
        .replace(/[áàâãéêíóôõúüç]/gi, (match) => {
          const map: Record<string, string> = {
            'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a',
            'é': 'e', 'ê': 'e',
            'í': 'i',
            'ó': 'o', 'ô': 'o', 'õ': 'o',
            'ú': 'u', 'ü': 'u',
            'ç': 'c'
          };
          return map[match.toLowerCase()] || match;
        })
        .toLowerCase();
    };
    
    const userStatusNormalized = normalizeStatus(user.Status);
    const isAtivo = userStatusNormalized === "ativo";
    const isBloqueado = userStatusNormalized === "bloqueado";
    const isInativo = userStatusNormalized === "inativo";
    
    console.log('[ClientPainelLayout] Verificando acesso psicólogo:', {
      role: user.Role,
      status: user.Status,
      statusNormalized: userStatusNormalized,
      isAtivo: isAtivo,
      isBloqueado: isBloqueado,
      isInativo: isInativo,
      pathname: pathname,
      isCadastroEmAnalise: isCadastroEmAnalise
    });
    
    // Status de bloqueio ou inativo: faz logout e redireciona
    if (isBloqueado || isInativo) {
      console.log('[ClientPainelLayout] Status bloqueado ou inativo, fazendo logout');
      toast.error(`Sua conta foi ${isBloqueado ? 'bloqueada' : 'desativada'}`);
      const { logout } = useAuthStore.getState();
      logout().then(() => {
        router.push("/login");
      }).catch(() => {
        router.push("/login");
      });
      return;
    }
    
    // Se for psicólogo ativo, permite acesso a todas as rotas (EXCETO a página de cadastro-em-analise)
    // Se tentar acessar cadastro-em-analise enquanto ativo, é permitido mas apenas nessa página
    if (isAtivo) {
      console.log('[ClientPainelLayout] Psicólogo ativo, acesso permitido a todas as rotas');
      return;
    }
    
    // Se não for ativo, bloqueado ou inativo = é emanalise ou similar
    // Permite acesso APENAS à página de cadastro-em-analise
    // Se estiver tentando acessar outra rota, redireciona para cadastro-em-analise
    if (!isCadastroEmAnalise) {
      console.log('[ClientPainelLayout] Psicólogo em análise tentando acessar rota não permitida, redirecionando para cadastro-em-analise');
      router.push('/painel-psicologo/cadastro-em-analise');
      return;
    }
    
    console.log('[ClientPainelLayout] Psicólogo em análise, acesso permitido à página de cadastro-em-analise');
  }, [user, router, isCadastroEmAnalise, isCadastro, pathname, isLoadingUser]);

  // Mostra loading enquanto está carregando o usuário
  // IMPORTANTE: Não redireciona se não houver usuário, apenas mostra loading
  // O useProtectedRoute já faz a verificação de autenticação
  if (isLoadingUser) {
    return <LoadingFallback />;
  }
  
  // Se não houver usuário após carregar, não renderiza (useProtectedRoute vai tratar)
  if (!user) {
    return <LoadingFallback />;
  }

  const showHeaderFooter = !isCadastroEmAnalise && !isCadastro;

  return (
    <SocketProvider userId={user.Id}>
      <UserProvider user={user}>
        <div className="bg-[#fff] flex flex-col min-h-screen">
          {showHeaderFooter && (
            <Suspense fallback={<PainelHeaderSkeleton isPainelPsicologo={true} />}>
              <PainelHeader user={user} />
            </Suspense>
          )}
          <main className="flex-1">
            <Suspense fallback={<PainelLoadingSkeleton />}>
              {children}
            </Suspense>
          </main>
          {showHeaderFooter && <PainelFooter />}
          {showToastProvider && <CustomToastProvider />}
        </div>
      </UserProvider>
    </SocketProvider>
  );
};

const ClientPainelLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Protege o painel para apenas psicólogos
  useProtectedRoute("Psychologist");

  const router = useRouter();
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);

  // Mostra loading durante autenticação inicial ou enquanto não há usuário
  // Aguarda o carregamento completo antes de renderizar
  // IMPORTANTE: Não redireciona aqui, apenas mostra loading
  // O useProtectedRoute vai tratar o redirecionamento se necessário
  if (isLoading) {
    return <LoadingFallback />;
  }

  // Se não houver usuário após carregar, mostra loading
  // O useProtectedRoute vai tentar buscar o usuário e redirecionar se necessário
  if (!user) {
    return <LoadingFallback />;
  }

  // Verifica se o usuário tem o role correto antes de renderizar
  // Isso evita que a página seja renderizada e depois redirecionada
  if (user.Role !== "Psychologist") {
    // Se for Patient, redireciona para o painel dele
    if (user.Role === "Patient") {
      router.replace("/painel");
      return <LoadingFallback />;
    }
    
    // Se for Finance, redireciona imediatamente para no-permission
    if ((user.Role as string) === "Finance") {
      window.location.href = "/no-permission";
      return <LoadingFallback />;
    }
    return <LoadingFallback />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LoggedErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <ClientPainelContent>
            <Suspense fallback={<LoadingFallback />}>
              {children}
            </Suspense>
          </ClientPainelContent>
        </Suspense>
      </LoggedErrorBoundary>
    </QueryClientProvider>
  );
};

export default ClientPainelLayout;
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface SemPermissaoSalaProps {
  redirectPath?: string;
}

export default function SemPermissaoSala({ redirectPath }: SemPermissaoSalaProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Determina o caminho de redirecionamento baseado no role do usuário
    const getRedirectPath = () => {
      if (redirectPath) return redirectPath;
      
      if (user?.Role === 'Psychologist') {
        return '/painel-psicologo';
      } else if (user?.Role === 'Patient') {
        return '/painel';
      }
      
      // Fallback padrão
      return '/painel';
    };

    // Redireciona após 3 segundos
    const timer = setTimeout(() => {
      router.push(getRedirectPath());
    }, 3000);

    return () => clearTimeout(timer);
  }, [router, user?.Role, redirectPath]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-yellow-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center space-y-8 text-center px-4">
        {/* Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-ping"></div>
          <div className="relative bg-red-500/10 backdrop-blur-sm p-8 rounded-full border border-red-500/30 shadow-2xl">
            <svg 
              className="w-16 h-16 text-red-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Acesso não autorizado
          </h2>
          <p className="text-base sm:text-lg text-indigo-200/80 max-w-md">
            Os tokens necessários para acessar esta sala não estão disponíveis. 
            Você será redirecionado em alguns instantes.
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center space-x-2 text-indigo-300">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}

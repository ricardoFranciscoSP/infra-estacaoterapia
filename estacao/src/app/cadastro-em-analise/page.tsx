"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CadastroEmAnalise() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona para a página dentro do painel do psicólogo
    router.replace('/painel-psicologo/cadastro-em-analise');
  }, [router]);

  // Mostra loading durante o redirecionamento
  return (
    <div className="min-h-screen bg-[#f9f8f3] flex flex-col items-center justify-center px-4 py-8 text-[#333]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8494E9] mx-auto"></div>
      </div>
    </div>
  );
}
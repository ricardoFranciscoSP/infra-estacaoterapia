"use client";

import { useUserBasic } from '@/hooks/user/userHook';
import CadastroEmAnaliseContent from '@/components/CadastroEmAnaliseContent';

export default function CadastroEmAnalise() {
  const { user, isLoading } = useUserBasic();

  // Mostra loading enquanto está carregando
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f9f8f3] flex flex-col items-center justify-center px-4 py-8 text-[#333]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8494E9] mx-auto"></div>
        </div>
      </div>
    );
  }

  // Se não houver usuário, ainda assim mostra a página (o layout já valida)
  // Isso evita redirecionamento indevido
  return <CadastroEmAnaliseContent user={user} />;
}
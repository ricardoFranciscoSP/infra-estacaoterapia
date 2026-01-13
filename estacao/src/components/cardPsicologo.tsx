"use client";
import { useAddFavorito, useFavoritos, useRemoveFavorito } from "@/hooks/paciente/favoritosHook";
import { useAverageRating } from "@/hooks/reviewHook";
import { getAvatarUrl } from "@/utils/avatarUtils";
import React, { useEffect } from "react";
import Image from "next/image";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface Psicologo {
  Id: string | number;
  PsicologoId?: string | number;
}
 
interface Favorito {
  id: string | number;
  psychologist?: {
    id: string | number;
  };
}

import { User, useAuthStore } from "@/store/authStore";
import Link from "next/link";

interface CardPsicologosProps {
  avatarUrl: string;
  nome: string;
  crp: string;
  sobreMim: string;
  router: AppRouterInstance;
  p: Psicologo;
  idx: number;
  motion?: unknown;
  mediaNota?: number | null;
  user?: User | null;
}

const CardPsicologos: React.FC<CardPsicologosProps> = ({
  avatarUrl,
  nome,
  crp,
  sobreMim,
  p,
}) => {
  // Pega usuário logado globalmente
  const user = useAuthStore((s) => s.user);
  const isUserValid = !!user && !!user.Id;

  // Usa a função utilitária para garantir que sempre haverá um avatar
  const safeAvatarUrl = getAvatarUrl({ avatarUrl });
  // Hooks de favoritos
  const { favoritos, refetch: refetchFavoritos } = useFavoritos();
  const addFavorito = useAddFavorito();
  const removeFavorito = useRemoveFavorito();

  // Hook para nota média
  const { averageRating, refetch: refetchAverageRating } = useAverageRating(String(p.Id));

  // Id do psicólogo para favoritar
  const psicologoId = String(p.PsicologoId ?? p.Id ?? "");

  // Garante que favoritos é sempre um array
  const favoritosArray: Favorito[] = Array.isArray(favoritos?.favorites)
    ? favoritos.favorites
    : [];

  // Busca o favorito correspondente ao psicólogo atual
  const favoritoObj = favoritosArray.find(
    (fav: Favorito) => String(fav.psychologist?.id) === psicologoId
  );
  const isFavorito = !!favoritoObj;

  // Estado de loading para o botão de favoritar
  const [loadingFavorito, setLoadingFavorito] = React.useState(false);

  // Função para favoritar/desfavoritar usando hooks e store corretamente
  const handleFavoritar = async () => {
    setLoadingFavorito(true);
    try {
      if (isFavorito && favoritoObj?.id) {
        // Corrigido: sempre envia string
        await removeFavorito.mutateAsync(String(favoritoObj.id));
      } else {
        await addFavorito.mutateAsync(psicologoId);
      }
      await refetchFavoritos();
    } finally {
      setLoadingFavorito(false);
    }
  };

  // Detecta se está em /painel/** para prefixar rota
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const isPainel = pathname.startsWith("/painel");
  const perfilLink = isPainel ? `/painel/psicologo/${p.Id}` : `/psicologo/${p.Id}`;

  // Função para compartilhar o link do psicólogo
  const handleCompartilhar = () => {
    const url = window.location.origin + perfilLink;
    const mensagemPadrao = `Minha indicação: profissional da Estação Terapia. Teste por R$ 49,90 — vale conhecer: ${url}`;
    // Detecta se é WhatsApp Web ou app
    const isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensagemPadrao)}`;
    if (isMobile) {
      window.open(whatsappUrl, '_blank');
    } else if (navigator.share) {
      navigator.share({
        title: `Perfil de ${nome}`,
        text: mensagemPadrao,
      });
    } else {
      navigator.clipboard.writeText(mensagemPadrao);
      alert(mensagemPadrao);
    }
  };

  useEffect(() => {
    refetchFavoritos();
    refetchAverageRating();
  }, [refetchFavoritos, refetchAverageRating]);
  
  return (
    <div
      className="w-full h-[128px] md:w-[323px] md:min-w-[323px] md:max-w-[323px] md:h-[372px] bg-[#8494E9] rounded-tl-[8px] rounded-tr-[8px] md:rounded-tl-[8px] md:rounded-bl-[8px] md:rounded-tr-[0px] md:rounded-br-[0px] p-4 md:pt-4 md:pr-4 md:pb-4 md:pl-4 flex flex-col gap-4 md:gap-2 flex-shrink-0"
    >
      {/* MOBILE: Avatar, nome, CRP, ícones no topo; estrelas e botão abaixo do nome/CRP, lado a lado */}
      <div className="block md:hidden w-full h-full  flex-col">
        <div className="flex flex-row items-start w-full">
          {/* Avatar */}
          <Image
            src={safeAvatarUrl}
            alt={nome || 'Psicólogo'}
            width={56}
            height={56}
            className="w-14 h-14 rounded-full object-cover border-2 border-[#FCFBF6] opacity-100 flex-shrink-0"
            unoptimized={safeAvatarUrl?.startsWith('http') || safeAvatarUrl?.startsWith('data:')}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== '/assets/avatar-placeholder.svg') {
                target.src = '/assets/avatar-placeholder.svg';
              }
            }}
          />
          {/* Nome, CRP e ícones */}
          <div className="flex flex-col ml-3 flex-1 min-w-0">
            <div className="flex flex-row items-start w-full mb-1 gap-1.5">
              <div className="flex flex-col flex-1 min-w-0 pr-1">
                <h4 className="font-semibold text-[15px] leading-[20px] text-[#FCFBF6] break-words">
                  {nome}
                </h4>
                <span className="font-normal text-[13px] leading-[18px] text-[#FCFBF6] mt-0.5">
                  CRP {crp}
                </span>
              </div>
              {/* Ícones coração e compartilhar - movidos mais para a esquerda */}
              <div className="flex flex-row items-start gap-1 flex-shrink-0 pt-0.5 -mr-1">
                {isUserValid && (
                  <button
                    className="flex items-center justify-center transition p-0.5 flex-shrink-0"
                    type="button"
                    onClick={handleFavoritar}
                    disabled={loadingFavorito}
                    style={{ minWidth: 20, minHeight: 20 }}
                  >
                    {loadingFavorito ? (
                      <svg className="animate-spin w-5 h-5 text-[#F2F4FD]" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                    ) : (
                      <Image
                        src={isFavorito ? "/icons/heart-filled.svg" : "/icons/heart.svg"}
                        alt={isFavorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                        width={20}
                        height={20}
                        className="w-5 h-5"
                        unoptimized
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/icons/heart.svg";
                        }}
                      />
                    )}
                  </button>
                )}
                <button 
                  className="flex items-center justify-center text-[#F2F4FD] hover:text-white transition p-0.5 flex-shrink-0"
                  onClick={handleCompartilhar}
                  type="button"
                  style={{ minWidth: 24, minHeight: 24 }}
                >
                  <Image
                    src="/icons/share-1.svg"
                    alt="Compartilhar"
                    width={18}
                    height={18}
                    className="w-4.5 h-4.5"
                    unoptimized
                    onError={() => {
                      console.warn('Erro ao carregar ícone de compartilhar');
                    }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Estrelas e botão lado a lado - estrelas à esquerda, botão à direita */}
        <div className="flex flex-row items-center justify-between gap-2 w-full">
          <div className="flex flex-row items-center gap-1 flex-shrink-0">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={
                  star <= Math.round(averageRating ?? 0)
                    ? "w-5 h-5 text-[#FFD600]"
                    : "w-5 h-5 text-[#BFC6E2]"
                }
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <polygon points="10,1 12.59,7.36 19.51,7.64 14,12.14 15.82,19.02 10,15.27 4.18,19.02 6,12.14 0.49,7.64 7.41,7.36" />
              </svg>
            ))}
          </div>
          <Link
            className="px-3 py-1.5 border border-[#FCFBF6] text-[#FCFBF6] fira-sans font-semibold rounded-[6px] text-[13px] hover:bg-[#FCFBF6] hover:text-[#8494E9] transition whitespace-nowrap cursor-pointer flex items-center justify-center"
            style={{ height: 32 }}
            href={perfilLink}
          >
            Ver perfil completo 
          </Link>
        </div>
      </div>
      {/* DESKTOP: Layout antigo mantido */}
      <div className="hidden md:flex flex-col w-full h-full md:w-[323px] md:h-[372px] md:rounded-tl-[8px] md:rounded-bl-[8px] md:pt-4 md:pr-4 md:pb-4 md:pl-4 gap-2">
        {/* Avatar, nome, CRP, estrelas */}
        <div className="flex flex-row items-center w-full mb-1">
          <Image
            src={safeAvatarUrl}
            alt={nome || 'Psicólogo'}
            width={80}
            height={80}
            className="w-20 h-20 rounded-full object-cover border-2 border-[#FCFBF6] opacity-100"
            unoptimized={safeAvatarUrl?.startsWith('http') || safeAvatarUrl?.startsWith('data:')}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== '/assets/avatar-placeholder.svg') {
                target.src = '/assets/avatar-placeholder.svg';
              }
            }}
          />
          <div className="flex flex-col ml-3">
            <h4 className="font-semibold text-[16px] md:text-[16px] leading-[20px] text-[#FCFBF6]">
              {nome}
            </h4>
            <span className="font-normal text-[16px] leading-[20px] text-[#FCFBF6] mt-0.5">
              CRP {crp}
            </span>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={
                    star <= Math.round(averageRating ?? 0)
                      ? "w-5 h-5 text-[#FFD600]"
                      : "w-5 h-5 text-[#BFC6E2]"
                  }
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <polygon points="10,1 12.59,7.36 19.51,7.64 14,12.14 15.82,19.02 10,15.27 4.18,19.02 6,12.14 0.49,7.64 7.41,7.36" />
                </svg>
              ))}
            </div>
          </div>
        </div>

        {/* Botões Favoritar e Compartilhar lado a lado */}
        <div className="flex flex-row gap-3 w-full mb-1 justify-start">
          {isUserValid && (
            <button
              className="flex items-center gap-2 text-base transition cursor-pointer"
              onClick={handleFavoritar}
              disabled={loadingFavorito}
            >
              {loadingFavorito ? (
                <svg className="animate-spin w-5 h-5 text-[#F2F4FD]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              ) : (
                <Image
                  src={isFavorito ? "/icons/heart.png" : "/icons/heart.svg"}
                  alt={isFavorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
              )}
              <span className="text-base" style={{ color: "#F2F4FD" }}>
                Favoritar
              </span>
            </button>
          )}
          <button
            className="flex items-center gap-2 text-[#F2F4FD] text-base hover:text-white transition cursor-pointer"
            onClick={handleCompartilhar}
            type="button"
          >
            <Image
              src="/icons/share-1.svg"
              alt="Compartilhar"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <span className="text-base">Compartilhar</span>
          </button>
        </div>
        {/* Descrição e botão */}
        <div className="w-full flex flex-col gap-1 flex-1 justify-start min-h-0">
          <h5 className="text-white font-semibold text-base mb-0.5">Sobre mim</h5>
          <p className="text-[#E6EAFE] text-sm line-clamp-4 overflow-hidden mb-2">
            {sobreMim.length > 120 ? sobreMim.slice(0, 120) + "..." : sobreMim || "Olá! Sou psicólogo(a) com o compromisso de auxiliar você em sua jornada de autoconhecimento e bem-estar."}
          </p>
          <div className="flex justify-start w-full">
            <Link
              className="
                w-[181px] h-[40px]
                flex items-center justify-center
                gap-[12px]
                px-[16px]
                rounded-[6px]
                border border-[#FCFBF6]
                font-fira-sans font-medium
                text-[16px] leading-[24px]
                text-[#FCFBF6]
                opacity-100
                transition
                hover:bg-[#FCFBF6] hover:text-[#8494E9]
              "
              href={perfilLink}
            >
              Ver perfil completo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardPsicologos;

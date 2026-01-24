"use strict";
import { useFavoritos } from "@/hooks/paciente/favoritosHook";
import { useRemoveFavorito } from "@/hooks/paciente/favoritosHook";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export const PsicologosFavoritos = () => {
  const { favoritos, refetch, isLoading } = useFavoritos();
  const removeFavoritoMutation = useRemoveFavorito();
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (removeFavoritoMutation.isSuccess || removeFavoritoMutation.isError) {
      setRemovingId(null);
    }
  }, [removeFavoritoMutation.isSuccess, removeFavoritoMutation.isError, refetch]);

  function handleRemove(id: string): void {
    setRemovingId(id);
    removeFavoritoMutation.mutate(id);
  }

  return (
    <div id="favoritos" className="w-full">
      <div className="flex items-center mb-4 sm:mb-6">
        <Image src="/assets/icons/heart-filled.svg" alt="Favoritos" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
        <h3 className="fira-sans font-semibold text-lg sm:text-xl md:text-2xl leading-tight sm:leading-[40px] tracking-normal text-[#49525A]">Meus psicólogos favoritos</h3>
      </div>
      {isLoading ? (
        <ul className="space-y-3 sm:space-y-4 w-full">
          {Array.from({ length: 3 }).map((_, index) => (
            <li
              key={index}
              className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-lg sm:rounded-xl shadow-sm animate-pulse w-full"
            >
              <div className="flex items-center flex-1 min-w-0">
                <Image
                  src="/assets/avatar-placeholder.svg"
                  alt="Carregando"
                  width={48}
                  height={48}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 mr-3 sm:mr-4 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="w-32 sm:w-40 h-4 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 mb-2 rounded"></div>
                  <div className="w-24 sm:w-32 h-3 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded"></div>
                </div>
              </div>
              <div className="w-10 h-4 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded flex-shrink-0 ml-2"></div>
            </li>
          ))}
        </ul>
      ) : Array.isArray(favoritos?.favorites) && favoritos.favorites.length > 0 ? (
        <ul className="space-y-3 sm:space-y-4 w-full">
          {favoritos.favorites.map((favorite) => (
            <li
              key={favorite.id}
              className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-shadow w-full gap-3 sm:gap-4"
            >
              <div className="flex items-center flex-1 min-w-0">
                <Image
                  src={favorite.psychologist.image ? favorite.psychologist.image : "/assets/avatar-placeholder.svg"}
                  alt={favorite?.psychologist?.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full mr-3 sm:mr-4 flex-shrink-0 object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base fira-sans-semibold text-dark block truncate">
                    {favorite?.psychologist?.name}
                  </h4>
                  <p className="text-xs sm:text-sm fira-sans-regular text-gray mt-1">
                    <span className="font-semibold">CRP:</span> {favorite?.psychologist?.crp}
                  </p>
                  <Link
                    href={`/psicologo/${favorite.psychologist.id}`}
                    className="text-xs sm:text-sm text-[#6D75C0] hover:text-[#4B51A6] hover:underline font-medium mt-1.5 inline-block transition-colors"
                  >
                    Ver perfil
                  </Link>
                </div>
              </div>
              <button
                onClick={() => handleRemove(favorite.id)}
                className={`flex items-center justify-center text-gray hover:text-[#D9534F] text-sm fira-sans-medium cursor-pointer w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 ${removingId === favorite.id ? "opacity-50 pointer-events-none" : ""}`}
                disabled={removingId === favorite.id}
              >
                {removingId === favorite.id ? (
                  <span
                    className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin inline-block"
                  />
                ) : (
                  <Image src="/assets/icons/coracao-azul.svg" alt="Remover dos favoritos" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="fira-sans-medium text-sm text-gray">Você ainda não possui psicólogos favoritos.</p>
      )}
    </div>
  );
};
         
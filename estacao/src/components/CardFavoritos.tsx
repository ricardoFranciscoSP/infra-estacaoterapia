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
    <div id="favoritos" className="p-4 sm:p-6 rounded-lg mt-4 w-full">
      <div className="flex items-center mb-4">
        <Image src="/assets/icons/heart-filled.svg" alt="Favoritos" width={24} height={24} className="w-6 h-6 mr-2" />
        <h3 className="fira-sans font-semibold text-2xl leading-[40px] tracking-normal text-[#49525A]">Meus psicólogos favoritos</h3>
      </div>
      {isLoading ? (
        <ul className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <li
              key={index}
              className="flex items-center justify-between bg-gray-200 p-4 rounded-lg animate-pulse"
            >
              <div className="flex items-center">
                <Image
                  src="/assets/avatar-placeholder.svg"
                  alt="Carregando"
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 mr-4"
                />
                <div>
                  <div className="w-32 h-4 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 mb-2 rounded"></div>
                  <div className="w-24 h-3 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded"></div>
                </div>
              </div>
              <div className="w-10 h-4 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded"></div>
            </li>
          ))}
        </ul>
      ) : Array.isArray(favoritos?.favorites) && favoritos.favorites.length > 0 ? (
        <ul className="space-y-4">
          {favoritos.favorites.map((favorite) => (
            <li
              key={favorite.id}
              className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm"
            >
              <div className="flex items-center">
                <Image
                  src={favorite.psychologist.image ? favorite.psychologist.image : "/assets/avatar-placeholder.svg"}
                  alt={favorite?.psychologist?.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <Link
                    href={`/psicologo/${favorite.psychologist.id}`}
                    className="text-sm fira-sans-semibold text-dark hover:underline"
                  >
                    {favorite?.psychologist?.name}
                  </Link>
                  <p className="text-xs fira-sans-regular text-gray mt-1">
                    <span className="font-semibold">CRP:</span> {favorite?.psychologist?.crp}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(favorite.id)}
                className={`flex items-center text-gray hover:text-[#D9534F] text-sm fira-sans-medium cursor-pointer ${removingId === favorite.id ? "opacity-50 pointer-events-none" : ""}`}
                disabled={removingId === favorite.id}
              >
                {removingId === favorite.id ? (
                  <span
                    className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin inline-block"
                  />
                ) : (
                  <Image src="/assets/icons/coracao-azul.svg" alt="Remover dos favoritos" width={24} height={24} className="w-6 h-6" />
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
         
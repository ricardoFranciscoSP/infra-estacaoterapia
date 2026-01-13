import React from "react";

export default function PainelFavoritos() {
  return (
    <section className="w-full flex flex-col gap-2 mt-6">
      <h3 className="font-bold text-[#232A5C] text-lg flex items-center gap-2">
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M10 17.27L16.18 21l-1.64-7.03L20 8.24l-7.19-.61L10 1 7.19 7.63 0 8.24l5.46 5.73L3.82 21z" fill="#232A5C"/></svg>
        Meus psicólogos favoritos
      </h3>
      <span className="text-[#232A5C] text-sm">Você ainda não possui nenhum psicólogo favorito adicionado</span>
      <button className="bg-[#A3A8F7] text-white font-semibold px-4 py-2 rounded-lg w-fit mt-2 hover:bg-[#232A5C]">Ver psicólogos</button>
    </section>
  );
}

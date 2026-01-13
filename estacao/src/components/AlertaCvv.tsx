"use client";
import React from "react";

export default function AlertaCvv() {
  return (
    <div className="w-full bg-[#4b51a2] py-4 px-2 flex items-center justify-center">
      <p className="text-white text-center text-xs sm:text-sm md:text-base font-fira-sans font-semibold max-w-5xl mx-auto">
        <span className="font-bold fira-sans text-white">Atenção:</span> Este site não oferece tratamento ou aconselhamento imediato para pessoas em crise suicida. Em caso de crise, ligue para <span className="font-bold">188 (CVV)</span> ou acesse o site <a href="https://www.cvv.org.br" target="_blank" rel="noopener noreferrer" className="underline font-bold">www.cvv.org.br</a>. Em caso de emergência, procure atendimento em um hospital mais próximo.
      </p>
    </div>
  );
}

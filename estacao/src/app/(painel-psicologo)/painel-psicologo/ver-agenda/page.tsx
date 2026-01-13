"use client";
import React, { useState, useEffect } from "react";
import SidebarPsicologo from "../SidebarPsicologo";
import { AnimatePresence, motion } from "framer-motion";
import { useListarConfigAgenda } from "@/hooks/psicologos/configAgenda";
import { useRouter } from "next/navigation";

const weekDays = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado"
];

// Tipo para os horários
type HorarioSlot = {
  Id: string;
  Horario: string;
  Status: string;
  Data: string;
};

export default function VerAgendaPage() {
  const today = new Date();
  const { configAgendas: configAgenda, isLoading, isError } = useListarConfigAgenda();
  const router = useRouter();

  // Mapeia configAgenda para HorarioSlot diretamente
  const horarios: HorarioSlot[] = (configAgenda ?? []).map((item) => ({
    Id: item.Id,
    Horario: item.Horario ?? "",
    Status: item.Status ?? "",
    Data: item.Data ?? "",
  }));

  // Agrupa por data
  const horariosPorDia: { [data: string]: HorarioSlot[] } = {};
  horarios.forEach((slot: HorarioSlot) => {
    const dataKey = slot.Data;
    if (!horariosPorDia[dataKey]) horariosPorDia[dataKey] = [];
    horariosPorDia[dataKey].push(slot);
  });

  // Dias ordenados e filtrados do dia atual em diante
  const diasOrdenados = Object.keys(horariosPorDia)
    .filter(dataKey => new Date(dataKey) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .map(dataKey => ({
      data: dataKey,
      slots: horariosPorDia[dataKey].slice().sort((a: HorarioSlot, b: HorarioSlot) => {
        const [ah, am] = a.Horario.split(":").map(Number);
        const [bh, bm] = b.Horario.split(":").map(Number);
        return ah !== bh ? ah - bh : am - bm;
      })
    }));

  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    function handleScroll() {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 100 &&
        visibleCount < diasOrdenados.length
      ) {
        setVisibleCount(prev => Math.min(prev + 5, diasOrdenados.length));
      }
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [visibleCount, diasOrdenados.length]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto w-full flex">
        <div className="hidden md:flex">
          <SidebarPsicologo />
        </div>
        <div className="flex-1 py-4 sm:py-8 px-4 sm:px-6 w-full mb-24 sm:mb-8">
          <h1 className="text-lg sm:text-2xl font-semibold mb-6 text-primary">
            Ver Agenda
          </h1>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <span>Carregando agenda...</span>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-32 text-error">
              <span>Erro ao carregar agenda. Tente novamente mais tarde.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <AnimatePresence>
                {diasOrdenados.slice(0, visibleCount).map((dia) => {
                  const date = new Date(dia.data);
                  return (
                    <motion.div
                      key={dia.data}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 30 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="bg-white shadow-lg rounded-xl p-4 sm:p-6 mb-2 flex flex-col"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                        <h3 className="text-md font-semibold text-primary">
                          {weekDays[date.getDay()]} - dia {date.getDate().toString().padStart(2, "0")}/{(date.getMonth() + 1).toString().padStart(2, "0")}/{date.getFullYear()}
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                        {dia.slots.map((slot: HorarioSlot) => {
                          let bg = "bg-base-100";
                          const text = slot.Status || "Disponível"; // prefer-const
                          let border = "border-base-300";
                          let textColor = "text-base-content";
                          if (slot.Status === "Bloqueado") {
                            bg = "bg-base-200 text-base-content/50 border-base-200";
                            textColor = "text-base-content/50";
                            border = "border-base-200";
                          } else if (slot.Status === "Reservado") {
                            bg = "bg-yellow-100 text-yellow-700 border-yellow-300";
                            textColor = "text-yellow-700";
                            border = "border-yellow-300";
                          } else if (slot.Status === "Concluido" || slot.Status === "Concluído") {
                            bg = "bg-green-100 text-green-700 border-green-300";
                            textColor = "text-green-700";
                            border = "border-green-300";
                          } else if (slot.Status === "Indisponivel") {
                            bg = "bg-red-100 text-red-700 border-red-300";
                            textColor = "text-red-700";
                            border = "border-red-300";
                          }
                          return (
                            <div
                              key={slot.Id}
                              className={`flex flex-col items-center justify-center rounded-lg shadow p-2 border text-xs sm:text-sm font-semibold ${bg} ${border} ${textColor} transition`}
                            >
                              <span>{slot.Horario}</span>
                              <span className="text-[10px] mt-1">{text}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-end">
                        <button
                          className="px-4 py-2 rounded bg-primary text-white font-semibold hover:bg-primary-focus transition"
                          onClick={() => router.push("/painel-psicologo/agenda")}
                        >
                          Editar
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
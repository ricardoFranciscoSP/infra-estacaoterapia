"use client";
import React from "react";
import PainelSidebar from '@/components/PainelSidebar';
import { motion } from "framer-motion";

export default function MinhasConsultasPage() {
  return (
    <div className="w-full bg-[#fff] min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto flex gap-4 md:gap-8 px-4 md:px-6 py-4 md:py-8">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="hidden md:block w-[220px] lg:w-[260px] flex-shrink-0"
        >
          <PainelSidebar active="/painel/minha-conta/minhas-consultas" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex-1 bg-[#fff] rounded-[12px] border border-[#E3E6E8] p-4 md:p-8 min-h-[600px] md:min-h-[904px] flex flex-col gap-6"
          style={{ boxSizing: 'border-box' }}
        >
          <h1 className="text-xl md:text-2xl font-semibold text-[#49525A] mb-4">Minhas Consultas</h1>
          <div className="flex-1 flex items-center justify-center text-[#606C76] text-base md:text-lg">
            Em breve: histórico de consultas.
          </div>
        </motion.div>
      </div>
    </div>
  );
}


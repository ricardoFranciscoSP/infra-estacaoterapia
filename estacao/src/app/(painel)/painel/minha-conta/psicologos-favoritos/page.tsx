"use client";
import React from "react";
import PainelSidebar from '@/components/PainelSidebar';

import { motion } from "framer-motion";
import { PsicologosFavoritos } from "@/components/CardFavoritos";

export default function PsicologosFavoritosPage() {
  return (
    <div className="flex justify-center py-8 bg-[#fff] min-h-screen px-4 md:px-8">
      <div className="flex w-full max-w-[1440px] gap-8">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="hidden md:block w-[260px] flex-shrink-0"
        >
          <PainelSidebar active="/painel/minha-conta/psicologos-favoritos" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex-1 bg-[#fff] rounded-[12px] border border-[#E3E6E8] p-8 min-h-[400px] flex flex-col gap-6"
          style={{ boxSizing: 'border-box' }}
        >
           <PsicologosFavoritos />
        </motion.div>
      </div>
    </div>
  );
}

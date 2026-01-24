"use client";
import React from "react";
import PainelSidebar from '@/components/PainelSidebar';
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import { motion } from "framer-motion";
import { PsicologosFavoritos } from "@/components/CardFavoritos";

export default function PsicologosFavoritosPage() {
  return (
    <div className="w-full bg-[#FCFBF6] min-h-[calc(100vh-64px)] mb-8">
      <div className="flex-1 flex w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 gap-4 sm:gap-8 py-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="hidden md:block w-1/4 flex-shrink-0"
        >
          <PainelSidebar active="/painel/minha-conta/psicologos-favoritos" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex-1 w-full"
        >
          {/* Mobile Header */}
          <div className="block md:hidden mb-4">
            <BreadcrumbsVoltar />
          </div>
          {/* Desktop Header */}
          <div className="hidden md:block mb-6">
            <BreadcrumbsVoltar />
          </div>
          <PsicologosFavoritos />
        </motion.div>
      </div>
    </div>
  );
}

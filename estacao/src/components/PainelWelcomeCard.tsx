'use client';
import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useUserMe } from '@/hooks/user/userHook';

export default function PainelWelcomeCard() {
  const { user } = useUserMe();
  const firstName = user?.Nome?.split(' ')[0] || "";
  const router = useRouter();
  return (
    <motion.section
      className="bg-[#232A5C] flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full h-auto md:h-[330px] rounded-lg p-4 md:p-4"
      style={{ opacity: 1 }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.img
        src="/assets/images/yoga.svg"
        alt="Bem-vindo"
        className="hidden md:block object-contain mx-auto w-[120px] h-[120px] md:w-[220px] md:h-[220px] md:max-w-none md:mr-0"
        style={{ width: "100%", maxWidth: 120, height: "auto", opacity: 1 }}
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
      />
      <motion.div
        className="flex flex-col gap-2 md:gap-4 flex-1"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
      >
        <h2  className="text-lg md:text-2xl font-bold text-white">Bem-vindo {firstName}!</h2>
        <p className="text-white text-sm md:text-base">Você ainda não possui nenhuma consulta conosco, aproveite para comprar sua primeira consulta agora</p>
        <motion.button
          className="bg-white text-[#232A5C] font-semibold px-4 py-2 rounded-lg w-fit md:w-fit hover:bg-[#E6E9FF] cursor-pointer self-start"
          onClick={() => router.push(`/painel/comprar-consulta/321719`)}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.97 }}
          id="consulta-card"
        >
          Comprar consulta
        </motion.button>
      </motion.div>
    </motion.section>
  );
}

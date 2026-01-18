"use client";
import HeaderOnboarding from "@/components/HeaderOnboarding";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUserBasic } from "@/hooks/user/userHook";
import Script from "next/script";
import PublicProviders from "@/provider/PublicProviders";

export default function BoasVindasPage() {
  const router = useRouter();
  const { user } = useUserBasic();
  const { logout } = useAuthStore();

  // Verifica se é psicólogo não ativo e faz logout automático
  // E verifica se o onboarding já foi completado
  useEffect(() => {
    if (!user) return;

    // Verifica se o onboarding já foi completado
    const hasCompletedOnboarding = user.Onboardings && user.Onboardings.length > 0 
      ? user.Onboardings.some(onboarding => onboarding.Completed === 'true')
      : false;

    if (hasCompletedOnboarding) {
      // Se já completou o onboarding, redireciona para o painel
      router.push('/painel');
      return;
    }

    // Normaliza o status para comparação
    const normalizeStatus = (status: string | undefined): string => {
      if (!status) return '';
      return status
        .replace(/\s/g, '')
        .replace(/[áàâãéêíóôõúüç]/gi, (match) => {
          const map: Record<string, string> = {
            'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a',
            'é': 'e', 'ê': 'e',
            'í': 'i',
            'ó': 'o', 'ô': 'o', 'õ': 'o',
            'ú': 'u', 'ü': 'u',
            'ç': 'c'
          };
          return map[match.toLowerCase()] || match;
        })
        .toLowerCase();
    };

    // Se for psicólogo e não estiver ativo, faz logout automático
    if (user.Role === "Psychologist") {
      const userStatusNormalized = normalizeStatus(user.Status);
      const isAtivo = userStatusNormalized === "ativo";

      if (!isAtivo) {
        // Faz logout em segundo plano sem mostrar mensagem
        logout().then(() => {
          // Redireciona para login após logout
          router.push("/login");
        }).catch(() => {
          // Em caso de erro, força redirecionamento
          router.push("/login");
        });
      }
    }
  }, [user, logout, router]);

  const handleAccess = () => {
    router.push("/objetivos");
  };

  return (
    <PublicProviders>
      {/* Script de tracking - ProTrack */}
      <Script
        id="protrack-boas-vindas"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,o,p){w.proTrackDataLayer=w.proTrackDataLayer||[];w.proTrackDataLayer.push({offerId:o,pageType:p});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://kppuuqnpekounoylsdum.supabase.co/storage/v1/object/public/tracking-script/tracking.min.js';f.parentNode.insertBefore(j,f);})(window,document,'script','11','conversion');
          `,
        }}
      />
      <motion.div
        className="w-full h-full flex flex-col items-center justify-start bg-[#1A2A44] min-h-screen px-4 text-white overflow-hidden"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
      {/* Header com botão Pular no topo */}
      <div className="w-full flex justify-between items-center pt-4 px-2 sm:px-4 md:px-8">
        <HeaderOnboarding />
      </div>
      {/* Container central mobile e lateral no desktop */}
      <div className="flex flex-col md:flex-row items-center justify-center w-full flex-1 max-w-6xl">
        {/* Ilustração */}
        <motion.div
          className="flex justify-center items-center w-full md:w-1/2 mb-8 md:mb-0"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
        >
          <Image
            src="/assets/boas-vindas.svg"
            alt="Ilustração"
            width={384}
            height={384}
            className="w-48 h-48 sm:w-60 sm:h-60 md:w-[384px] md:h-[384px] object-contain"
          />
        </motion.div>

        {/* Texto e Botão */}
        <motion.div
          className="flex flex-col items-center text-center w-full md:w-1/2 px-4"
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
        >
          <h1 className="fira-sans font-semibold text-xl sm:text-2xl leading-tight mb-2">
            Boas-vindas à Estação terapia!
          </h1>
          <p className="fira-sans font-normal text-sm sm:text-base leading-snug text-white mb-6 max-w-xs">
            O lugar ideal para seu bem-estar<br />
            e equilíbrio emocional.
          </p>
          <motion.button
            onClick={handleAccess}
            className="bg-white text-[#1A2A44] text-sm font-medium w-full max-w-xs h-10 rounded-lg hover:bg-gray-100 hover:scale-105 transition-all duration-200"
            whileTap={{ scale: 0.97 }}
          >
            Começar
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
    </PublicProviders>
  );
}

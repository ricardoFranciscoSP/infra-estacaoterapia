"use client";
import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { planoService } from "@/services/planoService";
import type { PlanoAssinatura } from "@/services/planoService";
import { usePlanoById } from "@/hooks/planosHook";
import type { Planos } from "@/types/planosVendaTypes";

const CallToActionPaciente: React.FC = () => {
  const router = useRouter();
  const normalize = React.useCallback((value?: string) =>
    (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
    []
  );

  const { data: planosData } = useQuery({
    queryKey: ["planos-cta-paciente"],
    queryFn: async () => {
      const response = await planoService().getPlanos();
      const planos = Array.isArray(response.data)
        ? response.data
        : ((response.data as { plano?: unknown[] })?.plano || []);
      return planos as PlanoAssinatura[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { planos: planoAvulso } = usePlanoById("Unica");
  const planoTyped = React.useMemo(() => planoAvulso as Planos | undefined, [planoAvulso]);

  const primeiraConsultaPlano = React.useMemo(() => {
    if (!planosData) return undefined;
    let plano = planosData.find((plano) => normalize(plano.Tipo) === "primeiraconsulta");
    if (!plano) {
      plano = planosData.find((plano) => {
        const tipo = normalize(plano.Tipo);
        return tipo === "unica" || tipo === "unico";
      });
    }
    return plano;
  }, [planosData, normalize]);

  const planoPrimeiraConsultaId = React.useMemo(() => {
    return primeiraConsultaPlano?.Id ?? planoTyped?.Id ?? "";
  }, [primeiraConsultaPlano, planoTyped]);

  const planoPrimeiraConsultaProductId = React.useMemo(() => {
    return primeiraConsultaPlano?.ProductId ?? planoTyped?.ProductId ?? "";
  }, [primeiraConsultaPlano, planoTyped]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      style={{ minHeight: '500px' }}
    >
      <div className="w-full bg-[#E5E9FA] py-8 mt-9 md:mt-16">
        <div className="w-full max-w-[1440px] mx-auto px-4 xl:px-32 2xl:px-64 py-8 md:py-12 lg:py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 lg:gap-16 xl:gap-24 w-full">
            <div className="w-full md:w-1/2 flex justify-center md:justify-start" style={{ minHeight: '250px' }}>
              <Image 
                src="/Hello.png" 
                alt="registro paciente" 
                width={588}
                height={588}
                loading="lazy"
                quality={85}
                sizes="(max-width: 640px) 250px, (max-width: 768px) 300px, (max-width: 1024px) 350px, (max-width: 1280px) 450px, 500px"
                className="w-[250px] h-[250px] sm:w-[300px] sm:h-[250px] md:w-[350px] md:h-[350px] lg:w-[450px] lg:h-[450px] xl:w-[500px] xl:h-[500px] opacity-100 object-contain"
                style={{ aspectRatio: '1/1' }}
              />
            </div>
            <div className="w-full md:w-1/2 text-center md:text-left flex flex-col justify-center">
              <h2 className="font-fira-sans font-bold text-[24px] md:text-[28px] lg:text-[32px] leading-[32px] md:leading-[36px] lg:leading-[40px] mb-4 md:mb-5 lg:mb-6 text-[#262B58]">
                Para pacientes
              </h2>
              <p className="fira-sans font-normal text-[16px] md:text-[17px] lg:text-[18px] leading-[24px] md:leading-[26px] lg:leading-[28px] mb-3 md:mb-4 text-[#26220D]">
                A terapia online é a solução ideal para quem deseja cuidar da saúde mental sem sair de casa.
              </p>
              <p className="fira-sans font-normal text-[16px] md:text-[17px] lg:text-[18px] leading-[24px] md:leading-[26px] lg:leading-[28px] mb-4 md:mb-5 lg:mb-6 text-[#26220D]">
                Aqui você se cuida com profissionais preparados e qualificados, disponíveis para te atender no melhor dia e horário que se encaixa em sua rotina.
              </p>
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (planoPrimeiraConsultaProductId) params.set("productId", planoPrimeiraConsultaProductId);
                  if (planoPrimeiraConsultaId) params.set("planoId", planoPrimeiraConsultaId);
                  const query = params.toString();
                  router.push(`/comprar-consulta${query ? `?${query}` : ""}`);
                }}
                className="inline-flex items-center justify-center py-2 px-6 rounded-[8px] bg-[#8494E9] w-full md:w-auto md:min-w-[280px] h-[48px] fira-sans text-bold text-[18px] text-secondary hover:bg-[#6B7DD8] transition-colors duration-200 whitespace-nowrap"
              >
                Começar minha terapia agora!
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CallToActionPaciente;
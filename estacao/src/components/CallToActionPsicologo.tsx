// src/components/CallToActionPsicologo.tsx
import { motion } from "framer-motion";
import Image from 'next/image';
import Link from "next/link";

const CallToActionPsicologo: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="mb-16"
    >
      <section className="w-full bg-[#E5E9FA] py-8" aria-label="Chamada para psicólogos se cadastrarem na plataforma">
        <div className="w-full max-w-[1440px] mx-auto px-4 xl:px-32 2xl:px-64 py-8 md:py-12 lg:py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 lg:gap-16 xl:gap-24 w-full">
            <div className="w-full md:w-1/2 text-center md:text-right flex flex-col justify-center order-2 md:order-1">
              <h2 className="font-fira-sans font-bold text-[24px] md:text-[28px] lg:text-[32px] leading-[32px] md:leading-[36px] lg:leading-[40px] mb-4 md:mb-5 lg:mb-6 text-[#262B58]">
                Para psicólogos
              </h2>
              <p className="fira-sans font-normal text-[16px] md:text-[17px] lg:text-[18px] leading-[24px] md:leading-[26px] lg:leading-[28px] mb-3 md:mb-4 text-[#26220D]">
                Seja parte de uma rede inovadora que conecta psicólogos a pacientes
                que estão em busca de cuidar de sua saúde mental.
              </p>
              <p className="fira-sans font-normal text-[16px] md:text-[17px] lg:text-[18px] leading-[24px] md:leading-[26px] lg:leading-[28px] mb-4 md:mb-5 lg:mb-6 text-[#26220D]">
                Aqui oferecemos as ferramentas e o suporte que você precisa para
                atender com flexibilidade, crescer profissionalmente e conquistar
                novos pacientes.
              </p> 
              <div className="flex justify-center md:justify-end">
                <Link
                  href="/register?tab=psicologo"
                  aria-label="Cadastre-se agora como psicólogo"
                  className="inline-flex items-center justify-center py-2 px-4 rounded-[8px] w-full md:w-auto h-[48px] fira-sans text-bold text-[18px] text-white bg-[#8494E9] hover:bg-[#6B7DD8] transition-colors duration-200"
                >
                 Quero me cadastrar
                </Link>
              </div>
            </div>
            <div className="w-full md:w-1/2 flex justify-center md:justify-end order-1 md:order-2">
              <Image
                src="/call-service.webp"
                alt="Psicólogo em atendimento remoto"
                width={588}
                height={588}
                className="w-[250px] h-[250px] sm:w-[300px] sm:h-[300px] md:w-[350px] md:h-[350px] lg:w-[450px] lg:h-[450px] xl:w-[500px] xl:h-[500px] opacity-100 object-contain"
                sizes="(max-width: 640px) 250px, (max-width: 768px) 300px, (max-width: 1024px) 350px, (max-width: 1280px) 450px, 500px"
                quality={80}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default CallToActionPsicologo;
"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useUIStore } from '@/store/uiStore';
import HeaderOnboarding from '@/components/HeaderOnboarding';
import { motion } from "framer-motion";
import { createOnboarding } from '@/store/api/userStore';
import Image from "next/image";
import { useUserBasic } from '@/hooks/user/userHook';
import { recuperarDadosPrimeiraCompra } from '@/utils/primeiraCompraStorage';

export default function ObjetivosPage() {
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const router = useRouter();
  const { user } = useUserBasic();

  const toggleObjective = (objective: string) => {
    setSelectedObjectives((prev) =>
      prev.includes(objective)
        ? prev.filter((item) => item !== objective)
        : [...prev, objective]
    );
  };

  const isSelected = (objective: string) => selectedObjectives.includes(objective);

  const handleBack = () => {
    router.push('/boas-vindas');
  };

  const setLoading = useUIStore((s) => s.setLoading);

  // Verifica se o onboarding já foi completado
  useEffect(() => {
    if (!user) return;

    const hasCompletedOnboarding = user.Onboardings && user.Onboardings.length > 0 
      ? user.Onboardings.some(onboarding => onboarding.Completed === 'true')
      : false;

    if (hasCompletedOnboarding) {
      // Se já completou o onboarding, redireciona para o painel
      router.push('/painel');
    }
  }, [user, router]);

  const handleAccess = async () => {
    if (selectedObjectives.length > 0) {
      setLoading(true);
      try {
        await createOnboarding(selectedObjectives);
        toast.success('Objetivos salvos com sucesso!');
        
        // Verifica se há dados da primeira consulta salvos
        const dadosPrimeiraCompra = await recuperarDadosPrimeiraCompra();
        if (dadosPrimeiraCompra?.planoId) {
          // Redireciona para a página de compra da primeira consulta
          router.push(`/painel/comprar-consulta/${dadosPrimeiraCompra.planoId}${dadosPrimeiraCompra.psicologoId ? `?psicologoId=${dadosPrimeiraCompra.psicologoId}` : ''}`);
        } else {
          // Fluxo normal: redireciona para o painel
          router.push('/painel');
        }
      } catch {
        toast.error('Erro ao salvar objetivos. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <motion.div
        className="flex flex-col min-h-screen bg-[#1A2A44] text-white md:justify-center md:min-h-screen"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex flex-col items-center px-8 py-4 md:justify-center md:flex-1">
          <HeaderOnboarding />
          <motion.div
            className="flex flex-col p-4 max-w-5xl md:max-w-7xl w-full"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          >
            <div className="flex flex-col p-4 max-w-5xl md:max-w-7xl w-full">
              <h1
                className="
                            mb-2 text-center md:text-left
                            font-fira-sans font-medium
                            text-[14px] leading-[24px]
                            md:text-[28px] md:leading-[36px]
                            w-full flex justify-center md:justify-start
                        "
              >
                Quais são seus objetivos por aqui?
              </h1>
              <p
                className="
                            mb-6 text-center md:text-left
                            font-fira-sans font-normal
                            text-[12px] leading-[16px]
                            md:text-[18px] md:leading-[26px]
                        "
              >
                Nos ajude a te conhecer melhor escolhendo as opções abaixo que mais combinam com seu objetivo.
              </p>
            </div>
          </motion.div>
          {/* Objectives Grid */}
          <motion.div
            className="
              max-w-5xl md:max-w-7xl w-full
              grid grid-cols-2 gap-[10px]
              md:grid-cols-4 md:gap-6
              py-2
            "
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.08
                }
              }
            }}
          >
            {/* Card 1 */}
            {(() => {
              const objective = 'Autoconhecimento';
              return (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`
                    bg-[#2A3B5A] rounded md:rounded-lg
                    cursor-pointer flex-shrink-0
                    w-full h-[166px] p-2
                    md:w-[282px] md:h-[184px] md:p-4
                    ${isSelected(objective) ? 'border-2 border-[#8494E9]' : ''}
                  `}
                  onClick={() => toggleObjective(objective)}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:space-x-2 mb-2">
                    <Image
                      src="/assets/icons/counseling.svg"
                      alt={objective}
                      width={32}
                      height={32}
                      className="w-6 h-6 md:w-8 md:h-8 mx-auto md:mx-0"
                    />
                    <h3
                      className="
                                            font-fira-sans font-medium
                                            text-[12px] leading-[16px]
                                            mt-1 md:mt-0 text-center md:text-left
                                            md:text-[16px] md:leading-[20px]
                                        "
                    >
                      {objective}
                    </h3>
                  </div>
                  <p
                    className="
                                        font-fira-sans font-normal
                                        text-[10px] leading-[14px]
                                        text-center md:text-left
                                        md:text-[14px] md:leading-[18px]
                                    "
                  >
                    Compreender melhor minhas emoções, valores e objetivos. Melhorar minha autestima, assertividade e encontrar um propósito de vida.
                  </p>
                </motion.div>
              );
            })()}

            {/* Card 2 */}
            {(() => {
              const objective = 'Bem-estar emocional';
              return (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`
                    bg-[#2A3B5A] rounded md:rounded-lg
                    cursor-pointer flex-shrink-0
                    w-full h-[166px] p-2
                    md:w-[282px] md:h-[184px] md:p-4
                    ${isSelected(objective) ? 'border-2 border-[#8494E9]' : ''}
                  `}
                  onClick={() => toggleObjective(objective)}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:space-x-2 mb-2">
                    <Image
                      src="/assets/icons/intrusive.svg"
                      alt={objective}
                      width={32}
                      height={32}
                      className="w-6 h-6 md:w-8 md:h-8 mx-auto md:mx-0"
                    />
                    <h3
                      className="
                                            font-fira-sans font-medium
                                            text-[12px] leading-[16px]
                                            mt-1 md:mt-0 text-center md:text-left
                                            md:text-[16px] md:leading-[20px]
                                        "
                    >
                      {objective}
                    </h3>
                  </div>
                  <p
                    className="
                                        font-fira-sans font-normal
                                        text-[10px] leading-[14px]
                                        text-center md:text-left
                                        md:text-[14px] md:leading-[18px]
                                    "
                  >
                    Aprender a gerenciar ansiedade, estresse e tristeza. Reduzir preocupações excessivas, medos e melhorar o equilíbrio emocional.
                  </p>
                </motion.div>
              );
            })()}

            {/* Card 3 */}
            {(() => {
              const objective = 'Relacionamentos';
              return (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`
                    bg-[#2A3B5A] rounded md:rounded-lg
                    cursor-pointer flex-shrink-0
                    w-full h-[166px] p-2
                    md:w-[282px] md:h-[184px] md:p-4
                    ${isSelected(objective) ? 'border-2 border-[#8494E9]' : ''}
                  `}
                  onClick={() => toggleObjective(objective)}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:space-x-2 mb-2">
                    <Image
                      src="/assets/icons/support.svg"
                      alt={objective}
                      width={32}
                      height={32}
                      className="w-6 h-6 md:w-8 md:h-8 mx-auto md:mx-0"
                    />
                    <h3
                      className="
                                            font-fira-sans font-medium
                                            text-[12px] leading-[16px]
                                            mt-1 md:mt-0 text-center md:text-left
                                            md:text-[16px] md:leading-[20px]
                                        "
                    >
                      {objective}
                    </h3>
                  </div>
                  <p
                    className="
                                        font-fira-sans font-normal
                                        text-[10px] leading-[14px]
                                        text-center md:text-left
                                        md:text-[14px] md:leading-[18px]
                                    "
                  >
                    Melhorar minhas conexões amorosas, familiares e sociais. Aprender a lidar com conflitos, dependência emocional, ciúmes e dificuldades interpessoais.
                  </p>
                </motion.div>
              );
            })()}

            {/* Card 4 */}
            {(() => {
              const objective = 'Profissional';
              return (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`
                    bg-[#2A3B5A] rounded md:rounded-lg
                    cursor-pointer flex-shrink-0
                    w-full h-[166px] p-2
                    md:w-[282px] md:h-[184px] md:p-4
                    ${isSelected(objective) ? 'border-2 border-[#8494E9]' : ''}
                  `}
                  onClick={() => toggleObjective(objective)}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:space-x-2 mb-2">
                    <Image
                      src="/assets/icons/intrusive.svg"
                      alt={objective}
                      width={32}
                      height={32}
                      className="w-6 h-6 md:w-8 md:h-8 mx-auto md:mx-0"
                    />
                    <h3
                      className="
                                            font-fira-sans font-medium
                                            text-[12px] leading-[16px]
                                            mt-1 md:mt-0 text-center md:text-left
                                            md:text-[16px] md:leading-[20px]
                                        "
                    >
                      {objective}
                    </h3>
                  </div>
                  <p
                    className="
                                        font-fira-sans font-normal
                                        text-[10px] leading-[14px]
                                        text-center md:text-left
                                        md:text-[14px] md:leading-[18px]
                                    "
                  >
                    Lidar com transições de carreira, estresse no trabalho e liderança. Desenvolver confiança, foco e planejamento para evoluir profissionalmente.
                  </p>
                </motion.div>
              );
            })()}

            {/* Card 5 */}
            {(() => {
              const objective = 'Saúde mental';
              return (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`
                    bg-[#2A3B5A] rounded md:rounded-lg
                    cursor-pointer flex-shrink-0
                    w-full h-[166px] p-2
                    md:w-[282px] md:h-[184px] md:p-4
                    ${isSelected(objective) ? 'border-2 border-[#8494E9]' : ''}
                  `}
                  onClick={() => toggleObjective(objective)}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:space-x-2 mb-2">
                    <Image
                      src="/assets/icons/intrusive.svg"
                      alt={objective}
                      width={32}
                      height={32}
                      className="w-6 h-6 md:w-8 md:h-8 mx-auto md:mx-0"
                    />
                    <h3
                      className="
                                            font-fira-sans font-medium
                                            text-[12px] leading-[16px]
                                            mt-1 md:mt-0 text-center md:text-left
                                            md:text-[16px] md:leading-[20px]
                                        "
                    >
                      {objective}
                    </h3>
                  </div>
                  <p
                    className="
                                        font-fira-sans font-normal
                                        text-[10px] leading-[14px]
                                        text-center md:text-left
                                        md:text-[14px] md:leading-[18px]
                                    "
                  >
                    Apoio para transtornos como TDAH, TEA, insônia, transtornos do sono e doenças crônicas. Aprender estratégias para ter uma rotina mais equilibrada.
                  </p>
                </motion.div>
              );
            })()}

            {/* Card 6 */}
            {(() => {
              const objective = 'Superar traumas';
              return (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`
                    bg-[#2A3B5A] rounded md:rounded-lg
                    cursor-pointer flex-shrink-0
                    w-full h-[166px] p-2
                    md:w-[282px] md:h-[184px] md:p-4
                    ${isSelected(objective) ? 'border-2 border-[#8494E9]' : ''}
                  `}
                  onClick={() => toggleObjective(objective)}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:space-x-2 mb-2">
                    <Image
                      src="/assets/icons/selfcare.svg"
                      alt={objective}
                      width={32}
                      height={32}
                      className="w-6 h-6 md:w-8 md:h-8 mx-auto md:mx-0"
                    />
                    <h3
                      className="
                                            font-fira-sans font-medium
                                            text-[12px] leading-[16px]
                                            mt-1 md:mt-0 text-center md:text-left
                                            md:text-[16px] md:leading-[20px]
                                        "
                    >
                      {objective}
                    </h3>
                  </div>
                  <p
                    className="
                                        font-fira-sans font-normal
                                        text-[10px] leading-[14px]
                                        text-center md:text-left
                                        md:text-[14px] md:leading-[18px]
                                    "
                  >
                    Trabalhar dores emocionais do passado, como abusos, violência e perdas. Construir resiliência e restaurar o bem-estar psicológico.
                  </p>
                </motion.div>
              );
            })()}

            {/* Card 7 */}
            {(() => {
              const objective = 'Mudança de hábitos';
              return (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`
                    bg-[#2A3B5A] rounded md:rounded-lg
                    cursor-pointer flex-shrink-0
                    w-full h-[166px] p-2
                    md:w-[282px] md:h-[184px] md:p-4
                    ${isSelected(objective) ? 'border-2 border-[#8494E9]' : ''}
                  `}
                  onClick={() => toggleObjective(objective)}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:space-x-2 mb-2">
                    <Image
                      src="/assets/icons/theraphy.svg"
                      alt={objective}
                      width={32}
                      height={32}
                      className="w-6 h-6 md:w-8 md:h-8 mx-auto md:mx-0"
                    />
                    <h3
                      className="
                                            font-fira-sans font-medium
                                            text-[12px] leading-[16px]
                                            mt-1 md:mt-0 text-center md:text-left
                                            md:text-[16px] md:leading-[20px]
                                        "
                    >
                      {objective}
                    </h3>
                  </div>
                  <p
                    className="
                                        font-fira-sans font-normal
                                        text-[10px] leading-[14px]
                                        text-center md:text-left
                                        md:text-[14px] md:leading-[18px]
                                    "
                  >
                    Lidar com compulsões, vícios, obsessões, procrastinação e automutilação. Desenvolver autocontrole e estratégias para hábitos mais saudáveis.
                  </p>
                </motion.div>
              );
            })()}

            {/* Card 8 */}
            {(() => {
              const objective = 'Identidade e inclusão';
              return (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`
                    bg-[#2A3B5A] rounded md:rounded-lg
                    cursor-pointer flex-shrink-0
                    w-full h-[166px] p-2
                    md:w-[282px] md:h-[184px] md:p-4
                    ${isSelected(objective) ? 'border-2 border-[#8494E9]' : ''}
                  `}
                  onClick={() => toggleObjective(objective)}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:space-x-2 mb-2">
                    <Image
                      src="/assets/icons/intrusive.svg"
                      alt={objective}
                      width={32}
                      height={32}
                      className="w-6 h-6 md:w-8 md:h-8 mx-auto md:mx-0"
                    />
                    <h3
                      className="
                                            font-fira-sans font-medium
                                            text-[12px] leading-[16px]
                                            mt-1 md:mt-0 text-center md:text-left
                                            md:text-[16px] md:leading-[20px]
                                        "
                    >
                      {objective}
                    </h3>
                  </div>
                  <p
                    className="
                                        font-fira-sans font-normal
                                        text-[10px] leading-[14px]
                                        text-center md:text-left
                                        md:text-[14px] md:leading-[18px]
                                    "
                  >
                    Explorar questões de gênero, sexualidade e pertencimento. Superar preconceitos, lidar com transições e fortalecer minha identidade.
                  </p>
                </motion.div>
              );
            })()}
          </motion.div>
          {/* Footer Navigation */}
          <motion.div
            className="flex justify-start items-center p-4 space-x-4 max-w-5xl md:max-w-7xl w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
          >
            <motion.button
              type="button"
              className="text-white hover:bg-gray-700 transition duration-300 px-4 py-2 rounded-lg cursor-pointer"
              onClick={handleBack}
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.97 }}
            >
              Anterior
            </motion.button>
            <motion.button
              type="button"
              className={`px-6 py-3 rounded-lg transition duration-300 ${
                selectedObjectives.length > 0
                  ? 'bg-white text-[#1A2A44] hover:bg-gray-200 cursor-pointer'
                  : 'bg-gray-400 text-gray-700 cursor-not-allowed'
              } min-w-[200px] md:min-w-0`} // <-- adicionado min-w-[200px] para mobile
              disabled={selectedObjectives.length === 0}
              onClick={handleAccess}
              whileHover={selectedObjectives.length > 0 ? { scale: 1.07 } : {}}
              whileTap={selectedObjectives.length > 0 ? { scale: 0.97 } : {}}
            >
              Acessar plataforma
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}

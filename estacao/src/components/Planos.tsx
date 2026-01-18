import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Plano } from '@/store/planoStore';
import { usePlanoById } from '@/hooks/planosHook';
import type { Planos } from '@/types/planosVendaTypes';
import { asTrustedHTML } from '@/utils/trustedTypes';

interface PlanosSectionProps {
  planos: Plano[];
  loading?: boolean;
}

export default function PlanosSection({ planos = [], loading }: PlanosSectionProps) {
  const router = useRouter();
  const { planos: planoAvulso } = usePlanoById('Unica');
  const planoTyped = React.useMemo(() => planoAvulso as Planos | undefined, [planoAvulso]);

  const normalize = React.useCallback((value?: string) =>
    (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
    []
  );

  const primeiraConsultaPlano = React.useMemo(() => {
    return planos.find((plano) => {
      const tipo = normalize(plano.Tipo || plano.Type);
      return tipo === "primeiraconsulta";
    });
  }, [planos, normalize]);

  const filteredPlanos = React.useMemo(() => {
    const blockedNames = ["primeira consulta", "consulta avulsa"];
    return planos.filter((plano) => {
      const nome = normalize(plano.Nome);
      const tipo = normalize(plano.Tipo || plano.Type);
      const isBlockedName = blockedNames.some((blocked) => nome.includes(blocked));
      const isTipoUnico = tipo === "unico" || tipo === "unica";
      const isTipoPrimeiraConsulta = tipo === "primeiraconsulta";
      return !isBlockedName && !isTipoUnico && !isTipoPrimeiraConsulta;
    });
  }, [planos, normalize]);

  const orderedPlanos = React.useMemo(() => {
    if (!filteredPlanos.length) return [];
    const destaqueIdx = filteredPlanos.findIndex(p => p.Destaque);
    if (destaqueIdx === -1) return filteredPlanos;
    const destaquePlano = filteredPlanos[destaqueIdx];
    const outros = filteredPlanos.filter((_, idx) => idx !== destaqueIdx);
    const meio = Math.floor(outros.length / 2);
    return [...outros.slice(0, meio), destaquePlano, ...outros.slice(meio)];
  }, [filteredPlanos]);

  const precoPrimeiraConsulta = React.useMemo(() => {
    if (primeiraConsultaPlano?.Preco != null) return primeiraConsultaPlano.Preco;
    if (planoTyped?.Preco != null) return planoTyped.Preco;
    return 0;
  }, [primeiraConsultaPlano, planoTyped]);

  const planoPrimeiraConsultaId = React.useMemo(() => {
    return primeiraConsultaPlano?.Id ?? planoTyped?.Id ?? '';
  }, [primeiraConsultaPlano, planoTyped]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="w-full bg-[#F7F8FA] py-20 mt-16 flex flex-col items-center relative overflow-x-hidden"
    >
      <section className="max-w-7xl w-full flex flex-col items-center px-4 md:px-8" aria-label="Planos de assinatura">
        <h2 className="font-fira-sans font-bold text-[48px] md:text-[56px] leading-[56px] md:leading-[72px] text-center text-[#262B58] mb-4">
          Conheça nossos planos
        </h2>
        <p className="font-normal text-[18px] md:text-[20px] leading-[28px] md:leading-[32px] text-center text-[#49525A] max-w-3xl mb-12">
          Encontre a melhor forma de manter o cuidado do seu bem-estar mental em dia. Todos os planos funcionam como uma assinatura, são cobradas mensalmente, ou seja, você não compromete todo o limite do seu cartão
        </p>

        {loading ? (
          <div className="text-center text-lg"></div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start justify-center mt-8 w-full max-w-7xl mx-auto">
            {(orderedPlanos || []).map((plano, index) => (
              <motion.div
                key={plano.Id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: plano.Destaque ? -12 : -8, scale: 1.03 }}
                className={`
                  relative bg-white rounded-2xl flex flex-col w-full max-w-[380px] mx-auto
                  md:w-[380px] md:max-w-[380px]
                  overflow-hidden group transition-all duration-300
                  ${plano.Destaque 
                    ? "pt-20 pb-8 shadow-2xl z-10 md:-mt-16 min-h-[720px] border-2 border-[#6D75C0]" 
                    : "pt-8 pb-8 shadow-lg border border-[#E4E4E7] hover:border-[#2A6EEA]/40 hover:shadow-xl min-h-[600px]"
                  }
                `}
              >
                {/* Recommended Badge */}
                {plano.Destaque && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-0 left-0 right-0 flex items-center justify-center h-12 px-4 bg-[#6D75C0] text-white text-base font-bold rounded-t-2xl"
                  >
                    Recomendado
                  </motion.div>
                )}

                {/* Content */}
                <div className={`relative z-10 px-6 flex flex-col flex-1 ${plano.Destaque ? 'pt-12' : 'py-2'}`}>
                  {/* Plan Name */}
                  <h3 className="text-2xl md:text-3xl font-bold mb-6 text-center text-[#22223B]">
                    {plano.Nome}
                  </h3>
                  
                  {/* Price */}
                  <div className="flex items-baseline justify-center mb-8">
                    <span className="text-4xl md:text-5xl font-bold text-[#2A6EEA]">
                      R$ {(plano.Preco || 0).toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-lg md:text-xl text-[#6C6C80] ml-2">/ mês</span>
                  </div>
                  
                  {/* Features List */}
                  <ul className="text-[#6C6C80] text-base md:text-lg space-y-3 mb-8 flex-1">
                    {(plano.Descricao || []).map((desc, i) => {
                      const isTudoSobre = desc.toLowerCase().includes('tudo sobre');
                      return (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                          className={`flex items-start gap-3 group/item ${isTudoSobre ? 'font-semibold' : ''}`}
                        >
                          {!isTudoSobre && (
                            <div className="mt-0.5 flex-shrink-0 w-5 h-5 md:w-6 md:h-6 text-[#2A6EEA] flex items-center justify-center group-hover/item:scale-110 transition-transform">
                              <Check className="w-5 h-5 md:w-6 md:h-6" strokeWidth="2.5" />
                            </div>
                          )}
                          <span className={`leading-relaxed flex-1 ${isTudoSobre ? 'ml-0' : ''}`} dangerouslySetInnerHTML={{ __html: asTrustedHTML(desc) }} />
                        </motion.li>
                      );
                    })}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="w-full flex flex-col items-center mt-16">
          <span className="text-[#49525A] text-lg md:text-xl font-normal mb-6 text-center">
            Agende agora sua sessão experimental por apenas <span className="text-[#2A6EEA] font-bold text-xl md:text-2xl">R$ {precoPrimeiraConsulta.toFixed(2).replace('.', ',')}</span> e conheça nossa plataforma
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-[#6C6CE5] hover:bg-[#2A6EEA] text-white font-bold rounded-lg px-10 py-4 mt-2 shadow-lg transition-colors text-lg md:text-xl cursor-pointer"
            aria-label="Adquirir primeira sessão experimental"
            onClick={() => {
              if (!planoPrimeiraConsultaId) return;
              // Todos os caminhos convergem para /comprar-consulta
              router.push(`/comprar-consulta?planoId=${planoPrimeiraConsultaId}`);
            }}
          >
            Adquirir primeira sessão agora
          </motion.button> 
        </div>
      </section>
    </motion.div>
  );
}

"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import { Check } from 'lucide-react';
import { Plano } from '@/store/planoStore';
import { usePrimeiraCompra } from '@/hooks/primeiraConsultaHook';
import { useUserPlano } from '@/hooks/useHook';

interface PlanosSectionProps {
  planos: Plano[];
  loading?: boolean;
}

export default function PlanosPacienteSection({ planos = [], loading }: PlanosSectionProps) {
  // Hook para buscar planos do paciente
  const { userPlanoData: planosAtivos } = useUserPlano();
  const { primeiraCompra } = usePrimeiraCompra();

  const normalize = React.useCallback((value?: string): string => {
    return (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }, []);

  // DEBUG: Log all planos with their normalized values
  React.useEffect(() => {
    if (planos.length > 0) {
      console.log('=== PLANOS RECEBIDOS ===');
      planos.forEach((p, idx) => {
        console.log(`Plano ${idx}:`, {
          Nome: p.Nome,
          NomeNormalizado: normalize(p.Nome),
          Tipo: p.Tipo,
          Type: p.Type,
          TipoNormalizado: normalize(p.Tipo || p.Type),
          Destaque: p.Destaque,
          Id: p.Id,
          Preco: p.Preco
        });
      });
    }
  }, [planos, normalize]);

  // Busca o plano com tipo PrimeiraConsulta ou Unica (para mostrar o preço)
  const planoPrimeiraConsulta = React.useMemo<Plano | undefined>(() => {
    if (!planos || planos.length === 0) return undefined;
    
    // Tenta encontrar por múltiplos critérios
    const found = planos.find((p: Plano) => {
      if (!p) return false;
      
      const tipo = normalize(p.Tipo || p.Type || "");
      const nome = normalize(p.Nome || "");
      
      // Critério 1: Tipo exato (case insensitive)
      if (tipo === "primeiraconsulta" || tipo === "unica") return true;
      
      // Critério 2: Tipo original (case sensitive) - PrimeiraConsulta ou Unica
      const tipoOriginal = (p.Tipo || p.Type || "").trim();
      if (tipoOriginal === "PrimeiraConsulta" || tipoOriginal === "Unica") return true;
      
      // Critério 3: Nome contém "primeira consulta"
      if (nome.includes("primeira") && nome.includes("consulta")) return true;
      
      return false;
    });
    
    return found;
  }, [planos, normalize]);

  // Busca o plano com tipo Avulsa ou Unico (para mostrar o preço das consultas avulsas)
  const planoConsultaAvulsa = React.useMemo<Plano | undefined>(() => {
    if (!planos || planos.length === 0) return undefined;
    
    // Tenta encontrar por múltiplos critérios
    const found = planos.find((p: Plano) => {
      if (!p) return false;
      
      const tipo = normalize(p.Tipo || p.Type || "");
      const nome = normalize(p.Nome || "");
      const tipoOriginal = (p.Tipo || p.Type || "").trim();
      
      // Critério 1: Tipo exato (case insensitive)
      if (tipo === "avulsa" || tipo === "unico") return true;
      
      // Critério 2: Tipo original (case sensitive) - Avulsa
      if (tipoOriginal === "Avulsa") return true;
      
      // Critério 3: Nome contém "avulsa"
      if (nome.includes("avulsa")) return true;
      
      return false;
    });
    
    return found;
  }, [planos, normalize]);

  // Filtragem dos planos - OCULTANDO PrimeiraConsulta, Unica, Unico e Avulsa
  const planosFiltrados = React.useMemo<Plano[]>(() => {
    return planos.filter((p: Plano) => {
      if (!p) return false;
      
      const tipo = normalize(p.Tipo || p.Type || "");
      const tipoOriginal = (p.Tipo || p.Type || "").trim();
      const nome = normalize(p.Nome || "");
      
      // Lista de nomes bloqueados
      const blockedNames = ["primeira consulta", "consulta avulsa", "consulta promocional"];
      const isBlockedName = blockedNames.some(blocked => nome.includes(blocked));
      
      // Verifica tipo normalizado
      const isTipoUnico = tipo === "unico" || tipo === "unica";
      const isTipoPrimeiraConsulta = tipo === "primeiraconsulta";
      const isTipoAvulsa = tipo === "avulsa";
      
      // Verifica tipo original (case sensitive)
      const isTipoOriginalPrimeiraConsulta = tipoOriginal === "PrimeiraConsulta";
      const isTipoOriginalUnica = tipoOriginal === "Unica";
      const isTipoOriginalAvulsa = tipoOriginal === "Avulsa";
      
      // Se está bloqueado, filtra fora
      if (isBlockedName || 
          isTipoUnico || 
          isTipoPrimeiraConsulta || 
          isTipoAvulsa ||
          isTipoOriginalPrimeiraConsulta ||
          isTipoOriginalUnica ||
          isTipoOriginalAvulsa) {
        return false;
      }
      
      return true;
    });
  }, [planos, normalize]);

  // Ordenação dos planos - Coloca destaque NO MEIO
  const orderedPlanos = React.useMemo<Plano[]>(() => {
    if (!planosFiltrados || planosFiltrados.length === 0) return [];
    
    // Se há apenas 1 plano, retorna logo
    if (planosFiltrados.length === 1) return planosFiltrados;
    
    // Separa o plano com destaque
    const destaquePlano = planosFiltrados.find((p: Plano) => p.Destaque === true);
    
    // Se não houver destaque, retorna os planos como estão
    if (!destaquePlano) {
      return planosFiltrados;
    }
    
    // Remove o destaque da lista
    const outros = planosFiltrados.filter((p: Plano) => p.Destaque !== true);
    
    // Se não houver outros planos além do destaque, retorna apenas o destaque
    if (outros.length === 0) {
      return [destaquePlano];
    }
    
    // Calcula o meio exato
    const meio = Math.floor(outros.length / 2);
    
    // Monta a nova ordem com destaque no meio
    const resultado: Plano[] = [
      ...outros.slice(0, meio),
      destaquePlano,
      ...outros.slice(meio)
    ];
    
    return resultado;
  }, [planosFiltrados]);

  React.useEffect(() => {
    if (planosFiltrados.length > 0) {
      console.log('=== PLANOS FILTRADOS ===', planosFiltrados.map(p => ({
        Nome: p.Nome,
        NomeNormalizado: normalize(p.Nome),
        Tipo: p.Tipo,
        TipoNormalizado: normalize(p.Tipo || p.Type),
        Destaque: p.Destaque,
        Id: p.Id
      })));
    }
  }, [planosFiltrados, normalize]);

  React.useEffect(() => {
    if (orderedPlanos.length > 0) {
      console.log('=== PLANOS ORDENADOS ===', orderedPlanos.map(p => ({
        Nome: p.Nome,
        NomeNormalizado: normalize(p.Nome),
        Tipo: p.Tipo,
        TipoNormalizado: normalize(p.Tipo || p.Type),
        Destaque: p.Destaque,
        Id: p.Id
      })));
    }
  }, [orderedPlanos, normalize]);


  const router = useRouter();
  const handleNavigate = (url: string) => router.push(url);

  // Tipo para plano ativo do usuário
  type PlanoAtivoType = {
    Status: string;
    PlanoAssinatura?: {
      Nome?: string;
      Id?: string;
    };
  };

  // Filtra apenas planos ativos
  const planosAtivosFiltrados = React.useMemo(() => {
    if (!planosAtivos || !Array.isArray(planosAtivos)) return [];
    return planosAtivos.filter((p: PlanoAtivoType) => 
      p.Status === "Ativo" && 
      p.PlanoAssinatura && 
      p.PlanoAssinatura.Nome
    );
  }, [planosAtivos]);

  // Plano ativo principal (o mais recente ou primeiro)
  const planoAtivoPrincipal = React.useMemo(() => {
    if (!planosAtivosFiltrados || planosAtivosFiltrados.length === 0) return null;
    // Retorna o primeiro plano ativo (ou pode ordenar por DataInicio se necessário)
    return planosAtivosFiltrados[0];
  }, [planosAtivosFiltrados]);


  // Utilitário para renderizar lista de benefícios
  const renderDescricao = (descricao?: string[], extra?: React.ReactNode): React.ReactElement => (
    <ul className="fira-sans text-[16px] md:text-base text-[#49525A] flex flex-col gap-3 mb-6 pl-2">
      {descricao?.map((desc: string, i: number) => (
        <li key={i} className="flex items-start gap-2">
          <span dangerouslySetInnerHTML={{ __html: desc }} />
        </li>
      ))}
      {extra}
    </ul>
  );

  return (
    <>
      {/* Exibe o plano ativo do paciente, se houver */}
      {planoAtivoPrincipal && planoAtivoPrincipal.PlanoAssinatura && (
        <motion.div
          className="w-full flex justify-center mb-6 mt-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-[#E5E9FA] rounded-lg px-6 py-3 text-[#444D9D] font-semibold text-lg shadow">
            Você possui o plano: <span className="font-bold">{planoAtivoPrincipal.PlanoAssinatura.Nome}</span>
          </div>
        </motion.div>
      )}
      
      {/* Card de primeira compra só aparece se não comprou e se o plano existe */}
      {primeiraCompra && primeiraCompra.jaComprou === false && planoPrimeiraConsulta && planoPrimeiraConsulta.Preco && (
        <motion.div
          className="w-full bg-[#E5E9FA] py-12 mb-10"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="w-full max-w-[1440px] mx-auto px-4 md:px-24 flex flex-col gap-8 items-start">
            <h3 className="fira-sans font-bold text-[28px] md:text-2xl text-[#22223B] mb-2">Primeira consulta promocional</h3>
            <p className="fira-sans text-[16px] md:text-base text-[#49525A] mb-2">
              Aproveite sua primeira consulta por
              <span className="font-bold"> R$ {planoPrimeiraConsulta.Preco.toFixed(2).replace('.', ',')}</span>.<br />
              Ao adquirir você:
            </p>
            {renderDescricao(
              planoPrimeiraConsulta?.Descricao,
              <>
                <li className="flex items-start gap-2">
                  <span className="fira-sans text-[16px] leading-[24px] text-[#49525A]">
                    Consulta de 50min com o profissional da sua escolha;
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="fira-sans text-[16px] leading-[24px] text-[#49525A]">
                    Validade de 30 dias após a compra;
                  </span>
                </li>
              </>
            )}
            <button
              className="min-w-[180px] max-w-full h-[48px] px-6 border border-[#6D75C0] rounded-lg fira-sans text-[18px] leading-[28px] text-[#6D75C0] transition-colors cursor-pointer whitespace-nowrap bg-transparent hover:bg-[#6D75C0] hover:text-white"
              onClick={() => handleNavigate(`/painel/comprar-consulta/${planoPrimeiraConsulta.Id}`)}
            >
              Comprar primeira consulta
            </button>
          </div>
        </motion.div>
      )}
      <motion.section
        className="w-full py-20 flex flex-col items-center overflow-x-hidden"
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="w-full max-w-[1440px] mx-auto flex flex-col items-center px-4 md:px-8">
          {/* titulo */}
          <motion.h2
            className="font-semibold text-[48px] md:text-[56px] leading-[56px] md:leading-[72px] text-center text-[#49525A] mb-4"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .5 }}
          >
            Conheça nossos planos
          </motion.h2>
          <motion.p
            className="text-[18px] md:text-[20px] leading-[28px] md:leading-[32px] text-center text-[#49525A] max-w-3xl mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .5, delay:.1 }}
          >
            Encontre a melhor forma de manter o cuidado do seu bem-estar mental em dia. Todos os planos funcionam como uma assinatura.
          </motion.p>
          {loading ? (
            <div className="text-center text-lg"></div>
          ) : orderedPlanos.length === 0 ? (
            <div className="text-center text-lg text-[#6C6C80] mt-8">
              Nenhum plano disponível no momento.
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start justify-center mt-8 w-full max-w-7xl fira-sans">
              {orderedPlanos.map((plano: Plano, index: number) => {
                  // Extra safety check: skip if it's Primeira Consulta or Consulta Avulsa
                  const nomeNormalizado = normalize(plano.Nome || "");
                  const tipoNormalizado = normalize(plano.Tipo || plano.Type || "");
                  const tipoOriginal = (plano.Tipo || plano.Type || "").trim();
                  const blockedNames = ["primeira consulta", "consulta avulsa", "consulta promocional"];
                  const blockedTypes = ["primeiraconsulta", "unico", "unica", "avulsa"];
                  const blockedTypesOriginal = ["PrimeiraConsulta", "Unica", "Avulsa"];
                  
                  if (blockedNames.some(blocked => nomeNormalizado.includes(blocked)) || 
                      blockedTypes.some(blocked => tipoNormalizado === blocked) ||
                      blockedTypesOriginal.some(blocked => tipoOriginal === blocked)) {
                    return null;
                  }

                  // Verifica se o paciente já possui algum plano ativo igual ao exibido
                  // Compara por Nome e também por Id do PlanoAssinatura para garantir
                  const jaPossuiPlano = planosAtivosFiltrados?.some((p: PlanoAtivoType) => {
                    if (!p.PlanoAssinatura) return false;
                    // Compara por nome (case insensitive) ou por ID
                    const nomeIgual = p.PlanoAssinatura.Nome?.toLowerCase() === plano.Nome?.toLowerCase();
                    const idIgual = p.PlanoAssinatura.Id === plano.Id;
                    return nomeIgual || idIgual;
                  });

                  // Determina o alinhamento vertical baseado na posição
                  const isDestaque = plano.Destaque;

                  return (
                    <motion.div
                      key={plano.Id}
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ y: isDestaque ? -12 : -8, scale: 1.03 }}
                      className={`
                        relative bg-white rounded-2xl flex flex-col w-full max-w-[380px] md:w-[380px] md:max-w-[380px]
                        overflow-hidden group fira-sans transition-all duration-300
                        ${isDestaque 
                          ? "pt-20 pb-8 shadow-2xl md:z-10 md:-mt-16 min-h-[720px] border-2 border-[#6D75C0]" 
                          : "pt-8 pb-8 shadow-lg border border-[#E4E4E7] hover:border-[#2A6EEA]/40 hover:shadow-xl min-h-[600px]"
                        }
                      `}
                    >
                      {/* Recommended Badge */}
                      {isDestaque && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute top-0 left-0 right-0 flex items-center justify-center h-12 px-4 bg-[#6D75C0] text-white fira-sans font-bold text-base rounded-t-2xl"
                        >
                          Recomendado
                        </motion.div>
                      )}
                      
                      {/* Content */}
                      <div className={`relative z-10 px-6 flex flex-col flex-1 ${isDestaque ? 'pt-12' : 'py-2'}`}>
                        {/* Plan Name */}
                        <h3 className="text-2xl md:text-3xl fira-sans font-bold mb-6 text-center text-[#22223B]">
                          {plano.Nome}
                        </h3>
                        
                        {/* Price */}
                        <div className="flex items-baseline justify-center mb-8">
                          <span className="text-4xl md:text-5xl font-bold text-[#2A6EEA] fira-sans">
                            R$ {(plano.Preco || 0).toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-lg md:text-xl text-[#6C6C80] ml-2">/ mês</span>
                        </div>
                        
                        {/* Features List */}
                        {plano.Descricao && plano.Descricao.length > 0 && (
                          <ul className="text-[#6C6C80] text-base md:text-lg space-y-3 mb-8 flex-1">
                            {(Array.isArray(plano.Descricao) ? plano.Descricao : [String(plano.Descricao || '')]).map((desc: string, i: number) => {
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
                                  <span className={`leading-relaxed flex-1 ${isTudoSobre ? 'ml-0' : ''}`} dangerouslySetInnerHTML={{ __html: desc }} />
                                </motion.li>
                              );
                            })}
                          </ul>
                        )}
                        
                        {/* Oculta o botão se o paciente já possui o plano ativo */}
                        {!jaPossuiPlano && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-[#6C6CE5] hover:bg-[#2A6EEA] text-white font-bold rounded-lg px-8 py-4 shadow-lg transition-colors text-lg md:text-xl cursor-pointer mx-auto mt-auto"
                            onClick={() => handleNavigate(`/painel/checkout-planos/${plano.Id}`)}
                          >
                            Adquirir agora
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )}
        </div>
      </motion.section>
      {/* Card de compra avulsa - só aparece se o plano existe */}
      {planoConsultaAvulsa && planoConsultaAvulsa.Preco && (
        <motion.div
          className="w-full bg-[#E5E9FA] py-8 md:py-12 mb-0"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 lg:px-24 flex flex-col gap-6 md:gap-8 items-center md:items-start">
            <h3 className="fira-sans font-bold text-[28px] sm:text-[32px] md:text-[36px] text-[#22223B] mb-4 text-center md:text-left">Consultas avulsas</h3>
            <p className="fira-sans text-[17px] sm:text-[18px] md:text-[20px] leading-relaxed text-[#49525A] mb-4 text-center md:text-left">
              Caso prefira você também pode efetuar a compra da sua consulta de forma avulsa, no valor de
              <span className="block w-fit mx-auto md:mx-0 font-bold text-[#2A6EEA] text-[32px] sm:text-[36px] md:text-[42px] my-3">
                R$ {planoConsultaAvulsa.Preco.toFixed(2).replace('.', ',')}
              </span>
            <span className="block mt-3 font-semibold">Ao adquirir você:</span>
          </p>
          <ul className="fira-sans text-[17px] sm:text-[18px] md:text-[19px] leading-relaxed text-[#49525A] flex flex-col gap-3 sm:gap-4 mb-8">
            <li className="flex items-start gap-3">
              <span>Terá acesso a uma consulta de 50min com o profissional da sua escolha;</span>
            </li>
            <li className="flex items-start gap-3">
              <span>Tem até 30 dias, a partir da data da compra para realizar a consulta;</span>
            </li>
            <li className="flex items-start gap-3">
              <span>Pode adquirir quantas consultas quiser (só é importante se atentar à data de validade);</span>
            </li>
          </ul>
            <button
              className="w-full sm:w-[200px] h-[44px] sm:h-[48px] px-4 sm:px-6 border border-[#6D75C0] rounded-lg fira-sans text-[16px] sm:text-[18px] leading-[28px] text-[#6D75C0] transition-colors cursor-pointer bg-transparent hover:bg-[#6D75C0] hover:text-white"
              onClick={() => handleNavigate(`/painel/comprar-consulta/${planoConsultaAvulsa.Id}`)}
            >
              Comprar consulta
            </button>
          </div>
        </motion.div>
      )}
    </>
  );
}

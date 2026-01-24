
"use client";
import { motion } from "framer-motion";
import { formatarData } from '@/utils/validation';
import { useCreditoAvulso } from '@/hooks/useHook';
import type { CreditoAvulso } from '@/services/userAvulsoService';

export default function PainelCardConsultaAvulsa() {
  const { creditoAvulso, isCreditoAvulsoLoading } = useCreditoAvulso();

  if (isCreditoAvulsoLoading) {
    return (
      <motion.aside
        className="bg-[#F5F7FF] w-full max-w-full md:max-w-[384px] rounded-lg p-4 flex flex-col gap-4 border border-[#E6E9FF] opacity-100 mb-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <span>Carregando consulta avulsa...</span>
      </motion.aside>
    );
  }

  // Só exibe se houver crédito avulso válido
  // Verifica se é um array antes de usar métodos de array
  if (!creditoAvulso || !Array.isArray(creditoAvulso) || creditoAvulso.length === 0) {
    return null;
  }
  
  // Considera válida se: Status === 'Ativa', Quantidade > 0, e ValidUntil > data atual
  const agora = new Date();
  
  // Filtra TODOS os créditos válidos (Status Ativa, Quantidade > 0, ValidUntil > agora)
  const creditosValidos = creditoAvulso.filter((c: CreditoAvulso) => {
    if (c.Status !== 'Ativa' || c.Quantidade <= 0) {
      return false;
    }
    
    if (!c.ValidUntil) {
      return false;
    }
    
    const validUntil = new Date(c.ValidUntil);
    return !isNaN(validUntil.getTime()) && validUntil > agora;
  });
  
  // Se não houver créditos válidos, não exibe o card
  if (creditosValidos.length === 0) {
    return null;
  }
  
  // Soma TODAS as quantidades dos créditos válidos
  const quantidadeTotal = creditosValidos.reduce((acc, c) => acc + c.Quantidade, 0);
  
  // Pega o ValidUntil mais próximo (que vence primeiro) para mostrar a data
  const validUntilMaisProximo = creditosValidos.reduce((maisProximo, c) => {
    if (!c.ValidUntil) return maisProximo;
    const validUntil = new Date(c.ValidUntil);
    if (!maisProximo || validUntil < new Date(maisProximo)) {
      return c.ValidUntil;
    }
    return maisProximo;
  }, null as string | null);
  
  if (!validUntilMaisProximo) {
    return null;
  }
  
  // Calcula dias restantes baseado no ValidUntil mais próximo
  const validUntilDate = new Date(validUntilMaisProximo);
  const diffMs = validUntilDate.getTime() - agora.getTime();
  const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  
  // Se houver crédito válido, exibe o card normalmente
  return (
    <motion.aside
    className="bg-[#F5F7FF] w-full max-w-full md:max-w-[384px] rounded-lg p-4 flex flex-col gap-4 md:gap-4 border border-[#E6E9FF] opacity-100 mb-6"
    initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[#232A5C] text-sm sm:text-base">Consultas</span>
          <span className="text-[#A3A8F7] font-medium text-sm sm:text-base" style={{ textTransform: "none" }}>
            Avulsas
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 min-w-fit sm:w-[180px] h-8 rounded px-3 py-1 bg-[#CFD6F7] flex-shrink-0">
          <span className="font-medium text-[#444D9D] text-xs sm:text-[14px] leading-6 align-middle">
            {quantidadeTotal}
          </span>
          <span className="text-[#444D9D] text-[10px] sm:text-[12px] leading-6 font-normal align-middle whitespace-nowrap">
            Consultas restantes
          </span>
        </div>
      </div>
      <p className="text-[#232A5C] text-sm">
        Você tem {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'} para usar {quantidadeTotal} {quantidadeTotal === 1 ? 'consulta' : 'consultas'} até {formatarData(validUntilMaisProximo)}
      </p>
    </motion.aside>
  );
}

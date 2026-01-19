"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import ModalAvaliacoesPsicologo from "./ModalAvaliacoesPsicologo";
import ModalConsultasPendentes from "./ModalConsultasPendentes";
import ModalOcupacaoAgenda from "./ModalOcupacaoAgenda";
import ModalConsultasMes from "./ModalConsultasMes";
import { useObterTaxaOcupacao } from "@/hooks/psicologos/consultas.hook";

type Props = {
  calculoPagamento: { totalPagamento?: number } | null;
  consultasPendentes: { totalPendentes?: number } | null;
  taxaOcupacao: { percentualOcupacao?: number };
  consultasNoMes?: number;
  ratingAverage?: number;
  ratingCount?: number;
  ratingLoading?: boolean;
};

export default function PainelCardsPsicologo({
  calculoPagamento,
  consultasPendentes,
  taxaOcupacao: taxaOcupacaoProp,
  consultasNoMes = 0,
  ratingAverage = 0,
  ratingCount = 0,
  ratingLoading = false,
}: Props) {
  const [modalAvaliacoes, setModalAvaliacoes] = useState(false);
  const [modalConsultasPendentes, setModalConsultasPendentes] = useState(false);
  const [modalOcupacao, setModalOcupacao] = useState(false);
  const [modalConsultasMes, setModalConsultasMes] = useState(false);

  const mediaFormatada = useMemo(() => ratingAverage.toFixed(1), [ratingAverage]);
  const ratingCountLabel = useMemo(
    () => (ratingLoading ? "..." : ratingCount.toLocaleString("pt-BR")),
    [ratingCount, ratingLoading]
  );
  
  // Busca taxa de ocupação atualizada para garantir que o percentual esteja sempre atualizado
  const { taxaOcupacao: taxaOcupacaoHook, refetch: refetchTaxaOcupacao } = useObterTaxaOcupacao();
  
  // Usa o valor do hook se disponível, senão usa a prop
  const taxaOcupacao = taxaOcupacaoHook?.percentualOcupacao !== undefined 
    ? taxaOcupacaoHook 
    : taxaOcupacaoProp;
  return (
    <>
      {/* Desktop - Layout: Total a receber (maior) + Consultas no mês (menor) topo, 3 cards embaixo */}
      <div className="hidden lg:grid lg:grid-cols-6 gap-4 mb-4 w-full">
        {/* Primeira linha: Total a receber (4 colunas) + Consultas no mês (2 colunas) */}
        {/* Card 1: Total a Receber - Mais largo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="col-span-4 bg-[#FCFBF6] rounded-[8px] border border-gray-300 p-4 sm:p-6 flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-2">
            <Image src="/icons/union.svg" alt="Total a Receber" width={20} height={20} className="sm:w-6 sm:h-6" />
            <h2 className="text-xs font-medium text-[#26220D] font-fira-sans">Total a receber</h2>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xl sm:text-2xl font-semibold text-green-600 font-fira-sans">
              R$ {calculoPagamento && typeof calculoPagamento.totalPagamento === "number"
                ? calculoPagamento.totalPagamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                : "0,00"}
            </p>
            <Link href="/painel-psicologo/financeiro" className="flex items-center gap-1 text-xs text-[#6D75C0] ml-2 font-fira-sans font-bold hover:text-[#6B7DD8] hover:underline cursor-pointer flex-shrink-0 transition">
              <Image src="/icons/olho-detalhes.svg" alt="Ver detalhes" width={14} height={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Ver detalhes</span>
            </Link>
          </div>
        </motion.div>
        {/* Card 2: Consultas no mês - Mesmo tamanho dos cards de baixo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="col-span-2 bg-[#FCFBF6] rounded-[8px] border border-gray-300 p-4 sm:p-6 flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-2">
            <Image src="/icons/camera.svg" alt="Consultas no mês" width={20} height={20} className="sm:w-6 sm:h-6" />
            <h2 className="text-xs font-medium text-[#26220D] font-fira-sans">Consultas no mês</h2>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xl sm:text-2xl font-semibold text-[#7FBDCC] font-fira-sans">
              {typeof consultasNoMes === "number" ? consultasNoMes.toLocaleString("pt-BR") : "0"}
            </p>
            <button
              onClick={() => setModalConsultasMes(true)}
              className="flex items-center gap-1 text-xs text-[#6D75C0] ml-2 font-fira-sans font-bold hover:text-[#6B7DD8] hover:underline cursor-pointer flex-shrink-0 transition"
            >
              <Image src="/icons/olho-detalhes.svg" alt="Ver detalhes" width={14} height={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Ver detalhes</span>
            </button>
          </div>
        </motion.div>
        
        {/* Segunda linha: 3 cards (cada um ocupa 2 colunas) */}
        {/* Card 3: Suas avaliações */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="col-span-2 bg-[#FCFBF6] rounded-[8px] border border-gray-300 p-4 sm:p-6 flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-2">
            <Image src="/icons/estrela.svg" alt="Avaliações" width={20} height={20} className="sm:w-6 sm:h-6" />
            <h2 className="text-xs font-medium text-[#26220D] font-fira-sans">Suas avaliações</h2>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-xl sm:text-2xl font-semibold text-yellow-500 font-fira-sans">
                {ratingLoading ? "..." : mediaFormatada}
              </p>
              <span className="text-xs text-gray-500 font-fira-sans">
                {ratingCountLabel} avaliações
              </span>
            </div>
            <button
              onClick={() => setModalAvaliacoes(true)}
              className="flex items-center gap-1 text-xs text-[#6D75C0] ml-2 font-fira-sans hover:underline cursor-pointer flex-shrink-0"
            >
              <Image src="/icons/olho-detalhes.svg" alt="Ver detalhes" width={14} height={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Ver detalhes</span>
            </button>
          </div>
        </motion.div>
        {/* Card 4: Consultas pendentes */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="col-span-2 bg-[#FCFBF6] rounded-[8px] border border-gray-300 p-4 sm:p-6 flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-2">
            <Image src="/icons/calendar.svg" alt="Consultas Pendentes" width={20} height={20} className="sm:w-6 sm:h-6" />
            <h2 className="text-xs font-medium text-[#26220D] font-fira-sans">Consultas pendentes</h2>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xl sm:text-2xl font-semibold text-red-500 font-fira-sans">
              {typeof consultasPendentes?.totalPendentes === "number"
                ? consultasPendentes.totalPendentes.toLocaleString("pt-BR")
                : "0"}
            </p>
            <button
              onClick={() => setModalConsultasPendentes(true)}
              className="flex items-center gap-1 text-xs text-[#6D75C0] ml-2 font-fira-sans font-bold hover:text-[#6B7DD8] hover:underline cursor-pointer flex-shrink-0 transition"
            >
              <Image src="/icons/olho-detalhes.svg" alt="Ver detalhes" width={14} height={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Ver detalhes</span>
            </button>
          </div>
        </motion.div>
        {/* Card 5: Ocupação Agenda */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="col-span-2 bg-[#FCFBF6] rounded-[8px] border border-gray-300 p-4 sm:p-6 flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-2">
            <Image src="/icons/lap-timer.svg" alt="Ocupação Agenda" width={20} height={20} className="sm:w-6 sm:h-6" />
            <h2 className="text-xs font-medium text-[#26220D] font-fira-sans">Ocupação de agenda</h2>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xl sm:text-2xl font-semibold text-[#444D9D] font-fira-sans">
              {taxaOcupacao.percentualOcupacao && typeof taxaOcupacao.percentualOcupacao === "number"
                ? `${taxaOcupacao.percentualOcupacao.toLocaleString("pt-BR")}%`
                : "0%"}
            </p>
            <button
              onClick={() => setModalOcupacao(true)}
              className="flex items-center gap-1 text-xs text-[#6D75C0] ml-2 font-fira-sans font-bold hover:text-[#6B7DD8] hover:underline cursor-pointer flex-shrink-0 transition"
            >
              <Image src="/icons/olho-detalhes.svg" alt="Ver detalhes" width={14} height={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Ver detalhes</span>
            </button>
          </div>
        </motion.div>
      </div>
      {/* Mobile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="grid grid-cols-2 gap-4 lg:hidden"
      >
        {/* Card 1: Total a Receber */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-[8px] bg-[#FCFBF6] flex flex-col items-center text-center border border-gray-300 p-4"
        >
          <Image src="/icons/union.svg" alt="Total a Receber" width={32} height={32} className="mx-auto mb-2" />
          <h2 className="text-xs font-medium text-[#26220D] font-fira-sans">Total a receber</h2>
          <p className="text-2xl font-semibold text-green-600 font-fira-sans">
            R$ {calculoPagamento && typeof calculoPagamento.totalPagamento === "number"
              ? calculoPagamento.totalPagamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
              : "0,00"}
          </p>
          <Link href="/painel-psicologo/financeiro" className="mt-2 flex items-center gap-1 text-xs text-[#6D75C0] font-fira-sans">
            <Image src="/icons/olho-detalhes.svg" alt="Ver detalhes" width={16} height={16} />
            Ver detalhes
          </Link>
        </motion.div>
        {/* Card 2: Consultas no mês */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-[8px] bg-[#FCFBF6] flex flex-col items-center text-center border border-gray-300 p-4"
        >
          <Image src="/icons/camera.svg" alt="Consultas no mês" width={32} height={32} className="mx-auto mb-2" />
          <h2 className="text-xs font-medium text-[#26220D] font-fira-sans">Consultas no mês</h2>
          <p className="text-2xl font-semibold text-[#7FBDCC] font-fira-sans">
            {typeof consultasNoMes === "number" ? consultasNoMes.toLocaleString("pt-BR") : "0"}
          </p>
          <button
            onClick={() => setModalConsultasMes(true)}
            className="mt-2 flex items-center gap-1 text-xs text-[#6D75C0] font-fira-sans font-bold hover:text-[#6B7DD8] hover:underline cursor-pointer transition"
          >
            <Image src="/icons/olho-detalhes.svg" alt="Ver detalhes" width={16} height={16} />
            Ver detalhes
          </button>
        </motion.div>
        {/* Card 3: Suas avaliações */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-[8px] bg-[#FCFBF6] flex flex-col items-center text-center border border-gray-300 p-4"
        >
          <Image src="/icons/estrela.svg" alt="Avaliações" width={32} height={32} className="mx-auto mb-2" />
          <h2 className="text-xs font-medium text-[#26220D] font-fira-sans">Suas avaliações</h2>
          <p className="text-2xl font-semibold text-yellow-500 font-fira-sans">
            {ratingLoading ? "..." : mediaFormatada}
          </p>
          <span className="text-xs text-gray-500 font-fira-sans">
            {ratingCountLabel} avaliações
          </span>
          <button
            onClick={() => setModalAvaliacoes(true)}
            className="mt-2 flex items-center gap-1 text-xs text-[#6D75C0] font-fira-sans font-bold hover:text-[#6B7DD8] hover:underline cursor-pointer transition"
          >
            <Image src="/icons/olho-detalhes.svg" alt="Ver detalhes" width={16} height={16} />
            Ver detalhes
          </button>
        </motion.div>
        {/* Card 4: Consultas pendentes */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="rounded-[8px] bg-[#FCFBF6] flex flex-col items-center text-center border border-gray-300 p-4"
        >
          <Image src="/icons/calendar.svg" alt="Consultas Pendentes" width={32} height={32} className="mx-auto mb-2" />
          <h2 className="text-xs font-medium text-[#26220D] font-fira-sans">Consultas pendentes</h2>
          <p className="text-2xl font-semibold text-red-500 font-fira-sans">
            {typeof consultasPendentes?.totalPendentes === "number"
              ? consultasPendentes.totalPendentes.toLocaleString("pt-BR")
              : "0"}
          </p>
          <button
            onClick={() => setModalConsultasPendentes(true)}
            className="mt-2 flex items-center gap-1 text-xs text-[#6D75C0] font-fira-sans font-bold hover:text-[#6B7DD8] hover:underline cursor-pointer transition"
          >
            <Image src="/icons/olho-detalhes.svg" alt="Ver detalhes" width={16} height={16} />
            Ver detalhes
          </button>
        </motion.div>
        {/* Card 5: Ocupação Agenda */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="col-span-2 rounded-[8px] bg-[#FCFBF6] flex flex-col items-center text-center border border-gray-300 p-4"
        >
          <Image src="/icons/lap-timer.svg" alt="Ocupação Agenda" width={32} height={32} className="mx-auto mb-2" />
          <h2 className="text-xs font-medium text-[#26220D] font-fira-sans">Ocupação de agenda</h2>
          <p className="text-2xl font-semibold text-[#444D9D] font-fira-sans">
            {taxaOcupacao.percentualOcupacao && typeof taxaOcupacao.percentualOcupacao === "number"
              ? `${taxaOcupacao.percentualOcupacao.toLocaleString("pt-BR")}%`
              : "0%"}
          </p>
          <button
            onClick={() => setModalOcupacao(true)}
            className="mt-2 flex items-center gap-1 text-xs text-[#6D75C0] font-fira-sans font-bold hover:text-[#6B7DD8] hover:underline cursor-pointer transition"
          >
            <Image src="/icons/olho-detalhes.svg" alt="Ver detalhes" width={16} height={16} />
            Ver detalhes
          </button>
        </motion.div>
      </motion.div>

      {/* Modais */}
      <ModalAvaliacoesPsicologo
        isOpen={modalAvaliacoes}
        onClose={() => setModalAvaliacoes(false)}
      />
      <ModalConsultasPendentes
        isOpen={modalConsultasPendentes}
        onClose={() => setModalConsultasPendentes(false)}
      />
            <ModalOcupacaoAgenda
              isOpen={modalOcupacao}
              onClose={() => {
                setModalOcupacao(false);
                // Atualiza a taxa de ocupação quando o modal fechar
                refetchTaxaOcupacao();
              }}
            />
      <ModalConsultasMes
        isOpen={modalConsultasMes}
        onClose={() => setModalConsultasMes(false)}
      />
    </>
  );
}

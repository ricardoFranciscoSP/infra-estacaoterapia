"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Plano } from "@/store/planoStore";
import ModalContrato from "@/components/ModalContrato";
import { usePreviaContrato } from "@/hooks/user/userHook";
import { useEscapeKey } from "@/hooks/useEscapeKey";

export type MultaInfo = {
  aplica: boolean;
  valor: number;
  mensagem: string;
};

export interface ModalTrocaPlanoProps {
  open: boolean;
  planos: Plano[];
  planoAtualId?: string | null;
  planoAtualNome?: string | null;
  planoSelecionadoId: string;
  onSelectPlano: (planoId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  aceiteContrato: boolean;
  onToggleAceite: () => void;
  isMobile?: boolean;
  loading?: boolean;
  multaInfo?: MultaInfo;
}

const PlanoCard: React.FC<{
  plano: Plano;
  isAtual: boolean;
  isSelecionado: boolean;
  onSelect: (planoId: string) => void;
}> = ({ plano, isAtual, isSelecionado, onSelect }) => {
  // Garante que o plano atual nunca seja selecionado, mesmo que isSelecionado seja true
  const realmenteSelecionado = isSelecionado && !isAtual;
  
  // Garante que o plano atual nunca seja selecionado
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAtual) {
      return; // Não faz nada se for o plano atual
    }
    onSelect(plano.Id);
  };

  return (
    <button
      type="button"
      className={`w-full text-left border rounded-lg p-4 transition shadow-sm ${
        isAtual
          ? "bg-gray-100 border-gray-300 cursor-not-allowed opacity-70"
          : realmenteSelecionado
          ? "border-[#6366F1] ring-1 ring-[#6366F1] bg-white"
          : "border-gray-200 bg-white hover:shadow-md hover:border-[#6366F1]"
      } focus:outline-none ${isAtual ? "pointer-events-none" : ""}`}
      onClick={handleClick}
      disabled={isAtual}
      aria-pressed={realmenteSelecionado}
      aria-disabled={isAtual}
      tabIndex={isAtual ? -1 : 0}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={`text-base font-semibold ${isAtual ? "text-gray-500" : "text-[#1F2937]"}`}>
              {plano.Nome}
            </span>
            {isAtual && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-400 text-white font-medium">
                Plano atual
              </span>
            )}
          </div>
          <span className={`text-sm ${isAtual ? "text-gray-400" : "text-gray-600"}`}>
            {plano.Tipo ?? plano.Type}
          </span>
          <span className={`text-sm ${isAtual ? "text-gray-400" : "text-gray-500"}`}>
            {plano.Duracao} dias
          </span>
        </div>
        <div className="text-right">
          <span className={`text-lg font-bold ${isAtual ? "text-gray-400" : "text-[#111827]"}`}>
            R$ {plano.Preco.toFixed(2)}
          </span>
          {realmenteSelecionado && (
            <span className="block text-xs text-[#6366F1] font-semibold mt-1">✓ Selecionado</span>
          )}
        </div>
      </div>
      {Array.isArray(plano.Descricao) && plano.Descricao.length > 0 && (
        <ul className={`mt-3 text-sm list-disc list-inside space-y-1 ${isAtual ? "text-gray-400" : "text-gray-600"}`}>
          {plano.Descricao.slice(0, 3).map((beneficio) => (
            <li key={beneficio}>{beneficio}</li>
          ))}
        </ul>
      )}
    </button>
  );
};

const ModalContent: React.FC<Omit<ModalTrocaPlanoProps, "open" | "isMobile"> & {
  onOpenContrato: () => void;
}> = ({
  planos,
  planoAtualId,
  planoAtualNome,
  planoSelecionadoId,
  onSelectPlano,
  onConfirm,
  onClose,
  aceiteContrato,
  onToggleAceite,
  loading,
  multaInfo,
  onOpenContrato,
}) => {
  const isPlanoSelecionado = !!planoSelecionadoId && planoSelecionadoId !== planoAtualId;
  const isCheckboxDisabled = !isPlanoSelecionado;

  const alertaClasses = multaInfo?.aplica
    ? "bg-amber-50 border-amber-200 text-amber-800"
    : "bg-emerald-50 border-emerald-200 text-emerald-800";

  const handleCheckboxClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (!isCheckboxDisabled && !aceiteContrato) {
      onOpenContrato();
    } else if (aceiteContrato) {
      onToggleAceite();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className={`rounded-lg border p-3 text-sm ${alertaClasses}`}>
        <p className="font-semibold">Plano atual: {planoAtualNome ?? "-"}</p>
        <p className="mt-1">{multaInfo?.mensagem ?? "Sem multa. Mudança sem custo adicional."}</p>
        {multaInfo?.aplica && multaInfo.valor > 0 && (
          <p className="mt-1 font-semibold">Multa: R$ {multaInfo.valor.toFixed(2)}</p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-center text-base font-semibold text-[#111827]">
          Selecione o novo plano
        </p>
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {planos.map((plano) => {
            const isAtual = plano.Id === planoAtualId;
            // Garante que o plano atual nunca seja marcado como selecionado
            const isSelecionado = !isAtual && plano.Id === planoSelecionadoId && planoSelecionadoId !== planoAtualId;
            return (
              <PlanoCard
                key={plano.Id}
                plano={plano}
                isAtual={isAtual}
                isSelecionado={isSelecionado}
                onSelect={(planoId) => {
                  // Garante que não seleciona o plano atual
                  if (planoId && planoId !== planoAtualId) {
                    onSelectPlano(planoId);
                  }
                }}
              />
            );
          })}
        </div>
      </div>

      <label 
        className={`flex items-start gap-2 text-sm text-gray-700 select-none ${
          isCheckboxDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
        onClick={handleCheckboxClick}
      >
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1]"
          checked={aceiteContrato}
          onChange={(e) => {
            e.preventDefault();
            if (!isCheckboxDisabled && !aceiteContrato) {
              onOpenContrato();
            } else if (aceiteContrato) {
              onToggleAceite();
            }
          }}
          disabled={isCheckboxDisabled}
        />
        <span className={isCheckboxDisabled ? "text-gray-400" : ""}>
          Li e aceito o contrato atualizado do novo plano.
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={`relative overflow-hidden w-full h-11 rounded-lg text-white font-semibold text-base transition-all ${
            !isPlanoSelecionado || !aceiteContrato || loading || planoSelecionadoId === planoAtualId
              ? "bg-gray-400 cursor-not-allowed opacity-60"
              : "bg-[#6366F1] hover:bg-[#5a5fcf] cursor-pointer"
          }`}
          onClick={onConfirm}
          disabled={!isPlanoSelecionado || !aceiteContrato || loading || planoSelecionadoId === planoAtualId}
          style={{ pointerEvents: loading ? "none" : "auto" }}
        >
          <span className="relative z-10">
            {loading ? "Processando..." : "Confirmar mudança"}
          </span>
          {loading && (
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.9) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmerLoading 1.2s ease-in-out infinite",
              }}
            />
          )}
        </button>
        <button
          type="button"
          className="w-full h-11 rounded-lg border border-[#6366F1] text-[#6366F1] font-semibold text-base bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onClose}
          disabled={loading}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default function ModalTrocaPlano({ open, onClose, onConfirm, planos, planoAtualId, planoAtualNome, planoSelecionadoId, onSelectPlano, aceiteContrato, onToggleAceite, isMobile = false, loading = false, multaInfo }: ModalTrocaPlanoProps) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  const [modalContratoOpen, setModalContratoOpen] = useState(false);
  
  // Adiciona estilo de animação shimmer se não existir
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const styleId = 'shimmer-loading-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @keyframes shimmerLoading {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);
  // Garante que o plano selecionado não seja o plano atual
  const planoSelecionadoValido = planoSelecionadoId && planoSelecionadoId !== planoAtualId
    ? planos.find((p) => p.Id === planoSelecionadoId)
    : undefined;
  const planoSelecionado = planoSelecionadoValido;
  
  // Hook para buscar prévia do contrato quando um plano é selecionado
  // Só busca quando há um plano selecionado válido
  const { data: previaContratoData, isLoading: isLoadingPrevContrato, refetch } = usePreviaContrato(
    planoSelecionado || ({} as Plano)
  );

  // Reseta o estado quando o modal fecha
  useEffect(() => {
    if (!open) {
      setModalContratoOpen(false);
    }
  }, [open]);

  const handleOpenContrato = async () => {
    if (!planoSelecionado || planoSelecionado.Id === planoAtualId) {
      return;
    }
    // Força a busca do contrato com o plano selecionado
    if (refetch) {
      await refetch();
    }
    setModalContratoOpen(true);
  };

  // Garante que se o plano selecionado for o atual, limpa a seleção
  // Executa quando o modal abre ou quando o plano selecionado muda
  useEffect(() => {
    if (open && planoAtualId) {
      // Se o plano selecionado for o atual, substitui por outro
      if (planoSelecionadoId === planoAtualId) {
        const primeiroDisponivel = planos.find((p) => p.Id !== planoAtualId);
        if (primeiroDisponivel) {
          onSelectPlano(primeiroDisponivel.Id);
        } else {
          // Se não houver outro plano, limpa a seleção
          onSelectPlano("");
        }
      }
    }
  }, [open, planoSelecionadoId, planoAtualId, planos, onSelectPlano]);

  const handleCloseContrato = () => {
    setModalContratoOpen(false);
  };

  const handleConfirmContrato = async (assinaturaImg: string | null, contratoHtml: string) => {
    setModalContratoOpen(false);
    // Salva a assinatura no sessionStorage para usar no handleConfirmarMudarPlano
    sessionStorage.setItem('contratoAceito', 'true');
    sessionStorage.setItem('contratoAssinaturaImg', assinaturaImg ?? "");
    sessionStorage.setItem('contratoHtmlAssinado', contratoHtml ?? "");
    onToggleAceite();
  };

  // Desktop
  if (!isMobile) {
    return (
      <>
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="relative flex flex-col w-[760px] max-h-[90vh] rounded-[12px] bg-white border border-[#6366F1] shadow-xl"
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
              >
                <div className="flex items-center justify-center relative h-[56px] bg-[#6366F1] rounded-t-[12px] px-6">
                  <span className="text-white font-semibold text-lg">Mudar de Plano</span>
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={onClose}
                  aria-label="Fechar"
                  disabled={loading}
                >
                  ×
                </button>
                </div>

                <div className="p-6 overflow-y-auto">
                  <ModalContent
                    planos={planos}
                    planoAtualId={planoAtualId}
                    planoAtualNome={planoAtualNome}
                    planoSelecionadoId={planoSelecionadoId}
                    onSelectPlano={onSelectPlano}
                    onConfirm={onConfirm}
                    onClose={onClose}
                    aceiteContrato={aceiteContrato}
                    onToggleAceite={onToggleAceite}
                    loading={loading}
                    multaInfo={multaInfo}
                    onOpenContrato={handleOpenContrato}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Contrato */}
        <ModalContrato
          show={modalContratoOpen}
          onClose={handleCloseContrato}
          contratoUrl={previaContratoData}
          isLoading={isLoadingPrevContrato}
          emitirLoading={false}
          onConfirm={handleConfirmContrato}
        />
      </>
    );
  }

  // Mobile
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 bg-white z-50 flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="relative flex flex-col items-center p-4 border-b border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 text-xl font-bold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Fechar"
                disabled={loading}
              >
                ×
              </button>
              <span className="block text-base font-semibold text-gray-800 mb-1 text-center">
                Mudar de Plano
              </span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              <ModalContent
                planos={planos}
                planoAtualId={planoAtualId}
                planoAtualNome={planoAtualNome}
                planoSelecionadoId={planoSelecionadoId}
                onSelectPlano={onSelectPlano}
                onConfirm={onConfirm}
                onClose={onClose}
                aceiteContrato={aceiteContrato}
                onToggleAceite={onToggleAceite}
                loading={loading}
                multaInfo={multaInfo}
                onOpenContrato={handleOpenContrato}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Contrato */}
      <ModalContrato
        show={modalContratoOpen}
        onClose={handleCloseContrato}
        contratoUrl={previaContratoData}
        isLoading={isLoadingPrevContrato}
        emitirLoading={false}
        onConfirm={handleConfirmContrato}
      />
    </>
  );
}

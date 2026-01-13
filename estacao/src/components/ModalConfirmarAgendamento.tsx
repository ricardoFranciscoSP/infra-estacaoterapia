"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { toast } from "@/components/CustomToastProvider";
import useAgendamentoStore from "@/store/agendamentoStore";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface ModalConfirmarAgendamentoProps { 
  open: boolean;
  onClose: () => void;
  psicologo?: {
    nome: string;
    abordagem: string;
    imagem: string;
  };
  data?: string;
  hora?: string;
  agendaId?: string;
}

const observacoes = [
  "Na hora da sessão esteja sozinho(a) e em um lugar silencioso",
  "Use fones de ouvido para ter um bom áudio e mais privacidade",
  "Garanta na sessão que sua internet esteja boa e funcionando",
  "Você será lembrado da sua sessão quando estiver próxima",
  "Para sua segurança não será permitido sessões no carro ou trânsito",
  "Todos os horários das sessões seguem o fuso horário de Brasília",
  "Cancele ou reagende sua sessão com até 24 horas de antecedência",
  "A tolerância máxima para atrasos é de até 10 minutos",
];

const observacaoIcons = [
  "/icons/speaker-off.svg",
  "/icons/headset.svg",
  "/icons/wifi.svg",
  "/icons/exclamation-triangle.svg",
  "/icons/car_block.svg",
  "/icons/timer.svg",
  "/icons/calendar_block.svg",
  "/icons/lap-timer.svg",
];

function formatarData(dataISO?: string) {
  if (!dataISO) return "";
  const data = new Date(dataISO);
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function ModalConfirmarAgendamento({
  open,
  onClose,
  psicologo,
  data,
  hora,
  agendaId,
}: ModalConfirmarAgendamentoProps) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  
  const [loading, setLoading] = useState(false);
  const criarAgendamento = useAgendamentoStore((state) => state.criarAgendamento);

  if (!open || !psicologo || !data || !hora) return null;

  // Definir imagem do psicólogo ou placeholder
  const imagemPsicologo = psicologo.imagem && psicologo.imagem.trim() !== "" ? psicologo.imagem : "/assets/avatar-placeholder.svg";

  const handleConfirm = async () => {
    if (!agendaId) {
      toast.error("ID do agendamento não encontrado. Tente novamente.");
      return;
    }

    setLoading(true);
    try {
      await criarAgendamento(agendaId);
      toast.success("Agendamento realizado com sucesso! Em breve sua consulta ficará visível em seu painel.");
      
      // Fecha o modal após um pequeno delay para o usuário ver o toast
      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Erro ao confirmar agendamento:", err);
      
      // Tenta identificar o tipo de erro vindo do backend
      const errObj = err as { response?: { data?: { message?: string; error?: string }; status?: number } };
      const msg = errObj?.response?.data?.message || errObj?.response?.data?.error;
      const status = errObj?.response?.status;
      
      // Verifica se é erro de saldo insuficiente
      if (msg && (/saldo|saldo de consultas|não possui saldo/i.test(String(msg)) || status === 400)) {
        toast.error(
          "Você não possui saldo de consultas disponível. Para agendar uma nova consulta, é necessário adquirir um plano ou consulta avulsa."
        );
      } 
      // Verifica se é conflito de horário
      else if (msg && /conflit|conflito|mesmo horário|já possui/i.test(String(msg))) {
        toast.error("Não foi possível agendar: já existe uma consulta nesse horário.");
      } 
      // Erro genérico
      else {
        toast.error(msg || "Não foi possível concluir o agendamento. Tente novamente.");
      }
      
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.3)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative bg-white rounded-lg shadow-lg flex flex-col"
            style={{
              width: 792,
              height: 568,
              opacity: 1,
            }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-center px-8 relative"
              style={{
                width: 792,
                height: 56,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                background: "#8494E9",
              }}
            >
              <span className="text-white text-lg font-semibold text-center w-full">
                Confirmar agendamento?
              </span>
              <button
                className="absolute right-8 text-white text-2xl font-bold hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onClose}
                aria-label="Fechar"
                disabled={loading}
              >
                ×
              </button>
            </div>
            {/* Conteúdo */}
            <div className="px-8 py-6">
              <div className="flex items-center gap-4 mb-4">
                <Image
                  src={imagemPsicologo}
                  alt={psicologo.nome}
                  className="w-16 h-16 rounded-full object-cover"
                  width={64}
                  height={64}
                />
                <div>
                  <div className="font-semibold text-[#262B58] text-lg">{psicologo.nome}</div>
                  <div className="flex gap-4 mt-2 text-sm text-[#262B58]">
                    <span>
                      <b>Data:</b> {formatarData(data)}
                    </span>
                    <span>
                      <b>Horário:</b> {hora}
                    </span>
                  </div>
                </div>
              </div>
              {/* Observações */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {observacoes.map((obs, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-start"
                    style={{
                      width: 172,
                      height: 144,
                      borderRadius: 8,
                      gap: 8,
                      opacity: 1,
                      borderWidth: 1,
                      borderColor: "#444D9D",
                      background: "#444D9D",
                      paddingTop: 16,
                      paddingRight: 8,
                      paddingBottom: 16,
                      paddingLeft: 8,
                    }}
                  >
                    {/* Ícone centralizado acima do texto */}
                    <div className="flex items-center justify-center mb-2 mt-1">
                      <Image
                        src={observacaoIcons[idx]}
                        alt=""
                        className="w-8 h-8 object-contain"
                        width={32}
                        height={32}
                        draggable={false}
                      />
                    </div>
                    <div
                      className="flex-1 flex items-center justify-center text-center"
                      style={{
                        fontWeight: 400,
                        fontStyle: "normal",
                        fontSize: 14,
                        lineHeight: "24px",
                        letterSpacing: 0,
                        color: "#FCFBF6",
                        width: "100%",
                        verticalAlign: "middle",
                      }}
                    >
                      {obs}
                    </div>
                  </div>
                ))}
              </div>
              {/* Botões */}
              <div className="flex justify-end gap-4 mt-8">
                <button
                  className="w-[345px] h-12 rounded-[8px] border border-[#6D75C0] px-6 flex items-center justify-center text-[#262B58] font-semibold bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    gap: 12,
                    opacity: 1,
                  }}
                  onClick={onClose}
                  disabled={loading}
                  // hover: borda e texto azul mais escuro, fundo levemente azul
                  onMouseOver={e => {
                    if (!loading) {
                      (e.currentTarget as HTMLButtonElement).style.background = "#E0E3FF";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#262B58";
                      (e.currentTarget as HTMLButtonElement).style.color = "#262B58";
                    }
                  }}
                  onMouseOut={e => {
                    if (!loading) {
                      (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#6D75C0";
                      (e.currentTarget as HTMLButtonElement).style.color = "#262B58";
                    }
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="w-[345px] h-12 rounded-[8px] px-6 flex items-center justify-center text-white font-semibold transition disabled:cursor-not-allowed"
                  style={{
                    gap: 12,
                    opacity: loading ? 0.8 : 1,
                    background: loading ? "#4b51a2" : "#8494E9",
                  }}
                  onClick={handleConfirm}
                  disabled={loading}
                  // hover: fundo azul mais escuro (só quando não estiver em loading)
                  onMouseOver={e => {
                    if (!loading) {
                      (e.currentTarget as HTMLButtonElement).style.background = "#4b51a2";
                    }
                  }}
                  onMouseOut={e => {
                    if (!loading) {
                      (e.currentTarget as HTMLButtonElement).style.background = "#8494E9";
                    }
                  }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg 
                        className="animate-spin h-5 w-5 text-white" 
                        viewBox="0 0 24 24"
                        style={{ width: '20px', height: '20px' }}
                      >
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4" 
                          fill="none" 
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      Processando...
                    </span>
                  ) : (
                    "Continuar agendamento"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

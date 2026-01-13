"use client";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatarData } from "@/utils/formatDate";
import { getAvatarUrl } from "@/utils/avatarUtils";
import { AgendamentoParams } from "@/utils/agendamentoUtils";
import { useDraftSession } from "@/hooks/useDraftSession";
import { useEscapeKey } from "@/hooks/useEscapeKey";

type Props = {
  open: boolean;
  onClose: () => void;
  agendamento: AgendamentoParams | null;
  psicologoAvatarUrl?: string;
};

export default function ModalLoginAgendamento({
  open,
  onClose,
  agendamento,
  psicologoAvatarUrl,
}: Props) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  
  const router = useRouter();
  const { iniciarDraftSession } = useDraftSession();

  if (!agendamento) return null;

  const safeAvatarUrl = getAvatarUrl({ avatarUrl: psicologoAvatarUrl });

  const handleContinuar = async () => {
    try {
      const draftId = await iniciarDraftSession(
        agendamento.psicologoId,
        `${agendamento.data}T${agendamento.horario}:00.000Z`,
        agendamento.agendaId
      );
      window.localStorage.setItem("draftId", String(draftId));
      // Salva agendamento pendente com contexto de primeira sessão
      const agendamentoComContexto = {
        ...agendamento,
        contexto: "primeira_sessao",
        origem: "marketplace"
      };
      window.sessionStorage.setItem("agendamento-pendente", JSON.stringify(agendamentoComContexto));
      // Redireciona para registro com contexto de primeira sessão
      router.push(`/register?psicologoId=${agendamento.psicologoId}&contexto=primeira_sessao&origem=marketplace`);
    } catch {
      alert("Não foi possível reservar o horário. Tente novamente.");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="relative bg-white rounded-[8px] shadow-lg flex flex-col w-[90%] max-w-[650px] max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="w-full h-[56px] rounded-tl-[8px] rounded-tr-[8px] bg-[#8494E9] flex items-center justify-center relative">
              <span className="text-white text-lg font-bold text-center w-full">
                Reserva de horário
              </span>
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-2xl font-bold hover:text-[#d1d5db] transition"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex flex-col flex-1 px-6 md:px-8 pt-6 md:pt-8 pb-6">
              {/* Avatar, nome, data e horário */}
              <div className="flex items-start gap-4 md:gap-6 mb-6">
                <Image
                  src={safeAvatarUrl}
                  alt={agendamento.nome}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#8494E9] flex-shrink-0"
                  style={{ objectFit: "cover" }}
                  priority
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[#444D9D] font-semibold text-base md:text-lg mb-2">
                    {agendamento.nome}
                  </span>
                  <span className="text-[#49525A] text-sm md:text-base font-medium mb-1">
                    Data: {formatarData(agendamento.data)}
                  </span>
                  <span className="text-[#49525A] text-sm md:text-base font-medium">
                    Horário: {agendamento.horario} - horário de Brasília
                  </span>
                </div>
              </div>

              {/* Mensagem */}
              <div className="bg-[#F2F4FD] border border-[#E5E9FA] rounded-[8px] p-5 md:p-6 mb-6">
                <p className="text-[#49525A] text-base md:text-lg leading-7 text-center font-medium">
                  Quase lá! Para garantir este horário, faça login ou crie sua conta gratuitamente em segundos.
                </p>
                <p className="text-[#6D75C0] text-sm md:text-base leading-6 text-center mt-3">
                  Seu horário está reservado temporariamente enquanto você completa o cadastro.
                </p>
              </div>

              {/* Botões */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-center">
                <button
                  className="w-full md:w-[220px] h-12 rounded-[8px] border border-[#6D75C0] text-[#6D75C0] font-semibold text-base flex items-center justify-center px-6 cursor-pointer hover:bg-[#f2f4fd] transition"
                  onClick={onClose}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="w-full md:w-[220px] h-12 rounded-[8px] bg-[#8494E9] text-white font-bold text-base flex items-center justify-center px-6 hover:bg-[#6c6bb6] transition cursor-pointer"
                  onClick={handleContinuar}
                  type="button"
                >
                  Continuar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


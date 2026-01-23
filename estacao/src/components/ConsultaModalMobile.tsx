"use client";
import React, { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { obterPrimeiroUltimoNome } from "@/utils/nomeUtils";
import { getContextualAvatar, isPsicologoPanel } from "@/utils/avatarUtils";
import Image from "next/image";
import ModalCancelarSessaoMobile from "./ModalCancelarSessaoMobile";
import { useCancelamentoConsulta } from "@/hooks/useCancelamentoConsulta";
import toast from "react-hot-toast";
import { useUserBasic } from "@/hooks/user/userHook";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { shouldEnableEntrarConsulta } from "@/utils/consultaTempoUtils";

interface PessoaConsulta {
  nome: string;
  avatarUrl?: string;
  Url?: string; // compatibilidade
}

interface Props {
  open: boolean;
  onClose: () => void;
  consulta: {
    data: string;
    horario: string;
    // Quando no painel do psicólogo, passaremos paciente; senão, psicólogo
    paciente?: PessoaConsulta;
    psicologo: PessoaConsulta;
    id?: string;
    Id?: string;
    pacienteId?: string;
    Paciente?: { Id?: string };
    psicologoId?: string;
    Psicologo?: { Id?: string };
  };
  botaoEntrarDesabilitado?: boolean; // Adiciona prop opcional
}

export default function ConsultaModalMobile({ open, onClose, consulta, botaoEntrarDesabilitado }: Props) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isLoadingCancel, setIsLoadingCancel] = useState(false);
  const { cancelarConsulta } = useCancelamentoConsulta();
  const userBasic = useUserBasic();

  // Detecta se está no painel do psicólogo
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isInPsicologoPanel = isPsicologoPanel(pathname);

  // Handler para cancelamento
  const handleCancelarConsulta = async (motivo: string, documento?: File | null) => {
    if (isLoadingCancel) return;
    
    setIsLoadingCancel(true);
    const loadingToast = toast.loading("Processando cancelamento...");
    
    try {
      const consultaId = consulta.id || consulta.Id || "";
      const pacienteId = consulta.pacienteId || consulta.Paciente?.Id || "";
      const psicologoId = consulta.psicologoId || consulta.Psicologo?.Id || userBasic.user?.Id || "";

      console.log("=== DEBUG CANCELAMENTO MOBILE ===");
      console.log("consultaId:", consultaId);
      console.log("pacienteId:", pacienteId);
      console.log("psicologoId:", psicologoId);
      console.log("motivo:", motivo);
      console.log("horario:", consulta.horario);
      console.log("data:", consulta.data);
      console.log("tipo:", isInPsicologoPanel ? "Psicologo" : "Paciente");
      console.log("documento:", documento?.name);

      if (!consultaId || !pacienteId || !psicologoId) {
        throw new Error("Dados da consulta incompletos. Por favor, tente novamente.");
      }

      if (!consulta.horario) {
        throw new Error("Horário da consulta não disponível. Por favor, tente novamente.");
      }

      await cancelarConsulta({
        idconsulta: consultaId,
        idPaciente: pacienteId,
        idPsicologo: psicologoId,
        motivo: motivo,
        protocolo: `CANCEL-${new Date().getTime()}`,
        horario: consulta.horario,
        data: consulta.data,
        tipo: isInPsicologoPanel ? "Psicologo" : "Paciente",
        documento: documento || undefined,
      });

      toast.dismiss(loadingToast);
      toast.success(
        isInPsicologoPanel 
          ? "Cancelamento enviado! O paciente será notificado por email."
          : "Cancelamento enviado! O psicólogo será notificado por email."
      );
      setShowCancelModal(false);
      onClose();
      
      // Recarrega a página após 2 segundos para atualizar os dados
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: unknown) {
      toast.dismiss(loadingToast);
      console.error("Erro ao cancelar consulta:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(error?.response?.data?.message || error?.message || "Erro ao cancelar consulta. Tente novamente.");
    } finally {
      setIsLoadingCancel(false);
    }
  };

  // Habilita botão entrar apenas dentro da janela de 60 minutos OU pelo controle externo
  const habilitarEntrar = typeof botaoEntrarDesabilitado === "boolean"
    ? !botaoEntrarDesabilitado
    : shouldEnableEntrarConsulta({ date: consulta.data, time: consulta.horario });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-white z-50 sm:hidden flex flex-col"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3 }}
        >
          {/* Cabeçalho com logo, frase e botão fechar */}
          <div className="relative flex flex-col items-center p-4 border-b border-gray-200">
            <button onClick={onClose} className="absolute right-4 top-4 text-xl font-bold text-gray-600">
              ×
            </button>
            <Image src="/logo.png" alt="Logo" className="h-10 mb-2" width={120} height={40} style={{ width: 120, height: 40 }} />
          </div>

          {/* Conteúdo do modal */}
          <div className="p-4 flex-1 flex flex-col overflow-y-auto text-gray-800 text-sm leading-relaxed">
            <span className="block text-base font-semibold text-gray-800 mb-4 text-center">Detalhes da consulta</span>
            <div className="flex flex-col items-start mb-4">
              <div className="flex items-center gap-3 w-full">
                {(() => {
                  const avatarUrl = getContextualAvatar(
                    isInPsicologoPanel,
                    consulta.psicologo,
                    consulta.paciente
                  );
                  return (
                    <Image
                      src={avatarUrl}
                      className="w-12 h-12 rounded-full"
                      alt="Avatar"
                      width={48}
                      height={48}
                    />
                  );
                })()}
                <div className="flex flex-col justify-center h-12">
                  <p className="font-semibold">
                    {obterPrimeiroUltimoNome(
                      (isInPsicologoPanel ? consulta.paciente?.nome : consulta.psicologo.nome) || 
                      (consulta.paciente?.nome ?? consulta.psicologo.nome)
                    ) || (consulta.paciente?.nome ?? consulta.psicologo.nome)}
                  </p>
                </div>
              </div>
              {/* Data e horário abaixo da foto */}
              <div className="mt-2 text-left">
                <p className="font-normal text-[12px] leading-[16px] text-[#606C76] align-middle">
                  <span className="font-bold">Dia:</span> {(() => {
                    try {
                      if (consulta.data) {
                        const d = new Date(consulta.data);
                        return format(d, "EEEE dd/MM/yyyy", { locale: ptBR });
                      }
                    } catch {
                      return consulta.data;
                    }
                    return consulta.data;
                  })()}
                </p>
                <p className="font-normal text-[14px] leading-[16px] text-[#606C76] align-middle">
                  <span className="font-bold">Horário:</span> {consulta.horario}
                </p>
              </div>
            </div>
            {/* Alerta */}
            <div className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-md mb-6 text-sm font-medium">
              ⚠️ Informações importantes!
            </div>

            <p className="mb-2 font-normal text-[14px] leading-[16px] text-[#606C76] align-middle">
              Temos uma tolerância de até 10 minutos após o horário de agendamento da consulta.
            </p>
            <p className="font-normal text-[14px] leading-[16px] text-[#606C76] align-middle">
              Caso precise reagendar ou cancelar sua consulta, se possível efetue com uma antecedência maior a 24 horas da mesma, caso contrário ela será cobrada normalmente.
            </p>
            <div className="flex-grow" />
            {/* Botões no final do modal */}
            <div className="flex gap-4 w-full">
              {isInPsicologoPanel ? (
                <>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-1/2 h-10 rounded-[6px] border border-[#6D75C0] text-[#6D75C0] font-medium text-base bg-white hover:bg-[#E6E9FF] transition"
                  >
                    Cancelar consulta
                  </button>
                  <button
                    disabled={!habilitarEntrar}
                    className={`w-1/2 h-10 rounded-[6px] font-medium text-base transition ${habilitarEntrar ? "bg-[#8494E9] hover:bg-[#6D75C0] text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
                  >
                    Entrar na consulta
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-1/2 h-10 rounded-[6px] border border-[#6D75C0] text-[#6D75C0] font-medium text-base bg-white hover:bg-[#E6E9FF] transition"
                  >
                    Cancelar consulta
                  </button>
                  <button
                    disabled={!habilitarEntrar}
                    className={`w-1/2 h-10 rounded-[6px] font-medium text-base transition ${habilitarEntrar ? "bg-[#8494E9] hover:bg-[#6D75C0] text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
                  >
                    Entrar na consulta
                  </button>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full mt-2 text-[#6D75C0] font-medium text-base bg-transparent border-none shadow-none hover:underline focus:outline-none"
              style={{ border: 'none', background: 'none', boxShadow: 'none' }}
            >
              Fechar
            </button>

            {/* Modal de cancelamento para psicólogo */}
            <ModalCancelarSessaoMobile
              open={showCancelModal}
              onClose={() => setShowCancelModal(false)}
              onConfirm={handleCancelarConsulta}
              consulta={consulta}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import React, { useState } from "react";
import { format  } from "date-fns";
import { ptBR } from "date-fns/locale";
import { obterPrimeiroUltimoNome } from "@/utils/nomeUtils";
import { getContextualAvatar, isPsicologoPanel } from "@/utils/avatarUtils";
import Image from "next/image";
import ModalCancelarSessaoDesk from "./ModalCancelarSessaoDesk";
import { useCancelamentoConsulta } from "@/hooks/useCancelamentoConsulta";
import toast from "react-hot-toast";
import { useUserBasic } from "@/hooks/user/userHook";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { shouldEnableEntrarConsulta } from "@/utils/consultaTempoUtils";

interface PessoaConsulta {
  nome: string;
  avatarUrl?: string; 
}

interface ConsultaModalDeskProps {
  open: boolean;
  onClose: () => void;
  onEntrar?: () => void;
  consulta: {
    data: string;
    horario: string;
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

export default function ConsultaModalDesk({ open, onClose, onEntrar, consulta, botaoEntrarDesabilitado }: ConsultaModalDeskProps) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isLoadingCancel, setIsLoadingCancel] = useState(false);
  const { cancelarConsulta } = useCancelamentoConsulta();
  const userBasic = useUserBasic();

  if (!open) return null;

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

      console.log("=== DEBUG CANCELAMENTO ===");
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
      const errorMessage = err instanceof Error 
        ? err.message 
        : (err as { response?: { data?: { message?: string } } })?.response?.data?.message 
        || "Erro ao cancelar consulta. Tente novamente.";
      toast.error(errorMessage);
    } finally {
      setIsLoadingCancel(false);
    }
  };

  // Habilita botão entrar apenas dentro da janela de 60 minutos OU pelo controle externo
  const habilitarEntrar = typeof botaoEntrarDesabilitado === "boolean"
    ? !botaoEntrarDesabilitado
    : shouldEnableEntrarConsulta({ date: consulta.data, time: consulta.horario });

  return (
    <div className="fixed inset-0 z-50 hidden sm:flex items-center justify-center">
      <div className="w-[588px] h-[460px] bg-white rounded-[8px] shadow-lg flex flex-col" style={{ opacity: 1 }}>
        {/* Header customizado */}
        <div className="w-full h-[56px] flex items-center justify-center relative rounded-t-[8px] bg-[#8494E9]">
          <span className="text-white text-lg font-semibold mx-auto">Detalhes da consulta</span>
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-white">
            ×
          </button>
        </div>
        {/* Conteúdo do modal */}
        <div className="flex-1 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              {(() => {
                const avatarUrl = getContextualAvatar(
                  isInPsicologoPanel,
                  consulta.psicologo,
                  consulta.paciente
                );
                return (
                  <Image
                    src={avatarUrl}
                    className="w-16 h-16 rounded-full"
                    width={64}
                    height={64}
                    alt="Avatar"
                  />
                );
              })()}
              <div>
                <p className="font-semibold text-lg">
                  {obterPrimeiroUltimoNome(
                    (isInPsicologoPanel ? consulta.paciente?.nome : consulta.psicologo.nome) || 
                    (consulta.paciente?.nome ?? consulta.psicologo.nome)
                  ) || (consulta.paciente?.nome ?? consulta.psicologo.nome)}
                </p>
                <p className="font-medium text-[14px] leading-[24px] text-[#49525A] align-middle">
                  <span className="font-bold text-[14px] leading-[24px] text-[#49525A] align-middle">Dia:</span> {(() => {
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
                <p className="font-medium text-[14px] leading-[24px] text-[#49525A] align-middle">
                  <span className="font-bold text-[14px] leading-[24px] text-[#49525A] align-middle">Horário:</span> {consulta.horario}
                </p>
              </div>
            </div>
            {/* Alerta */}
            <div className="bg-[#FFEDB3] text-yellow-800 px-3 py-2 rounded-md mb-4 text-base font-medium">
              ⚠️ Informações importantes!
            </div>
            <p className="mb-2 font-normal text-[14px] leading-[24px] text-[#606C76] align-middle">
              Temos uma tolerância de até 10 minutos após o horário de agendamento da consulta.
            </p>
            <p className="font-normal text-[14px] leading-[24px] text-[#606C76] align-middle">
              Caso precise reagendar ou cancelar sua consulta, se possível efetue com uma antecedência maior a 24 horas da mesma, caso contrário ela será cobrada normalmente.
            </p>
          </div>
          {/* Botões */}
          <div className="flex gap-4 mt-6 w-full">
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
                  onClick={onEntrar}
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
                  onClick={onEntrar}
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
        </div>
      </div>

      {/* Modal de cancelamento para psicólogo */}
      <ModalCancelarSessaoDesk
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelarConsulta}
        consulta={consulta}
      />
    </div>
  );
}

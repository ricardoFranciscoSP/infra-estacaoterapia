"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCancelamentoConsulta, CancelamentoPayload } from "@/hooks/useCancelamentoConsulta";
import toast from "react-hot-toast";
import { LoadingButton } from "./LoadingButton";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface ModalCancelarSessaoDentroPrazoProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  consulta: {
    id?: string | number;
    date?: string;
    time?: string;
    pacienteId?: string;
    psicologoId?: string;
    linkDock?: string;
    status?: string;
    tipo?: string;
  };
}

/**
 * Modal para cancelamento dentro do prazo (>24h)
 * Não exige motivo, não desconta do saldo
 */
export default function ModalCancelarSessaoDentroPrazo({ 
  open, 
  onClose, 
  onConfirm,
  consulta
}: ModalCancelarSessaoDentroPrazoProps) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  
  const { cancelarConsulta, loading } = useCancelamentoConsulta();
  
  // Gera um protocolo simples
  function gerarProtocolo(id: string | number | undefined) {
    const data = new Date();
    return `CANCEL-${data.getFullYear()}${(data.getMonth()+1).toString().padStart(2,'0')}${data.getDate().toString().padStart(2,'0')}-${id}`;
  }

  const handleConfirm = async () => {
    if (!consulta?.id || !consulta.pacienteId || !consulta.psicologoId || !consulta.time) {
      toast.error("Dados insuficientes para cancelar a consulta.");
      return;
    }

    // Para cancelamento dentro do prazo, não precisa de motivo
    // O status será determinado pelo backend baseado no prazo
    const payload: CancelamentoPayload = {
      idconsulta: String(consulta.id),
      idPaciente: String(consulta.pacienteId),
      idPsicologo: String(consulta.psicologoId),
      motivo: "Cancelamento dentro do prazo (>24h)",
      protocolo: gerarProtocolo(consulta.id),
      horario: consulta.time,
      data: consulta.date || new Date().toISOString(),
      linkDock: consulta.linkDock,
      status: undefined, // Backend determina baseado no prazo (>24h = Deferido, <24h = EmAnalise)
      tipo: consulta.tipo || "Paciente",
      documento: null,
    };

    try {
      console.log('[ModalCancelarSessaoDentroPrazo] Iniciando cancelamento...', payload);
      const resultado = await cancelarConsulta(payload);
      console.log('[ModalCancelarSessaoDentroPrazo] Cancelamento realizado com sucesso', resultado);
      
      // Chama onConfirm primeiro para atualizar os dados antes de fechar
      try {
        await onConfirm();
      } catch (confirmError) {
        console.error('[ModalCancelarSessaoDentroPrazo] Erro ao executar onConfirm:', confirmError);
        // Continua mesmo se onConfirm falhar
      }
      
      const mensagemSucesso = consulta.tipo === "Psicologo" 
        ? "Consulta cancelada com sucesso! O paciente será notificado por email."
        : "Consulta cancelada com sucesso! O crédito foi devolvido ao seu saldo.";
      
      toast.success(mensagemSucesso, {
        duration: 5000,
        icon: '✅',
      });
      
      // Fecha o modal após um pequeno delay para garantir que o toast seja visível
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: unknown) {
      console.error('[ModalCancelarSessaoDentroPrazo] Erro ao cancelar:', err);
      
      // Extrai mensagem de erro de forma mais robusta
      let errorMessage = "Erro ao cancelar consulta. Por favor, tente novamente.";
      
      if (err && typeof err === 'object') {
        const axiosError = err as { 
          response?: { 
            data?: { 
              message?: string;
              error?: string;
            };
            status?: number;
            statusText?: string;
          };
          message?: string;
          code?: string;
        };
        
        // Verifica se é timeout
        if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
          errorMessage = "A operação está demorando mais que o esperado. Por favor, aguarde ou tente novamente.";
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }
      
      toast.error(errorMessage, {
        duration: 6000,
        icon: '❌',
      });
      
      // Não fecha o modal em caso de erro para o usuário poder tentar novamente
    }
  };

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          className="fixed inset-0 bg-[#E6E9FF]/60 z-[70] flex items-center justify-center font-sans p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          onClick={(e) => {
            // Fecha ao clicar no overlay
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            className="bg-white shadow-xl flex flex-col w-full max-w-[700px] max-h-[90vh] rounded-[12px] mx-auto my-auto"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Header do Modal - Lilás para paciente */}
            <div className={`w-full h-[56px] flex items-center justify-center px-6 rounded-t-[12px] relative ${
              consulta.tipo === 'Paciente' ? 'bg-[#8494E9]' : 'bg-[#232A5C]'
            }`}>
              <h2 className="text-lg font-semibold text-white text-center">
                Cancelamento
              </h2>
              <button
                className="absolute right-6 top-1/2 -translate-y-1/2 text-white text-2xl font-bold hover:text-[#E6E9FF] transition-colors"
                onClick={onClose}
                aria-label="Fechar"
              >
                &times;
              </button>
            </div>
            
            {/* Conteúdo central */}
            <div className="flex-1 px-8 py-6">
              <p className="text-gray-700 text-base leading-relaxed mb-4">
                Sua sessão pode ser cancelada sem penalidades, pois está sendo realizada com mais de 24 horas de antecedência.
              </p>
              <p className="text-gray-700 text-base leading-relaxed mb-4">
                {consulta.tipo === "Psicologo" ? (
                  <>
                    Você não precisa informar um motivo. O paciente será notificado por email sobre o cancelamento.
                  </>
                ) : (
                  <>
                    Você não precisa informar um motivo, e a consulta não será descontada do seu saldo. O crédito será devolvido automaticamente para que você possa utilizá-lo em outra sessão.
                  </>
                )}
              </p>
              {consulta.tipo !== "Psicologo" && (
                <p className="text-gray-600 text-sm leading-relaxed italic">
                  Após confirmar o cancelamento, você poderá optar por reagendar a sessão com o mesmo psicólogo.
                </p>
              )}
            </div>
            
            {/* Botões de ação */}
            <div className="w-full px-8 py-5 flex justify-center gap-3 border-t border-gray-100 bg-white rounded-b-[12px]">
              <button
                onClick={onClose}
                disabled={loading}
                className="h-11 font-medium text-sm rounded-lg border border-[#8494E9] text-[#8494E9] bg-white hover:bg-[#F2F4FD] transition-all duration-200 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Voltar
              </button>
              <LoadingButton
                onClick={handleConfirm}
                loading={loading}
                disabled={loading}
                className="h-11 font-medium text-sm rounded-lg bg-[#8494E9] text-white transition-all duration-200 hover:bg-[#6D75C0] px-6 disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                {loading ? 'Cancelando...' : 'Confirmar cancelamento'}
              </LoadingButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

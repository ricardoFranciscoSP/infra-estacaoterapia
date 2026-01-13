"use client";

import React, { Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FormularioSaqueAutonomo } from "@/app/(painel-psicologo)/painel-psicologo/financeiro/FormularioSaqueAutonomo";

interface ConsultaDetalhada {
  id: string;
  data: string;
  hora: string;
  paciente: string;
  valor: number;
  valorComissao: number;
}

interface SaqueStepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: 'formulario' | 'notaFiscal';
  onStepChange: (step: 'formulario' | 'notaFiscal') => void;
  faturaPsicologo: {
    periodo: string;
    pagamento: string;
    quantidade: number;
    total: number;
    consultas?: ConsultaDetalhada[];
  };
  notaFiscal: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmarSaque: () => void;
  isLoadingFatura?: boolean;
  isSubmitting?: boolean;
}

export const SaqueStepsModal: React.FC<SaqueStepsModalProps> = ({
  isOpen,
  onClose,
  step,
  onStepChange,
  faturaPsicologo,
  notaFiscal,
  inputRef,
  onUpload,
  onConfirmarSaque,
  isLoadingFatura = false,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <Fragment>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-[16px] shadow-2xl w-full max-w-[1300px] max-h-[90vh] relative z-60 flex flex-col"
        >
          {/* Header com steps */}
          <div className="rounded-t-[16px] bg-[#6D75C0] px-7 py-5 flex items-center justify-between relative">
            <h2 className="text-[22px] font-bold text-white absolute left-1/2 transform -translate-x-1/2">
              {step === 'formulario' ? 'Formulário de Saque' : 'Enviar Nota Fiscal'}
            </h2>
            <button
              className="text-white text-[28px] font-bold hover:text-gray-200 ml-auto"
              onClick={onClose}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          {/* Conteúdo com transição suave */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">
              {step === 'formulario' ? (
                <motion.div
                  key="formulario"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 overflow-y-auto"
                >
                  <FormularioSaqueAutonomo
                    onClose={() => {
                      onStepChange('notaFiscal');
                    }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="notaFiscal"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="p-7 h-full overflow-y-auto"
                >
                  {/* Detalhes do saque */}
                  <div className="mb-5">
                    <div className="text-[16px] text-gray-700 mb-2 font-semibold">Resumo da Fatura</div>
                    {isLoadingFatura ? (
                      <div className="text-[14px] text-gray-500">Carregando dados...</div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[14px] text-gray-700 mb-4">
                          <div>Período: <span className="font-semibold">{faturaPsicologo.periodo || ''}</span></div>
                          <div>Pagamento previsto: <span className="font-semibold">{faturaPsicologo.pagamento || ''}</span></div>
                          <div>Consultas realizadas: <span className="font-semibold">{faturaPsicologo.quantidade ?? 0}</span></div>
                          <div>Total a receber: <span className="font-bold text-[#6D75C0]">R$ {faturaPsicologo.total?.toFixed(2) ?? '0.00'}</span></div>
                        </div>
                        
                        {faturaPsicologo.quantidade === 0 && (
                          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-[8px]">
                            <p className="text-[14px] text-yellow-800">
                              Nenhuma consulta concluída encontrada no período.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="mb-5">
                    <label className="block mb-2 font-medium text-gray-700 text-[15px]">Upload da nota fiscal / documento fiscal</label>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      ref={inputRef}
                      onChange={onUpload}
                      className="block w-full border border-gray-300 rounded-[8px] px-3 py-2 text-[14px]"
                    />
                    {notaFiscal && (
                      <div className="mt-2 text-xs text-green-700 flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        Arquivo selecionado: {notaFiscal.name}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 mt-7 w-full">
                    <button
                      className="w-1/2 px-4 py-2 bg-gray-200 text-[#6D75C0] rounded-[8px] font-semibold shadow hover:bg-gray-300 transition text-[15px]"
                      onClick={() => onStepChange('formulario')}
                    >
                      Voltar
                    </button>
                    <button
                      className="w-1/2 px-4 py-2 bg-[#6D75C0] text-white rounded-[8px] font-semibold shadow hover:bg-[#5a62a0] transition text-[15px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      onClick={onConfirmarSaque}
                      disabled={!notaFiscal || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processando...
                        </>
                      ) : (
                        'Confirmar solicitação'
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </Fragment>
  );
};

"use client";

import React, { useEffect, useRef } from "react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface ModalPreviaContratoPsicologoProps {
  open: boolean;
  onClose: () => void;
  contratoHtml: string | null;
  isLoading: boolean;
  onEmitirContrato: () => void;
  emitirLoading: boolean;
  onlyView?: boolean;
}

const ModalPreviaContratoPsicologo: React.FC<ModalPreviaContratoPsicologoProps> = ({
  open,
  onClose,
  contratoHtml,
  isLoading,
  onEmitirContrato,
  emitirLoading,
  onlyView = false,
}) => {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Previne scroll do body quando o modal está aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  // Scroll para o topo quando o conteúdo é carregado
  useEffect(() => {
    if (contentRef.current && contratoHtml && !isLoading) {
      contentRef.current.scrollTop = 0;
    }
  }, [contratoHtml, isLoading]);

  if (!open) return null;

  return (
    <>
      {/* Overlay com backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          // Fecha apenas se clicar no overlay, não no conteúdo do modal
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col relative animate-in fade-in zoom-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#5f5bd6] bg-[#6f6ce7] rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Prévia do Contrato de Parceria
                </h2>
                <p className="text-sm text-white/90">
                  CONTRATO DE PARCERIA E INTERMEDIAÇÃO DE PRESTAÇÃO DE SERVIÇOS DE PSICOLOGIA
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              aria-label="Fechar modal"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#cbd5e1 #f1f5f9",
            }}
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
                <p className="text-gray-600 font-medium">Carregando prévia do contrato...</p>
                <p className="text-sm text-gray-500 mt-2">Aguarde enquanto preparamos o documento</p>
              </div>
            ) : contratoHtml ? (
              <div
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-10"
                style={{
                  minHeight: "100%",
                }}
              >
                <div
                  className="contrato-content"
                  dangerouslySetInnerHTML={{ __html: contratoHtml }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium text-lg mb-2">
                  Não foi possível carregar a prévia do contrato
                </p>
                <p className="text-sm text-gray-500 text-center max-w-md">
                  Ocorreu um erro ao carregar o contrato. Por favor, tente novamente ou entre em contato com o suporte.
                </p>
              </div>
            )}
          </div>

          {/* Footer com botão de ação */}
          <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-2xl flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium rounded-lg transition-colors"
              disabled={emitirLoading}
            >
              Fechar
            </button>
            {!onlyView && (
              <button
                onClick={onEmitirContrato}
                disabled={isLoading || !contratoHtml || emitirLoading}
                className="px-8 py-2.5 bg-[#6f6ce7] hover:bg-[#5f5bd6] text-white font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30"
              >
                {emitirLoading ? (
                  <>
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    <span>Emitindo...</span>
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>Emitir Contrato</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Estilos globais para animação */}
      <style jsx global>{`
        .contrato-content,
        .contrato-content *,
        .contrato-content p,
        .contrato-content span,
        .contrato-content div,
        .contrato-content h1,
        .contrato-content h2,
        .contrato-content h3,
        .contrato-content h4,
        .contrato-content h5,
        .contrato-content h6,
        .contrato-content table,
        .contrato-content th,
        .contrato-content td,
        .contrato-content li {
          color: #1a1a1a !important;
        }
        .contrato-content b,
        .contrato-content strong {
          color: #000000 !important;
          font-weight: bold !important;
        }
        /* Formatação ABNT2 para contratos */
        .contrato-content {
          font-family: "Times New Roman", Times, serif !important;
          font-size: 12pt !important;
          line-height: 1.5 !important;
        }
        .contrato-content p {
          text-align: justify !important;
          text-indent: 1.25cm !important;
          margin: 0 0 1em 0 !important;
        }
        .contrato-content h1,
        .contrato-content h2,
        .contrato-content h3 {
          text-align: center !important;
          font-weight: bold !important;
          margin: 1.25em 0 0.75em 0 !important;
          text-transform: uppercase !important;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes zoom-in {
          from {
            transform: scale(0.95);
          }
          to {
            transform: scale(1);
          }
        }
        .animate-in {
          animation: fade-in 0.2s ease-out, zoom-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default ModalPreviaContratoPsicologo;


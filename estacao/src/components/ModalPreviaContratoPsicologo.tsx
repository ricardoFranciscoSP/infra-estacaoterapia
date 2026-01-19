"use client";

import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="max-w-4xl w-full p-0 rounded-2xl overflow-hidden">
        <DialogHeader className="bg-[#6f6ce7] px-8 py-6 border-b border-[#5f5bd6]">
          <DialogTitle className="text-center w-full text-xl font-bold text-white">
            Prévia do Contrato de Parceria
          </DialogTitle>
          <p className="text-sm text-white/90 text-center mt-1">
            CONTRATO DE PARCERIA E INTERMEDIAÇÃO DE PRESTAÇÃO DE SERVIÇOS DE
            PSICOLOGIA
          </p>
        </DialogHeader>
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto p-6 sm:p-8 bg-gray-50 max-h-[60vh]"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 #f1f5f9" }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
              <p className="text-gray-600 font-medium">
                Carregando prévia do contrato...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Aguarde enquanto preparamos o documento
              </p>
            </div>
          ) : contratoHtml ? (
            <div className="contrato-page">
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
                Ocorreu um erro ao carregar o contrato. Por favor, tente novamente
                ou entre em contato com o suporte.
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="flex flex-row gap-3 px-8 py-6 border-t border-gray-200 bg-white justify-end">
          <Button
            onClick={onClose}
            variant="outline"
            size="lg"
            className="min-w-[120px]"
            disabled={emitirLoading}
          >
            Fechar
          </Button>
          {!onlyView && (
            <Button
              onClick={onEmitirContrato}
              disabled={isLoading || !contratoHtml || emitirLoading}
              size="lg"
              className="min-w-[180px] bg-[#6f6ce7] hover:bg-[#5f5bd6] text-white shadow-md shadow-indigo-500/25 ring-1 ring-indigo-500/20"
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
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      <style jsx global>{`
        .contrato-page {
          max-width: 820px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
          border-radius: 12px;
          padding: 40px 48px;
        }
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
          line-height: 1.6 !important;
          text-align: justify !important;
        }
        .contrato-content p {
          text-align: justify !important;
          text-indent: 1.25cm !important;
          margin: 0 0 0.45cm 0 !important;
        }
        .contrato-content h1,
        .contrato-content h2,
        .contrato-content h3,
        .contrato-content h4,
        .contrato-content h5,
        .contrato-content h6 {
          text-align: center !important;
          font-weight: bold !important;
          margin: 1.25em 0 0.75em 0 !important;
          text-transform: uppercase !important;
        }
        .contrato-content ul,
        .contrato-content ol {
          margin: 0 0 0.4cm 1.2cm !important;
        }
      `}</style>
    </Dialog>
  );
};

export default ModalPreviaContratoPsicologo;

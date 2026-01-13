"use client";
import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { getApiUrl } from "@/config/env";

interface ModalPoliticaTermoProps {
  open: boolean;
  onClose: () => void;
  titulo: string;
  conteudo?: string;
  tipo?: 'texto' | 'pdf';
  urlPdf?: string;
}

export default function ModalPoliticaTermo({
  open,
  onClose,
  titulo,
  conteudo,
  tipo = 'texto',
  urlPdf,
}: ModalPoliticaTermoProps): React.ReactElement | null {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const supabaseBase = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');

  const resolveUrl = useCallback((rawUrl: string): string => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http')) return rawUrl;
    if (rawUrl.startsWith('/storage') || rawUrl.includes('/storage/v1/object/')) {
      const cleaned = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
      return `${supabaseBase}${cleaned}`;
    }
    const apiUrl = getApiUrl();
    return `${apiUrl}${rawUrl}`;
  }, [supabaseBase]);

  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  
  // Previne scroll do body quando modal está aberto
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

  // Define a URL do PDF quando o modal abre e é do tipo PDF
  useEffect(() => {
    if (open && tipo === 'pdf' && urlPdf) {
      console.log('[ModalPoliticaTermo] Modal aberto para PDF');
      console.log('[ModalPoliticaTermo] URL recebida:', urlPdf);
      console.log('[ModalPoliticaTermo] Tipo:', tipo);

      setPdfError(null);

      const fullUrl = resolveUrl(urlPdf);
      console.log('[ModalPoliticaTermo] URL completa para renderizar:', fullUrl);
      setPdfUrl(fullUrl);
    } else {
      if (!urlPdf && tipo === 'pdf') {
        console.warn('[ModalPoliticaTermo] Tipo é PDF mas URL não foi fornecida');
        setPdfError('URL do documento não está disponível');
      }
      setPdfUrl(null);
    }
  }, [open, tipo, urlPdf, resolveUrl]);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!open) return null;

  return (
    <>
      {/* Desktop */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[9999] hidden md:flex items-center justify-center bg-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          >
            <motion.div
              className="relative flex flex-col w-[90vw] max-w-[800px] max-h-[90vh] bg-white rounded-lg shadow-xl"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="w-full h-[56px] flex items-center justify-center px-6 py-3 rounded-t-lg bg-[#8494E9] relative">
                <span className="text-white text-lg font-semibold text-center w-full">
                  {titulo}
                </span>
                <button
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-white text-2xl font-bold hover:bg-[#6b7acb] rounded-full w-8 h-8 flex items-center justify-center transition"
                  onClick={onClose}
                  aria-label="Fechar"
                  type="button"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {tipo === 'pdf' && urlPdf ? (
                  <>
                    {pdfError ? (
                      <div className="flex items-center justify-center min-h-[500px] px-6">
                        <div className="text-center px-6 max-w-md">
                          <div className="mb-4">
                            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-red-600 mb-2">
                            Erro ao Carregar Documento
                          </h3>
                          <p className="text-sm text-gray-600 mb-6">{pdfError}</p>
                          <div className="space-y-3">
                            <a
                              href={pdfUrl || (urlPdf.startsWith('http') ? urlPdf : `${getApiUrl()}${urlPdf}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-full px-4 py-2 bg-[#8494E9] text-white rounded-lg hover:bg-[#6b7acb] transition"
                            >
                              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Abrir em Nova Aba
                            </a>
                            <button
                              onClick={() => {
                                setPdfError(null);
                                setPdfUrl(resolveUrl(urlPdf));
                              }}
                              className="inline-flex items-center justify-center w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                            >
                              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Tentar Novamente
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : pdfUrl ? (
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 w-full" style={{ minHeight: '500px', height: '100%' }}>
                      <embed
                            src={`${pdfUrl}#view=FitH`}
                        type="application/pdf"
                            className="w-full h-full border-0 rounded"
                            style={{ minHeight: '500px' }}
                            onError={() => {
                              console.error('[ModalPoliticaTermo] Erro ao carregar PDF embed');
                          setPdfError('Não foi possível visualizar o documento. Tente abrir em uma nova aba.');
                            }}
                          />
                        </div>
                        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                          <p className="text-xs text-gray-500">
                            Se o PDF não estiver visível, clique no botão abaixo para abrir em nova aba
                          </p>
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 text-sm bg-[#8494E9] text-white rounded hover:bg-[#6b7acb] transition"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Abrir em Nova Aba
                          </a>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-[14px] leading-6 text-[#49525A]">
                      {conteudo || ''}
                    </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="w-full px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  className="h-10 px-6 flex items-center justify-center rounded bg-[#8494E9] text-white font-medium text-sm hover:bg-[#6b7acb] transition"
                  onClick={onClose}
                  type="button"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[9999] flex md:hidden flex-col bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header Mobile */}
            <div className="w-full h-[56px] flex items-center justify-center px-4 bg-[#8494E9] relative">
              <span className="text-white text-base font-semibold text-center flex-1">
                {titulo}
              </span>
              <button
                className="text-white text-2xl font-bold p-2"
                onClick={onClose}
                aria-label="Fechar"
                type="button"
              >
                ×
              </button>
            </div>

            {/* Content Mobile */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {tipo === 'pdf' && urlPdf ? (
                <>
                  {pdfError ? (
                    <div className="flex items-center justify-center min-h-[400px] px-4">
                      <div className="text-center px-4 max-w-md">
                        <div className="mb-4">
                          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <h3 className="text-base font-semibold text-red-600 mb-2">
                          Erro ao Carregar Documento
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">{pdfError}</p>
                        <div className="space-y-2">
                          <a
                            href={pdfUrl || (urlPdf.startsWith('http') ? urlPdf : `${getApiUrl()}${urlPdf}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-full px-4 py-2 bg-[#8494E9] text-white text-sm rounded-lg hover:bg-[#6b7acb] transition"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Abrir em Nova Aba
                          </a>
                          <button
                            onClick={() => {
                              setPdfError(null);
                              setPdfUrl(resolveUrl(urlPdf));
                            }}
                            className="inline-flex items-center justify-center w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Tentar Novamente
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : pdfUrl ? (
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex-1 w-full" style={{ minHeight: '400px', height: '100%' }}>
                    <embed
                          src={`${pdfUrl}#view=FitH`}
                      type="application/pdf"
                          className="w-full h-full border-0 rounded"
                          style={{ minHeight: '400px' }}
                          onError={() => {
                            console.error('[ModalPoliticaTermo Mobile] Erro ao carregar PDF embed');
                        setPdfError('Não foi possível visualizar o documento. Tente abrir em uma nova aba.');
                          }}
                        />
                      </div>
                      <div className="px-4 py-3 border-t border-gray-200 flex flex-col gap-2 bg-gray-50">
                        <p className="text-xs text-gray-500 text-center">
                          Se o PDF não estiver visível, use o botão abaixo
                        </p>
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm bg-[#8494E9] text-white rounded hover:bg-[#6b7acb] transition"
                        >
                          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Abrir em Nova Aba
                        </a>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-[14px] leading-6 text-[#49525A]">
                      {conteudo || ''}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Mobile */}
            <div className="w-full px-4 py-4 border-t border-gray-200">
              <button
                className="w-full h-12 flex items-center justify-center rounded bg-[#8494E9] text-white font-medium text-sm"
                onClick={onClose}
                type="button"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


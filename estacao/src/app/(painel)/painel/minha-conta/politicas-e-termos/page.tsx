"use client";

import React, { useState, useCallback, useMemo } from "react";
import PainelSidebar from "@/components/PainelSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ModalPoliticaTermo from "@/components/ModalPoliticaTermo";
import { motion } from "framer-motion";
import { getApiUrl } from "@/config/env";
import { usePolicyDocuments, type PolicyDocument } from "@/hooks/usePolicyDocuments";

export default function PoliticasTermosPage(): React.ReactElement {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [documentoSelecionado, setDocumentoSelecionado] = useState<PolicyDocument | null>(null);

  // Busca documentos do banco para pacientes ou todos
  const { data: documentsData, isLoading, error } = usePolicyDocuments("paciente");

  // Garante que documents seja sempre um array válido e tipado
  const documents: PolicyDocument[] = useMemo(() => {
    if (!documentsData) return [];
    if (!Array.isArray(documentsData)) return [];
    
    return documentsData.filter((doc): doc is PolicyDocument => {
      return (
        doc !== null &&
        doc !== undefined &&
        typeof doc === 'object' &&
        'Id' in doc &&
        'Titulo' in doc &&
        'Tipo' in doc &&
        'Ativo' in doc &&
        typeof doc.Id === 'string' &&
        typeof doc.Titulo === 'string' &&
        (doc.Tipo === 'pdf' || doc.Tipo === 'texto') &&
        typeof doc.Ativo === 'boolean' &&
        doc.Ativo === true
      );
    });
  }, [documentsData]);

  const supabaseBase = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');

  // Função para construir a URL do documento de forma tipada e resolvendo Supabase
  const getDocumentUrl = useCallback((documento: PolicyDocument): string | undefined => {
    console.log('[PoliticasTermos getDocumentUrl] Processando documento:', {
      Tipo: documento.Tipo,
      Url: documento.Url,
      UrlStartsWithHttp: documento.Url?.startsWith('http')
    });
    
    if (!documento.Url) {
      console.warn('[PoliticasTermos getDocumentUrl] Documento sem URL');
      return undefined;
    }

    const resolveUrl = (rawUrl: string): string => {
      if (!rawUrl) return '';
      if (rawUrl.startsWith('http')) return rawUrl;
      if (rawUrl.startsWith('/storage') || rawUrl.includes('/storage/v1/object/')) {
        const cleaned = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
        return `${supabaseBase}${cleaned}`;
      }
      return `${getApiUrl()}${rawUrl}`;
    };
    
    if (documento.Tipo === "pdf") {
      const full = resolveUrl(documento.Url);
      console.log('[PoliticasTermos getDocumentUrl] URL PDF resolvida:', full);
      return full;
    }
    
    if (documento.Tipo === "texto") {
      const full = resolveUrl(documento.Url);
      console.log('[PoliticasTermos getDocumentUrl] URL texto resolvida:', full);
      return full;
    }
    
    return undefined;
  }, [supabaseBase]);

  const handleOpenModal = useCallback((documento: PolicyDocument): void => {
    console.log('[PoliticasTermos] Abrindo modal para documento:', {
      Id: documento.Id,
      Titulo: documento.Titulo,
      Tipo: documento.Tipo,
      Url: documento.Url,
      UrlCompleta: getDocumentUrl(documento)
    });
    setDocumentoSelecionado(documento);
    setModalOpen(true);
  }, [getDocumentUrl]);

  const handleCloseModal = useCallback((): void => {
    setModalOpen(false);
    setDocumentoSelecionado(null);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen font-fira bg-[#F6F7FB]"
    >
      <div className="max-w-[1440px] mx-auto w-full flex px-4 md:px-8 gap-8">
        <div className="hidden md:block w-1/4">
          <PainelSidebar active="/painel/minha-conta/politicas-e-termos" />
        </div>

        <main className="flex-1 w-full overflow-x-hidden py-4 sm:py-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#26220D] mb-2">
                Políticas e Termos
              </h1>
              <p className="text-[#49525A] text-sm sm:text-base">
                Consulte todos os documentos, políticas e termos da plataforma Estação Terapia.
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8494E9]"></div>
              </div>
            ) : error ? (
              <div className="rounded-lg bg-red-50 border border-red-200 p-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">
                      Erro ao carregar documentos. Tente novamente mais tarde.
                    </p>
                  </div>
                </div>
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-12">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
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
                  <p className="mt-4 text-gray-500">Nenhum documento disponível no momento</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {documents.map((documento: PolicyDocument, index: number) => {
                  return (
                    <motion.div
                      key={documento.Id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="h-full"
                    >
                      <Card
                        className="h-full flex flex-col cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-[#8494E9] hover:scale-[1.02]"
                        onClick={() => handleOpenModal(documento)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleOpenModal(documento);
                          }
                        }}
                      >
                        <CardHeader className="flex-1 flex flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base sm:text-lg text-[#26220D] mb-2 line-clamp-2 h-12">
                                {documento.Titulo}
                              </CardTitle>
                              <CardDescription className="text-sm text-[#49525A] line-clamp-2 min-h-[2.5rem]">
                                {documento.Descricao || "Clique para visualizar o documento completo"}
                              </CardDescription>
                            </div>
                            <div className="flex-shrink-0">
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                className="text-[#8494E9]"
                                aria-hidden="true"
                              >
                                <path
                                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M14 2v6h6"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M16 13H8"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M16 17H8"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M10 9H8"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 mt-auto">
                          <div className="flex items-center text-[#8494E9] text-sm font-medium">
                            <span>Visualizar documento</span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              className="ml-2"
                              aria-hidden="true"
                            >
                              <path
                                d="M5 12h14M12 5l7 7-7 7"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {documentoSelecionado && (
        <ModalPoliticaTermo
          open={modalOpen}
          onClose={handleCloseModal}
          titulo={documentoSelecionado.Titulo}
          conteudo={documentoSelecionado.Tipo === 'texto' ? documentoSelecionado.Descricao : undefined}
          tipo={documentoSelecionado.Tipo}
          urlPdf={documentoSelecionado.Tipo === 'pdf' ? getDocumentUrl(documentoSelecionado) : undefined}
        />
      )}
    </motion.div>
  );
}

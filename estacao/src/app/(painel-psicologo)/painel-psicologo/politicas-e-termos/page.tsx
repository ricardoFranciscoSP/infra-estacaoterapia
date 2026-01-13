"use client";
import React, { useState, useCallback } from "react";
import SidebarPsicologo from "../SidebarPsicologo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ModalPoliticaTermo from "@/components/ModalPoliticaTermo";
import { motion } from "framer-motion";
import { usePolicyDocuments, PolicyDocument } from "@/hooks/usePolicyDocuments";
import { getApiUrl } from "@/config/env";

export default function PoliticasTermosPage(): React.ReactElement {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [documentoSelecionado, setDocumentoSelecionado] = useState<PolicyDocument | null>(null);
  const supabaseBase = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');

  const resolveUrl = useCallback((rawUrl: string): string => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http')) return rawUrl;
    if (rawUrl.startsWith('/storage') || rawUrl.includes('/storage/v1/object/')) {
      const cleaned = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
      return `${supabaseBase}${cleaned}`;
    }
    return `${getApiUrl()}${rawUrl}`;
  }, [supabaseBase]);
  
  // Busca documentos do banco para psicólogos ou todos
  const { data: documents = [], isLoading } = usePolicyDocuments("psicologo");

  const handleOpenModal = useCallback((documento: PolicyDocument): void => {
    console.log('[Psicologo PoliticasTermos] Abrindo modal para documento:', {
      Id: documento.Id,
      Titulo: documento.Titulo,
      Tipo: documento.Tipo,
      Url: documento.Url
    });
    setDocumentoSelecionado(documento);
    setModalOpen(true);
  }, []);

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
      <div className="max-w-[1200px] mx-auto w-full flex">
        {/* Sidebar - alinhado ao logo */}
        <div className="hidden md:flex">
          <SidebarPsicologo />
        </div>

        {/* Main Content - alinhado ao avatar */}
        <main className="py-4 sm:py-8 px-3 sm:px-4 md:px-6 flex-1 w-full overflow-x-hidden">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#26220D] mb-2">
                Políticas e Termos
              </h1>
              <p className="text-[#49525A] text-sm sm:text-base">
                Consulte todos os documentos, políticas e termos da plataforma Estação Terapia.
              </p>
            </div>

            {/* Documents Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8494E9]"></div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Nenhum documento disponível no momento</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {documents.map((documento: PolicyDocument, index: number) => (
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
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      {documentoSelecionado && ((
        () => {
          const urlPdf = documentoSelecionado.Tipo === 'pdf' ? resolveUrl(documentoSelecionado.Url) : undefined;
          const conteudo = documentoSelecionado.Tipo === 'texto' ? documentoSelecionado.Descricao : undefined;
          
          console.log('[Psicologo PoliticasTermos] Passando para modal:', {
            tipo: documentoSelecionado.Tipo,
            urlPdf,
            hasConteudo: !!conteudo
          });
          
          return (
            <ModalPoliticaTermo
              open={modalOpen}
              onClose={handleCloseModal}
              titulo={documentoSelecionado.Titulo}
              conteudo={conteudo}
              tipo={documentoSelecionado.Tipo || 'texto'}
              urlPdf={urlPdf}
            />
          );
        }
      )())}
    </motion.div>
  );
}


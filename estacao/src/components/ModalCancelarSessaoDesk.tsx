import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { LoadingButton } from "./LoadingButton";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface ModalCancelarSessaoDeskProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (motivo: string, documento?: File | null) => void;
  consulta: unknown;
}

// Lista completa de motivos de cancelamento (igual ao ModalCancelarSessao.tsx)
const motivos = [
  { value: "acidente_ocorrencia_pessoal", label: "Acidente ou ocorrência pessoal que impossibilitou a sessão" },
  { value: "acompanhamento_familiar_doente", label: "Acompanhamento urgente de familiar doente" },
  { value: "agravamento_saude_cronica", label: "Agravamento de condição de saúde crônica" },
  { value: "catastrofes_naturais", label: "Catástrofes naturais ou eventos climáticos extremos que comprometam a sessão" },
  { value: "compromissos_academicos", label: "Compromissos acadêmicos inesperados e obrigatórios" },
  { value: "compromissos_profissionais", label: "Compromissos profissionais urgentes e inesperados" },
  { value: "conflito_compromisso", label: "Conflito com outro compromisso previamente marcado" },
  { value: "crise_ansiedade_panico", label: "Crise aguda de ansiedade ou pânico" },
  { value: "doenca_subita", label: "Doença súbita pessoal" },
  { value: "emergencia_familiar", label: "Emergência familiar ou com dependentes" },
  { value: "falecimento_familiar", label: "Falecimento de familiar de 1º grau" },
  { value: "falta_conexao_operadora", label: "Falta de conexão geral por problemas com operadora ou tempo" },
  { value: "preso_reuniao", label: "Fiquei preso(a) em uma reunião" },
  { value: "instabilidade_internet", label: "Instabilidade na conexão com a internet, mas sem queda total" },
  { value: "interrupcao_internet_cliente", label: "Interrupção abrupta da internet por parte do cliente" },
  { value: "internacao_hospitalar", label: "Internação hospitalar minha ou de um dependente" },
  { value: "obrigacao_legal_judicial", label: "Obrigação legal ou judicial imprevista" },
  { value: "atraso_sessao", label: "Me atrasei para a sessão" },
  { value: "pane_eletrica", label: "Pane elétrica no domicílio" },
  { value: "problemas_barulho_ambiente", label: "Problemas com barulho ou ambiente" },
  { value: "problemas_equipamento", label: "Problemas graves com o equipamento (ex: notebook queimou)" },
  { value: "procedimento_medico_emergencial", label: "Procedimento médico emergencial" },
  { value: "problemas_pessoais", label: "Problemas pessoais" },
  { value: "roubo_furto_violencia", label: "Roubo / Furto ou Violência recente" }
];  

export default function ModalCancelarSessaoDesk({ open, onClose, onConfirm }: ModalCancelarSessaoDeskProps) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  
  const [motivo, setMotivo] = useState("");
  const [documento, setDocumento] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Motivos que exigem comprovação (Aprova com comprovação)
  const motivosComComprovacao = [
    "acidente_ocorrencia_pessoal",
    "acompanhamento_familiar_doente",
    "agravamento_saude_cronica",
    "catastrofes_naturais",
    "compromissos_academicos",
    "compromissos_profissionais",
    "crise_ansiedade_panico",
    "doenca_subita",
    "emergencia_familiar",
    "falecimento_familiar",
    "falta_conexao_operadora",
    "interrupcao_internet_cliente",
    "internacao_hospitalar",
    "obrigacao_legal_judicial",
    "pane_eletrica",
    "problemas_equipamento",
    "procedimento_medico_emergencial",
    "roubo_furto_violencia"
  ];

  const mostrarInputDocumento = motivosComComprovacao.includes(motivo);

  // Funções para drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Regra igual ao UploadModal: PDF, DOCX, PNG, JPG até 2MB
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
        'image/png',
        'image/jpeg',
        'image/jpg'
      ];
      const maxSize = 2 * 1024 * 1024; // 2MB

      if (!allowedTypes.includes(file.type)) {
        toast.error("Tipo de arquivo não permitido. Use PDF, DOCX, PNG ou JPG.");
        return;
      }

      if (file.size > maxSize) {
        toast.error("Arquivo excede o tamanho máximo de 2MB.");
        return;
      }

      setDocumento(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Regra igual ao UploadModal: PDF, DOCX, PNG, JPG até 2MB
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
        'image/png',
        'image/jpeg',
        'image/jpg'
      ];
      const maxSize = 2 * 1024 * 1024; // 2MB

      if (!allowedTypes.includes(file.type)) {
        toast.error("Tipo de arquivo não permitido. Use PDF, DOCX, PNG ou JPG.");
        return;
      }

      if (file.size > maxSize) {
        toast.error("Arquivo excede o tamanho máximo de 2MB.");
        return;
      }

      setDocumento(file);
    }
  }, []);

  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <>
      {/* Modal Desktop */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 sm:flex hidden items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-[800px] max-h-[90vh] bg-white rounded-[12px] shadow-xl flex flex-col"
              style={{ opacity: 1 }}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header dentro do modal, conforme medidas */}
              <div className="w-full h-[56px] bg-[#8494E9] flex items-center justify-center px-6 rounded-t-[12px] relative" style={{ opacity: 1 }}>
                <span className="text-white text-lg font-semibold">Cancelamento</span>
                <button
                  onClick={onClose}
                  aria-label="Fechar"
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-white hover:text-gray-200 text-xl font-bold focus:outline-none"
                  style={{ lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
              {/* Conteúdo */}
              <div className="flex-1 px-8 py-6 flex flex-col overflow-y-auto">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Você está prestes a cancelar uma sessão
                </h2>
                <div className="space-y-2.5 mb-6">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    O motivo abaixo informado será avaliado pela nossa equipe administrativa, e caso o motivo não atenda ou na ausência de comprovação exigida, sua conta poderá ser penalizada conforme nossa política de uso.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Por isso, pedimos que selecione abaixo com atenção o motivo do cancelamento, e se necessário e solicitado, anexe um documento válido que comprove a situação.
                  </p>
                </div>
                <div className="mb-5">
                  <label className="block text-gray-800 font-semibold mb-2.5 text-sm">Qual o motivo do cancelamento?</label>
                  <select
                    className="w-full h-[44px] rounded-lg bg-white border border-gray-300 px-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9] transition-all"
                    value={motivo}
                    onChange={e => {
                      setMotivo(e.target.value);
                      setDocumento(null); // Limpa o documento quando muda o motivo
                    }}
                  >
                    <option value="">Selecione o motivo</option>
                    {motivos.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                {mostrarInputDocumento && (
                  <div className="mb-5">
                    <label className="block text-gray-800 font-semibold mb-2.5 text-sm">
                      Por favor, insira abaixo um documento válido que comprove o motivo solicitado
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div
                      ref={dropZoneRef}
                      onClick={handleClickUpload}
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-[#8494E9] bg-[#F2F4FD]'
                          : documento
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-300 bg-gray-50 hover:border-[#8494E9] hover:bg-[#F9FAFF]'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <svg
                          className={`w-10 h-10 mb-3 ${isDragging ? 'text-[#8494E9]' : documento ? 'text-green-500' : 'text-gray-400'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        <p className="text-gray-700 mb-1.5 text-sm">
                          <span className="text-[#8494E9] underline font-medium">Clique aqui ou Arraste o arquivo</span>
                          <span className="text-gray-600"> para importar o documento</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF, DOCX, PNG ou JPG (max 2 MB)
                        </p>
                        {documento && (
                          <div className="mt-3 p-2.5 bg-white rounded border border-green-300">
                            <p className="text-xs text-gray-700 font-medium">
                              ✓ Arquivo selecionado: {documento.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {(documento.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Botão de ação */}
              <div className="flex justify-center px-8 py-5 w-full border-t border-gray-100 bg-white rounded-b-[12px] gap-3">
                <LoadingButton
                  loading={isLoading}
                  disabled={!motivo || (mostrarInputDocumento && !documento)}
                  onClick={async () => {
                    if (isLoading) return;
                    setIsLoading(true);
                    try {
                      await onConfirm(motivo, documento);
                      toast.success("Consulta cancelada com sucesso, sujeita à aprovação do administrador.", {
                        duration: 5000,
                        icon: '✅',
                      });
                      // Fechar modal após sucesso
                      setTimeout(() => {
                        onClose();
                      }, 500);
                    } catch (error) {
                      console.error('Erro ao cancelar:', error);
                      toast.error("Erro ao cancelar consulta. Tente novamente.", {
                        duration: 4000,
                        icon: '❌',
                      });
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="h-11 w-64 bg-[#8494E9] text-white font-medium text-sm rounded-lg hover:bg-[#6D75C0] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Cancelando...' : 'Cancelar sessão'}
                </LoadingButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Mobile - layout igual ConsultaDetalhesModal */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="sm:hidden fixed inset-0 z-50 flex flex-col"
            style={{ background: "transparent" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="flex flex-col bg-white h-full px-4">
              {/* Header mobile */}
              <div className="relative flex flex-col items-center p-4 border-b border-gray-200">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 text-xl font-bold text-gray-600"
                  aria-label="Fechar"
                >
                  ×
                </button>
                <span className="block text-base font-semibold text-gray-800 mb-2 text-center">
                  Deseja cancelar a sessão?
                </span>
              </div>
              {/* Conteúdo mobile */}
              <div className="flex flex-col py-4 flex-1 overflow-y-auto">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Você está prestes a cancelar uma sessão
                </h2>
                <p className="text-gray-700 text-sm leading-relaxed mb-3">
                  O motivo abaixo informado será avaliado pela nossa equipe administrativa, e caso o motivo não atenda ou na ausência de comprovação exigida, sua conta poderá ser penalizada conforme nossa política de uso.
                </p>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">
                  Por isso, pedimos que selecione abaixo com atenção o motivo do cancelamento, e se necessário e solicitado, anexe um documento válido que comprove a situação.
                </p>
                <div className="mb-6">
                  <label className="block text-gray-800 font-semibold mb-3 text-base">Qual o motivo do cancelamento?</label>
                  <select
                    className="w-full h-[48px] rounded-lg bg-white border border-gray-300 px-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9]"
                    value={motivo}
                    onChange={e => {
                      setMotivo(e.target.value);
                      setDocumento(null); // Limpa o documento quando muda o motivo
                    }}
                  >
                    <option value="">Selecione o motivo</option>
                    {motivos.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                {mostrarInputDocumento && (
                  <div className="mb-4">
                    <label className="block text-gray-800 font-semibold mb-3 text-base">
                      Por favor, insira abaixo um documento válido que comprove o motivo solicitado
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div
                      ref={dropZoneRef}
                      onClick={handleClickUpload}
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-[#8494E9] bg-[#F2F4FD]'
                          : documento
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-300 bg-gray-50 hover:border-[#8494E9] hover:bg-[#F9FAFF]'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <svg
                          className={`w-12 h-12 mb-4 ${isDragging ? 'text-[#8494E9]' : documento ? 'text-green-500' : 'text-gray-400'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        <p className="text-gray-700 mb-2">
                          <span className="text-[#8494E9] underline font-medium">Clique aqui ou Arraste o arquivo</span>
                          <span className="text-gray-600"> para importar o documento</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          PDF, PPT, XLS ou JPG (max 25 MB)
                        </p>
                        {documento && (
                          <div className="mt-4 p-3 bg-white rounded-lg border border-green-300">
                            <p className="text-sm text-gray-700 font-medium">
                              ✓ Arquivo selecionado: {documento.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {(documento.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Botão mobile */}
              <div className="p-4 flex justify-center">
                <LoadingButton
                  loading={isLoading}
                  disabled={!motivo || (mostrarInputDocumento && !documento)}
                  onClick={async () => {
                    if (isLoading) return;
                    setIsLoading(true);
                    try {
                      await onConfirm(motivo, documento);
                      toast.success("Consulta cancelada com sucesso, sujeita à aprovação do administrador.", {
                        duration: 5000,
                        icon: '✅',
                      });
                      // Fechar modal após sucesso
                      setTimeout(() => {
                        onClose();
                      }, 500);
                    } catch (error) {
                      console.error('Erro ao cancelar:', error);
                      toast.error("Erro ao cancelar consulta. Tente novamente.", {
                        duration: 4000,
                        icon: '❌',
                      });
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="w-full h-12 rounded-lg bg-[#8494E9] text-white font-medium text-base flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Cancelando...' : 'Cancelar sessão'}
                </LoadingButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

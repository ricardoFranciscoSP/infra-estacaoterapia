"use client";
import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import toast from "react-hot-toast";
import { LoadingButton } from "./LoadingButton";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (motivo: string, documento?: File | null) => void;
  consulta: unknown;
}

// Lista completa de motivos de cancelamento (igual aos outros modais)
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

// Motivos que exigem comprovação
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

export default function ModalCancelarSessaoMobile({ open, onClose, onConfirm }: Props) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  
  const [motivo, setMotivo] = useState("");
  const [documento, setDocumento] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

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

  const handleConfirmar = async () => {
    if (!motivo) {
      toast.error("Por favor, selecione um motivo para o cancelamento.");
      return;
    }
    if (mostrarInputDocumento && !documento) {
      toast.error("Este motivo exige o envio de comprovante. Por favor, anexe o documento.");
      return;
    }
    setEnviando(true);
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
      setEnviando(false);
    }
  };

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
          {/* Cabeçalho */}
          <div className="relative flex flex-col items-center p-4 border-b border-gray-200">
            <button onClick={onClose} className="absolute right-4 top-4 text-xl font-bold text-gray-600">
              ×
            </button>
            <Image src="/logo.png" alt="Logo" className="h-6 mb-2" width={24} height={24} style={{ width: 24, height: 24 }} />
            <span className="block text-base font-semibold text-gray-800 mb-2 text-center">Cancelar consulta</span>
          </div>

          {/* Conteúdo */}
          <div className="p-4 flex-1 flex flex-col overflow-y-auto text-gray-800 text-sm leading-relaxed">
            <div className="mb-5">
              <label className="block text-gray-800 font-semibold mb-2.5 text-sm">Qual o motivo do cancelamento?</label>
              <select
                value={motivo}
                onChange={e => {
                  setMotivo(e.target.value);
                  setDocumento(null); // Limpa o documento quando muda o motivo
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9] transition-all"
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
            <div className="flex-grow" />
            <div className="flex gap-4 w-full">
              <button
                onClick={onClose}
                className="w-1/2 h-10 rounded-[6px] border border-[#6D75C0] text-[#6D75C0] font-medium text-base bg-white hover:bg-[#E6E9FF] transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={enviando}
              >
                Voltar
              </button>
              <LoadingButton
                loading={enviando}
                disabled={!motivo || (mostrarInputDocumento && !documento)}
                onClick={handleConfirmar}
                className={`w-1/2 h-10 rounded-[6px] font-medium text-base transition ${!motivo || (mostrarInputDocumento && !documento) ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-[#8494E9] hover:bg-[#6D75C0] text-white"} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {enviando ? "Enviando..." : "Confirmar"}
              </LoadingButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

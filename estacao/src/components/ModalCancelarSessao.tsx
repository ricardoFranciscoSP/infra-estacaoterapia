
import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCancelamentoConsulta, CancelamentoPayload } from "@/hooks/useCancelamentoConsulta";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { LoadingButton } from "./LoadingButton";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { 
  isMotivoAprovado, 
  isMotivoReprovado, 
  TODOS_MOTIVOS,
  FORCA_MAIOR_TOOLTIP 
} from "@/utils/cancelamentoUtils";
import { formatarDataCompleta } from "@/utils/consultaUtils";


interface ModalCancelarSessaoProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  consulta: {
    id?: string | number;
    date?: string;
    time?: string;
    pacienteId?: string;
    psicologoId?: string;
    linkDock?: string;
    status?: string;
    tipo?: string;
    paciente?: {
      nome?: string;
    };
  };
}


const ModalCancelarSessao: React.FC<ModalCancelarSessaoProps> = ({ open, onClose, onConfirm, consulta }) => {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  
  const [motivo, setMotivo] = useState("");
  const [documento, setDocumento] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAvisoReprovado, setShowAvisoReprovado] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { cancelarConsulta, loading } = useCancelamentoConsulta();
  const user = useAuthStore.getState().user;

  const exigeComprovante = isMotivoAprovado(motivo);
  const motivoReprovado = isMotivoReprovado(motivo);

  // Gera um protocolo simples (pode ser melhorado conforme regra de negócio)
  function gerarProtocolo(id: string | number | undefined) {
    const data = new Date();
    return `CANCEL-${data.getFullYear()}${(data.getMonth()+1).toString().padStart(2,'0')}${data.getDate().toString().padStart(2,'0')}-${id}`;
  }

  const isPsychologist = user?.Role === 'Psychologist';

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

  const handleConfirm = async () => {
    // Para cancelamento fora do prazo (<24h), motivo é obrigatório para todos (paciente e psicólogo)
    if (!motivo) {
      toast.error("Por favor, selecione um motivo para o cancelamento.");
      return;
    }
    if (!consulta?.id || !consulta.pacienteId || !consulta.psicologoId || !consulta.time) {
      toast.error("Dados insuficientes para cancelar a consulta.");
      return;
    }

    // Se motivo for reprovado, mostra aviso primeiro
    if (motivoReprovado && !showAvisoReprovado) {
      setShowAvisoReprovado(true);
      return;
    }

    // Validar se motivo exige comprovante e se foi enviado (apenas para motivos aprovados)
    if (exigeComprovante && !documento) {
      toast.error("Este motivo exige o envio de comprovante. Por favor, anexe o documento.");
      return;
    }

    // O status será determinado pelo backend baseado no prazo (>24h = Deferido, <24h = EmAnalise)
    // Não enviamos status do frontend, o backend calcula automaticamente
    const payload: CancelamentoPayload = {
      idconsulta: String(consulta.id),
      idPaciente: String(consulta.pacienteId),
      idPsicologo: String(consulta.psicologoId),
      motivo: motivo || 'Cancelamento solicitado pelo psicólogo',
      protocolo: gerarProtocolo(consulta.id),
      horario: consulta.time,
      data: consulta.date || new Date().toISOString(),
      linkDock: consulta.linkDock,
      status: undefined, // Backend determina baseado no prazo
      tipo: consulta.tipo || (user?.Role === 'Psychologist' ? 'Psicologo' : 'Paciente'),
      documento: documento || null,
    };
    try {
      await cancelarConsulta(payload);
      // Toast de confirmação
      if (motivoReprovado) {
        toast.success("Consulta cancelada. O motivo não se enquadra como força maior e a sessão será considerada como realizada.", {
          duration: 5000,
          icon: '✅',
        });
      } else if (exigeComprovante) {
        toast.success("Consulta cancelada com sucesso, sujeita à aprovação do administrador.", {
          duration: 5000,
          icon: '📄',
        });
      } else {
        toast.success("Consulta cancelada com sucesso, sujeita à aprovação do administrador.", {
          duration: 5000,
          icon: '✅',
        });
      }
      // Fechar modal após sucesso
      setTimeout(() => {
        onConfirm(motivo || 'Cancelamento solicitado pelo psicólogo');
        setShowAvisoReprovado(false);
        onClose();
      }, 500);
    } catch (err: unknown) {
      // Type guard para acessar err.response
      const maybeAxiosError = err as { response?: { data?: { message?: string } } };
      toast.error(maybeAxiosError.response?.data?.message || "Erro ao cancelar consulta", {
        duration: 4000,
        icon: '❌',
      });
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
            {/* Header do Modal - Lilás para paciente, azul escuro para psicólogo */}
            <div className={`w-full h-[56px] flex items-center justify-between px-6 rounded-t-[12px] relative ${
              isPsychologist ? "bg-[#232A5C]" : "bg-[#8494E9]"
            }`}>
              <span className="text-white font-semibold text-[16px] leading-5 text-center absolute left-1/2 -translate-x-1/2">
                Cancelamento
              </span>
              <button
                className="absolute right-6 top-1/2 -translate-y-1/2 text-white text-2xl font-bold hover:text-[#E6E9FF] transition-colors"
                onClick={onClose}
                aria-label="Fechar"
              >
                &times;
              </button>
            </div>
            {/* Conteúdo central */}
            <div className="flex-1 px-8 py-6 overflow-y-auto">
              
              {/* Informações da consulta e aviso sobre repasse para psicólogo */}
              {isPsychologist && consulta.date && consulta.time && (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="text-gray-800 font-semibold mb-3 text-base">Informações da consulta</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    {consulta.paciente?.nome && (
                      <p>
                        <span className="font-semibold">Paciente:</span> {consulta.paciente.nome}
                      </p>
                    )}
                    <p>
                      <span className="font-semibold">Data:</span> {formatarDataCompleta(consulta.date)}
                    </p>
                    <p>
                      <span className="font-semibold">Horário:</span> {consulta.time}
                    </p>
                  </div>
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-800 text-sm font-semibold mb-1">
                      ⚠️ Atenção: Cancelamento com menos de 24 horas
                    </p>
                    <p className="text-red-700 text-sm leading-relaxed">
                      Ao cancelar esta consulta com menos de 24 horas de antecedência, <strong>não haverá repasse do valor da consulta</strong>. O cancelamento será processado, mas o valor não será creditado em sua conta.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Aviso para motivo reprovado */}
              {showAvisoReprovado && motivoReprovado ? (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-gray-800 text-sm font-semibold mb-2">
                    Você está solicitando o cancelamento com menos de 24 horas de antecedência.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-2">
                    O cancelamento é permitido, mas o motivo informado pode não ser aprovado como justificativa de força maior.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Se o motivo não for aceito, a sessão será considerada como realizada e o valor será descontado do seu saldo normalmente.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 mb-6">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Você está solicitando o cancelamento da sessão com menos de 24 horas de antecedência. Caso o motivo do cancelamento não esteja dentro das nossas políticas e regras, a sessão será considerada e descontada do seu saldo do mês.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Por isso, pedimos que selecione abaixo com atenção o motivo do cancelamento, e se necessário e solicitado, anexe um documento válido que comprove a situação.
                  </p>
                  <p className="text-gray-600 text-xs">
                    <a href="#" className="text-[#8494E9] underline" onClick={(e) => { e.preventDefault(); }}>
                      Acesse nossa política de reagendamento e cancelamento Clicando aqui
                    </a>
                  </p>
                </div>
              )}

              <div className="mb-5">
                <label className="block text-gray-800 font-semibold mb-2.5 text-sm">
                  Qual o motivo do cancelamento?
                  {!showAvisoReprovado && (
                    <span 
                      className="ml-2 text-[#8494E9] cursor-help" 
                      title={FORCA_MAIOR_TOOLTIP}
                    >
                      ℹ️
                    </span>
                  )}
                </label>
                <select
                  value={motivo}
                  onChange={e => {
                    setMotivo(e.target.value);
                    setDocumento(null); // Limpa o documento quando muda o motivo
                    setShowAvisoReprovado(false); // Reseta aviso ao mudar motivo
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9] transition-all"
                  disabled={showAvisoReprovado}
                >
                  <option value="">Motivo do cancelamento</option>
                  {TODOS_MOTIVOS.map(m => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aviso para motivo aprovado (força maior) */}
              {!showAvisoReprovado && exigeComprovante && motivo && (
                <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-gray-800 text-sm font-semibold mb-2">
                    O motivo se enquadra em força maior
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Será necessário subir um documento (laudo, atestado, comprovante etc.) para comprovar o motivo. A sessão será temporariamente marcada como pendente e o pedido de cancelamento só será concluído após o upload do arquivo.
                  </p>
                </div>
              )}
              {exigeComprovante && (
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
            <div className="w-full px-8 py-5 flex justify-center gap-3 border-t border-gray-100 bg-white rounded-b-[12px]">
              {isPsychologist ? (
                <>
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="h-11 font-medium text-sm rounded-lg border border-[#8494E9] text-[#8494E9] bg-white hover:bg-[#F2F4FD] transition-all duration-200 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Fechar
                  </button>
                  <LoadingButton
                    onClick={handleConfirm}
                    loading={loading}
                    disabled={false}
                    className="h-11 font-medium text-sm rounded-lg bg-[#8494E9] text-white transition-all duration-200 hover:bg-[#6D75C0] px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Cancelando...' : 'Cancelar sessão'}
                  </LoadingButton>
                </>
              ) : showAvisoReprovado ? (
                <>
                  <button
                    onClick={() => setShowAvisoReprovado(false)}
                    disabled={loading}
                    className="h-11 font-medium text-sm rounded-lg border border-[#8494E9] text-[#8494E9] bg-white hover:bg-[#F2F4FD] transition-all duration-200 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Voltar
                  </button>
                  <LoadingButton
                    onClick={handleConfirm}
                    loading={loading}
                    disabled={false}
                    className="h-11 font-medium text-sm rounded-lg bg-[#8494E9] text-white transition-all duration-200 hover:bg-[#6D75C0] px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Cancelando...' : 'Confirmar cancelamento'}
                  </LoadingButton>
                </>
              ) : (
                <LoadingButton
                  onClick={handleConfirm}
                  loading={loading}
                  disabled={!motivo || (exigeComprovante && !documento)}
                  className="h-11 font-medium text-sm rounded-lg bg-[#8494E9] text-white transition-all duration-200 hover:bg-[#6D75C0] px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Cancelando...' : 'Cancelar sessão'}
                </LoadingButton>
              )}
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModalCancelarSessao;

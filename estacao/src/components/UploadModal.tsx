import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  docType: "crp" | "rgCpf" | "comprovanteEndereco" | "rgCpfSocio" | "contratoSocial" | "comprovanteEndEmpresa" | "cartaoCnpj" | "rgDocumento" | "rgCpfRep" | "simplesNacionalDocumento" | "comprovacaoIss" | null;
  onUpload: (file: File) => void;
    field: string | null;

}

const docNames: Record<string, string> = {
  crp: "Importar CRP",
  rgCpf: "Importar RG/CPF",
  comprovanteEndereco: "Importar Comprovante de endereço",
  rgCpfRep: "Importar RG/CPF Representante",
  contratoSocial: "Importar Contrato Social",
  comprovanteEndEmpresa: "Importar Comprovante endereço empresa",
  cartaoCnpj: "Importar Cartão CNPJ atualizado",
  rgCpfSocio: "Importar RG/CPF Sócio",
  rgDocumento: "Importar RG/CPF Representante",
  simplesNacionalDocumento: "Importar Simples Nacional",
  comprovacaoIss: "Importar Comprovação de ISS",
};

export const UploadModal: React.FC<Props> = ({ open, onClose, docType, onUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMobileActionSheet, setShowMobileActionSheet] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!open || !docType) return null;

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleClick = () => {
    // No mobile, mostra o action sheet para escolher entre câmera, galeria ou documentos
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setShowMobileActionSheet(true);
    } else {
      inputRef.current?.click();
    }
  };

  const handleMobileCamera = () => {
    setShowMobileActionSheet(false);
    cameraInputRef.current?.click();
  };

  const handleMobileGallery = () => {
    setShowMobileActionSheet(false);
    inputRef.current?.click();
  };

  const handleMobileDocuments = () => {
    setShowMobileActionSheet(false);
    documentInputRef.current?.click();
  };

  // Tipos permitidos e tamanho máximo
  const ALLOWED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
    "application/vnd.ms-powerpoint", // ppt
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
    "application/vnd.ms-excel", // xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
    "image/png",
    "image/jpeg",
    "image/jpg"
  ];
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  function validateFile(file: File): string | null {
    // Verifica por tipo MIME ou extensão
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValidType = ALLOWED_TYPES.includes(file.type) || 
      (fileExtension && ['.pdf', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'].includes(`.${fileExtension}`));
    
    if (!isValidType) {
      return "Tipo de arquivo não permitido. Use PDF, DOCX, PPT, XLS, PNG ou JPG.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Arquivo excede o tamanho máximo de 2MB.";
    }
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setShowMobileActionSheet(false); // Fecha o action sheet quando arquivo é selecionado
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFile(file);
  };

  // Versão desktop
  const DesktopModal = (
    <div className="fixed inset-0 z-50 items-center justify-center hidden sm:flex bg-transparent">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-w-[90vw] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative flex items-center justify-center bg-[#8494E9] rounded-t-lg px-6 py-4">
          <h2 className="font-bold text-xl text-white text-center w-full font-fira-sans">
            Upload documentos
          </h2>
          <button
            type="button"
            className="absolute right-6 text-white text-2xl font-bold hover:text-gray-200 font-fira-sans leading-none"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        {/* Conteúdo */}
        <div className="flex flex-col w-full px-6 py-6 font-fira-sans flex-1 overflow-y-auto">
          <div className="mb-3 font-semibold text-lg text-[#212529] font-fira-sans">
            {docNames[docType]}
          </div>
          {/* Observações específicas para Comprovação de ISS */}
          {docType === "comprovacaoIss" && (
            <div className="mb-4">
              <div className="text-[#49525A] text-sm mb-2">
                Aceitamos um desses seguintes documentos como comprovação:
              </div>
              <ul className="list-disc pl-5 text-[#49525A] text-sm space-y-1">
                <li>Comprovante de Cadastro da Prefeitura de Domicílio para ISS;</li>
                <li>Último Recibo emitido no &quot;Documento Fiscal&quot;</li>
                <li>Certidão / Declaração Oficial da Prefeitura de Não Incidência / Isenção de ISS;</li>
                <li>Declaração Psicólogo Não Incidência Municipal (Próprio Punho com reconhecimento em firma) - Caso haja norma da prefeitura;</li>
                <li>Declaração Psicólogo de atuação como Autônomo(a) (Próprio Punho com reconhecimento em firma);</li>
              </ul>
            </div>
          )}
          <div className="mb-4 text-[#49525A] text-sm font-fira-sans">
            Conclua seu pré-cadastro enviando os documentos obrigatórios solicitados
          </div>
          <div
            className={`flex flex-col items-center justify-center cursor-pointer transition-all
              ${dragActive ? "bg-[#f3f4fa]" : ""}
              w-full font-fira-sans
            `}
            style={{
              minHeight: 160,
              borderRadius: 8,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "#444D9D",
              padding: "24px",
            }}
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
            <div className="text-center text-[#444D9D] font-semibold text-base font-fira-sans">
              Clique aqui ou Arraste o arquivo
            </div>
            <div className="mt-2 text-center text-[#49525A] text-sm font-fira-sans">
              Para importar o documento PDF, DOCX, PNG ou JPG (max 2MB)
            </div>
            {file && (
              <div className="mt-3 text-[#212529] text-sm font-fira-sans font-medium">{file.name}</div>
            )}
            {error && (
              <span className="text-red-500 text-xs mt-2">{error}</span>
            )}
          </div>
          {/* Botões */}
          <div className="w-full flex flex-row gap-3 mt-6 font-fira-sans">
            <button
              type="button"
              className="flex-1 h-11 px-4 rounded-lg bg-gray-200 text-[#444D9D] font-semibold font-fira-sans hover:bg-gray-300 transition-colors"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="flex-1 h-11 px-4 rounded-lg bg-[#444D9D] text-white font-semibold font-fira-sans hover:bg-[#3a4080] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!file}
              onClick={() => file && onUpload(file)}
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Versão mobile
  const MobileModal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col sm:hidden bg-white"
        >
          {/* Header fixo */}
          <div className="relative flex flex-col items-center p-4 bg-[#8494E9]">
            <button
              type="button"
              className="absolute right-4 top-4 text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              onClick={onClose}
              aria-label="Fechar"
            >
              ×
            </button>
            <h2 className="font-bold text-xl text-white text-center w-full font-fira-sans">
              Upload documentos
            </h2>
          </div>

          {/* Conteúdo scrollável */}
          <div className="flex-1 flex flex-col px-4 pt-6 pb-4 bg-white overflow-y-auto">
            <div className="mb-3 font-semibold text-lg text-[#212529] font-fira-sans">
              {docNames[docType]}
            </div>
            <div className="mb-4 text-[#49525A] text-sm font-fira-sans leading-relaxed">
              Conclua seu pré-cadastro enviando os documentos obrigatórios solicitados
            </div>

            {/* Área de upload melhorada */}
            <motion.div
              className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-200 relative
                ${dragActive ? "bg-[#f3f4fa] border-[#8494E9]" : file ? "bg-green-50 border-green-400" : "bg-white border-[#444D9D]"}
                w-full font-fira-sans
              `}
              style={{
                minHeight: 140,
                borderRadius: 12,
                borderWidth: 2,
                borderStyle: "dashed",
                padding: "20px",
              }}
              onClick={handleClick}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              whileTap={{ scale: 0.98 }}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.ppt,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
              <input
                ref={cameraInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
              />
              <input
                ref={documentInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.ppt,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
              
              {!file ? (
                <>
                  <svg className="w-12 h-12 text-[#444D9D] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div className="text-center text-[#444D9D] font-semibold text-base font-fira-sans mb-1">
                    Toque para selecionar
                  </div>
                  <div className="text-center text-[#49525A] text-xs font-fira-sans px-2">
                    PDF, PPT, XLS, DOCX ou JPG (máx. 2 MB)
                  </div>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center w-full"
                >
                  <svg className="w-12 h-12 text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-center text-[#212529] text-sm font-semibold font-fira-sans mb-1 break-all px-2">
                    {file.name}
                  </div>
                  <div className="text-center text-[#49525A] text-xs font-fira-sans">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (inputRef.current) inputRef.current.value = '';
                      if (cameraInputRef.current) cameraInputRef.current.value = '';
                      if (documentInputRef.current) documentInputRef.current.value = '';
                    }}
                    className="mt-3 text-xs text-red-500 font-medium"
                  >
                    Remover
                  </button>
                </motion.div>
              )}
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <p className="text-red-600 text-xs font-fira-sans">{error}</p>
              </motion.div>
            )}
          </div>

          {/* Botões fixos no rodapé */}
          <div className="flex gap-3 w-full px-4 py-4 bg-white border-t border-gray-100 safe-area-bottom">
            <button
              type="button"
              className="flex-1 px-6 py-3.5 rounded-xl bg-gray-100 text-[#49525A] font-semibold font-fira-sans active:bg-gray-200 transition-colors"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="flex-1 px-6 py-3.5 rounded-xl bg-[#444D9D] text-white font-semibold font-fira-sans flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed active:bg-[#3a4080] transition-colors"
              disabled={!file}
              onClick={() => file && onUpload(file)}
            >
              {file ? 'Concluir' : 'Selecione um arquivo'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Action Sheet para mobile - permite escolher entre câmera, galeria ou documentos
  const MobileActionSheet = (
    <AnimatePresence>
      {showMobileActionSheet && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-transparent sm:hidden"
            onClick={() => setShowMobileActionSheet(false)}
          />
          
          {/* Action Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[61] bg-white rounded-t-3xl shadow-2xl sm:hidden safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Title */}
            <div className="px-6 pb-4">
              <h3 className="text-center font-semibold text-lg text-[#212529] font-fira-sans">
                Escolha uma ação
              </h3>
            </div>

            {/* Options */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-3 gap-4">
                {/* Câmera */}
                <motion.button
                  type="button"
                  onClick={handleMobileCamera}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-gray-50 active:bg-gray-100 transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-14 h-14 rounded-full bg-[#444D9D]/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-[#444D9D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="text-xs text-[#49525A] font-medium font-fira-sans">Câmera</span>
                </motion.button>

                {/* Galeria */}
                <motion.button
                  type="button"
                  onClick={handleMobileGallery}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-gray-50 active:bg-gray-100 transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-14 h-14 rounded-full bg-[#444D9D]/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-[#444D9D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs text-[#49525A] font-medium font-fira-sans">Fotos e vídeos</span>
                </motion.button>

                {/* Documentos */}
                <motion.button
                  type="button"
                  onClick={handleMobileDocuments}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-gray-50 active:bg-gray-100 transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-14 h-14 rounded-full bg-[#444D9D]/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-[#444D9D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-xs text-[#49525A] font-medium font-fira-sans">Documentos</span>
                </motion.button>
              </div>
            </div>

            {/* Cancel button */}
            <div className="px-6 pb-6 pt-2 border-t border-gray-100">
              <motion.button
                type="button"
                onClick={() => setShowMobileActionSheet(false)}
                className="w-full py-4 rounded-xl bg-gray-100 text-[#49525A] font-semibold font-fira-sans active:bg-gray-200 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Cancelar
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {DesktopModal}
      {MobileModal}
      {MobileActionSheet}
    </>
  );
};

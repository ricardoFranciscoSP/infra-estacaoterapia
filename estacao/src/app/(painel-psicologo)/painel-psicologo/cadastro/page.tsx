"use client";
import { FaInstagram, FaFacebookF, FaLinkedinIn, FaTiktok, FaYoutube } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadContrato } from '@/hooks/user/userHook';

export default function CadastroEmAnalise() {
  const [showMessage, setShowMessage] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { mutate, isPending } = useUploadContrato();
  const router = useRouter();

  useEffect(() => {
    setShowMessage(true);
    const timer = setTimeout(() => setShowMessage(false), 5000); 
    return () => clearTimeout(timer);
  }, []);

  // Função para lidar com upload
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleContinue() {
    if (!file) return;
    setSuccessMsg(null);
    setErrorMsg(null);
    mutate(file, {
      onSuccess: (res) => {
        setSuccessMsg(res?.message || 'Contrato enviado com sucesso!');
        setFile(null);
        setTimeout(() => {
          router.push('/painel-psicologo');
        }, 1200);
      },
      onError: (err: unknown) => {
        let msg = 'Erro ao enviar contrato. Tente novamente.';
        if (err && typeof err === 'object' && 'message' in err) {
          msg = String((err as { message?: string }).message) || msg;
        }
        setErrorMsg(msg);
      },
    });
  }

  return (
    <div className="min-h-screen bg-[#f9f8f3] flex flex-col items-center justify-center px-2 sm:px-4 py-6 sm:py-8 text-[#333]">
      {/* Loading Overlay */}
      {isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 border-4 border-[#444D9D] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[#444D9D] font-semibold mt-2">Enviando contrato...</span>
          </div>
        </div>
      )}
      {/* Mensagem no canto superior direito */}
      {showMessage && (
        <div className="fixed top-4 right-4 bg-green-100 text-green-800 text-sm px-4 py-2 rounded-md shadow-md">
          <span>✅ Cadastro efetuado com sucesso!</span>
        </div>
      )}
      {/* Mensagem de sucesso/erro do upload */}
      {successMsg && (
        <div className="fixed top-20 right-4 bg-green-100 text-green-800 text-sm px-4 py-2 rounded-md shadow-md z-50">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-20 right-4 bg-red-100 text-red-800 text-sm px-4 py-2 rounded-md shadow-md z-50">
          {errorMsg}
        </div>
      )}

      {/* Logo centralizado */}
      <div className="flex flex-col items-center mb-8">
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/assets/logo/logo-estacao.svg"
            alt="Logo Estação Terapia"
            width={160}
            height={48}
            className="h-12 mb-2 hover:opacity-80 transition-opacity duration-300 cursor-pointer"
            priority
          />
        </Link>
      </div>

      {/* Conteúdo principal */}
      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row items-center justify-center gap-0 min-w-0 lg:min-w-[1200px]">
        {/* Coluna da imagem */}
        <div className="flex justify-center items-center w-full lg:w-[400px] min-w-0 lg:min-w-[400px] lg:max-w-[400px] h-auto lg:h-[486px] mb-6 lg:mb-0">
          <Image
            src="/assets/images/swinging.svg"
            alt="Ilustração análise"
            width={392}
            height={315}
            className="w-[220px] h-[180px] sm:w-[392px] sm:h-[315px]"
          />
        </div>

        {/* Coluna da direita: ocupa o restante */}
        <div className="flex flex-col justify-start items-center lg:items-start h-auto lg:h-[486px] px-2 sm:px-8 flex-1 min-w-0 lg:min-w-[400px] lg:max-w-[1000px]">
          <h1 className="fira-sans font-semibold text-[28px] sm:text-[40px] leading-[36px] sm:leading-[64px] text-[#212529] mb-3 sm:mb-4 text-center lg:text-left">
            Boas-vindas à Estação Terapia!
          </h1>
          <p className="fira-sans font-normal text-[15px] sm:text-[16px] leading-[22px] sm:leading-[24px] text-[#49525A] mb-2 text-center lg:text-left">
            É uma alegria ter você aqui conosco.
          </p>
          <p className="fira-sans font-normal text-[15px] sm:text-[16px] leading-[22px] sm:leading-[24px] text-[#49525A] mb-2 text-center lg:text-left">
            Antes de seguirmos, é preciso concluir uma etapa importante, o nosso contrato:
          </p>
          <p className="fira-sans font-normal text-[15px] sm:text-[16px] leading-[22px] sm:leading-[24px] text-[#49525A] mb-3 sm:mb-4 text-center lg:text-left">
            Enviamos no seu e-mail o nosso contrato.
          </p>
          <p className="fira-sans font-normal text-[15px] sm:text-[16px] leading-[22px] sm:leading-[24px] text-[#49525A] mb-3 sm:mb-4 text-center lg:text-left">
            Leia com atenção, assine e faça o upload do documento assinado aqui abaixo para que você comece já a usar a plataforma.
          </p>

          {/* Campo de upload */}
          <div
            className="w-full border-2 border-dashed border-[#8494E9] rounded-lg bg-white flex flex-col items-center justify-center py-4 sm:py-6 mb-4 sm:mb-6 cursor-pointer transition hover:border-[#444D9D]"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            tabIndex={0}
          >
            <label htmlFor="contrato-upload" className="flex flex-col items-center cursor-pointer w-full">
              <span className="text-[#444D9D] font-medium mb-2">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke="#444D9D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="4" y="16" width="16" height="4" rx="2" fill="#8494E9" opacity="0.2"/></svg>
              </span>
              <span className="text-[#444D9D] font-medium mb-1 text-center">Clique aqui ou Arraste o arquivo</span>
              <span className="text-[#49525A] text-sm mb-2 text-center">para importar o documento</span>
              <span className="text-[#49525A] text-xs text-center">PDF, PPT, XLS ou JPG (max 25 MB)</span>
              <input
                id="contrato-upload"
                type="file"
                accept=".pdf,.ppt,.xls,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFileChange}
                disabled={isPending}
              />
            </label>
            {file && (
              <span className="mt-2 text-[#444D9D] text-sm break-all text-center">
                {file.name}
              </span>
            )}
          </div>

          {/* Botão Continuar */}
          <button
            className={`w-full py-3 rounded-lg font-semibold text-[16px] sm:text-[18px] transition ${
              file && !isPending
                ? "bg-[#444D9D] text-white hover:bg-[#2c3570] cursor-pointer"
                : "bg-[#E9ECEF] text-[#ADB5BD] cursor-not-allowed"
            }`}
            disabled={!file || isPending}
            onClick={handleContinue}
          >
            {isPending ? "Enviando..." : "Continuar"}
          </button>

          {/* Redes sociais */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full mt-6 sm:mt-8 gap-2 sm:gap-0">
            <p className="fira-sans font-medium text-[16px] sm:text-[18px] leading-[24px] sm:leading-[28px] text-[#444D9D] text-center sm:text-left">
              Aproveite e nos siga nas redes sociais:
            </p>
            <div className="flex gap-[2px] text-[#8494E9]">
              <a href="#" aria-label="Instagram" className="w-[32px] h-[32px] flex items-center justify-center">
                <FaInstagram />
              </a>
              <a href="#" aria-label="Facebook" className="w-[32px] h-[32px] flex items-center justify-center">
                <FaFacebookF />
              </a>
              <a href="#" aria-label="LinkedIn" className="w-[32px] h-[32px] flex items-center justify-center">
                <FaLinkedinIn />
              </a>
              <a href="#" aria-label="TikTok" className="w-[32px] h-[32px] flex items-center justify-center">
                <FaTiktok />
              </a>
              <a href="#" aria-label="YouTube" className="w-[32px] h-[32px] flex items-center justify-center">
                <FaYoutube />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ResetSenhaPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    // Aqui você pode chamar sua API para redefinir a senha
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F2F4FD]">
      {/* Logo centralizado */}
      <div className="mb-8">
        <Link href="/">
          <Image
            src="/logo.svg"
            alt="Logo"
            width={200}
            height={60}
            className="w-[100px] h-auto xs:w-[120px] sm:w-[140px] md:w-[120px] lg:w-[200px] max-w-[60vw] hover:opacity-80 transition-opacity duration-300"
            style={{ maxWidth: '200px', width: '100%', height: 'auto' }}
            priority
            sizes="(max-width: 640px) 120px, (max-width: 1024px) 140px, 200px"
          />
        </Link>
      </div>
      {/* Card de redefinir senha */}
      <div className="w-full max-w-sm bg-white border border-[#E5E9FA] rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-semibold text-center text-[#212529] mb-6">Criar nova senha</h2>
        {!enviado ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4 relative flex flex-col gap-1 w-full">
              <label htmlFor="novaSenha" className="block text-[#212529] font-medium mb-1">
                Nova senha
              </label>
              <input
                type={showPassword ? "text" : "password"}
                id="novaSenha"
                className="w-full px-3 py-2 border border-[#E5E9FA] rounded bg-[#F2F4FD] text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#8494E9] pr-10"
                placeholder="Digite a nova senha"
                autoComplete="off"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-[38px] text-[#8494E9] cursor-pointer p-0 bg-transparent border-0 flex items-center justify-center"
                tabIndex={-1}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <Image src="/icons/eye.svg" alt="Ocultar senha" width={20} height={20} />
                ) : (
                  <Image src="/icons/eyeSlash.svg" alt="Mostrar senha" width={20} height={20} />
                )}
              </button>
            </div>
            <div className="mb-6 relative flex flex-col gap-1 w-full">
              <label htmlFor="confirmarSenha" className="block text-[#212529] font-medium mb-1">
                Confirmar nova senha
              </label>
              <input
                type={showPassword2 ? "text" : "password"}
                id="confirmarSenha"
                className="w-full px-3 py-2 border border-[#E5E9FA] rounded bg-[#F2F4FD] text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#8494E9] pr-10"
                placeholder="Confirme a nova senha"
                autoComplete="off"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-[38px] text-[#8494E9] cursor-pointer p-0 bg-transparent border-0 flex items-center justify-center"
                tabIndex={-1}
                onClick={() => setShowPassword2((prev) => !prev)}
                aria-label={showPassword2 ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword2 ? (
                  <Image src="/icons/eye.svg" alt="Ocultar senha" width={20} height={20} />
                ) : (
                  <Image src="/icons/eyeSlash.svg" alt="Mostrar senha" width={20} height={20} />
                )}
              </button>
            </div>
            <button
              type="submit"
              className="w-full bg-[#8494E9] text-white font-semibold py-2 rounded hover:bg-[#6d7ad6] transition-colors"
            >
              Redefinir senha
            </button>
          </form>
        ) : (
          <div className="text-center text-[#212529]">
            Sua senha foi redefinida com sucesso!<br />
            <Link
              href="/(adm-login)/adm-login"
              className="text-[#8494E9] text-[16px] font-medium underline hover:text-[#6d7ad6] transition-colors"
            >
              Voltar para login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

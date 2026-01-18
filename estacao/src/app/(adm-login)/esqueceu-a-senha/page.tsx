'use client';
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function EsqueceuSenhaPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui você pode chamar sua API de recuperação de senha
    router.push("/reset-senha");
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
            height={80}
            className="w-[100px] h-auto xs:w-[120px] sm:w-[140px] md:w-[120px] lg:w-[200px] max-w-[60vw] hover:opacity-80 transition-opacity duration-300"
            style={{ maxWidth: '200px', width: '100%', height: 'auto' }}
            priority
            sizes="(max-width: 640px) 120px, (max-width: 1024px) 140px, 200px"
          />
        </Link>
      </div>
      {/* Card esqueceu a senha */}
      <div className="w-full max-w-sm bg-white border border-[#E5E9FA] rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-semibold text-center text-[#212529] mb-6">Redefinir senha</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-[#212529] font-medium mb-1">
              E-mail
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-3 py-2 border border-[#E5E9FA] rounded bg-[#F2F4FD] text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
              placeholder="Digite seu e-mail"
              autoComplete="off"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#8494E9] text-white font-semibold py-2 rounded hover:bg-[#6d7ad6] transition-colors"
          >
            Obter nova senha
          </button>
        </form>
        <div className="mt-6 text-center">
          <a
            href="/adm-login"
            className="text-[#8494E9] text-[16px] font-medium underline hover:text-[#6d7ad6] transition-colors"
          >
            ← Voltar para login
          </a>
        </div>
      </div>
    </div>
  );
}
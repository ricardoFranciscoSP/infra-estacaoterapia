"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import LoginSlider from "@/components/LoginSlider";
import { useRouter } from "next/navigation";
import { esqueciSenhaSchema, EsqueciSenhaForm } from "./schemas";
import { useAuth } from '@/hooks/authHook'; 
import toast from 'react-hot-toast';

import Link from "next/link";
import Image from "next/image";

const ForgotPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<EsqueciSenhaForm>({
    resolver: zodResolver(esqueciSenhaSchema),
    mode: "onTouched",
  });
  const router = useRouter();
  const { forgot } = useAuth();

  // Adiciona a animação CSS globalmente se não existir
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('forgot-button-shimmer-style')) {
      const style = document.createElement('style');
      style.id = 'forgot-button-shimmer-style';
      style.textContent = `
        @keyframes forgotButtonShimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const handleRedefinirSenha = async (data: EsqueciSenhaForm) => {
    setIsLoading(true);
    try {
      const result = await forgot(data.email);
      if (result?.success) {
        toast.success(result.message || "E-mail enviado com sucesso!");
        router.push("/resetar");
      } else {
        toast.error(result?.message || "Erro ao enviar e-mail.");
        setIsLoading(false);
      }
    } catch {
      toast.error("Erro ao enviar e-mail. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="w-screen h-screen min-h-screen min-w-full flex flex-col md:flex-row bg-white md:bg-[#f5f7ff]">
        {/* Lado esquerdo - Login */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-center bg-white px-6 md:px-16 py-8 md:py-0 min-h-screen">
          <Link
            href="/"
            className="flex-shrink-0 mb-6 flex justify-center mt-8 md:mt-10"
          >
            <Image
              src="/logo.png"
              alt="Logo Estação Terapia"
              width={200}
              height={60}
              className="w-[100px] h-auto xs:w-[120px] sm:w-[140px] md:w-[120px] lg:w-[200px] max-w-[60vw] hover:opacity-80 transition-opacity duration-300"
              style={{ maxWidth: "200px", width: "100%", height: "auto" }}
              priority
              sizes="(max-width: 640px) 120px, (max-width: 1024px) 140px, 200px"
            />
          </Link>
          <div className="w-full max-w-[652px] px-4 md:px-0 mx-auto">
            <h2 className="font-semibold text-[20px] md:text-[24px] leading-[32px] md:leading-[40px] text-[#212529] mb-2 md:mb-4 text-left">
              Esqueceu a senha?
            </h2>
            <p className="text-[#6c6bb6] text-[15px] md:text-[16px] mb-6 md:mb-8 text-left">
              Digite seu e-mail cadastrado para criar uma nova senha.
            </p>
            <form
              onSubmit={form.handleSubmit(handleRedefinirSenha)}
              className="flex flex-col gap-3"
            >
              <input
                type="text"
                placeholder="E-mail"
                className={`border border-[#d1d5db] rounded-md px-4 h-[40px] w-full bg-white md:bg-[#e6eefe] focus:outline-none focus:ring-2 focus:ring-[#6c6bb6] text-[#23253a] text-sm md:text-base ${
                  form.formState.errors.email ? "border-red-500" : ""
                }`}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <span className="text-red-500 text-xs">
                  {form.formState.errors.email.message}
                </span>
              )}
              <div className="flex flex-col gap-3 mt-2">
                <button
                  type="submit"
                  className="relative w-full bg-[#8494E9] text-white font-bold rounded-md py-3 transition-colors text-base hover:bg-[#6c6bb6] overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={!form.formState.isValid || isLoading}
                >
                  <span className={`relative z-10 ${isLoading ? 'opacity-90' : ''}`}>
                    Redefinir senha
                  </span>
                  
                  {/* Overlay de loading com cor lilás mais escuro */}
                  {isLoading && (
                    <div className="absolute inset-0">
                      {/* Fundo escurecido com lilás mais escuro */}
                      <div className="absolute inset-0 bg-[#5a63b0] opacity-90" />
                      
                      {/* Animação shimmer da esquerda para direita */}
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)',
                          width: '60%',
                          animation: 'forgotButtonShimmer 1.5s ease-in-out infinite',
                        }}
                      />
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  className="w-full bg-white border border-red-500 text-red-500 font-bold rounded-md py-3 transition-colors text-base hover:bg-red-100 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => router.push("/login")}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
        {/* Lado direito - Slider */}
        <div className="hidden md:flex w-full md:w-1/2 h-full items-center justify-center min-h-screen">
          <div className="w-full h-full flex items-center justify-center">
            <LoginSlider />
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPage;


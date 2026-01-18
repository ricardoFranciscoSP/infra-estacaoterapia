"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import LoginSlider from "@/components/LoginSlider";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from '@/hooks/authHook'; 
import toast from 'react-hot-toast';

const resetSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  repetirSenha: z.string().min(6, "Repita a senha"),
}).refine((data) => data.senha === data.repetirSenha, {
  message: "As senhas não coincidem",
  path: ["repetirSenha"],
});

type ResetForm = z.infer<typeof resetSchema>;

const ResetarPage = () => {
   const { reset } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const form = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    mode: "onTouched",
  });
  const router = useRouter();

  const handleResetar = async (data: ResetForm) => {
    const result = await reset(data.codigo, data.senha);
    if (result?.success) {
      toast.success(result.message || "Senha redefinida com sucesso!");
      router.push("/login");
    } else {
      toast.error(result?.message || "Erro ao redefinir senha.");
    }
  };

  return (
    <>
      <div className="w-screen h-screen min-h-screen min-w-full flex flex-col md:flex-row bg-white md:bg-[#f5f7ff]">
        {/* Lado esquerdo - Formulário */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-center bg-white px-6 md:px-16 py-8 md:py-0 min-h-screen">
          <Link href="/" className="flex-shrink-0 mb-6 flex justify-center mt-8 md:mt-10">
            <Image
              src="/logo.png"
              alt="Logo Estação Terapia" 
              width={200}
              height={60}
              className="w-[100px] h-auto xs:w-[120px] sm:w-[140px] md:w-[120px] lg:w-[200px] max-w-[60vw] hover:opacity-80 transition-opacity duration-300"
              style={{ maxWidth: '200px', width: '100%', height: 'auto' }}
              priority
              sizes="(max-width: 640px) 120px, (max-width: 1024px) 140px, 200px"
            />
          </Link>
          <div className="w-full max-w-[652px] px-4 md:px-0 mx-auto">
            <h2 className="font-semibold text-[20px] md:text-[24px] leading-[32px] md:leading-[40px] text-[#212529] mb-2 md:mb-4 text-left">Redefinir senha</h2>
            <p className="text-[#6c6bb6] text-[15px] md:text-[16px] mb-6 md:mb-8 text-left">Digite o código recebido e crie uma nova senha.</p>
            <form onSubmit={form.handleSubmit(handleResetar)} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="codigo" className="text-[#23253a] font-medium text-sm md:text-base">Código</label>
                <input
                  id="codigo"
                  type="text"
                  placeholder="Código"
                  className={`border border-[#d1d5db] rounded-md px-4 h-[40px] w-full bg-white md:bg-[#e6eefe] focus:outline-none focus:ring-2 focus:ring-[#6c6bb6] text-[#23253a] text-sm md:text-base ${form.formState.errors.codigo ? 'border-red-500' : ''}`}
                  {...form.register("codigo")}
                />
              </div>
              {form.formState.errors.codigo && (
                <span className="text-red-500 text-xs">{form.formState.errors.codigo.message}</span>
              )}
              <div className="flex flex-col gap-1">
                <label htmlFor="senha" className="text-[#23253a] font-medium text-sm md:text-base">Nova senha</label>
                <div className="relative">
                  <input
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nova senha"
                    className={`border border-[#d1d5db] rounded-md px-4 h-[40px] w-full bg-white md:bg-[#e6eefe] focus:outline-none focus:ring-2 focus:ring-[#6c6bb6] text-[#23253a] text-sm md:text-base pr-10 ${form.formState.errors.senha ? 'border-red-500' : ''}`}
                    {...form.register("senha")}
                  />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c6bb6] cursor-pointer p-0 bg-transparent border-0"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <Image src="/icons/eye.svg" alt="Ocultar senha" width={20} height={20} />
                  ) : (
                    <Image src="/icons/eyeSlash.svg" alt="Mostrar senha" width={20} height={20} />
                  )}
                </button>
              </div>
              </div>
              {form.formState.errors.senha && (
                <span className="text-red-500 text-xs">{form.formState.errors.senha.message}</span>
              )}
              <div className="flex flex-col gap-1">
                <label htmlFor="repetirSenha" className="text-[#23253a] font-medium text-sm md:text-base">Repita a nova senha</label>
                <div className="relative">
                  <input
                    id="repetirSenha"
                    type={showRepeatPassword ? "text" : "password"}
                    placeholder="Repita a nova senha"
                    className={`border border-[#d1d5db] rounded-md px-4 h-[40px] w-full bg-white md:bg-[#e6eefe] focus:outline-none focus:ring-2 focus:ring-[#6c6bb6] text-[#23253a] text-sm md:text-base pr-10 ${form.formState.errors.repetirSenha ? 'border-red-500' : ''}`}
                    {...form.register("repetirSenha")}
                  />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c6bb6] cursor-pointer p-0 bg-transparent border-0"
                  tabIndex={-1}
                  onClick={() => setShowRepeatPassword((prev) => !prev)}
                  aria-label={showRepeatPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showRepeatPassword ? (
                    <Image src="/icons/eye.svg" alt="Ocultar senha" width={20} height={20} />
                  ) : (
                    <Image src="/icons/eyeSlash.svg" alt="Mostrar senha" width={20} height={20} />
                  )}
                </button>
              </div>
              </div>
              {form.formState.errors.repetirSenha && (
                <span className="text-red-500 text-xs">{form.formState.errors.repetirSenha.message}</span>
              )}
              <div className="flex flex-col gap-3 mt-2">
                <button
                  type="submit"
                  className="w-full bg-[#8494E9] text-white font-bold rounded-md py-3 transition-colors text-base hover:bg-[#6c6bb6]"
                  disabled={!form.formState.isValid}
                >
                  Redefinir senha
                </button>
                <button
                  type="button"
                  className="w-full bg-white border border-red-500 text-red-500 font-bold rounded-md py-3 transition-colors text-base hover:bg-red-100"
                  onClick={() => router.push("/login")}
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

export default ResetarPage;


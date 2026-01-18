'use client';
import React, { useState } from "react";
import { useAuthStore, User } from '@/store/authStore';
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export default function AdmLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();
  const { register: formRegister, handleSubmit } = useForm<User>();

  async function handleLogin({ Email, Password }: User) {
    setIsLoading(true);
    try {
      console.log('[LOGIN PAGE] Iniciando login...');
      const result = await login(Email, Password);
      
      console.log('[LOGIN PAGE] Resultado do login:', {
        success: result.success,
        hasUser: !!result.user,
        message: result.message,
      });
      
      if (result.success && result.user) {
        toast.success("Login realizado com sucesso!");
        
        console.log('[LOGIN PAGE] ℹ️ Cookies HttpOnly (token, refreshToken, role):');
        console.log('[LOGIN PAGE]   - Setados pelo BACKEND via Set-Cookie header');
        console.log('[LOGIN PAGE]   - NÃO aparecem em document.cookie (segurança)');
        console.log('[LOGIN PAGE]   - Enviados AUTOMATICAMENTE em todas requisições');
        console.log('[LOGIN PAGE]   - Verifique no DevTools > Application > Cookies');
        
        // Aguarda um momento para garantir processamento do navegador
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Redireciona baseado no role do usuário
        const userRole = result.user.Role as string;
        let redirectPath = "/adm-estacao"; // Default para Admin
        
        if (userRole === "Finance") {
          redirectPath = "/adm-finance";
        } else if (userRole === "Admin") {
          redirectPath = "/adm-estacao";
        } else {
          // Se não for Admin nem Finance, redireciona para no-permission
          redirectPath = "/no-permission";
        }
        
        console.log('[LOGIN PAGE] ✅ Redirecionando para:', redirectPath);
        router.push(redirectPath);
      } else {
        toast.error(result.message || "E-mail ou senha inválidos.");
      }
    } catch (error) {
      console.error('[LOGIN PAGE] Erro no login:', error);
      toast.error("Erro ao realizar login.");
    } finally {
      setIsLoading(false);
    }
  }

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
      {/* Card de login */}
      <div className="w-full max-w-sm bg-white border border-[#E5E9FA] rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-semibold text-center text-[#212529] mb-6">Acessar painel</h2>
        <form onSubmit={handleSubmit(handleLogin)}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-[#212529] font-medium mb-1">
              E-mail
            </label>
            <input
              type="email"
              id="email"
              {...formRegister("Email")}
              className="w-full px-3 py-2 border border-[#E5E9FA] rounded bg-[#F2F4FD] text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
              placeholder="Digite seu e-mail"
              autoComplete="off"
            />
          </div>
          <div className="mb-6 relative flex flex-col gap-1 w-full">
            <label htmlFor="senha" className="block text-[#212529] font-medium mb-1">
              Senha
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="senha"
              {...formRegister("Password")}
              className="w-full px-3 py-2 border border-[#E5E9FA] rounded bg-[#F2F4FD] text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#8494E9] pr-10"
              placeholder="Digite sua senha"
              autoComplete="off"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8494E9] cursor-pointer p-0 bg-transparent border-0 flex items-center justify-center mt-6"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              style={{ top: "50%", transform: "translateY(-50%)" }}
            >
              {showPassword ? (
                <Image src="/icons/eye.svg" alt="Ocultar senha" width={20} height={20} />
              ) : (
                <Image src="/icons/eyeSlash.svg" alt="Mostrar senha" width={20} height={20} />
              )}
            </button>
          </div>
          <button
            type="submit"
            className={`w-full bg-[#8494E9] text-white font-semibold py-2 rounded hover:bg-[#6d7ad6] transition-colors flex items-center justify-center`}
            disabled={isLoading}
          >
            <AnimatePresence initial={false} mode="wait">
              {isLoading ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    className="loader"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    style={{
                      width: 18,
                      height: 18,
                      border: "3px solid #fff",
                      borderTop: "3px solid #6d7ad6",
                      borderRadius: "50%",
                      marginRight: 8,
                    }}
                  />
                </motion.span>
              ) : (
                <motion.span
                  key="entrar"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  Entrar
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </form>
        <div className="mt-6 text-center">
          <a
            href="/esqueceu-a-senha"
            className="text-[#8494E9] text-[16px] font-medium underline hover:text-[#6d7ad6] transition-colors"
          >
            Perdeu a senha?
          </a>
        </div>
      </div>
    </div>
  );
}

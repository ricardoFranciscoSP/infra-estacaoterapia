"use client";
import React, { useState } from "react";
import { useForm, FormProvider } from 'react-hook-form';
import { FormInput } from '@/components/FormInput';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import getSocket, { joinUserRoom } from '@/lib/socket';
import Link from "next/link";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { pacienteSchema, psicologoSchema, PacienteForm, PsicologoForm } from "./schemas";
import LoginSlider from "@/components/LoginSlider";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/store/uiStore";
import { ProgressButton } from "@/components/ProgressButton";
import { getRedirectRouteByRole } from "@/utils/redirectByRole";

const LoginPage = () => {
  const [tab, setTab] = useState("paciente");

  
  // Formulários separados para paciente e psicólogo
  const pacienteForm = useForm<PacienteForm>({
    resolver: zodResolver(pacienteSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      senha: "",
    },
  });
  const psicologoForm = useForm<PsicologoForm>({
    resolver: zodResolver(psicologoSchema),
    mode: "onTouched",
    defaultValues: {
      crp: "",
      senha: "",
    },
  });
  const router = useRouter(); 
  const { login } = useAuthStore();
  const setLoading = useUIStore((s) => s.setLoading);
  const isLoading = useUIStore((s) => s.isLoading);


  async function handleLogin({ email, senha, crp }: Partial<PacienteForm & PsicologoForm>) {
    setLoading(true);
    try {
      const loginId = email ?? crp ?? '';
      if (!loginId || !senha) {
        throw new Error('Preencha todos os campos');
      }

      const result = await login(loginId, senha);

      if (!result.success) {
        throw new Error(result.message || 'Login inválido');
      }

      toast.success(result.message || 'Login realizado com sucesso!');

      // Obtém o usuário do resultado ou dos cookies como fallback
      let user = result.user && Object.keys(result.user).length > 0 ? result.user : undefined;

      if (!user && typeof window !== 'undefined') {
        const Cookies = (await import('js-cookie')).default;
        const userCookie = Cookies.get('user-data-client');
        user = userCookie ? JSON.parse(userCookie) : undefined;
      }

      // --- SOCKET.IO: Conecta e escuta eventos reativos ---
      if (user && user.Id) {
        const socket = getSocket();
        if (socket) {
          joinUserRoom(user.Id);
          // Remove listeners antigos para evitar duplicidade
          socket.off('user:blocked');
          socket.off('user:status-update');
          socket.off('user:onboarding-update');

          // Exemplo: usuário bloqueado em tempo real
          socket.on('user:blocked', (data: { reason?: string }) => {
            toast.error('Sua conta foi bloqueada. Motivo: ' + (data?.reason || 'Indisponível'));
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          });

          // Exemplo: status atualizado (ex: EmAnalise → Ativo)
          socket.on('user:status-update', (data: { status: string; message?: string }) => {
            toast.success(data?.message || `Status atualizado: ${data.status}`);
            // Opcional: redirecionar se necessário
            // router.push(getRedirectRoute({ ...user, Status: data.status }));
          });

          // Exemplo: onboarding atualizado
          socket.on('user:onboarding-update', (data: { completed: boolean; step?: string }) => {
            toast.success(data.completed ? 'Onboarding concluído!' : 'Onboarding atualizado.');
            // Opcional: redirecionar se necessário
          });
        }
      }

      // Verifica se há um draftId pendente e contexto de primeira sessão
      if (typeof window !== 'undefined') {
        const draftId = window.localStorage.getItem('draftId');
        const agendamentoPendente = window.sessionStorage.getItem('agendamento-pendente');
        
        if (draftId && user?.Role === 'Patient') {
          // Verifica se é fluxo de primeira sessão do marketplace
          if (agendamentoPendente) {
            try {
              const agendamento = JSON.parse(agendamentoPendente);
              if (agendamento.contexto === 'primeira_sessao' && agendamento.psicologoId) {
                // Redireciona para compra da primeira sessão vinculada ao psicólogo
                router.push(`/comprar-consulta?psicologoId=${agendamento.psicologoId}`);
                return;
              }
            } catch {
              // Se não conseguir parsear, segue fluxo normal
            }
          }
          
          // Fluxo normal: redireciona para success para confirmar agendamento
          router.push('/painel/success');
          return;
        }
      }

      // Verifica se é psicólogo e valida status
      if (user?.Role === 'Psychologist') {
        // Normaliza o status para comparação
        const normalizeStatus = (status: string | undefined): string => {
          if (!status) return '';
          return status
            .replace(/\s/g, '')
            .replace(/[áàâãéêíóôõúüç]/gi, (match) => {
              const map: Record<string, string> = {
                'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a',
                'é': 'e', 'ê': 'e',
                'í': 'i',
                'ó': 'o', 'ô': 'o', 'õ': 'o',
                'ú': 'u', 'ü': 'u',
                'ç': 'c'
              };
              return map[match.toLowerCase()] || match;
            })
            .toLowerCase();
        };

        console.log('[LOGIN] Status do psicólogo:', {
          statusOriginal: user.Status,
          statusNormalized: normalizeStatus(user.Status),
          isAtivo: normalizeStatus(user.Status) === "ativo"
        });
      }

      // Redireciona para a rota apropriada baseada no role e status do usuário
      const redirectRoute = getRedirectRouteByRole(user) || '/painel';
      console.log('[LOGIN] Redirecionando para:', redirectRoute, {
        role: user?.Role,
        status: user?.Status
      });
      router.push(redirectRoute);

    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Erro ao fazer login. Verifique seus dados.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }

  const handlePaciente = (data: PacienteForm) => handleLogin({ email: data.email, senha: data.senha });
  const handlePsicologo = (data: PsicologoForm) => handleLogin({ crp: data.crp, senha: data.senha });


  return (
    <>
      <div className="w-screen h-screen min-h-screen min-w-full flex flex-col md:flex-row bg-white md:bg-[#f5f7ff]">
        {/* Lado esquerdo - Login */}
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
            />
          </Link>
          <div className="w-full max-w-[652px] px-4 md:px-0 mx-auto">
            <div className="flex mb-6 rounded-lg overflow-hidden border border-[#8494E9] w-full h-[48px] md:h-[60px]">
              <button
                className={`w-1/2 md:w-[326px] h-[48px] md:h-[60px] gap-[10px] px-2 md:px-4 py-2 md:py-4 text-sm md:text-base font-medium transition-colors
                  ${tab === "paciente"
                    ? "bg-[#E5E9FA] text-[#6c6bb6] border-b-[3px] border-b-[#8494E9] border-x-0 border-t-0 border-solid"
                    : "bg-white text-[#23253a] border-b-[3px] border-b-transparent border-x-0 border-t-0 border-solid"}
                `}
                onClick={() => setTab("paciente")}
                type="button"
              >
                Paciente
              </button>
              <button
                className={`w-1/2 md:w-[326px] h-[48px] md:h-[60px] gap-[10px] px-2 md:px-4 py-2 md:py-4 text-sm md:text-base font-medium transition-colors
                  ${tab === "psicologo"
                    ? "bg-[#E5E9FA] text-[#6c6bb6] border-b-[3px] border-b-[#8494E9] border-x-0 border-t-0 border-solid"
                    : "bg-white text-[#23253a] border-b-[3px] border-b-transparent border-x-0 border-t-0 border-solid"}
                `}
                onClick={() => setTab("psicologo")}
                type="button"
              >
                Psicólogo(a)
              </button>
            </div>
            <h2 className="font-semibold text-[20px] md:text-[24px] leading-[32px] md:leading-[40px] text-[#212529] mb-4 md:mb-6 text-left">Acesse sua conta</h2>
            {tab === "paciente" ? (
              <FormProvider {...pacienteForm} key="paciente">
                <form onSubmit={pacienteForm.handleSubmit(handlePaciente)} className="flex flex-col gap-3">
                  <FormInput
                    name="email"
                    placeholder="E-mail"
                    type="text"
                    autoComplete="off"
                    key="paciente-email"
                  />
                  <FormInput
                    name="senha"
                    placeholder="Senha"
                    type="password"
                    autoComplete="off"
                    key="paciente-senha"
                  />
                  <div className="flex items-center justify-between text-xs mt-1 mb-2">
                    <button
                      type="button"
                      className="font-medium text-[14px] leading-[24px] align-middle text-[#6D75C0] hover:underline cursor-pointer"
                      onClick={() => router.push("/forgot")}
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <ProgressButton
                    type="submit"
                    isLoading={isLoading}
                    disabled={
                      !(
                        pacienteForm.watch("email")?.length > 0 &&
                        pacienteForm.watch("senha")?.length > 0
                      )
                    }
                    className={`w-full font-bold rounded-md py-3 transition-colors text-base mt-2 
                      ${
                        pacienteForm.watch("email")?.length > 0 &&
                        pacienteForm.watch("senha")?.length > 0
                          ? 'bg-[#8494E9] text-white cursor-pointer hover:bg-[#6c6bb6]'
                          : 'bg-[#e6eefe] text-[#bfc6e2] cursor-not-allowed'
                      }
                      `}
                  >
                    Entrar
                  </ProgressButton>
                </form>
              </FormProvider>
            ) : (
              <FormProvider {...psicologoForm} key="psicologo">
                <form onSubmit={psicologoForm.handleSubmit(handlePsicologo)} className="flex flex-col gap-3">
                  <FormInput
                    name="crp"
                    placeholder="Ex: 06123456j (sem barras)"
                    type="text"
                    autoComplete="off"
                    key="psicologo-crp"
                    maxLength={12}
                  />
                  <FormInput
                    name="senha"
                    placeholder="Senha"
                    type="password"
                    autoComplete="off"
                    key="psicologo-senha"
                  />
                  <div className="flex items-center justify-between text-xs mt-1 mb-2">
                    <button
                      type="button"
                      className="font-medium text-[14px] leading-[24px] align-middle text-[#6D75C0] hover:underline cursor-pointer"
                      onClick={() => router.push("/forgot")}
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <ProgressButton
                    type="submit"
                    isLoading={isLoading}
                    disabled={
                      !(
                        psicologoForm.watch("crp")?.length > 0 &&
                        psicologoForm.watch("senha")?.length > 0
                      )
                    }
                    className={`w-full font-bold rounded-md py-3 transition-colors text-base mt-2 
                      ${
                        psicologoForm.watch("crp")?.length > 0 &&
                        psicologoForm.watch("senha")?.length > 0
                          ? 'bg-[#8494E9] text-white cursor-pointer hover:bg-[#6c6bb6]'
                          : 'bg-[#e6eefe] text-[#bfc6e2] cursor-not-allowed'
                      }
                      `}
                  >
                    Entrar
                  </ProgressButton>
                </form>
              </FormProvider>
            )}
            <div className="flex items-center gap-1 mt-4 text-[#212529] justify-center">
              <span className="font-medium text-[14px] leading-[24px] align-middle">Não tem cadastro?</span>
              <svg className="w-4 h-4 mx-1 align-middle" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <image href="/icons/arrow-right.svg" width="16" height="16" x="4" y="4" />
              </svg>
              <button
                type="button"
                className="font-medium text-[12px] leading-[16px] align-middle text-[#6D75C0] hover:underline"
                onClick={() => router.push("/register")}
              >
                Crie uma conta agora
              </button>
            </div>
          </div>
        </div>
      {/* Lado direito - Slider */}
      <div className="hidden md:flex w-full md:w-1/2 h-full min-h-screen">
        <LoginSlider />
      </div>
    </div>
    </>
  );
};

export default LoginPage;

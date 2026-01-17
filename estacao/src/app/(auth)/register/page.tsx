"use client";
import React, { useState, Suspense } from "react";
import { useAuth } from "@/hooks/authHook"; 
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PsicologoRegisterFormJuridico } from "@/components/PsicologoRegisterForm";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useUIStore } from "@/store/uiStore";
import { 
  pacienteRegisterSchema, 
  psicologoAutonomoRegisterSchema, 
  psicologoJuridicoRegisterSchema, 
  PsicologoAutonomoRegisterForm, 
  PsicologoJuridicoRegisterForm,
  PacienteRegisterForm as PacienteRegisterFormType 
} from "./schemas";
import { PacienteRegisterForm } from "@/components/PacienteRegisterForm";
import { PsicologoRegisterFormAutonomo } from "@/components/PsicologoRegisterFormAutonomo";
import Image from "next/image";
import Link from "next/link";
import { ensureISO8601Date } from "@/utils/date";

// --- Função auxiliar: montar FormData ---
function buildFormData(
  data: PacienteRegisterFormType | PsicologoAutonomoRegisterForm | PsicologoJuridicoRegisterForm | FormData,
  role: "Psychologist" | "Patient",
  tipo: "autonomo" | "juridico",
): FormData {
  const formData = new FormData();
  let roleValue: "Psychologist" | "Patient" = role;

  // docFields atualizado conforme os campos de documentos do exemplo
  const docFields = [
    "crpDocumento",
    "rgDocumento",
    "cartaoCnpjDocumento",
    "contratoSocialDocumento",
    "comprovanteEndEmpresaDocumento",
    "rgCpfSocioDocumento",
    "comprovacaoIss",
    // suporte a PJ: simples nacional
    "simplesNacionalDocumento"
  ];

  if (data instanceof FormData) {
    data.forEach((v, k) => formData.set(k, v));
    formData.set("role", role);
    
    // Define TipoPessoaJuridico com letra maiúscula
  const tipoCapitalizado = tipo === "autonomo" ? "Autonomo" : "Juridico";
    formData.set("TipoPessoaJuridico", tipoCapitalizado);
    
    formData.set("termsAccepted", String(formData.get("termosAceitos") ?? false));
    formData.set("privacyAccepted", "true");
    return formData;
  }

  Object.entries(data).forEach(([key, value]) => {
    if (key === "dataNascimento") {
      if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
        const iso = ensureISO8601Date(value);
        formData.append("dataNascimento", iso);
      }
      return;
    }
    if (docFields.includes(key)) {
      if (value instanceof FileList && value.length > 0) formData.append(key, value[0]);
      else if (value instanceof File) formData.append(key, value);
    } else if (key === "crp") {
      formData.append(key, String(value).replace(/\D/g, ""));
    } else if (key === "pronome" && role === "Psychologist" && tipo === "autonomo") {
      // Inclui pronome para psicólogos autônomos
      formData.append("Pronome", String(value ?? ""));
    } else {
      formData.append(key, String(value ?? ""));
    }
  });

  if ("role" in data && typeof data.role === "string") {
    roleValue =
      data.role === "Psychologist" || data.role === "Patient"
        ? data.role
        : role;
  }

  formData.set("role", roleValue);
  
  // Define TipoPessoaJuridico com letra maiúscula
  if (roleValue === "Psychologist") {
    const tipoCapitalizado = tipo === "autonomo" ? "Autonomo" : "Juridico";
    formData.set("TipoPessoaJuridico", tipoCapitalizado);
  }
  
  formData.set(
    "termsAccepted",
    roleValue === "Psychologist"
      ? String((data as PsicologoAutonomoRegisterForm | PsicologoJuridicoRegisterForm).termosAceitos ?? false)
      : String((data as PacienteRegisterFormType).aceitaTermos ?? false)
  );
  formData.set("privacyAccepted", "true");

  return formData;
}

const RegisterPageInner = () => {
  const { register } = useAuth();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"paciente" | "psicologo">(
    searchParams?.get("tab") === "psicologo" ? "psicologo" : "paciente"
  ); 
  const [tipoAtuacao, setTipoAtuacao] = useState<"autonomo" | "juridico">("autonomo"); 
  const router = useRouter();
  const setLoading = useUIStore((s) => s.setLoading);
  const isLoading = useUIStore((s) => s.isLoading);
  const isBusy = isLoading;

  // --- Forms ---
  const pacienteForm = useForm<PacienteRegisterFormType>({
    resolver: zodResolver(pacienteRegisterSchema),
    mode: "onTouched",
    defaultValues: { 
      nome: "", 
      email: "", 
      password: "", 
      telefone: "", 
      cpf: "", 
      aceitaTermos: false, // alterado de true para false
      confirmarSenha: "", 
      dataNascimento: "" 
    }
  });

  const autonomoForm = useForm<PsicologoAutonomoRegisterForm>({
    resolver: zodResolver(psicologoAutonomoRegisterSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    shouldFocusError: false,
    criteriaMode: "all",
    defaultValues: {
      nome: "",
      email: "",
      cpf: "",
      crp: "",
      role: "",
      telefone: "",
      whatsapp: "",
      dataNascimento: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      password: "",
      confirmarSenha: "",
      termosAceitos: false,
      pronome: "EleDele",
      sexo: "PrefiroNaoDeclarar",
    }
  });

  const juridicoForm = useForm<PsicologoJuridicoRegisterForm>({
    resolver: zodResolver(psicologoJuridicoRegisterSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    shouldFocusError: false,
    criteriaMode: "all",
    defaultValues: { 
      nome: "", email: "", telefone: "", whatsapp: "", cnpj: "", crp: "", razaoSocial: "", nomeFantasia: "", 
      simplesNacional: "nao",
      cep: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
      cepEmpresa: "", enderecoEmpresa: "", numeroEmpresa: "", complementoEmpresa: "", bairroEmpresa: "", cidadeEmpresa: "", estadoEmpresa: "",
      password: "", confirmarSenha: "", termosAceitos: false 
    }
  });


  // --- Função principal de registro ---
  async function handleRegister(
    data: PacienteRegisterFormType | PsicologoAutonomoRegisterForm | PsicologoJuridicoRegisterForm | FormData,
    role: "Psychologist" | "Patient"
  ) {
    setLoading(true);
    try {
      // Garante que arquivos são enviados via FormData para API Node.js
      const formData = buildFormData(data, role, tipoAtuacao);
      
      const result = await register(formData);

      if (!result.success) {
        toast.error(result.message || "Erro ao realizar o cadastro.");
        return;
      }

      toast.success(result.message || "Cadastro realizado com sucesso!");

      // Login automático para paciente
      if (role === "Patient") {
        const { email, password } = data as PacienteRegisterFormType;
        try {
          const { login } = await import("@/store/authStore").then((mod) => mod.useAuthStore.getState());
          const loginResult = await login(email, password);

          if (!loginResult.success) {
            toast.error(loginResult.message || "Erro ao fazer login automático.");
            // Não redireciona em caso de erro
            return;
          }

          toast.success(loginResult.message || "Login realizado com sucesso!");
          
          // Obtém o usuário do resultado ou dos cookies como fallback
          let user = loginResult.user;
          if (!user && typeof window !== "undefined") {
            const Cookies = (await import('js-cookie')).default;
            const userCookie = Cookies.get('user-data-client');
            user = userCookie ? JSON.parse(userCookie) : {};
          }
          
          if (user?.Role === "Patient") {
            // Verifica se há planoId na query string (fluxo de primeira sessão)
            const planoId = searchParams?.get("planoId");
            const redirect = searchParams?.get("redirect");
            const contexto = searchParams?.get("contexto");
            const psicologoId = searchParams?.get("psicologoId");
            const origem = searchParams?.get("origem");
            
            // Se veio do marketplace com psicologoId (fluxo de primeira sessão)
            if (psicologoId && contexto === "primeira_sessao" && origem === "marketplace") {
              router.push(`/comprar-consulta?psicologoId=${psicologoId}`);
              return;
            }
            
            // Se veio do fluxo de primeira sessão da Home, redireciona para compra
            if (planoId && (redirect === "/comprar-consulta" || contexto === "primeira_sessao")) {
              router.push(`/comprar-consulta?planoId=${planoId}`);
              return;
            }
            
            // Verifica se há DraftSession pendente (marketplace)
            if (typeof window !== 'undefined') {
              const draftId = window.localStorage.getItem('draftId');
              const agendamentoPendente = window.sessionStorage.getItem('agendamento-pendente');
              
              if (draftId && agendamentoPendente) {
                try {
                  const agendamento = JSON.parse(agendamentoPendente);
                  if (agendamento.contexto === 'primeira_sessao' && agendamento.psicologoId) {
                    router.push(`/comprar-consulta?psicologoId=${agendamento.psicologoId}`);
                    return;
                  }
                } catch {
                  // Se não conseguir parsear, segue fluxo normal
                }
              }
            }
            
            // Fluxo normal: verifica onboarding
            // Sempre redireciona para boas-vindas se não tiver onboarding completo
            // O fluxo de primeira consulta será gerenciado após o onboarding
            const hasCompletedOnboarding = Array.isArray(user.Onboardings) && user.Onboardings.length > 0 
              ? user.Onboardings.some((onboarding: { Completed?: string | boolean }) => {
                  const completed = onboarding.Completed;
                  return completed === 'true' || completed === true;
                })
              : false;
            
            router.push(hasCompletedOnboarding ? "/painel" : "/boas-vindas");
          } else if (user?.Role === "Psychologist") {
            router.push("/painel-psicologo");
          }
          return;
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Erro ao fazer login automático.");
          // Não redireciona em caso de erro
          return;
        }
      }
     router.push(role === "Psychologist" ? "/cadastro-em-analise" : "/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ocorreu um erro ao realizar o cadastro.");
    } finally {
      setLoading(false);
    }
  }

  // --- Wrappers de validação ---
async function handleRegisterPsicologo(
  data: PsicologoAutonomoRegisterForm | PsicologoJuridicoRegisterForm | FormData,
  tipoAtuacaoParam?: "autonomo" | "juridico"
): Promise<void> {
  const tipo = tipoAtuacaoParam || tipoAtuacao;
  // Se vier FormData, valida os arquivos
  if (data instanceof FormData) {
    // Corrige os campos obrigatórios conforme tipo de atuação
    // Para autônomo: apenas CRP e RG/CPF são obrigatórios
    // Para jurídico: apenas Cartão CNPJ é obrigatório (os outros são opcionais)
    const requiredFields =
      tipo === "autonomo"
        ? ["crpDocumento", "rgDocumento"]
        : ["cartaoCnpjDocumento"]; 

    for (const field of requiredFields) {
      const file = data.get(field);
      if (!(file instanceof File)) {
        toast.error("Envie todos os documentos obrigatórios.");
        return;
      }
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }
    }

    await handleRegister(data, "Psychologist");
    return;
  }

  const valid =
    tipo === "autonomo"
      ? await autonomoForm.trigger()
      : await juridicoForm.trigger();

  if (!valid) {
    toast.error("Preencha todos os campos obrigatórios corretamente.");
    return;
  }

  // 🔥 Sempre transforma em FormData antes de enviar
  const formData = buildFormData(data, "Psychologist", tipo);

  // Validação dos arquivos para pessoa jurídica
  // Obrigatórios: RG/CPF Representante, CRP, Cartão CNPJ
  // Condicional: Simples Nacional (apenas se for optante)
  if (tipo === "juridico") {
    const juridicoDocsObrigatorios = [
      "rgDocumento",      // RG/CPF Representante
      "crpDocumento",     // CRP
      "cartaoCnpjDocumento"  // Cartão CNPJ
    ];
    
    for (const field of juridicoDocsObrigatorios) {
      const file = formData.get(field);
      if (!(file instanceof File)) {
        toast.error("Envie todos os documentos obrigatórios: RG/CPF Representante, CRP e Cartão CNPJ.");
        return;
      }
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }
    }
    
  // Documento Simples Nacional é sempre opcional
    
    // Valida arquivos opcionais se foram enviados
    const juridicoDocsOpcionais = [
      "contratoSocialDocumento",
      "comprovanteEndEmpresaDocumento",
      "rgCpfSocioDocumento"
    ];
    for (const field of juridicoDocsOpcionais) {
      const file = formData.get(field);
      if (file instanceof File) {
        const error = validateFile(file);
        if (error) {
          toast.error(error);
          return;
        }
      }
    }
  }

  // Validação dos arquivos para autônomo
  // Obrigatórios: CRP e RG/CPF
  // Opcionais: Comprovante endereço e Comprovante ISS
  if (tipo === "autonomo") {
    const autonomoDocsObrigatorios = [
      "crpDocumento",
      "rgDocumento"
    ];
    for (const field of autonomoDocsObrigatorios) {
      const file = formData.get(field);
      if (!(file instanceof File)) {
        toast.error("Envie os documentos obrigatórios: CRP e RG/CPF.");
        return;
      }
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }
    }
    // Valida arquivos opcionais se foram enviados
    const autonomoDocsOpcionais = [
      "comprovanteEndereco",
      "comprovacaoIss"
    ];
    for (const field of autonomoDocsOpcionais) {
      const file = formData.get(field);
      if (file instanceof File) {
        const error = validateFile(file);
        if (error) {
          toast.error(error);
          return;
        }
      }
    }
  }

  await handleRegister(formData, "Psychologist");
}


  async function handleRegisterPaciente(data: PacienteRegisterFormType) {
    const valid = await pacienteForm.trigger();
    if (!valid) return toast.error("Preencha todos os campos obrigatórios corretamente.");
    return await handleRegister(data, "Patient");
  }

  // Mantém a aba sincronizada se o query param mudar
  React.useEffect(() => {
    const t = searchParams?.get("tab");
    if (t === "psicologo" || t === "paciente") setTab(t as "paciente" | "psicologo");
  }, [searchParams]);

  return (
    <>
      <div className="w-full min-h-screen flex flex-col justify-center items-center bg-white px-4 sm:px-8 py-5">
        {/* Logo */}
        <div className="mb-8">
          <Link href="/" aria-label="Ir para a página inicial">
            <Image 
              src="/logo.png" 
              alt="Logo Estação Terapia" 
              width={200} 
              height={56} 
              className="hover:opacity-80 transition-opacity" 
              priority 
              style={{ width: 200, height: 56, objectFit: "contain" }}
            />
          </Link>
        </div>

        {/* Tabs */}
          <div className="flex w-full max-w-[792px] h-[60px] mb-8  rounded-lg overflow-hidden border border-[#8494E9]">
            {[
              "paciente",
              "psicologo"
            ].map((t, idx, arr) => (
              <button
                key={t}
                className={`w-1/2 text-sm md:text-base font-medium transition-colors h-full cursor-pointer
                  ${tab === t
                    ? "bg-[#E5E9FA] text-[#6c6bb6] border-b-2 border-b-[#8494E9] z-10"
                    : "bg-white text-[#23253a] border-b-2 border-b-transparent z-0"}
                  ${idx === 0 ? "rounded-l-lg" : ""} ${idx === arr.length - 1 ? "rounded-r-lg" : ""}`}
                style={{ borderRight: idx === 0 ? '1px solid #8494E9' : undefined }}
                onClick={() => setTab(t as typeof tab)}
              >
                {t === "paciente" ? "Paciente" : "Psicólogo(a)"}
              </button>
            ))}
          </div>

        {/* Conteúdo */}
        <div className="w-full max-w-[792px] mx-auto">
          <AnimatePresence mode="wait">
            {tab === "psicologo" && (
              <motion.div key="psicologo" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
                {/* Textos informativos */}
                <div className="mb-6 text-center">
                  <h2 className="font-semibold text-xl text-[#212529] mb-3">Faça o seu pré-cadastro agora</h2>
                  <p className="text-sm text-[#49525A] leading-relaxed">
                    Preencha as informações abaixo com seus dados. Elas são essenciais para o processo de cadastro e serão analisadas pelo nosso time para garantir que esteja dentro das nossas diretrizes.
                  </p>
                </div>
                
                {/* Radio tipo de atuação */}
                <div className="mb-6">
                  <h4 className="font-semibold text-lg mb-2">Qual sua forma de atuação?</h4>
                  <div className="flex gap-6">
                    {["autonomo", "juridico"].map((tipo) => (
                      <label key={tipo} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="TipoPessoaJuridico"
                          value={tipo}
                          checked={tipoAtuacao === tipo}
                          onChange={() => setTipoAtuacao(tipo as typeof tipoAtuacao)}
                          className="w-4 h-4 rounded-full border border-[#C2C7D6] checked:bg-[#6D75C0] transition-colors"
                        />
                        <span className="ml-2">{tipo === "autonomo" ? "Autônomo" : "Pessoa Jurídica"}</span>
                      </label>
                    ))}
                  </div>
                </div>
 
                {tipoAtuacao === "autonomo" ? (
                  <PsicologoRegisterFormAutonomo
                    form={autonomoForm}
                    onSubmit={(data) => handleRegisterPsicologo(data, "autonomo")}
                    isSubmitting={isBusy}
                  />
                ) : (
                  <PsicologoRegisterFormJuridico
                    form={juridicoForm}
                    onSubmit={(data) => handleRegisterPsicologo(data, "juridico")}
                    isSubmitting={isBusy}
                  />
                )}
              </motion.div>
            )}
 
            {tab === "paciente" && (
              <motion.div key="paciente" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
                <PacienteRegisterForm form={pacienteForm} onSubmit={handleRegisterPaciente} isSubmitting={isBusy} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Link login */}
        <div className="mt-4 text-sm flex gap-1 items-center justify-start">
          <span className="text-[#212529]">Já possui conta?</span>
          <span className="text-[#212529]">→</span>
          <Link href="/login" className="text-[#8494E9] hover:underline font-medium">Faça seu login</Link>
        </div>
      </div>
    </>
  );
};

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  );
}

// Adicione as constantes de validação
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg"
];
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Função para validar arquivo
function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Tipo de arquivo não permitido. Use PDF, DOCX, PNG ou JPG.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Arquivo excede o tamanho máximo de 2MB.";
  }
  return null;
}


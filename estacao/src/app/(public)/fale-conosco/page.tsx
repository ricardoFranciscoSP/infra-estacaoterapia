"use client";
import React from 'react';
import toast from 'react-hot-toast';
import { useContato } from '@/hooks/useContato';
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Script from "next/script";
import { getRecaptchaEnterpriseToken } from "@/utils/recaptchaEnterprise";

const schema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Digite um e-mail válido"),
  telefone: z.string().min(1, "Telefone é obrigatório").refine(
    (val) => val.replace(/\D/g, "").length >= 10,
    { message: "Digite um telefone válido" }
  ),
  assunto: z.string().min(1, "Assunto obrigatório"),
  mensagem: z.string().min(5, "Mensagem obrigatória"),
});

type FormData = z.infer<typeof schema>;

// Função simples de máscara para telefone brasileiro
function maskTelefone(value: string) {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15);
}

export default function FaleConosco() {
  const { enviarContato, error, success } = useContato();
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
      // Exibe o Toast de sucesso ou erro sempre que o estado mudar
  React.useEffect(() => {
    // Evita ReferenceError usando fallback seguro
    if (typeof success !== 'undefined' && success) {
      const successMsg = window.localStorage.getItem('contatoSuccessMsg') || "Mensagem enviada com sucesso!";
      toast.success(successMsg);
      window.localStorage.removeItem('contatoSuccessMsg');
    }
    if (typeof error !== 'undefined' && error) {
      const errorMsg = window.localStorage.getItem('contatoErrorMsg') || error;
      toast.error(errorMsg);
      window.localStorage.removeItem('contatoErrorMsg');
    }
  }, [success, error]);
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting, isSubmitSuccessful, touchedFields } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onBlur", // Valida quando o campo perde o foco
  });

  // Função para definir classe de borda dos inputs
  const getInputClass = (fieldName: keyof FormData) => {
    const hasError = errors[fieldName];
    const isTouched = touchedFields[fieldName];
    const baseClass = "border rounded px-3 py-2 text-[#23253a] text-base focus:outline-none focus:ring-2 focus:ring-[#8494E9] transition";
    if (hasError && isTouched) {
      return `${baseClass} border-red-500`;
    }
    return `${baseClass} border-gray-300`;
  };

  // Aplicar máscara ao telefone em tempo real
  const telefoneValue = watch("telefone", "");
  const mensagemValue = watch("mensagem", "");
  React.useEffect(() => {
    if (telefoneValue !== undefined) {
      const masked = maskTelefone(telefoneValue);
      if (masked !== telefoneValue) {
        setValue("telefone", masked, { shouldValidate: false });
      }
    }
  }, [telefoneValue, setValue]);
  const [apiError, setApiError] = React.useState<string>("");

  // Função para enviar o formulário usando o hook
  const onSubmit = async (data: FormData) => {
    setApiError("");
    if (!siteKey) {
      setApiError("reCAPTCHA não configurado.");
      return;
    }
    try {
      const token = await getRecaptchaEnterpriseToken(siteKey, "CONTACT");
      await enviarContato({ ...data, recaptchaToken: token, recaptchaAction: "CONTACT" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Falha ao validar reCAPTCHA.";
      setApiError(msg);
      return;
    }
    // Limpa os campos após sucesso
    reset();
  };

  // Verifica se todos os campos estão preenchidos e válidos
  const camposPreenchidos =
    watch("nome")?.trim() &&
    watch("email")?.trim() &&
    watch("telefone")?.trim() &&
    watch("assunto")?.trim() &&
    watch("mensagem")?.trim() &&
    Object.keys(errors).length === 0;

  return (
    <main className="font-fira flex flex-col items-start justify-center min-h-[60vh] bg-gradient-to-br from-[#f7f8fc] to-[#e3e6f9] px-4 py-8 md:py-0">
      <Script
        src={`https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`}
        strategy="afterInteractive"
      />
      <div className="w-full max-w-[1200px] px-4 md:px-0 mx-auto flex flex-col items-start">
        <div className="w-full flex flex-col mt-6 items-start" style={{ maxWidth: 340 }}>
          <BreadcrumbsVoltar label="Voltar" />
        </div>
        <h1 className="font-bold text-[28px] md:text-[36px] leading-[44px] text-[#23253a] mb-8 mt-2 text-left tracking-tight font-fira-sans">
          Fale Conosco
        </h1>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 p-0 md:p-0 mb-10 w-full"
          autoComplete="off"
        >
          {/* ...inputs... */}
          <div className="flex flex-col gap-1">
            <label htmlFor="nome" className="text-sm font-medium text-[#23253a] mb-1 font-fira-sans">Nome</label>
            <input
              id="nome"
              type="text"
              {...register("nome")}
              placeholder="Digite seu nome"
              className={getInputClass("nome") + " w-full h-12 bg-[#f7f8fc] focus:bg-white font-fira-sans"}
            />
            {errors.nome && touchedFields.nome && (
              <span className="text-red-600 text-xs mt-1 font-fira-sans">{errors.nome.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-[#23253a] mb-1 font-fira-sans">E-mail</label>
            <input
              id="email"
              type="email"
              {...register("email")}
              placeholder="Digite seu e-mail"
              className={getInputClass("email") + " w-full h-12 bg-[#f7f8fc] focus:bg-white font-fira-sans"}
            />
            {errors.email && touchedFields.email && (
              <span className="text-red-600 text-xs mt-1 font-fira-sans">{errors.email.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="telefone" className="text-sm font-medium text-[#23253a] mb-1 font-fira-sans">Telefone</label>
            <input
              id="telefone"
              type="text"
              {...register("telefone")}
              placeholder="(99) 99999-9999"
              className={getInputClass("telefone") + " w-full h-12 bg-[#f7f8fc] focus:bg-white font-fira-sans"}
              maxLength={15}
              inputMode="tel"
            />
            {errors.telefone && touchedFields.telefone && (
              <span className="text-red-600 text-xs mt-1 font-fira-sans">{errors.telefone.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="assunto" className="text-sm font-medium text-[#23253a] mb-1 font-fira-sans">Assunto</label>
            <select
              id="assunto"
              {...register("assunto")}
              className={getInputClass("assunto") + " w-full h-12 bg-[#f7f8fc] focus:bg-white font-fira-sans"}
              defaultValue=""
            >
              <option value="" disabled style={{ color: "#bfc6e2" }}>Selecione o assunto</option>
              <option value="duvida">Dúvida</option>
              <option value="suporte">Suporte</option>
              <option value="parceria">Parceria</option>
              <option value="outro">Outro</option>
            </select>
            {errors.assunto && touchedFields.assunto && (
              <span className="text-red-600 text-xs mt-1 font-fira-sans">{errors.assunto.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="mensagem" className="text-sm font-medium text-[#23253a] mb-1 font-fira-sans">Mensagem</label>
            <textarea
              id="mensagem"
              rows={5}
              {...register("mensagem", { maxLength: 2000 })}
              placeholder="Digite sua mensagem"
              className={getInputClass("mensagem") + " w-full bg-[#f7f8fc] focus:bg-white resize-none min-h-[100px] font-fira-sans"}
              maxLength={2000}
            />
            <div className="flex justify-end text-xs text-gray-500 mt-1 font-fira-sans">
              {mensagemValue.length} / 2000 caracteres
            </div>
            {errors.mensagem && touchedFields.mensagem && (
              <span className="text-red-600 text-xs mt-1 font-fira-sans">{errors.mensagem.message}</span>
            )}
          </div>

          <div className="flex w-full justify-end">
            <button
              type="submit"
              disabled={!camposPreenchidos || isSubmitting}
              className={`w-[220px] md:w-[300px] font-bold rounded-lg py-3 transition-all text-base mt-2 text-white font-fira-sans cursor-pointer
                ${!camposPreenchidos || isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed shadow-none hover:scale-100 hover:shadow-none'
                  : 'bg-gradient-to-r from-[#6D75C0] to-[#8494E9] shadow-md hover:scale-[1.03] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9]'}
              `}
            >
              {isSubmitting ? "Enviando..." : "Enviar"}
            </button>
          </div>
          {!siteKey && (
            <div className="mt-3">
              <span className="text-red-600 text-xs font-fira-sans">reCAPTCHA não configurado.</span>
            </div>
          )}
          <div className="w-full">
            <span className="text-red-600 text-xs font-fira-sans">{apiError}</span>
          </div>
          {isSubmitSuccessful && <span className="text-green-600 mt-2 text-center font-fira-sans">Mensagem enviada!</span>}
          {/* Google reCAPTCHA v3 */}
        </form>
      </div>
    </main>
  );
}
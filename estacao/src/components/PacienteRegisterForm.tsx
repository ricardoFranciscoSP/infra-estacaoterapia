import React from "react";
import { FormProvider, UseFormReturn, useWatch } from "react-hook-form";
import { FormInput } from "@/components/FormInput";
import { DatePickerTailwind } from "@/components/DatePickerMaterial";
import { maskCpf } from "@/utils/masks";
import { PHONE_COUNTRIES, PhoneCountry, onlyDigits, maskTelefoneByCountry, getFlagUrl, validateBrazilianPhone } from "@/utils/phoneCountries";
import Image from "next/image";
import { pacienteRegisterSchema } from "@/app/(auth)/register/schemas";
import toast from "react-hot-toast";
import { z } from "zod";
import Link from "next/link";
import { ensureISO8601Date } from "@/utils/date";
import { getPasswordRequirements, validateEmail, validateCPF, validatePhone, validatePassword, validateTerms } from "@/utils/validation";
import { ProgressButton } from "@/components/ProgressButton";

export type PacienteFormData = z.infer<typeof pacienteRegisterSchema>;
interface PacienteRegisterFormProps {
  form: UseFormReturn<PacienteFormData>;
  onSubmit: (data: PacienteFormData) => void;
  isSubmitting?: boolean;
}

export const PacienteRegisterForm: React.FC<PacienteRegisterFormProps> = ({ form, onSubmit, isSubmitting = false }) => {
  const senhaArr = useWatch({ control: form.control, name: ["password"] });
  const senha = senhaArr?.[0] || ""; 
  const dataNascimento = useWatch({ control: form.control, name: "dataNascimento" });

  // Requisitos de senha importados do validation.ts
  const requisitos = getPasswordRequirements(senha);

  // Valida a data de nascimento em tempo real quando ela muda
  React.useEffect(() => {
    if (dataNascimento) {
      // Aguarda um pequeno delay para garantir que o valor foi atualizado
      const timer = setTimeout(() => {
        form.trigger("dataNascimento");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [dataNascimento, form]);

  // Função para definir a borda verde se o campo estiver válido
  const getInputClass = (name: keyof PacienteFormData) => {
    const isTouched = form.formState.touchedFields[name];
    const isValid = !form.formState.errors[name] && isTouched;
    return `w-full h-[40px] rounded-[6px] border ${isValid ? "border-green-500" : "border-[#75838F]"} bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9] fira-sans`;
  };

  // Define Brasil como padrão
  const [country, setCountry] = React.useState<PhoneCountry>(
    PHONE_COUNTRIES.find(c => c.code === 'BR') || PHONE_COUNTRIES[0]
  );

  // Dropdown do país dentro do input único de telefone
  const [openCountry, setOpenCountry] = React.useState(false);
  const countryBoxRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryBoxRef.current && !countryBoxRef.current.contains(e.target as Node)) {
        setOpenCountry(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Função para determinar a borda do telefone
  const getTelBorder = () => {
    const hasError = !!form.formState.errors.telefone;
    const isTouched = !!form.formState.touchedFields.telefone;
    const hasValue = !!form.watch("telefone");
    const isValid = !hasError && isTouched && hasValue;
    return hasError ? "border-[#B30000]" : isValid ? "border-green-500" : "border-[#75838F]";
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          // Centraliza todas as validações
          const emailError = validateEmail(data.email || "");
          if (emailError) {
            toast.error(emailError);
            form.setError("email", { type: "validate", message: emailError });
            return;
          }

          const cpfError = validateCPF(data.cpf || "");
          if (cpfError) {
            toast.error(cpfError);
            form.setError("cpf", { type: "validate", message: cpfError });
            return;
          }

          const phoneError = validatePhone(data.telefone || "");
          if (phoneError) {
            toast.error(phoneError);
            form.setError("telefone", { type: "validate", message: phoneError });
            return;
          }

          const passwordError = validatePassword(data.password, data.confirmarSenha);
          if (passwordError) {
            toast.error(passwordError);
            if (passwordError === "As senhas não coincidem" || passwordError === "Confirme sua senha") {
              form.setError("confirmarSenha", { type: "validate", message: passwordError });
            } else {
              form.setError("password", { type: "validate", message: passwordError });
            }
            return;
          }


          // Validação de maioridade (18+)
          const dataNascimentoISO = ensureISO8601Date(data.dataNascimento);
          const [y, m, d] = (data.dataNascimento || "").split("-").map(Number);
          const dob = new Date(y, (m || 1) - 1, d || 1);
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const mDiff = today.getMonth() - dob.getMonth();
          if (mDiff < 0 || (mDiff === 0 && today.getDate() < dob.getDate())) age--;
          if (!data.dataNascimento) {
            toast.error("Data de nascimento é obrigatória.");
            form.setError("dataNascimento", { type: "required", message: "Data de nascimento é obrigatória" });
            return;
          }
          if (isNaN(age) || age < 18) {
            toast.error("Idade mínima: 18 anos");
            form.setError("dataNascimento", { type: "validate", message: "Idade mínima: 18 anos" });
            return;
          }

          const aceitaTermos = !!data.aceitaTermos;
          const termsError = validateTerms(aceitaTermos);
          if (termsError) {
            toast.error(termsError);
            form.setError("aceitaTermos", { type: "validate", message: termsError });
            return;
          }

          // Monta o payload final
          const localDigits = onlyDigits(data.telefone || "");
          const payload = {
            ...data,
            nome: data.nome,
            email: data.email,
            password: data.password,
            confirmarSenha: data.confirmarSenha,
            telefone: `${country.dial}${localDigits}`,
            cpf: data.cpf,
            aceitaTermos: aceitaTermos,
            dataNascimento: dataNascimentoISO,
            sexo: data.sexo || "",
            rg: data.rg || "",
            role: "Patient",
            termsAccepted: aceitaTermos,
            privacyAccepted: aceitaTermos,
          };
          onSubmit(payload);
        })}
        className="flex flex-col gap-3 sm:gap-6 w-full max-w-[792px] mx-auto fira-sans"
        style={{ maxWidth: '792px', width: '100%' }}
      >
        <FormInput
          name="nome"
          placeholder="Nome completo*"
          type="text"
          autoComplete="off"
          className={getInputClass("nome") + " mb-2 sm:mb-4 w-full fira-sans"}
        />
        <FormInput
          name="email"
          placeholder="E-mail*"
          type="email"
          autoComplete="off"
          className={getInputClass("email") + " mb-2 sm:mb-4 w-full"}
        />
        {/* CPF, Telefone e Data de nascimento lado a lado no desktop, em coluna no mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(260px,1fr)_220px] gap-3 sm:gap-5 mb-2 sm:mb-4 items-start">
          <div className="flex flex-col w-full">
            <FormInput
              name="cpf"
              placeholder="CPF*"
              type="text"
              autoComplete="off"
              className={getInputClass("cpf") + " w-full"}
              onChange={e => {
                const masked = maskCpf(e.target.value);
                form.setValue("cpf", masked, { shouldValidate: true, shouldDirty: true });
              }}
              value={form.watch("cpf") || ""}
            />
          </div>

          {/* Campo único: seletor de país + DDI + input telefone dentro de uma única borda */}
          <div className="flex flex-col w-full">
            <div ref={countryBoxRef} className={`relative w-full`}>
              <div
                className={`flex items-center w-full h-[40px] rounded-[6px] border ${getTelBorder()} bg-transparent px-4 py-2 text-sm fira-sans focus-within:outline-none focus-within:ring-2 focus-within:ring-[#8494E9]`}
              >
              {/* Botão de país (bandeira + código ISO) */}
              <button
                type="button"
                onClick={() => setOpenCountry(v => !v)}
                className="flex items-center gap-2 h-full px-2 rounded-l-[6px] border-r border-[#d1d5db]"
                aria-haspopup="listbox"
                aria-expanded={openCountry}
              >
                <Image
                  src={getFlagUrl(country.code)}
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                  className="w-5 h-5 object-contain"
                />
                <span className="text-sm uppercase text-[#23253a]">{country.code}</span>
                <span className="text-sm leading-none text-[#d1d5db]">▼</span>
              </button>

              {/* Prefixo do DDI */}
              <span className="px-2 text-sm text-[#23253a] border-r border-[#d1d5db]">{country.dial}</span>

              {/* Input do telefone (sem borda interna) */}
              <input
                type="text"
                inputMode="tel"
                autoComplete="off"
                name="telefone"
                placeholder="Telefone com DDD*"
                className="flex-1 bg-transparent outline-none text-sm px-3 text-[#23253a]"
                value={form.watch("telefone") || ""}
                onChange={(e) => {
                  // Limpa e formata o número
                  const digits = onlyDigits(e.target.value);
                  const masked = maskTelefoneByCountry(country.code, digits);
                  form.setValue("telefone", masked, { shouldValidate: false, shouldDirty: true, shouldTouch: true });
                  
                  // Validação em tempo real para Brasil
                  if (country.code === 'BR' && digits.length >= 10) {
                    const validation = validateBrazilianPhone(digits);
                    if (!validation.valid) {
                      form.setError("telefone", { 
                        type: "validate", 
                        message: validation.error || "Formato inválido. Use (DDD) NNNNN-NNNN para celular ou (DDD) NNNN-NNNN para fixo" 
                      });
                    } else {
                      form.clearErrors("telefone");
                    }
                  } else if (country.code === 'BR' && digits.length > 0 && digits.length < 10) {
                    form.setError("telefone", { 
                      type: "validate", 
                      message: "Digite o DDD e o número completo" 
                    });
                  } else if (digits.length > 0) {
                    form.clearErrors("telefone");
                  }
                }}
                onBlur={() => {
                  // Marca como tocado e valida o telefone
                  const val = form.getValues("telefone") || "";
                  form.setValue("telefone", val, { shouldTouch: true, shouldValidate: false });
                  const digits = onlyDigits(val);
                  
                  if (!digits || digits.length === 0) {
                    form.setError("telefone", { type: "required", message: "Telefone é obrigatório" });
                  } else if (country.code === 'BR') {
                    // Validação específica para Brasil
                    const validation = validateBrazilianPhone(digits);
                    if (!validation.valid) {
                      form.setError("telefone", { 
                        type: "validate", 
                        message: validation.error || "Formato inválido. Use (DDD) NNNNN-NNNN para celular ou (DDD) NNNN-NNNN para fixo" 
                      });
                    } else {
                      form.clearErrors("telefone");
                    }
                  } else if (digits.length < 10) {
                    form.setError("telefone", { type: "validate", message: "Digite um telefone válido" });
                  } else {
                    form.clearErrors("telefone");
                  }
                }}
                aria-invalid={!!form.formState.errors.telefone}
              />
            </div>
          </div>

            {/* Mensagem de erro do telefone */}
            {form.formState.errors.telefone && (
              <span className="text-[#B30000] text-sm block mt-1">
                {form.formState.errors.telefone.message}
              </span>
            )}

            {/* Dropdown de países */}
            {openCountry && (
              <ul
                role="listbox"
                className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white border border-[#e2e8f0] rounded-md shadow"
              >
                {PHONE_COUNTRIES.map((c) => (
                  <li
                    key={c.code}
                    role="option"
                    aria-selected={country.code === c.code}
                    onClick={() => {
                      setCountry(c);
                      const rawDigits = onlyDigits(form.getValues("telefone") || "");
                      const masked = maskTelefoneByCountry(c.code, rawDigits);
                      form.setValue("telefone", masked, { shouldValidate: true });
                      setOpenCountry(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#f3f4f6] ${country.code === c.code ? "bg-[#eef2ff]" : ""}`}
                  >
                    <Image
                      src={getFlagUrl(c.code)}
                      alt=""
                      width={20}
                      height={20}
                      unoptimized
                      className="w-5 h-5 object-contain"
                    />
                    <span className="text-sm uppercase text-[#23253a]">{c.code}</span>
                    <span className="text-xs text-[#667085]">{c.dial}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col w-full">
            <DatePickerTailwind
              name="dataNascimento"
              control={form.control}
              placeholder="Data de nascimento*"
              className={(() => {
                const hasError = !!form.formState.errors.dataNascimento;
                const isTouched = !!form.formState.touchedFields.dataNascimento;
                const hasValue = !!form.watch("dataNascimento");
                const isValid = !hasError && isTouched && hasValue;
                return hasError ? "border-red-500" : isValid ? "border-green-500" : "border-[#75838F]";
              })()}
            />
            {form.formState.errors.dataNascimento && (
              <span className="text-[#B30000] text-sm block mt-1">
                {form.formState.errors.dataNascimento.message}
              </span>
            )}
          </div>
        </div>
        {/* Campos RG e Sexo lado a lado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-2 sm:mb-4">
          <FormInput
            name="rg"
            placeholder="RG (opcional)"
            type="text"
            autoComplete="off"
            className={getInputClass("rg") + " w-full"}
            value={form.watch("rg") || ""}
          />
          <div className="relative">
            <select
              id="sexo"
              name="sexo"
              className={getInputClass("sexo") + ` appearance-none bg-transparent w-full pr-10 font-fira-sans transition-all duration-200 ${!form.watch("sexo") ? "text-[#75838F] font-normal" : "text-[#23253a] font-normal"}`}
              value={form.watch("sexo") || ""}
              onChange={e => form.setValue("sexo", e.target.value)}
            >
              <option value="" className="text-[#75838F] font-normal">Selecione um gênero</option>
              <option value="Masculino" className="text-[#23253a] font-normal">Masculino</option>
              <option value="Feminino" className="text-[#23253a] font-normal">Feminino</option>
              <option value="Outro" className="text-[#23253a] font-normal">Outro</option>
              <option value="Prefiro não informar" className="text-[#23253a] font-normal">Prefiro não informar</option>
            </select>
            <div className="pointer-events-none absolute right-3 inset-y-0 flex items-center">
              <svg className="w-4 h-4 text-[#75838F]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        <div className="relative mb-2 sm:mb-4">
          <FormInput
            name="password"
            placeholder="Senha*"
            type="password"
            autoComplete="off"
            className={getInputClass("password") + " pr-10 text-[18px] leading-6 font-medium text-[#49525A] w-full"}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            {/* Ícone de olho, se necessário */}
          </span>
        </div>
        <div className="relative mb-2 sm:mb-4">
          <FormInput
            name="confirmarSenha"
            placeholder="Confirmar senha*"
            type="password"
            autoComplete="off"
            className={getInputClass("confirmarSenha") + " pr-10 text-[18px] leading-6 font-medium text-[#49525A] w-full"}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          </span>
        </div>
        <div className="text-xs text-[#23253a] mt-1 sm:mt-2 mb-2 sm:mb-4">
          <b>Requisitos para criação da senha:</b>
          <ul className="list-disc ml-5 mt-1">
            {requisitos.map((req, idx) => (
              <li key={idx} className="flex items-center gap-1">
                {req.valid ? (
                  <Image src="/assets/icons/check.svg" alt="ok" width={16} height={16} />
                ) : (
                  <Image src="/assets/icons/error.svg" alt="erro" width={16} height={16} />
                )}
                {req.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-2 mt-1 mb-2 sm:mb-4">
          <input
            type="checkbox"
            id="aceitaTermos"
            required
            className="accent-[#8494E9] w-4 h-4"
            {...form.register("aceitaTermos")}
          />
          <label htmlFor="aceitaTermos" className="fira-sans font-normal text-[16px] leading-[24px] text-[#49525A]">
            Declaro que li e concordo com os{" "}
            <Link href="/termo-de-uso" target="_blank" rel="noopener noreferrer" className="text-[#8494E9] font-medium underline">
              Termos de uso
            </Link>{" "}
            e a{" "}
            <Link href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer" className="text-[#8494E9] font-medium underline">
              Política de privacidade
            </Link>
          </label>
        </div>
        <ProgressButton
          type="submit"
          isLoading={isSubmitting}
          disabled={!form.formState.isValid}
          className={`w-full font-bold rounded-md py-3 transition-colors text-base mt-2 ${
            form.formState.isValid
              ? "bg-[#565978] text-white hover:bg-[#3d3f5c]"
              : "bg-[#e6eefe] text-[#bfc6e2] cursor-not-allowed"
          }`}
        >
          Concluir cadastro
        </ProgressButton>
      </form>
    </FormProvider>
  );
};
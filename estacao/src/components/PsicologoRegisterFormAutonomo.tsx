import React, { useState, useEffect } from "react";
import { FormProvider, UseFormReturn, useWatch } from "react-hook-form";
import { FormInput } from "@/components/FormInput";
import Image from "next/image";
import { UploadModal } from "./UploadModal";
import { z } from "zod";
import { getPasswordRequirements, validateEmail } from "@/utils/validation";
import { maskCpf, maskCep, maskCrp } from "@/utils/masks";
import { PHONE_COUNTRIES, PhoneCountry, onlyDigits, maskTelefoneByCountry, getFlagUrl } from "@/utils/phoneCountries";
import { fillFormAddressByCep } from "@/utils/cepUtils";
import { psicologoAutonomoRegisterSchema } from "@/app/(auth)/register/schemas";
import { ModalCancelaUpload } from "./ModalCancelaUpload";
import { UploadsAutonomo } from "./UploadsAutonomo";
import Link from "next/link";
import { ProgressButton } from "@/components/ProgressButton";
import { DatePickerTailwind } from "@/components/DatePickerMaterial";
 
// Tipo explícito para os campos do formulário de psicólogo autônomo
export type PsicologoFormFields = { 
  pronome?: string;
  nome: string;
  email: string;
  cpf: string;
  crp: string;
  cep: string;
  role?: string;
  sexo?: string;
  dataNascimento?: string;
  endereco: string;
  numero: string;
  complemento?: string; 
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  password: string;
  confirmarSenha: string;
  termosAceitos: boolean;
  crpDocumento?: FileList;
  rgDocumento?: FileList;
  comprovanteEndereco?: FileList;
  comprovacaoIss?: FileList;
};

// Tipagem inferida do schema
type PsicologoAutonomoFormFields = z.infer<typeof psicologoAutonomoRegisterSchema>;

// Interface para aceitar o tipo dos campos
export interface PsicologoRegisterFormProps { 
  form: UseFormReturn<PsicologoAutonomoFormFields>;
  onSubmit: (data: PsicologoAutonomoFormFields) => Promise<void>;
  isSubmitting?: boolean;
}
  
// Componente apenas para autônomo
export const PsicologoRegisterFormAutonomo: React.FC<PsicologoRegisterFormProps> = ({ form, onSubmit, isSubmitting = false }) => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadField, setUploadField] = useState<string | null>(null);
  const [modalRemoverOpen, setModalRemoverOpen] = useState(false);
  const [modalRemoverField, setModalRemoverField] = useState<keyof PsicologoAutonomoFormFields | null>(null);

  // Estado do país (default BR) + dropdown e click-outside para telefone
  const [country, setCountry] = React.useState<PhoneCountry>(PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0]);
  const [openCountry, setOpenCountry] = React.useState(false);
  const countryBoxRef = React.useRef<HTMLDivElement>(null);
  
  // Estado do país (default BR) + dropdown e click-outside para WhatsApp
  const [countryWhatsapp, setCountryWhatsapp] = React.useState<PhoneCountry>(PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0]);
  const [openCountryWhatsapp, setOpenCountryWhatsapp] = React.useState(false);
  const countryWhatsappBoxRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryBoxRef.current && !countryBoxRef.current.contains(e.target as Node)) {
        setOpenCountry(false);
      }
      if (countryWhatsappBoxRef.current && !countryWhatsappBoxRef.current.contains(e.target as Node)) {
        setOpenCountryWhatsapp(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Estado para cidades
  const [cidades, setCidades] = useState<Array<{ nome: string }>>([]);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [enderecoPreenchidoPorCep, setEnderecoPreenchidoPorCep] = useState(false);
  const estadoSelecionado = useWatch({ control: form.control, name: "estado" });

  // Interface para resposta da API do IBGE
  interface IBGEMunicipio {
    id: number;
    nome: string;
    microrregiao: {
      id: number;
      nome: string;
      mesorregiao: {
        id: number;
        nome: string;
        UF: {
          id: number;
          sigla: string;
          nome: string;
          regiao: {
            id: number;
            sigla: string;
            nome: string;
          };
        };
      };
    };
  }

  // Função para buscar cidades por estado (IBGE API)
  const buscarCidadesPorEstado = React.useCallback(async (uf: string) => {
    if (!uf || uf.length !== 2) return;
    setLoadingCidades(true);
    try {
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
      if (response.ok) {
        const data: IBGEMunicipio[] = await response.json();
        setCidades(data.map((c) => ({ nome: c.nome })));
      }
    } catch (error) {
      console.error("Erro ao buscar cidades:", error);
    } finally {
      setLoadingCidades(false);
    }
  }, []);

  // Carrega cidades quando o estado é selecionado e o endereço não foi preenchido automaticamente pelo CEP
  useEffect(() => {
    if (estadoSelecionado && estadoSelecionado.length === 2) {
      // Só carrega cidades se o endereço NÃO foi preenchido automaticamente pelo CEP
      if (!enderecoPreenchidoPorCep) {
        buscarCidadesPorEstado(estadoSelecionado);
        // Limpa a cidade quando o estado muda
        form.setValue("cidade", "", { shouldValidate: false, shouldDirty: true });
      } else {
        // Se o endereço foi preenchido pelo CEP, limpa a lista de cidades
        setCidades([]);
      }
    }
  }, [estadoSelecionado, enderecoPreenchidoPorCep, buscarCidadesPorEstado, form]);
  // removido telBorder não utilizado

  const getInputClass = (field: string, extra?: string) => {
    const key = field as keyof PsicologoFormFields;
    const hasError = !!form.formState.errors[key];
    const value = form.getValues(key);
    const touched = form.formState.touchedFields[key];
    const dirty = form.formState.dirtyFields[key];
    // Considera válido se não tem erro, tem valor e foi tocado ou modificado
    const isValid = !hasError && value && (touched || dirty);
    return [
      "w-full h-[40px] rounded-[6px] border",
      hasError ? "border-red-500" : isValid ? "border-green-500" : "border-[#75838F]",
      "bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9] font-fira-sans",
      "placeholder:font-fira-sans placeholder:font-normal placeholder:text-[18px] placeholder:leading-[24px] placeholder:text-[#75838F]",
      extra || ""
    ].join(" ");
  };

  const password = useWatch({ control: form.control, name: "password" });

  const requisitos = getPasswordRequirements(password);

  // Função para abrir modal
  function handleOpenUploadModal(fieldName: string) {
    setUploadField(fieldName);
    setUploadModalOpen(true);
  }

  // Função para fechar modal
  function handleCloseUploadModal() {
    setUploadModalOpen(false);
    setUploadField(null);
  }

  // Função para receber arquivo do modal
  function handleUploadFile(file: File) {
    if (uploadField && ["crpDocumento", "rgDocumento", "comprovanteEndereco", "comprovacaoIss"].includes(uploadField)) {
      const dt = new DataTransfer();
      dt.items.add(file);
      form.setValue(uploadField as keyof PsicologoFormFields, dt.files, { shouldValidate: true, shouldDirty: true });
      form.trigger(uploadField as keyof PsicologoFormFields);
    }
    handleCloseUploadModal();
  }

  // Função para remover arquivo
  function handleRemoveFile(field: keyof PsicologoAutonomoFormFields) {
    setModalRemoverField(field);
    setModalRemoverOpen(true);
  }

  function confirmRemoveFile() {
    if (modalRemoverField) {
      form.setValue(modalRemoverField, new DataTransfer().files, { shouldValidate: true, shouldDirty: true });
      form.trigger(modalRemoverField);
    }
    setModalRemoverOpen(false);
    setModalRemoverField(null);
  }

  function closeRemoveModal() {
    setModalRemoverOpen(false);
    setModalRemoverField(null);
  }

  // Handlers para aplicar máscaras
  const handleMaskedChange = (field: keyof PsicologoAutonomoFormFields, maskFn: (v: string) => string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = maskFn(e.target.value);
    form.setValue(field, maskedValue, { shouldValidate: true, shouldDirty: true });
    form.trigger(field);
  };

  // Handler para buscar endereço pelo CEP
  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, "");
    if (cep.length === 8) {
      const endereco = await fillFormAddressByCep(cep);
      if (endereco) {
        setEnderecoPreenchidoPorCep(true);
        form.setValue("endereco", endereco.logradouro || "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        form.setValue("bairro", endereco.bairro || "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        form.setValue("cidade", endereco.localidade || "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        form.setValue("estado", endereco.uf || "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        // Se o endereço foi preenchido pelo CEP, não carrega cidades
        setCidades([]);
        // Dispara validação após preencher os campos
        setTimeout(() => {
          form.trigger(["endereco", "bairro", "cidade", "estado"]);
        }, 100);
      } else {
        setEnderecoPreenchidoPorCep(false);
      }
    } else {
      setEnderecoPreenchidoPorCep(false);
    }
  };

  // Componente para exibir documento enviado conforme imagem
  const DocumentoEnviado: React.FC<{
    titulo: string;
    fileList: FileList | undefined;
    onRemove: () => void;
    isObrigatorio?: boolean;
    hasError?: boolean;
  }> = ({ titulo, fileList, onRemove, isObrigatorio = false, hasError = false }) => {
    const temDocumento = fileList && fileList.length > 0;
    const isValid = isObrigatorio && temDocumento;
    
    return temDocumento ? (
      <div
        className={`flex flex-col justify-center min-h-[68px] w-full max-w-[792px] rounded-[4px] border ${
          hasError ? "border-red-500" : isValid ? "border-green-500" : "border-[#CACFD4]"
        } bg-[#F1F2F4] px-4 py-2 gap-1`}
        style={{ opacity: 1 }}
      >
        <span className="font-semibold text-[#212529] text-[15px] mb-1">{titulo}</span>
        <div className="flex items-center justify-between">
          <span className="text-[#49525A] text-[15px]">{fileList[0].name}</span>
          <button
            type="button"
            className="ml-2"
            onClick={onRemove}
            aria-label="Remover documento"
          >
            <Image src="/icons/trash.svg" alt="Remover" width={18} height={18} />
          </button>
        </div>
      </div>
    ) : null;
  };

  // Log de campos inválidos
  useEffect(() => {
    // logs de debug removidos
  }, [form.formState.errors]);

  const isButtonDisabled = isSubmitting || !form.formState.isValid;

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          // Validação de email
          const emailError = validateEmail(data.email || "");
          if (emailError) {
            alert(emailError);
            form.setError("email", { type: "validate", message: emailError });
            return;
          }

          // Validação de maioridade (18+)
          if (data.dataNascimento && typeof data.dataNascimento === "string") {
            const dateValue = data.dataNascimento;
            
            // Extrai a data no formato YYYY-MM-DD
            const dateMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (dateMatch) {
              const [, yearStr, monthStr, dayStr] = dateMatch;
              const y = parseInt(yearStr, 10);
              const m = parseInt(monthStr, 10);
              const d = parseInt(dayStr, 10);
              
              const dob = new Date(y, m - 1, d);
              const today = new Date();
              let age = today.getFullYear() - dob.getFullYear();
              const mDiff = today.getMonth() - dob.getMonth();
              if (mDiff < 0 || (mDiff === 0 && today.getDate() < dob.getDate())) age--;
              
              if (isNaN(age) || age < 18) {
                alert("Idade mínima: 18 anos");
                form.setError("dataNascimento", { type: "validate", message: "Idade mínima: 18 anos" });
                return;
              }
            }
          }

          // Coleta os arquivos
          const crpFile = form.getValues("crpDocumento");
          const rgFile = form.getValues("rgDocumento");
          const comprovanteEnderecoFile = form.getValues("comprovanteEndereco");
          const issFile = form.getValues("comprovacaoIss");

          // Validação: só permite envio se os documentos obrigatórios estiverem presentes
          // Obrigatórios: CRP e CPF
          // Opcionais: Comprovante endereço e Comprovante ISS
          if (
            !(crpFile && crpFile.length > 0) ||
            !(rgFile && rgFile.length > 0)
          ) {
            alert("Envie os documentos obrigatórios: CRP e CPF.");
            return;
          }

          // Cria o FormData
          const formData = new FormData();

          // Adiciona arquivos (cada campo como key separado)
          if (crpFile && crpFile.length > 0) formData.append("crpDocumento", crpFile[0]);
          if (rgFile && rgFile.length > 0) formData.append("rgDocumento", rgFile[0]);
          if (comprovanteEnderecoFile && comprovanteEnderecoFile.length > 0) formData.append("comprovanteEndereco", comprovanteEnderecoFile[0]);
          if (issFile && issFile.length > 0) formData.append("comprovacaoIss", issFile[0]);

          // Adiciona campos normais
          Object.entries(data).forEach(([key, value]) => {
            if (["crpDocumento", "rgDocumento", "comprovanteEndereco", "comprovacaoIss"].includes(key)) return;
            
            // Adiciona Pronome com P maiúsculo e não adiciona o campo minúsculo
            if (key === "pronome") {
              formData.append("pronome", String(value ?? ""));
              return;
            }
            
            // Adiciona Sexo com S maiúsculo (se existir, senão usa valor padrão)
            if (key === "sexo") {
              formData.append("sexo", String(value ?? "PrefiroNaoDeclarar"));
              return;
            }
            
            // Converte dataNascimento para formato ISO 8601
            if (key === "dataNascimento") {
              if (value && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                // Se já está no formato YYYY-MM-DD, usa diretamente (sem conversão UTC que causa bug)
                formData.append("dataNascimento", value);
              } else {
                formData.append("dataNascimento", String(value ?? ""));
              }
              return;
            }
            
            formData.append(key, String(value ?? ""));
          });

          // Prefixa o telefone com o DDI do país selecionado (somente dígitos, sem espaço)
          const localDigits = onlyDigits(data.telefone || "");
          const telefoneCompleto = `${country.dial}${localDigits}`;
          formData.set("telefone", telefoneCompleto);
          
          // Prefixa o whatsapp com o DDI do país selecionado (somente dígitos, sem espaço)
          const whatsappDigits = onlyDigits(data.whatsapp || "");
          const whatsappCompleto = `${countryWhatsapp.dial}${whatsappDigits}`;
          formData.set("whatsapp", whatsappCompleto);

          formData.set("role", "PSYCHOLOGIST");
          
          // Define TipoPessoaJuridico como Autonomo
          formData.set("TipoPessoaJuridico", "Autonomo");

          // logs de debug removidos

          if (onSubmit) {
            // Envia o FormData para a API
            onSubmit(formData as unknown as PsicologoAutonomoFormFields).catch(err => {
              console.error("Erro ao enviar formulário:", err);
            });
          }
        })}
        className="flex flex-col gap-8 w-full max-w-[792px]  bg-[#fff] mt-4 px-2 sm:px-0">
        <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] align-middle text-[#212529] mb-4">
          Dados pessoais
        </h4>
        {/* Dados pessoais autônomo */}
        <div className="bg-white mb-2">
          <div className="flex flex-col gap-3">
            {/* Nome completo */}
            <div>
              <FormInput name="nome" placeholder="Nome completo*" className={getInputClass("nome")} />
            </div>

            {/* E-mail profissional */}
            <div>
              <FormInput name="email" placeholder="E-mail profissional*" type="email" className={getInputClass("email")} />
            </div>
            {/* Campo Pronome - mantido mas oculto visualmente se necessário */}
            <div className="hidden">
              <select
                {...form.register("pronome")}
                className={getInputClass("pronome")}
                defaultValue="EleDele"
              >
                <option value="EleDele">Ele/Dele</option>
                <option value="ElaDela">Ela/Dela</option>
                <option value="ElesDeles">Eles/Deles</option>
                <option value="ElasDelas">Elas/Delas</option>
                <option value="EluDelu">Elu/Delu</option>
                <option value="Outro">Outro</option>
                <option value="Dr">Dr.</option>
                <option value="Dra">Dra.</option>
                <option value="Psic">Psic.</option>
                <option value="Prof">Prof.</option>
                <option value="Mestre">Mestre</option>
                <option value="Phd">PhD</option>
              </select>
            </div>
            
            {/* CPF e CRP lado a lado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <FormInput
                name="cpf"
                placeholder="CPF*"
                className={getInputClass("cpf")}
                onChange={handleMaskedChange("cpf", maskCpf)}
              />
              <FormInput
                name="crp"
                placeholder="CRP*"
                className={getInputClass("crp")}
                maxLength={12}
                onChange={handleMaskedChange("crp", maskCrp)}
              />
            </div>

            {/* Gênero e Data de nascimento lado a lado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div className="relative">
                <select
                  {...form.register("sexo", { 
                    required: false 
                  })}
                  className={getInputClass("sexo") + ` appearance-none pr-10 font-fira-sans transition-all duration-200 ${!form.watch("sexo") ? "text-[#75838F] font-normal" : "text-[#212529] font-normal"}`}
                  defaultValue=""
                  onBlur={() => {
                    form.setValue("sexo", form.getValues("sexo"), { shouldTouch: true });
                  }}
                >
                  <option value="" disabled hidden className="text-[#75838F] font-normal">Gênero</option>
                  <option value="Masculino" className="text-[#212529] font-normal">Masculino</option>
                  <option value="Feminino" className="text-[#212529] font-normal">Feminino</option>
                  <option value="NaoBinario" className="text-[#212529] font-normal">Não binário</option>
                  <option value="PrefiroNaoDeclarar" className="text-[#212529] font-normal">Prefiro não declarar</option>
                </select>
                <div className="absolute right-3 inset-y-0 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-[#75838F]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {form.formState.errors.sexo && (
                  <span className="text-red-500 text-xs block mt-1">{form.formState.errors.sexo.message as string}</span>
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
                  <span className="text-red-500 text-xs block mt-1">
                    {form.formState.errors.dataNascimento.message as string}
                  </span>
                )}
              </div>
            </div>

            {/* Telefone com DDD e Whatsapp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              {/* Telefone com seletor de país + DDI */}
              <div ref={countryBoxRef} className="relative w-full">
                {(() => {
                  const hasError = !!form.formState.errors.telefone;
                  const value = form.getValues("telefone");
                  const touched = !!form.formState.touchedFields.telefone;
                  const isValid = !hasError && !!value && touched;
                  const borderColor = hasError ? "border-red-500" : isValid ? "border-green-500" : "border-[#75838F]";
                  return (
                    <div className={`flex items-center w-full h-[40px] rounded-[6px] border ${borderColor} bg-white px-4 py-2 text-sm font-fira-sans focus-within:outline-none focus-within:ring-2 focus-within:ring-[#8494E9]`}>
                      <button
                        type="button"
                        onClick={() => setOpenCountry(v => !v)}
                        className="flex items-center gap-2 h-full px-2 rounded-l-[6px] border-r border-[#d1d5db]"
                        aria-haspopup="listbox"
                        aria-expanded={openCountry}
                      >
                        <Image src={getFlagUrl(country.code)} alt="" width={20} height={20} unoptimized className="w-5 h-5 object-contain" />
                        <span className="text-sm uppercase text-[#23253a]">{country.code}</span>
                        <span className="text-sm leading-none text-[#d1d5db]">▼</span>
                      </button>
                      <span className="px-2 text-sm text-[#23253a] border-r border-[#d1d5db]">{country.dial}</span>
                      <input
                        type="text"
                        inputMode="tel"
                        autoComplete="off"
                        placeholder="Telefone com DDD*"
                        className="flex-1 bg-transparent outline-none text-sm px-3 text-[#23253a]"
                        value={form.watch("telefone") || ""}
                        onChange={(e) => {
                          const masked = maskTelefoneByCountry(country.code, onlyDigits(e.target.value));
                          form.setValue("telefone", masked, { shouldValidate: true, shouldDirty: true });
                        }}
                        onBlur={() => {
                          form.setValue("telefone", form.getValues("telefone"), { shouldTouch: true });
                          const digits = onlyDigits(form.getValues("telefone") || "");
                          if (!digits) {
                            form.setError("telefone", { type: "validate", message: "Telefone é obrigatório" });
                            return;
                          }
                          if (digits.length < 10) {
                            form.setError("telefone", { type: "validate", message: "Digite um telefone válido" });
                            return;
                          }
                          form.clearErrors("telefone");
                        }}
                      />
                    </div>
                  );
                })()}
                {openCountry && (
                  <ul role="listbox" className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white border border-[#e2e8f0] rounded-md shadow">
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
                        <Image src={getFlagUrl(c.code)} alt="" width={20} height={20} unoptimized className="w-5 h-5 object-contain" />
                        <span className="text-sm uppercase text-[#23253a]">{c.code}</span>
                        <span className="text-xs text-[#667085]">{c.dial}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {form.formState.errors.telefone && (
                  <span className="text-red-500 text-xs">{form.formState.errors.telefone.message as string}</span>
                )}
              </div>

              {/* Whatsapp com seletor de país + DDI */}
              <div ref={countryWhatsappBoxRef} className="relative w-full">
                {(() => {
                  const hasError = !!form.formState.errors.whatsapp;
                  const value = form.getValues("whatsapp");
                  const touched = !!form.formState.touchedFields.whatsapp;
                  const isValid = !hasError && !!value && touched;
                  const borderColor = hasError ? "border-red-500" : isValid ? "border-green-500" : "border-[#75838F]";
                  return (
                    <div className={`flex items-center w-full h-[40px] rounded-[6px] border ${borderColor} bg-white px-4 py-2 text-sm font-fira-sans focus-within:outline-none focus-within:ring-2 focus-within:ring-[#8494E9]`}>
                      <button
                        type="button"
                        onClick={() => setOpenCountryWhatsapp(v => !v)}
                        className="flex items-center gap-2 h-full px-2 rounded-l-[6px] border-r border-[#d1d5db]"
                        aria-haspopup="listbox"
                        aria-expanded={openCountryWhatsapp}
                      >
                        <Image src={getFlagUrl(countryWhatsapp.code)} alt="" width={20} height={20} unoptimized className="w-5 h-5 object-contain" />
                        <span className="text-sm uppercase text-[#23253a]">{countryWhatsapp.code}</span>
                        <span className="text-sm leading-none text-[#d1d5db]">▼</span>
                      </button>
                      <span className="px-2 text-sm text-[#23253a] border-r border-[#d1d5db]">{countryWhatsapp.dial}</span>
                      <input
                        type="text"
                        inputMode="tel"
                        autoComplete="off"
                        placeholder="Whatsapp*"
                        className="flex-1 bg-transparent outline-none text-sm px-3 text-[#23253a]"
                        value={form.watch("whatsapp") || ""}
                        onChange={(e) => {
                          const masked = maskTelefoneByCountry(countryWhatsapp.code, onlyDigits(e.target.value));
                          form.setValue("whatsapp", masked, { shouldValidate: true, shouldDirty: true });
                        }}
                        onBlur={() => {
                          form.setValue("whatsapp", form.getValues("whatsapp"), { shouldTouch: true });
                          const digits = onlyDigits(form.getValues("whatsapp") || "");
                          if (!digits) {
                            form.setError("whatsapp", { type: "validate", message: "Whatsapp é obrigatório" });
                            return;
                          }
                          if (digits.length < 10) {
                            form.setError("whatsapp", { type: "validate", message: "Digite um whatsapp válido" });
                            return;
                          }
                          form.clearErrors("whatsapp");
                        }}
                      />
                    </div>
                  );
                })()}
                {openCountryWhatsapp && (
                  <ul role="listbox" className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white border border-[#e2e8f0] rounded-md shadow">
                    {PHONE_COUNTRIES.map((c) => (
                      <li
                        key={c.code}
                        role="option"
                        aria-selected={countryWhatsapp.code === c.code}
                        onClick={() => {
                          setCountryWhatsapp(c);
                          const rawDigits = onlyDigits(form.getValues("whatsapp") || "");
                          const masked = maskTelefoneByCountry(c.code, rawDigits);
                          form.setValue("whatsapp", masked, { shouldValidate: true });
                          setOpenCountryWhatsapp(false);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#f3f4f6] ${countryWhatsapp.code === c.code ? "bg-[#eef2ff]" : ""}`}
                      >
                        <Image src={getFlagUrl(c.code)} alt="" width={20} height={20} unoptimized className="w-5 h-5 object-contain" />
                        <span className="text-sm uppercase text-[#23253a]">{c.code}</span>
                        <span className="text-xs text-[#667085]">{c.dial}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {form.formState.errors.whatsapp && (
                  <span className="text-red-500 text-xs">{form.formState.errors.whatsapp.message as string}</span>
                )}
              </div>
            </div>

            {/* CEP e Endereço residencial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <FormInput
                name="cep"
                placeholder="CEP*"
                autoComplete="off"
                className={getInputClass("cep")}
                onChange={handleMaskedChange("cep", maskCep)}
                onBlur={handleCepBlur}
              />
              <FormInput 
                name="endereco" 
                placeholder="Endereço residencial" 
                autoComplete="off"
                className={getInputClass("endereco")}
                onBlur={() => {
                  form.setValue("endereco", form.getValues("endereco"), { shouldTouch: true });
                }}
              />
            </div>
            
            {/* Número, Bairro e Complemento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              <FormInput 
                name="numero" 
                placeholder="Número" 
                autoComplete="off"
                className={getInputClass("numero")}
                onBlur={() => {
                  form.setValue("numero", form.getValues("numero"), { shouldTouch: true });
                }}
              />
              <FormInput 
                name="bairro" 
                placeholder="Bairro" 
                autoComplete="off"
                className={getInputClass("bairro")}
                onBlur={() => {
                  form.setValue("bairro", form.getValues("bairro"), { shouldTouch: true });
                }}
              />
              <FormInput 
                name="complemento" 
                placeholder="Complemento" 
                autoComplete="off"
                className={getInputClass("complemento")}
                onBlur={() => {
                  form.setValue("complemento", form.getValues("complemento"), { shouldTouch: true });
                }}
              />
            </div>
            
            {/* Estado e Cidade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div className="relative">
                <select
                  {...form.register("estado")}
                  className={getInputClass("estado") + ` appearance-none pr-10 ${!form.watch("estado") ? "text-[#75838F]" : "text-[#212529]"}`}
                  defaultValue=""
                  required
                  onChange={(e) => {
                    form.setValue("estado", e.target.value, { shouldValidate: true, shouldDirty: true });
                    form.trigger("estado");
                  }}
                  onBlur={() => {
                    form.setValue("estado", form.getValues("estado"), { shouldTouch: true });
                  }}
                >
                  <option value="" disabled hidden className="text-[#75838F]">Estado*</option>
                  <option value="AC" className="text-[#212529]">AC</option>
                  <option value="AL" className="text-[#212529]">AL</option>
                  <option value="AP" className="text-[#212529]">AP</option>
                  <option value="AM" className="text-[#212529]">AM</option>
                  <option value="BA" className="text-[#212529]">BA</option>
                  <option value="CE" className="text-[#212529]">CE</option>
                  <option value="DF" className="text-[#212529]">DF</option>
                  <option value="ES" className="text-[#212529]">ES</option>
                  <option value="GO" className="text-[#212529]">GO</option>
                  <option value="MA" className="text-[#212529]">MA</option>
                  <option value="MT" className="text-[#212529]">MT</option>
                  <option value="MS" className="text-[#212529]">MS</option>
                  <option value="MG" className="text-[#212529]">MG</option>
                  <option value="PA" className="text-[#212529]">PA</option>
                  <option value="PB" className="text-[#212529]">PB</option>
                  <option value="PR" className="text-[#212529]">PR</option>
                  <option value="PE" className="text-[#212529]">PE</option>
                  <option value="PI" className="text-[#212529]">PI</option>
                  <option value="RJ" className="text-[#212529]">RJ</option>
                  <option value="RN" className="text-[#212529]">RN</option>
                  <option value="RS" className="text-[#212529]">RS</option>
                  <option value="RO" className="text-[#212529]">RO</option>
                  <option value="RR" className="text-[#212529]">RR</option>
                  <option value="SC" className="text-[#212529]">SC</option>
                  <option value="SP" className="text-[#212529]">SP</option>
                  <option value="SE" className="text-[#212529]">SE</option>
                  <option value="TO" className="text-[#212529]">TO</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="text-[#75838F] text-xs">▼</span>
                </div>
                {form.formState.errors.estado && (
                  <span className="text-red-500 text-xs block mt-1">{form.formState.errors.estado.message as string}</span>
                )}
              </div>
              <div className="relative">
                {cidades.length > 0 && !enderecoPreenchidoPorCep ? (
                  <>
                    <select
                      {...form.register("cidade")}
                      className={getInputClass("cidade") + ` appearance-none pr-10 ${!form.watch("cidade") ? "text-[#75838F]" : "text-[#212529]"}`}
                      defaultValue=""
                      required
                      disabled={loadingCidades}
                      onChange={(e) => {
                        form.setValue("cidade", e.target.value, { shouldValidate: true, shouldDirty: true });
                        form.trigger("cidade");
                      }}
                      onBlur={() => {
                        form.setValue("cidade", form.getValues("cidade"), { shouldTouch: true });
                      }}
                    >
                      <option value="" disabled hidden className="text-[#75838F]">{loadingCidades ? "" : "Cidade*"}</option>
                      {cidades.map((cidade, idx) => (
                        <option key={idx} value={cidade.nome} className="text-[#212529]">{cidade.nome}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="text-[#75838F] text-xs">▼</span>
                    </div>
                    {form.formState.errors.cidade && (
                      <span className="text-red-500 text-xs block mt-1">{form.formState.errors.cidade.message as string}</span>
                    )}
                  </>
                ) : (
                  <FormInput 
                    name="cidade" 
                    placeholder="Cidade*" 
                    autoComplete="off"
                    className={getInputClass("cidade") + " pr-10"} 
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Uploads de documentos */}
        <UploadsAutonomo
          form={form}
          handleOpenUploadModal={handleOpenUploadModal}
          handleRemoveFile={handleRemoveFile}
          DocumentoEnviado={DocumentoEnviado}
        />
        {/* Senha */}
        <div className="flex flex-col gap-4 bg-white">
          <h3 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#212529] mb-2">Defina sua senha</h3>
          <FormInput
            name="password"
            placeholder="Senha*"
            type="password"
            autoComplete="off"
            className={getInputClass("password")}
          />
          <FormInput
            name="confirmarSenha"
            placeholder="Confirmar senha*"
            type="password"
            autoComplete="off"
            className={getInputClass("confirmarSenha")}
          />
        </div>
        
        {/* Requisitos senha */}
        <div className="text-sm text-[#212529] mt-2 mb-4 bg-white">
          <b className="font-semibold">Requisitos para criação da senha:</b>
          <div className="mt-2 space-y-1">
            {requisitos.map((req, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {req.valid ? (
                  <Image src="/assets/icons/check.svg" alt="ok" className="w-4 h-4 flex-shrink-0" width={16} height={16} />
                ) : (
                  <Image src="/assets/icons/error.svg" alt="erro" className="w-4 h-4 flex-shrink-0" width={16} height={16} />
                )}
                <span className="text-[#212529]">{req.label}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Termos */}
        <div className="flex items-start gap-2 mt-1 mb-4 bg-white">
          <input
            type="checkbox"
            id="termosAceitos"
            required
            className="accent-[#8494E9] w-4 h-4 mt-0.5 flex-shrink-0"
            checked={!!form.getValues("termosAceitos")}
            onChange={e => {
              form.setValue("termosAceitos", e.target.checked, { shouldValidate: true, shouldDirty: true });
              form.trigger("termosAceitos");
            }}
            onBlur={() => form.setValue("termosAceitos", form.getValues("termosAceitos"), { shouldTouch: true })}
          />
          <label htmlFor="termosAceitos" className="font-fira-sans font-normal text-[15px] leading-[24px] text-[#49525A]">
            Declaro que li e concordo com os{" "}
            <Link href="/termo-de-uso-psicologo" target="_blank" rel="noopener noreferrer" className="text-[#8494E9] font-medium underline">
              Termos de uso
            </Link>
            {" "}e a{" "}
            <Link href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer" className="text-[#8494E9] font-medium underline">
              Política de privacidade
            </Link>
          </label>
        </div>
        
        {/* Botão */}
        <ProgressButton
          type="submit"
          isLoading={isSubmitting}
          disabled={isButtonDisabled}
          className={`w-full font-bold rounded-lg py-3 transition-colors text-base ${
            isButtonDisabled
              ? "bg-[#e6eefe] text-[#bfc6e2] cursor-not-allowed"
              : "bg-[#6D75C0] text-white hover:bg-[#5a6299]"
          } flex items-center justify-center`}
        >
          Continuar
        </ProgressButton>
      </form>
      {/* Modal de upload */}
      {uploadModalOpen && (
        <UploadModal
          open={uploadModalOpen}
          onClose={handleCloseUploadModal}
          onUpload={handleUploadFile}
          field={uploadField}
          docType={
            uploadField === "crpDocumento"
              ? "crp"
              : uploadField === "rgDocumento"
              ? "rgCpf"
              : uploadField === "comprovanteEndereco"
              ? "comprovanteEndereco"
              : uploadField === "comprovacaoIss"
              ? "comprovacaoIss"
              : null
          }
        />
      )}
      <ModalCancelaUpload
        open={modalRemoverOpen}
        onClose={closeRemoveModal}
        onConfirm={confirmRemoveFile}
        titulo={
          modalRemoverField === "crpDocumento"
            ? "CRP"
            : modalRemoverField === "rgDocumento"
            ? "CPF"
            : modalRemoverField === "comprovanteEndereco"
            ? "Comprovante endereço"
            : modalRemoverField === "comprovacaoIss"
            ? "Comprovação de atuação autônoma"
            : ""
        }
      />
    </FormProvider>
  );
};
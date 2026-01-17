import { validateEmail } from "@/utils/validation";
import React, { useState, useEffect } from "react";
import { FormProvider, UseFormReturn, useWatch } from "react-hook-form";
import { FormInput } from "@/components/FormInput";
import Image from "next/image";
import { UploadModal } from "./UploadModal";
import { z } from "zod";
import { maskCep, maskCpfCnpj } from "@/utils/masks";
import { fillFormAddressByCep } from "@/utils/cepUtils";
import { ModalCancelaUpload } from "./ModalCancelaUpload";
import { psicologoJuridicoRegisterSchema } from "@/app/(auth)/register/schemas";
import { UploadDocumentos, DocumentoConfig } from "./UploadJuridico";
import Link from "next/link";
// Adicionar utils de telefone com país
import { PHONE_COUNTRIES, PhoneCountry, onlyDigits, maskTelefoneByCountry, getFlagUrl } from "@/utils/phoneCountries";
import { ProgressButton } from "@/components/ProgressButton";

// Tipo explícito para os campos do formulário de psicólogo juridico
export type PsicologoFormFields = { 
  nome: string;
  email: string;
  telefone: string;
  whatsapp: string;
  cnpj: string;
  crp: string;
  razaoSocial: string;
  nomeFantasia?: string;
  simplesNacional: "sim" | "nao";
  // Endereço pessoal
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  // Endereço empresa
  cepEmpresa: string;
  enderecoEmpresa: string;
  numeroEmpresa: string;
  complementoEmpresa?: string;
  bairroEmpresa: string;
  cidadeEmpresa: string;
  estadoEmpresa: string;
  password: string;
  confirmarSenha: string;
  termosAceitos: boolean;
  // Documentos obrigatórios
  crpDocumento: FileList;
  rgDocumento: FileList;
  cartaoCnpjDocumento: FileList;
  // Documentos opcionais
  contratoSocialDocumento?: FileList;
  comprovanteEndEmpresaDocumento?: FileList;
  simplesNacionalDocumento?: FileList;
  rgCpfSocioDocumento?: FileList;
    // Campo opcional
    role?: string;
};
 
// Tipagem inferida do schema
type PsicologoJuridicoFormFields = z.infer<typeof psicologoJuridicoRegisterSchema>;

// Interface para aceitar o tipo dos campos
export interface PsicologoRegisterJuridicoFormProps {
  form: UseFormReturn<PsicologoJuridicoFormFields>;
  onSubmit: (data: PsicologoJuridicoFormFields) => Promise<void>;
  isSubmitting?: boolean;
} 
// Componente apenas para Juridico
export const PsicologoRegisterFormJuridico: React.FC<PsicologoRegisterJuridicoFormProps> = ({ form, onSubmit, isSubmitting = false }) => {
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadField, setUploadField] = useState<string | null>(null);
    const [modalRemoverOpen, setModalRemoverOpen] = useState(false);
    const [modalRemoverField, setModalRemoverField] = useState<string | null>(null);

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

    // Estado para cidades (endereço pessoal)
    const [cidades, setCidades] = useState<Array<{ nome: string }>>([]);
    const [loadingCidades, setLoadingCidades] = useState(false);
    const [enderecoPreenchidoPorCep, setEnderecoPreenchidoPorCep] = useState(false);
    const estadoSelecionado = useWatch({ control: form.control, name: "estado" });

    // Estado para cidades (endereço empresa)
    const [cidadesEmpresa, setCidadesEmpresa] = useState<Array<{ nome: string }>>([]);
    const [loadingCidadesEmpresa, setLoadingCidadesEmpresa] = useState(false);
    const [enderecoEmpresaPreenchidoPorCep, setEnderecoEmpresaPreenchidoPorCep] = useState(false);
    const estadoEmpresaSelecionado = useWatch({ control: form.control, name: "estadoEmpresa" });

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

    // Função para buscar cidades por estado (IBGE API) - endereço pessoal
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

    // Função para buscar cidades por estado (IBGE API) - endereço empresa
    const buscarCidadesEmpresaPorEstado = React.useCallback(async (uf: string) => {
      if (!uf || uf.length !== 2) return [] as Array<{ nome: string }>;
      setLoadingCidadesEmpresa(true);
      try {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
        if (response.ok) {
          const data: IBGEMunicipio[] = await response.json();
          const list = data.map((c) => ({ nome: c.nome }));
          setCidadesEmpresa(list);
          return list;
        }
      } catch (error) {
        console.error("Erro ao buscar cidades empresa:", error);
      } finally {
        setLoadingCidadesEmpresa(false);
      }
      return [];
    }, []);

    // Carrega cidades quando o estado pessoal é selecionado
    useEffect(() => {
      if (estadoSelecionado && estadoSelecionado.length === 2) {
        if (!enderecoPreenchidoPorCep) {
          buscarCidadesPorEstado(estadoSelecionado);
          form.setValue("cidade", "", { shouldValidate: false, shouldDirty: true });
        } else {
          setCidades([]);
        }
      }
    }, [estadoSelecionado, enderecoPreenchidoPorCep, buscarCidadesPorEstado, form]);

    // Carrega cidades quando o estado empresa é selecionado
    useEffect(() => {
      if (estadoEmpresaSelecionado && estadoEmpresaSelecionado.length === 2) {
        if (!enderecoEmpresaPreenchidoPorCep || enderecoIgualRepresentante) {
          buscarCidadesEmpresaPorEstado(estadoEmpresaSelecionado);
          if (!enderecoIgualRepresentante) {
            form.setValue("cidadeEmpresa", "", { shouldValidate: false, shouldDirty: true });
          }
        } else {
          setCidadesEmpresa([]);
        }
      }
    }, [estadoEmpresaSelecionado, enderecoEmpresaPreenchidoPorCep, enderecoIgualRepresentante, buscarCidadesEmpresaPorEstado, form]);
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
    if (
      uploadField &&
      [
        "crpDocumento",
        "rgDocumento",
        "cartaoCnpjDocumento",
        "contratoSocialDocumento",
        "comprovanteEndEmpresaDocumento",
        "rgCpfSocioDocumento",
        "simplesNacionalDocumento"
      ].includes(uploadField)
    ) {
      const dt = new DataTransfer();
      dt.items.add(file);
      form.setValue(uploadField as keyof PsicologoFormFields, dt.files, { shouldValidate: true, shouldDirty: true });
      form.trigger(uploadField as keyof PsicologoFormFields);
    }
    handleCloseUploadModal();
  }

  // Função para remover arquivo
  function handleRemoveFile(field: string) {
    setModalRemoverField(field);
    setModalRemoverOpen(true);
  }

  function confirmRemoveFile() {
    if (modalRemoverField) {
      form.setValue(modalRemoverField as keyof PsicologoFormFields, new DataTransfer().files, { shouldValidate: true, shouldDirty: true });
      form.trigger(modalRemoverField as keyof PsicologoFormFields);
    }
    setModalRemoverOpen(false);
    setModalRemoverField(null);
  }

  function closeRemoveModal() {
    setModalRemoverOpen(false);
    setModalRemoverField(null);
  }

  // Handlers para aplicar máscaras
  const handleMaskedChange = (field: string, maskFn: (v: string) => string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = maskFn(e.target.value);
    form.setValue(field as keyof PsicologoFormFields, maskedValue, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    form.trigger(field as keyof PsicologoFormFields);
  };

  // Handler para buscar endereço pelo CEP (endereço pessoal)
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
        // Dispara validação de todos os campos de endereço
        await form.trigger(["endereco", "bairro", "cidade", "estado"]);
        setCidades([]);
      }
    }
  };

  // Handler para buscar endereço pelo CEP (endereço empresa)
  const handleCepEmpresaBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, "");
    if (cep.length === 8) {
      const endereco = await fillFormAddressByCep(cep);
      if (endereco) {
        setEnderecoEmpresaPreenchidoPorCep(true);
        form.setValue("enderecoEmpresa", endereco.logradouro || "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        form.setValue("bairroEmpresa", endereco.bairro || "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        form.setValue("cidadeEmpresa", endereco.localidade || "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        form.setValue("estadoEmpresa", endereco.uf || "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        // Aguarda um pouco antes de validar para garantir que os valores foram atualizados
        setTimeout(async () => {
          await form.trigger(["enderecoEmpresa", "bairroEmpresa", "cidadeEmpresa", "estadoEmpresa"]);
        }, 100);
        setCidadesEmpresa([]);
      }
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
            className="ml-2 "
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
    const errors = form.formState.errors;
    if (Object.keys(errors).length > 0) {
      console.log("Campos com erro de validação:", Object.keys(errors));
      Object.entries(errors).forEach(([field, error]) => {
        console.log(`Campo: ${field} - Erro:`, error?.message);
      });
    }
  }, [form.formState.errors]);

  // Monitora os documentos obrigatórios para validação do botão
  const crpDocumento = useWatch({ control: form.control, name: "crpDocumento" });
  const rgDocumento = useWatch({ control: form.control, name: "rgDocumento" });
  const cartaoCnpjDocumento = useWatch({ control: form.control, name: "cartaoCnpjDocumento" });
  const simplesNacional = useWatch({ control: form.control, name: "simplesNacional" });
  const simplesNacionalDocumento = useWatch({ control: form.control, name: "simplesNacionalDocumento" });

  // Monitora os valores dos campos para validação em tempo real
  const formValues = useWatch({ control: form.control });
  const nome = useWatch({ control: form.control, name: "nome" });
  const email = useWatch({ control: form.control, name: "email" });
  const telefone = useWatch({ control: form.control, name: "telefone" });
  const whatsapp = useWatch({ control: form.control, name: "whatsapp" });
  const cnpj = useWatch({ control: form.control, name: "cnpj" });
  const crp = useWatch({ control: form.control, name: "crp" });
  const razaoSocial = useWatch({ control: form.control, name: "razaoSocial" });
  const password = useWatch({ control: form.control, name: "password" });
  const confirmarSenha = useWatch({ control: form.control, name: "confirmarSenha" });
  const termosAceitos = useWatch({ control: form.control, name: "termosAceitos" });
  
  // Monitora campos de endereço do representante
  const cep = useWatch({ control: form.control, name: "cep" });
  const endereco = useWatch({ control: form.control, name: "endereco" });
  const numero = useWatch({ control: form.control, name: "numero" });
  const bairro = useWatch({ control: form.control, name: "bairro" });
  const cidade = useWatch({ control: form.control, name: "cidade" });
  const estado = useWatch({ control: form.control, name: "estado" });
  const complemento = useWatch({ control: form.control, name: "complemento" });
  
  // Monitora campos de endereço da empresa
  const cepEmpresa = useWatch({ control: form.control, name: "cepEmpresa" });
  const enderecoEmpresa = useWatch({ control: form.control, name: "enderecoEmpresa" });
  const numeroEmpresa = useWatch({ control: form.control, name: "numeroEmpresa" });
  const bairroEmpresa = useWatch({ control: form.control, name: "bairroEmpresa" });
  const cidadeEmpresa = useWatch({ control: form.control, name: "cidadeEmpresa" });
  const estadoEmpresa = useWatch({ control: form.control, name: "estadoEmpresa" });
  
  // Estado para checkbox de endereço igual
  const [enderecoIgualRepresentante, setEnderecoIgualRepresentante] = useState(false);

  // Função para copiar endereço do representante para empresa
  const copiarEnderecoParaEmpresa = React.useCallback(async () => {
    if (enderecoIgualRepresentante) {
      form.setValue("cepEmpresa", cep || "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      form.setValue("enderecoEmpresa", endereco || "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      form.setValue("numeroEmpresa", numero || "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      form.setValue("bairroEmpresa", bairro || "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      form.setValue("complementoEmpresa", complemento || "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      
      // Primeiro copia o estado e carrega as cidades
      if (estado && estado.length === 2) {
        form.setValue("estadoEmpresa", estado, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        const cidadesList = await buscarCidadesEmpresaPorEstado(estado);
        if (cidade && cidadesList.some((c) => c.nome === cidade)) {
          form.setValue("cidadeEmpresa", cidade, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        }
      }
      
      // Trigger validação dos campos
      form.trigger(["cepEmpresa", "enderecoEmpresa", "numeroEmpresa", "bairroEmpresa", "estadoEmpresa"]);
    }
  }, [enderecoIgualRepresentante, cep, endereco, numero, bairro, estado, complemento, form, buscarCidadesEmpresaPorEstado]);

  // Efeito para copiar endereço quando checkbox for marcado ou quando endereço do representante mudar
  useEffect(() => {
    if (enderecoIgualRepresentante && cep && endereco && numero && bairro && cidade && estado) {
      copiarEnderecoParaEmpresa();
    }
  }, [enderecoIgualRepresentante, cep, endereco, numero, bairro, cidade, estado, complemento, copiarEnderecoParaEmpresa]);
  
  // Efeito adicional para copiar a cidade quando as cidades da empresa forem carregadas
  useEffect(() => {
    if (enderecoIgualRepresentante && cidade && estado && estadoEmpresa === estado && cidadesEmpresa.length > 0) {
      // Verifica se a cidade existe na lista de cidades carregadas
      const cidadeExiste = cidadesEmpresa.some(c => c.nome === cidade);
      if (cidadeExiste && cidadeEmpresa !== cidade) {
        form.setValue("cidadeEmpresa", cidade, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        form.trigger("cidadeEmpresa");
      }
    }
  }, [enderecoIgualRepresentante, cidade, estado, estadoEmpresa, cidadesEmpresa, cidadeEmpresa, form]);

  // Valida apenas os campos que foram tocados/modificados
  useEffect(() => {
    // Não valida automaticamente - apenas quando o usuário interage
    // A validação acontece naturalmente através do mode: "onChange" e reValidateMode: "onChange"
  }, [formValues, form]);

  // Verifica se todos os documentos obrigatórios estão presentes
  const documentosObrigatoriosValidos = Boolean(
    crpDocumento && crpDocumento.length > 0 &&
    rgDocumento && rgDocumento.length > 0 &&
    cartaoCnpjDocumento && cartaoCnpjDocumento.length > 0 &&
    (simplesNacional !== "sim" || (simplesNacionalDocumento && simplesNacionalDocumento.length > 0))
  );

  // Verifica se todos os campos obrigatórios de endereço estão preenchidos (usando valores monitorados)
  const camposEnderecoValidos = Boolean(
    cep && String(cep).replace(/\D/g, "").length >= 8 &&
    endereco && String(endereco).trim().length >= 2 &&
    numero && String(numero).trim().length >= 1 &&
    bairro && String(bairro).trim().length >= 2 &&
    cidade && String(cidade).trim().length >= 2 &&
    estado && String(estado).trim().length >= 2 &&
    cepEmpresa && String(cepEmpresa).replace(/\D/g, "").length >= 8 &&
    enderecoEmpresa && String(enderecoEmpresa).trim().length >= 2 &&
    numeroEmpresa && String(numeroEmpresa).trim().length >= 1 &&
    bairroEmpresa && String(bairroEmpresa).trim().length >= 2 &&
    cidadeEmpresa && String(cidadeEmpresa).trim().length >= 2 &&
    estadoEmpresa && String(estadoEmpresa).trim().length >= 2
  );

  // Verifica se não há erros no formulário (ignorando simplesNacionalDocumento se simplesNacional não for "sim")
  const errosFiltrados = React.useMemo(() => {
    const filtered = { ...form.formState.errors };
    if (simplesNacional !== "sim" && filtered.simplesNacionalDocumento) {
      delete filtered.simplesNacionalDocumento;
    }
    return filtered;
  }, [form.formState.errors, simplesNacional]);
  const semErros = Object.keys(errosFiltrados).length === 0;

  // Verifica se todos os campos obrigatórios principais estão preenchidos (usando valores monitorados)
  const camposPrincipaisValidos = Boolean(
    nome && String(nome).trim().length >= 2 &&
    email && String(email).includes("@") &&
    telefone && String(telefone).replace(/\D/g, "").length >= 10 &&
    whatsapp && String(whatsapp).replace(/\D/g, "").length >= 10 &&
    cnpj && String(cnpj).replace(/\D/g, "").length >= 14 &&
    crp && String(crp).trim().length >= 1 &&
    razaoSocial && String(razaoSocial).trim().length >= 2 &&
    simplesNacional && (simplesNacional === "sim" || simplesNacional === "nao") &&
    password && String(password).length >= 8 &&
    confirmarSenha && password === confirmarSenha &&
    termosAceitos === true
  );

  // Validação completa: 
  // 1. Sem erros no formulário
  // 2. Campos principais válidos
  // 3. Campos de endereço válidos
  // 4. Documentos obrigatórios presentes
  const isFormValid = semErros && camposPrincipaisValidos && camposEnderecoValidos && documentosObrigatoriosValidos;
  const isButtonDisabled = isSubmitting || !isFormValid;

  // Debug para identificar o problema (pode ser removido depois)
  useEffect(() => {
    if (!isFormValid) {
      console.log("🔍 Debug validação do botão:", {
        semErros,
        camposPrincipaisValidos,
        camposEnderecoValidos,
        documentosValidos: documentosObrigatoriosValidos,
        erros: errosFiltrados,
        errosOriginais: form.formState.errors,
        faltando: {
          nome: !nome || String(nome).trim().length < 2,
          email: !email || !String(email).includes("@"),
          telefone: !telefone || String(telefone).replace(/\D/g, "").length < 10,
          whatsapp: !whatsapp || String(whatsapp).replace(/\D/g, "").length < 10,
          cnpj: !cnpj || String(cnpj).replace(/\D/g, "").length < 14,
          crp: !crp || String(crp).trim().length < 1,
          razaoSocial: !razaoSocial || String(razaoSocial).trim().length < 2,
          simplesNacional: !simplesNacional || (simplesNacional !== "sim" && simplesNacional !== "nao"),
          password: !password || String(password).length < 8,
          senhasIguais: password !== confirmarSenha,
          termos: termosAceitos !== true,
          endereco: {
            cep: !cep || String(cep).replace(/\D/g, "").length < 8,
            endereco: !endereco || String(endereco).trim().length < 2,
            numero: !numero || String(numero).trim().length < 1,
            bairro: !bairro || String(bairro).trim().length < 2,
            cidade: !cidade || String(cidade).trim().length < 2,
            estado: !estado || String(estado).trim().length < 2,
          },
          enderecoEmpresa: {
            cepEmpresa: !cepEmpresa || String(cepEmpresa).replace(/\D/g, "").length < 8,
            enderecoEmpresa: !enderecoEmpresa || String(enderecoEmpresa).trim().length < 2,
            numeroEmpresa: !numeroEmpresa || String(numeroEmpresa).trim().length < 1,
            bairroEmpresa: !bairroEmpresa || String(bairroEmpresa).trim().length < 2,
            cidadeEmpresa: !cidadeEmpresa || String(cidadeEmpresa).trim().length < 2,
            estadoEmpresa: !estadoEmpresa || String(estadoEmpresa).trim().length < 2,
          },
          documentos: {
            crp: !crpDocumento || crpDocumento.length === 0,
            rg: !rgDocumento || rgDocumento.length === 0,
            cnpj: !cartaoCnpjDocumento || cartaoCnpjDocumento.length === 0,
            simplesNacional: simplesNacional === "sim" && (!simplesNacionalDocumento || simplesNacionalDocumento.length === 0),
          }
        }
      });
    } else {
      console.log("✅ Formulário válido! Botão deve estar habilitado.");
    }
  }, [isFormValid, semErros, camposPrincipaisValidos, camposEnderecoValidos, documentosObrigatoriosValidos, errosFiltrados, form, crpDocumento, rgDocumento, cartaoCnpjDocumento, simplesNacional, simplesNacionalDocumento, nome, email, telefone, whatsapp, cnpj, crp, razaoSocial, password, confirmarSenha, termosAceitos, cep, endereco, numero, bairro, cidade, estado, cepEmpresa, enderecoEmpresa, numeroEmpresa, bairroEmpresa, cidadeEmpresa, estadoEmpresa]);

  // Lista de documentos para upload (dinâmica baseada em simplesNacional)
  const isSimplesNacionalSim = simplesNacional === "sim";
  const documentos: DocumentoConfig[] = [
    { key: "rgDocumento", label: "RG/CPF Representante*", isObrigatorio: true },
    { key: "crpDocumento", label: "CRP*", isObrigatorio: true },
    { key: "cartaoCnpjDocumento", label: "Cartão CNPJ (atualizado)*", isObrigatorio: true },
    { key: "contratoSocialDocumento", label: "Contrato social", isObrigatorio: false },
    { key: "comprovanteEndEmpresaDocumento", label: "Comprovante endereço empresa (últimos 90 dias)", isObrigatorio: false },
    { key: "simplesNacionalDocumento", label: isSimplesNacionalSim ? "Simples Nacional (apresentar somente se inserir sim)*" : "Simples Nacional (apresentar somente se inserir sim)", isObrigatorio: isSimplesNacionalSim },
    { key: "rgCpfSocioDocumento", label: "RG/CPF Sócio (Se houver)", isObrigatorio: false },
  ];

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

          // Coleta os arquivos
          const crpFile = form.getValues("crpDocumento");
          const rgCpfFile = form.getValues("rgDocumento");
          const cartaoCnpjFile = form.getValues("cartaoCnpjDocumento");
          const contratoSocialFile = form.getValues("contratoSocialDocumento");
          const comprovanteEndEmpresaFile = form.getValues("comprovanteEndEmpresaDocumento");
          const rgCpfSocioFile = form.getValues("rgCpfSocioDocumento");
          const simplesNacionalFile = form.getValues("simplesNacionalDocumento");

          // Validação: só permite envio se os documentos obrigatórios estiverem presentes
          // Obrigatórios: RG/CPF Representante, CRP, Cartão CNPJ
          // Condicional: Simples Nacional (apenas se for optante)
          if (
            !(crpFile && crpFile.length > 0) ||
            !(rgCpfFile && rgCpfFile.length > 0) ||
            !(cartaoCnpjFile && cartaoCnpjFile.length > 0)
          ) {
            alert("Envie todos os documentos obrigatórios: RG/CPF Representante, CRP e Cartão CNPJ.");
            return;
          }

          // Validação condicional: Simples Nacional é obrigatório apenas se simplesNacional === "sim"
          if (data.simplesNacional === "sim" && (!simplesNacionalFile || simplesNacionalFile.length === 0)) {
            form.setError("simplesNacionalDocumento", { type: "validate", message: "Documento Simples Nacional obrigatório quando você é optante." });
            form.trigger("simplesNacionalDocumento");
            // Scroll para o campo de erro
            setTimeout(() => {
              const errorElement = document.querySelector('[data-doc-error="simplesNacionalDocumento"]');
              if (errorElement) {
                errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
            return;
          }

          // Cria o FormData
          const formData = new FormData();

          // Adiciona arquivos
          if (crpFile && crpFile.length > 0) formData.append("crpDocumento", crpFile[0]);
          if (rgCpfFile && rgCpfFile.length > 0) formData.append("rgDocumento", rgCpfFile[0]);
          if (cartaoCnpjFile && cartaoCnpjFile.length > 0) formData.append("cartaoCnpjDocumento", cartaoCnpjFile[0]);
          if (contratoSocialFile && contratoSocialFile.length > 0) formData.append("contratoSocialDocumento", contratoSocialFile[0]);
          if (comprovanteEndEmpresaFile && comprovanteEndEmpresaFile.length > 0) formData.append("comprovanteEndEmpresaDocumento", comprovanteEndEmpresaFile[0]);
          if (rgCpfSocioFile && rgCpfSocioFile.length > 0) formData.append("rgCpfSocioDocumento", rgCpfSocioFile[0]);
          if (simplesNacionalFile && simplesNacionalFile.length > 0) formData.append("simplesNacionalDocumento", simplesNacionalFile[0]);

          // Adiciona campos normais
          Object.entries(data).forEach(([key, value]) => {
            if (
              ["crpDocumento", "rgDocumento", "cartaoCnpjDocumento", "contratoSocialDocumento", "comprovanteEndEmpresaDocumento", "rgCpfSocioDocumento", "simplesNacionalDocumento"].includes(key)
            ) return;
            
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
          
          // Define TipoPessoaJuridico como Juridico
          formData.set("TipoPessoaJuridico", "Juridico");

          if (onSubmit) {
            onSubmit(formData as unknown as PsicologoJuridicoFormFields);
          }
        })}
        className="flex flex-col gap-8 w-full max-w-[792px] px-2 sm:px-0 bg-[#fff] mt-4"
      >
        <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] align-middle text-[#212529] mb-4">
          Dados pessoais
        </h4>
        <div className="bg-white mb-2">
          <div className="flex flex-col gap-3">
            {/* Nome completo */}
            <div>
              <FormInput 
                name="nome" 
                placeholder="Nome completo*" 
                className={getInputClass("nome")}
              />
            </div>

            {/* E-mail profissional e CRP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <FormInput 
                name="email" 
                placeholder="E-mail profissional*" 
                type="email" 
                className={getInputClass("email")}
              />
              <FormInput
                name="crp"
                placeholder="CRP*"
                className={getInputClass("crp")}
                maxLength={12}
              />
            </div>

            {/* Telefone e WhatsApp */}
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
                  <span className="text-red-500 text-xs block mt-1">{form.formState.errors.telefone.message as string}</span>
                )}
              </div>

              {/* WhatsApp com seletor de país + DDI */}
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
                  <span className="text-red-500 text-xs block mt-1">{form.formState.errors.whatsapp.message as string}</span>
                )}
              </div>
            </div>

            {/* CEP e Endereço residencial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <FormInput
                name="cep"
                placeholder="CEP*"
                className={getInputClass("cep")}
                onChange={handleMaskedChange("cep", maskCep)}
                onBlur={handleCepBlur}
              />
              <FormInput 
                name="endereco" 
                placeholder="Endereço residencial*" 
                className={getInputClass("endereco")}
              />
            </div>

            {/* Número, Bairro e Complemento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              <FormInput 
                name="numero" 
                placeholder="Número*" 
                className={getInputClass("numero")}
              />
              <FormInput 
                name="bairro" 
                placeholder="Bairro*" 
                className={getInputClass("bairro")}
              />
              <FormInput 
                name="complemento" 
                placeholder="Complemento" 
                className={getInputClass("complemento")}
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
                    form.setValue("estado", e.target.value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
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
                        form.setValue("cidade", e.target.value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
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
                  <FormInput name="cidade" placeholder="Cidade*" className={getInputClass("cidade") + " pr-10"} />
                )}
              </div>
            </div>
          </div>

        <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] align-middle text-[#212529] mb-4 mt-8">
          Dados empresa
        </h4>
        <div className="bg-white mb-2">
          <div className="flex flex-col gap-3">
            {/* Razão social e CNPJ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <FormInput 
                name="razaoSocial" 
                placeholder="Razão social*" 
                className={getInputClass("razaoSocial")}
              />
              <FormInput
                name="cnpj"
                placeholder="CNPJ*"
                className={getInputClass("cnpj")}
                onChange={handleMaskedChange("cnpj", maskCpfCnpj)}
              />
            </div>

            {/* Checkbox para endereço igual ao representante */}
            <div className="flex items-start gap-2 mb-2">
              <input
                type="checkbox"
                id="enderecoIgualRepresentante"
                checked={enderecoIgualRepresentante}
                onChange={(e) => {
                  setEnderecoIgualRepresentante(e.target.checked);
                }}
                className="accent-[#6D75C0] w-5 h-5 mt-0.5 flex-shrink-0"
              />
              <label htmlFor="enderecoIgualRepresentante" className="font-fira-sans font-normal text-[15px] leading-[24px] text-[#49525A] cursor-pointer">
                O Endereço é o mesmo do representante
              </label>
            </div>

            {/* CEP e Endereço empresa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <FormInput
                name="cepEmpresa"
                placeholder="CEP*"
                className={getInputClass("cepEmpresa")}
                onChange={handleMaskedChange("cepEmpresa", maskCep)}
                onBlur={handleCepEmpresaBlur}
                disabled={enderecoIgualRepresentante}
              />
              <FormInput 
                name="enderecoEmpresa" 
                placeholder="Endereço empresa*" 
                className={getInputClass("enderecoEmpresa")}
                disabled={enderecoIgualRepresentante}
              />
            </div>

            {/* Número, Bairro e Complemento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              <FormInput 
                name="numeroEmpresa" 
                placeholder="Número*" 
                className={getInputClass("numeroEmpresa")}
                disabled={enderecoIgualRepresentante}
              />
              <FormInput 
                name="bairroEmpresa" 
                placeholder="Bairro*" 
                className={getInputClass("bairroEmpresa")}
                disabled={enderecoIgualRepresentante}
              />
              <FormInput 
                name="complementoEmpresa" 
                placeholder="Complemento" 
                className={getInputClass("complementoEmpresa")}
                disabled={enderecoIgualRepresentante}
              />
            </div>

            {/* Estado e Cidade empresa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div className="relative">
                <select
                  {...form.register("estadoEmpresa")}
                  className={getInputClass("estadoEmpresa") + ` appearance-none pr-10 ${!form.watch("estadoEmpresa") ? "text-[#75838F]" : "text-[#212529]"} ${enderecoIgualRepresentante ? "opacity-60 cursor-not-allowed" : ""}`}
                  defaultValue=""
                  required
                  disabled={enderecoIgualRepresentante}
                  onChange={(e) => {
                    form.setValue("estadoEmpresa", e.target.value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                    form.trigger("estadoEmpresa");
                  }}
                  onBlur={() => {
                    form.setValue("estadoEmpresa", form.getValues("estadoEmpresa"), { shouldTouch: true });
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
                {form.formState.errors.estadoEmpresa && (
                  <span className="text-red-500 text-xs block mt-1">{form.formState.errors.estadoEmpresa.message as string}</span>
                )}
              </div>
              <div className="relative">
                {cidadesEmpresa.length > 0 && !enderecoEmpresaPreenchidoPorCep ? (
                  <>
                    <select
                      {...form.register("cidadeEmpresa")}
                      className={getInputClass("cidadeEmpresa") + ` appearance-none pr-10 ${!form.watch("cidadeEmpresa") ? "text-[#75838F]" : "text-[#212529]"} ${enderecoIgualRepresentante ? "opacity-60 cursor-not-allowed" : ""}`}
                      defaultValue=""
                      required
                      disabled={loadingCidadesEmpresa || enderecoIgualRepresentante}
                      onChange={(e) => {
                        form.setValue("cidadeEmpresa", e.target.value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                        form.trigger("cidadeEmpresa");
                      }}
                      onBlur={() => {
                        form.setValue("cidadeEmpresa", form.getValues("cidadeEmpresa"), { shouldTouch: true });
                      }}
                    >
                      <option value="" disabled hidden className="text-[#75838F]">{loadingCidadesEmpresa ? "" : "Cidade*"}</option>
                      {cidadesEmpresa.map((cidade, idx) => (
                        <option key={idx} value={cidade.nome} className="text-[#212529]">{cidade.nome}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="text-[#75838F] text-xs">▼</span>
                    </div>
                    {form.formState.errors.cidadeEmpresa && (
                      <span className="text-red-500 text-xs block mt-1">{form.formState.errors.cidadeEmpresa.message as string}</span>
                    )}
                  </>
                ) : (
                  <FormInput 
                    name="cidadeEmpresa" 
                    placeholder="Cidade*" 
                    className={getInputClass("cidadeEmpresa") + " pr-10"}
                    onBlur={() => {
                      form.setValue("cidadeEmpresa", form.getValues("cidadeEmpresa"), { shouldTouch: true });
                      form.trigger("cidadeEmpresa");
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <h4 className="font-fira-sans font-semibold text-[16px] leading-[24px] text-[#212529] mt-6 mb-2">
          Simples nacional?
        </h4>
        <div className="flex items-center gap-6 mb-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="simplesNacional"
              value="sim"
              checked={form.getValues("simplesNacional") === "sim"}
              onChange={() => {
                form.setValue("simplesNacional", "sim", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                form.trigger("simplesNacional");
                // Valida o documento simplesNacional quando "Sim" é selecionado
                setTimeout(() => {
                  form.trigger("simplesNacionalDocumento");
                }, 100);
              }}
              className="appearance-none w-4 h-4 rounded-full border border-[#C2C7D6] checked:bg-[#6D75C0] checked:border-[#6D75C0] mr-2 flex-shrink-0
                bg-white transition-colors duration-150"
              style={{
                boxShadow: form.getValues("simplesNacional") === "sim" ? "0 0 0 2px #6D75C0" : undefined,
              }}
            />
            <span className="text-[#212529] font-fira-sans text-[16px] leading-[24px]">Sim</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="simplesNacional"
              value="nao"
              checked={form.getValues("simplesNacional") === "nao"}
              onChange={() => {
                form.setValue("simplesNacional", "nao", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                form.trigger("simplesNacional");
                // Limpa o erro do documento quando "Não" é selecionado
                form.clearErrors("simplesNacionalDocumento");
              }}
              className="appearance-none w-4 h-4 rounded-full border border-[#C2C7D6] checked:bg-[#6D75C0] checked:border-[#6D75C0] mr-2 flex-shrink-0
                bg-white transition-colors duration-150"
              style={{
                boxShadow: form.getValues("simplesNacional") === "nao" ? "0 0 0 2px #6D75C0" : undefined,
              }}
            />
            <span className="text-[#212529] font-fira-sans text-[16px] leading-[24px]">Não</span>
          </label>
        </div>

          <UploadDocumentos
            form={form}
            handleOpenUploadModal={handleOpenUploadModal}
            handleRemoveFile={handleRemoveFile}
            DocumentoEnviado={DocumentoEnviado}
            documentos={documentos}
          />

          <p
            className="font-fira-sans font-normal text-[16px] leading-[24px] text-[#6D75C0] align-middle mt-2"
            style={{ letterSpacing: "0%" }}
          >
            <span>
              <b>**</b> Para obter o comprovante do Simples Nacional, acesse&nbsp;
              <Link
                href="https://www8.receita.fazenda.gov.br/SimplesNacional/aplicacoes.aspx?id=cnpj"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                este link oficial da Receita Federal
              </Link>
              . Após gerar o documento, faça o upload acima junto com os demais arquivos obrigatórios.
            </span>
          </p>
        </div>

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
        
        <div className="text-sm text-[#212529] mt-2 mb-4 bg-white">
          <b className="font-semibold">Requisitos para criação da senha:</b>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <Image src="/assets/icons/check.svg" alt="ok" className="w-4 h-4 flex-shrink-0" width={16} height={16} />
              <span className="text-[#212529]">Deve conter no mínimo 8 caracteres</span>
            </div>
            <div className="flex items-center gap-2">
              <Image src="/assets/icons/check.svg" alt="ok" className="w-4 h-4 flex-shrink-0" width={16} height={16} />
              <span className="text-[#212529]">Incluir pelo menos uma letra maiúscula e uma minúscula</span>
            </div>
            <div className="flex items-center gap-2">
              <Image src="/assets/icons/check.svg" alt="ok" className="w-4 h-4 flex-shrink-0" width={16} height={16} />
              <span className="text-[#212529]">Incluir pelo menos um número</span>
            </div>
            <div className="flex items-center gap-2">
              <Image src="/assets/icons/check.svg" alt="ok" className="w-4 h-4 flex-shrink-0" width={16} height={16} />
              <span className="text-[#212529]">Incluir pelo menos um caractere especial: ! @ % $ &</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-2 mt-1 mb-4 bg-white">
          <input
            type="checkbox"
            id="termosAceitos"
            required
            className="accent-[#8494E9] w-4 h-4 mt-0.5 flex-shrink-0"
            checked={!!form.getValues("termosAceitos")}
            onChange={e => {
              form.setValue("termosAceitos", e.target.checked, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
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
                ? "rgDocumento"
                : uploadField === "cartaoCnpjDocumento"
                ? "cartaoCnpj"
                : uploadField === "contratoSocialDocumento"
                ? "contratoSocial"
                : uploadField === "comprovanteEndEmpresaDocumento"
                ? "comprovanteEndEmpresa"
                : uploadField === "rgCpfSocioDocumento"
                ? "rgCpfSocio"
                : uploadField === "simplesNacionalDocumento"
                ? "simplesNacionalDocumento"
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
              ? "RG/CPF"
              : modalRemoverField === "cartaoCnpjDocumento"
              ? "Cartão CNPJ"
              : modalRemoverField === "contratoSocialDocumento"
              ? "Contrato Social"
              : modalRemoverField === "comprovanteEndEmpresaDocumento"
              ? "Comprovante Endereço Empresa"
              : modalRemoverField === "rgCpfSocioDocumento"
              ? "Rg/Cpf Sócio"
              : modalRemoverField === "rgRepresentanteDocumento"
              ? "RG/CPF Representante"
              : modalRemoverField === "simplesNacionalDocumento"
              ? "Simples Nacional"
              : ""
          }
        />
    </FormProvider>
  )
}


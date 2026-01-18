"use client";
import React from "react";
import { useRouter } from "next/navigation";
import SidebarPsicologo from "../SidebarPsicologo";
import Image from "next/image";
import { FiEdit2 } from "react-icons/fi";
import { motion } from "framer-motion";
import Select from "react-select";
import { useEnums } from '@/hooks/enumsHook';
import toast from 'react-hot-toast';
import { useUserPsicologo, useUpdateUserPsicologo, useUploadUserPsicologoImagem, useUpdateUserPsicologoImagem, useDeletePsicologo } from '@/hooks/user/userPsicologoHook';
import { PHONE_COUNTRIES, PhoneCountry, onlyDigits, maskTelefoneByCountry, getFlagUrl } from "@/utils/phoneCountries";
import { Psicologo } from "@/types/psicologoTypes";
import type { updatePsicologo } from "@/services/userPsicologoService";
import { isValidCPF, isValidCNPJ } from "@/utils/validateDocuments";
import { normalizeEnum, normalizeExperienciaClinica } from "@/utils/enumUtils";
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";

type ApiError = {
  response?: {
    data?: {
      error?: string;
      message?: string;
      details?: unknown;
    };
    status?: number;
  };
  message?: string;
};

const MESES = [
  { label: "Janeiro", value: "01" },
  { label: "Fevereiro", value: "02" },
  { label: "Março", value: "03" },
  { label: "Abril", value: "04" },
  { label: "Maio", value: "05" },
  { label: "Junho", value: "06" },
  { label: "Julho", value: "07" },
  { label: "Agosto", value: "08" },
  { label: "Setembro", value: "09" },
  { label: "Outubro", value: "10" },
  { label: "Novembro", value: "11" },
  { label: "Dezembro", value: "12" }
];
const ANOS = Array.from({ length: 70 }, (_, i) => `${new Date().getFullYear() - i}`);

// Funções removidas - agora usamos o enum diretamente

// Tipo para formação acadêmica
type FormacaoAcademica = {
  tipo: string;
  curso: string;
  instituicao: string;
  inicioMes: string;
  inicioAno: string;
  fimMes: string;
  fimAno: string;
};

// Tipo para DadosBancarios
type DadosBancarios = {
  ChavePix: string;
};

// Tipo para PessoalJuridica
type PessoalJuridica = {
  InscricaoEstadual: string;
  SimplesNacional: boolean;
  RazaoSocial: string;
  NomeFantasia: string;
  CNPJ?: string;
  DadosBancarios?: DadosBancarios;
};

// Tipo para formação vinda do backend
type FormacaoApi = {
  Id: string;
  TipoFormacao: string;
  Curso: string;
  Instituicao: string;
  DataInicio?: string;
  DataConclusao?: string;
  Status?: string;
};

// Tipo para Address compatível com updatePsicologo
type AddressUpdate = {
  Rua: string;
  Numero: string;
  Bairro: string;
  Cidade: string;
  Estado: string;
  Cep: string;
  Complemento: string;
};

export default function MeuPerfilPage() {
  // ...existing code...
  const router = useRouter();
  const { psicologo, refetch } = useUserPsicologo();
  const { enums } = useEnums();
  const [showPhotoModal, setShowPhotoModal] = React.useState(false);
  const [showLeaveModal, setShowLeaveModal] = React.useState(false);
  const [percent, setPercent] = React.useState(48);

  console.debug('psicologo pages ', psicologo);
  
  // Verifica se é Pessoa Jurídica
  // TipoPessoaJuridico é um único valor enum (string), não um array
  const isPessoaJuridica = React.useMemo(() => {
    const tipoPessoa = psicologo?.user?.[0]?.ProfessionalProfiles?.[0]?.TipoPessoaJuridico;
    // Debug: log para verificar o valor
    console.log('[pos-cadastro] TipoPessoaJuridico:', tipoPessoa, 'Tipo:', typeof tipoPessoa, 'É array?', Array.isArray(tipoPessoa));
    if (!tipoPessoa) return false;
    // Se for array (caso raro), verifica se tem algum tipo de PJ
    if (Array.isArray(tipoPessoa)) {
      return tipoPessoa.some((t: string) => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");
    }
    // Verifica se é string e se é um tipo de PJ (não "Autonomo")
    const tipoPessoaStr = String(tipoPessoa);
    return tipoPessoaStr === "Juridico" || 
           tipoPessoaStr === "PjAutonomo" || 
           tipoPessoaStr === "Ei" || 
           tipoPessoaStr === "Mei" || 
           tipoPessoaStr === "SociedadeLtda" || 
           tipoPessoaStr === "Eireli" || 
           tipoPessoaStr === "Slu";
  }, [psicologo]);

  // Verifica se é Autônomo (não pessoa jurídica)
  // TipoPessoaJuridico é um único valor enum (string), não um array
  const isAutonomo = React.useMemo(() => {
    const tipoPessoa = psicologo?.user?.[0]?.ProfessionalProfiles?.[0]?.TipoPessoaJuridico;
    if (!tipoPessoa) return false;
    // Se for array (caso raro), verifica se tem "Autonomo" e não tem PJ
    if (Array.isArray(tipoPessoa)) {
      const temAutonomo = tipoPessoa.some((t: string) => t === "Autonomo");
      const temPJ = tipoPessoa.some((t: string) => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");
      return temAutonomo && !temPJ;
    }
    // Verifica se é string e se é exatamente "Autonomo"
    const tipoPessoaStr = String(tipoPessoa);
    return tipoPessoaStr === "Autonomo";
  }, [psicologo]);
  
  // Estado para múltiplas formações acadêmicas
  const [formacoes, setFormacoes] = React.useState<FormacaoAcademica[]>([]);

  // Estado para o campo "Sobre mim"
  const [sobreMim, setSobreMim] = React.useState("");
  const SOBRE_MIM_MAX = 1000;

  // Estado para o campo "Tempo de experiência clínica" (enum)
  const [experienciaClinica, setExperienciaClinica] = React.useState<string | null>(null);

  // Estado para o campo "Idiomas"
  const [idiomasSelecionados, setIdiomasSelecionados] = React.useState<{ value: string; label: string }[]>([]);
  const [publicoSelecionado, setPublicoSelecionado] = React.useState<{ value: string; label: string }[]>([]);

  // Estado para Abordagens e Queixas
  const [abordagensSelecionadas, setAbordagensSelecionadas] = React.useState<{ value: string; label: string }[]>([]);
  const [queixasSelecionadas, setQueixasSelecionadas] = React.useState<{ value: string; label: string }[]>([]);
  // Estado para gênero e pronome (dados pessoais)
  const [sexo, setSexo] = React.useState<string>("");
  const [pronome, setPronome] = React.useState<string>("");

  // Estado para dados bancários
  const [chavePix, setChavePix] = React.useState<string>("");
  const [chavePixError, setChavePixError] = React.useState<string>("");

  // Função para validar Chave PIX (CPF ou CNPJ)
  const validateChavePix = React.useCallback((value: string): string => {
    if (!value || value.trim() === "") {
      return "";
    }
    const cleanValue = value.replace(/\D/g, "");
    
    if (isValidCPF(cleanValue) || isValidCNPJ(cleanValue)) {
      return "";
    }
    
    return "Chave PIX deve ser um CPF ou CNPJ válido";
  }, []);

  // Estado para dados pessoais - representante legal
  const [nomeRazao, setNomeRazao] = React.useState<string>("");
  const [cpf, setCpf] = React.useState<string>("");
  const [telefoneCompleto, setTelefoneCompleto] = React.useState<string>("");
  const [country, setCountry] = React.useState<PhoneCountry>(PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0]);
  const [openCountry, setOpenCountry] = React.useState(false);
  const countryBoxRef = React.useRef<HTMLDivElement>(null);
  const [whatsappCompleto, setWhatsappCompleto] = React.useState<string>("");
  const [countryWhatsapp, setCountryWhatsapp] = React.useState<PhoneCountry>(PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0]);
  const [openCountryWhatsapp, setOpenCountryWhatsapp] = React.useState(false);
  const countryWhatsappBoxRef = React.useRef<HTMLDivElement>(null);
  const [racaCor, setRacaCor] = React.useState<string>("");

  // Estado para dados empresa
  const [inscricaoMunicipal, setInscricaoMunicipal] = React.useState<string>("");
  const [cnpj, setCnpj] = React.useState<string>("");
  const [nomeFantasia, setNomeFantasia] = React.useState<string>("");

  // Estado para endereço
  const [cep, setCep] = React.useState<string>("");
  const [rua, setRua] = React.useState<string>("");
  const [numero, setNumero] = React.useState<string>("");
  const [complemento, setComplemento] = React.useState<string>("");
  const [bairro, setBairro] = React.useState<string>("");
  const [cidade, setCidade] = React.useState<string>("");
  const [estado, setEstado] = React.useState<string>("");

  // Estados iniciais para comparação
  const [initialData, setInitialData] = React.useState<Record<string, unknown> | null>(null);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Preencher estados com dados do psicólogo
  React.useEffect(() => {
    if (psicologo && psicologo.user && psicologo.user.length > 0) {
      const user = psicologo.user[0];
      const profile = user.ProfessionalProfiles?.[0];

      setSobreMim(profile?.SobreMim || "");
      setIdiomasSelecionados(
        (profile?.Idiomas || []).map((i: string) => ({
          value: i,
          label: i
        }))
      );
      
      // Mapear público selecionado usando os valores do enum quando disponível
      const tipoAtendimentoFromProfile = profile?.TipoAtendimento || [];
      const publicoOptions = (enums?.perfilProfissional?.tipoAtendimento || []).map((p: string) => ({
        value: p,
        label: p
      }));
      
      // Se os enums estão disponíveis, mapear usando as opções do enum
      // Caso contrário, usar os valores diretamente do perfil
      const publicoMapeado = tipoAtendimentoFromProfile.map((p: string) => {
        // Tenta encontrar o valor nas opções do enum
        const encontrado = publicoOptions.find(opt => opt.value === p);
        if (encontrado) {
          return encontrado;
        }
        // Se não encontrar, retorna o valor como está
        return { value: p, label: p };
      });
      
      setPublicoSelecionado(publicoMapeado);
      setExperienciaClinica(profile?.ExperienciaClinica || null);

      // Corrigido: listar apenas formações únicas (sem duplicidade)
      const formacoesUnicas: FormacaoAcademica[] = [];
      const idsSet = new Set();
      
      console.debug('Carregando formações do perfil:', profile?.Formacoes);
      console.debug('Tipo de Formacoes:', typeof profile?.Formacoes, Array.isArray(profile?.Formacoes));
      
      const formacoesArray = profile?.Formacoes || [];
      console.debug('Formações array length:', formacoesArray.length);
      
      formacoesArray.forEach((f: FormacaoApi) => {
        // Se não tiver Id, gera um ID temporário baseado no conteúdo para evitar duplicatas
        const formacaoId = f.Id || `${f.TipoFormacao}-${f.Instituicao}-${f.Curso}`;
        
        if (!idsSet.has(formacaoId)) {
          idsSet.add(formacaoId);
          
          // Helper para parsear data de forma segura
          // Aceita formatos: "MM/YYYY", "M/YYYY", ISO string, ou Date object
          const parseDate = (dateStr: string | Date | undefined | null): { mes: string; ano: string } => {
            if (!dateStr) return { mes: "", ano: "" };
            
            try {
              let mes = "";
              let ano = "";
              
              if (dateStr instanceof Date) {
                // Se já for um objeto Date
                mes = String(dateStr.getMonth() + 1).padStart(2, "0");
                ano = String(dateStr.getFullYear());
              } else if (typeof dateStr === 'string') {
                // Remove espaços em branco
                const trimmed = dateStr.trim();
                
                // Verifica se é formato MM/YYYY ou M/YYYY (ex: "01/2025" ou "1/2025")
                const mmYyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
                if (mmYyyyMatch) {
                  const mesNum = parseInt(mmYyyyMatch[1], 10);
                  const anoNum = parseInt(mmYyyyMatch[2], 10);
                  
                  // Valida mês (1-12) e ano (1900-2100)
                  if (mesNum >= 1 && mesNum <= 12 && anoNum >= 1900 && anoNum <= 2100) {
                    mes = String(mesNum).padStart(2, "0");
                    ano = String(anoNum);
                  } else {
                    return { mes: "", ano: "" };
                  }
                } else {
                  // Tenta parsear como ISO string ou outros formatos
                  const date = new Date(trimmed);
                  if (!isNaN(date.getTime())) {
                    mes = String(date.getMonth() + 1).padStart(2, "0");
                    ano = String(date.getFullYear());
                  } else {
                    return { mes: "", ano: "" };
                  }
                }
              } else {
                return { mes: "", ano: "" };
              }
              
              return { mes, ano };
            } catch (error) {
              console.error('Erro ao parsear data:', dateStr, error);
              return { mes: "", ano: "" };
            }
          };
          
          const dataInicio = parseDate(f.DataInicio);
          const dataConclusao = parseDate(f.DataConclusao);
          
          formacoesUnicas.push({
            tipo: f.TipoFormacao || "",
            curso: f.Curso || "",
            instituicao: f.Instituicao || "",
            inicioMes: dataInicio.mes,
            inicioAno: dataInicio.ano,
            fimMes: dataConclusao.mes,
            fimAno: dataConclusao.ano
          });
        }
      });
      
      console.debug('Formações processadas:', formacoesUnicas);
      setFormacoes(formacoesUnicas);

      setAbordagensSelecionadas(
        (profile?.Abordagens || []).map((a: string) => ({
          value: a,
          label: normalizeEnum(a)
        }))
      );
      setQueixasSelecionadas(
        (profile?.Queixas || []).map((q: string) => ({
          value: q,
          label: normalizeEnum(q)
        }))
      );
    }
  }, [psicologo, enums]);

  // Sincroniza estado local de gênero e pronome quando os dados do psicólogo carregarem
  React.useEffect(() => {
    const user = psicologo?.user?.[0];
    if (user) {
      setSexo(user.Sexo || "");
      setPronome(user.Pronome || "");
      setRacaCor(user.RacaCor || "");
      
      // Preencher dados bancários - verifica se é autônomo ou PJ
      const profile = user.ProfessionalProfiles?.[0];
      const isAutonomo = profile?.TipoPessoaJuridico && 
        (Array.isArray(profile.TipoPessoaJuridico) 
          ? profile.TipoPessoaJuridico.some((t: string) => t === "Autonomo" || t === "PjAutonomo")
          : profile.TipoPessoaJuridico === "Autonomo" || profile.TipoPessoaJuridico === "PjAutonomo");
      
      // Busca PIX do autônomo (ProfessionalProfile) ou do PJ (PessoalJuridica)
      let dadosBancarios = null;
      if (isAutonomo && profile?.DadosBancarios) {
        dadosBancarios = profile.DadosBancarios;
      } else if (!isAutonomo && user.PessoalJuridica?.DadosBancarios) {
        dadosBancarios = user.PessoalJuridica.DadosBancarios;
      }
      
      if (dadosBancarios) {
        const pixValue = (dadosBancarios as { ChavePix?: string }).ChavePix || "";
        setChavePix(pixValue);
        if (pixValue) {
          const error = validateChavePix(pixValue);
          setChavePixError(error);
        } else {
          // Limpar erro se não houver PIX
          setChavePixError("");
        }
      } else {
        // Se não houver dados bancários, limpar o PIX
        setChavePix("");
        setChavePixError("");
      }

      // Preencher dados pessoais - representante legal
      setNomeRazao(user.PessoalJuridica?.RazaoSocial || user.Nome || "");
      setCpf(user.Cpf || "");
      const telefoneValue = user.Telefone || "";
      if (telefoneValue) {
        if (telefoneValue.startsWith("+")) {
          // Detecta país pelo DDI
          const detected = PHONE_COUNTRIES.find(c => telefoneValue.startsWith(c.dial));
          if (detected) {
            setCountry(detected);
            const digits = onlyDigits(telefoneValue.replace(detected.dial, "").trim());
            setTelefoneCompleto(maskTelefoneByCountry(detected.code, digits));
          } else {
            // Default Brasil se não encontrar
            setCountry(PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0]);
            const digits = onlyDigits(telefoneValue);
            setTelefoneCompleto(maskTelefoneByCountry("BR", digits));
          }
        } else {
          // Se não tem DDI, assume Brasil
          const digits = onlyDigits(telefoneValue);
          setTelefoneCompleto(maskTelefoneByCountry("BR", digits));
        }
      }
      
      // Preencher WhatsApp
      const whatsappValue = (user as Psicologo & { WhatsApp?: string }).WhatsApp || "";
      if (whatsappValue) {
        if (whatsappValue.startsWith("+")) {
          // Detecta país pelo DDI
          const detected = PHONE_COUNTRIES.find(c => whatsappValue.startsWith(c.dial));
          if (detected) {
            setCountryWhatsapp(detected);
            const digits = onlyDigits(whatsappValue.replace(detected.dial, "").trim());
            setWhatsappCompleto(maskTelefoneByCountry(detected.code, digits));
          } else {
            // Default Brasil se não encontrar
            setCountryWhatsapp(PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0]);
            const digits = onlyDigits(whatsappValue);
            setWhatsappCompleto(maskTelefoneByCountry("BR", digits));
          }
        } else {
          // Se não tem DDI, assume Brasil
          const digits = onlyDigits(whatsappValue);
          setWhatsappCompleto(maskTelefoneByCountry("BR", digits));
        }
      }

      // Preencher dados empresa
      setInscricaoMunicipal(user.PessoalJuridica?.InscricaoEstadual || "");
      setCnpj(user.PessoalJuridica?.CNPJ || "");
      setNomeFantasia(user.PessoalJuridica?.NomeFantasia || "");

      // Preencher endereço
      const address = Array.isArray(user.Address) ? user.Address[0] : user.Address;
      if (address) {
        setCep(address.Cep || "");
        setRua(address.Rua || "");
        setNumero(address.Numero || "");
        setComplemento(address.Complemento || "");
        setBairro(address.Bairro || "");
        setCidade(address.Cidade || "");
        setEstado(address.Estado || "");
      }
    }
  }, [psicologo, validateChavePix]);

  // Salvar dados iniciais quando carregar
  React.useEffect(() => {
    if (psicologo && psicologo.user && psicologo.user.length > 0 && !initialData) {
      const user = psicologo.user[0];
      const profile = user.ProfessionalProfiles?.[0];
      const address = Array.isArray(user.Address) ? user.Address[0] : user.Address;
      const telefoneValue = user.Telefone || "";
      const currentCountry = telefoneValue && telefoneValue.startsWith("+")
        ? PHONE_COUNTRIES.find(c => telefoneValue.startsWith(c.dial)) || PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0]
        : PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0];
      
      const whatsappValue = user.WhatsApp || "";
      const currentCountryWhatsapp = whatsappValue && whatsappValue.startsWith("+")
        ? PHONE_COUNTRIES.find(c => whatsappValue.startsWith(c.dial)) || PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0]
        : PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0];
      
      setInitialData({
        telefoneCompleto: telefoneValue,
        countryCode: currentCountry.code,
        whatsappCompleto: whatsappValue,
        countryWhatsappCode: currentCountryWhatsapp.code,
        sexo: user.Sexo || "",
        pronome: user.Pronome || "",
        racaCor: "",
        inscricaoMunicipal: user.PessoalJuridica?.InscricaoEstadual || "",
        sobreMim: profile?.SobreMim || "",
        experienciaClinica: profile?.ExperienciaClinica || null,
        idiomas: (profile?.Idiomas || []).map((i: string) => i),
        publico: (profile?.TipoAtendimento || []).map((p: string) => p),
        abordagens: (profile?.Abordagens || []).map((a: string) => a),
        queixas: (profile?.Queixas || []).map((q: string) => q),
        formacoes: (profile?.Formacoes || []).map((f: FormacaoApi) => {
          // Helper para parsear data de forma segura
          // Aceita formatos: "MM/YYYY", ISO string, ou Date object
          const parseDate = (dateStr: string | Date | undefined | null): { mes: string; ano: string } => {
            if (!dateStr) return { mes: "", ano: "" };
            
            try {
              let mes = "";
              let ano = "";
              
              if (dateStr instanceof Date) {
                // Se já for um objeto Date
                mes = String(dateStr.getMonth() + 1).padStart(2, "0");
                ano = String(dateStr.getFullYear());
              } else if (typeof dateStr === 'string') {
                // Verifica se é formato MM/YYYY
                const mmYyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{4})$/);
                if (mmYyyyMatch) {
                  mes = mmYyyyMatch[1].padStart(2, "0");
                  ano = mmYyyyMatch[2];
                } else {
                  // Tenta parsear como ISO string ou outros formatos
                  const date = new Date(dateStr);
                  if (!isNaN(date.getTime())) {
                    mes = String(date.getMonth() + 1).padStart(2, "0");
                    ano = String(date.getFullYear());
                  } else {
                    console.warn('Data inválida:', dateStr);
                    return { mes: "", ano: "" };
                  }
                }
              } else {
                return { mes: "", ano: "" };
              }
              
              return { mes, ano };
            } catch (error) {
              console.error('Erro ao parsear data:', dateStr, error);
              return { mes: "", ano: "" };
            }
          };
          
          const dataInicio = parseDate(f.DataInicio);
          const dataConclusao = parseDate(f.DataConclusao);
          
          return {
            tipo: f.TipoFormacao || "",
            curso: f.Curso || "",
            instituicao: f.Instituicao || "",
            inicioMes: dataInicio.mes,
            inicioAno: dataInicio.ano,
            fimMes: dataConclusao.mes,
            fimAno: dataConclusao.ano
          };
        }),
        cep: address?.Cep || "",
        rua: address?.Rua || "",
        numero: address?.Numero || "",
        complemento: address?.Complemento || "",
        bairro: address?.Bairro || "",
        cidade: address?.Cidade || "",
        estado: address?.Estado || "",
        chavePix: user.PessoalJuridica?.DadosBancarios?.ChavePix || "",
        descricaoExtenso: ""
      });
    }
  }, [psicologo, initialData]);

  // Função para calcular o percentual de preenchimento
  const calcularPercentual = React.useCallback((): number => {
    let camposPreenchidos = 0;
    
    // Verifica se é Autônomo
    const tipoPessoaJuridico = psicologo?.user?.[0]?.ProfessionalProfiles?.[0]?.TipoPessoaJuridico;
    const tiposArray = Array.isArray(tipoPessoaJuridico) 
      ? tipoPessoaJuridico 
      : tipoPessoaJuridico 
        ? [tipoPessoaJuridico] 
        : [];
    const isAutonomo = tiposArray.some((t: string) => t === "Autonomo") && 
      !tiposArray.some((t: string) => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");
    const isPJ = !isAutonomo && tiposArray.some((t: string) => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");
    
    // Percentual base dos campos bloqueados (Nome completo, RG/CPF, CNPJ, Nome Fantasia)
    const percentualBase = 48;
    
    // Contagem correta de campos editáveis (PIX não conta para percentual):
    // Autônomo: 4 (dados pessoais) + 6 (endereço sem complemento) + 1 (sobre mim) + 5 (atendimento) + 1 (formação) = 17 campos
    // PJ: 4 (dados pessoais) + 1 (inscrição municipal) + 7 (endereço com complemento) + 1 (sobre mim) + 5 (atendimento) + 1 (formação) = 19 campos
    const totalCamposEditaveis = isAutonomo ? 17 : 19;

    // Dados pessoais (4 campos - Telefone, Sexo, Pronome, Raça/Cor)
    if (telefoneCompleto && telefoneCompleto.trim() !== "") camposPreenchidos++;
    if (sexo && sexo.trim() !== "") camposPreenchidos++;
    if (pronome && pronome.trim() !== "") camposPreenchidos++;
    if (racaCor && racaCor.trim() !== "") camposPreenchidos++;

    // Dados empresa (1 campo - só conta para PJ)
    if (isPJ && inscricaoMunicipal && inscricaoMunicipal.trim() !== "") camposPreenchidos++;

    // Endereço (6 campos para Autônomo, 7 para PJ - com complemento)
    if (cep && cep.trim() !== "") camposPreenchidos++;
    if (rua && rua.trim() !== "") camposPreenchidos++;
    if (numero && numero.trim() !== "") camposPreenchidos++;
    // Complemento só conta se NÃO for Autônomo
    if (!isAutonomo && complemento && complemento.trim() !== "") camposPreenchidos++;
    if (bairro && bairro.trim() !== "") camposPreenchidos++;
    if (cidade && cidade.trim() !== "") camposPreenchidos++;
    if (estado && estado.trim() !== "") camposPreenchidos++;

    // Sobre mim (1 campo)
    if (sobreMim && sobreMim.trim() !== "") camposPreenchidos++;

    // Atendimento e Experiência (5 campos)
    if (experienciaClinica) camposPreenchidos++;
    if (idiomasSelecionados && idiomasSelecionados.length > 0) camposPreenchidos++;
    if (publicoSelecionado && publicoSelecionado.length > 0) camposPreenchidos++;
    if (abordagensSelecionadas && abordagensSelecionadas.length > 0) camposPreenchidos++;
    if (queixasSelecionadas && queixasSelecionadas.length > 0) camposPreenchidos++;

    // Formação acadêmica (1 campo - pelo menos uma formação completa)
    if (formacoes && formacoes.length > 0) {
      const formacaoCompleta = formacoes.some(f => 
        f.tipo && f.tipo.trim() !== "" &&
        f.curso && f.curso.trim() !== "" &&
        f.instituicao && f.instituicao.trim() !== ""
      );
      if (formacaoCompleta) camposPreenchidos++;
    }

    // Dados bancários (PIX) - NÃO conta para percentual de preenchimento

    // Calcular percentual: 48% base (campos bloqueados) + percentual dos campos editáveis
    // Se todos os campos editáveis estiverem preenchidos = 52% adicional = 100% total
    const percentualAdicional = totalCamposEditaveis > 0 
      ? Math.round((camposPreenchidos / totalCamposEditaveis) * 52)
      : 0;
    
    return Math.min(100, percentualBase + percentualAdicional);
  }, [
    telefoneCompleto, sexo, pronome, racaCor, inscricaoMunicipal,
    cep, rua, numero, complemento, bairro, cidade, estado, sobreMim,
    experienciaClinica, idiomasSelecionados, publicoSelecionado, abordagensSelecionadas,
    queixasSelecionadas, formacoes, psicologo
  ]);

  // Atualizar percentual quando os dados mudarem
  React.useEffect(() => {
    const novoPercentual = calcularPercentual();
    setPercent(novoPercentual);
  }, [calcularPercentual]);

  // Verificar se houve mudanças
  React.useEffect(() => {
    if (!initialData) {
      setHasChanges(false);
      return;
    }

    const currentTelefone = telefoneCompleto ? `${country.dial}${onlyDigits(telefoneCompleto)}` : "";
    const initialTelefone = initialData.telefoneCompleto || "";

    const telefoneChanged = currentTelefone !== initialTelefone || country.code !== initialData.countryCode;
    const currentWhatsapp = whatsappCompleto ? `${countryWhatsapp.dial}${onlyDigits(whatsappCompleto)}` : "";
    const initialWhatsapp = initialData.whatsappCompleto || "";
    const whatsappChanged = currentWhatsapp !== initialWhatsapp || countryWhatsapp.code !== initialData.countryWhatsappCode;
    const sexoChanged = sexo !== initialData.sexo;
    const pronomeChanged = pronome !== initialData.pronome;
    const racaCorChanged = racaCor !== initialData.racaCor;
    const inscricaoChanged = inscricaoMunicipal !== initialData.inscricaoMunicipal;
    const sobreMimChanged = sobreMim !== initialData.sobreMim;
    const experienciaChanged = experienciaClinica !== initialData.experienciaClinica;
    const idiomasChanged = JSON.stringify(idiomasSelecionados.map(i => i.value).sort()) !== JSON.stringify((initialData.idiomas as string[])?.sort() || []);
    const publicoChanged = JSON.stringify(publicoSelecionado.map(p => p.value).sort()) !== JSON.stringify((initialData.publico as string[])?.sort() || []);
    const abordagensChanged = JSON.stringify(abordagensSelecionadas.map(a => a.value).sort()) !== JSON.stringify((initialData.abordagens as string[])?.sort() || []);
    const queixasChanged = JSON.stringify(queixasSelecionadas.map(q => q.value).sort()) !== JSON.stringify((initialData.queixas as string[])?.sort() || []);
    const formacoesChanged = JSON.stringify(formacoes) !== JSON.stringify(initialData.formacoes);
    const cepChanged = cep !== initialData.cep;
    const ruaChanged = rua !== initialData.rua;
    const numeroChanged = numero !== initialData.numero;
    const complementoChanged = complemento !== initialData.complemento;
    const bairroChanged = bairro !== initialData.bairro;
    const cidadeChanged = cidade !== initialData.cidade;
    const estadoChanged = estado !== initialData.estado;
    const chavePixChanged = chavePix !== initialData.chavePix;

    setHasChanges(
      telefoneChanged || whatsappChanged || sexoChanged || pronomeChanged || racaCorChanged ||  
      inscricaoChanged || sobreMimChanged || experienciaChanged || idiomasChanged || 
      publicoChanged || abordagensChanged || queixasChanged || formacoesChanged ||
      cepChanged || ruaChanged || numeroChanged || complementoChanged ||
      bairroChanged || cidadeChanged || estadoChanged || chavePixChanged
    );
  }, [
    telefoneCompleto, country, whatsappCompleto, countryWhatsapp, sexo, pronome, racaCor, inscricaoMunicipal, sobreMim,
    experienciaClinica, idiomasSelecionados, publicoSelecionado, abordagensSelecionadas,
    queixasSelecionadas, formacoes, cep, rua, numero, complemento, bairro, cidade,
    estado, chavePix, initialData
  ]);

  // Fecha dropdown de país ao clicar fora
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

  // Intercepta botão voltar do navegador para mostrar modal customizado
  React.useEffect(() => {
    if (!hasChanges) return;

    const handlePopState = () => {
      // Previne a navegação padrão adicionando o estado novamente
      window.history.pushState(null, '', window.location.href);
      // Mostra o modal customizado
      setShowLeaveModal(true);
    };

    // Adiciona um estado ao histórico para poder interceptar o botão voltar
    window.history.pushState(null, '', window.location.href);
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasChanges]);

  // Intercepta clique no botão voltar
  function handleBack(e?: React.MouseEvent<HTMLButtonElement>) {
    e?.preventDefault();
    if (hasChanges) {
      setShowLeaveModal(true);
    } else {
      router.back(); 
    }
  }

  // Função para realmente sair (descartar alterações)
  function confirmLeave() {
    setShowLeaveModal(false);
    // Navega de volta - o window.history.back() remove automaticamente o estado extra
    window.history.back();
  }

  function handleAddFormacao() {
    setFormacoes([
      ...formacoes,
      { tipo: "", curso: "", instituicao: "", inicioMes: "", inicioAno: "", fimMes: "", fimAno: "" }
    ]);
  }

  const { mutate: deleteFormacao, isPending: isDeletingFormacao } = useDeletePsicologo();

  function handleRemoveFormacao(idx: number) {
    const formacaoId = psicologo?.user?.[0]?.ProfessionalProfiles?.[0]?.Formacoes?.[idx]?.Id;
    if (formacaoId) {
      deleteFormacao(formacaoId, {
        onSuccess: () => {
          refetch();
        }
      });
    } else {
      // Remove do estado local se não tiver id
      setFormacoes(formacoes.filter((_, i) => i !== idx));
    }
  }

  function handleChangeFormacao(idx: number, field: string, value: string) {
    setFormacoes(formacoes.map((f, i) =>
      i === idx ? { ...f, [field]: value } : f
    ));
  }

  function handleChavePixChange(value: string) {
    setChavePix(value);
    const error = validateChavePix(value);
    setChavePixError(error);
  }

  // Monta opções dos selects a partir dos enums
  const ABORDAGEM_OPTIONS = (enums?.perfilProfissional?.abordagem || []).map((a: string) => ({
    value: a,
    label: normalizeEnum(a)
  }));
  const QUEIXA_OPTIONS = (enums?.perfilProfissional?.queixa || []).map((q: string) => ({
    value: q,
    label: normalizeEnum(q)
  }));
  const IDIOMAS_OPTIONS = (enums?.perfilProfissional?.languages || []).map((i: string) => ({
    value: i,
    label: i
  }));
  const PRONOMES_OPTIONS = (enums?.usuario?.pronome || []).map((p: string) => ({
    value: p,
    label: p
  }));
  const PUBLICO_OPTIONS = (enums?.perfilProfissional?.tipoAtendimento || []).map((p: string) => ({
    value: p,
    label: p
  }));
  const EXPERIENCIA_CLINICA_OPTIONS = (enums?.perfilProfissional?.experienciaClinica || []).map((e: string) => ({
    value: e,
    label: normalizeExperienciaClinica(e)
  }));
  const TIPO_FORMACAO_OPTIONS = (enums?.tipos?.tipoFormacao || []).map((t: string) => ({
    value: t,
    label: t
  }));

  const uploadUserImage = useUploadUserPsicologoImagem();
  const updateUserImage = useUpdateUserPsicologoImagem();
  const [imagemPreview, setImagemPreview] = React.useState<string | null>(null);
  const [imageLoading, setImageLoading] = React.useState(false);

  // Referência para input file
  const inputFileRef = React.useRef<HTMLInputElement>(null);

  // Atualiza o preview da imagem quando o usuário muda ou faz upload
  React.useEffect(() => {
    if (psicologo?.user?.[0]?.Images?.[0]?.Url) {
      setImagemPreview(psicologo.user[0].Images[0].Url);
    } else {
      setImagemPreview(null);
    }
  }, [psicologo]);

  // Handler para abrir seletor de arquivos
  function handleEscolherArquivo() {
    inputFileRef.current?.click();
  }

  // Handler para selecionar arquivo da biblioteca
  function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImagemPreview(URL.createObjectURL(file));
    setImageLoading(true);
    setShowPhotoModal(false);

    const user = psicologo?.user?.[0];
    const existingImage = user?.Images?.[0];

    // Atualiza imagem existente ou faz upload de nova imagem
    if (existingImage?.UserId && existingImage?.Id) {
      updateUserImage.mutate(
        { imageId: existingImage.Id, file },
        {
          onSuccess: async () => {
            toast.success('Imagem atualizada com sucesso!');
            await refetch();
            setImageLoading(false);
          },
          onError: () => {
            toast.error('Erro ao atualizar imagem.');
            setImageLoading(false);
          }
        }
      );
    } else {
      uploadUserImage.mutate(
        file,
        {
          onSuccess: async () => {
            toast.success('Imagem adicionada com sucesso!');
            await refetch();
            setImageLoading(false);
          },
          onError: () => {
            toast.error('Erro ao adicionar imagem.');
            setImageLoading(false);
          }
        }
      );
    }
  }

  // Handler para tirar foto (usando input file com capture)
  function handleTirarFoto() {
    inputFileRef.current?.setAttribute('capture', 'user');
    inputFileRef.current?.click();
  }

  const { mutate: updatePsicologo, isPending: isSavingPerfil } = useUpdateUserPsicologo();

  function handleSalvarPerfil(e: React.FormEvent) {
    e.preventDefault();

    // Valida Chave PIX antes de salvar
    if (chavePix && chavePix.trim() !== "") {
      const pixError = validateChavePix(chavePix);
      if (pixError) {
        setChavePixError(pixError);
        toast.error(pixError);
        return;
      }
    }

    // Monta objeto para envio (ajuste conforme necessário)
    const user = psicologo?.user?.[0];
    const profile = user?.ProfessionalProfiles?.[0];

    // Verifica se é Pessoa Jurídica ou Autônomo
    const tipoPessoa = profile?.TipoPessoaJuridico;
    const tipoPessoaArray = Array.isArray(tipoPessoa) ? tipoPessoa : tipoPessoa ? [tipoPessoa] : [];
    const isPJ = tipoPessoaArray.some((t: string) => t === "Juridico" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");
    const isAutonomo = tipoPessoaArray.some((t: string) => t === "Autonomo" || t === "PjAutonomo");

    // PessoalJuridica: enviar apenas se for PJ (não autônomo)
    // Para autônomo, o PIX será salvo via ProfessionalProfile
    const temPix = chavePix && chavePix.trim() !== "";
    const pessoalJuridica: PessoalJuridica | undefined = (isPJ && !isAutonomo) ? {
      InscricaoEstadual: inscricaoMunicipal || (user?.PessoalJuridica?.InscricaoEstadual ?? ""),
      SimplesNacional: user?.PessoalJuridica?.SimplesNacional ?? false,
      RazaoSocial: nomeRazao || (user?.PessoalJuridica?.RazaoSocial ?? ""),
      NomeFantasia: nomeFantasia || (user?.PessoalJuridica?.NomeFantasia ?? ""),
      CNPJ: cnpj || (user?.PessoalJuridica?.CNPJ ?? ""),
      ...(temPix && {
        DadosBancarios: {
          ChavePix: chavePix,
        }
      })
    } : undefined;

    const dados: Partial<updatePsicologo> = {
      Nome: user?.Nome || "",
      Email: user?.Email || "",
      Cpf: cpf || user?.Cpf || "",
      Telefone: telefoneCompleto ? `${country.dial}${onlyDigits(telefoneCompleto)}` : user?.Telefone || "",
      WhatsApp: whatsappCompleto ? `${countryWhatsapp.dial}${onlyDigits(whatsappCompleto)}` : (user as Psicologo & { WhatsApp?: string })?.WhatsApp || "",
      DataNascimento: user?.DataNascimento || "",
      Sexo: sexo,
      Pronome: pronome,
      RacaCor: racaCor && racaCor.trim() !== "" ? racaCor : undefined,
      Rg: user?.Rg || "",
      Address: [{
        Rua: rua,
        Numero: numero,
        Bairro: bairro,
        Cidade: cidade,
        Estado: estado,
        Cep: cep,
        Complemento: complemento,
      }] as AddressUpdate[],
      ...(pessoalJuridica && { PessoalJuridica: pessoalJuridica }),
      ProfessionalProfiles: [
        {
          TipoPessoaJuridico: (() => {
            const tipoPessoa = profile?.TipoPessoaJuridico;
            return Array.isArray(tipoPessoa) ? tipoPessoa : tipoPessoa ? [tipoPessoa] : [];
          })(),
          TipoAtendimento: publicoSelecionado.map(p => p.value),
          ExperienciaClinica: experienciaClinica || "",
          Idiomas: idiomasSelecionados.map(i => i.value),
          SobreMim: sobreMim,
          Abordagens: abordagensSelecionadas.map(a => a.value),
          Queixas: queixasSelecionadas.map(q => q.value),
          Formacoes: formacoes
            .filter(formacao => {
              // Filtra apenas formações com dados mínimos válidos
              return formacao.tipo && formacao.tipo.trim() !== "" &&
                     formacao.instituicao && formacao.instituicao.trim() !== "" &&
                     formacao.curso && formacao.curso.trim() !== "" &&
                     formacao.inicioMes && formacao.inicioAno;
            })
            .map((formacao, idx) => {
              // Busca a formação existente pelo índice ou pelo tipo/instituição/curso
              const formacoesArray = (profile?.Formacoes || []) as FormacaoApi[];
              const formacaoExistente = formacoesArray.find((f: FormacaoApi) => 
                f.TipoFormacao === formacao.tipo &&
                f.Instituicao === formacao.instituicao &&
                f.Curso === formacao.curso
              ) || formacoesArray[idx];
              
              return {
                ...(formacaoExistente?.Id ? { Id: formacaoExistente.Id } : {}),
                TipoFormacao: formacao.tipo.trim(),
                Instituicao: formacao.instituicao.trim(),
                Curso: formacao.curso.trim(),
                DataInicio: `${formacao.inicioMes}/${formacao.inicioAno}`,
                DataConclusao: formacao.fimMes && formacao.fimAno
                  ? `${formacao.fimMes}/${formacao.fimAno}`
                  : "",
                Status: formacaoExistente?.Status || "EmAndamento"
              };
            }),
          // Adiciona DadosBancarios se for autônomo e houver PIX
          ...(isAutonomo && temPix ? {
            DadosBancarios: {
              ChavePix: chavePix,
            }
          } : {})
        }
      ]
    };

    console.log("[handleSalvarPerfil] Iniciando salvamento do perfil");
    console.log("[handleSalvarPerfil] Dados a serem enviados:", JSON.stringify(dados, null, 2));

    updatePsicologo(dados, {
      onSuccess: async () => {
        console.log("[handleSalvarPerfil] Perfil atualizado com sucesso!");
        toast.success("Perfil atualizado com sucesso!");
        // Forçar refetch para buscar dados atualizados do servidor (sem usar cache)
        // O backend já atualiza o Status automaticamente quando atinge 100%
        const { data: updatedData } = await refetch();
        // Se o refetch retornou dados, atualizar o estado imediatamente
        if (updatedData && updatedData.user && updatedData.user.length > 0) {
          // Os useEffects que dependem de 'psicologo' serão executados automaticamente
          // Aguardar um pouco para garantir que os useEffects foram executados
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        // Resetar dados iniciais após salvar e refetch
        setInitialData(null);
        setHasChanges(false);
        // Redireciona para a página de agenda após salvar com sucesso
        setTimeout(() => {
          router.push("/painel-psicologo/agenda");
        }, 1000);
      },
      onError: (error: ApiError) => {
        console.error("[handleSalvarPerfil] ERRO ao atualizar perfil:");
        console.error("  - Erro completo:", error);
        console.error("  - Response:", error?.response);
        console.error("  - Response data:", error?.response?.data);
        console.error("  - Response status:", error?.response?.status);
        console.error("  - Message:", error?.message);
        
        // Extrai mensagem de erro mais específica
        let errorMessage = "Erro ao atualizar seu perfil. Tente mais tarde!";
        
        if (error?.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        // Log adicional para desenvolvimento
        if (process.env.NODE_ENV === 'development' && error?.response?.data?.details) {
          console.error("  - Detalhes do erro:", error.response.data.details);
        }
        
        toast.error(errorMessage);
      }
    });
  }

  // Adicione o componente ProgressCircle
  function ProgressCircle({ percent }: { percent: number }) {
    const radius = 16;
    const stroke = 4;
    const normalizedRadius = radius - stroke / 2;
    const circumference = 2 * Math.PI * normalizedRadius;
    const offset = circumference - (percent / 100) * circumference;

    return (
      <svg width={40} height={40}>
        <circle
          stroke="#E3E4F3"
          fill="none"
          strokeWidth={stroke}
          cx={20}
          cy={20}
          r={normalizedRadius}
        />
        <circle
          stroke="#8494E9"
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          cx={20}
          cy={20}
          r={normalizedRadius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s" }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy="0.35em"
          className="fill-[#49525A] text-[13px] font-semibold"
        >
          {percent}%
        </text>
      </svg>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7FB] font-sans flex justify-center">
      <div className="w-full max-w-7xl flex">
        {/* Sidebar alinhado ao topo e à esquerda */}
        <div className="hidden md:flex flex-col">
          <SidebarPsicologo />
        </div>
        <main className="flex-1 px-0 py-0 bg-[#F7F7FB] w-full">
          {/* Modal de sair/descartar alterações */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={showLeaveModal ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 z-50 flex items-center justify-center bg-transparent ${showLeaveModal ? "" : "pointer-events-none"}`}
            style={{ display: showLeaveModal ? "flex" : "none" }}
          >
            <div className="w-[90vw] max-w-[902px] min-h-[384px] bg-white rounded-lg flex flex-col shadow-lg relative">
              {/* Header */}
              <div className="w-full rounded-t-lg bg-[#8494E9] px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
                <span className="text-white text-lg font-semibold text-center w-full">
                  Deseja descartar alterações?
                </span>
                <button
                  className="absolute right-8 top-5 text-white text-2xl font-bold focus:outline-none"
                  onClick={() => setShowLeaveModal(false)}
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>
              {/* Conteúdo */}
              <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6 sm:py-8">
                <span className="text-[#23253A] text-sm sm:text-base font-semibold mb-2 text-center">
                  Atenção!
                </span>
                <span className="text-[#49525A] text-sm sm:text-base text-center mb-6 sm:mb-8">
                  Caso saia dessa tela, todas as informações inseridas serão apagadas
                </span>
                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center px-4">
                  <button
                    className="flex-1 h-12 rounded-lg px-6 flex items-center justify-center bg-white border border-[#606C76] text-[#8494E9] text-base font-medium hover:bg-[#F0F1FA] transition"
                    onClick={() => setShowLeaveModal(false)}
                    type="button"
                  >
                    Não, continuar no meu perfil
                  </button>
                  <button
                    className="flex-1 h-12 rounded-lg px-6 flex items-center justify-center bg-[#8494E9] text-white text-base font-medium hover:bg-[#6D75C0] transition"
                    onClick={confirmLeave}
                    type="button"
                  >
                    Sim, descartar alterações
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
          {/* Modal de inserir foto */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={showPhotoModal ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 z-50 flex items-center justify-center bg-transparent ${showPhotoModal ? "" : "pointer-events-none"}`}
            style={{ display: showPhotoModal ? "flex" : "none" }}
          >
            <div className="w-[90vw] max-w-[902px] min-h-[498px] bg-[#8494E9] rounded-lg flex flex-col shadow-lg relative">
              {/* Header */}
              <div className="w-full rounded-t-lg bg-[#8494E9] px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
                <span className="text-white text-base sm:text-lg font-semibold text-center w-full">
                  Inserir foto no perfil
                </span>
                <button
                  className="absolute right-4 sm:right-8 top-4 sm:top-5 text-white text-2xl font-bold focus:outline-none"
                  onClick={() => setShowPhotoModal(false)}
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>
              {/* Conteúdo */}
              <div className="flex-1 flex flex-col sm:flex-row items-center justify-center bg-white rounded-b-lg px-4 sm:px-8 py-6 sm:py-8 gap-6 sm:gap-8">
                {/* Avatar à esquerda */}
                <div className="flex flex-col items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-4 border-[#606C76] overflow-hidden mb-2 bg-white">
                    <Image
                      src={imagemPreview || psicologo?.user?.[0]?.Images?.[0]?.Url || "/assets/Profile.svg"}
                      alt="Avatar"
                      width={128}
                      height={128}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
                {/* Texto e botões à direita */}
                <div className="flex-1 flex flex-col justify-center h-full">
                  <span className="font-semibold text-[#23253A] text-base mb-1 text-left">
                    Adicione uma foto clara e visível ao seu perfil
                  </span>
                  <span className="text-[#49525A] text-sm mb-1 text-left">
                    Ter uma foto no perfil ajuda os pacientes a reconhecerem você com mais facilidade e transmite confiança e profissionalismo.
                  </span>
                  <span className="text-[#49525A] text-sm mb-4 text-left">
                    Escolha uma imagem nítida e atual sua, isso garante uma experiência ainda mais segura para você e seus pacientes.
                  </span>
                  <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-8">
                    <button
                      className="flex-1 flex flex-col items-center justify-center border-2 border-[#606C76] rounded-lg py-4 px-6 bg-white hover:bg-[#F0F1FA] transition text-[#23253A] text-base font-medium"
                      type="button"
                      onClick={handleTirarFoto}
                      disabled={imageLoading || uploadUserImage.isPending || updateUserImage.isPending}
                    >
                      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" className="mb-2">
                        <rect x="3" y="7" width="18" height="12" rx="2" stroke="#8494E9" strokeWidth="2"/>
                        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="#8494E9" strokeWidth="2"/>
                        <circle cx="12" cy="13" r="3" stroke="#8494E9" strokeWidth="2"/>
                      </svg>
                      {(imageLoading || uploadUserImage.isPending || updateUserImage.isPending) ? "Enviando..." : "Tirar foto"}
                    </button>
                    <button
                      className="flex-1 flex flex-col items-center justify-center border-2 border-[#606C76] rounded-lg py-4 px-6 bg-white hover:bg-[#F0F1FA] transition text-[#23253A] text-base font-medium"
                      type="button"
                      onClick={handleEscolherArquivo}
                      disabled={imageLoading || uploadUserImage.isPending || updateUserImage.isPending}
                    >
                      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" className="mb-2">
                        <rect x="3" y="5" width="18" height="14" rx="2" stroke="#8494E9" strokeWidth="2"/>
                        <path d="M8 11l2 2 4-4" stroke="#8494E9" strokeWidth="2"/>
                      </svg>
                      {(imageLoading || uploadUserImage.isPending || updateUserImage.isPending) ? "Enviando..." : "Escolher na biblioteca"}
                    </button>
                    {/* Input file oculto para tirar foto ou escolher arquivo */}
                    <input
                      ref={inputFileRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={e => {
                        // Se for tirar foto ou escolher arquivo, ambos usam o mesmo handler
                        handleArquivoSelecionado(e);
                      }}
                    />
                  </div>
                  <div className="flex w-full gap-4">
                    <button
                      className="flex-1 h-12 rounded-lg px-6 flex items-center justify-center bg-white border border-[#606C76] text-[#8494E9] text-base font-medium hover:bg-[#F0F1FA] transition"
                      onClick={() => setShowPhotoModal(false)}
                      type="button"
                      disabled={imageLoading || uploadUserImage.isPending || updateUserImage.isPending}
                    >
                      Cancelar
                    </button>
                    {/* Não precisa botão salvar, pois já envia ao selecionar */}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          {/* Header topo */}
          <div className="w-full bg-[#F7F7FB] border-b border-[#E3E4F3] py-4">
            <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between relative">
              <BreadcrumbsVoltar 
                onClick={handleBack}
                className="text-[#8494E9]"
              />
              <h1 className="text-lg sm:text-xl font-semibold text-[#23253A] absolute left-1/2 transform -translate-x-1/2">
                Completar perfil
              </h1>
              <div className="flex items-center gap-2">
                <ProgressCircle percent={percent} />
              </div>
            </div>
          </div>

          {/* Avatar e dados principais + Formulário centralizados */}
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-5xl">
              {/* Avatar e dados principais */}
              <div className="flex flex-col items-center bg-[#F7F7FB] pt-6 sm:pt-8 pb-4 px-4">
                <button
                  type="button"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[#606C76] flex items-center justify-center bg-white focus:outline-none overflow-hidden"
                  onClick={() => setShowPhotoModal(true)}
                >
                  <Image
                    src={
                      psicologo?.user?.[0]?.Images?.[0]?.Url ||
                      "/assets/Profile.svg"
                    }
                    alt="Avatar"
                    width={112}
                    height={112}
                    className="rounded-full object-cover w-full h-full"
                    style={{ objectFit: 'cover' }}
                  />
                </button>
                <button
                  className="mt-2 text-[#8494E9] text-xs sm:text-sm flex items-center gap-1 hover:underline"
                  onClick={() => setShowPhotoModal(true)}
                >
                  <FiEdit2 size={14} className="sm:w-4 sm:h-4" /> Alterar foto
                </button>
                <div className="mt-2 text-base sm:text-lg font-medium text-[#23253A] text-center px-2">
                  {psicologo?.user?.[0]?.Nome}
                </div>
                <div className="text-xs sm:text-sm text-[#49525A] text-center px-2 break-all">
                  {psicologo?.user?.[0]?.Email}
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap justify-center px-2">
                  {psicologo?.user?.[0]?.Crp && (
                    <div className="px-4 py-1 rounded-full bg-[#E3E4F3] text-[#8494E9] text-xs font-semibold">
                      {psicologo.user[0].Crp}
                    </div>
                  )}
                  {(isAutonomo || isPessoaJuridica) && (
                    <span className={`px-4 py-1 rounded-full text-xs font-semibold ${
                      isAutonomo 
                        ? "bg-[#EDF3F8] text-[#0A66C2]" 
                        : "bg-[#E3E4F3] text-[#8494E9]"
                    }`}>
                      {isAutonomo ? "Autônomo" : "Pessoa Jurídica"}
                    </span>
                  )}
                </div>
              </div>
              {/* Formulário principal */}
              <form className="w-full flex flex-col gap-4 sm:gap-6 px-4 sm:px-6 pb-32 sm:pb-10 max-w-5xl mx-auto" onSubmit={handleSalvarPerfil}>
                {/* Dados pessoais - Representante legal da empresa e Dados empresa */}
                <div className="bg-white rounded-lg border border-[#E3E4F3] p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 relative">
                  <h2 className="text-base font-semibold text-[#23253A] mb-2">
                    {isPessoaJuridica ? "Dados pessoais - Representante legal da empresa" : "Dados pessoais"}
                  </h2>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs text-[#49525A] mb-1">
                        Nome completo
                      </label>
                      <input
                        type="text"
                        readOnly
                        className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-[#F5F5F5] focus:outline-none cursor-not-allowed"
                        placeholder="Nome completo"
                        value={nomeRazao}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#49525A] mb-1">
                        RG/CPF
                      </label>
                      <input
                        type="text"
                        readOnly
                        className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-[#F5F5F5] focus:outline-none cursor-not-allowed"
                        placeholder="RG/CPF"
                        value={cpf}
                      />
                    </div>
                    <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
                      <div ref={countryBoxRef} className="relative">
                        <label className="block text-xs text-[#49525A] mb-1">
                          Telefone com DDD
                        </label>
                        <div className="flex items-center w-full h-[40px] rounded-[6px] border border-[#606C76] bg-white px-4 py-2 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-[#8494E9]">
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
                          <span className="px-2 text-sm text-[#23253a] border-r border-[#d1d5db]">{country.dial}</span>
                          <input
                            type="text"
                            inputMode="tel"
                            autoComplete="off"
                            placeholder="Telefone com DDD"
                            className="flex-1 bg-transparent outline-none text-sm px-3 text-[#23253a]"
                            value={telefoneCompleto}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const masked = maskTelefoneByCountry(country.code, onlyDigits(e.target.value));
                              setTelefoneCompleto(masked);
                            }}
                          />
                        </div>
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
                                  const rawDigits = onlyDigits(telefoneCompleto);
                                  const masked = maskTelefoneByCountry(c.code, rawDigits);
                                  setTelefoneCompleto(masked);
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
                      <div ref={countryWhatsappBoxRef} className="relative">
                        <label className="block text-xs text-[#49525A] mb-1">
                          WhatsApp
                        </label>
                        <div className="flex items-center w-full h-[40px] rounded-[6px] border border-[#606C76] bg-white px-4 py-2 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-[#8494E9]">
                          <button
                            type="button"
                            onClick={() => setOpenCountryWhatsapp(v => !v)}
                            className="flex items-center gap-2 h-full px-2 rounded-l-[6px] border-r border-[#d1d5db]"
                            aria-haspopup="listbox"
                            aria-expanded={openCountryWhatsapp}
                          >
                            <Image
                              src={getFlagUrl(countryWhatsapp.code)}
                              alt=""
                              width={20}
                              height={20}
                              unoptimized
                              className="w-5 h-5 object-contain"
                            />
                            <span className="text-sm uppercase text-[#23253a]">{countryWhatsapp.code}</span>
                            <span className="text-sm leading-none text-[#d1d5db]">▼</span>
                          </button>
                          <span className="px-2 text-sm text-[#23253a] border-r border-[#d1d5db]">{countryWhatsapp.dial}</span>
                          <input
                            type="text"
                            inputMode="tel"
                            autoComplete="off"
                            placeholder="WhatsApp"
                            className="flex-1 bg-transparent outline-none text-sm px-3 text-[#23253a]"
                            value={whatsappCompleto}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const masked = maskTelefoneByCountry(countryWhatsapp.code, onlyDigits(e.target.value));
                              setWhatsappCompleto(masked);
                            }}
                          />
                        </div>
                        {openCountryWhatsapp && (
                          <ul
                            role="listbox"
                            className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white border border-[#e2e8f0] rounded-md shadow"
                          >
                            {PHONE_COUNTRIES.map((c) => (
                              <li
                                key={c.code}
                                role="option"
                                aria-selected={countryWhatsapp.code === c.code}
                                onClick={() => {
                                  setCountryWhatsapp(c);
                                  const rawDigits = onlyDigits(whatsappCompleto);
                                  const masked = maskTelefoneByCountry(c.code, rawDigits);
                                  setWhatsappCompleto(masked);
                                  setOpenCountryWhatsapp(false);
                                }}
                                className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#f3f4f6] ${countryWhatsapp.code === c.code ? "bg-[#eef2ff]" : ""}`}
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
                    </div>
                    <div className="flex flex-col md:grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-[#49525A] mb-1">
                          Gênero
                      </label>
                      <select
                        className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-white focus:outline-none"
                        value={sexo}
                        onChange={(e) => setSexo(e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outro">Outro</option>
                        <option value="PrefiroNaoInformar">Prefiro não informar</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#49525A] mb-1">
                        Como gostaria de ser tratado(a)?
                      </label>
                      <select
                        className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-white focus:outline-none"
                        value={pronome}
                        onChange={(e) => setPronome(e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {PRONOMES_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                      <div>
                        <label className="block text-xs text-[#49525A] mb-1">
                          Qual raça / Cor você se autodeclara?
                        </label>
                        <select
                          className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-white focus:outline-none"
                          value={racaCor}
                          onChange={(e) => setRacaCor(e.target.value)}
                        >
                          <option value="">Selecione...</option>
                          <option value="Branca">Branca</option>
                          <option value="Preta">Preta</option>
                          <option value="Parda">Parda</option>
                          <option value="Amarela">Amarela</option>
                          <option value="Indigena">Indígena</option>
                          <option value="PrefiroNaoInformar">Prefiro não informar</option>
                        </select>
                  </div>
                    </div>
                  </div>

                  {isPessoaJuridica && (
                    <div className="border-t border-[#E3E4F3] pt-6 mt-2">
                      <h2 className="text-base font-semibold text-[#23253A] mb-2">
                        Dados empresa
                      </h2>
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-[#49525A] mb-1 flex items-center gap-1">
                              Inscrição Municipal*
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="cursor-help">
                                <circle cx="8" cy="8" r="7" stroke="#8494E9" strokeWidth="1.5"/>
                                <path d="M8 6V10M8 4V4.01" stroke="#8494E9" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </label>
                            <input
                              type="text"
                              className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-white focus:outline-none"
                              placeholder="Inscrição Municipal*"
                              value={inscricaoMunicipal}
                              onChange={(e) => setInscricaoMunicipal(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#49525A] mb-1">
                              CNPJ
                            </label>
                            <input
                              type="text"
                              readOnly
                              className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-[#F5F5F5] focus:outline-none cursor-not-allowed"
                              placeholder="00.000.000/0000-00"
                              value={cnpj}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-[#49525A] mb-1">
                            Nome fantasia
                          </label>
                          <input
                            type="text"
                            readOnly
                            className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-[#F5F5F5] focus:outline-none cursor-not-allowed"
                            placeholder="Nome fantasia"
                            value={nomeFantasia}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-[#E3E4F3] pt-6 mt-2">
                    <h2 className="text-base font-semibold text-[#23253A] mb-2">
                      Endereço
                    </h2>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col md:grid md:grid-cols-12 gap-4">
                        <div className="md:col-span-3">
                          <label className="block text-xs text-[#49525A] mb-1">
                            CEP
                          </label>
                          <input
                            type="text"
                            className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-white focus:outline-none"
                            placeholder="00000-000"
                            value={cep}
                            onChange={(e) => setCep(e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-9">
                          <label className="block text-xs text-[#49525A] mb-1">
                            Endereço
                          </label>
                          <input
                            type="text"
                            className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-white focus:outline-none"
                            placeholder="Rua Leaping"
                            value={rua}
                            onChange={(e) => setRua(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-[#49525A] mb-1">
                            Número
                          </label>
                          <input
                            type="text"
                            className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-white focus:outline-none"
                            placeholder="000"
                            value={numero}
                            onChange={(e) => setNumero(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#49525A] mb-1">
                            Complemento
                          </label>
                          <input
                            type="text"
                            className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-white focus:outline-none"
                            placeholder="CASA"
                            value={complemento}
                            onChange={(e) => setComplemento(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col md:grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-[#49525A] mb-1">
                            Bairro
                          </label>
                          <input
                            type="text"
                            className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-white focus:outline-none"
                            placeholder="Bairro"
                            value={bairro}
                            onChange={(e) => setBairro(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#49525A] mb-1">
                            Cidade
                          </label>
                          <input
                            type="text"
                            className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-white focus:outline-none"
                            placeholder="São Paulo"
                            value={cidade}
                            onChange={(e) => setCidade(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#49525A] mb-1">
                            Estado
                          </label>
                          <select
                            className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-white focus:outline-none"
                            value={estado}
                            onChange={(e) => setEstado(e.target.value)}
                          >
                            <option value="">Selecione...</option>
                            <option value="AC">Acre</option>
                            <option value="AL">Alagoas</option>
                            <option value="AP">Amapá</option>
                            <option value="AM">Amazonas</option>
                            <option value="BA">Bahia</option>
                            <option value="CE">Ceará</option>
                            <option value="DF">Distrito Federal</option>
                            <option value="ES">Espírito Santo</option>
                            <option value="GO">Goiás</option>
                            <option value="MA">Maranhão</option>
                            <option value="MT">Mato Grosso</option>
                            <option value="MS">Mato Grosso do Sul</option>
                            <option value="MG">Minas Gerais</option>
                            <option value="PA">Pará</option>
                            <option value="PB">Paraíba</option>
                            <option value="PR">Paraná</option>
                            <option value="PE">Pernambuco</option>
                            <option value="PI">Piauí</option>
                            <option value="RJ">Rio de Janeiro</option>
                            <option value="RN">Rio Grande do Norte</option>
                            <option value="RS">Rio Grande do Sul</option>
                            <option value="RO">Rondônia</option>
                            <option value="RR">Roraima</option>
                            <option value="SC">Santa Catarina</option>
                            <option value="SP">São Paulo</option>
                            <option value="SE">Sergipe</option>
                            <option value="TO">Tocantins</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#E3E4F3] pt-6 mt-2">
                    <h2 className="text-base font-semibold text-[#23253A] mb-2">
                      Sobre mim
                    </h2>
                  <div>
                    <label className="block text-xs text-[#49525A] mb-1">Sobre mim</label>
                    <textarea
                      className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-white focus:outline-none resize-none"
                        rows={5}
                      maxLength={SOBRE_MIM_MAX}
                        placeholder="Escreva aqui um pouco sobre você!"
                      value={sobreMim}
                      onChange={e => setSobreMim(e.target.value)}
                    />
                    <div className="text-right text-xs text-[#49525A] mt-1">
                        {sobreMim.length}/{String(SOBRE_MIM_MAX).padStart(3, '0')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formação acadêmica e Atendimento/Experiência */}
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Formação acadêmica */}
                  <div className="flex-1 bg-white rounded-lg border border-[#E3E4F3] p-4 sm:p-6 flex flex-col gap-4 relative">
                    <h2 className="text-base font-semibold text-[#23253A] mb-2">
                      Formação acadêmica
                    </h2>
                    {formacoes.map((formacao, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && <hr className="my-4 border-[#E3E4F3]" />}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-[#23253A]">
                            Formação Acadêmica {idx + 1}
                          </span>
                          <button
                            type="button"
                            className="flex items-center gap-1 text-red-500 text-xs font-medium hover:text-red-700 transition"
                            onClick={() => handleRemoveFormacao(idx)}
                            disabled={isDeletingFormacao}
                            title="Remover formação"
                          >
                            {isDeletingFormacao ? (
                              <span>Removendo...</span>
                            ) : (
                              <svg 
                                width="16" 
                                height="16" 
                                viewBox="0 0 16 16" 
                                fill="none" 
                                xmlns="http://www.w3.org/2000/svg"
                                className="cursor-pointer"
                              >
                                <path 
                                  d="M12 4L4 12M4 4L12 12" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  strokeLinecap="round"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="flex flex-col gap-4">
                          <div>
                            <label className="block text-xs text-[#49525A] mb-1">
                              Tipo de formação
                            </label>
                            <select
                              className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-white focus:outline-none"
                              value={formacao.tipo}
                              onChange={e => handleChangeFormacao(idx, "tipo", e.target.value)}
                            >
                              <option value="">Selecione...</option>
                              {TIPO_FORMACAO_OPTIONS.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-[#49525A] mb-1">Curso</label>
                            <input
                              className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-white"
                              placeholder="Ex: Psicologia"
                              value={formacao.curso}
                              onChange={e => handleChangeFormacao(idx, "curso", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#49525A] mb-1">
                              Instituição de ensino
                            </label>
                            <input
                              className="w-full border border-[#606C76] rounded px-3 py-2 text-sm bg-white"
                              placeholder="Ex: Universidade de São Paulo"
                              value={formacao.instituicao}
                              onChange={e => handleChangeFormacao(idx, "instituicao", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#49525A] mb-1">
                              Data de início
                            </label>
                            <div className="flex gap-2">
                              <select
                                className="w-1/2 border border-[#606C76] rounded px-3 py-2 text-sm bg-white"
                                value={formacao.inicioMes}
                                onChange={e => handleChangeFormacao(idx, "inicioMes", e.target.value)}
                              >
                                <option value="">Mês</option>
                                {MESES.map((mes) => (
                                  <option key={mes.value} value={mes.value}>{mes.label}</option>
                                ))}
                              </select>
                              <select
                                className="w-1/2 border border-[#606C76] rounded px-3 py-2 text-sm bg-white"
                                value={formacao.inicioAno}
                                onChange={e => handleChangeFormacao(idx, "inicioAno", e.target.value)}
                              >
                                <option value="">Ano</option>
                                {ANOS.map(ano => (
                                  <option key={ano} value={ano}>{ano}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-[#49525A] mb-1">
                              Data de término
                            </label>
                            <div className="flex gap-2">
                              <select
                                className="w-1/2 border border-[#606C76] rounded px-3 py-2 text-sm bg-white"
                                value={formacao.fimMes}
                                onChange={e => handleChangeFormacao(idx, "fimMes", e.target.value)}
                              >
                                <option value="">Mês</option>
                                {MESES.map((mes) => (
                                  <option key={mes.value} value={mes.value}>{mes.label}</option>
                                ))}
                              </select>
                              <select
                                className="w-1/2 border border-[#606C76] rounded px-3 py-2 text-sm bg-white"
                                value={formacao.fimAno}
                                onChange={e => handleChangeFormacao(idx, "fimAno", e.target.value)}
                              >
                                <option value="">Ano</option>
                                {ANOS.map(ano => (
                                  <option key={ano} value={ano}>{ano}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                    <button
                      type="button"
                      className="mt-2 flex items-center gap-2 text-[#8494E9] text-sm font-medium hover:underline"
                      onClick={handleAddFormacao}
                    >
                      <span className="text-xl">+</span> Adicionar formação
                    </button>
                  </div>
                  {/* Atendimento e Experiência */}
                  <div className="flex-1 bg-white rounded-lg border border-[#E3E4F3] p-4 sm:p-6 flex flex-col gap-4 relative">
                    <h2 className="text-base font-semibold text-[#23253A] mb-2">
                      Atendimento e Experiência profissional
                    </h2>
                    <div>
                      <label className="block text-xs text-[#49525A] mb-1">
                        Tempo de experiência clínica
                      </label>
                      <Select
                        options={EXPERIENCIA_CLINICA_OPTIONS}
                        value={experienciaClinica 
                          ? { value: experienciaClinica, label: normalizeExperienciaClinica(experienciaClinica) }
                          : null
                        }
                        onChange={(option) => setExperienciaClinica((option as { value: string; label: string } | null)?.value || null)}
                        placeholder="Selecione..."
                        isClearable
                        classNamePrefix="react-select"
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: "#606C76",
                            minHeight: "38px",
                            fontSize: "0.95rem"
                          }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isSelected ? "#8494E9" : state.isFocused ? "#F0F1FA" : "#fff",
                            color: "#23253A"
                          })
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#49525A] mb-1">Idiomas</label>
                      <Select
                        isMulti
                        isSearchable
                        options={IDIOMAS_OPTIONS}
                        value={idiomasSelecionados}
                        onChange={newValue => setIdiomasSelecionados(Array.isArray(newValue) ? [...newValue] : [])}
                        placeholder="Selecione um ou mais idiomas"
                        classNamePrefix="react-select"
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: "#606C76",
                            minHeight: "38px",
                            fontSize: "0.95rem"
                          }),
                          multiValue: (base) => ({
                            ...base,
                            backgroundColor: "#E3E4F3",
                            color: "#23253A"
                          }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isSelected ? "#8494E9" : state.isFocused ? "#F0F1FA" : "#fff",
                            color: "#23253A"
                          })
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#49525A] mb-1">
                        Qual(is) público(s) você atende?
                      </label>
                      <Select
                        isMulti
                        isSearchable
                        options={PUBLICO_OPTIONS}
                        value={publicoSelecionado}
                        onChange={newValue => setPublicoSelecionado(Array.isArray(newValue) ? [...newValue] : [])}
                        placeholder="Selecione um ou mais públicos"
                        classNamePrefix="react-select"
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: "#606C76",
                            minHeight: "38px",
                            fontSize: "0.95rem"
                          }),
                          multiValue: (base) => ({
                            ...base,
                            backgroundColor: "#E3E4F3",
                            color: "#23253A"
                          }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isSelected ? "#8494E9" : state.isFocused ? "#F0F1FA" : "#fff",
                            color: "#23253A"
                          })
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#49525A] mb-1">Abordagens</label>
                      <Select
                        isMulti
                        isSearchable
                        options={ABORDAGEM_OPTIONS}
                        value={abordagensSelecionadas.map(opt => {
                          const found = ABORDAGEM_OPTIONS.find(o => o.value === opt.value);
                          return found ?? { value: opt.value, label: normalizeEnum(opt.value) };
                        })}
                        onChange={newValue => setAbordagensSelecionadas(Array.isArray(newValue) ? [...newValue] : [])}
                        placeholder="Selecione uma ou mais abordagens"
                        classNamePrefix="react-select"
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: "#606C76",
                            minHeight: "38px",
                            fontSize: "0.95rem"
                          }),
                          multiValue: (base) => ({
                            ...base,
                            backgroundColor: "#E3E4F3",
                            color: "#23253A"
                          }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isSelected ? "#8494E9" : state.isFocused ? "#F0F1FA" : "#fff",
                            color: "#23253A"
                          })
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#49525A] mb-1">
                        Queixas e sintomas
                      </label>
                      <Select
                        isMulti
                        isSearchable
                        options={QUEIXA_OPTIONS}
                        value={queixasSelecionadas.map(opt => {
                          const found = QUEIXA_OPTIONS.find(o => o.value === opt.value);
                          return found ?? { value: opt.value, label: normalizeEnum(opt.value) };
                        })}
                        onChange={newValue => setQueixasSelecionadas(Array.isArray(newValue) ? [...newValue] : [])}
                        placeholder="Selecione uma ou mais queixas/sintomas"
                        classNamePrefix="react-select"
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: "#606C76",
                            minHeight: "38px",
                            fontSize: "0.95rem"
                          }),
                          multiValue: (base) => ({
                            ...base,
                            backgroundColor: "#E3E4F3",
                            color: "#23253A"
                          }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isSelected ? "#8494E9" : state.isFocused ? "#F0F1FA" : "#fff",
                            color: "#23253A"
                          })
                        }}
                      />
                    </div>
                  </div>
                </div>
                {/* Card de Dados Bancários */}
                <div className="bg-white rounded-lg border border-[#E3E4F3] p-4 sm:p-6 flex flex-col gap-4 relative mb-4 sm:mb-0">
                  <h2 className="text-base font-semibold text-[#23253A] mb-2">
                    Dados bancários
                  </h2>
                  {/* ALERTA */}
                  <div className="bg-[#FFF9E6] border border-[#FFE066] rounded-lg p-3 sm:p-4 mb-4 flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#FFC107] flex items-center justify-center text-white text-xs font-bold">
                      i
                    </div>
                    <p className="text-xs sm:text-sm text-[#856404] flex-1 leading-relaxed">
                      <span className="font-semibold">Atenção!</span> A Chave PIX deverá ser obrigatoriamente o CPF (caso você seja autônomo atualmente) ou o CNPJ da sua empresa.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-[#49525A] mb-1">Chave Pix</label>
                    <input
                      className={`w-full border rounded px-3 py-2 text-sm bg-white focus:outline-none ${
                        chavePixError 
                          ? "border-red-500 focus:ring-2 focus:ring-red-500" 
                          : "border-[#606C76] focus:ring-2 focus:ring-[#8494E9]"
                      }`}
                      placeholder="Chave Pix"
                      value={chavePix}
                      onChange={(e) => handleChavePixChange(e.target.value)}
                      onBlur={(e) => {
                        const error = validateChavePix(e.target.value);
                        setChavePixError(error);
                      }}
                    />
                    {chavePixError && (
                      <span className="text-xs text-red-500 mt-1 block">{chavePixError}</span>
                    )}
                  </div>
                </div>
                {/* Rodapé */}
                <div className="w-full flex justify-center sm:justify-start mt-6 mb-8 sm:mb-4">
                  <button
                    type="submit"
                    className={`h-12 rounded-lg px-4 sm:px-6 flex items-center justify-center gap-3 text-sm sm:text-base font-medium transition w-full sm:w-auto ${
                      hasChanges && !isSavingPerfil
                        ? "bg-[#8494E9] text-white hover:bg-[#6D75C0]"
                        : "bg-[#EBEDEF] text-[#49525A] cursor-not-allowed"
                    }`}
                    disabled={!hasChanges || isSavingPerfil}
                  >
                    {isSavingPerfil ? (
                      <>
                        <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Salvar perfil e configurar agenda</span>
                        <span className="sm:hidden">Salvar perfil</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
              {/* Espaço extra no mobile para evitar corte */}
              <div className="h-24 sm:h-0"></div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
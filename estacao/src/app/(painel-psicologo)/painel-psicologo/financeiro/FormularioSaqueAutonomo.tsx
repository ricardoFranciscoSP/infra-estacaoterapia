"use client";

import React, { useState, useEffect } from "react";
import { useFormularioSaqueAutonomo, useCreateFormularioSaqueAutonomo, useUpdateFormularioSaqueAutonomo } from "@/hooks/formularioSaqueAutonomoHook";
import { useUserDetails } from "@/hooks/user/userHook";
import toast from "react-hot-toast";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
// Ícone SVG inline para evitar problemas de importação com Turbopack
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" width="20" height="20">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import { formatDateToYYYYMMDD, parseYYYYMMDDToDate, parseDDMMYYYYToYYYYMMDD } from "@/utils/date";
import { maskDate } from "@/utils/masks";

interface FormularioSaqueAutonomoProps {
  onClose: () => void;
}

export const FormularioSaqueAutonomo: React.FC<FormularioSaqueAutonomoProps> = ({ onClose }) => {
    // Hooks para gerenciar o formulário
    const { formulario, isLoading: isLoadingFormulario, refetch } = useFormularioSaqueAutonomo();
    const { createFormularioAsync, isLoading: isCreating } = useCreateFormularioSaqueAutonomo();
    const { updateFormularioAsync, isLoading: isUpdating } = useUpdateFormularioSaqueAutonomo();
    const { user: userDetails } = useUserDetails();

    // Novos campos de dados pessoais
    const [numeroRg, setNumeroRg] = useState("");
    const [dataEmissaoRg, setDataEmissaoRg] = useState("");
    const [orgaoEmissor, setOrgaoEmissor] = useState("");
    const [ufOrgaoEmissor, setUfOrgaoEmissor] = useState("SP");
    const [dataNascimento, setDataNascimento] = useState("");
    const [nacionalidade, setNacionalidade] = useState("Brasileira");
    const [cidadeNascimentoPessoa, setCidadeNascimentoPessoa] = useState("");
    const [estadoNascimentoPessoa, setEstadoNascimentoPessoa] = useState("São Paulo");
    const [sexo, setSexo] = useState("Feminino");
    const [raca, setRaca] = useState("Parda");
    const [estadoCivil, setEstadoCivil] = useState("Casado(a)");
    const [nomeConjuge, setNomeConjuge] = useState("");
    const [regimeBens, setRegimeBens] = useState("Comunhão parcial de bens");

    const ufs = [
      "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
    ];
    const estadosCivis = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "Separado(a)"];
    const sexos = ["Feminino", "Masculino", "Outro"];
    const racas = ["Branca", "Preta", "Parda", "Amarela", "Indígena"];
    const regimesBens = ["Comunhão parcial de bens", "Comunhão universal de bens", "Separação total de bens", "Participação final nos aquestos", "Outro"];
  
  const [cidadesNascimento, setCidadesNascimento] = useState<Array<{ nome: string }>>([]);
  const [loadingCidadesNascimento, setLoadingCidadesNascimento] = useState(false);
  const [cidadeBusca, setCidadeBusca] = useState("");
  const [cidadeDropdownOpen, setCidadeDropdownOpen] = useState(false);
  const [dataEmissaoInput, setDataEmissaoInput] = useState("");

  const [possuiDependente, setPossuiDependente] = useState<"nao" | "sim">("nao");
  const [tipoDependente, setTipoDependente] = useState("Cônjuge");
  const [nomeDependente, setNomeDependente] = useState("");
  const [cpfDependente, setCpfDependente] = useState("");
  const [dataNascimentoDependente, setDataNascimentoDependente] = useState("");
  const [cidadeNascimento, setCidadeNascimento] = useState("");
  const [estadoNascimento, setEstadoNascimento] = useState("Bahia");
  const [possuiDeficiencia, setPossuiDeficiencia] = useState<"nao" | "sim">("nao");
  const [chavePix, setChavePix] = useState("");

  // Para manter o layout igual ao da imagem, garantir que os campos estejam alinhados lado a lado quando possível

  const estados = [
    "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal",
    "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul",
    "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí",
    "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia",
    "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"
  ];
  const ESTADO_TO_UF: Record<string, string> = Object.fromEntries(
    estados.map((e, i) => [e, ufs[i]])
  );

  const tiposDependente = ["Cônjuge", "Filho(a)", "Pai/Mãe", "Outro"];

  const formatarCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return value;
  };


  // Função para formatar data no formato DD/MM/AAAA
  const formatarDataBR = (data: string | null | undefined): string => {
    if (!data) return "-";
    try {
      const date = new Date(data);
      if (isNaN(date.getTime())) return "-";
      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const ano = date.getFullYear();
      return `${dia}/${mes}/${ano}`;
    } catch {
      return "-";
    }
  };

  const buscarCidadesPorEstado = React.useCallback(async (uf: string) => {
    if (!uf || uf.length !== 2) return;
    setLoadingCidadesNascimento(true);
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
      if (res.ok) {
        const data: Array<{ nome: string }> = await res.json();
        setCidadesNascimento(data.map((c) => ({ nome: c.nome })));
      } else {
        setCidadesNascimento([]);
      }
    } catch (e) {
      console.error("Erro ao buscar cidades:", e);
      setCidadesNascimento([]);
    } finally {
      setLoadingCidadesNascimento(false);
    }
  }, []);

  useEffect(() => {
    const uf = ESTADO_TO_UF[estadoNascimentoPessoa];
    if (uf) {
      buscarCidadesPorEstado(uf);
    } else {
      setCidadesNascimento([]);
    }
  }, [estadoNascimentoPessoa, buscarCidadesPorEstado]);

  // Carregar dados existentes quando o formulário for carregado
  useEffect(() => {
    if (formulario) {
      setNumeroRg(formulario.NumeroRg || "");
      const deRaw = formulario.DataEmissaoRg || "";
      const de = typeof deRaw === "string" && deRaw.includes("T") ? deRaw.slice(0, 10) : deRaw;
      setDataEmissaoRg(de);
      if (de) {
        try {
          const d = parseYYYYMMDDToDate(de);
          setDataEmissaoInput(d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "");
        } catch {
          setDataEmissaoInput("");
        }
      } else {
        setDataEmissaoInput("");
      }
      setOrgaoEmissor(formulario.OrgaoEmissor || "");
      setUfOrgaoEmissor(formulario.UfOrgaoEmissor || "SP");
      setDataNascimento(formulario.DataNascimento || "");
      setNacionalidade(formulario.Nacionalidade || "Brasileira");
      setCidadeNascimentoPessoa(formulario.CidadeNascimentoPessoa || "");
      setEstadoNascimentoPessoa(formulario.EstadoNascimentoPessoa || "São Paulo");
      setSexo(formulario.Sexo || "Feminino");
      setRaca(formulario.Raca || "Parda");
      setEstadoCivil(formulario.EstadoCivil || "Casado(a)");
      setNomeConjuge(formulario.NomeConjuge || "");
      setRegimeBens(formulario.RegimeBens || "Comunhão parcial de bens");
      setPossuiDependente((formulario.PossuiDependente as "nao" | "sim") || "nao");
      setTipoDependente(formulario.TipoDependente || "Cônjuge");
      setNomeDependente(formulario.NomeDependente || "");
      // Formatar CPF se existir
      const cpfDependenteRaw = formulario.CpfDependente || "";
      setCpfDependente(cpfDependenteRaw ? formatarCPF(cpfDependenteRaw) : "");
      setDataNascimentoDependente(formulario.DataNascimentoDependente || "");
      setCidadeNascimento(formulario.CidadeNascimento || "");
      setEstadoNascimento(formulario.EstadoNascimento || "Bahia");
      setPossuiDeficiencia((formulario.PossuiDeficiencia as "nao" | "sim") || "nao");
      setChavePix(formulario.ChavePix || "");
    }
  }, [formulario]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limpar CPF do dependente (remover formatação)
    const cpfDependenteLimpo = cpfDependente.replace(/\D/g, "");
    
    const formData = {
      NumeroRg: numeroRg.trim() || undefined,
      DataEmissaoRg: dataEmissaoRg.trim() || undefined,
      OrgaoEmissor: orgaoEmissor.trim() || undefined,
      UfOrgaoEmissor: ufOrgaoEmissor || undefined,
      DataNascimento: dataNascimento.trim() || undefined,
      Nacionalidade: nacionalidade.trim() || undefined,
      CidadeNascimentoPessoa: cidadeNascimentoPessoa.trim() || undefined,
      EstadoNascimentoPessoa: estadoNascimentoPessoa || undefined,
      Sexo: sexo || undefined,
      Raca: raca || undefined,
      EstadoCivil: estadoCivil || undefined,
      NomeConjuge: nomeConjuge.trim() || undefined,
      RegimeBens: regimeBens || undefined,
      PossuiDependente: possuiDependente || undefined,
      TipoDependente: possuiDependente === "sim" ? tipoDependente : undefined,
      NomeDependente: possuiDependente === "sim" ? nomeDependente.trim() : undefined,
      CpfDependente: possuiDependente === "sim" && cpfDependenteLimpo ? cpfDependenteLimpo : undefined,
      DataNascimentoDependente: possuiDependente === "sim" ? dataNascimentoDependente.trim() : undefined,
      CidadeNascimento: possuiDependente === "sim" ? cidadeNascimento.trim() : undefined,
      EstadoNascimento: possuiDependente === "sim" ? estadoNascimento : undefined,
      PossuiDeficiencia: possuiDeficiencia || undefined,
      ChavePix: chavePix.trim() || undefined,
      Status: true, // Marcar como preenchido quando enviar
    };

    try {
      let result;
      if (formulario) {
        // Se já existe, atualizar
        result = await updateFormularioAsync(formData);
      } else {
        // Se não existe, criar
        result = await createFormularioAsync(formData);
      }

      if (result.success) {
        toast.success(result.message || "Formulário salvo com sucesso!");
        await refetch();
        // Não fechar, apenas chamar onClose que será tratado pelo componente pai
        // O componente pai (SaqueStepsModal) irá mudar para o step de nota fiscal
        onClose();
      } else {
        toast.error(result.message || "Erro ao salvar formulário");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao salvar formulário";
      toast.error(errorMessage);
    }
  };

  const isLoading = isLoadingFormulario || isCreating || isUpdating;

  return (
    <div className="fira-sans bg-[#F6F7FB] min-h-screen overflow-y-auto">
      <div className="w-full max-w-[1300px] mx-auto px-4 py-10">
        {/* Header: Voltar à esquerda, texto centralizado alinhado ao voltar */}
        {/* Header alinhado à altura do voltar */}
        <div className="mb-6 w-full flex items-center gap-4 relative" style={{ minHeight: 60 }}>
          <div className="absolute left-0 top-1">
            <BreadcrumbsVoltar onClick={onClose} />
          </div>
          <div className="flex flex-col w-full items-center">
            <h1 className="text-[24px] font-bold text-[#23253a] mb-1 text-center w-full">
              Formulário único de solicitação de saque - Autônomo
            </h1>
            <p className="text-[14px] text-[#49525A] leading-6 text-center w-full">
              Os dados abaixo solicitados precisam ser preenchidos uma única vez e são obrigatórios para que seu pagamento seja processado e liberado para resgate
            </p>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="rounded-[12px] shadow-[0_2px_8px_rgba(109,117,192,0.08)] p-8 w-full max-w-[1300px] mx-auto">
          {/* Data do contrato inline */}
          <div className="mb-6 flex flex-row items-center gap-4">
            <label className="block text-[14px] font-medium text-[#23253a] mb-0 min-w-fit">
              Data do contrato:
            </label>
            <div className="text-[14px] text-[#49525A] bg-[#F6F7FB] px-4 py-2.5 rounded-[8px]">
              {formatarDataBR(userDetails?.DataAprovacao || null)}
            </div>
          </div>

          {/* Dados pessoais */}
          <div className="mb-6">
            <h3 className="text-[16px] font-semibold text-[#23253a] mb-4">Dados pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[14px] font-medium text-[#23253a] mb-2">Número do RG</label>
                <input type="text" value={numeroRg} onChange={e => setNumeroRg(e.target.value)} className="w-full px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px]" />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#23253a] mb-2">Data da emissão</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={dataEmissaoInput || (dataEmissaoRg && (() => {
                      try {
                        const d = parseYYYYMMDDToDate(dataEmissaoRg);
                        return d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "";
                      } catch { return ""; }
                    })()) || ""}
                    onChange={(e) => {
                      const masked = maskDate(e.target.value);
                      setDataEmissaoInput(masked);
                      if (masked.length === 10) {
                        const yyyy = parseDDMMYYYYToYYYYMMDD(masked);
                        if (yyyy) setDataEmissaoRg(yyyy);
                      } else if (masked.length === 0) {
                        setDataEmissaoRg("");
                      }
                    }}
                    onBlur={() => {
                      if (dataEmissaoInput && dataEmissaoInput.length > 0 && dataEmissaoInput.length < 10) {
                        const yyyy = parseDDMMYYYYToYYYYMMDD(dataEmissaoInput);
                        if (yyyy) setDataEmissaoRg(yyyy);
                      }
                    }}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    className="w-full px-4 py-2.5 pr-10 rounded-[8px] border border-[#E5E7EB] text-[14px] bg-white"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded text-[#6B7280]"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border border-[#E3E6E8] rounded-md shadow-lg" align="end">
                      <Calendar
                        mode="single"
                        selected={dataEmissaoRg?.trim() ? (parseYYYYMMDDToDate(dataEmissaoRg) ?? undefined) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setDataEmissaoRg(formatDateToYYYYMMDD(date));
                            setDataEmissaoInput(format(date, "dd/MM/yyyy", { locale: ptBR }));
                          } else {
                            setDataEmissaoRg("");
                            setDataEmissaoInput("");
                          }
                        }}
                        locale={ptBR}
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#23253a] mb-2">Órgão emissor</label>
                <input type="text" value={orgaoEmissor} onChange={e => setOrgaoEmissor(e.target.value)} className="w-full px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px]" />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#23253a] mb-2">UF</label>
                <select value={ufOrgaoEmissor} onChange={e => setUfOrgaoEmissor(e.target.value)} className="w-full px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px]">
                  {ufs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#23253a] mb-2">Data de nascimento</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px] bg-white text-left text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#6D75C0]"
                    >
                      <span>
                        {dataNascimento && dataNascimento.trim() ? (() => {
                          try {
                            // Tenta parsear como YYYY-MM-DD primeiro (evita problemas de timezone)
                            const date = parseYYYYMMDDToDate(dataNascimento);
                            if (date) {
                              return format(date, "dd/MM/yyyy", { locale: ptBR });
                            }
                            // Fallback para parse genérico
                            const fallback = new Date(dataNascimento);
                            return isNaN(fallback.getTime()) ? "DD/MM/AAAA" : format(fallback, "dd/MM/yyyy", { locale: ptBR });
                          } catch {
                            return "DD/MM/AAAA";
                          }
                        })() : "DD/MM/AAAA"}
                      </span>
                      <CalendarIcon className="h-4 w-4 text-[#6B7280]" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white border border-[#E3E6E8] rounded-md shadow-lg" align="start">
                    <Calendar
                      mode="single"
                      selected={dataNascimento && dataNascimento.trim() ? (() => {
                        try {
                          // Tenta parsear como YYYY-MM-DD primeiro (evita problemas de timezone)
                          const date = parseYYYYMMDDToDate(dataNascimento);
                          if (date) {
                            return date;
                          }
                          // Fallback para parse genérico
                          const fallback = new Date(dataNascimento);
                          return isNaN(fallback.getTime()) ? undefined : fallback;
                        } catch {
                          return undefined;
                        }
                      })() : undefined}
                      onSelect={(date) => {
                        if (date) {
                          // Usa formatação sem timezone para evitar bug de um dia a menos
                          setDataNascimento(formatDateToYYYYMMDD(date));
                        } else {
                          setDataNascimento("");
                        }
                      }}
                      initialFocus
                      locale={ptBR}
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#23253a] mb-2">Nacionalidade</label>
                <input type="text" value={nacionalidade} onChange={e => setNacionalidade(e.target.value)} className="w-full px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px]" />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#23253a] mb-2">Estado</label>
                <select
                  value={estadoNascimentoPessoa}
                  onChange={(e) => {
                    setEstadoNascimentoPessoa(e.target.value);
                    setCidadeNascimentoPessoa("");
                    setCidadeBusca("");
                  }}
                  className="w-full px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px]"
                >
                  {estados.map(estado => <option key={estado} value={estado}>{estado}</option>)}
                </select>
              </div>
              <div className="relative">
                <label className="block text-[14px] font-medium text-[#23253a] mb-2">Cidade de nascimento</label>
                <input
                  type="text"
                  value={cidadeDropdownOpen ? cidadeBusca : cidadeNascimentoPessoa}
                  onChange={(e) => {
                    setCidadeBusca(e.target.value);
                    setCidadeDropdownOpen(true);
                    setCidadeNascimentoPessoa("");
                  }}
                  onFocus={() => {
                    setCidadeDropdownOpen(true);
                    setCidadeBusca(cidadeNascimentoPessoa);
                  }}
                  onBlur={() => {
                    setTimeout(() => setCidadeDropdownOpen(false), 200);
                    if (!cidadeNascimentoPessoa && cidadeBusca) setCidadeBusca("");
                  }}
                  placeholder={loadingCidadesNascimento ? "Carregando cidades..." : "Buscar cidade"}
                  className="w-full px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px] bg-white"
                />
                {cidadeDropdownOpen && (
                  <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-[8px] border border-[#E5E7EB] bg-white shadow-lg py-1">
                    {loadingCidadesNascimento ? (
                      <li className="px-4 py-2 text-[14px] text-[#6B7280]">Carregando...</li>
                    ) : (() => {
                      const term = cidadeBusca.trim().toLowerCase();
                      const filtered = term
                        ? cidadesNascimento.filter((c) => c.nome.toLowerCase().includes(term)).slice(0, 100)
                        : cidadesNascimento.slice(0, 100);
                      return filtered.length === 0 ? (
                        <li className="px-4 py-2 text-[14px] text-[#6B7280]">Nenhuma cidade encontrada</li>
                      ) : (
                        filtered.map((c) => (
                          <li
                            key={c.nome}
                            className="px-4 py-2 text-[14px] cursor-pointer hover:bg-[#F6F7FB]"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setCidadeNascimentoPessoa(c.nome);
                              setCidadeBusca("");
                              setCidadeDropdownOpen(false);
                            }}
                          >
                            {c.nome}
                          </li>
                        ))
                      );
                    })()}
                  </ul>
                )}
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#23253a] mb-2">Sexo</label>
                <select value={sexo} onChange={e => setSexo(e.target.value)} className="w-full px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px]">
                  {sexos.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#23253a] mb-2">Raça/Cor</label>
                <select value={raca} onChange={e => setRaca(e.target.value)} className="w-full px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px]">
                  {racas.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#23253a] mb-2">Estado civil</label>
                <select value={estadoCivil} onChange={e => setEstadoCivil(e.target.value)} className="w-full px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px]">
                  {estadosCivis.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#23253a] mb-2">Nome completo do(a) cônjuge</label>
                <input type="text" value={nomeConjuge} onChange={e => setNomeConjuge(e.target.value)} className="w-full px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px]" />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#23253a] mb-2">Regime de bens</label>
                <select value={regimeBens} onChange={e => setRegimeBens(e.target.value)} className="w-full px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px]">
                  {regimesBens.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Possui dependente */}
          <div className="mb-6">
            <label className="block text-[14px] font-medium text-[#23253a] mb-3">
              Possui algum dependente?
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dependente"
                  value="nao"
                  checked={possuiDependente === "nao"}
                  onChange={(e) => setPossuiDependente(e.target.value as "nao" | "sim")}
                  className="w-4 h-4 text-[#6D75C0] focus:ring-[#6D75C0] cursor-pointer"
                />
                <span className="text-[14px] text-[#49525A]">Não</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dependente"
                  value="sim"
                  checked={possuiDependente === "sim"}
                  onChange={(e) => setPossuiDependente(e.target.value as "nao" | "sim")}
                  className="w-4 h-4 text-[#6D75C0] focus:ring-[#6D75C0] cursor-pointer"
                />
                <span className="text-[14px] text-[#49525A]">Sim</span>
              </label>
            </div>
          </div>

          {/* Dados do dependente */}
          {possuiDependente === "sim" && (
            <div className="mb-6 bg-[#F6F7FB] rounded-[8px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#23253a] mb-2">
                    Tipo de dependente:
                  </label>
                  <select
                    value={tipoDependente}
                    onChange={(e) => setTipoDependente(e.target.value)}
                    className="w-full px-4 py-2 rounded-[8px] border border-gray-300 text-[14px] text-[#23253a] focus:outline-none focus:ring-2 focus:ring-[#6D75C0]"
                  >
                    {tiposDependente.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#23253a] mb-2">
                    Nome completo do(a) dependente:
                  </label>
                  <input
                    type="text"
                    value={nomeDependente}
                    onChange={(e) => setNomeDependente(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px] text-[#23253a] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D75C0] focus:border-[#6D75C0]"
                    placeholder="Nome completo do dependente"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#23253a] mb-2">
                    CPF do dependente:
                  </label>
                  <input
                    type="text"
                    value={cpfDependente}
                    onChange={(e) => setCpfDependente(formatarCPF(e.target.value))}
                    maxLength={14}
                    className="w-full px-4 py-2 rounded-[8px] border border-gray-300 text-[14px] text-[#23253a] focus:outline-none focus:ring-2 focus:ring-[#6D75C0]"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#23253a] mb-2">
                    Data de nascimento dependente:
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px] bg-white text-left text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#6D75C0]"
                      >
                        <span>
                          {dataNascimentoDependente && dataNascimentoDependente.trim() ? (() => {
                            try {
                              // Tenta parsear como YYYY-MM-DD primeiro (evita problemas de timezone)
                              const date = parseYYYYMMDDToDate(dataNascimentoDependente);
                              if (date) {
                                return format(date, "dd/MM/yyyy", { locale: ptBR });
                              }
                              // Fallback para parse genérico
                              const fallback = new Date(dataNascimentoDependente);
                              return isNaN(fallback.getTime()) ? "DD/MM/AAAA" : format(fallback, "dd/MM/yyyy", { locale: ptBR });
                            } catch {
                              return "DD/MM/AAAA";
                            }
                          })() : "DD/MM/AAAA"}
                        </span>
                        <CalendarIcon className="h-4 w-4 text-[#6B7280]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border border-[#E3E6E8] rounded-md shadow-lg" align="start">
                      <Calendar
                        mode="single"
                        selected={dataNascimentoDependente && dataNascimentoDependente.trim() ? (() => {
                          try {
                            // Tenta parsear como YYYY-MM-DD primeiro (evita problemas de timezone)
                            const date = parseYYYYMMDDToDate(dataNascimentoDependente);
                            if (date) {
                              return date;
                            }
                            // Fallback para parse genérico
                            const fallback = new Date(dataNascimentoDependente);
                            return isNaN(fallback.getTime()) ? undefined : fallback;
                          } catch {
                            return undefined;
                          }
                        })() : undefined}
                        onSelect={(date) => {
                          if (date) {
                            // Usa formatação sem timezone para evitar bug de um dia a menos
                            setDataNascimentoDependente(formatDateToYYYYMMDD(date));
                          } else {
                            setDataNascimentoDependente("");
                          }
                        }}
                        initialFocus
                        locale={ptBR}
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#23253a] mb-2">
                    Cidade de nascimento:
                  </label>
                  <input
                    type="text"
                    value={cidadeNascimento}
                    onChange={(e) => setCidadeNascimento(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px] text-[#23253a] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D75C0] focus:border-[#6D75C0]"
                    placeholder="Cidade de nascimento"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#23253a] mb-2">
                    Estado
                  </label>
                  <select
                    value={estadoNascimento}
                    onChange={(e) => setEstadoNascimento(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px] text-[#23253a] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D75C0] focus:border-[#6D75C0]"
                  >
                    {estados.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Possui deficiência */}
          <div className="mb-6">
            <label className="block text-[14px] font-medium text-[#23253a] mb-3">
              Possui alguma deficiência?
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deficiencia"
                  value="nao"
                  checked={possuiDeficiencia === "nao"}
                  onChange={(e) => setPossuiDeficiencia(e.target.value as "nao" | "sim")}
                  className="w-4 h-4 text-[#6D75C0] focus:ring-[#6D75C0] cursor-pointer"
                />
                <span className="text-[14px] text-[#49525A]">Não</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deficiencia"
                  value="sim"
                  checked={possuiDeficiencia === "sim"}
                  onChange={(e) => setPossuiDeficiencia(e.target.value as "nao" | "sim")}
                  className="w-4 h-4 text-[#6D75C0] focus:ring-[#6D75C0] cursor-pointer"
                />
                <span className="text-[14px] text-[#49525A]">Sim</span>
              </label>
            </div>
          </div>

          {/* Dados profissionais */}
          <div className="mb-6">
            <h3 className="text-[16px] font-semibold text-[#23253a] mb-4">Dados profissionais</h3>
            <div>
              <label className="block text-[14px] font-medium text-[#23253a] mb-2">
                Chave PIX (Deverá ser obrigatoriamente seu CPF)
              </label>
              <input
                type="text"
                value={chavePix}
                onChange={(e) => {
                  const numbers = e.target.value.replace(/\D/g, "");
                  if (numbers.length <= 11) {
                    setChavePix(numbers);
                  }
                }}
                maxLength={11}
                className="w-full px-4 py-2.5 rounded-[8px] border border-[#E5E7EB] text-[14px] text-[#23253a] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D75C0] focus:border-[#6D75C0]"
                placeholder="23643222513"
              />
            </div>
          </div>

          {/* Botão enviar */}
          <div className="flex justify-center mt-8 pt-6 border-t border-[#E5E7EB]">
            <button
              type="submit"
              disabled={isLoading}
              className="w-[442px] h-12 px-6 flex items-center justify-center gap-3 bg-[#8494E9] text-white rounded-[8px] font-semibold text-[15px] opacity-100 transition-colors shadow-sm hover:bg-[#6D75C0] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 8 }}
            >
              {isLoading ? "Salvando..." : formulario ? "Atualizar" : "Enviar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

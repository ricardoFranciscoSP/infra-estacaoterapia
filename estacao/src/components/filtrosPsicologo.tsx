// components/filtrosPsicologo.tsx
import React, { useEffect } from "react";
import Select, { MultiValue, StylesConfig } from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; 
import { useEnums } from "@/hooks/enumsHook";
import { usePsicologoSearch } from "@/hooks/usePsicologoSearch";
import Image from "next/image";
import { usePsicologoFilterStore } from "@/store/filters/psicologoFilterStore";
import { normalizeEnum } from "@/utils/enumUtils";

// Tipos para as opções
interface OptionType {
  value: string;
  label: string;
}

// Opções para Sexo, Atendimento e Idiomas
const sexoOptions = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "outros", label: "Outros" },
];

const atendimentoOptions = [
  { value: "adultos", label: "Adultos" },
  { value: "idosos", label: "Idosos" },
  { value: "adolescentes", label: "Adolescentes" },
];

const idiomaOptions = [
  { value: "portugues", label: "Português" },
  { value: "ingles", label: "Inglês" },
  { value: "espanhol", label: "Espanhol" },
  { value: "libras", label: "Libras" },
];

// Opções para Período
const periodoOptions = [
  { value: "", label: "Todos" },
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];

// Estilo customizado para o React Select
const customStyles: StylesConfig<OptionType, true> = {
  control: (provided) => ({
    ...provided,
    border: "none",
    outline: "none",
    background: "transparent",
    minHeight: "32px",
    fontSize: "16px",
    fontWeight: "400",
    color: "#49525A",
    boxShadow: "none",
    "&:hover": {
      borderColor: "transparent",
    },
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 999,
    fontSize: "16px",
    fontWeight: "400",
    color: "#49525A",
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "#8494E9"
      : state.isFocused
      ? "#e9ecef"
      : "white",
    color: state.isSelected ? "white" : "#49525A",
    fontWeight: "400",
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: "#8494E9",
    borderRadius: "4px",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: "white",
    fontSize: "14px",
    fontWeight: "400",
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: "white",
    ":hover": {
      backgroundColor: "#6c6bb6",
      color: "white",
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "#606C76",
    fontSize: "16px",
    fontWeight: "400",
  }),
  input: (provided) => ({
    ...provided,
    fontSize: "16px",
    color: "#49525A",
    fontWeight: "400",
  }),
};

interface FiltrosPsicologoProps {
  autoTrigger?: boolean;
}

export const FiltrosPsicologo: React.FC<FiltrosPsicologoProps> = ({ autoTrigger = true }) => {
  const {
    queixas,
    abordagens,
    sexo,
    atendimentos,
    idiomas,
    data,
    periodo,
    setQueixas,
    setAbordagens,
    setSexo,
    setAtendimentos,
    setIdiomas,
    setData,
    setPeriodo,
    reset,
  } = usePsicologoFilterStore();

  // Converte string YYYY-MM-DD -> Date (apenas para exibir no DatePicker)
  const dataSelecionada: Date | null = data ? new Date(data + "T00:00:00") : new Date();
  const { enums, isLoading, refetch } = useEnums();

  // Corrige para acessar os enums do backend corretamente
  const queixasOptions: OptionType[] = enums?.perfilProfissional?.queixa
    ? enums.perfilProfissional.queixa.map((q: string) => ({
        value: q,
        label: normalizeEnum(q),
      }))
    : [];

  const abordagensOptions: OptionType[] = enums?.perfilProfissional?.abordagem
    ? enums.perfilProfissional.abordagem.map((a: string) => ({
        value: a,
        label: normalizeEnum(a),
      }))
    : [];

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Usa o hook padrão
  const { searchPsicologos } = usePsicologoSearch();

  // Handler para mudança do período
  const handlePeriodoChange = (value: string) => {
    if (value === '' || value === 'manha' || value === 'tarde' || value === 'noite') {
      setPeriodo(value);
      if (autoTrigger) {
        setTimeout(() => {
          const currentState = usePsicologoFilterStore.getState();
          searchPsicologos({
            queixas: currentState.queixas,
            abordagens: currentState.abordagens,
            sexo: currentState.sexo,
            atendimentos: currentState.atendimentos,
            idiomas: currentState.idiomas,
            data: currentState.data,
            periodo: currentState.periodo,
          });
        }, 0);
      }
    }
  };


  // Função para limpar todos os filtros e mostrar todos os psicólogos
  const limparFiltros = () => {
    reset();
    setTimeout(() => {
      searchPsicologos({
        queixas: [],
        abordagens: [],
        sexo: null,
        atendimentos: [],
        idiomas: [],
        data: null,
        periodo: "",
      });
    }, 0);
  };

  // Verifica se algum filtro está selecionado
  const algumFiltroSelecionado =
  queixas.length > 0 ||
  abordagens.length > 0 ||
  sexo !== null ||
  atendimentos.length > 0 ||
  idiomas.length > 0 ||
  !!data ||
  periodo !== "";

  return (
    <div className="w-full max-w-[340px]">
      <div>
        {/* Título e botão limpar filtros - apenas no desktop */}
        <div className="hidden md:flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg text-[#212529]">Encontre seu psicólogo</h2>
          {algumFiltroSelecionado && (
            <button
              className="ml-2 px-3 py-1 text-sm rounded bg-[#E4E7EA] text-[#49525A] hover:bg-[#d1d5db] transition"
              onClick={limparFiltros}
              type="button"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Queixas e Sintomas */}
        <div className="w-full min-h-[88px] flex flex-col rounded-[8px] border border-[#919CA6] p-4 mb-4">
          <span className="font-normal text-[14px] leading-[24px] text-[#606C76] mb-1">
            Queixas e sintomas
          </span>
          {isLoading ? (
            <span className="text-[#606C76] text-[16px]"></span>
          ) : (
            <Select
              isMulti
              isClearable
              options={queixasOptions}
              value={
                (queixas || []).map(v => {
                  const found = queixasOptions.find(o => o.value === v);
                  return found ?? { value: v, label: normalizeEnum(v) };
                }) as unknown as MultiValue<OptionType>
              }
              onChange={(selected) => {
                const newValues = (selected as OptionType[]).map(s => s.value);
                setQueixas(newValues);
                if (autoTrigger) {
                  // Usa setTimeout para garantir que o estado foi atualizado
                  setTimeout(() => {
                    const currentState = usePsicologoFilterStore.getState();
                    searchPsicologos({
                      queixas: currentState.queixas,
                      abordagens: currentState.abordagens,
                      sexo: currentState.sexo,
                      atendimentos: currentState.atendimentos,
                      idiomas: currentState.idiomas,
                      data: currentState.data,
                      periodo: currentState.periodo,
                    });
                  }, 0);
                }
              }}
              placeholder="Selecione uma queixa..."
              noOptionsMessage={() => "Nenhuma opção"}
              styles={customStyles}
              classNames={{
                control: () => "text-[#49525A] text-[16px] leading-[24px] font-normal",
                placeholder: () => "text-[#606C76]",
              }}
              instanceId="select-queixas"
              isSearchable={true}
            />
          )}
        </div>

        {/* Abordagens */}
        <div className="w-full min-h-[88px] flex flex-col rounded-[8px] border border-[#919CA6] p-4 mb-4">
          <span className="font-normal text-[14px] leading-[24px] text-[#606C76] mb-1">
            Abordagens
          </span>
          {isLoading ? (
            <span className="text-[#606C76] text-[16px]"></span>
          ) : (
            <Select
              isMulti
              isClearable
              options={abordagensOptions}
              value={
                (abordagens || []).map(v => {
                  const found = abordagensOptions.find(o => o.value === v);
                  return found ?? { value: v, label: normalizeEnum(v) };
                }) as unknown as MultiValue<OptionType>
              }
              onChange={(selected) => {
                const newValues = (selected as OptionType[]).map(s => s.value);
                setAbordagens(newValues);
                if (autoTrigger) {
                  setTimeout(() => {
                    const currentState = usePsicologoFilterStore.getState();
                    searchPsicologos({
                      queixas: currentState.queixas,
                      abordagens: currentState.abordagens,
                      sexo: currentState.sexo,
                      atendimentos: currentState.atendimentos,
                      idiomas: currentState.idiomas,
                      data: currentState.data,
                      periodo: currentState.periodo,
                    });
                  }, 0);
                }
              }}
              placeholder="Selecione uma abordagem..."
              noOptionsMessage={() => "Nenhuma opção"}
              styles={customStyles}
              classNames={{
                control: () => "text-[#49525A] text-[16px] leading-[24px] font-normal",
                placeholder: () => "text-[#606C76]",
              }}
              instanceId="select-abordagens"
              isSearchable={true}
            />
          )}
        </div>

        {/* Sexo do psicólogo */}
        <div className="w-full min-h-[88px] flex flex-col p-2 mb-4">
          <span className="font-normal text-[14px] leading-[24px] text-[#212529] mb-1">
            Sexo do psicólogo
          </span>
          <div className="flex flex-wrap gap-6 mt-1">
            {sexoOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center cursor-pointer text-[16px] leading-[24px] font-normal text-[#49525A]"
              >
                <input
                  type="radio"
                  name="sexo"
                  value={option.value}
                  checked={sexo === option.value}
                  onChange={() => {
                    if (option.value === 'feminino' || option.value === 'masculino' || option.value === 'outros') {
                      setSexo(option.value);
                      if (autoTrigger) {
                        setTimeout(() => {
                          const currentState = usePsicologoFilterStore.getState();
                          searchPsicologos({
                            queixas: currentState.queixas,
                            abordagens: currentState.abordagens,
                            sexo: currentState.sexo,
                            atendimentos: currentState.atendimentos,
                            idiomas: currentState.idiomas,
                            data: currentState.data,
                            periodo: currentState.periodo,
                          });
                        }, 0);
                      }
                    }
                  }}
                  className="mr-2 w-4 h-4 text-[#8494E9] focus:ring-[#8494E9]"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* Atendimento */}
        <div className="w-full min-h-[88px] flex flex-col p-2 mb-4">
          <span className="font-normal text-[14px] leading-[24px] text-[#212529] mb-1">
            Atendimento
          </span>
          <div className="flex flex-wrap gap-6 mt-1">
            {atendimentoOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center cursor-pointer text-[16px] leading-[24px] font-normal text-[#49525A]"
              >
                <input
                  type="checkbox"
                  value={option.value}
                  checked={atendimentos.includes(option.value)}
                  onChange={(e) => {
                    const newAtendimentos = e.target.checked
                      ? [...atendimentos, option.value]
                      : atendimentos.filter((val) => val !== option.value);
                    setAtendimentos(newAtendimentos);
                    if (autoTrigger) {
                      setTimeout(() => {
                        const currentState = usePsicologoFilterStore.getState();
                        searchPsicologos({
                          queixas: currentState.queixas,
                          abordagens: currentState.abordagens,
                          sexo: currentState.sexo,
                          atendimentos: currentState.atendimentos,
                          idiomas: currentState.idiomas,
                          data: currentState.data,
                          periodo: currentState.periodo,
                        });
                      }, 0);
                    }
                  }}
                  className="mr-2 w-4 h-4 text-[#8494E9] focus:ring-[#8494E9]"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* Idiomas */}
        <div className="w-full min-h-[88px] flex flex-col p-2 mb-4">
          <span className="font-normal text-[14px] leading-[24px] text-[#212529] mb-1">
            Idiomas
          </span>
          <div className="flex flex-wrap gap-6 mt-1">
            {idiomaOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center cursor-pointer text-[16px] leading-[24px] font-normal text-[#49525A]"
              >
                <input
                  type="checkbox"
                  value={option.value}
                  checked={idiomas.includes(option.value)}
                  onChange={(e) => {
                    const newIdiomas = e.target.checked
                      ? [...idiomas, option.value]
                      : idiomas.filter((val) => val !== option.value);
                    setIdiomas(newIdiomas);
                    if (autoTrigger) {
                      setTimeout(() => {
                        const currentState = usePsicologoFilterStore.getState();
                        searchPsicologos({
                          queixas: currentState.queixas,
                          abordagens: currentState.abordagens,
                          sexo: currentState.sexo,
                          atendimentos: currentState.atendimentos,
                          idiomas: currentState.idiomas,
                          data: currentState.data,
                          periodo: currentState.periodo,
                        });
                      }, 0);
                    }
                  }}
                  className="mr-2 w-4 h-4 text-[#8494E9] focus:ring-[#8494E9]"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* Data */}
        <div className="w-full min-h-[88px] flex flex-col rounded-[8px] border border-[#919CA6] p-4 mb-4">
          <span className="font-normal text-[14px] leading-[24px] text-[#212529] mb-1">Data</span>
          <div className="flex items-center justify-between bg-white px-2 py-2">
            <span className="text-[16px] leading-[24px] font-normal text-[#49525A]">
              A partir de: {dataSelecionada?.toLocaleDateString("pt-BR")}
            </span>
            <DatePicker
              selected={dataSelecionada}
              onChange={(date) => {
                if (!date) {
                  setData(null);
                  if (autoTrigger) {
                    setTimeout(() => {
                      const currentState = usePsicologoFilterStore.getState();
                      searchPsicologos({
                        queixas: currentState.queixas,
                        abordagens: currentState.abordagens,
                        sexo: currentState.sexo,
                        atendimentos: currentState.atendimentos,
                        idiomas: currentState.idiomas,
                        data: currentState.data,
                        periodo: currentState.periodo,
                      });
                    }, 0);
                  }
                  return;
                }
                const d = new Date(date);
                d.setHours(0,0,0,0);
                const iso = d.toISOString().slice(0,10);
                setData(iso);
                if (autoTrigger) {
                  setTimeout(() => {
                    const currentState = usePsicologoFilterStore.getState();
                    searchPsicologos({
                      queixas: currentState.queixas,
                      abordagens: currentState.abordagens,
                      sexo: currentState.sexo,
                      atendimentos: currentState.atendimentos,
                      idiomas: currentState.idiomas,
                      data: currentState.data,
                      periodo: currentState.periodo,
                    });
                  }, 0);
                }
              }}
              minDate={new Date()} // data mínima = hoje
              dateFormat="dd/MM/yyyy"
              popperPlacement="bottom-start"
              className="text-[16px] leading-[24px] font-normal text-[#49525A]"
              customInput={
                <button className="text-[#8494E9]">
                  <Image src="/icons/calendar.svg" className="w-4 h-4" alt="calendário" width={16} height={16} />
                </button>
              }
            />
          </div>
        </div>

        {/* Período */}
        <div className="w-full min-h-[88px] flex flex-col rounded-[8px] border border-[#919CA6] p-4 mb-4">
          <span className="font-normal text-[14px] leading-[24px] text-[#606C76] mb-1">Período</span>
          <select
            className="w-full h-10 px-3 rounded-lg text-[#3E4A55] text-sm fira-sans font-normal  focus:outline-none focus:ring-0"
            value={periodo ?? ""}
            onChange={e => handlePeriodoChange(e.target.value)}
          >
            {periodoOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
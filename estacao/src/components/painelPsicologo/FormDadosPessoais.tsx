import React from "react";
import Select from "react-select";
import Image from "next/image";
import { Psicologo } from "@/types/psicologoTypes";
import { EnumsResponse } from "@/types/enumsType";
import { PHONE_COUNTRIES, PhoneCountry, onlyDigits, maskTelefoneByCountry, getFlagUrl } from "@/utils/phoneCountries";
import { useUpdateDadosPessoais } from "@/hooks/user/userPsicologoHook";
import toast from "react-hot-toast";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
// Ícone SVG inline para evitar problemas de importação com Turbopack
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" width="20" height="20">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
import { Calendar } from "@/components/ui/calendar";
import { normalizeEnum } from "@/utils/enumUtils";
import { traduzirPerfil } from "@/utils/formatarDataHora";
import { formatDateToYYYYMMDD, parseYYYYMMDDToDate } from "@/utils/date";

type ApiError = {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
  message?: string;
};

type Props = {
  psicologo: Psicologo;
  enums: EnumsResponse;
  onSuccess?: () => void;
};

export default function FormDadosPessoais({ psicologo, enums, onSuccess }: Props) {
  const { mutate: updateDadosPessoais } = useUpdateDadosPessoais();
  
  
  // Estados para telefone e WhatsApp com país
  const [telefoneCompleto, setTelefoneCompleto] = React.useState<string>("");
  const [country, setCountry] = React.useState<PhoneCountry>(PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0]);
  const [openCountry, setOpenCountry] = React.useState(false);
  const countryBoxRef = React.useRef<HTMLDivElement>(null);
  
  const [whatsappCompleto, setWhatsappCompleto] = React.useState<string>("");
  const [countryWhatsapp, setCountryWhatsapp] = React.useState<PhoneCountry>(PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0]);
  const [openCountryWhatsapp, setOpenCountryWhatsapp] = React.useState(false);
  const countryWhatsappBoxRef = React.useRef<HTMLDivElement>(null);
  const countryDropdownRef = React.useRef<HTMLUListElement>(null);
  const countryWhatsappDropdownRef = React.useRef<HTMLUListElement>(null);

  const [dadosPessoais, setDadosPessoais] = React.useState({
    Nome: psicologo?.Nome ?? "",
    Email: psicologo?.Email ?? "",
    DataNascimento: psicologo?.DataNascimento ?? "",
    Sexo: psicologo?.Sexo ?? "",
    Pronome: psicologo?.Pronome ?? "",
    RacaCor: psicologo?.RacaCor ?? "",
    Rg: psicologo?.Rg ?? "",
  });

  // Atualiza dados pessoais quando o psicologo mudar (ao abrir o modal)
  React.useEffect(() => {
    setDadosPessoais({
      Nome: psicologo?.Nome ?? "",
      Email: psicologo?.Email ?? "",
      DataNascimento: psicologo?.DataNascimento ?? "",
      Sexo: psicologo?.Sexo ?? "",
      Pronome: psicologo?.Pronome ?? "",
      RacaCor: psicologo?.RacaCor ?? "",
      Rg: psicologo?.Rg ?? "",
    });
  }, [psicologo]);
  
  const [dataNascimentoDate, setDataNascimentoDate] = React.useState<Date | null>(null);
  const [openCalendar, setOpenCalendar] = React.useState(false);
  
  // Converte DataNascimento string para Date
  React.useEffect(() => {
    if (dadosPessoais.DataNascimento) {
      try {
        // Tenta parsear como YYYY-MM-DD primeiro (evita problemas de timezone)
        const date = parseYYYYMMDDToDate(dadosPessoais.DataNascimento);
        if (date) {
          setDataNascimentoDate(date);
        } else {
          // Fallback para parse genérico
          const fallback = new Date(dadosPessoais.DataNascimento);
          if (!isNaN(fallback.getTime())) {
            setDataNascimentoDate(fallback);
          }
        }
      } catch {
        // Ignora erro
      }
    } else {
      setDataNascimentoDate(null);
    }
  }, [dadosPessoais.DataNascimento]);

  // Carrega telefone e WhatsApp do psicologo
  React.useEffect(() => {
    const telefoneValue = psicologo?.Telefone || "";
    if (telefoneValue) {
      if (telefoneValue.startsWith("+")) {
        const detected = PHONE_COUNTRIES.find(c => telefoneValue.startsWith(c.dial));
        if (detected) {
          setCountry(detected);
          const digits = onlyDigits(telefoneValue.replace(detected.dial, "").trim());
          setTelefoneCompleto(maskTelefoneByCountry(detected.code, digits));
        } else {
          setCountry(PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0]);
          const digits = onlyDigits(telefoneValue);
          setTelefoneCompleto(maskTelefoneByCountry("BR", digits));
        }
      } else {
        const digits = onlyDigits(telefoneValue);
        setTelefoneCompleto(maskTelefoneByCountry("BR", digits));
      }
    }
    
    const whatsappValue = psicologo?.WhatsApp || "";
    if (whatsappValue) {
      if (whatsappValue.startsWith("+")) {
        const detected = PHONE_COUNTRIES.find(c => whatsappValue.startsWith(c.dial));
        if (detected) {
          setCountryWhatsapp(detected);
          const digits = onlyDigits(whatsappValue.replace(detected.dial, "").trim());
          setWhatsappCompleto(maskTelefoneByCountry(detected.code, digits));
        } else {
          setCountryWhatsapp(PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0]);
          const digits = onlyDigits(whatsappValue);
          setWhatsappCompleto(maskTelefoneByCountry("BR", digits));
        }
      } else {
        const digits = onlyDigits(whatsappValue);
        setWhatsappCompleto(maskTelefoneByCountry("BR", digits));
      }
    }
  }, [psicologo]);

  // Ajusta posição dos dropdowns de país quando abrem
  React.useEffect(() => {
    if (openCountry && countryDropdownRef.current) {
      const rect = countryBoxRef.current?.getBoundingClientRect();
      if (rect) {
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 200 && spaceAbove > spaceBelow) {
          countryDropdownRef.current.style.bottom = '100%';
          countryDropdownRef.current.style.top = 'auto';
          countryDropdownRef.current.style.marginBottom = '0.25rem';
          countryDropdownRef.current.style.marginTop = '0';
        } else {
          countryDropdownRef.current.style.bottom = 'auto';
          countryDropdownRef.current.style.top = '100%';
          countryDropdownRef.current.style.marginTop = '0.25rem';
          countryDropdownRef.current.style.marginBottom = '0';
        }
      }
    }
  }, [openCountry]);

  React.useEffect(() => {
    if (openCountryWhatsapp && countryWhatsappDropdownRef.current) {
      const rect = countryWhatsappBoxRef.current?.getBoundingClientRect();
      if (rect) {
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 200 && spaceAbove > spaceBelow) {
          countryWhatsappDropdownRef.current.style.bottom = '100%';
          countryWhatsappDropdownRef.current.style.top = 'auto';
          countryWhatsappDropdownRef.current.style.marginBottom = '0.25rem';
          countryWhatsappDropdownRef.current.style.marginTop = '0';
        } else {
          countryWhatsappDropdownRef.current.style.bottom = 'auto';
          countryWhatsappDropdownRef.current.style.top = '100%';
          countryWhatsappDropdownRef.current.style.marginTop = '0.25rem';
          countryWhatsappDropdownRef.current.style.marginBottom = '0';
        }
      }
    }
  }, [openCountryWhatsapp]);

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

  const inputClass =
    "rounded-[6px] px-4 py-2 gap-3 border border-[#75838F] bg-[#FCFBF6] text-[#23253A] focus:outline-none focus:ring-2 focus:ring-[#8494E9] transition w-full";

  const sexoOptions = enums.usuario.sexo.map(s => ({ value: s, label: normalizeEnum(s) }));
  const pronomeOptions = enums.usuario.pronome.map(p => ({ value: p, label: normalizeEnum(p) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

      updateDadosPessoais({
      Nome: dadosPessoais.Nome,
      Email: dadosPessoais.Email || undefined,
      Telefone: telefoneCompleto ? `${country.dial}${onlyDigits(telefoneCompleto)}` : undefined,
      WhatsApp: whatsappCompleto ? `${countryWhatsapp.dial}${onlyDigits(whatsappCompleto)}` : undefined,
      Sexo: dadosPessoais.Sexo || undefined,
      Pronome: dadosPessoais.Pronome || undefined,
      RacaCor: dadosPessoais.RacaCor || undefined,
      Rg: dadosPessoais.Rg || undefined,
      DataNascimento: dadosPessoais.DataNascimento || undefined,
    }, {
      onSuccess: () => {
        toast.success("Dados pessoais atualizados com sucesso!");
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: ApiError) => {
        console.error("Erro ao atualizar dados pessoais:", error);
        const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Erro ao atualizar dados pessoais. Tente novamente.";
        toast.error(errorMessage);
      }
    });
  };

  return (
    <form className="flex flex-col gap-4 modal-form-mobile" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col text-sm font-medium">
          Nome
          <input
            className={inputClass}
            value={dadosPessoais.Nome}
            onChange={e => setDadosPessoais({ ...dadosPessoais, Nome: e.target.value })}
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          CPF
          <input className={inputClass} value={psicologo?.Cpf ?? ""} disabled />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Email
          <input
            className={inputClass}
            type="email"
            value={dadosPessoais.Email}
            onChange={e => setDadosPessoais({ ...dadosPessoais, Email: e.target.value })}
            placeholder="seu@email.com"
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Nascimento
          <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`${inputClass} text-left flex items-center justify-between`}
              >
                <span className={dataNascimentoDate ? "text-[#23253A]" : "text-[#75838F]"}>
                  {dataNascimentoDate
                    ? new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      }).format(dataNascimentoDate)
                    : "DD/MM/AAAA"}
                </span>
                <CalendarIcon className="h-4 w-4 text-[#75838F]" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white border border-[#E3E6E8] rounded-md shadow-lg" align="start">
              <Calendar
                mode="single"
                selected={dataNascimentoDate || undefined}
                onSelect={(date) => {
                  setDataNascimentoDate(date || null);
                  if (date) {
                    // Usa formatação sem timezone para evitar bug de um dia a menos
                    const isoDate = formatDateToYYYYMMDD(date);
                    setDadosPessoais({ ...dadosPessoais, DataNascimento: isoDate });
                  } else {
                    setDadosPessoais({ ...dadosPessoais, DataNascimento: "" });
                  }
                  setOpenCalendar(false);
                }}
                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                initialFocus
                fromYear={1900}
                toYear={new Date().getFullYear()}
              />
            </PopoverContent>
          </Popover>
        </label>
        <label className="flex flex-col text-sm font-medium">
          Sexo
          <Select
            options={sexoOptions}
            value={
              dadosPessoais.Sexo
                ? { value: dadosPessoais.Sexo, label: normalizeEnum(dadosPessoais.Sexo) }
                : null
            }
            onChange={option =>
              setDadosPessoais({ ...dadosPessoais, Sexo: option?.value ?? "" })
            }
            placeholder="Selecione..."
            isClearable
            menuPlacement="auto"
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          RG
          <input
            className={inputClass}
            value={dadosPessoais.Rg}
            onChange={e => setDadosPessoais({ ...dadosPessoais, Rg: e.target.value })}
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Status
          <input className={inputClass} value={psicologo?.Status ?? ""} disabled />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Perfil
          <input className={inputClass} value={traduzirPerfil(psicologo?.Role ?? "")} disabled />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Telefone
          <div ref={countryBoxRef} className="relative">
            <div className="flex items-center w-full h-[40px] rounded-[6px] border border-[#75838F] bg-[#FCFBF6] px-4 py-2 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-[#8494E9]">
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
                ref={countryDropdownRef}
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
        </label>
        <label className="flex flex-col text-sm font-medium">
          WhatsApp
          <div ref={countryWhatsappBoxRef} className="relative">
            <div className="flex items-center w-full h-[40px] rounded-[6px] border border-[#75838F] bg-[#FCFBF6] px-4 py-2 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-[#8494E9]">
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
                ref={countryWhatsappDropdownRef}
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
        </label>
        <label className="flex flex-col text-sm font-medium">
          Pronome
          <Select
            options={pronomeOptions}
            value={
              dadosPessoais.Pronome
                ? { value: dadosPessoais.Pronome, label: normalizeEnum(dadosPessoais.Pronome) }
                : null
            }
            onChange={option =>
              setDadosPessoais({ ...dadosPessoais, Pronome: option?.value ?? "" })
            }
            placeholder="Selecione..."
            isClearable
            menuPlacement="auto"
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Qual raça / Cor você se autodeclara?
          <Select
            options={[
              { value: "Branca", label: "Branca" },
              { value: "Preta", label: "Preta" },
              { value: "Parda", label: "Parda" },
              { value: "Amarela", label: "Amarela" },
              { value: "Indigena", label: "Indígena" },
              { value: "PrefiroNaoInformar", label: "Prefiro não informar" },
            ]}
            value={
              dadosPessoais.RacaCor
                ? { value: dadosPessoais.RacaCor, label: dadosPessoais.RacaCor === "Indigena" ? "Indígena" : dadosPessoais.RacaCor === "PrefiroNaoInformar" ? "Prefiro não informar" : dadosPessoais.RacaCor }
                : null
            }
            onChange={option =>
              setDadosPessoais({ ...dadosPessoais, RacaCor: option?.value ?? "" })
            }
            placeholder="Selecione..."
            isClearable
            menuPlacement="auto"
          />
        </label>
      </div>
    </form>
  );
}

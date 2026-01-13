import React, { useEffect, useRef, useState } from "react";
import { Controller, Control, useFormContext, FieldValues, Path, PathValue } from "react-hook-form";
import { PHONE_COUNTRIES, PhoneCountry, onlyDigits, maskTelefoneByCountry, getFlagUrl } from "@/utils/phoneCountries";
import Image from "next/image";

type Props<T extends FieldValues = FieldValues> = {
  name: Path<T>;
  control?: Control<T>;
  className?: string;
  disabled?: boolean;
  label?: string;
};

function detectCountryByValue(value: string): PhoneCountry {
  // Remove espaços e pega só dígitos
  const digits = onlyDigits(value);
  // Tenta encontrar país pelo DDI
  for (const c of PHONE_COUNTRIES) {
    if (digits.startsWith(c.dial.replace("+", ""))) {
      return c;
    }
  }
  // Default Brasil
  return PHONE_COUNTRIES.find(c => c.code === 'BR') || PHONE_COUNTRIES[0];
}

function stripCountryDial(value: string, country: PhoneCountry): string {
  const dial = country.dial.replace("+", "");
  if (value.startsWith("+" + dial)) return value.slice(dial.length + 1);
  if (value.startsWith(dial)) return value.slice(dial.length);
  return value;
}

function PhoneInput<T extends FieldValues = FieldValues>({
  name,
  control,
  className,
  disabled = false,
  label,
}: Props<T>) {
  const form = useFormContext<T>();
  const usedControl = control ?? form?.control;

  // Estado do país selecionado
  const [country, setCountry] = useState<PhoneCountry>(PHONE_COUNTRIES.find(c => c.code === 'BR') || PHONE_COUNTRIES[0]);
  const [openCountry, setOpenCountry] = useState(false);
  const countryBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryBoxRef.current && !countryBoxRef.current.contains(e.target as Node)) {
        setOpenCountry(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Detecta país e aplica máscara ao valor inicial
  useEffect(() => {
    if (!usedControl) return;
    const rawValue = form?.getValues ? form.getValues(name) : undefined;
    const value = typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
    if (value && value.startsWith("+")) {
      const detected = detectCountryByValue(value);
      setCountry(detected);
      // Remove DDI e aplica máscara
      const digits = stripCountryDial(value, detected);
      const masked = maskTelefoneByCountry(detected.code, digits);
      // Atualiza o valor do campo para o formato mascarado
      form.setValue(name, masked as PathValue<T, Path<T>>, { shouldValidate: true });
    }
  }, [form, name, usedControl]);

  return (
    <Controller
      name={name}
      control={usedControl}
      render={({ field, fieldState }) => (
        <div ref={countryBoxRef} className={className || "w-full"}>
          {label && (
            <label className="mb-1 text-sm text-[#26220D] font-medium block">{label}</label>
          )}
          <div
            className={`flex items-center w-full h-[40px] rounded-[6px] border border-[#d1d5db] bg-white px-4 py-2 text-sm font-fira-sans focus-within:outline-none focus-within:ring-2 focus-within:ring-[#8494E9] md:bg-[#e6eefe] ${fieldState.invalid ? "border-red-500" : ""}`}
          >
            {/* Botão de país (bandeira + código ISO) */}
            <button
              type="button"
              onClick={() => setOpenCountry(v => !v)}
              className="flex items-center gap-2 h-full px-2 rounded-l-[6px] border-r border-[#d1d5db]"
              aria-haspopup="listbox"
              aria-expanded={openCountry}
              disabled={disabled}
              tabIndex={0}
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
              placeholder="Telefone com DDD"
              className="flex-1 bg-transparent outline-none text-sm px-3 text-[#23253a]"
              value={field.value || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const masked = maskTelefoneByCountry(country.code, onlyDigits(e.target.value));
                field.onChange(masked);
              }}
              onBlur={field.onBlur}
              disabled={disabled}
            />
          </div>
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
                    const rawDigits = onlyDigits(field.value || "");
                    const masked = maskTelefoneByCountry(c.code, rawDigits);
                    field.onChange(masked);
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
          {fieldState.error && (
            <span className="text-xs text-red-500 mt-1 block">{fieldState.error.message}</span>
          )}
        </div>
      )}
    />
  );
}

export default PhoneInput;

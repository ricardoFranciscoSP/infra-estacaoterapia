"use client";
import * as React from "react";
import { Controller, Control, Path, FieldValues, FieldPath, ControllerRenderProps, ControllerFieldState } from "react-hook-form";
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
import { formatDateToYYYYMMDD, parseYYYYMMDDToDate, parseDDMMYYYYToYYYYMMDD } from "@/utils/date";
import { maskDate } from "@/utils/masks";


interface DatePickerTailwindProps<T extends Record<string, unknown>> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  placeholder?: string;
  className?: string;
}

function formatDate(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}


// Componente interno que pode usar hooks
function DatePickerInput<T extends FieldValues>({ 
  field, 
  fieldState, 
  label, 
  placeholder, 
  className 
}: { 
  field: ControllerRenderProps<T, FieldPath<T>>; 
  fieldState: ControllerFieldState; 
  label?: string; 
  placeholder?: string; 
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  // Converte o valor do campo para Date
  const value = React.useMemo(() => {
    const fieldValue = field.value as unknown;
    if (fieldValue instanceof Date) {
      return fieldValue;
    } else if (typeof fieldValue === "string" && fieldValue) {
      // Tenta parsear como YYYY-MM-DD primeiro
      const parsed = parseYYYYMMDDToDate(fieldValue);
      if (parsed) {
        return parsed;
      }
      // Fallback para parse genérico
      const fallback = new Date(fieldValue);
      return isNaN(fallback.getTime()) ? null : fallback;
    }
    return null;
  }, [field.value]);

  // Sincroniza inputValue quando o valor do campo muda externamente
  React.useEffect(() => {
    if (value) {
      setInputValue(formatDate(value));
    } else if (!field.value) {
      setInputValue("");
    }
  }, [field.value, value]);

  // Determina a cor da borda baseado no estado de validação ou className passada
  const hasError = !!fieldState.error;
  const isTouched = !!fieldState.isTouched;
  const isValid = !hasError && isTouched && !!value;
  
  // Se className contém uma classe de borda, usa ela, senão usa a lógica de validação
  let borderClass = "border-[#75838F]";
  if (className?.includes("border-green-500") || className?.includes("border-red-500")) {
    // Extrai a classe de borda da className
    const borderMatch = className.match(/border-(green|red)-500/);
    if (borderMatch) {
      borderClass = `border-${borderMatch[1]}-500`;
    }
  } else {
    // Usa a lógica de validação
    borderClass = hasError ? "border-red-500" : isValid ? "border-green-500" : "border-[#75838F]";
  }
  
  // Remove classes de borda da className para evitar conflito
  const cleanClassName = className?.replace(/border-(green|red)-500|border-\[#[^\]]+\]/g, "").trim() || "";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskDate(e.target.value);
    setInputValue(masked);
    
    // Se a data está completa (DD/MM/YYYY), converte para YYYY-MM-DD
    if (masked.length === 10) {
      const yyyymmdd = parseDDMMYYYYToYYYYMMDD(masked);
      if (yyyymmdd) {
        field.onChange(yyyymmdd);
        field.onBlur();
      }
    } else if (masked.length === 0) {
      field.onChange(null);
    }
  };

  const handleInputBlur = () => {
    field.onBlur();
    // Se o input tem valor mas não está completo, tenta converter mesmo assim
    if (inputValue && inputValue.length > 0 && inputValue.length < 10) {
      const yyyymmdd = parseDDMMYYYYToYYYYMMDD(inputValue);
      if (yyyymmdd) {
        field.onChange(yyyymmdd);
      }
    }
  };

  return (
    <div className="flex flex-col w-full gap-1.5 sm:gap-1 min-h-[56px] sm:min-h-[50px] mb-3 sm:mb-4">
      {label && <label className="mb-0.5 sm:mb-1 text-sm text-[#49525A] font-medium">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => {
            // Quando foca, mostra o valor formatado se existir
            if (value) {
              setInputValue(formatDate(value));
            }
          }}
          placeholder={placeholder || "DD/MM/AAAA"}
          maxLength={10}
          className={`w-full h-[40px] border ${borderClass} rounded-[6px] px-4 py-2 text-[#6B7280] bg-white focus:outline-none focus:ring-2 focus:ring-[#8494E9] ${cleanClassName}`}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              onClick={(e) => {
                e.preventDefault();
                setOpen(true);
              }}
            >
              <CalendarIcon className="h-5 w-5 text-[#6B7280]" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white border border-[#E3E6E8] rounded-md shadow-lg" align="start">
            <Calendar
              mode="single"
              selected={value || undefined}
              onSelect={(date) => {
                if (date) {
                  // Usa formatação sem timezone para evitar bug de um dia a menos
                  const dateValue = formatDateToYYYYMMDD(date);
                  field.onChange(dateValue);
                  setInputValue(formatDate(date));
                } else {
                  field.onChange(null);
                  setInputValue("");
                }
                field.onBlur(); // Marca o campo como tocado
                setOpen(false);
              }}
              initialFocus
              fromYear={1900}
              toYear={new Date().getFullYear()}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function DatePickerTailwind<T extends Record<string, unknown>>({ name, control, label, placeholder, className }: DatePickerTailwindProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <DatePickerInput 
          field={field} 
          fieldState={fieldState} 
          label={label} 
          placeholder={placeholder} 
          className={className}
        />
      )}
    />
  );
}

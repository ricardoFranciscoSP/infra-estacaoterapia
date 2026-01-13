"use client"

import * as React from "react"
import { format } from "date-fns"
// Ícone SVG inline para evitar problemas de importação com Turbopack
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" width="16" height="16">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
import { ptBR } from 'date-fns/locale';

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Control, Controller, FieldValues, Path } from "react-hook-form"
import { formatDateToYYYYMMDD, parseYYYYMMDDToDate } from "@/utils/date"

interface DatePickerProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  placeholder?: string;
  className?: string;
}

export function DatePicker<T extends FieldValues>({ name, control, placeholder, className }: DatePickerProps<T>) {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        // Converte o valor do campo para Date
        let dateValue: Date | undefined = undefined;
        if (field.value) {
          const fieldValue = field.value as unknown;
          if (fieldValue instanceof Date) {
            dateValue = fieldValue;
          } else if (typeof fieldValue === "string") {
            // Tenta parsear como YYYY-MM-DD primeiro
            const parsed = parseYYYYMMDDToDate(fieldValue);
            if (parsed) {
              dateValue = parsed;
            } else {
              // Fallback para parse genérico
              const fallback = new Date(fieldValue);
              dateValue = isNaN(fallback.getTime()) ? undefined : fallback;
            }
          }
        }

        return (
          <div className={cn("w-full", className)}>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  ref={buttonRef}
                  className={cn(
                    "w-full justify-start text-left font-normal h-[40px] border-[#E3E6E8] focus:border-[#6D75C0]",
                    !field.value && "text-muted-foreground"
                  )}
                  onFocus={() => setOpen(true)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateValue ? format(dateValue, "dd/MM/yyyy", { locale: ptBR }) : <span>{placeholder}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateValue}
                  onSelect={(date) => {
                    if (date) {
                      // Usa formatação sem timezone para evitar bug de um dia a menos
                      const dateStr = formatDateToYYYYMMDD(date);
                      field.onChange(dateStr);
                    } else {
                      field.onChange(null);
                    }
                    setOpen(false);
                    buttonRef.current?.blur();
                  }}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            {error && <p className="text-red-500 text-sm mt-1">{error.message}</p>}
          </div>
        );
      }}
    />
  )
}

'use client';

import { useController, useFormContext } from 'react-hook-form';
import React, { useState } from 'react';
import Image from 'next/image';
import { handleMaskedBackspace } from '@/utils/masks';

interface Props {
  name: string;
  label?: string;
  as?: string;
  children?: React.ReactNode;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  mask?: (value: string) => string;
  validate?: (value: string) => { valid: boolean; error?: string };
  required?: boolean;
  rules?: Record<string, unknown>;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  maxLength?: number;
  value?: string | number;
  inputMode?: 'search' | 'text' | 'email' | 'tel' | 'url' | 'none' | 'numeric' | 'decimal';
  pattern?: string;
}

export function FormInput({
  name,
  label,
  as,
  type = 'text',
  placeholder,
  autoComplete,
  disabled,
  mask,
  validate,
  required,
  rules,
  onBlur,
  onChange,
  className,
  children,
  maxLength,
  inputMode,
  pattern
}: Props) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name, control, rules });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>();

  // Sanitiza entrada
  function sanitizeInput(value: string) {
    return value.replace(/[<>"'`/\\{}\[\];]/g, '');
  }

  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  // Handler personalizado
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    let val = e.target.value;

    // Só aplica sanitização e máscara se não for select
    if (as !== 'select') {
      val = sanitizeInput(val);
      if (mask) {
        val = mask(val);
      }
    }

    // Limpa erro local ao digitar
    if (localError) {
      setLocalError(undefined);
    }

    // Atualiza o campo do react-hook-form
    field.onChange(val);

    // Chama onChange externo, se existir
    if (onChange && e.target instanceof HTMLInputElement) {
      // Só chama se for input
      const customEvent = {
        ...e,
        target: { ...e.target, value: val },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(customEvent);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    field.onBlur(); // Passa o evento para o RHF
    
    // Validação customizada
    if (validate && field.value) {
      const result = validate(field.value);
      if (!result.valid) {
        setLocalError(result.error);
      } else {
        setLocalError(undefined);
      }
    }
    
    if (onBlur) {
      onBlur(e); // Passa o evento para o handler externo
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Se há máscara, trata o backspace/delete
    if (mask) {
      handleMaskedBackspace(
        e,
        field.value || '',
        mask,
        (newValue) => {
          field.onChange(newValue);
        }
      );
    }
  };

  // Combina a ref do react-hook-form com nossa ref local
  const inputRef = (node: HTMLInputElement | null) => {
    if (typeof field.ref === 'function') {
      field.ref(node);
    } else if (field.ref && 'current' in field.ref) {
      (field.ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    }
  };

  const displayError = localError || fieldState.error?.message;

  return (
    <div className="relative flex flex-col gap-1.5 sm:gap-1 w-full min-h-[56px] sm:min-h-[50px] mb-3 sm:mb-4 fira-sans">
      {label && <label className="font-medium text-sm sm:text-sm mb-0.5 sm:mb-1 text-[#49525A]">{label}</label>}
      {as === 'select' ? (
        <select
          value={field.value ?? ''}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          className={`border border-[#d1d5db] rounded-md px-4 h-[40px] w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#6c6bb6] text-[#23253a] text-sm pr-10 md:bg-[#e6eefe] md:text-base ${
            displayError ? 'border-red-500' : ''
          } ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''} ${className ?? ''}`}
        >
          {children}
        </select>
      ) : (
        <>
          <div className="flex items-center relative">
            <input
              value={field.value ?? ''}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              ref={inputRef}
              placeholder={placeholder}
              type={inputType}
              autoComplete={autoComplete || "off"}
              disabled={disabled}
              required={required}
              maxLength={maxLength}
              inputMode={inputMode}
              pattern={pattern}
              className={`border border-[#d1d5db] rounded-md px-4 h-[40px] w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#6c6bb6] text-[#23253a] text-sm pr-10 md:bg-[#e6eefe] md:text-base ${
                displayError ? 'border-red-500' : ''
              } ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''} ${className ?? ''}`}
            />
            {isPassword && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c6bb6] cursor-pointer p-0 bg-transparent border-0"
                tabIndex={-1}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                style={{ zIndex: 2 }}
              >
                {showPassword ? (
                  <Image src="/icons/eye.svg" alt="Ocultar senha" width={20} height={20} className="w-5 h-5" />
                ) : (
                  <Image src="/icons/eyeSlash.svg" alt="Mostrar senha" width={20} height={20} className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
          <div className="min-h-[5px]">
            {displayError && (
              <span className="text-red-500 text-xs mt-0.5 block">{displayError}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
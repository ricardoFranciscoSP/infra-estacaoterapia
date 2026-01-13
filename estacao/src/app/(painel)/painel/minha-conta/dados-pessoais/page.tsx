"use client";
import React, { useEffect, useRef, useState, useCallback, ChangeEvent, FocusEvent } from "react";
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { FormInput } from '@/components/FormInput';
import PainelSidebar from '@/components/PainelSidebar';
import { motion, AnimatePresence } from "framer-motion";
import { useDadosPessoais } from "./useDadosPessoais";
import Image from "next/image";
import PhoneInput from "@/components/PhoneInput";
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import { DatePickerTailwind } from "@/components/DatePickerMaterial";

interface User {
  Nome: string;
  Image?: {
    Url: string;
  };
}

interface DadosPessoaisFormData {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  dataNascimento: string;
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  [key: string]: unknown; // index signature added to satisfy Record<string, unknown>
}
    // const initialValuesRef = useRef<Partial<DadosPessoaisFormData>>({}); // removido: não utilizado
    // const { watch, getValues, setValue, control, handleSubmit } = methods; // removido: não utilizado
type UseDadosPessoaisReturn = {
  methods: UseFormReturn<DadosPessoaisFormData>;
  user: User | null;
  imagePreview: string | null;
  imageLoading: boolean;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  maskCep: (value: string) => string;
  handleCepChangeOrBlur: (cep: string) => Promise<void>;
  onSubmit: (data: DadosPessoaisFormData) => void;
  isSaving: boolean;
};


// Utility for CPF mask
const maskCpf = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

// Reusable ProfileAvatar component
const ProfileAvatar: React.FC<{
  imagePreview: string | null;
  user: User | null;
  imageLoading: boolean;
  size: number;
  onLabelClick: () => void;
}> = ({ imagePreview, user, imageLoading, size, onLabelClick }) => {
  const getAvatarUrl = () => {
    if (imagePreview) return imagePreview;
    if (user?.Image?.Url && user.Image.Url.startsWith("http")) {
      return user.Image.Url;
    }
    return "/assets/avatar-placeholder.svg";
  };

  const avatarUrl = getAvatarUrl();
  const isDefaultAvatar = avatarUrl === "/assets/avatar-placeholder.svg";

  return (
    <label onClick={onLabelClick} className="cursor-pointer group relative">
      <div
        className="flex items-center justify-center rounded-full border-[2.13px] border-[#CACFD4] overflow-hidden group-hover:border-indigo-400 transition-all"
        style={{ width: size, height: size }}
      >
        <Image 
          src={avatarUrl} 
          alt="Avatar" 
          width={size} 
          height={size} 
          className="object-cover w-full h-full"
          unoptimized={!isDefaultAvatar}
        />
        {imageLoading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full z-10">
            <Image src="/assets/loading.svg" alt="Carregando" width={size/2} height={size/2} />
          </div>
        )}
        <span className="absolute inset-0 rounded-full bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </label>
  );
};

const SubmitButton: React.FC<{ isSaving: boolean; isEdited: boolean; isMobile?: boolean }> = ({ isSaving, isEdited, isMobile }) => {
  const mobileClasses = "w-[280px] h-12 mx-auto";
  const desktopClasses = "w-full h-[40px]";
  
  return (
    <button
      type="submit"
      className={`rounded-[6px] px-3 flex items-center justify-center gap-2 font-medium transition-colors border whitespace-nowrap
        ${isMobile ? mobileClasses : desktopClasses}
        ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}
        ${isEdited ? 'bg-[#6D75C0] text-white border-[#6D75C0] hover:bg-[#5a63b0] cursor-pointer' : 'bg-[#F1F2F4] text-[#23253a] border-[#E3E6E8] cursor-not-allowed'}
      `}
      disabled={!isEdited || isSaving}
      tabIndex={isEdited && !isSaving ? 0 : -1}
    >
      {isSaving ? (
        <>
          <Image src="/assets/loading.svg" alt="Carregando" width={20} height={20} />
          Salvando...
        </>
      ) : "Salvar alterações"}
    </button>
  );
};


export default function DadosPessoaisPage() {
  const {
    methods,
    user,
    imagePreview,
    imageLoading,
    handleImageChange, 
    maskCep,
    handleCepChangeOrBlur,
    onSubmit,
    isSaving,
  } = useDadosPessoais() as UseDadosPessoaisReturn;

  const [isEdited, setIsEdited] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {  setValue, control, handleSubmit } = methods;

  useEffect(() => {
    setIsEdited(false);
  }, [user]);

  useEffect(() => {
    const subscription = methods.watch(() => {
      const dirty = Object.keys(methods.formState.dirtyFields).filter((key) => {
        const value = methods.getValues(key);
        if (key === 'dataNascimento') {
          // Validação: maior de 18 anos
          let dateValue: Date | null = null;
          if (typeof value === 'string' && value) {
            const parts = value.split('-');
            if (parts.length === 3) {
              dateValue = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            }
          } else if (value && typeof value === 'object' && typeof (value as Date).getTime === 'function') {
            dateValue = value as Date;
          }
          if (dateValue) {
            const today = new Date();
            const minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
            return dateValue <= minDate;
          }
          return false;
        }
        if (typeof value === 'string') {
          // Só chama trim se for string e tem trim
          return value !== '' && typeof value.trim === 'function' ? value.trim() !== '' : true;
        }
        if (
          value !== undefined &&
          value !== null &&
          typeof value === 'object' &&
          typeof (value as Date).getTime === 'function'
        ) {
          return !isNaN((value as Date).getTime());
        }
        return value !== undefined && value !== null;
      });
      // Só habilita se todos os campos editados forem válidos
      setIsEdited(dirty.length > 0 && !dirty.includes('dataNascimento') ? true : dirty.includes('dataNascimento') && dirty.length > 0);
    });
    return () => subscription.unsubscribe();
  }, [methods]); // dependências fixas para evitar erro de tamanho

  const handleCepChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const cep = e.target.value;
    const maskedCep = maskCep(cep);
    setValue("cep", maskedCep, { shouldDirty: true });
    if (maskedCep.replace(/\D/g, "").length === 8) {
      await handleCepChangeOrBlur(maskedCep);
    }
  }, [setValue, maskCep, handleCepChangeOrBlur]);

  const handleCepBlur = useCallback((e: FocusEvent<HTMLInputElement>) => {
    handleCepChangeOrBlur(e.target.value);
  }, [handleCepChangeOrBlur]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col min-h-screen bg-[#fff]-50 relative"
      >
        <div className="flex-1 flex w-full max-w-[1440px] mx-auto px-4 md:px-8 gap-8">
            <div className="hidden md:block w-1/4">
              <PainelSidebar active="/painel/minha-conta/dados-pessoais" />
            </div>
            
            <div className="flex-1 bg-[#FCFBF6] p-6 min-h-[904px] gap-6 flex flex-col">
              <input
                id="avatar-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />

              {/* MOBILE HEADER */}
              <div className="block md:hidden w-full">
                <div className="mb-2">
                  <BreadcrumbsVoltar />
                </div>
                <h2 className="text-[#49525A] font-medium text-[16px] leading-6 text-center mb-4">Minha conta</h2>
                <div className="flex flex-col items-center">
                  <ProfileAvatar 
                    user={user}
                    imagePreview={imagePreview}
                    imageLoading={imageLoading}
                    onLabelClick={handleAvatarClick}
                    size={64}
                  />
                  <span className="font-medium text-[12px] leading-6 text-center text-[#49525A] mt-2">{user?.Nome || "Nome do usuário"}</span>
                  <button
                    type="button"
                    className="font-medium text-[12px] leading-6 text-[#6D75C0] mt-1 text-center"
                    onClick={handleAvatarClick}
                  >
                    Alterar foto
                  </button>
                </div>
                <div className="w-full flex justify-center my-4">
                  <div className="w-[280px] border-t border-[#CACFD4]" />
                </div>
              </div>

              {/* DESKTOP HEADER */}
              <div className="hidden md:flex flex-col gap-2 mb-8">
                <div className="mb-2">
                  <BreadcrumbsVoltar />
                </div>
                <div className="flex items-center gap-6">
                  <ProfileAvatar 
                    user={user}
                    imagePreview={imagePreview}
                    imageLoading={imageLoading}
                    onLabelClick={handleAvatarClick}
                    size={96}
                  />
                  <div className="flex flex-col justify-center">
                    <span className="font-semibold text-lg text-gray-800">
                      {user?.Nome || "Nome do usuário"}
                    </span>
                    <button
                      type="button"
                      className="text-indigo-600 text-sm hover:underline text-left mt-1"
                      onClick={handleAvatarClick}
                    >
                      Alterar foto
                    </button>
                  </div>
                </div>
              </div>

                <FormProvider {...methods}>
                  <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>

                  {/* CAMPOS REUTILIZÁVEIS PARA MOBILE E DESKTOP */}
                  <div className="space-y-8">
                    <div>
                      <h2 className="font-semibold text-lg mb-2">Dados pessoais</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput name="nome" label="Nome" placeholder="Nome" className="w-full" />
                        <FormInput name="email" label="E-mail" placeholder="E-mail" type="email" className="w-full" disabled />
                        <FormInput name="cpf" label="CPF" placeholder="CPF" type="text" className="w-full" mask={maskCpf} disabled />
                        <PhoneInput name="telefone" label="Telefone" control={control} className="w-full" />
                        <DatePickerTailwind<DadosPessoaisFormData> name="dataNascimento" control={control} label="Data de Nascimento" placeholder="Data de Nascimento" />
                      </div>
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg mb-2">Endereço</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput name="cep" label="CEP" placeholder="CEP" mask={maskCep} onBlur={handleCepBlur} onChange={handleCepChange} className="w-full" />
                        <FormInput name="rua" label="Endereço" placeholder="Endereço" className="w-full" />
                        <FormInput name="numero" label="Número" placeholder="Número" className="w-full" />
                        <FormInput name="complemento" label="Complemento" placeholder="Complemento" className="w-full" />
                        <FormInput name="bairro" label="Bairro" placeholder="Bairro" className="w-full" />
                        <FormInput name="cidade" label="Cidade" placeholder="Cidade" className="w-full" />
                        <FormInput name="estado" label="Estado" placeholder="Estado" className="w-full" />
                      </div>
                    </div>
                  </div>

                  {/* SUBMIT BUTTONS */}
                  <div className="block md:hidden">
                    <SubmitButton isSaving={isSaving} isEdited={isEdited} isMobile />
                    <div className="mb-12" />
                  </div>
                  <div className="hidden md:block w-full">
                    <SubmitButton isSaving={isSaving} isEdited={isEdited} />
                  </div>
                  </form>
                </FormProvider>
            </div>
          </div>
        )
      </motion.div>
    </AnimatePresence>
  );
}
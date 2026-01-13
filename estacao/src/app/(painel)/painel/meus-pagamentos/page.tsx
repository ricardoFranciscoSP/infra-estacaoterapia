"use client";
import React from "react";
import { useForm, FormProvider } from 'react-hook-form';
import { FormInput } from '@/components/FormInput';
import PainelSidebar from '@/components/PainelSidebar';
import Image from "next/image";

export default function MeusPagamentosPage() {
  const methods = useForm();

  return (
    <div className="flex justify-center py-8 bg-gray-50 min-h-screen">
      <div className="w-full max-w-[1440px] px-4 md:px-8 flex gap-8">
        <div className="w-1/4">
          <PainelSidebar active="/painel/meus-pagamentos" />
        </div>
        <div
          className="flex-1 bg-[#FCFBF6] rounded-[8px] border border-[#E3E6E8] p-6 min-h-[904px] gap-6 flex flex-col"
          style={{ boxSizing: 'border-box' }}
        >
          <div className="flex items-center gap-6 mb-8">
            <label htmlFor="avatar-upload" className="cursor-pointer group relative">
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-2xl font-semibold border-2 border-gray-300 group-hover:border-indigo-400 transition-all overflow-hidden">
                {/* Avatar ou ícone */}
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.25a7.75 7.75 0 1115.5 0v.25a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75v-.25z" />
                </svg>
              </div>
              <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={() => { /* handle upload aqui */ }} />
              <span className="absolute inset-0 rounded-full bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </label>
            <div className="flex flex-col justify-center">
              <span className="font-semibold text-lg text-gray-800">Maria Oliveira</span>
              <button
                type="button"
                className="text-indigo-600 text-sm hover:underline text-left mt-1"
                onClick={() => document.getElementById('avatar-upload')?.click()}
              >
                Alterar foto
              </button>
            </div>
          </div>
          <FormProvider {...methods}>
            <div className="w-full max-w-[948px] flex items-center gap-2 rounded-[4px] bg-[#FFEDB3] px-[10px] py-1 mb-6" style={{height:56}}>
              <Image src="/icons/info-circled.svg" alt="Info" className="w-4 h-4 mr-2 opacity-100" style={{minWidth:16, minHeight:16}} width={16} height={16} />
              <span className="text-[#606C76] text-[14px] leading-6 font-normal align-middle">
                Atenção! Algumas informações do seu cadastro não estão preenchidas. Que tal concluir as informações agora para que você continue utilizando nossa plataforma?
              </span>
            </div>
            <form className="space-y-6">
              <div>
                <h2 className="font-semibold text-lg mb-2">Dados pessoais</h2>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput name="nome" placeholder="Nome" disabled />
                  <FormInput name="email" placeholder="E-mail" type="email" disabled />
                  <FormInput
                    name="cpf"
                    placeholder="CPF"
                    disabled
                    type="text"
                    mask={(value: string) => value
                      .replace(/\D/g, "")
                      .replace(/(\d{3})(\d)/, "$1.$2")
                      .replace(/(\d{3})(\d)/, "$1.$2")
                      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
                    }
                  />
                  <FormInput name="telefone" placeholder="Telefone" />
                  <FormInput name="dataNascimento" placeholder="Data de Nascimento" type="date" />
                </div>
              </div>
              <div>
                <h2 className="font-semibold text-lg mb-2">Endereço</h2>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput name="cep" placeholder="CEP" />
                  <FormInput name="endereco" placeholder="Endereço" />
                  <FormInput name="numero" placeholder="Número" />
                  <FormInput name="complemento" placeholder="Complemento" />
                  <FormInput name="cidade" placeholder="Cidade" />
                  <FormInput name="estado" placeholder="Estado" />
                </div>
              </div>
              <div className="flex justify-start">
                <button
                  type="submit"
                  className="bg-[#F1F2F4] text-[#23253a] w-[157px] h-[40px] rounded-[6px] px-4 flex items-center justify-center gap-3 font-medium transition-colors border border-[#E3E6E8] hover:bg-[#e3e6e8]"
                  style={{ minWidth: 157, minHeight: 40 }}
                >
                  Salvar alterações
                </button>
              </div>
            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  );
}
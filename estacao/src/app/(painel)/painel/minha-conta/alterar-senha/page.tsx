"use client";
import React, { useState } from "react";
import { useForm, FormProvider } from 'react-hook-form';
import { FormInput } from '@/components/FormInput';
import PainelSidebar from '@/components/PainelSidebar';
import { getPasswordRequirements } from '@/utils/validation';
import Image from "next/image";

export default function AlterarSenhaPage() {
  const methods = useForm({
    mode: 'onChange',
  });
  const { watch, formState: { isValid }, handleSubmit } = methods;
  const [submitted, setSubmitted] = useState(false);

  const novaSenha = watch('novaSenha') || '';
  const repitaSenha = watch('repitaSenha') || '';

  const passwordRequirements = getPasswordRequirements(novaSenha);
  const senhaIguais = novaSenha === repitaSenha && novaSenha.length > 0;

  const onSubmit = (_data: Record<string, unknown>) => {
    console.log('Formulário enviado com sucesso:', _data);
    setSubmitted(true);
  };

  return (
    <div className="flex justify-center py-8 bg-[#FCFBF6] min-h-screen">
      <div className="w-full max-w-[1440px] px-4 md:px-8 flex gap-8">
        <div className="hidden md:block w-1/4">
          <PainelSidebar active="/painel/minha-conta/alterar-senha" />
        </div>
        <div
          className="flex-1 bg-[#FCFBF6] md:rounded-[8px] md:border md:border-[#E3E6E8] p-6 min-h-[904px] gap-6 flex flex-col"
          style={{ boxSizing: 'border-box' }}
        >
          <h1 className="text-xl md:text-2xl font-semibold text-[#49525A] mb-2 md:mb-4">Alterar Senha</h1>
          <FormProvider {...methods}>
            <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit(onSubmit)}>
              <FormInput
                name="senhaAtual"
                placeholder="Senha Atual"
                type="password"
                autoComplete="off"
                required
              />
              <FormInput
                name="novaSenha"
                placeholder="Nova Senha"
                type="password"
                autoComplete="off"
                required
              />
              <FormInput
                name="repitaSenha"
                placeholder="Repita Senha"
                type="password"
                autoComplete="off"
                required
                rules={{
                  validate: (value: string) => value === novaSenha || 'As senhas não coincidem',
                }}
              />
              <div className="rounded border border-[#BDBDBD] bg-white p-3 text-sm mt-1">
                <div className="text-[#606C76] mb-2 font-medium">Requisitos para criação da senha:</div>
                <ul className="space-y-1">
                  {passwordRequirements.map((req) => (
                    <li key={req.label} className="flex items-center gap-2 text-[14px]">
                        {req.valid ? (
                        <Image src="/assets/validation/success.svg" alt="Sucesso" className="w-4 h-4" width={16} height={16} />
                      ) : (
                        <Image src="/assets/validation/error.svg" alt="Erro" className="w-4 h-4" width={16} height={16} />
                      )}
                      <span className={req.valid ? 'text-[#4CAF50]' : 'text-[#E53935]'}>{req.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-2">
                <button
                  type="submit"
                  className={`w-full md:w-[180px] h-[40px] rounded-[6px] px-4 flex items-center justify-center gap-3 font-medium transition-colors border border-[#E3E6E8] ${isValid && passwordRequirements.every(req => req.valid) && senhaIguais ? 'bg-[#F1F2F4] text-[#23253a] hover:bg-[#e3e6e8]' : 'bg-[#F1F2F4] text-[#BDBDBD] cursor-not-allowed'}`}
                  disabled={!(isValid && passwordRequirements.every(req => req.valid) && senhaIguais)}
                >
                  Salvar alterações
                </button>
                <a href="#" className="text-indigo-600 text-sm hover:underline md:ml-4 md:mt-0 mt-1 text-right">Esqueceu minha senha</a>
              </div>
              {submitted && <div className="text-green-600 text-sm mt-2">Senha alterada com sucesso!</div>}
            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  );
}

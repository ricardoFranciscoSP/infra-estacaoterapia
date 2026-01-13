import React, { useState } from "react";
import { FormInput } from "@/components/FormInput";
import { maskCpfCnpj, maskTelefone, maskCep } from "@/utils/masks";
import { UploadModal } from "./UploadModal";
import { fillFormAddressByCep } from "@/utils/cepUtils";
import Image from "next/image";
import Link from "next/link";
import type { UseFormReturn } from "react-hook-form";

export type JuridicoFormFields = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
  representante_nome: string;
  representante_cpf: string;
  representante_rg: string;
  crp: string;
  cep: string;
  representante_endereco: string;
  representante_numero: string;
  representante_complemento: string;
  representante_bairro: string;
  representante_cidade: string;
  representante_estado: string;
  crpDocumento: FileList;
  rgDocumento: FileList;
  comprovanteEndereco: FileList;
  comprovanteEndEmpresaDocumento: FileList;
  simplesNacionalDocumento: FileList;
  responsavel: string; 
  emailEmpresa?: string; 
  telefoneEmpresa?: string; 
  simplesNacional?: string; 
};
interface Props {
  getInputClass: (field: string, extra?: string) => string;
  crpFileRef: React.RefObject<HTMLInputElement | null>;
  rgFileRef: React.RefObject<HTMLInputElement | null>;
  cnpjFileRef: React.RefObject<HTMLInputElement | null>;
  crpUploaded: boolean;
  rgUploaded: boolean;
  cnpjUploaded: boolean;
  handleFileChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    setUploaded: React.Dispatch<React.SetStateAction<boolean>>,
    fieldName: string
  ) => void;
  setCRPUploaded: React.Dispatch<React.SetStateAction<boolean>>;
  setRGUploaded: React.Dispatch<React.SetStateAction<boolean>>;
  setCNPJUploaded: React.Dispatch<React.SetStateAction<boolean>>;
  form: UseFormReturn<JuridicoFormFields>;
}

export const FormJuridico: React.FC<Props> = ({
  getInputClass,
  crpFileRef,
  rgFileRef,
  cnpjFileRef,
  crpUploaded,
  rgUploaded,
  cnpjUploaded,
  handleFileChange,
  setCRPUploaded,
  setRGUploaded,
  setCNPJUploaded,
  form
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [docType, setDocType] = useState<
    | "crp"
    | "rgCpf"
    | "comprovanteEndereco"
    | "contratoSocial"
    | "comprovanteEndEmpresa"
    | "rgCpfSocio"
    | "cartaoCnpj"
    | "rgDocumento"
    | "rgCpfRep"
    | "simplesNacionalDocumento"
    | null
  >(null);

  // Estados para armazenar os arquivos
  const [crpFileName, setCrpFileName] = useState<string | null>(null);
  const [rgFileName, setRgFileName] = useState<string | null>(null);
  const [cnpjFileName, setCnpjFileName] = useState<string | null>(null);

  // Estados para novos arquivos
  const [rgCpfRepFileName, setRgCpfRepFileName] = useState<string | null>(null);
  const [contratoSocialFileName, setContratoSocialFileName] = useState<string | null>(null);
  const [comprovanteEndEmpresaFileName, setComprovanteEndEmpresaFileName] = useState<string | null>(null);
  // Estado para Simples Nacional
  const [simplesNacionalFileName, setSimplesNacionalFileName] = useState<string | null>(null);

  // Refs para novos arquivos
  const rgCpfRepFileRef = React.useRef<HTMLInputElement | null>(null);
  const contratoSocialFileRef = React.useRef<HTMLInputElement | null>(null);
  const comprovanteEndEmpresaFileRef = React.useRef<HTMLInputElement | null>(null); 
  // Ref para Simples Nacional
  const simplesNacionalFileRef = React.useRef<HTMLInputElement | null>(null);

  // Estados de upload dos novos arquivos
  const [rgCpfRepUploaded, setRgCpfRepUploaded] = useState(false);
  const [contratoSocialUploaded, setContratoSocialUploaded] = useState(false);
  const [comprovanteEndEmpresaUploaded, setComprovanteEndEmpresaUploaded] = useState(false);
  // Estado de upload do Simples Nacional
  const [simplesNacionalUploaded, setSimplesNacionalUploaded] = useState(false);

  // Função para abrir o modal
  const handleOpenModal = (
    type: "crp" | "rgCpf" | "comprovanteEndereco" | "rgCpfRep" | "contratoSocial" | "comprovanteEndEmpresa" | "simplesNacionalDocumento"
  ) => {
    setDocType(type);
    setModalOpen(true);
  };

  // Função para remover arquivo
  const handleRemoveFile = (
    type: "crp" | "rgCpf" | "comprovanteEndereco" | "rgCpfRep" | "contratoSocial" | "comprovanteEndEmpresa" | "simplesNacionalDocumento"
  ) => {
    if (type === "crp") {
      setCrpFileName(null);
      setCRPUploaded(false);
      if (crpFileRef.current) crpFileRef.current.value = "";
    }
    if (type === "rgCpf") {
      setRgFileName(null);
      setRGUploaded(false);
      if (rgFileRef.current) rgFileRef.current.value = "";
    }
    if (type === "comprovanteEndereco") {
      setCnpjFileName(null);
      setCNPJUploaded(false);
      if (cnpjFileRef.current) cnpjFileRef.current.value = "";
    }
    if (type === "rgCpfRep") {
      setRgCpfRepFileName(null);
      setRgCpfRepUploaded(false);
      if (rgCpfRepFileRef.current) rgCpfRepFileRef.current.value = "";
    }
    if (type === "contratoSocial") {
      setContratoSocialFileName(null);
      setContratoSocialUploaded(false);
      if (contratoSocialFileRef.current) contratoSocialFileRef.current.value = "";
    }
    if (type === "comprovanteEndEmpresa") {
      setComprovanteEndEmpresaFileName(null);
      setComprovanteEndEmpresaUploaded(false);
      if (comprovanteEndEmpresaFileRef.current) comprovanteEndEmpresaFileRef.current.value = "";
    }
    if (type === "simplesNacionalDocumento") {
      setSimplesNacionalFileName(null);
      setSimplesNacionalUploaded(false);
      if (simplesNacionalFileRef.current) simplesNacionalFileRef.current.value = "";
    }
  };

  // Função para upload de arquivo
  const handleUpload = (file: File) => {
    if (docType === "crp") {
      setCrpFileName(file.name);
      handleFileChange({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>, setCRPUploaded, "crpDocumento");
    }
    if (docType === "rgCpf") {
      setRgFileName(file.name);
      handleFileChange({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>, setRGUploaded, "rgDocumento");
    }
    if (docType === "comprovanteEndereco") {
      setCnpjFileName(file.name);
      handleFileChange({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>, setCNPJUploaded, "cnpjDocumento");
    }
    if (docType === "rgCpfRep") {
      setRgCpfRepFileName(file.name);
      handleFileChange({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>, setRgCpfRepUploaded, "rgCpfRepDocumento");
    }
    if (docType === "contratoSocial") {
      setContratoSocialFileName(file.name);
      handleFileChange({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>, setContratoSocialUploaded, "contratoSocialDocumento");
    }
    if (docType === "comprovanteEndEmpresa") {
      setComprovanteEndEmpresaFileName(file.name);
      handleFileChange({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>, setComprovanteEndEmpresaUploaded, "comprovanteEndEmpresaDocumento");
    }
    if (docType === "simplesNacionalDocumento") {
      setSimplesNacionalFileName(file.name);
      handleFileChange({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>, setSimplesNacionalUploaded, "simplesNacionalDocumento");
    }
    setModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-3 px-4 md:px-0 max-w-[792px] w-full mx-auto">
      {/* Dados da empresa */}
      <h3 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#212529] align-middle mb-2">
        Dados da empresa
      </h3>
      <div className="flex flex-col gap-2">
        <FormInput
          placeholder="Nome completo*"
          type="text"
          autoComplete="off"
          {...form.register("responsavel")}
          className={`${getInputClass("responsavel")} rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#6D75C0] transition-all duration-200 shadow-sm`}
        />
        <FormInput
          placeholder="E-mail*"
          type="email"
          autoComplete="off"
          {...form.register("emailEmpresa")}
          className={`${getInputClass("emailEmpresa")} rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#6D75C0] transition-all duration-200 shadow-sm`}
        />
        <div className="flex flex-col md:flex-row gap-2">
          <FormInput
            placeholder="Telefone com DDD*"
            type="text"
            autoComplete="off"
            mask={maskTelefone}
            {...form.register("telefoneEmpresa")}
            className={`${getInputClass("telefoneEmpresa", "flex-1")} rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#6D75C0] transition-all duration-200 shadow-sm`}
          />
          <FormInput
            placeholder="CNPJ*"
            type="text"
            autoComplete="off"
            mask={maskCpfCnpj}
            {...form.register("cnpj")}
            className={`${getInputClass("cnpj", "flex-1")} rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#6D75C0] transition-all duration-200 shadow-sm`}
          />
          <FormInput
            placeholder="CRP*"
            type="text"
            autoComplete="off"
            maxLength={12}
            {...form.register("crp")}
            className={`${getInputClass("crp", "flex-1")} rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#6D75C0] transition-all duration-200 shadow-sm`}
          />
        </div>
        <FormInput
          placeholder="Razão Social*"
          type="text"
          autoComplete="off"
          {...form.register("razaoSocial")}
          className={`${getInputClass("razaoSocial")} rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#6D75C0] transition-all duration-200 shadow-sm`}
        />
        <FormInput
          placeholder="Nome fantasia*"
          type="text"
          autoComplete="off"
          {...form.register("nomeFantasia")}
          className={`${getInputClass("nomeFantasia")} rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#6D75C0] transition-all duration-200 shadow-sm`}
        />
        <div className="mt-2"> {/* Espaçamento reduzido de mt-4 para mt-2 */}
          <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#212529] mb-2">
            Simples nacional?
          </h4>
          <div className="flex gap-4 items-center"> {/* gap reduzido de 6 para 4 */}
            <label className="flex items-center gap-2 font-fira-sans text-[16px] text-[#212529]">
              <input
                type="radio"
                {...form.register("simplesNacional")}
                value="sim"
                className="accent-[#6D75C0] w-5 h-5"
              />
              Sim
            </label>
            <label className="flex items-center gap-2 font-fira-sans text-[16px] text-[#212529]">
              <input
                type="radio"
                {...form.register("simplesNacional")}
                value="nao"
                className="accent-[#6D75C0] w-5 h-5"
              />
              Não
            </label>
          </div>
        </div>
      </div>

      {/* Dados de endereço */}
      <div className="mt-6">
        <h3 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#212529] align-middle mb-2">
          Dados de endereço
        </h3>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col md:flex-row gap-2">
           <FormInput
              placeholder="CEP*"
              type="text"
              autoComplete="off"
              mask={maskCep}
              {...form.register("cep")}
              onBlur={async e => {
                const endereco = await fillFormAddressByCep(e.target.value);
                if (endereco) {
                  form.setValue("endereco", endereco.logradouro || "", { shouldValidate: true, shouldDirty: true });
                  form.setValue("complemento", endereco.complemento || "", { shouldValidate: true, shouldDirty: true });
                  form.setValue("bairro", endereco.bairro || "", { shouldValidate: true, shouldDirty: true });
                  form.setValue("cidade", endereco.localidade || "", { shouldValidate: true, shouldDirty: true });
                  form.setValue("estado", endereco.uf || "", { shouldValidate: true, shouldDirty: true });
                }
              }}
              className="w-32 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#6D75C0] transition-all duration-200 shadow-sm"
            />
            <FormInput
              placeholder="Endereço*"
              type="text"
              autoComplete="off"
              {...form.register("endereco")}
              className={`${getInputClass("endereco", "flex-1")} rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#6D75C0] transition-all duration-200 shadow-sm`}
            />
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <FormInput
              placeholder="Número*"
              type="text"
              autoComplete="off"
              {...form.register("numero")}
              className={`${getInputClass("numero", "flex-1")} rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#6D75C0] transition-all duration-200 shadow-sm`}
            />
            <FormInput
              placeholder="Complemento"
              type="text"
              autoComplete="off"
              {...form.register("complemento")}
              className={`${getInputClass("complemento", "flex-1")} rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#6D75C0] transition-all duration-200 shadow-sm`}
            />
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <FormInput
              placeholder="Bairro*"
              type="text"
              autoComplete="off"
              {...form.register("bairro")}
              className={`${getInputClass("bairro", "flex-1")} rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#6D75C0] transition-all duration-200 shadow-sm`}
            />
            <FormInput
              name="cidade"
              placeholder="Cidade*"
              type="text"
              autoComplete="off"
              className={`${getInputClass("cidade", "flex-1")} rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#6D75C0] transition-all duration-200 shadow-sm`}
            />
            <FormInput
              name="estado"
              placeholder="Estado*"
              type="text"
              autoComplete="off"
              className={`${getInputClass("estado", "flex-1")} rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#6D75C0] transition-all duration-200 shadow-sm`}
            />
          </div>
        </div>
      </div>

      {/* Documentos */}
      <div className="mt-6">
        <h3 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#212529] align-middle mb-2">
          Insira seus documentos
        </h3>
        <span
          className="font-fira-sans font-normal text-[14px] leading-[20px] align-middle text-[#49525A] mb-4"
        >
          Precisamos de alguns documentos que são importantes para a análise e aprovação do seu cadastro:
        </span>
        <div className="flex flex-col gap-6 md:gap-3">
          {/* CRP */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 relative">
              {!crpFileName && (
                <>
                  <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] align-middle w-24">
                    CRP
                  </h4>
                  <button
                    type="button"
                    className="flex items-center gap-2 ml-auto px-4 h-[40px] cursor-pointer"
                    onClick={() => handleOpenModal("crp")}
                  >
                    <Image src="/icons/upload.svg" alt="Upload" className="w-5 h-5"  width={20} height={20}/>
                    <span className="font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle hidden md:inline">
                      Inserir documento
                    </span>
                    {crpUploaded && (
                      <Image src="/assets/icons/check.svg" alt="Enviado" className="w-5 h-5 text-green-500"  width={20} height={20} />
                    )}
                  </button>
                </>
              )}
            </div>
            {crpFileName && (
              <div className="w-full flex flex-col bg-[#F1F2F4] border border-[#CACFD4] rounded-[4px] px-4 py-2 gap-1 mt-1" style={{ minHeight: "68px" }}>
                <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] mb-1">CRP</h4>
                <div className="flex items-center justify-between w-full">
                  <span className="text-[#212529] text-sm truncate">{crpFileName}</span>
                  <button
                    type="button"
                    className="ml-2"
                    onClick={() => handleRemoveFile("crp")}
                    aria-label="Remover documento CRP"
                  >
                    <Image src="/icons/trash.svg" alt="Remover" className="w-5 h-5"  width={20} height={20} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RG */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 relative">
              {!rgFileName && (
                <>
                  <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] align-middle w-24">
                    CNH/RG
                  </h4>
                  <button
                    type="button"
                    className="flex items-center gap-2 ml-auto px-4 h-[40px] cursor-pointer"
                    onClick={() => handleOpenModal("rgCpf")}
                  >
                    <Image src="/icons/upload.svg" alt="Upload" className="w-5 h-5"  width={20} height={20}/>
                    <span className="font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle hidden md:inline">
                      Inserir documento
                    </span>
                    {rgUploaded && (
                      <Image src="/assets/icons/check.svg" alt="Enviado" className="w-5 h-5 text-green-500"  width={20} height={20}/>
                    )}
                  </button>
                </>
              )}
            </div>
            {rgFileName && (
              <div className="w-full flex flex-col bg-[#F1F2F4] border border-[#CACFD4] rounded-[4px] px-4 py-2 gap-1 mt-1" style={{ minHeight: "68px" }}>
                <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] mb-1">CNH/RG</h4>
                <div className="flex items-center justify-between w-full">
                  <span className="text-[#212529] text-sm truncate">{rgFileName}</span>
                  <button
                    type="button"
                    className="ml-2"
                    onClick={() => handleRemoveFile("rgCpf")}
                    aria-label="Remover documento RG"
                  >
                    <Image src="/icons/trash.svg" alt="Remover" className="w-5 h-5"  width={20} height={20} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CNPJ */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 relative">
              {!cnpjFileName && (
                <>
                  <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] align-middle w-24">
                    CNPJ
                  </h4>
                  <button
                    type="button"
                    className="flex items-center gap-2 ml-auto px-4 h-[40px] cursor-pointer"
                    onClick={() => handleOpenModal("comprovanteEndereco")}
                  >
                    <Image src="/icons/upload.svg" alt="Upload" className="w-5 h-5"  width={20} height={20} />
                    <span className="font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle hidden md:inline">
                      Inserir documento
                    </span>
                    {cnpjUploaded && (
                      <Image src="/assets/icons/check.svg" alt="Enviado" className="w-5 h-5 text-green-500"  width={20} height={20} />
                    )}
                  </button>
                </>
              )}
            </div>
            {cnpjFileName && (
              <div className="w-full flex flex-col bg-[#F1F2F4] border border-[#CACFD4] rounded-[4px] px-4 py-2 gap-1 mt-1" style={{ minHeight: "68px" }}>
                <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] mb-1">CNPJ</h4>
                <div className="flex items-center justify-between w-full">
                  <span className="text-[#212529] text-sm truncate">{cnpjFileName}</span>
                  <button
                    type="button"
                    className="ml-2"
                    onClick={() => handleRemoveFile("comprovanteEndereco")}
                    aria-label="Remover documento CNPJ"
                  >
                    <Image src="/icons/trash.svg" alt="Remover" className="w-5 h-5"  width={20} height={20} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RG/CPF Representante */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 relative">
              {!rgCpfRepFileName && (
                <>
                  <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] align-middle w-56">
                    RG/CPF Representante
                  </h4>
                  <button
                    type="button"
                    className="flex items-center gap-2 ml-auto px-4 h-[40px] cursor-pointer"
                    onClick={() => handleOpenModal("rgCpfRep")}
                  >
                    <Image src="/icons/upload.svg" alt="Upload" className="w-5 h-5"  width={20} height={20} />
                    <span className="font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle hidden md:inline">
                      Inserir documento
                    </span>
                    {rgCpfRepUploaded && (
                      <Image src="/assets/icons/check.svg" alt="Enviado" className="w-5 h-5 text-green-500"  width={20} height={20} />
                    )}
                  </button>
                </>
              )}
            </div>
            {rgCpfRepFileName && (
              <div className="w-full flex flex-col bg-[#F1F2F4] border border-[#CACFD4] rounded-[4px] px-4 py-2 gap-1 mt-1" style={{ minHeight: "68px" }}>
                <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] mb-1">RG/CPF Representante</h4>
                <div className="flex items-center justify-between w-full">
                  <span className="text-[#212529] text-sm truncate">{rgCpfRepFileName}</span>
                  <button
                    type="button"
                    className="ml-2"
                    onClick={() => handleRemoveFile("rgCpfRep")}
                    aria-label="Remover documento RG/CPF Representante"
                  >
                    <Image src="/icons/trash.svg" alt="Remover" className="w-5 h-5"  width={20} height={20} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Contrato social */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 relative">
              {!contratoSocialFileName && (
                <>
                  <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] align-middle w-56">
                    Contrato social
                  </h4>
                  <button
                    type="button"
                    className="flex items-center gap-2 ml-auto px-4 h-[40px] cursor-pointer"
                    onClick={() => handleOpenModal("contratoSocial")}
                  >
                    <Image src="/icons/upload.svg" alt="Upload" className="w-5 h-5"  width={20} height={20} />
                    <span className="font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle hidden md:inline">
                      Inserir documento
                    </span>
                    {contratoSocialUploaded && (
                      <Image src="/assets/icons/check.svg" alt="Enviado" className="w-5 h-5 text-green-500"  width={20} height={20} />
                    )}
                  </button>
                </>
              )}
            </div>
            {contratoSocialFileName && (
              <div className="w-full flex flex-col bg-[#F1F2F4] border border-[#CACFD4] rounded-[4px] px-4 py-2 gap-1 mt-1" style={{ minHeight: "68px" }}>
                <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] mb-1">Contrato social</h4>
                <div className="flex items-center justify-between w-full">
                  <span className="text-[#212529] text-sm truncate">{contratoSocialFileName}</span>
                  <button
                    type="button"
                    className="ml-2"
                    onClick={() => handleRemoveFile("contratoSocial")}
                    aria-label="Remover documento Contrato social"
                  >
                    <Image src="/icons/trash.svg" alt="Remover" className="w-5 h-5"  width={20} height={20} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Comprovante endereço empresa */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 relative">
              {!comprovanteEndEmpresaFileName && (
                <>
                  <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] align-middle w-56">
                    Comprovante endereço empresa (últimos 90 dias)
                  </h4>
                  <button
                    type="button"
                    className="flex items-center gap-2 ml-auto px-4 h-[40px] cursor-pointer"
                    onClick={() => handleOpenModal("comprovanteEndEmpresa")}
                  >
                    <Image src="/icons/upload.svg" alt="Upload" className="w-5 h-5"  width={20} height={20} />
                    <span className="font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle hidden md:inline">
                      Inserir documento
                    </span>
                    {comprovanteEndEmpresaUploaded && (
                      <Image src="/assets/icons/check.svg" alt="Enviado" className="w-5 h-5 text-green-500"  width={20} height={20} />
                    )}
                  </button>
                </>
              )}
            </div>
            {comprovanteEndEmpresaFileName && (
              <div className="w-full flex flex-col bg-[#F1F2F4] border border-[#CACFD4] rounded-[4px] px-4 py-2 gap-1 mt-1" style={{ minHeight: "68px" }}>
                <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] mb-1">Comprovante endereço empresa (últimos 90 dias)</h4>
                <div className="flex items-center justify-between w-full">
                  <span className="text-[#212529] text-sm truncate">{comprovanteEndEmpresaFileName}</span>
                  <button
                    type="button"
                    className="ml-2"
                    onClick={() => handleRemoveFile("comprovanteEndEmpresa")}
                    aria-label="Remover documento Comprovante endereço empresa"
                  >
                    <Image src="/icons/trash.svg" alt="Remover" className="w-5 h-5"  width={20} height={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
           {/* Ducumento Simples Nacional */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 relative">
              {!simplesNacionalFileName && (
                <>
                  <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] align-middle w-56">
                    Simples Nacional
                  </h4>
                  <button
                    type="button"
                    className="flex items-center gap-2 ml-auto px-4 h-[40px] cursor-pointer"
                    onClick={() => handleOpenModal("simplesNacionalDocumento")}
                  >
                    <Image src="/icons/upload.svg" alt="Upload" className="w-5 h-5" width={20} height={20} />
                    <span className="font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle hidden md:inline">
                      Inserir documento
                    </span>
                    {simplesNacionalUploaded && (
                      <Image src="/assets/icons/check.svg" alt="Enviado" className="w-5 h-5 text-green-500" width={20} height={20} />
                    )}
                  </button>
                </>
              )}
            </div>
            {simplesNacionalFileName && (
              <div className="w-full flex flex-col bg-[#F1F2F4] border border-[#CACFD4] rounded-[4px] px-4 py-2 gap-1 mt-1" style={{ minHeight: "68px" }}>
                <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] mb-1">Simples Nacional</h4>
                <div className="flex items-center justify-between w-full">
                  <span className="text-[#212529] text-sm truncate">{simplesNacionalFileName}</span>
                  <button
                    type="button"
                    className="ml-2"
                    onClick={() => handleRemoveFile("simplesNacionalDocumento")}
                    aria-label="Remover documento Simples Nacional"
                  >
                    <Image src="/icons/trash.svg" alt="Remover" className="w-5 h-5" width={20} height={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de upload */}
      <UploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        docType={docType}
        onUpload={handleUpload}
        field={docType}
      />

      {/* Consulta Simples Nacional */}
      <div className="mt-8">
        <span className="font-fira-sans font-normal text-[16px] leading-[24px] align-middle text-[#6D75C0]">
          Para consultar a situação do Simples Nacional da sua empresa, acesse o link abaixo:
        </span>
        <Link
          href="https://www8.receita.fazenda.gov.br/SimplesNacional/aplicacoes.aspx?id=cnpj"
          target="_blank"
          rel="noopener noreferrer"
          className="font-fira-sans font-normal text-[16px] leading-[24px] align-middle text-[#6D75C0] underline ml-2"
        >
          Consulta Simples Nacional
        </Link>
      </div>
    </div>
  );
};
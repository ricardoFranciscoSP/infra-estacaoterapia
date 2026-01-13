import React, { useState } from "react";
import { FormInput } from "@/components/FormInput";
import { maskCpfCnpj, maskTelefone, maskCep } from "@/utils/masks";
import { UploadModal } from "./UploadModal";
import { fillFormAddressByCep } from "@/utils/cepUtils";
import Image from "next/image";
import type { UseFormReturn } from "react-hook-form";
import { PsicologoFormFields } from "./PsicologoRegisterFormAutonomo";
import { DatePickerTailwind } from "@/components/DatePickerMaterial";

interface Props {
  getInputClass: (field: string, extra?: string) => string;
  crpFileRef: React.RefObject<HTMLInputElement | null>;
  rgFileRef: React.RefObject<HTMLInputElement | null>;
  cnpjFileRef: React.RefObject<HTMLInputElement | null>;
  comprovacaoIssRef: React.RefObject<HTMLInputElement | null>;
  crpUploaded: boolean;
  rgUploaded: boolean;
  cnpjUploaded: boolean;
  comprovacaoIssUploaded: boolean;
  handleFileChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    setUploaded: React.Dispatch<React.SetStateAction<boolean>>,
    fieldName: string // Corrigido para string
  ) => void;
  setCRPUploaded: React.Dispatch<React.SetStateAction<boolean>>;
  setRGUploaded: React.Dispatch<React.SetStateAction<boolean>>;
  setCNPJUploaded: React.Dispatch<React.SetStateAction<boolean>>;
  setComprovacaoIssUploaded: React.Dispatch<React.SetStateAction<boolean>>;
  form: UseFormReturn<PsicologoFormFields>; 
}

export const FormAutonomo: React.FC<Props> = ({
  getInputClass,
  crpFileRef,
  rgFileRef,
  cnpjFileRef,
  crpUploaded,
  rgUploaded,
  cnpjUploaded,
  comprovacaoIssRef,
  handleFileChange,
  setCRPUploaded,
  setRGUploaded,
  setCNPJUploaded,
  setComprovacaoIssUploaded,
  form
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [docType, setDocType] = useState<"crp" | "rgCpf" | "comprovanteEndereco" | "comprovacaoIss" | null>(null);

  // Estados para armazenar os arquivos
  const [crpFileName, setCrpFileName] = useState<string | null>(null);
  const [rgFileName, setRgFileName] = useState<string | null>(null);
  const [cnpjFileName, setCnpjFileName] = useState<string | null>(null);
  const [comprovacaoIssFileName, setComprovacaoIssFileName] = useState<string | null>(null);

  const handleOpenModal = (type: "crp" | "rgCpf" | "comprovanteEndereco" | "comprovacaoIss") => {
    setDocType(type);
    setModalOpen(true);
  };

  // Função para remover arquivo
  const handleRemoveFile = (type: "crp" | "rgCpf" | "comprovanteEndereco" | "comprovacaoIss") => {
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
    if (type === "comprovacaoIss") {
      setComprovacaoIssFileName(null);
      setComprovacaoIssUploaded(false);
      if (comprovacaoIssRef.current) comprovacaoIssRef.current.value = "";
    }
  };

  // Atualiza nome do arquivo ao fazer upload
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
      handleFileChange({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>, setCNPJUploaded, "comprovanteEndereco");
    }
    if (docType === "comprovacaoIss") {
      setComprovacaoIssFileName(file.name);
      handleFileChange({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>, setComprovacaoIssUploaded, "comprovacaoIss");
    }
    setModalOpen(false);
  };

  // Função para preencher os campos de endereço com prefixo
  const handleAutonomoCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const rawCep = e.target.value;
    const cep = rawCep?.replace(/\D/g, "");

    if (cep && cep.length === 8) {
      try {
        const endereco = await fillFormAddressByCep(cep);
        if (endereco) {
          form.setValue("endereco", endereco.logradouro || "", { shouldValidate: true, shouldDirty: true });
          form.setValue("complemento", endereco.complemento || "", { shouldValidate: true, shouldDirty: true });
          form.setValue("bairro", endereco.bairro || "", { shouldValidate: true, shouldDirty: true });
          form.setValue("cidade", endereco.localidade || "", { shouldValidate: true, shouldDirty: true });
          form.setValue("estado", endereco.uf || "", { shouldValidate: true, shouldDirty: true });
        }
      } catch (error) {
        console.error("Erro ao buscar endereço pelo CEP:", error);
      }
    }
  };

  return (
    <div className="flex flex-col gap-3 px-4 md:px-0 max-w-[792px] w-full mx-auto">
      <h3 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#212529] align-middle mb-2">
        Dados pessoais
      </h3>
      <div className="flex flex-col gap-2">
        <FormInput
          name="pronome"
          as="select"
          className="w-full h-[40px] rounded-[6px] border border-[#75838F] bg-[#FCFBF6] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9] font-fira-sans"
        >
          <option value="" disabled hidden>
            Como gostaria de ser chamado?*
          </option>
          <option value="Dr.">Dr.</option>
          <option value="Dra.">Dra.</option>
          <option value="Psic.">Psic.</option>
          <option value="Prof.">Prof.</option>
          <option value="Mestre">Mestre</option>
          <option value="PhD">PhD</option>
          <option value="outro">Outro</option>
        </FormInput>
      </div>
      <div className="flex flex-col gap-2">
        <FormInput
          name="nome"
          placeholder="Nome completo*"
          type="text"
          autoComplete="off"
          className={getInputClass("nome")}
        />
      </div>
      <div className="flex flex-col gap-2">
        <FormInput
          name="email"
          placeholder="E-mail*"
          type="email"
          autoComplete="off"
          className={getInputClass("email")}
        />
      </div>
      <div className="flex flex-col md:flex-row gap-2">
        <FormInput
          name="cpf"
          placeholder="CPF*"
          type="text"
          autoComplete="off"
          mask={maskCpfCnpj}
          className={getInputClass("cpf", "flex-1")}
        />
        <FormInput
          name="crp"
          placeholder="CRP*"
          type="text"
          autoComplete="off"
          maxLength={12}
          className={getInputClass("crp", "flex-1")}
        />
        <div className="flex flex-col flex-1">
          <DatePickerTailwind
            name="dataNascimento"
            control={form.control}
            placeholder="Data de nascimento*"
            className={(() => {
              const hasError = !!form.formState.errors.dataNascimento;
              const isTouched = !!form.formState.touchedFields.dataNascimento;
              const hasValue = !!form.watch("dataNascimento");
              const isValid = !hasError && isTouched && hasValue;
              return hasError ? "border-red-500" : isValid ? "border-green-500" : "border-[#75838F]";
            })()}
          />
          {form.formState.errors.dataNascimento && (
            <span className="text-red-500 text-xs block mt-1">
              {form.formState.errors.dataNascimento.message as string}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <FormInput
          name="telefone"
          placeholder="Telefone com DDD*"
          type="text"
          autoComplete="off"
          mask={maskTelefone}
          className={getInputClass("telefone")}
        />
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
              onBlur={handleAutonomoCepBlur}
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
      {/* Bloco de documentos */}
      <div className="mt-6">
        <h3 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#212529] align-middle mb-2">
          Insira seus documentos
        </h3>
        <span
          className="font-fira-sans font-normal text-[16px] leading-[24px] align-middle text-[#49525A] mb-4"
        >
          Precisamos de alguns documentos que são importantes para a análise e aprovação do seu cadastro:
        </span>
        <div className="flex flex-col gap-6 md:gap-3">
          {/* CRP */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 relative">
              {!crpFileName && (
                <>
                  <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] align-middle w-48">
                    CRP
                  </h4>
                  <button
                    type="button"
                    className="flex items-center gap-2 ml-auto px-4 h-[40px] cursor-pointer"
                    onClick={() => handleOpenModal("crp")}
                  >
                    <Image src="/icons/upload.svg" alt="Upload" width={20} height={20} className="w-5 h-5" />
                    <span className="font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle hidden md:inline">
                      Inserir documento
                    </span>
                    {crpUploaded && (
                      <Image src="/assets/icons/check.svg" alt="Enviado" width={20} height={20} className="w-5 h-5 text-green-500" />
                    )}
                  </button>
                </>
              )}
            </div>
            {crpFileName && (
              <div className="w-full flex flex-col bg-[#F1F2F4] border border-[#CACFD4] rounded-[4px] px-4 py-2 gap-1 mt-1" style={{ minHeight: "68px" }}>
                <h4 className="font-fira font-semibold text-[18px] leading-[24px] text-[#49525A] mb-1">CRP</h4>
                <div className="flex items-center justify-between w-full">
                  <span className="text-[#212529] text-sm truncate">{crpFileName}</span>
                  <button
                    type="button"
                    className="ml-2"
                    onClick={() => handleRemoveFile("crp")}
                    aria-label="Remover documento CRP"
                  >
                    <Image src="/icons/trash.svg" alt="Remover" width={20} height={20} className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* RG/CPF */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 relative">
              {!rgFileName && (
                <>
                  <h4 className="font-fira font-semibold text-[18px] leading-[24px] text-[#49525A] align-middle w-24">
                   CPF
                  </h4>
                  <button
                    type="button"
                    className="flex items-center gap-2 ml-auto px-4 h-[40px] cursor-pointer"
                    onClick={() => handleOpenModal("rgCpf")}
                  >
                    <Image src="/icons/upload.svg" alt="Upload" width={20} height={20} className="w-5 h-5" />
                    <span className="font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle hidden md:inline">
                      Inserir documento
                    </span>
                    {rgUploaded && (
                      <Image src="/assets/icons/check.svg" alt="Enviado" width={20} height={20} className="w-5 h-5 text-green-500" />
                    )}
                  </button>
                </>
              )}
            </div>
            {rgFileName && (
              <div className="w-full flex flex-col bg-[#F1F2F4] border border-[#CACFD4] rounded-[4px] px-4 py-2 gap-1 mt-1" style={{ minHeight: "68px" }}>
                <h4 className="font-fira font-semibold text-[18px] leading-[24px] text-[#49525A] mb-1">CPF</h4>
                <div className="flex items-center justify-between w-full">
                  <span className="text-[#212529] text-sm truncate">{rgFileName}</span>
                  <button
                    type="button"
                    className="ml-2"
                    onClick={() => handleRemoveFile("rgCpf")}
                    aria-label="Remover documento RG/CPF"
                  >
                    <Image src="/icons/trash.svg" alt="Remover" width={20} height={20} className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Comprovante de endereço */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 relative">
              {!cnpjFileName && (
                <>
                  <h4 className="font-fira font-semibold text-[18px] leading-[24px] text-[#49525A] align-middle w-48">
                    Comprovante endereço
                  </h4>
                  <span className="font-fira-sans text-[14px] text-[#49525A] ml-2 hidden md:inline">
                    (últimos 90 dias)
                  </span>
                  <button
                    type="button"
                    className="flex items-center gap-2 ml-auto px-4 h-[40px] cursor-pointer"
                    onClick={() => handleOpenModal("comprovanteEndereco")}
                  >
                    <Image src="/icons/upload.svg" alt="Upload" width={20} height={20} className="w-5 h-5" />
                    <span className="font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle hidden md:inline">
                      Inserir documento
                    </span>
                    {cnpjUploaded && (
                      <Image src="/assets/icons/check.svg" alt="Enviado" width={20} height={20} className="w-5 h-5 text-green-500" />
                    )}
                  </button>
                </>
              )}
            </div>
            {cnpjFileName && (
              <div className="w-full flex flex-col bg-[#F1F2F4] border border-[#CACFD4] rounded-[4px] px-4 py-2 gap-1 mt-1" style={{ minHeight: "68px" }}>
                <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] mb-1">Comprovante endereço</h4>
                <div className="flex items-center justify-between w-full">
                  <span className="text-[#212529] text-sm truncate">{cnpjFileName}</span>
                  <button
                    type="button"
                    className="ml-2"
                    onClick={() => handleRemoveFile("comprovanteEndereco")}
                    aria-label="Remover comprovante de endereço"
                  >
                    <Image src="/icons/trash.svg" alt="Remover" width={20} height={20} className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Comprovação incidência de ISS */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 relative">
              {!comprovacaoIssFileName && (
                <>
                  <h4 className="font-fira font-semibold text-[18px] leading-[24px] text-[#49525A] align-middle w-56">
                    Comprovação de atuação autônoma
                  </h4>
                  <button
                    type="button"
                    className="flex items-center gap-2 ml-auto px-4 h-[40px] cursor-pointer"
                    onClick={() => handleOpenModal("comprovacaoIss")}
                  >
                    <Image src="/icons/upload.svg" alt="Upload" width={20} height={20} className="w-5 h-5" />
                    <span className="font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle hidden md:inline">
                      Inserir documento
                    </span>
                    {comprovacaoIssRef && (
                      <Image src="/assets/icons/check.svg" alt="Enviado" width={20} height={20} className="w-5 h-5 text-green-500" />
                    )}
                  </button>
                </>
              )}
            </div>
            {comprovacaoIssFileName && (
              <div className="w-full flex flex-col bg-[#F1F2F4] border border-[#CACFD4] rounded-[4px] px-4 py-2 gap-1 mt-1" style={{ minHeight: "68px" }}>
                <h4 className="font-fira-sans font-semibold text-[18px] leading-[24px] text-[#49525A] mb-1">Comprovação de atuação autônoma no formulário de autônomo.</h4>
                <div className="flex items-center justify-between w-full">
                  <span className="text-[#212529] text-sm truncate">{comprovacaoIssFileName}</span>
                  <button
                    type="button"
                    className="ml-2"
                    onClick={() => handleRemoveFile("comprovacaoIss")}
                    aria-label="Remover documento Comprovação de atuação autônoma no formulário de autônomo."
                  >
                    <Image src="/icons/trash.svg" alt="Remover" width={20} height={20} className="w-5 h-5" />
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
        field={
          docType === "crp"
            ? "crpDocumento"
            : docType === "rgCpf"
            ? "rgDocumento"
            : docType === "comprovanteEndereco"
            ? "comprovanteEndereco"
            : docType === "comprovacaoIss"
            ? "comprovacaoIss"
            : null
        }
      />
    </div>
  );
};
import React from "react";
import Image from "next/image";
import { psicologoAutonomoRegisterSchema } from "@/app/(auth)/register/schemas";
import { z } from "zod";
import { UseFormReturn } from "react-hook-form";

export type PsicologoAutonomoFormFields = z.infer<typeof psicologoAutonomoRegisterSchema>;

export interface UploadsAutonomoProps {
  form: UseFormReturn<PsicologoAutonomoFormFields>;
  handleOpenUploadModal: (field: string) => void;
  handleRemoveFile: (field: keyof PsicologoAutonomoFormFields) => void;
  DocumentoEnviado: React.FC<{ 
    titulo: string; 
    fileList: FileList | undefined; 
    onRemove: () => void;
    isObrigatorio?: boolean;
    hasError?: boolean;
  }>;
}

export const UploadsAutonomo: React.FC<UploadsAutonomoProps> = ({
  form,
  handleOpenUploadModal,
  handleRemoveFile,
  DocumentoEnviado,
}) => {
  const crp = form.watch("crpDocumento");
  const rg = form.watch("rgDocumento");
  const comprovanteEnd = form.watch("comprovanteEndereco");
  const comprovacaoIss = form.watch("comprovacaoIss");
  
  const crpError = form.formState.errors.crpDocumento;
  const rgError = form.formState.errors.rgDocumento;

  return (
  <div className="flex flex-col gap-2 mt-2 mb-2">
    <h4 className="font-fira-sans font-semibold text-[16px] leading-[24px] text-[#212529] mb-2">
      Envie seus documentos
    </h4>
    <span className="text-[#49525A] text-[14px] mb-2">
      Precisamos de alguns documentos que são importantes para a análise e aprovação do seu cadastro.
    </span>
    <div className="flex flex-col gap-2">
      {/* CRP - Obrigatório */}
      {crp && crp.length > 0 ? (
        <DocumentoEnviado
          titulo="CRP*"
          fileList={crp}
          onRemove={() => handleRemoveFile("crpDocumento")}
          isObrigatorio={true}
          hasError={!!crpError}
        />
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#212529] text-[15px]">CRP*</span>
            <button
              type="button"
              className="cursor-pointer text-[#8494E9] text-[15px] font-medium underline ml-2 flex items-center gap-1"
              onClick={() => handleOpenUploadModal("crpDocumento")}
            >
              <Image src="/icons/upload-lilas.svg" alt="upload" width={18} height={18} />
              Inserir documento
            </button>
          </div>
          {crpError && (
            <span className="text-red-500 text-xs">{crpError.message as string}</span>
          )}
        </div>
      )}
      {/* CPF - Obrigatório */}
      {rg && rg.length > 0 ? (
        <DocumentoEnviado
          titulo="CPF*"
          fileList={rg}
          onRemove={() => handleRemoveFile("rgDocumento")}
          isObrigatorio={true}
          hasError={!!rgError}
        />
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#212529] text-[15px]">CPF*</span>
            <button
              type="button"
              className="cursor-pointer text-[#8494E9] text-[15px] font-medium underline ml-2 flex items-center gap-1"
              onClick={() => handleOpenUploadModal("rgDocumento")}
            >
              <Image src="/icons/upload-lilas.svg" alt="upload" width={18} height={18} />
              Inserir documento
            </button>
          </div>
          {rgError && (
            <span className="text-red-500 text-xs">{rgError.message as string}</span>
          )}
        </div>
      )}
      {/* Comprovante endereço - Opcional */}
      {comprovanteEnd && comprovanteEnd.length > 0 ? (
        <DocumentoEnviado
          titulo="Comprovante endereço (últimos 90 dias)"
          fileList={comprovanteEnd}
          onRemove={() => handleRemoveFile("comprovanteEndereco")}
        />
      ) : (
        <div className="flex items-center justify-between mb-2">
          <span>
            <span className="block sm:hidden">Comprovante endereço</span>
            <span className="hidden sm:block">Comprovante endereço (últimos 90 dias)</span>
          </span>
          <button
            type="button"
            className="cursor-pointer text-[#8494E9] text-[15px] font-medium underline ml-2 flex items-center gap-1"
            onClick={() => handleOpenUploadModal("comprovanteEndereco")}
          >
            <Image src="/icons/upload-lilas.svg" alt="upload" width={18} height={18} />
            Inserir documento
          </button>
        </div>
      )}

      {/* Comprovação incidência de ISS - Opcional */}
      {comprovacaoIss && comprovacaoIss.length > 0 ? (
        <DocumentoEnviado
          titulo="Comprovação de atuação autônomo"
          fileList={comprovacaoIss}
          onRemove={() => handleRemoveFile("comprovacaoIss")}
        />
      ) : (
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#212529] text-[15px]">Comprovação de atuação autônomo</span>
          <button
            type="button"
            className="cursor-pointer text-[#8494E9] text-[15px] font-medium underline ml-2 flex items-center gap-1"
            onClick={() => handleOpenUploadModal("comprovacaoIss")}
          >
            <Image src="/icons/upload-lilas.svg" alt="upload" width={18} height={18} />
            Inserir documento
          </button>
        </div>
      )}
    </div>
  </div>
  );
};

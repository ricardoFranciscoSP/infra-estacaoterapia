import React from "react";
import Image from "next/image";
import type { UseFormReturn } from "react-hook-form";

export interface DocumentoConfig {
  key: string;
  label: string;
  isObrigatorio?: boolean;
}

// Torna o componente genérico para aceitar qualquer tipo de formulário
interface UploadDocumentosProps<T extends Record<string, unknown> = Record<string, unknown>> {
  form: UseFormReturn<T>;
  handleOpenUploadModal: (fieldName: keyof T | string) => void;
  handleRemoveFile: (field: keyof T | string) => void;
  DocumentoEnviado: React.FC<{
    titulo: string;
    fileList: FileList | undefined;
    onRemove: () => void;
    isObrigatorio?: boolean;
    hasError?: boolean;
  }>;
  documentos: DocumentoConfig[];
}

export const UploadDocumentos = <T extends Record<string, unknown> = Record<string, unknown>>({
  form,
  handleOpenUploadModal,
  handleRemoveFile,
  DocumentoEnviado,
  documentos,
}: UploadDocumentosProps<T>) => (
  <div className="flex flex-col gap-2 mt-6 mb-2">
    <h4 className="font-fira-sans font-semibold text-[16px] leading-[24px] text-[#212529] mb-2">
      Envie seus documentos
    </h4>
    <span className="text-[#49525A] text-[14px] mb-2">
      Precisamos de alguns documentos que são importantes para a análise e aprovação do seu cadastro.
    </span>
    <div className="flex flex-col gap-2">
      {documentos.map(doc => {
        // Garante que a chave é uma das propriedades de JuridicoFormFields
        // Usa Path<T> para garantir tipagem correta
        const value = form.getValues(doc.key as import("react-hook-form").Path<T>);
        // Verifica se é FileList
        const isFileList = value && typeof value === "object" && "length" in value && typeof value.length === "number" && value.length > 0;
        // Verifica se há erro de validação para este campo
        const fieldError = form.formState.errors[doc.key as keyof typeof form.formState.errors];
        const hasError = doc.isObrigatorio && !isFileList && !!fieldError;
        
        return isFileList ? (
          <DocumentoEnviado
            key={doc.key}
            titulo={doc.label}
            fileList={value as unknown as FileList}
            onRemove={() => handleRemoveFile(doc.key)}
            isObrigatorio={doc.isObrigatorio}
            hasError={false}
          />
        ) : (
          <div 
            className={`flex flex-col mb-2 ${hasError ? "p-2 rounded-[4px] border border-red-500" : ""}`}
            key={doc.key}
            data-doc-error={hasError ? doc.key : undefined}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[15px] ${hasError ? "text-red-500" : "text-[#212529]"}`}>{doc.label}</span>
              <button
                type="button"
                className="cursor-pointer text-[#8494E9] text-[15px] font-medium underline ml-2 flex items-center gap-1"
                onClick={() => handleOpenUploadModal(doc.key)}
              >
                <Image src="/icons/upload-lilas.svg" alt="upload" width={18} height={18} />
                Inserir documento
              </button>
            </div>
            {hasError && fieldError && (
              <span className="text-red-500 text-xs block mt-1">{fieldError.message as string}</span>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
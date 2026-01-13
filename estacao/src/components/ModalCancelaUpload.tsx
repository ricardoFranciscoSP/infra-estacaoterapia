import React from "react";

interface ModalCancelaUploadProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titulo: string;
}

export const ModalCancelaUpload: React.FC<ModalCancelaUploadProps> = ({
  open,
  onClose,
  onConfirm,
  titulo,
}) => {
  if (!open) return null;
  return (
    <>
      {/* Modal Desktop */}
      <div className="fixed inset-0 z-50 items-center justify-center bg-transparent hidden sm:flex">
        <div className="w-[792px] h-[272px] rounded-[8px] bg-white flex flex-col shadow-lg">
          {/* Header */}
          <div className="w-full h-[56px] rounded-t-[8px] bg-[#8494E9] flex items-center justify-center relative px-6">
            <span className="text-white font-fira-sans text-[18px] font-semibold text-center w-full">
              Deseja excluir o documento?
            </span>
            <button
              type="button"
              className="absolute right-6 text-white text-xl font-bold"
              onClick={onClose}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          {/* Conteúdo */}
          <div className="flex flex-col flex-1 items-center justify-center px-8">
            <span className="font-fira-sans text-[16px] font-normal text-[#49525A] text-center leading-6 mb-2">
              Tem certeza que deseja excluir este documento?
              <br />
              Essa ação não poderá ser desfeita
            </span>
            <span className="font-fira-sans text-[15px] font-semibold text-[#212529] mt-2 mb-6">
              {titulo}
            </span>
            <div className="flex gap-4 w-full justify-center">
              <button
                type="button"
                className="w-[368px] h-[48px] rounded-[8px] bg-[#F1F2F4] text-[#49525A] font-fira-sans font-semibold text-[16px]"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="w-[368px] h-[48px] rounded-[8px] bg-[#8494E9] text-white font-fira-sans font-semibold text-[16px]"
                onClick={onConfirm}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Modal Mobile */}
      <div className="fixed inset-0 z-50 flex sm:hidden items-center justify-center bg-transparent">
        <div className="w-full max-w-[95vw] h-[320px] rounded-[8px] bg-white flex flex-col shadow-lg mx-2">
          {/* Header */}
          <div className="w-full h-[56px] rounded-t-[8px] bg-[#8494E9] flex items-center justify-center relative px-4">
            <span className="text-white font-fira-sans text-[16px] font-semibold w-full text-center">
              Deseja excluir o documento?
            </span>
            <button
              type="button"
              className="absolute right-4 text-white text-xl font-bold"
              onClick={onClose}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          {/* Conteúdo */}
          <div className="flex flex-col flex-1 items-center justify-center px-4 text-center">
            <span className="font-fira-sans text-[15px] font-normal text-[#49525A] leading-6 mb-2 w-full text-center">
              Tem certeza que deseja excluir este documento?
              <br />
              Essa ação não poderá ser desfeita
            </span>
            <span className="font-fira-sans text-[14px] font-semibold text-[#212529] mt-2 mb-6 w-full text-center">
              {titulo}
            </span>
            <div className="flex flex-col gap-3 w-full justify-center">
              <button
                type="button"
                className="w-full h-[48px] rounded-[8px] bg-[#F1F2F4] text-[#49525A] font-fira-sans font-semibold text-[15px]"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="w-full h-[48px] rounded-[8px] bg-[#8494E9] text-white font-fira-sans font-semibold text-[15px]"
                onClick={onConfirm}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

import { Psicologo } from "@/types/psicologoTypes";
import React from "react";
import { useUpdateSobreMim } from "@/hooks/user/userPsicologoHook";
import toast from "react-hot-toast";

type ApiError = {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
  message?: string;
};

type Props = {
  psicologo: Psicologo;
  onSuccess?: () => void;
  onLoadingChange?: (isLoading: boolean) => void;
};

const SOBRE_MIM_MAX = 500;

export default function FormSobreMim({ psicologo, onSuccess, onLoadingChange }: Props) {
  const { mutate: updateSobreMim, isPending } = useUpdateSobreMim();
  
  // Notifica mudanças no estado de loading
  React.useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(isPending);
    }
  }, [isPending, onLoadingChange]);
  const [sobreMim, setSobreMim] = React.useState(
    psicologo?.ProfessionalProfiles?.[0]?.SobreMim ?? ""
  );

  // Atualiza sobre mim quando o psicologo mudar (ao abrir o modal)
  React.useEffect(() => {
    setSobreMim(psicologo?.ProfessionalProfiles?.[0]?.SobreMim ?? "");
  }, [psicologo]);

  const inputClass =
    "rounded-[6px] px-4 py-2 gap-3 border border-[#75838F] bg-[#FCFBF6] text-[#23253A] focus:outline-none focus:ring-2 focus:ring-[#8494E9] transition w-full resize-none";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateSobreMim(sobreMim, {
      onSuccess: () => {
        toast.success("Sobre mim atualizado com sucesso!");
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: ApiError) => {
        console.error("Erro ao atualizar sobre mim:", error);
        const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Erro ao atualizar sobre mim. Tente novamente.";
        toast.error(errorMessage);
      }
    });
  };

  return (
    <form className="flex flex-col gap-4 modal-form-mobile" onSubmit={handleSubmit}>
      <label className="flex flex-col text-sm font-medium">
        Sobre mim
        <textarea
          className={inputClass}
          rows={5}
          maxLength={SOBRE_MIM_MAX}
          value={sobreMim}
          onChange={e => setSobreMim(e.target.value)}
          placeholder="Escreva aqui um pouco sobre você!"
          disabled={isPending}
        />
        <div className="text-right text-xs text-[#49525A] mt-1">
          {sobreMim.length}/{String(SOBRE_MIM_MAX).padStart(3, '0')}
        </div>
      </label>
    </form>
  );
}


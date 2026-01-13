import { Psicologo } from "@/types/psicologoTypes";
import React from "react";
import { useUpdateDadosBancarios } from "@/hooks/user/userPsicologoHook";
import toast from 'react-hot-toast';

type ApiError = {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
  message?: string;
};

export interface FormBancarioProps {
  psicologo: Psicologo;
  onSuccess?: () => void;
}

export default function FormBancario({ psicologo, onSuccess }: FormBancarioProps) {
  const { mutate: updateDadosBancarios, isPending } = useUpdateDadosBancarios();
  
  // Verifica se é Autônomo (não pessoa jurídica)
  const isAutonomo = React.useMemo(() => {
    const tipoPessoa = psicologo?.ProfessionalProfiles?.[0]?.TipoPessoaJuridico;
    if (!tipoPessoa) return false;
    if (Array.isArray(tipoPessoa)) {
      // É autônomo se contém "Autonomo" mas não contém nenhum tipo de PJ
      const temAutonomo = tipoPessoa.some(t => t === "Autonomo");
      const temPJ = tipoPessoa.some(t => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");
      return temAutonomo && !temPJ;
    }
    return tipoPessoa === "Autonomo";
  }, [psicologo]);

  // Função para obter o PIX do local correto
  const getChavePixFromPsicologo = React.useCallback(() => {
    if (isAutonomo) {
      return psicologo?.ProfessionalProfiles?.[0]?.DadosBancarios?.ChavePix ?? "";
    }
    return psicologo?.PessoalJuridica?.DadosBancarios?.ChavePix ?? "";
  }, [psicologo, isAutonomo]);

  const [chavePix, setChavePix] = React.useState(getChavePixFromPsicologo());

  // Atualiza o estado quando o psicologo mudar
  React.useEffect(() => {
    setChavePix(getChavePixFromPsicologo());
  }, [getChavePixFromPsicologo]);

  const inputClass =
    "rounded-[6px] px-4 py-2 gap-3 border border-[#75838F] bg-[#FCFBF6] text-[#23253A] focus:outline-none focus:ring-2 focus:ring-[#8494E9] transition w-full";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!chavePix || chavePix.trim() === "") {
      toast.error("Por favor, preencha a Chave PIX.");
      return;
    }

    updateDadosBancarios(chavePix.trim(), {
      onSuccess: () => {
        toast.success("Chave PIX atualizada com sucesso!");
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: ApiError) => {
        console.error("Erro ao atualizar Chave PIX:", error);
        const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Erro ao atualizar Chave PIX. Tente novamente.";
        toast.error(errorMessage);
      },
    });
  };

  return (
    <form className="flex flex-col gap-4 modal-form-mobile" onSubmit={handleSubmit}>
      {/* Alerta informativo */}
      <div className="bg-[#FFF9E6] border border-[#FFE066] rounded-lg p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#FFC107] flex items-center justify-center text-white text-xs font-bold">
          i
        </div>
        <p className="text-sm text-[#856404] flex-1">
          Atenção! A Chave PIX deverá ser obrigatoriamente o CPF (caso você seja autônomo atualmente) ou o CNPJ da sua empresa.
        </p>
      </div>

      {/* Campo Chave PIX */}
      <label className="flex flex-col text-sm font-medium">
        Chave PIX
        <input
          className={inputClass}
          placeholder="Chave Pix"
          value={chavePix}
          onChange={(e) => setChavePix(e.target.value)}
          disabled={isPending}
        />
      </label>
    </form>
  );
}

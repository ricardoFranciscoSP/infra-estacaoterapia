import { Psicologo } from "@/types/psicologoTypes";
import React from "react";
import Select from "react-select";
import { useUpdatePessoalJuridica } from "@/hooks/user/userPsicologoHook";
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
};

export default function FormJuridico({ psicologo, onSuccess }: Props) {
  const { mutate: updatePessoalJuridica, isPending } = useUpdatePessoalJuridica();
  
  const [juridico, setJuridico] = React.useState({
    RazaoSocial: psicologo?.PessoalJuridica?.RazaoSocial ?? "",
    NomeFantasia: psicologo?.PessoalJuridica?.NomeFantasia ?? "",
    CNPJ: psicologo?.PessoalJuridica?.CNPJ ?? "",
    InscricaoEstadual: psicologo?.PessoalJuridica?.InscricaoEstadual ?? "",
    SimplesNacional: psicologo?.PessoalJuridica?.SimplesNacional ?? false,
  });

  // Atualiza dados jurídicos quando o psicologo mudar (ao abrir o modal)
  React.useEffect(() => {
    setJuridico({
      RazaoSocial: psicologo?.PessoalJuridica?.RazaoSocial ?? "",
      NomeFantasia: psicologo?.PessoalJuridica?.NomeFantasia ?? "",
      CNPJ: psicologo?.PessoalJuridica?.CNPJ ?? "",
      InscricaoEstadual: psicologo?.PessoalJuridica?.InscricaoEstadual ?? "",
      SimplesNacional: psicologo?.PessoalJuridica?.SimplesNacional ?? false,
    });
  }, [psicologo]);

  const inputClass =
    "rounded-[6px] px-4 py-2 gap-3 border border-[#75838F] bg-[#FCFBF6] text-[#23253A] focus:outline-none focus:ring-2 focus:ring-[#8494E9] transition w-full";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updatePessoalJuridica({
      RazaoSocial: juridico.RazaoSocial,
      NomeFantasia: juridico.NomeFantasia,
      CNPJ: juridico.CNPJ,
      InscricaoEstadual: juridico.InscricaoEstadual,
      SimplesNacional: juridico.SimplesNacional,
    }, {
      onSuccess: () => {
        toast.success("Dados da empresa atualizados com sucesso!");
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: ApiError) => {
        console.error("Erro ao atualizar dados da empresa:", error);
        const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Erro ao atualizar dados da empresa. Tente novamente.";
        toast.error(errorMessage);
      }
    });
  };

  return (
    <form className="flex flex-col gap-4 modal-form-mobile" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col text-sm font-medium">
          Razão Social
          <input className={inputClass} value={juridico.RazaoSocial} onChange={e => setJuridico({ ...juridico, RazaoSocial: e.target.value })} disabled={isPending} />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Nome Fantasia
          <input className={inputClass} value={juridico.NomeFantasia} onChange={e => setJuridico({ ...juridico, NomeFantasia: e.target.value })} disabled={isPending} />
        </label>
        <label className="flex flex-col text-sm font-medium">
          CNPJ
          <input className={inputClass} value={juridico.CNPJ} onChange={e => setJuridico({ ...juridico, CNPJ: e.target.value })} readOnly disabled={isPending} />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Inscrição Estadual
          <input className={inputClass} value={juridico.InscricaoEstadual} onChange={e => setJuridico({ ...juridico, InscricaoEstadual: e.target.value })} disabled={isPending} />
        </label>
        <label className="flex flex-col text-sm font-medium md:col-span-2">
          Simples Nacional
          <Select
            options={[
              { value: "true", label: "Sim" },
              { value: "false", label: "Não" }
            ]}
            value={juridico.SimplesNacional ? { value: "true", label: "Sim" } : { value: "false", label: "Não" }}
            onChange={option => setJuridico({ ...juridico, SimplesNacional: option?.value === "true" })}
            placeholder="Selecione..."
            isClearable
            isDisabled={isPending}
            menuPlacement="auto"
          />
        </label>
      </div>
    </form>
  );
}

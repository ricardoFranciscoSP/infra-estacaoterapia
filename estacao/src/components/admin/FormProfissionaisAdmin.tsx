import React from "react";
import Select from "react-select";
import { Psicologo } from "@/types/psicologoTypes";
import { EnumsResponse } from "@/types/enumsType";
import { useUpdateAdmPsicologo } from "@/hooks/admin/useAdmPsicologo";
import toast from "react-hot-toast";
import { normalizeEnum, normalizeExperienciaClinica } from "@/utils/enumUtils";

type ApiError = {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
  message?: string;
};

// Tipagem para opções do Select
interface SelectOption {
  value: string;
  label: string;
}

type Props = {
  psicologo: Psicologo;
  enums: EnumsResponse;
  onSuccess?: () => void;
};

const SOBRE_MIM_MAX = 500;

export default function FormProfissionaisAdmin({ psicologo, enums, onSuccess }: Props) {
  const updatePsicologoMutation = useUpdateAdmPsicologo();
  
  const [profissionais, setProfissionais] = React.useState({
    Crp: psicologo?.Crp ?? "",
    ExperienciaClinica: psicologo?.ProfessionalProfiles?.[0]?.ExperienciaClinica ?? null,
    Idiomas: psicologo?.ProfessionalProfiles?.[0]?.Idiomas?.map((i: string) => ({ value: i, label: normalizeEnum(i) })) ?? [],
    Abordagens: psicologo?.ProfessionalProfiles?.[0]?.Abordagens?.map((a: string) => ({ value: a, label: normalizeEnum(a) })) ?? [],
    Queixas: psicologo?.ProfessionalProfiles?.[0]?.Queixas?.map((q: string) => ({ value: q, label: normalizeEnum(q) })) ?? [],
    SobreMim: psicologo?.ProfessionalProfiles?.[0]?.SobreMim ?? "",
  });

  // Atualiza profissionais quando o psicologo mudar (ao abrir o modal)
  React.useEffect(() => {
    setProfissionais({
      Crp: psicologo?.Crp ?? "",
      ExperienciaClinica: psicologo?.ProfessionalProfiles?.[0]?.ExperienciaClinica ?? null,
      Idiomas: psicologo?.ProfessionalProfiles?.[0]?.Idiomas?.map((i: string) => ({ value: i, label: normalizeEnum(i) })) ?? [],
      Abordagens: psicologo?.ProfessionalProfiles?.[0]?.Abordagens?.map((a: string) => ({ value: a, label: normalizeEnum(a) })) ?? [],
      Queixas: psicologo?.ProfessionalProfiles?.[0]?.Queixas?.map((q: string) => ({ value: q, label: normalizeEnum(q) })) ?? [],
      SobreMim: psicologo?.ProfessionalProfiles?.[0]?.SobreMim ?? "",
    });
  }, [psicologo]);

  const EXPERIENCIA_CLINICA_OPTIONS = (enums?.perfilProfissional?.experienciaClinica ?? []).map((e: string) => ({
    value: e,
    label: normalizeExperienciaClinica(e)
  }));

  const IDIOMAS_OPTIONS = (enums?.perfilProfissional?.languages ?? []).map((i: string) => ({
    value: i,
    label: i
  }));

  const ABORDAGEM_OPTIONS = (enums?.perfilProfissional?.abordagem ?? []).map((a: string) => ({
    value: a,
    label: normalizeEnum(a)
  }));

  const QUEIXA_OPTIONS = (enums?.perfilProfissional?.queixa ?? []).map((q: string) => ({
    value: q,
    label: normalizeEnum(q)
  }));

  const inputClass =
    "rounded-[6px] px-4 py-2 gap-3 border border-[#75838F] bg-[#FCFBF6] text-[#23253A] focus:outline-none focus:ring-2 focus:ring-[#8494E9] transition w-full";

  const textareaClass =
    "rounded-[6px] px-4 py-2 gap-3 border border-[#75838F] bg-[#FCFBF6] text-[#23253A] focus:outline-none focus:ring-2 focus:ring-[#8494E9] transition w-full resize-none";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!psicologo?.id && !psicologo?.Id) {
      toast.error("ID do psicólogo não encontrado");
      return;
    }

    const id = psicologo.id || psicologo.Id;

    // Atualiza o psicólogo com os novos dados profissionais
    const updatedPsicologo = {
      ...psicologo,
      Crp: profissionais.Crp,
      ProfessionalProfiles: [
        {
          ...psicologo.ProfessionalProfiles?.[0],
          ExperienciaClinica: profissionais.ExperienciaClinica || undefined,
          Idiomas: profissionais.Idiomas.map((opt: SelectOption) => opt.value),
          Abordagens: profissionais.Abordagens.map((opt: SelectOption) => opt.value),
          Queixas: profissionais.Queixas.map((opt: SelectOption) => opt.value),
          SobreMim: profissionais.SobreMim || undefined,
        },
      ],
    } as Psicologo;

    updatePsicologoMutation.mutate({
      id,
      update: updatedPsicologo,
    }, {
      onSuccess: () => {
        toast.success("Dados profissionais atualizados com sucesso!");
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: unknown) => {
        console.error("Erro ao atualizar dados profissionais:", error);
        const apiError = error as ApiError;
        const errorMessage = apiError?.response?.data?.error || apiError?.response?.data?.message || apiError?.message || "Erro ao atualizar dados profissionais. Tente novamente.";
        toast.error(errorMessage);
      }
    });
  };

  return (
    <form className="flex flex-col gap-4 modal-form-mobile" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col text-sm font-medium">
          CRP
          <input
            className={inputClass}
            value={profissionais.Crp}
            onChange={e => setProfissionais({ ...profissionais, Crp: e.target.value })}
            placeholder="00/000000"
            disabled={updatePsicologoMutation.isPending}
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Tempo de experiência clínica
          <Select
            options={EXPERIENCIA_CLINICA_OPTIONS}
            value={profissionais.ExperienciaClinica 
              ? { value: profissionais.ExperienciaClinica, label: normalizeExperienciaClinica(profissionais.ExperienciaClinica) }
              : null
            }
            onChange={(option) =>
              setProfissionais({
                ...profissionais,
                ExperienciaClinica: (option as SelectOption | null)?.value || null,
              })
            }
            placeholder="Selecione..."
            isClearable
            isDisabled={updatePsicologoMutation.isPending}
            menuPlacement="auto"
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Idiomas
          <Select
            isMulti
            options={IDIOMAS_OPTIONS}
            value={profissionais.Idiomas}
            onChange={(options) =>
              setProfissionais({
                ...profissionais,
                Idiomas: (options as SelectOption[]) ?? [],
              })
            }
            placeholder="Selecione..."
            isDisabled={updatePsicologoMutation.isPending}
            menuPlacement="auto"
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Abordagens
          <Select
            isMulti
            options={ABORDAGEM_OPTIONS}
            value={profissionais.Abordagens.map(opt => {
              const found = ABORDAGEM_OPTIONS.find(o => o.value === opt.value);
              return found ?? { value: opt.value, label: normalizeEnum(opt.value) };
            })}
            onChange={(options) =>
              setProfissionais({
                ...profissionais,
                Abordagens: (options as SelectOption[]) ?? [],
              })
            }
            placeholder="Selecione..."
            isDisabled={updatePsicologoMutation.isPending}
            menuPlacement="auto"
          />
        </label>
        <label className="flex flex-col text-sm font-medium md:col-span-2">
          Queixas
          <Select
            isMulti
            options={QUEIXA_OPTIONS}
            value={profissionais.Queixas.map(opt => {
              const found = QUEIXA_OPTIONS.find(o => o.value === opt.value);
              return found ?? { value: opt.value, label: normalizeEnum(opt.value) };
            })}
            onChange={(options) =>
              setProfissionais({
                ...profissionais,
                Queixas: (options as SelectOption[]) ?? [],
              })
            }
            placeholder="Selecione..."
            isDisabled={updatePsicologoMutation.isPending}
            menuPlacement="auto"
          />
        </label>
        <label className="flex flex-col text-sm font-medium md:col-span-2">
          Sobre mim
          <textarea
            className={textareaClass}
            rows={5}
            maxLength={SOBRE_MIM_MAX}
            value={profissionais.SobreMim}
            onChange={e => setProfissionais({ ...profissionais, SobreMim: e.target.value })}
            placeholder="Escreva aqui um pouco sobre você!"
            disabled={updatePsicologoMutation.isPending}
          />
          <div className="text-right text-xs text-[#49525A] mt-1">
            {profissionais.SobreMim.length}/{String(SOBRE_MIM_MAX).padStart(3, '0')}
          </div>
        </label>
      </div>
    </form>
  );
}


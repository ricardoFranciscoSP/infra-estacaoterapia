import React from "react";
import Select from "react-select";
import { Psicologo } from "@/types/psicologoTypes";
import { EnumsResponse } from "@/types/enumsType";
import { useUpdateEspecialidades } from "@/hooks/user/userPsicologoHook";
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

export default function FormEspecialidades({ psicologo, enums, onSuccess }: Props) {
  const { mutate: updateEspecialidades, isPending } = useUpdateEspecialidades();
  
  const [especialidades, setEspecialidades] = React.useState({
    ExperienciaClinica: psicologo?.ProfessionalProfiles?.[0]?.ExperienciaClinica ?? null,
    Idiomas: psicologo?.ProfessionalProfiles?.[0]?.Idiomas?.map((i: string) => ({ value: i, label: normalizeEnum(i) })) ?? [],
    TipoAtendimento: psicologo?.ProfessionalProfiles?.[0]?.TipoAtendimento?.map((t: string) => ({ value: t, label: normalizeEnum(t) })) ?? [],
    Abordagens: psicologo?.ProfessionalProfiles?.[0]?.Abordagens?.map((a: string) => ({ value: a, label: normalizeEnum(a) })) ?? [],
    Queixas: psicologo?.ProfessionalProfiles?.[0]?.Queixas?.map((q: string) => ({ value: q, label: normalizeEnum(q) })) ?? [],
  });

  // Atualiza especialidades quando o psicologo mudar (ao abrir o modal)
  React.useEffect(() => {
    setEspecialidades({
      ExperienciaClinica: psicologo?.ProfessionalProfiles?.[0]?.ExperienciaClinica ?? null,
      Idiomas: psicologo?.ProfessionalProfiles?.[0]?.Idiomas?.map((i: string) => ({ value: i, label: normalizeEnum(i) })) ?? [],
      TipoAtendimento: psicologo?.ProfessionalProfiles?.[0]?.TipoAtendimento?.map((t: string) => ({ value: t, label: normalizeEnum(t) })) ?? [],
      Abordagens: psicologo?.ProfessionalProfiles?.[0]?.Abordagens?.map((a: string) => ({ value: a, label: normalizeEnum(a) })) ?? [],
      Queixas: psicologo?.ProfessionalProfiles?.[0]?.Queixas?.map((q: string) => ({ value: q, label: normalizeEnum(q) })) ?? [],
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

  const TIPO_ATENDIMENTO_OPTIONS = (enums?.perfilProfissional?.tipoAtendimento ?? []).map((t: string) => ({
    value: t,
    label: t
  }));

  const ABORDAGEM_OPTIONS = (enums?.perfilProfissional?.abordagem ?? []).map((a: string) => ({
    value: a,
    label: normalizeEnum(a)
  }));

  const QUEIXA_OPTIONS = (enums?.perfilProfissional?.queixa ?? []).map((q: string) => ({
    value: q,
    label: normalizeEnum(q)
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateEspecialidades({
      ExperienciaClinica: especialidades.ExperienciaClinica || undefined,
      Idiomas: especialidades.Idiomas.map((opt: SelectOption) => opt.value),
      TipoAtendimento: especialidades.TipoAtendimento.map((opt: SelectOption) => opt.value),
      Abordagens: especialidades.Abordagens.map((opt: SelectOption) => opt.value),
      Queixas: especialidades.Queixas.map((opt: SelectOption) => opt.value),
    }, {
      onSuccess: () => {
        toast.success("Especialidades atualizadas com sucesso!");
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: ApiError) => {
        console.error("Erro ao atualizar especialidades:", error);
        const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Erro ao atualizar especialidades. Tente novamente.";
        toast.error(errorMessage);
      }
    });
  };

  return (
    <form className="flex flex-col gap-4 modal-form-mobile" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col text-sm font-medium">
          Tempo de experiência clínica
          <Select
            options={EXPERIENCIA_CLINICA_OPTIONS}
            value={especialidades.ExperienciaClinica 
              ? { value: especialidades.ExperienciaClinica, label: normalizeExperienciaClinica(especialidades.ExperienciaClinica) }
              : null
            }
            onChange={(option) =>
              setEspecialidades({
                ...especialidades,
                ExperienciaClinica: (option as SelectOption | null)?.value || null,
              })
            }
            placeholder="Selecione..."
            isDisabled={isPending}
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Idiomas
          <Select
            isMulti
            options={IDIOMAS_OPTIONS}
            value={especialidades.Idiomas}
            onChange={(options) =>
              setEspecialidades({
                ...especialidades,
                Idiomas: (options as SelectOption[]) ?? [],
              })
            }
            placeholder="Selecione..."
            isDisabled={isPending}
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Tipo de Atendimento
          <Select
            isMulti
            options={TIPO_ATENDIMENTO_OPTIONS}
            value={especialidades.TipoAtendimento}
            onChange={(options) =>
              setEspecialidades({
                ...especialidades,
                TipoAtendimento: (options as SelectOption[]) ?? [],
              })
            }
            placeholder="Selecione..."
            isDisabled={isPending}
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Abordagens
          <Select
            isMulti
            options={ABORDAGEM_OPTIONS}
            value={especialidades.Abordagens.map(opt => {
              const found = ABORDAGEM_OPTIONS.find(o => o.value === opt.value);
              return found ?? { value: opt.value, label: normalizeEnum(opt.value) };
            })}
            onChange={(options) =>
              setEspecialidades({
                ...especialidades,
                Abordagens: (options as SelectOption[]) ?? [],
              })
            }
            placeholder="Selecione..."
            isDisabled={isPending}
          />
        </label>
        <label className="flex flex-col text-sm font-medium md:col-span-2">
          Queixas
          <Select
            isMulti
            options={QUEIXA_OPTIONS}
            value={especialidades.Queixas.map(opt => {
              const found = QUEIXA_OPTIONS.find(o => o.value === opt.value);
              return found ?? { value: opt.value, label: normalizeEnum(opt.value) };
            })}
            onChange={(options) =>
              setEspecialidades({
                ...especialidades,
                Queixas: (options as SelectOption[]) ?? [],
              })
            }
            placeholder="Selecione..."
            isDisabled={isPending}
          />
        </label>
      </div>
    </form>
  );
}

import React from "react";
import Select from "react-select";
import { Formacao, Psicologo } from "@/types/psicologoTypes"; 
import { EnumsResponse } from "@/types/enumsType";
import { FiTrash2 } from "react-icons/fi";
import { useUpdateFormacoes } from "@/hooks/user/userPsicologoHook";
import { useDeletePsicologo } from "@/hooks/user/userPsicologoHook";
import toast from "react-hot-toast";
import { maskMonthYear, dateToMonthYear } from "@/utils/masks";

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
  enums: EnumsResponse;
  onSuccess?: () => void;
};

export default function FormFormacao({ psicologo, enums, onSuccess }: Props) {
  const { mutate: updateFormacoes, isPending } = useUpdateFormacoes();
  const { mutate: deleteFormacao } = useDeletePsicologo();
  // Inicializa com formatação de datas
  const initializeFormacoes = React.useCallback(() => {
    const formacoesData = psicologo?.ProfessionalProfiles?.[0]?.Formacoes ?? [];
    // Converte as datas para o formato mm/yyyy ao carregar
    return formacoesData.map(f => ({
      ...f,
      DataInicio: f.DataInicio ? dateToMonthYear(f.DataInicio) : "",
      DataConclusao: f.DataConclusao ? dateToMonthYear(f.DataConclusao) : "",
    }));
  }, [psicologo]);

  const [formacoes, setFormacoes] = React.useState<Formacao[]>(initializeFormacoes());

  // Extrai as formações do psicólogo para usar no array de dependências
  const professionalProfiles = psicologo?.ProfessionalProfiles;
  const formacoesDoPsicologo = React.useMemo(() => {
    return professionalProfiles?.[0]?.Formacoes;
  }, [professionalProfiles]);

  // Atualiza formações quando o psicologo mudar (ao abrir o modal)
  React.useEffect(() => {
    setFormacoes(initializeFormacoes());
  }, [initializeFormacoes, formacoesDoPsicologo]);

  const inputClass =
    "rounded-[6px] px-4 py-2 gap-3 border border-[#75838F] bg-[#FCFBF6] text-[#23253A] focus:outline-none focus:ring-2 focus:ring-[#8494E9] transition w-full";

  const STATUS_OPTIONS = ["Concluído", "Em andamento", "Trancado", "Cancelado"].map((s: string) => ({
    value: s,
    label: s
  }));

  const TIPO_FORMACAO_OPTIONS = (enums?.tipos?.tipoFormacao ?? []).map((t: string) => ({
    value: t,
    label: t
  }));

  function handleExcluirFormacao(id: string) {
    // Se for ID temporário (começa com "temp-"), apenas remove do estado local
    if (id && id.startsWith('temp-')) {
      setFormacoes(formacoes.filter(f => f.Id !== id));
      return;
    }
    
    // Se tiver ID válido, chama a API para deletar
    if (id && id !== "" && id !== "null") {
      deleteFormacao(id, {
        onSuccess: () => {
          setFormacoes(formacoes.filter(f => f.Id !== id));
          toast.success("Formação removida com sucesso!");
        },
        onError: () => {
          toast.error("Erro ao remover formação. Tente novamente.");
        }
      });
    } else {
      // Se não tem ID, apenas remove do estado local
      setFormacoes(formacoes.filter(f => f.Id !== id));
    }
  }

  function handleAddFormacao() {
    const novaFormacao: Formacao = {
      Id: `temp-${Date.now()}`,
      ProfessionalProfileId: psicologo?.ProfessionalProfiles?.[0]?.Id || "",
      Tipo: "",
      TipoFormacao: "",
      Instituicao: "",
      Curso: "",
      DataInicio: "",
      DataConclusao: "",
      Status: "Em andamento",
      Periodo: "",
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    };
    setFormacoes([
      ...formacoes,
      novaFormacao
    ]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Filtra apenas formações com dados mínimos válidos
    const formacoesValidas = formacoes.filter(f => 
      f.Curso && f.Curso.trim() !== "" &&
      f.Instituicao && f.Instituicao.trim() !== "" &&
      f.TipoFormacao && f.TipoFormacao.trim() !== ""
    );

    if (formacoesValidas.length === 0 && formacoes.length > 0) {
      toast.error("Por favor, preencha pelo menos uma formação completa (Curso, Instituição e Tipo de Formação).");
      return;
    }

    const formacoesToUpdate = formacoesValidas.map(f => ({
      // Remove Id temporário se não tiver Id real
      ...(f.Id && !f.Id.startsWith('temp-') ? { Id: f.Id } : {}),
      TipoFormacao: f.TipoFormacao || f.Tipo,
      Instituicao: f.Instituicao,
      Curso: f.Curso,
      // Envia no formato mm/yyyy
      DataInicio: f.DataInicio || "",
      DataConclusao: f.DataConclusao || "",
      Status: f.Status || "Em andamento",
    }));

    updateFormacoes(formacoesToUpdate, {
      onSuccess: () => {
        toast.success("Formações atualizadas com sucesso!");
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: ApiError) => {
        console.error("Erro ao atualizar formações:", error);
        const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Erro ao atualizar formações. Tente novamente.";
        toast.error(errorMessage);
      }
    });
  }

  return (
    <form className="flex flex-col gap-4 modal-form-mobile" onSubmit={handleSubmit}>
      {formacoes.length === 0 && (
        <div className="text-center py-4 text-sm text-[#49525A]">
          Nenhuma formação cadastrada. Clique em &quot;Adicionar formação&quot; para começar.
        </div>
      )}
      {formacoes.map((f, idx) => (
        <div
          key={f.Id || `formacao-${idx}`}
          className="bg-[#F3F6F8] rounded-xl p-4 mb-2 relative shadow-sm border border-[#E3E4F3]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-[#23253A] text-base">{`Formação ${idx + 1}`}</span>
            <button
              type="button"
              className="text-[#E57373] hover:bg-[#FFE6E6] rounded-full p-2 transition"
              onClick={() => handleExcluirFormacao(f.Id)}
              aria-label="Excluir formação"
            >
              <FiTrash2 size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col text-sm font-medium">
              Curso
              <input
                className={inputClass}
                value={f.Curso}
                onChange={e => {
                  const novo = [...formacoes];
                  novo[idx] = { ...novo[idx], Curso: e.target.value };
                  setFormacoes(novo);
                }}
                disabled={isPending}
              />
            </label>
            <label className="flex flex-col text-sm font-medium">
              Instituição
              <input
                className={inputClass}
                value={f.Instituicao}
                onChange={e => {
                  const novo = [...formacoes];
                  novo[idx] = { ...novo[idx], Instituicao: e.target.value };
                  setFormacoes(novo);
                }}
              />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <label className="flex flex-col text-sm font-medium">
              Tipo de Formação
              <Select
                options={TIPO_FORMACAO_OPTIONS}
                value={f.TipoFormacao ? { value: f.TipoFormacao, label: f.TipoFormacao } : null}
                onChange={option => {
                  const novo = [...formacoes];
                  novo[idx] = { ...novo[idx], TipoFormacao: option?.value ?? "" };
                  setFormacoes(novo);
                }}
                placeholder="Selecione..."
                isClearable
                isDisabled={isPending}
              />
            </label>
            <label className="flex flex-col text-sm font-medium">
              Status
              <Select
                options={STATUS_OPTIONS}
                value={f.Status ? { value: f.Status, label: f.Status } : null}
                onChange={option => {
                  const novo = [...formacoes];
                  novo[idx] = { ...novo[idx], Status: option?.value ?? "" };
                  setFormacoes(novo);
                }}
                placeholder="Selecione..."
                isClearable
              />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <label className="flex flex-col text-sm font-medium">
              Data de Início
              <input
                className={inputClass}
                type="text"
                placeholder="mm/yyyy"
                value={f.DataInicio || ""}
                onChange={e => {
                  const masked = maskMonthYear(e.target.value);
                  const novo = [...formacoes];
                  novo[idx] = { ...novo[idx], DataInicio: masked };
                  setFormacoes(novo);
                }}
                maxLength={7}
                disabled={isPending}
              />
            </label>
            <label className="flex flex-col text-sm font-medium">
              Data de Conclusão
              <input
                className={inputClass}
                type="text"
                placeholder="mm/yyyy"
                value={f.DataConclusao || ""}
                onChange={e => {
                  const masked = maskMonthYear(e.target.value);
                  const novo = [...formacoes];
                  novo[idx] = { ...novo[idx], DataConclusao: masked };
                  setFormacoes(novo);
                }}
                maxLength={7}
                disabled={isPending}
              />
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="mt-2 flex items-center gap-2 text-[#8494E9] text-sm font-medium hover:underline self-start"
        onClick={handleAddFormacao}
        disabled={isPending}
      >
        <span className="text-xl">+</span> Adicionar formação
      </button>
    </form>
  );
}

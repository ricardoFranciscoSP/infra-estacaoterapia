import { Psicologo, DadosBancarios } from "@/types/psicologoTypes";
import React from "react";
import { useUpdateAdmPsicologo } from "@/hooks/admin/useAdmPsicologo";
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

export interface FormBancarioAdminProps {
  psicologo: Psicologo;
  onSuccess?: () => void;
}

export default function FormBancarioAdmin({ psicologo, onSuccess }: FormBancarioAdminProps) {
  const updatePsicologoMutation = useUpdateAdmPsicologo();
  
  // Verifica se é Autônomo (não pessoa jurídica)
  const isAutonomo = React.useMemo(() => {
    const tipoPessoa = psicologo?.ProfessionalProfiles?.[0]?.TipoPessoaJuridico;
    if (!tipoPessoa) return false;
    if (Array.isArray(tipoPessoa)) {
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

    if (!psicologo?.id && !psicologo?.Id) {
      toast.error("ID do psicólogo não encontrado");
      return;
    }

    const id = psicologo.id || psicologo.Id;

    const updatedPsicologo = { ...psicologo };

    if (isAutonomo) {
      // Atualiza PIX no ProfessionalProfile
      if (updatedPsicologo.ProfessionalProfiles?.[0]) {
        const existingDadosBancarios = updatedPsicologo.ProfessionalProfiles[0].DadosBancarios;
        // Só inclui DadosBancarios se já existir (com Id válido)
        if (existingDadosBancarios && existingDadosBancarios.Id) {
          const dadosBancarios: DadosBancarios = {
            ...existingDadosBancarios,
            ChavePix: chavePix.trim(),
          };
          updatedPsicologo.ProfessionalProfiles = [
            {
              ...updatedPsicologo.ProfessionalProfiles[0],
              DadosBancarios: dadosBancarios,
            },
          ];
        } else {
          // Se não existir, não incluímos DadosBancarios - o backend precisará criar
          // Por enquanto, enviamos apenas o ChavePix no payload e o backend deve lidar
          updatedPsicologo.ProfessionalProfiles = [
            {
              ...updatedPsicologo.ProfessionalProfiles[0],
            },
          ];
        }
      }
    } else {
      // Atualiza PIX no PessoalJuridica
      const existingDadosBancarios = updatedPsicologo.PessoalJuridica?.DadosBancarios;
      if (existingDadosBancarios && existingDadosBancarios.Id && updatedPsicologo.PessoalJuridica) {
        const dadosBancarios: DadosBancarios = {
          ...existingDadosBancarios,
          ChavePix: chavePix.trim(),
        };
        const pessoalJuridica = updatedPsicologo.PessoalJuridica;
        updatedPsicologo.PessoalJuridica = {
          CNPJ: pessoalJuridica.CNPJ,
          RazaoSocial: pessoalJuridica.RazaoSocial,
          NomeFantasia: pessoalJuridica.NomeFantasia,
          InscricaoEstadual: pessoalJuridica.InscricaoEstadual,
          SimplesNacional: pessoalJuridica.SimplesNacional,
          ...(pessoalJuridica.EnderecoEmpresa && {
            EnderecoEmpresa: pessoalJuridica.EnderecoEmpresa,
          }),
          ...(pessoalJuridica.DescricaoExtenso !== undefined && {
            DescricaoExtenso: pessoalJuridica.DescricaoExtenso,
          }),
          DadosBancarios: dadosBancarios,
        };
      }
    }

    updatePsicologoMutation.mutate({
      id,
      update: updatedPsicologo,
    }, {
      onSuccess: () => {
        toast.success("Chave PIX atualizada com sucesso!");
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: unknown) => {
        console.error("Erro ao atualizar Chave PIX:", error);
        const apiError = error as ApiError;
        const errorMessage = apiError?.response?.data?.error || apiError?.response?.data?.message || apiError?.message || "Erro ao atualizar Chave PIX. Tente novamente.";
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
          disabled={updatePsicologoMutation.isPending}
        />
      </label>
    </form>
  );
}


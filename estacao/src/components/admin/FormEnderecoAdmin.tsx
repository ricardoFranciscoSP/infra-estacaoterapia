import { Psicologo } from "@/types/psicologoTypes";
import React from "react";
import { useUpdateAdmPsicologo } from "@/hooks/admin/useAdmPsicologo";
import toast from "react-hot-toast";
import { maskCep } from "@/utils/masks";
import { fetchAddressByCep } from "@/services/viaCepService";

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
  isBillingAddress?: boolean;
  onSuccess?: () => void;
};

export default function FormEnderecoAdmin({ psicologo, isBillingAddress = false, onSuccess }: Props) {
  const updatePsicologoMutation = useUpdateAdmPsicologo();
  
  const addressData = isBillingAddress 
    ? (Array.isArray(psicologo?.BillingAddress) 
        ? psicologo.BillingAddress[0] 
        : psicologo?.BillingAddress)
    : (Array.isArray(psicologo?.Address)
        ? psicologo.Address[0]
        : psicologo?.Address);
    
  const [endereco, setEndereco] = React.useState({
    Rua: addressData?.Rua ?? "",
    Numero: addressData?.Numero ?? "",
    Complemento: addressData?.Complemento ?? "",
    Bairro: addressData?.Bairro ?? "",
    Cidade: addressData?.Cidade ?? "",
    Estado: addressData?.Estado ?? "",
    Cep: addressData?.Cep ?? "",
  });

  // Atualiza endereço quando o psicologo mudar
  React.useEffect(() => {
    const currentAddressData = isBillingAddress 
      ? (Array.isArray(psicologo?.BillingAddress) 
          ? psicologo.BillingAddress[0] 
          : psicologo?.BillingAddress)
      : (Array.isArray(psicologo?.Address)
          ? psicologo.Address[0]
          : psicologo?.Address);
    
    setEndereco({
      Rua: currentAddressData?.Rua ?? "",
      Numero: currentAddressData?.Numero ?? "",
      Complemento: currentAddressData?.Complemento ?? "",
      Bairro: currentAddressData?.Bairro ?? "",
      Cidade: currentAddressData?.Cidade ?? "",
      Estado: currentAddressData?.Estado ?? "",
      Cep: currentAddressData?.Cep ?? "",
    });
  }, [psicologo, isBillingAddress]);

  const inputClass =
    "rounded-[6px] px-4 py-2 gap-3 border border-[#75838F] bg-[#FCFBF6] text-[#23253A] focus:outline-none focus:ring-2 focus:ring-[#8494E9] transition w-full";

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = maskCep(e.target.value);
    setEndereco({ ...endereco, Cep: maskedValue });
  };

  const handleCepBlur = async () => {
    const cleanCep = endereco.Cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        const data = await fetchAddressByCep(cleanCep);
        setEndereco({
          ...endereco,
          Rua: data.logradouro || endereco.Rua,
          Bairro: data.bairro || endereco.Bairro,
          Cidade: data.localidade || endereco.Cidade,
          Estado: data.uf || endereco.Estado,
          Complemento: data.complemento || endereco.Complemento,
        });
      } catch (error) {
        console.error("Erro ao buscar endereço pelo CEP:", error);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!psicologo?.id && !psicologo?.Id) {
      toast.error("ID do psicólogo não encontrado");
      return;
    }

    const id = psicologo.id || psicologo.Id;

    const updatedPsicologo = { ...psicologo };
    
    if (isBillingAddress) {
      updatedPsicologo.BillingAddress = {
        ...endereco,
      } as typeof psicologo.BillingAddress;
    } else {
      updatedPsicologo.Address = {
        ...endereco,
      } as typeof psicologo.Address;
    }

    updatePsicologoMutation.mutate({
      id,
      update: updatedPsicologo,
    }, {
      onSuccess: () => {
        toast.success(isBillingAddress ? "Endereço da empresa atualizado com sucesso!" : "Endereço atualizado com sucesso!");
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: unknown) => {
        console.error("Erro ao atualizar endereço:", error);
        const apiError = error as ApiError;
        const errorMessage = apiError?.response?.data?.error || apiError?.response?.data?.message || apiError?.message || "Erro ao atualizar endereço. Tente novamente.";
        toast.error(errorMessage);
      }
    });
  };

  return (
    <form className="flex flex-col gap-4 modal-form-mobile" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col text-sm font-medium md:col-span-2">
          CEP
          <input
            className={inputClass}
            value={endereco.Cep}
            onChange={handleCepChange}
            onBlur={handleCepBlur}
            placeholder="00000-000"
            disabled={updatePsicologoMutation.isPending}
          />
        </label>
        <label className="flex flex-col text-sm font-medium md:col-span-2">
          Rua
          <input
            className={inputClass}
            value={endereco.Rua}
            onChange={e => setEndereco({ ...endereco, Rua: e.target.value })}
            disabled={updatePsicologoMutation.isPending}
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Número
          <input
            className={inputClass}
            value={endereco.Numero}
            onChange={e => setEndereco({ ...endereco, Numero: e.target.value })}
            disabled={updatePsicologoMutation.isPending}
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Complemento
          <input
            className={inputClass}
            value={endereco.Complemento}
            onChange={e => setEndereco({ ...endereco, Complemento: e.target.value })}
            disabled={updatePsicologoMutation.isPending}
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Bairro
          <input
            className={inputClass}
            value={endereco.Bairro}
            onChange={e => setEndereco({ ...endereco, Bairro: e.target.value })}
            disabled={updatePsicologoMutation.isPending}
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Cidade
          <input
            className={inputClass}
            value={endereco.Cidade}
            onChange={e => setEndereco({ ...endereco, Cidade: e.target.value })}
            disabled={updatePsicologoMutation.isPending}
          />
        </label>
        <label className="flex flex-col text-sm font-medium">
          Estado
          <input
            className={inputClass}
            value={endereco.Estado}
            onChange={e => setEndereco({ ...endereco, Estado: e.target.value })}
            maxLength={2}
            disabled={updatePsicologoMutation.isPending}
          />
        </label>
      </div>
    </form>
  );
}


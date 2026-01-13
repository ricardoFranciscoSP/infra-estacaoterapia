import { fetchAddressByCep } from "@/services/viaCepService";

// Definição da interface para endereço
interface Address {
    cep: string;
    endereco?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    numero: string;
    [key: string]: string | undefined;
}

// Novo tipo para valores de endereço
export type AddressValues = {
    cep: string;
    endereco?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    numero: string;
    [key: string]: string | undefined;
};

// Função para atualizar endereço do usuário
export async function handleCepBlur(
    userAddress: Address,
    setUserAddress: (addr: Address) => void
) {
    const cep = userAddress.cep.replace(/\D/g, "");
    if (cep.length === 8) {
        try {
            const data = await fetchAddressByCep(cep);
            setUserAddress({
                ...userAddress,
                endereco: data.logradouro || "",
                complemento: data.complemento || "",
                bairro: data.bairro || "",
                cidade: data.localidade || "",
                estado: data.uf || "",
                numero: userAddress.numero || "",
            });
        } catch { }
    }
}

// Função para atualizar formulário principal
export async function handleMainCepBlur(
    mainForm: Address,
    setMainForm: (form: Address) => void
) {
    const cep = mainForm.cep.replace(/\D/g, "");
    if (cep.length === 8) {
        try {
            const data = await fetchAddressByCep(cep);
            setMainForm({
                ...mainForm,
                endereco: data.logradouro || "",
                complemento: data.complemento || "",
                bairro: data.bairro || "",
                cidade: data.localidade || "",
                estado: data.uf || "",
                numero: mainForm.numero || "",
            });
        } catch { }
    }
}

// Função para preencher formulário usando react-hook-form
export async function fillFormAddressByCep(cep: string) {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
        return null;
    }
    
    try {
        const data = await fetchAddressByCep(cleanCep);
        if (!data || data.erro) {
            return null;
        }
        return {
            logradouro: data.logradouro || "",
            complemento: data.complemento || "",
            bairro: data.bairro || "",
            localidade: data.localidade || "",
            uf: data.uf || ""
        };
    } catch {
        // Não logamos o erro aqui para evitar poluir o console, mas retornamos null
        // O componente que chama esta função pode lidar com a UI adequadamente
        return null;
    }
}


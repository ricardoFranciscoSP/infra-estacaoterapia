export interface ViaCepResponse {
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string;
    uf: string;
    erro?: boolean;
}

interface BrasilApiResponse {
    cep: string;
    state: string;
    city: string;
    neighborhood: string;
    street: string;
    service: string;
}

// Função auxiliar para buscar CEP via backend (proxy)
const fetchViaBackend = async (cep: string): Promise<ViaCepResponse> => {
    // Importação dinâmica para evitar problemas com SSR
    const { api } = await import('@/lib/axios');
    
    try {
        const response = await api.get(`/address/cep/${cep}`, {
            timeout: 8000,
        });
        
        return {
            logradouro: response.data.logradouro || '',
            complemento: response.data.complemento || '',
            bairro: response.data.bairro || '',
            localidade: response.data.localidade || '',
            uf: response.data.uf || '',
        };
    } catch {
        throw new Error('Erro ao buscar CEP via backend');
    }
};

// Função auxiliar para buscar CEP usando BrasilAPI diretamente (fallback final)
const fetchBrasilApi = async (cep: string): Promise<ViaCepResponse> => {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
        cache: 'no-cache',
    });

    if (!response.ok) {
        throw new Error(`Erro ao buscar CEP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as BrasilApiResponse;
    
    if (!data || !data.street) {
        throw new Error('CEP não encontrado.');
    }

    return {
        logradouro: data.street || '',
        complemento: '',
        bairro: data.neighborhood || '',
        localidade: data.city || '',
        uf: data.state || '',
    };
};

export const fetchAddressByCep = async (cep: string): Promise<ViaCepResponse> => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
        throw new Error('CEP inválido. Deve conter 8 dígitos.');
    }

    // Tentativa 1: Via backend (proxy para ViaCEP e BrasilAPI)
    try {
        return await fetchViaBackend(cleanCep);
    } catch (backendError) {
        console.warn('[ViaCepService] Backend falhou, tentando BrasilAPI diretamente...', backendError);
    }

    // Tentativa 2: BrasilAPI diretamente (fallback final)
    // BrasilAPI tem CORS habilitado, então funciona diretamente do frontend
    try {
        return await fetchBrasilApi(cleanCep);
    } catch (brasilApiError) {
        console.error('[ViaCepService] Todas as tentativas falharam:', brasilApiError);
        throw new Error('Não foi possível buscar o CEP. Tente novamente.');
    }
};

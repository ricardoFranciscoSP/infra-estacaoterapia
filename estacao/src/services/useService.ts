import { api } from "@/lib/axios";
import { Plano } from "@/store/planoStore";

type UserData = {
    id?: string;
    nome: string;
    email: string;
    cpf: string;
    telefone: string;
    dataNascimento?: string;
    status: string;
    role: string;
    address?: Array<{
        cep: string;
        rua: string;
        numero: string;
        complemento?: string;
        bairro: string;
        cidade: string;
        estado: string;
    }>;
};

type PasswordData = {
    currentPassword: string;
    newPassword: string;
};

type ImageData = {
    file: File;
};

type OnboardingData = {
    userId: string;
    isComplete: boolean;
};

type EnderecoCobrancaData = {
    userId: string;
    cep: string;
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
};


export const userService = () => {
    return {
        getUser: () => api.get('/users/me'),
        getUserBasic: () => api.get('/users/user-basic'),
        getUserDetails: () => api.get('/users/user-details'),
        fetchUsers: () => api.get('/users'),
        fetchUserById: (id: string) => api.get(`/users/${id}`),
        updateUser: (data: UserData) => api.put('/users', data),
        changeUserPassword: (data: PasswordData) => api.post('/users/change-password', data),
        uploadUserImage: (data: ImageData) => {
            const formData = new FormData();
            formData.append("file", data.file); // campo "file" para o Multer
            return api.post('/users/image', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
        },
        listUserImages: () => api.get('/users/images'),
        updateUserImage: (id: string, data: ImageData) => {
            const formData = new FormData();
            formData.append("file", data.file); // campo "file" para o Multer
            return api.put(`/users/image/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
        },
        deleteUserImage: (imageId: string) => api.delete(`/users/image/${imageId}`),
        deleteUser: (id: string) => api.delete(`/users/${id}`),
        onboarding: (data: OnboardingData) => api.post('/users/onboarding', data),
        createEnderecoCobranca: (data: EnderecoCobrancaData) => api.post('/users/endereco-cobranca', data),
        updateIsOnboardingComplete: (isComplete: boolean) => api.put('/users/is-onboarding', { isComplete }),
        getUserPlano: () => api.get('/users/plano'),
        uploadContrato: (data: FormData) => api.post('/users/contrato', data),
        previaContrato: (data: Plano) => api.post(`/users/previa-contrato`, { plano: data }),
        gerarContrato: (data: Plano, assinaturaBase64: string, ipNavegador: string) => api.post(`/users/gerar-contrato`, { plano: data, assinaturaBase64, ipNavegador }),
    };
}

// store/api/userStore.ts
import { api } from '@/lib/axios';
import { userService } from '@/services/useService';
import type { User } from '@/hooks/user/userHook';

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

type OnboardingPayload = {
    status: boolean;
    objetivo?: string[];
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

export const fetchUserBasic = async (): Promise<User> => {
    const response = await userService().getUserBasic();
    return response.data as User;
};
export const fetchUserDetails = async () => {
    const response = await userService().getUserDetails();
    return response.data;
};

export const fetchUserMe = async () => {
    const response = await userService().getUser();
    return response.data;
};

export const fetchUsers = async () => {
    const response = await userService().fetchUsers();
    return response.data;
};

export const fetchUserById = async (id: string) => {
    const response = await userService().fetchUserById(id);
    return response.data;
};

export const updateUser = async (data: UserData) => {
    const response = await userService().updateUser(data);
    return response.data;
};

export const changeUserPassword = async (data: PasswordData) => {
    const response = await userService().changeUserPassword(data);
    return response.data;
};

export const uploadUserImage = async ({ file }: { file: File }) => {
    const response = await userService().uploadUserImage({ file });
    return response.data;
};

export const listUserImages = async () => {
    const response = await userService().listUserImages();
    return response.data;
};

export const updateUserImage = async (id: string, file: File) => {
    const response = await userService().updateUserImage(id, { file });
    return response.data;
};

export const deleteUserImage = async (imageId: string) => {
    const response = await userService().deleteUserImage(imageId);
    return response.data;
};

export const deleteUser = async (id: string) => {
    const response = await userService().deleteUser(id);
    return response.data;
};

export const createOnboarding = async (objetivos: string[]) => {
    const payload: OnboardingPayload = { status: true };
    if (objetivos && objetivos.length > 0) {
        payload.objetivo = Array.isArray(objetivos[0])
            ? objetivos.flat().map(String)
            : objetivos.map(String);
    }
    const response = await api.post('/users/onboarding', payload);
    return response.data;
};

export const createEnderecoCobranca = async (data: EnderecoCobrancaData) => {
    const response = await userService().createEnderecoCobranca(data);
    return response.data;
};

export const updateIsOnboardingComplete = async (data: { isComplete: boolean }) => {
    const response = await userService().updateIsOnboardingComplete(data.isComplete);
    return response.data;
};

export const getUserPlano = async () => {
    const response = await userService().getUserPlano();
    return response.data;
};
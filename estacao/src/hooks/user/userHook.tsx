// hooks/user/userHook.ts
import { queryClient } from '@/lib/queryClient';
import { changeUserPassword, createEnderecoCobranca, createOnboarding, deleteUser, deleteUserImage, fetchUserBasic, fetchUserById, fetchUserDetails, fetchUserMe, fetchUsers, listUserImages, updateUser, updateUserImage, uploadUserImage, updateIsOnboardingComplete, getUserPlano } from '@/store/api/userStore';
import { useUserStore } from '@/store/userStore';
// Hook para buscar endereços do usuário
export function useUserAddresses(userId: string) {
  const { fetchUserAddresses } = useUserStore();
  const query = useQuery({
    queryKey: ['userAddresses', userId],
    queryFn: () => fetchUserAddresses(userId),
    enabled: !!userId,
  });
  return {
    addresses: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

// Hook para criar/editar endereço do usuário
export function useSaveUserAddress() {
  const { saveUserAddress } = useUserStore();
  const mutation = useMutation({
    mutationFn: saveUserAddress,
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}
import { previaContrato, uploadContratoStore, gerarContrato } from '@/store/userStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import React from 'react';
import { Onboarding, User as UserType } from '../../types/userTypes';
import { Fatura } from '@/store/controleFaturaStore';
import { Plano } from '@/store/planoStore';

// Tipos
export interface PlanoCompra {
  status: string;
}

interface Image {
  Id: string;
  Url: string;
}

export interface User {
  Id: string;
  Nome: string;
  Email: string;
  Role: string;
  IsOnboard?: boolean;
  Status: string;
  Address?: boolean;
  PlanoCompra?: PlanoCompra | PlanoCompra[];
  ConsultaAvulsa?: unknown[]; 
  ControleFatura?: unknown[];
  Image?: Image | null; // Corrigido aqui
  Fatura?: Fatura[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  success?: boolean;
  Onboarding?: Onboarding | null;
  Onboardings?: Array<{
    Id: string;
    Completed: string;
    Step: string;
  }>;
  FinanceiroEntries?: Record<string, unknown> | null;
  VindiCustomerId?: string;
}

// Função para converter User do hook para User do store
function convertUserToStoreType(user: User): UserType {
  return {
    id: user.Id,
    name: user.Nome,
    email: user.Email,
    role: user.Role,
    Address: undefined, // Address no User do hook é boolean, não um array
  };
}


export interface UserDetails {
  Id: string;
  Nome: string; 
  Email: string;
  Cpf: string;
  Telefone: string;
  DataNascimento: Date | null;
  Status: string;
  Sexo: string;
  Role: string;
  DataAprovacao?: string | null;
  VindiCustomerId?: string;
  Address: Array<{
    Id: string;
    UserId: string;
    Cep: string;
    Rua: string;
    Numero: string;
    Complemento: string | null;
    Bairro: string;
    Cidade: string;
    Estado: string;
  }>;
  Image: {
    Id: string;
    UserId: string;
    Url: string;
  } | null;
  Fatura: Fatura[];
  FinanceiroEntries?: Record<string, unknown> | null; 
}

// Hook para buscar usuário logado básico
export function useUserBasic() {
  const { setUser } = useUserStore();

  const query = useQuery<User, Error>({
    queryKey: ['userBasic'],
    queryFn: fetchUserBasic,
    staleTime: 0,  // Sempre busca dados frescos em áreas logadas
    gcTime: 0,   // Não mantém cache em áreas logadas
    retry: 1,
    refetchOnWindowFocus: true, // Refetch quando a janela ganha foco
    refetchOnMount: true, // Sempre refetch ao montar o componente
    refetchOnReconnect: true, // Refetch ao reconectar
  });

  // ✅ Use useEffect para sincronizar com Zustand após sucesso
  React.useEffect(() => {
    if (query.data) {
      // Garante que query.data é do tipo User do hook antes de converter
      const userData: User = query.data;
      const convertedUser = convertUserToStoreType(userData);
      setUser(convertedUser);
    }
  }, [query.data, setUser]);

  return {
    user: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

// Hook para buscar usuário logado detalhes
export function useUserDetails() {
  const { setUser } = useUserStore();

  const query = useQuery<UserDetails, Error>({
    queryKey: ['userDetails'],
    queryFn: fetchUserDetails,
    staleTime: 0, // Sempre busca dados frescos em áreas logadas
    gcTime: 0, // Não mantém cache em áreas logadas
    retry: 1,
    refetchOnWindowFocus: true, // Refetch quando a janela ganha foco
    refetchOnMount: true, // Sempre refetch ao montar o componente
    refetchOnReconnect: true, // Refetch ao reconectar
  });

  // ✅ Use useEffect para sincronizar com Zustand após sucesso
  React.useEffect(() => {
    if (query.data) {
      // UserDetails tem campos diferentes, precisa de conversão específica
      const convertedUser: UserType = {
        id: query.data.Id,
        name: query.data.Nome,
        email: query.data.Email,
        role: query.data.Role,
        Address: Array.isArray(query.data.Address) ? query.data.Address.map(addr => ({
          ...addr,
        })) : undefined,
      };
      setUser(convertedUser);
    }
  }, [query.data, setUser]);

  return {
    user: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

// Hook para buscar usuário logado
export function useUserMe() {
  const { setUser } = useUserStore();

  const query = useQuery<UserDetails, Error>({
    queryKey: ['userMe'],
    queryFn: fetchUserMe,
    staleTime: 0, // Sempre busca dados frescos em áreas logadas
    gcTime: 0, // Não mantém cache em áreas logadas
    retry: 1,
    refetchOnWindowFocus: true, // Refetch quando a janela ganha foco
    refetchOnMount: true, // Sempre refetch ao montar o componente
    refetchOnReconnect: true, // Refetch ao reconectar
  });

  // ✅ Use useEffect para sincronizar com Zustand após sucesso
  React.useEffect(() => {
    if (query.data) {
      // UserDetails tem campos diferentes, precisa de conversão específica
      const convertedUser: UserType = {
        id: query.data.Id,
        name: query.data.Nome,
        email: query.data.Email,
        role: query.data.Role,
        Address: Array.isArray(query.data.Address) ? query.data.Address.map(addr => ({
          ...addr,
        })) : undefined,
      };
      setUser(convertedUser);
    }
  }, [query.data, setUser]);

  return {
    user: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

// Hook para buscar todos os usuários
export function useUsers() {
  const query = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  return {
    users: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

// Hook para buscar usuário por ID
export function useUserById(id: string) {
  const query = useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUserById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  return {
    user: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

// Hook para atualizar usuário
export function useUpdateUser() {
  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      // ✅ Invalidar queries para atualizar dados
      queryClient.invalidateQueries({ queryKey: ['userMe'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}

// Hook para trocar senha
export function useChangeUserPassword() {
  const mutation = useMutation({
    mutationFn: changeUserPassword,
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}

// Hook para upload de imagem
export function useUploadUserImage() {
  const mutation = useMutation({
    mutationFn: (params: { userId: string; file: File }) =>
      uploadUserImage(params),
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}

// Hook para listar imagens
export function useListUserImages() {
  const query = useQuery({
    queryKey: ['userImages'],
    queryFn: listUserImages,
    staleTime: 1000 * 60 * 5,
  });

  return {
    images: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

// Hook para atualizar imagem
export function useUpdateUserImage() {
  const mutation = useMutation({
    mutationFn: ({ imageId, file }: { imageId: string; file: File }) =>
      updateUserImage(imageId, file),
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}

// Hook para deletar imagem
export function useDeleteUserImage() {
  const mutation = useMutation({
    mutationFn: deleteUserImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userImages'] });
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}

// Hook para deletar usuário
export function useDeleteUser() {
  const mutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}

// Hook para onboarding
export function useOnboarding() {
  const mutation = useMutation({
    mutationFn: createOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userMe'] });
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}

// Hook para endereço de cobrança
export function useCreateEnderecoCobranca() {
  const mutation = useMutation({
    mutationFn: createEnderecoCobranca,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userMe'] });
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}

// Hook para atualizar status de onboarding do usuário
export function useUpdateIsOnboardingComplete() {
  const mutation = useMutation({
    mutationFn: ({ isComplete }: { isComplete: boolean }) => updateIsOnboardingComplete({ isComplete }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userMe'] });
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}

export function useGetUserPlano() {
  const query = useQuery({
    queryKey: ['userPlano'],
    queryFn: getUserPlano,
    staleTime: 0, // Sempre busca dados frescos em áreas logadas
    gcTime: 0, // Não mantém cache em áreas logadas
    refetchInterval: 5000, // Refetch a cada 5 segundos para atualização mais rápida em tempo real
    refetchIntervalInBackground: true, // Continua refetchando mesmo quando a aba está em background
    refetchOnWindowFocus: true, // Refetch quando a janela recebe foco
    refetchOnMount: true, // Sempre refetch ao montar o componente
    refetchOnReconnect: true, // Refetch ao reconectar
  });

  return {
    plano: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

// Hook para upload do contrato do usuário
export function useUploadContrato() {
  const mutation = useMutation({
    mutationFn: (file: File) => uploadContratoStore(file),
    // Se quiser invalidar queries após upload, adicione onSuccess aqui
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['userMe'] });
     },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    data: mutation.data,
    reset: mutation.reset,
  };
}

// Hook para obter prévia do contrato do psicólogo
export function usePreviaContrato(plano: Plano) {
    return useQuery({
        queryKey: ['previaContrato', plano],
        queryFn: async () => {
            return await previaContrato(plano);
        },
        enabled: true,
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });
}

// hooks/user/userHook.ts
export function useEnvioContrato() {
  return useMutation({
    mutationFn: async (payload: {
      plano: Plano,
      assinaturaBase64: string;
      IpNavegador: string;

    }) => {
      // Agora passa userId, planoId e assinaturaBase64 para gerarContrato
      return await gerarContrato(payload.plano, payload.assinaturaBase64, payload.IpNavegador);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userMe"] });
    },
  });
}

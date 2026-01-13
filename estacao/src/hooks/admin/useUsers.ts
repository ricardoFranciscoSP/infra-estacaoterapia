import { useQuery } from '@tanstack/react-query';
import { userService, User, ListUsersParams } from '@/services/userService';

export function useUsers(params?: ListUsersParams) {
    const query = useQuery<User[]>({
        queryKey: ['users', params?.search, params?.role],
        queryFn: async () => {
            const response = await userService.list(params);
            return response.data;
        },
        staleTime: 30 * 1000, // 30 segundos
        gcTime: 5 * 60 * 1000, // 5 minutos
        refetchOnWindowFocus: false,
    });

    return {
        users: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
}


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFavoritoStore, fetchFavoritos, addFavoritoApi, removeFavoritoApi } from '@/store/favoritoStore';
import { Favorite, FavoriteResponse } from '@/types/favoritosTypes';

// Hook para buscar todos os favoritos
export function useFavoritos() {
    const setFavoritos = useFavoritoStore(state => state.setFavoritos);

    const query = useQuery<FavoriteResponse>({
        queryKey: ['favoritos'],
        queryFn: async () => {
            const data = await fetchFavoritos();
            setFavoritos(data.favorites);
            return data;
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: true,
    });

    return {
        favoritos: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Hook para adicionar favorito
export function useAddFavorito() {
    const queryClient = useQueryClient();
    const addFavorito = useFavoritoStore(state => state.addFavorito);

    const mutation = useMutation({
        // Corrigido: recebe apenas o id do psicólogo (string)
        mutationFn: async (psychologistId: string) => {
            const data = await addFavoritoApi(psychologistId);
            return data;
        },
        onSuccess: (data: Favorite) => {
            addFavorito(data);
            queryClient.invalidateQueries({ queryKey: ['favoritos'] });
        },
    });

    return mutation;
}

// Hook para remover favorito
export function useRemoveFavorito() {
    const queryClient = useQueryClient();
    const removeFavorito = useFavoritoStore(state => state.removeFavorito);

    const mutation = useMutation<string, unknown, string>({
        mutationFn: removeFavoritoApi,
        onSuccess: (id: string) => {
            removeFavorito(id);
            queryClient.invalidateQueries({ queryKey: ['favoritos'] });
        },
    });

    return mutation;
}
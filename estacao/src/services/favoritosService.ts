import { api } from "@/lib/axios";

export const favoritosService = () => {
    return {
        getFavoritos: () => api.get('/favorites'),
        addFavorito: (id: string) => api.post(`/favorites/${id}`),
        removeFavorito: (id: string) => api.delete(`/favorites/${id}`),
    };
}
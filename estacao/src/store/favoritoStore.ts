import { create } from 'zustand';
import { favoritosService } from '@/services/favoritosService';
import { Favorite } from '@/types/favoritosTypes';


interface FavoritoStore {
    favoritos: Favorite[];
    setFavoritos: (favoritos: Favorite[]) => void;
    addFavorito: (favorito: Favorite) => void;
    removeFavorito: (id: string) => void;
}

export const useFavoritoStore = create<FavoritoStore>((set) => ({
    favoritos: [],
    setFavoritos: (favoritos) => set({ favoritos: Array.isArray(favoritos) ? favoritos : [] }),
    addFavorito: (favorito) => set((state) => ({
        favoritos: Array.isArray(state.favoritos)
            ? [...state.favoritos, favorito]
            : [favorito]
    })),
    removeFavorito: (id) => set((state) => ({
        favoritos: Array.isArray(state.favoritos)
            ? state.favoritos.filter((f) => f.id !== id)
            : []
    })),
}));

// Funções para usar com React Query
export const fetchFavoritos = async () => {
    try {
        const response = await favoritosService().getFavoritos();
        return response.data;
    } catch (error) {
        console.error('Failed to fetch favoritos:', error);
        throw error;
    }
};

export const addFavoritoApi = async (psychologistId: string) => {
    try {
        const response = await favoritosService().addFavorito(psychologistId);
        return response.data;
    } catch (error) {
        console.error('Failed to add favorito:', error);
        throw error;
    }
};

export const removeFavoritoApi = async (id: string) => {
    try {
        await favoritosService().removeFavorito(id);
        return id;
    } catch (error) {
        console.error('Failed to remove favorito:', error);
        throw error;
    }
};
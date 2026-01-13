export interface Favorite {
    id: string;
    psychologist: {
        id: string;
        name: string;
        image: string | null;
        crp: string;
    };
}

export interface FavoriteResponse {
    favorites: Favorite[];
    success: boolean;
}

export interface Favorito {
    psychologistId: string;
}
export interface FavoritoStore {
    setFavoritos: (favoritos: Favorite[]) => void;
    addFavorito: (favorito: Favorite) => void;
    removeFavorito: (favorito: Favorito) => void;
}
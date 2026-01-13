import { IFavoriteListResult, IFavoriteToggleResult } from "../types/favorite.types";

export interface IFavoriteService {
    toggleFavorite(patientId: string, psychologistId: string): Promise<IFavoriteToggleResult>;
    getAllFavorites(patientId: string): Promise<IFavoriteListResult>;
    deleteFavorite(id: string): Promise<IFavoriteListResult>;
}

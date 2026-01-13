export interface IFavoriteToggleResult {
    status: number;
    body: {
        message: string;
        success: boolean;
    };
}

export interface IFavoriteListResult {
    status: number;
    body: {
        favorites: Array<{
            id: string;
            psychologist: {
                id: string;
                name: string;
                crp: string;
                image: string | null;
            };
        }>;
        success: boolean;
    };
}

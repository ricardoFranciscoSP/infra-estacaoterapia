import prisma from "../prisma/client";
import { IFavoriteService } from "../interfaces/favorite.interface";
import { IFavoriteToggleResult, IFavoriteListResult } from "../types/favorite.types";

export class FavoriteService implements IFavoriteService {
    async toggleFavorite(patientId: string, psychologistId: string): Promise<IFavoriteToggleResult> {
        try {

            const existingFavorite = await prisma.favorite.findFirst({
                where: { PatientId: patientId, PsychologistId: psychologistId }
            });



            if (existingFavorite) {
                await prisma.favorite.delete({
                    where: { Id: existingFavorite.Id }
                });
                return {
                    status: 200,
                    body: {
                        message: "Favorito removido com sucesso",
                        success: true
                    }
                };
            } else {
                await prisma.favorite.create({
                    data: { PatientId: patientId, PsychologistId: psychologistId }
                });
                return {
                    status: 201,
                    body: {
                        message: "Favorito adicionado com sucesso",
                        success: true
                    }
                };
            }
        } catch (error) {
            return {
                status: 500,
                body: {
                    message: "Erro ao alternar favorito",
                    success: false
                }
            };
        }
    }

    async getAllFavorites(patientId: string): Promise<IFavoriteListResult> {
        try {
            const favorites = await prisma.favorite.findMany({
                where: { PatientId: patientId },
                include: {
                    Psychologist: {
                        include: {
                            Images: true
                        }
                    }
                }
            });

            const sanitizedFavorites = favorites.map((favorite: any) => ({
                id: favorite.Id,
                psychologist: {
                    id: favorite.Psychologist.Id,
                    name: favorite.Psychologist.Nome,
                    crp: favorite.Psychologist.Crp ?? "",
                    image: favorite.Psychologist.Images?.[0]?.Url || null
                }
            }));

            return {
                status: 200,
                body: {
                    favorites: sanitizedFavorites,
                    success: true
                }
            };
        } catch (error) {
            return {
                status: 500,
                body: {
                    favorites: [],
                    success: false
                }
            };
        }
    }

    async deleteFavorite(id: string): Promise<IFavoriteListResult> {
        try {
            const existingFavorite = await prisma.favorite.findUnique({
                where: { Id: id }
            });

            if (!existingFavorite) {
                return {
                    status: 404,
                    body: {
                        favorites: [],
                        success: false
                    }
                };
            }

            await prisma.favorite.delete({
                where: { Id: id }
            });

            return {
                status: 200,
                body: {
                    favorites: [],
                    success: true
                }
            };
        } catch (error) {
            return {
                status: 500,
                body: {
                    favorites: [],
                    success: false
                }
            };
        }
    }
}


import { PrismaClient } from "../generated/prisma";

const REFRESH_INTERVAL_MS = 2 * 60 * 1000;
let lastRefresh = 0;
let refreshing: Promise<void> | null = null;

export async function refreshAgendaAvailabilityView(prisma: PrismaClient) {
    const now = Date.now();
    if (now - lastRefresh < REFRESH_INTERVAL_MS) {
        return;
    }

    if (!refreshing) {
        refreshing = (async () => {
            try {
                await prisma.$executeRawUnsafe(
                    'REFRESH MATERIALIZED VIEW CONCURRENTLY "AgendaDisponibilidadeResumo"'
                );
                lastRefresh = Date.now();
            } catch (error) {
                console.error("[AgendaDisponibilidadeResumo] Falha ao atualizar materialized view:", error);
            } finally {
                refreshing = null;
            }
        })();
    }

    await refreshing;
}

import prisma from "../src/prisma/client";

async function refreshAgendaView() {
    console.log("🔄 [refresh] Atualizando AgendaDisponibilidadeResumo...");
    await prisma.$executeRawUnsafe(
        'REFRESH MATERIALIZED VIEW CONCURRENTLY "AgendaDisponibilidadeResumo"'
    );
    console.log("✅ [refresh] Concluído.");
}

refreshAgendaView()
    .catch((error) => {
        console.error("❌ [refresh] Erro ao atualizar a view:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

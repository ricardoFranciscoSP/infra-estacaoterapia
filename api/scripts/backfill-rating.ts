import prisma from "../src/prisma/client";

const CHUNK_SIZE = 100;

async function backfillRatings() {
    console.log("🔄 [backfill] Recalculando médias de avaliações...");

    const psychologists = await prisma.user.findMany({
        where: {
            Role: "Psychologist",
            deletedAt: null,
            Status: { not: "Deletado" },
        },
        select: { Id: true },
    });

    if (psychologists.length === 0) {
        console.log("ℹ️ [backfill] Nenhum psicólogo encontrado.");
        return;
    }

    const aggregates = await prisma.review.groupBy({
        by: ["PsicologoId"],
        where: {
            Status: "Aprovado",
        },
        _avg: { Rating: true },
        _count: { Rating: true },
    });

    const aggregateById = new Map(
        aggregates.map((item) => [
            item.PsicologoId,
            {
                average: item._avg.Rating ?? 0,
                count: item._count.Rating ?? 0,
            },
        ])
    );

    for (let i = 0; i < psychologists.length; i += CHUNK_SIZE) {
        const chunk = psychologists.slice(i, i + CHUNK_SIZE);
        const updates = chunk.map((psicologo) => {
            const aggregate = aggregateById.get(psicologo.Id);
            return prisma.user.update({
                where: { Id: psicologo.Id },
                data: {
                    RatingAverage: aggregate?.average ?? 0,
                    RatingCount: aggregate?.count ?? 0,
                },
            });
        });

        await prisma.$transaction(updates);
        console.log(`✅ [backfill] Atualizados ${Math.min(i + CHUNK_SIZE, psychologists.length)} de ${psychologists.length}`);
    }

    console.log("✅ [backfill] Concluído.");
}

backfillRatings()
    .catch((error) => {
        console.error("❌ [backfill] Erro ao recalcular médias:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

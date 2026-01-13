import prisma from '../prisma/client';

async function deletarAgendasAntigas() {
    const hoje = new Date();
    await prisma.agenda.deleteMany({
        where: {
            Data: { lt: hoje },
            Status: { notIn: ['Disponivel', 'Concluido'] }
        }
    });
}

export const deletarAgendasAnterioresCron = async () => {
    await deletarAgendasAntigas();
};


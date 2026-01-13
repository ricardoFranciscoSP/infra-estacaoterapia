import dotenv from 'dotenv';
import prisma from '../prisma/client';

dotenv.config();

export async function cronQueryControl() {
    try {
        const now = new Date(); // UTC, mas funciona bem para comparação com Date no banco

        // Busca registros ativos com vencimento menor que agora
        const expirados = await prisma.assinaturaPlano.findMany({
            where: {
                Status: 'Ativo',
                DataFim: {
                    lt: now, // vencimento menor que agora
                },
            },
        });

        if (expirados.length > 0) {
            const updatePromises = expirados.map((ctrl: any) =>
                prisma.assinaturaPlano.update({
                    where: { Id: ctrl.Id },
                    data: { Status: 'Expirado' }
                })
            );
            await Promise.all(updatePromises);
            console.log(`Registros AssinaturaPlano atualizados para expirado:`, expirados.map((e: any) => e.Id));
        } else {
            console.log('Nenhum registro AssinaturaPlano vencido encontrado.');
        }

    } catch (error) {
        if (error instanceof Error) {
            console.error('Erro ao executar cron para inativar planos:', error.message);
        } else {
            console.error('Erro ao executar cron para inativar planos:', error);
        }
    }
}
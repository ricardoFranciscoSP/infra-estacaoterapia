import prisma from "../prisma/client";

/**
 * Retorna o percentual de repasse para o psicólogo conforme seu tipo de pessoa.
 * Busca os valores configurados no banco de dados.
 * Regra: Autônomo (sem PJ) => percentualRepasseAutonomo | Jurídica (com PJ) => percentualRepasseJuridico
 * Assunção: Considera-se PJ quando existir registro em PessoalJuridica vinculado ao PsicologoId.
 */
export async function getRepassePercentForPsychologist(psicologoId: string | null | undefined): Promise<number> {
    try {
        // Busca configurações do banco
        const configuracao = await prisma.configuracao.findFirst({
            select: {
                percentualRepasseJuridico: true,
                percentualRepasseAutonomo: true,
            },
        });

        const percentualJuridico = configuracao?.percentualRepasseJuridico ?? 40.0;
        const percentualAutonomo = configuracao?.percentualRepasseAutonomo ?? 32.0;

        if (!psicologoId) {
            return percentualAutonomo / 100; // Retorna como decimal (0.32)
        }

        const pj = await prisma.pessoalJuridica.findUnique({
            where: { PsicologoId: psicologoId },
            select: { Id: true }
        });

        // Converte de porcentagem (40.0) para decimal (0.40)
        return pj ? percentualJuridico / 100 : percentualAutonomo / 100;
    } catch (e) {
        console.error("Erro ao buscar percentual de repasse:", e);
        // Em caso de qualquer erro, aplica percentual padrão mais conservador (autônomo)
        return 0.32;
    }
}

/**
 * Calcula o valor de repasse com base no montante e no tipo do psicólogo.
 */
export async function calculateRepasse(amount: number, psicologoId: string | null | undefined): Promise<number> {
    const percent = await getRepassePercentForPsychologist(psicologoId);
    const value = amount * percent;
    return Number.isFinite(value) ? parseFloat(value.toFixed(2)) : 0;
}

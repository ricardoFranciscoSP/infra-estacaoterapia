import prisma from "../prisma/client";

const INDEX_STATEMENTS = [
    // Índice simples para Status e Date (sem expressão complexa)
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consulta_status_date
     ON "Consulta" ("Status", "Date")`,
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consulta_status_inicio
     ON "Consulta" ("Status", "InicioEm")`,
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservasessao_consulta
     ON "ReservaSessao" ("ConsultaId")`,
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agenda_consulta
     ON "Consulta" ("AgendaId")`,
];

/**
 * Garante índices obrigatórios sem bloqueio (CONCURRENTLY)
 * Não usa transação para permitir CONCURRENTLY.
 */
export async function ensureStatusIndexes(): Promise<void> {
    for (const statement of INDEX_STATEMENTS) {
        await prisma.$executeRawUnsafe(statement);
    }
}

// src/utils/uid.util.ts
/**
 * Gera um Uid numérico de 8 dígitos derivado do UUID do usuário.
 * Se não houver 8 dígitos, preenche com zeros à esquerda.
 */
export function deriveUidFromUuid(userId: string): number {
    const onlyDigits = String(userId).replace(/\D/g, '');
    let last8 = onlyDigits.slice(-8);
    if (last8.length < 8) {
        last8 = last8.padStart(8, '0');
    }
    const uid = Number(last8);
    if (isNaN(uid) || !uid) {
        throw new Error(`Uid inválido: userId=${userId}`);
    }
    return uid;
}

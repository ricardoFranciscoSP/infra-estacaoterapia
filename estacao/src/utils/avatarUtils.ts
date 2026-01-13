/**
 * Utilitário para gerenciamento de avatares na aplicação
 */

interface AvatarData {
    avatarUrl?: string;
    Url?: string;
    imageUrl?: string;
    url?: string; // Adiciona suporte para o formato { url: string }
}

/**
 * Obtém a URL do avatar com fallback para Profile.svg
 * @param avatarData - Dados do avatar (pode ter diferentes propriedades)
 * @returns URL do avatar ou fallback
 */
export function getAvatarUrl(avatarData?: AvatarData | null): string {
    if (!avatarData) {
        return "/assets/avatar-placeholder.svg";
    }

    // Verifica as diferentes propriedades possíveis de avatar
    const possibleUrls = [
        avatarData.avatarUrl,
        avatarData.Url,
        avatarData.imageUrl,
        avatarData.url
    ];

    // Retorna a primeira URL válida encontrada
    for (const url of possibleUrls) {
        if (url && url.trim() !== '') {
            return url;
        }
    }

    // Fallback padrão
    return "/assets/avatar-placeholder.svg";
}

/**
 * Determina qual avatar usar baseado no contexto (psicólogo vs paciente)
 * @param isPsicologoPanel - Se está no painel do psicólogo
 * @param psicologoData - Dados do psicólogo
 * @param pacienteData - Dados do paciente
 * @returns URL do avatar apropriado
 */
export function getContextualAvatar(
    isPsicologoPanel: boolean,
    psicologoData?: AvatarData | null,
    pacienteData?: AvatarData | null
): string {
    if (isPsicologoPanel) {
        // No painel do psicólogo, mostra avatar do paciente
        return getAvatarUrl(pacienteData);
    } else {
        // No painel do paciente, mostra avatar do psicólogo
        return getAvatarUrl(psicologoData);
    }
}

/**
 * Verifica se o usuário está no painel do psicólogo baseado na URL
 * @param pathname - Caminho atual da URL
 * @returns true se estiver no painel do psicólogo
 */
export function isPsicologoPanel(pathname?: string): boolean {
    if (!pathname) {
        return false;
    }
    return pathname.startsWith('/painel-psicologo');
}
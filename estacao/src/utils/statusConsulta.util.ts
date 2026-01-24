/**
 * Utilitários para normalização e exibição de status de consultas no frontend
 * Baseado na tabela de especificação fornecida
 */

/**
 * Status normalizados de consultas conforme especificação
 */
export enum StatusConsulta {
    Agendada = "Agendada",
    EmAndamento = "Em Andamento",
    Realizada = "Realizada",
    PacienteNaoCompareceu = "Paciente Não Compareceu",
    PsicologoNaoCompareceu = "Psicólogo Não Compareceu",
    ForaDaPlataforma = "Fora da plataforma",
    Fora_plataforma = "Fora da Plataforma (fora do sistema)",
    CanceladaPacienteNoPrazo = "Cancelada Paciente no Prazo",
    CanceladaPsicologoNoPrazo = "Cancelada Psicólogo no Prazo",
    ReagendadaPacienteNoPrazo = "Reagendada Paciente no Prazo",
    ReagendadaPsicologoNoPrazo = "Reagendada Psicólogo no Prazo",
    CanceladaPacienteForaPrazo = "Cancelada Paciente Fora do Prazo",
    CanceladaPsicologoForaPrazo = "Cancelada Psicólogo Fora do Prazo",
    CanceladaForcaMaior = "Cancelada Força Maior",
    CanceladaNaoCumprimentoContratualPaciente = "Cancelada Não Cumprimento Contratual Paciente",
    ReagendadaPsicologoForaPrazo = "Reagendada Psicólogo Fora do Prazo",
    CanceladaNaoCumprimentoContratualPsicologo = "Cancelada Não Cumprimento Contratual Psicólogo",
    PsicologoDescredenciado = "Psicólogo Descredenciado",
    CanceladoAdministrador = "Cancelado Administrador"
}

/**
 * Mapeia status antigos do sistema para os novos status normalizados (apenas para exibição)
 * Inclui todos os status do enum ConsultaStatus
 */
export const MAPEAMENTO_STATUS_EXIBICAO: Record<string, string> = {
    // Status básicos
    "Reservado": "Reservado",
    "Agendado": "Reservado",
    "Agendada": StatusConsulta.Agendada,
    "Andamento": StatusConsulta.EmAndamento,
    "EmAndamento": StatusConsulta.EmAndamento,
    "Em Andamento": StatusConsulta.EmAndamento,
    "Concluido": StatusConsulta.Realizada,
    "Concluído": StatusConsulta.Realizada,
    "Realizada": StatusConsulta.Realizada,
    "ForaDaPlataforma": StatusConsulta.ForaDaPlataforma,
    "Fora da plataforma": StatusConsulta.ForaDaPlataforma,
    "Fora_plataforma": StatusConsulta.Fora_plataforma,
    "Fora plataforma": StatusConsulta.Fora_plataforma,

    // Status cancelados (legados)
    "Cancelado": "Cancelada",
    "Cancelled_by_patient": "Cancelada pelo paciente",
    "Cancelled_by_psychologist": "Cancelada pelo psicólogo",
    "Cancelled_no_show": StatusConsulta.PacienteNaoCompareceu,

    // Status do enum ConsultaStatus - Canceladas (com espaços e sem espaços)
    "CanceladaPacienteNoPrazo": "Cancelada pelo paciente",
    "Cancelada Paciente no Prazo": "Cancelada pelo paciente",
    "CanceladaPsicologoNoPrazo": "Cancelada pelo psicólogo",
    "Cancelada Psicólogo no Prazo": "Cancelada pelo psicólogo",
    "CanceladaPacienteForaDoPrazo": "Cancelada pelo paciente (fora do prazo)",
    "Cancelada Paciente Fora do Prazo": "Cancelada pelo paciente (fora do prazo)",
    "CanceladaPsicologoForaDoPrazo": "Cancelada pelo psicólogo (fora do prazo)",
    "Cancelada Psicólogo Fora do Prazo": "Cancelada pelo psicólogo (fora do prazo)",
    "CanceladaForcaMaior": StatusConsulta.CanceladaForcaMaior,
    "Cancelada Força Maior": StatusConsulta.CanceladaForcaMaior,
    "CanceladaNaoCumprimentoContratualPaciente": "Cancelada - não cumprimento contratual",
    "Cancelada Não Cumprimento Contratual Paciente": "Cancelada - não cumprimento contratual",
    "CanceladaNaoCumprimentoContratualPsicologo": "Cancelada - não cumprimento contratual",
    "Cancelada Não Cumprimento Contratual Psicólogo": "Cancelada - não cumprimento contratual",
    "CanceladoAdministrador": StatusConsulta.CanceladoAdministrador,
    "Cancelado Administrador": StatusConsulta.CanceladoAdministrador,

    // Status do enum ConsultaStatus - Reagendadas (com espaços e sem espaços)
    "ReagendadaPacienteNoPrazo": "Reagendada pelo paciente",
    "Reagendada Paciente no Prazo": "Reagendada pelo paciente",
    "ReagendadaPsicologoNoPrazo": "Reagendada pelo psicólogo",
    "Reagendada Psicólogo no Prazo": "Reagendada pelo psicólogo",
    "ReagendadaPsicologoForaDoPrazo": "Reagendada pelo psicólogo (fora do prazo)",
    "Reagendada Psicólogo Fora do Prazo": "Reagendada pelo psicólogo (fora do prazo)",
    "Reagendada": "Reagendada",

    // Status do enum ConsultaStatus - Não compareceu (com espaços e sem espaços)
    "PacienteNaoCompareceu": StatusConsulta.PacienteNaoCompareceu,
    "Paciente Não Compareceu": StatusConsulta.PacienteNaoCompareceu,
    "PsicologoNaoCompareceu": StatusConsulta.PsicologoNaoCompareceu,
    "Psicólogo Não Compareceu": StatusConsulta.PsicologoNaoCompareceu,

    // Status do enum ConsultaStatus - Outros (com espaços e sem espaços)
    "PsicologoDescredenciado": StatusConsulta.PsicologoDescredenciado,
    "Psicólogo Descredenciado": StatusConsulta.PsicologoDescredenciado,

    // Status antigos/legados
    "Ausente": StatusConsulta.PacienteNaoCompareceu,
    // Novos status sistêmicos de inatividade
    "CANCELAMENTO_SISTEMICO_PSICOLOGO": "Cancelada pelo sistema (psicólogo ausente)",
    "CANCELAMENTO_SISTEMICO_PACIENTE": "Cancelada pelo sistema (paciente ausente)",
    "ForaDaPlataforma": "Fora da plataforma"
};

/**
 * Normaliza um status para exibição ao usuário
 * Converte status "emendados" (como ReagendadaPacienteNoPrazo) em textos legíveis
 * 
 * @param statusAntigo - Status atual do sistema
 * @returns Status normalizado para exibição
 */
export function normalizarStatusExibicao(statusAntigo: string | null | undefined): string {
    if (!statusAntigo) {
        return "Reservado";
    }

    // Remove espaços e normaliza
    const statusNormalizado = statusAntigo.trim();

    // Mapeamento direto
    if (MAPEAMENTO_STATUS_EXIBICAO[statusNormalizado]) {
        return MAPEAMENTO_STATUS_EXIBICAO[statusNormalizado];
    }

    // Tenta encontrar por case-insensitive
    const statusLower = statusNormalizado.toLowerCase();
    for (const [key, value] of Object.entries(MAPEAMENTO_STATUS_EXIBICAO)) {
        if (key.toLowerCase() === statusLower) {
            return value;
        }
    }

    // Se não encontrou no mapeamento, tenta normalizar status "emendados"
    // Exemplo: "ReagendadaPacienteNoPrazo" -> "Reagendada pelo paciente"
    if (statusNormalizado.includes("Reagendada")) {
        if (statusNormalizado.includes("PacienteNoPrazo")) {
            return "Reagendada pelo paciente";
        }
        if (statusNormalizado.includes("PsicologoNoPrazo")) {
            return "Reagendada pelo psicólogo";
        }
        if (statusNormalizado.includes("PsicologoForaDoPrazo")) {
            return "Reagendada pelo psicólogo (fora do prazo)";
        }
        return "Reagendada";
    }

    if (statusNormalizado.includes("Cancelada") || statusNormalizado.includes("Cancelado")) {
        if (statusNormalizado.includes("PacienteNoPrazo")) {
            return "Cancelada pelo paciente";
        }
        if (statusNormalizado.includes("PsicologoNoPrazo")) {
            return "Cancelada pelo psicólogo";
        }
        if (statusNormalizado.includes("PacienteForaDoPrazo")) {
            return "Cancelada pelo paciente (fora do prazo)";
        }
        if (statusNormalizado.includes("PsicologoForaDoPrazo")) {
            return "Cancelada pelo psicólogo (fora do prazo)";
        }
        if (statusNormalizado.includes("ForcaMaior")) {
            return "Cancelada por força maior";
        }
        if (statusNormalizado.includes("NaoCumprimentoContratual")) {
            return "Cancelada - não cumprimento contratual";
        }
        if (statusNormalizado.includes("Administrador")) {
            return "Cancelada pelo administrador";
        }
        return "Cancelada";
    }

    if (statusNormalizado.includes("NaoCompareceu")) {
        if (statusNormalizado.includes("Paciente")) {
            return "Paciente não compareceu";
        }
        if (statusNormalizado.includes("Psicologo")) {
            return "Psicólogo não compareceu";
        }
    }

    if (statusNormalizado.includes("Descredenciado")) {
        return "Psicólogo descredenciado";
    }

    // Fallback: capitaliza primeira letra e adiciona espaços antes de maiúsculas
    return statusNormalizado
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .replace(/^./, (str) => str.toUpperCase());
}

/**
 * Obtém a cor do badge baseado no status
 */
export function getStatusColor(status: string): string {
    const statusLower = status.toLowerCase();

    if (statusLower.includes("realizada") || statusLower.includes("concluido") || statusLower.includes("agendada")) {
        return "bg-green-50 text-green-700 border-green-200";
    }

    if (statusLower.includes("cancelada") || statusLower.includes("cancelado") || statusLower.includes("cancelamento_sistemico")) {
        return "bg-red-50 text-red-700 border-red-200";
    }

    if (statusLower.includes("andamento") || statusLower.includes("em andamento")) {
        return "bg-blue-50 text-blue-700 border-blue-200";
    }

    if (statusLower.includes("reagendada")) {
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
    }

    return "bg-gray-50 text-gray-700 border-gray-200";
}

/**
 * Mapeamento completo de status para exibição nos cards de consultas
 * Inclui todos os status conforme a tabela de especificação
 */
export function getStatusTagMap(): Record<string, { texto: string; bg: string; text: string }> {
    return {
        // Status principais
        'Agendada': { texto: 'Agendada', bg: 'bg-[#E6E9FF]', text: 'text-[#6D75C0]' },
        'agendada': { texto: 'Agendada', bg: 'bg-[#E6E9FF]', text: 'text-[#6D75C0]' },
        // Tag igual à de consultas restantes: bg-[#C7D2FE] text-[#3730A3] font-bold
        'Reservado': { texto: 'Reservado', bg: 'bg-[#C7D2FE]', text: 'text-[#3730A3] font-bold' },
        'reservado': { texto: 'Reservado', bg: 'bg-[#C7D2FE]', text: 'text-[#3730A3] font-bold' },
        'Agendado': { texto: 'Agendada', bg: 'bg-[#E6E9FF]', text: 'text-[#6D75C0]' },

        // Em andamento
        'EmAndamento': { texto: 'Em Andamento', bg: 'bg-[#E6F4EA]', text: 'text-[#2E7D32]' },
        'Em Andamento': { texto: 'Em Andamento', bg: 'bg-[#E6F4EA]', text: 'text-[#2E7D32]' },
        'Andamento': { texto: 'Em Andamento', bg: 'bg-[#E6F4EA]', text: 'text-[#2E7D32]' },
        'andamento': { texto: 'Em Andamento', bg: 'bg-[#E6F4EA]', text: 'text-[#2E7D32]' },

        // Realizada
        'Realizada': { texto: 'Concluída', bg: 'bg-[#E3F2FD]', text: 'text-[#1976D2]' },
        'realizada': { texto: 'Concluída', bg: 'bg-[#E3F2FD]', text: 'text-[#1976D2]' },
        'Concluido': { texto: 'Concluída', bg: 'bg-[#E3F2FD]', text: 'text-[#1976D2]' },
        'Concluído': { texto: 'Concluída', bg: 'bg-[#E3F2FD]', text: 'text-[#1976D2]' },
        'concluido': { texto: 'Concluída', bg: 'bg-[#E3F2FD]', text: 'text-[#1976D2]' },
        'concluído': { texto: 'Concluída', bg: 'bg-[#E3F2FD]', text: 'text-[#1976D2]' },
        'Completed': { texto: 'Concluída', bg: 'bg-[#E3F2FD]', text: 'text-[#1976D2]' },
        'completed': { texto: 'Concluída', bg: 'bg-[#E3F2FD]', text: 'text-[#1976D2]' },

        // Não compareceu
        'PacienteNaoCompareceu': { texto: 'Paciente não compareceu', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'Paciente Não Compareceu': { texto: 'Paciente não compareceu', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'PsicologoNaoCompareceu': { texto: 'Psicólogo não compareceu', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'Psicólogo Não Compareceu': { texto: 'Psicólogo não compareceu', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'Cancelled_no_show': { texto: 'Não compareceu', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'cancelled_no_show': { texto: 'Não compareceu', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'Ausente': { texto: 'Não compareceu', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },

        // Canceladas no prazo
        'CanceladaPacienteNoPrazo': { texto: 'Cancelada pelo paciente', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'Cancelada Paciente no Prazo': { texto: 'Cancelada pelo paciente', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'CanceladaPsicologoNoPrazo': { texto: 'Cancelada pelo psicólogo', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'Cancelada Psicólogo no Prazo': { texto: 'Cancelada pelo psicólogo', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'Cancelled_by_patient': { texto: 'Cancelada pelo paciente', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'cancelled_by_patient': { texto: 'Cancelada pelo paciente', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'Cancelled_by_psychologist': { texto: 'Cancelada pelo psicólogo', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'cancelled_by_psychologist': { texto: 'Cancelada pelo psicólogo', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },

        // Canceladas fora do prazo
        'CanceladaPacienteForaDoPrazo': { texto: 'Cancelada pelo paciente (fora do prazo)', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'Cancelada Paciente Fora do Prazo': { texto: 'Cancelada pelo paciente (fora do prazo)', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'CanceladaPsicologoForaDoPrazo': { texto: 'Cancelada pelo psicólogo (fora do prazo)', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'Cancelada Psicólogo Fora do Prazo': { texto: 'Cancelada pelo psicólogo (fora do prazo)', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },

        // Reagendadas
        'ReagendadaPacienteNoPrazo': { texto: 'Reagendada pelo paciente', bg: 'bg-[#FFF4E6]', text: 'text-[#E65100]' },
        'Reagendada Paciente no Prazo': { texto: 'Reagendada pelo paciente', bg: 'bg-[#FFF4E6]', text: 'text-[#E65100]' },
        'ReagendadaPsicologoNoPrazo': { texto: 'Reagendada pelo psicólogo', bg: 'bg-[#FFF4E6]', text: 'text-[#E65100]' },
        'Reagendada Psicólogo no Prazo': { texto: 'Reagendada pelo psicólogo', bg: 'bg-[#FFF4E6]', text: 'text-[#E65100]' },
        'ReagendadaPsicologoForaDoPrazo': { texto: 'Reagendada pelo psicólogo (fora do prazo)', bg: 'bg-[#FFF4E6]', text: 'text-[#E65100]' },
        'Reagendada Psicólogo Fora do Prazo': { texto: 'Reagendada pelo psicólogo (fora do prazo)', bg: 'bg-[#FFF4E6]', text: 'text-[#E65100]' },
        'Reagendada': { texto: 'Reagendada', bg: 'bg-[#FFF4E6]', text: 'text-[#E65100]' },
        'reagendada': { texto: 'Reagendada', bg: 'bg-[#FFF4E6]', text: 'text-[#E65100]' },

        // Canceladas especiais (com e sem espaços)
        'CanceladaForcaMaior': { texto: 'Cancelada por força maior', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'Cancelada Força Maior': { texto: 'Cancelada por força maior', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'CanceladaNaoCumprimentoContratualPaciente': { texto: 'Cancelada - não cumprimento contratual', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'Cancelada Não Cumprimento Contratual Paciente': { texto: 'Cancelada - não cumprimento contratual', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'CanceladaNaoCumprimentoContratualPsicologo': { texto: 'Cancelada - não cumprimento contratual', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'Cancelada Não Cumprimento Contratual Psicólogo': { texto: 'Cancelada - não cumprimento contratual', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'PsicologoDescredenciado': { texto: 'Psicólogo descredenciado', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'Psicólogo Descredenciado': { texto: 'Psicólogo descredenciado', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'CanceladoAdministrador': { texto: 'Cancelada pelo administrador', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'Cancelado Administrador': { texto: 'Cancelada pelo administrador', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'CANCELAMENTO_SISTEMICO_PSICOLOGO': { texto: 'Cancelada pelo sistema (psicólogo ausente)', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'CANCELAMENTO_SISTEMICO_PACIENTE': { texto: 'Cancelada pelo sistema (paciente ausente)', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },

        // Status genérico (fallback)
        'Cancelado': { texto: 'Cancelada', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
        'cancelado': { texto: 'Cancelada', bg: 'bg-[#FFE5E5]', text: 'text-[#C53030]' },
    };
}

/**
 * Obtém informações de tag para exibição de status
 * @param status - Status da consulta
 * @returns Objeto com texto, bg e text para o badge
 */
export function getStatusTagInfo(status: string | undefined | null): { texto: string; bg: string; text: string } {
    if (!status) {
        return { texto: 'Reservado', bg: 'bg-[#E6E9FF]', text: 'text-[#6D75C0]' };
    }

    const statusMap = getStatusTagMap();
    const statusNormalized = normalizarStatusExibicao(status);

    // Tenta encontrar o status normalizado primeiro
    if (statusMap[statusNormalized]) {
        return statusMap[statusNormalized];
    }

    // Tenta encontrar o status original (case insensitive)
    const statusLower = status.toLowerCase();
    for (const [key, value] of Object.entries(statusMap)) {
        if (key.toLowerCase() === statusLower) {
            return value;
        }
    }

    // Fallback
    return { texto: statusNormalized, bg: 'bg-[#E6E9FF]', text: 'text-[#6D75C0]' };
}



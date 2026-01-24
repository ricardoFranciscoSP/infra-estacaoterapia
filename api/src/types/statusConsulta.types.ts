/**
 * Enums e tipos normalizados para status de consultas conforme tabela de especificação
 * Baseado na tabela fornecida pelo usuário
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
    CancelamentoSistemicoPsicologo = "Cancelamento Sistêmico Psicólogo",
    CancelamentoSistemicoPaciente = "Cancelamento Sistêmico Paciente",
    ForaDaPlataforma = "Fora da plataforma",
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
 * Origem do status (quem ou o que iniciou o status)
 */
export enum OrigemStatus {
    Sistemico = "Sistêmico",
    Paciente = "Paciente",
    Psicologo = "Psicólogo",
    AdminGestao = "Admin / Gestão"
}

/**
 * Ação sobre o saldo do cliente
 */
export enum AcaoSaldoCliente {
    NaoAltera = "Não altera",
    NaoDevolve = "Não devolve",
    DevolveSessao = "Devolve sessão",
    DevolveSessaoSeDeferida = "Devolve sessão (se deferida)",
    DevolveSessaoAbrandaPenaSeDeferida = "Devolve sessão (abranda pena, se deferida)",
    NaoDevolveSeDeferida = "Não devolve (se deferida)"
}

/**
 * Indica se o serviço deve ser faturado (repasse para psicólogo)
 */
export enum Faturada {
    Sim = "Sim",
    Nao = "Não",
    SimNao = "Sim/Não" // Condicional
}

/**
 * Configuração completa de um status de consulta
 */
export interface ConfiguracaoStatusConsulta {
    status: StatusConsulta;
    origemStatus: OrigemStatus;
    telaTrigger: string;
    acaoSaldoCliente: AcaoSaldoCliente;
    faturada: Faturada;
}

/**
 * Mapeamento completo de todos os status conforme tabela
 */
export const CONFIGURACOES_STATUS: Record<StatusConsulta, ConfiguracaoStatusConsulta> = {
    [StatusConsulta.Agendada]: {
        status: StatusConsulta.Agendada,
        origemStatus: OrigemStatus.Sistemico, // Pode ser Sistêmico/Psicólogo/Admin - será validado na origem
        telaTrigger: "Home - Módulo Agendamento de Consultas",
        acaoSaldoCliente: AcaoSaldoCliente.NaoAltera,
        faturada: Faturada.Sim
    },
    [StatusConsulta.EmAndamento]: {
        status: StatusConsulta.EmAndamento,
        origemStatus: OrigemStatus.Sistemico,
        telaTrigger: "Home - Módulo Agendamento de Consultas",
        acaoSaldoCliente: AcaoSaldoCliente.NaoAltera,
        faturada: Faturada.Sim
    },
    [StatusConsulta.Realizada]: {
        status: StatusConsulta.Realizada,
        origemStatus: OrigemStatus.Sistemico,
        telaTrigger: "Home - Módulo Agendamento de Consultas",
        acaoSaldoCliente: AcaoSaldoCliente.NaoAltera,
        faturada: Faturada.Sim
    },
    [StatusConsulta.PacienteNaoCompareceu]: {
        status: StatusConsulta.PacienteNaoCompareceu,
        origemStatus: OrigemStatus.Sistemico,
        telaTrigger: "Módulo Realização de Sessão",
        acaoSaldoCliente: AcaoSaldoCliente.NaoDevolve,
        faturada: Faturada.Sim
    },
    [StatusConsulta.PsicologoNaoCompareceu]: {
        status: StatusConsulta.PsicologoNaoCompareceu,
        origemStatus: OrigemStatus.Sistemico,
        telaTrigger: "Módulo Realização de Sessão",
        acaoSaldoCliente: AcaoSaldoCliente.DevolveSessao,
        faturada: Faturada.Nao
    },
    [StatusConsulta.CancelamentoSistemicoPsicologo]: {
        status: StatusConsulta.CancelamentoSistemicoPsicologo,
        origemStatus: OrigemStatus.Sistemico,
        telaTrigger: "Módulo Realização de Sessão",
        acaoSaldoCliente: AcaoSaldoCliente.DevolveSessao,
        faturada: Faturada.Nao
    },
    [StatusConsulta.CancelamentoSistemicoPaciente]: {
        status: StatusConsulta.CancelamentoSistemicoPaciente,
        origemStatus: OrigemStatus.Sistemico,
        telaTrigger: "Módulo Realização de Sessão",
        acaoSaldoCliente: AcaoSaldoCliente.NaoDevolve,
        faturada: Faturada.Sim
    },
    [StatusConsulta.ForaDaPlataforma]: {
        status: StatusConsulta.ForaDaPlataforma,
        origemStatus: OrigemStatus.AdminGestao,
        telaTrigger: "Sistêmico",
        acaoSaldoCliente: AcaoSaldoCliente.NaoDevolve,
        faturada: Faturada.Sim
    },
    [StatusConsulta.CanceladaPacienteNoPrazo]: {
        status: StatusConsulta.CanceladaPacienteNoPrazo,
        origemStatus: OrigemStatus.Paciente,
        telaTrigger: "Home - Módulo Agendamento de Consultas",
        acaoSaldoCliente: AcaoSaldoCliente.DevolveSessao,
        faturada: Faturada.Nao
    },
    [StatusConsulta.CanceladaPsicologoNoPrazo]: {
        status: StatusConsulta.CanceladaPsicologoNoPrazo,
        origemStatus: OrigemStatus.Psicologo,
        telaTrigger: "Home - Módulo Agendamento de Consultas",
        acaoSaldoCliente: AcaoSaldoCliente.DevolveSessao,
        faturada: Faturada.Nao
    },
    [StatusConsulta.ReagendadaPacienteNoPrazo]: {
        status: StatusConsulta.ReagendadaPacienteNoPrazo,
        origemStatus: OrigemStatus.Paciente,
        telaTrigger: "Home - Módulo Agendamento de Consultas",
        acaoSaldoCliente: AcaoSaldoCliente.DevolveSessao,
        faturada: Faturada.Nao
    },
    [StatusConsulta.ReagendadaPsicologoNoPrazo]: {
        status: StatusConsulta.ReagendadaPsicologoNoPrazo,
        origemStatus: OrigemStatus.Psicologo,
        telaTrigger: "Home - Módulo Agendamento de Consultas",
        acaoSaldoCliente: AcaoSaldoCliente.DevolveSessao,
        faturada: Faturada.Nao
    },
    [StatusConsulta.CanceladaPacienteForaPrazo]: {
        status: StatusConsulta.CanceladaPacienteForaPrazo,
        origemStatus: OrigemStatus.Paciente,
        telaTrigger: "Home - Módulo Agendamento de Consultas",
        acaoSaldoCliente: AcaoSaldoCliente.NaoDevolve,
        faturada: Faturada.Sim
    },
    [StatusConsulta.CanceladaPsicologoForaPrazo]: {
        status: StatusConsulta.CanceladaPsicologoForaPrazo,
        origemStatus: OrigemStatus.Psicologo,
        telaTrigger: "Home - Módulo Agendamento de Consultas",
        // SEMPRE devolve sessão ao paciente - a nota "abranda pena, se deferida" refere-se apenas à penalização do psicólogo
        acaoSaldoCliente: AcaoSaldoCliente.DevolveSessao,
        faturada: Faturada.SimNao
    },
    [StatusConsulta.CanceladaForcaMaior]: {
        status: StatusConsulta.CanceladaForcaMaior,
        origemStatus: OrigemStatus.Sistemico,
        telaTrigger: "Home - Módulo Agendamento de Consultas",
        acaoSaldoCliente: AcaoSaldoCliente.DevolveSessao, // SEMPRE devolve sessão (garantia legal)
        faturada: Faturada.Nao
    },
    [StatusConsulta.CanceladaNaoCumprimentoContratualPaciente]: {
        status: StatusConsulta.CanceladaNaoCumprimentoContratualPaciente,
        origemStatus: OrigemStatus.Psicologo,
        telaTrigger: "Módulo Realização de Sessão",
        acaoSaldoCliente: AcaoSaldoCliente.NaoDevolveSeDeferida,
        faturada: Faturada.Sim // SEMPRE faz repasse de 40% (garantia legal)
    },
    [StatusConsulta.ReagendadaPsicologoForaPrazo]: {
        status: StatusConsulta.ReagendadaPsicologoForaPrazo,
        origemStatus: OrigemStatus.Psicologo,
        telaTrigger: "Módulo Realização de Sessão",
        acaoSaldoCliente: AcaoSaldoCliente.DevolveSessao,
        faturada: Faturada.Nao
    },
    [StatusConsulta.CanceladaNaoCumprimentoContratualPsicologo]: {
        status: StatusConsulta.CanceladaNaoCumprimentoContratualPsicologo,
        origemStatus: OrigemStatus.Paciente,
        telaTrigger: "Módulo Realização de Sessão",
        acaoSaldoCliente: AcaoSaldoCliente.DevolveSessaoSeDeferida,
        faturada: Faturada.SimNao
    },
    [StatusConsulta.PsicologoDescredenciado]: {
        status: StatusConsulta.PsicologoDescredenciado,
        origemStatus: OrigemStatus.AdminGestao,
        telaTrigger: "Sistêmico",
        acaoSaldoCliente: AcaoSaldoCliente.DevolveSessao,
        faturada: Faturada.Nao
    },
    [StatusConsulta.CanceladoAdministrador]: {
        status: StatusConsulta.CanceladoAdministrador,
        origemStatus: OrigemStatus.AdminGestao,
        telaTrigger: "Home - Módulo Agendamento de Consultas",
        acaoSaldoCliente: AcaoSaldoCliente.DevolveSessao,
        faturada: Faturada.Nao
    }
};

/**
 * Mapeia status antigos do sistema para os novos status normalizados
 */
export const MAPEAMENTO_STATUS_ANTIGOS: Record<string, StatusConsulta> = {
    "Reservado": StatusConsulta.Agendada,
    "Agendado": StatusConsulta.Agendada,
    "Andamento": StatusConsulta.EmAndamento,
    "Em Andamento": StatusConsulta.EmAndamento,
    "Concluido": StatusConsulta.Realizada,
    "Concluído": StatusConsulta.Realizada,
    "Realizada": StatusConsulta.Realizada,
    "Cancelado": StatusConsulta.CanceladaPacienteNoPrazo, // Default, será ajustado conforme contexto
    "Cancelled_by_patient": StatusConsulta.CanceladaPacienteNoPrazo, // Será ajustado conforme prazo
    "Cancelled_by_psychologist": StatusConsulta.CanceladaPsicologoNoPrazo, // Será ajustado conforme prazo
    "Cancelled_no_show": StatusConsulta.PacienteNaoCompareceu,
    "Reagendada": StatusConsulta.ReagendadaPacienteNoPrazo, // Será ajustado conforme contexto
    "Ausente": StatusConsulta.PacienteNaoCompareceu,
    "CANCELAMENTO_SISTEMICO_PSICOLOGO": StatusConsulta.CancelamentoSistemicoPsicologo,
    "CANCELAMENTO_SISTEMICO_PACIENTE": StatusConsulta.CancelamentoSistemicoPaciente,
    "ForaDaPlataforma": StatusConsulta.ForaDaPlataforma,
    "Fora da plataforma": StatusConsulta.ForaDaPlataforma
};

/**
 * Determina se deve fazer repasse (faturada) baseado no status e condições
 * 
 * @param status - Status normalizado da consulta
 * @param cancelamentoDeferido - Se o cancelamento foi deferido (para status condicionais)
 * @returns true se deve fazer repasse, false caso contrário
 */
export function deveFazerRepasse(
    status: StatusConsulta,
    cancelamentoDeferido?: boolean
): boolean {
    const config = CONFIGURACOES_STATUS[status];
    
    if (!config) {
        console.warn(`[deveFazerRepasse] Status não encontrado: ${status}`);
        return false;
    }
    
    // Se é "Sim", sempre faz repasse
    if (config.faturada === Faturada.Sim) {
        return true;
    }
    
    // Se é "Não", nunca faz repasse
    if (config.faturada === Faturada.Nao) {
        return false;
    }
    
    // Se é "Sim/Não", depende de condições específicas
    if (config.faturada === Faturada.SimNao) {
        // Para status condicionais, verifica se foi deferido
        // Se não foi deferido, não faz repasse
        if (cancelamentoDeferido === false) {
            return false;
        }
        
        // Para status específicos com lógica condicional
        if (status === StatusConsulta.CanceladaPsicologoForaPrazo) {
            // "Sim/Não" - Se psicólogo cancelou fora do prazo:
            // - Se foi deferido (abranda pena): NÃO faz repasse
            // - Se não foi deferido (penalidade): FAZ repasse
            return cancelamentoDeferido !== true;
        }
        
        if (status === StatusConsulta.CanceladaNaoCumprimentoContratualPaciente) {
            // SEMPRE faz repasse de 40% (garantia legal - pode gerar processo)
            return true;
        }
        
        if (status === StatusConsulta.CanceladaNaoCumprimentoContratualPsicologo) {
            // "Sim/Não" - Se psicólogo não cumpriu contrato:
            // - Se foi deferido: NÃO faz repasse (penalidade ao psicólogo)
            // - Se não foi deferido: NÃO faz repasse (aguardando análise)
            return false; // Não faz repasse em ambos os casos
        }
        
        // Default para Sim/Não: não faz repasse se não especificado
        return false;
    }
    
    return false;
}

/**
 * Determina a ação sobre o saldo do cliente baseado no status
 * 
 * REGRA DE NEGÓCIO:
 * - Responsável = Psicólogo / Administrador / Sistema → SEMPRE devolve sessão
 * - Responsável = Paciente → NÃO devolve sessão
 * - Força Maior → Devolve sessão SOMENTE se deferido
 * 
 * Status que DEVEM devolver (independente de deferimento):
 * - PsicologoNaoCompareceu
 * - CanceladaPsicologoNoPrazo
 * - CanceladaPsicologoForaDoPrazo (a nota "abranda pena, se deferida" refere-se apenas à penalização do psicólogo)
 * - ReagendadaPsicologoNoPrazo
 * - ReagendadaPsicologoForaPrazo
 * - PsicologoDescredenciado
 * - CanceladoAdministrador
 * 
 * Status que NÃO devolvem:
 * - PacienteNaoCompareceu
 * - CanceladaPacienteForaDoPrazo
 * - CanceladaNaoCumprimentoContratualPaciente
 * 
 * Status condicionais:
 * - CanceladaForcaMaior → Devolve SOMENTE se deferido
 * 
 * @param status - Status normalizado da consulta
 * @param cancelamentoDeferido - Se o cancelamento foi deferido (para ações condicionais)
 * @returns true se deve devolver sessão, false caso contrário
 */
export function deveDevolverSessao(
    status: StatusConsulta,
    cancelamentoDeferido?: boolean
): boolean {
    const config = CONFIGURACOES_STATUS[status];
    
    if (!config) {
        console.warn(`[deveDevolverSessao] Status não encontrado: ${status}`);
        return false;
    }
    
    switch (config.acaoSaldoCliente) {
        case AcaoSaldoCliente.DevolveSessao:
            // SEMPRE devolve (status de responsabilidade do psicólogo/admin/sistema)
            return true;
        case AcaoSaldoCliente.DevolveSessaoSeDeferida:
            // Devolve SOMENTE se deferido (caso: Força Maior)
            return cancelamentoDeferido === true;
        case AcaoSaldoCliente.DevolveSessaoAbrandaPenaSeDeferida:
            // DEPRECATED: Não deve mais ser usado. CanceladaPsicologoForaDoPrazo agora sempre devolve.
            // Mantido apenas para compatibilidade, mas retorna true para garantir que sempre devolve
            return true;
        case AcaoSaldoCliente.NaoDevolve:
            // Nunca devolve (status de responsabilidade do paciente)
            return false;
        case AcaoSaldoCliente.NaoDevolveSeDeferida:
            // Não devolve (caso: CanceladaNaoCumprimentoContratualPaciente)
            return false;
        case AcaoSaldoCliente.NaoAltera:
        default:
            return false;
    }
}

/**
 * Normaliza um status antigo para o novo status padronizado
 * 
 * @param statusAntigo - Status antigo do sistema
 * @param contexto - Contexto adicional (tipo de cancelamento, prazo, etc.)
 * @returns Status normalizado
 */
export function normalizarStatus(
    statusAntigo: string,
    contexto?: {
        tipoCancelamento?: "Paciente" | "Psicologo" | "Admin" | "Sistema";
        dentroPrazo?: boolean;
        motivo?: string;
        cancelamentoDeferido?: boolean;
    }
): StatusConsulta {
    const statusLower = statusAntigo.toLowerCase().trim();
    
    // Mapeamento direto
    if (statusLower === "reservado" || statusLower === "agendado") {
        return StatusConsulta.Agendada;
    }
    
    if (statusLower === "andamento" || statusLower === "em andamento") {
        return StatusConsulta.EmAndamento;
    }
    
    if (statusLower === "concluido" || statusLower === "concluído" || statusLower === "realizada") {
        return StatusConsulta.Realizada;
    }
    
    // Cancelamentos
    if (statusLower.includes("cancel") || statusLower.includes("cancelado")) {
        // Verifica se é no-show
        if (statusLower.includes("no_show") || statusLower.includes("no-show") || statusLower.includes("ausente")) {
            // Verifica quem não compareceu
            if (contexto?.motivo?.toLowerCase().includes("paciente") || 
                contexto?.motivo?.toLowerCase().includes("não compareceu")) {
                return StatusConsulta.PacienteNaoCompareceu;
            }
            return StatusConsulta.PsicologoNaoCompareceu;
        }
        
        // Verifica tipo de cancelamento
        const tipo = contexto?.tipoCancelamento || "Paciente";
        const dentroPrazo = contexto?.dentroPrazo ?? true;
        const tipoStr = String(tipo).toLowerCase();
        
        // Verifica motivo para força maior ou não cumprimento contratual primeiro
        const motivo = contexto?.motivo?.toLowerCase() || "";
        if (motivo.includes("força maior") || motivo.includes("forca maior")) {
            return StatusConsulta.CanceladaForcaMaior;
        }
        
        if (motivo.includes("não cumprimento") || motivo.includes("nao cumprimento")) {
            if (tipoStr === "paciente" || tipoStr === "patient") {
                return StatusConsulta.CanceladaNaoCumprimentoContratualPaciente;
            }
            return StatusConsulta.CanceladaNaoCumprimentoContratualPsicologo;
        }
        
        if (tipoStr === "paciente" || tipoStr === "patient") {
            return dentroPrazo 
                ? StatusConsulta.CanceladaPacienteNoPrazo 
                : StatusConsulta.CanceladaPacienteForaPrazo;
        }
        
        if (tipoStr === "psicologo" || tipoStr === "psychologist") {
            return dentroPrazo 
                ? StatusConsulta.CanceladaPsicologoNoPrazo 
                : StatusConsulta.CanceladaPsicologoForaPrazo;
        }
        
        if (tipoStr === "admin" || tipoStr === "management" || tipoStr === "sistema") {
            return StatusConsulta.CanceladoAdministrador;
        }
        
        // Default para cancelamento de paciente no prazo
        return StatusConsulta.CanceladaPacienteNoPrazo;
    }
    
    // Reagendamentos
    if (statusLower.includes("reagend") || statusLower.includes("reagendada")) {
        const tipo = contexto?.tipoCancelamento || "Paciente";
        const dentroPrazo = contexto?.dentroPrazo ?? true;
        const tipoStr = String(tipo).toLowerCase();
        
        if (tipoStr === "paciente" || tipoStr === "patient") {
            return StatusConsulta.ReagendadaPacienteNoPrazo;
        }
        
        if (tipoStr === "psicologo" || tipoStr === "psychologist") {
            return dentroPrazo 
                ? StatusConsulta.ReagendadaPsicologoNoPrazo 
                : StatusConsulta.ReagendadaPsicologoForaPrazo;
        }
    }
    
    // Default: retorna Agendada
    return StatusConsulta.Agendada;
}



/**
 * Constantes de Status de Consulta normalizadas
 * Baseadas na tabela de especificação (12/12/2025)
 * Inclui: Origem, Gatilho, Ação de Saldo e Faturada (Repasse Psicólogo)
 */

export enum ConsultaOrigemStatus {
  Sistemico = "Sistêmico",
  Psicologo = "Psicólogo",
  Admin = "Admin",
  Paciente = "Paciente",
  Management = "Management",
}

export enum ConsultaTelaGatilho {
  HomeAgendamento = "Home - Módulo Agendamento de Consultas",
  ModuloRealizacaoSessao = "Módulo Realização de Sessão",
  SistemicoModuloAgendamento = "Sistêmico",
}

export enum ConsultaAcaoSaldo {
  NaoAltera = "Não altera",
  NaoDevolve = "Não devolve",
  DevolveSessionCarta = "Devolve sessão",
  DevolveSessionSeDeferida = "Devolve sessão (se deferida)",
  DevolveSessionAbrandaPena = "Devolve sessão (abranda pena, se deferida)",
  NaoDevolveSeDeferida = "Não devolve (se deferida)",
}

/**
 * Mapeamento completo de status conforme tabela fornecida
 */
export const CONSULTA_STATUS_CONFIG = {
  agendada: {
    status: "Agendada",
    origemStatus: [ConsultaOrigemStatus.Sistemico, ConsultaOrigemStatus.Psicologo, ConsultaOrigemStatus.Admin],
    telaGatilho: ConsultaTelaGatilho.HomeAgendamento,
    acaoSaldo: ConsultaAcaoSaldo.NaoAltera,
    faturada: true,
    descricao: "Agenda criada, Psicólogo disponível, Paciente marcado",
  },
  emAndamento: {
    status: "EmAndamento",
    origemStatus: [ConsultaOrigemStatus.Sistemico],
    telaGatilho: ConsultaTelaGatilho.ModuloRealizacaoSessao,
    acaoSaldo: ConsultaAcaoSaldo.NaoAltera,
    faturada: true,
    descricao: "Consulta iniciada, ambos conectados",
  },
  realizada: {
    status: "Realizada",
    origemStatus: [ConsultaOrigemStatus.Sistemico],
    telaGatilho: ConsultaTelaGatilho.ModuloRealizacaoSessao,
    acaoSaldo: ConsultaAcaoSaldo.NaoAltera,
    faturada: true,
    descricao: "Consulta completada normalmente",
  },
  pacienteNaoCompareceu: {
    status: "PacienteNaoCompareceu",
    origemStatus: [ConsultaOrigemStatus.Sistemico],
    telaGatilho: ConsultaTelaGatilho.ModuloRealizacaoSessao,
    acaoSaldo: ConsultaAcaoSaldo.NaoDevolve,
    faturada: true, // Faturada: Sim
    descricao: "Falta do paciente",
  },
  psicologoNaoCompareceu: {
    status: "PsicologoNaoCompareceu",
    origemStatus: [ConsultaOrigemStatus.Sistemico],
    telaGatilho: ConsultaTelaGatilho.ModuloRealizacaoSessao,
    acaoSaldo: ConsultaAcaoSaldo.DevolveSessionCarta,
    faturada: false,
    descricao: "Falta do psicólogo",
  },
  canceladaPacienteNoPrazo: {
    status: "CanceladaPacienteNoPrazo",
    origemStatus: [ConsultaOrigemStatus.Paciente],
    telaGatilho: ConsultaTelaGatilho.HomeAgendamento,
    acaoSaldo: ConsultaAcaoSaldo.DevolveSessionCarta,
    faturada: false,
    descricao: "Paciente cancela com tempo (>24h)",
  },
  canceladaPsicologoNoPrazo: {
    status: "CanceladaPsicologoNoPrazo",
    origemStatus: [ConsultaOrigemStatus.Psicologo],
    telaGatilho: ConsultaTelaGatilho.HomeAgendamento,
    acaoSaldo: ConsultaAcaoSaldo.DevolveSessionCarta,
    faturada: false,
    descricao: "Psicólogo cancela com tempo (>24h)",
  },
  canceladaPacienteForaDoPrazo: {
    status: "CanceladaPacienteForaDoPrazo",
    origemStatus: [ConsultaOrigemStatus.Paciente],
    telaGatilho: ConsultaTelaGatilho.HomeAgendamento,
    acaoSaldo: ConsultaAcaoSaldo.NaoDevolve,
    faturada: true, // Faturada: Sim
    descricao: "Paciente cancela fora da janela (<24h)",
  },
  canceladaPsicologoForaDoPrazo: {
    status: "CanceladaPsicologoForaDoPrazo",
    origemStatus: [ConsultaOrigemStatus.Psicologo],
    telaGatilho: ConsultaTelaGatilho.HomeAgendamento,
    // SEMPRE devolve sessão ao paciente - a nota "abranda pena, se deferida" refere-se apenas à penalização do psicólogo
    acaoSaldo: ConsultaAcaoSaldo.DevolveSessionCarta,
    faturada: "Sim/Não", // Condicional conforme deferimento
    descricao: "Psicólogo cancela fora da janela (com análise)",
  },
  canceladaForcaMaior: {
    status: "CanceladaForcaMaior",
    origemStatus: [ConsultaOrigemStatus.Sistemico],
    telaGatilho: ConsultaTelaGatilho.HomeAgendamento,
    acaoSaldo: ConsultaAcaoSaldo.DevolveSessionSeDeferida,
    faturada: false,
    descricao: "Cancelamento do sistema (após análise)",
  },
  reagendadaPacienteNoPrazo: {
    status: "ReagendadaPacienteNoPrazo",
    origemStatus: [ConsultaOrigemStatus.Paciente],
    telaGatilho: ConsultaTelaGatilho.HomeAgendamento,
    acaoSaldo: ConsultaAcaoSaldo.DevolveSessionCarta,
    faturada: false,
    descricao: "Paciente reagenda com antecedência (>24h)",
  },
  reagendadaPsicologoNoPrazo: {
    status: "ReagendadaPsicologoNoPrazo",
    origemStatus: [ConsultaOrigemStatus.Psicologo],
    telaGatilho: ConsultaTelaGatilho.HomeAgendamento,
    acaoSaldo: ConsultaAcaoSaldo.DevolveSessionCarta,
    faturada: false,
    descricao: "Psicólogo reagenda com antecedência (>24h)",
  },
  reagendadaPsicologoForaPrazo: {
    status: "ReagendadaPsicologoForaDoPrazo",
    origemStatus: [ConsultaOrigemStatus.Psicologo],
    telaGatilho: ConsultaTelaGatilho.ModuloRealizacaoSessao,
    acaoSaldo: ConsultaAcaoSaldo.DevolveSessionCarta,
    faturada: false,
    descricao: "Psicólogo reagenda fora da janela",
  },
  canceladaNaoCumprimentoContratualPaciente: {
    status: "CanceladaNaoCumprimentoContratualPaciente",
    origemStatus: [ConsultaOrigemStatus.Psicologo, ConsultaOrigemStatus.Admin],
    telaGatilho: ConsultaTelaGatilho.ModuloRealizacaoSessao,
    acaoSaldo: ConsultaAcaoSaldo.NaoDevolveSeDeferida,
    faturada: "Sim/Não", // Condicional conforme deferimento
    descricao: "Cancelada por não cumprimento contratual do paciente",
  },
  canceladaNaoCumprimentoContratualPsicologo: {
    status: "CanceladaNaoCumprimentoContratualPsicologo",
    origemStatus: [ConsultaOrigemStatus.Paciente],
    telaGatilho: ConsultaTelaGatilho.ModuloRealizacaoSessao,
    acaoSaldo: ConsultaAcaoSaldo.DevolveSessionSeDeferida,
    faturada: "Sim/Não", // Condicional conforme deferimento
    descricao: "Cancelada por não cumprimento contratual do psicólogo",
  },
  psicologoDescredenciado: {
    status: "PsicologoDescredenciado",
    origemStatus: [ConsultaOrigemStatus.Admin, ConsultaOrigemStatus.Management],
    telaGatilho: ConsultaTelaGatilho.SistemicoModuloAgendamento,
    acaoSaldo: ConsultaAcaoSaldo.DevolveSessionCarta,
    faturada: false,
    descricao: "Psicólogo descredenciado",
  },
  canceladoAdministrador: {
    status: "CanceladoAdministrador",
    origemStatus: [ConsultaOrigemStatus.Admin, ConsultaOrigemStatus.Management],
    telaGatilho: ConsultaTelaGatilho.HomeAgendamento,
    acaoSaldo: ConsultaAcaoSaldo.DevolveSessionCarta,
    faturada: false,
    descricao: "Cancelado por administrador",
  },
  cancelamentoSistemicoPsicologo: {
    status: "CANCELAMENTO_SISTEMICO_PSICOLOGO",
    origemStatus: [ConsultaOrigemStatus.Sistemico],
    telaGatilho: ConsultaTelaGatilho.ModuloRealizacaoSessao,
    acaoSaldo: ConsultaAcaoSaldo.DevolveSessionCarta,
    faturada: false,
    descricao: "Cancelamento automático por inatividade do psicólogo",
  },
  cancelamentoSistemicoPaciente: {
    status: "CANCELAMENTO_SISTEMICO_PACIENTE",
    origemStatus: [ConsultaOrigemStatus.Sistemico],
    telaGatilho: ConsultaTelaGatilho.ModuloRealizacaoSessao,
    acaoSaldo: ConsultaAcaoSaldo.NaoDevolve,
    faturada: true,
    descricao: "Cancelamento automático por inatividade do paciente",
  },
  foraDaPlataforma: {
    status: "ForaDaPlataforma",
    origemStatus: [ConsultaOrigemStatus.Admin, ConsultaOrigemStatus.Management],
    telaGatilho: ConsultaTelaGatilho.SistemicoModuloAgendamento,
    acaoSaldo: ConsultaAcaoSaldo.NaoDevolve,
    faturada: true,
    descricao: "Consulta realizada fora da plataforma - psicólogo trabalhou, sessão consumida",
  },
  reservado: {
    status: "Reservado",
    origemStatus: [ConsultaOrigemStatus.Sistemico, ConsultaOrigemStatus.Psicologo],
    telaGatilho: ConsultaTelaGatilho.HomeAgendamento,
    acaoSaldo: ConsultaAcaoSaldo.NaoAltera,
    faturada: true,
    descricao: "Status legado - preferir Agendada",
  },
  cancelado: {
    status: "Cancelado",
    origemStatus: [ConsultaOrigemStatus.Sistemico],
    telaGatilho: ConsultaTelaGatilho.HomeAgendamento,
    acaoSaldo: ConsultaAcaoSaldo.DevolveSessionCarta,
    faturada: false,
    descricao: "Status genérico legado",
  },
};

/**
 * Funções auxiliares para manipular status de consulta
 */
export class ConsultaStatusHelper {
  /**
   * Retorna se uma consulta deve ser faturada baseado em seu status
   * Nota: Para casos condicionais ("Sim/Não"), retorna false e a lógica deve usar
   * a função deveFazerRepasse de statusConsulta.types.ts com o contexto de deferimento
   */
  static deveSerFaturada(status: string, cancelamentoDeferido?: boolean): boolean {
    const config = Object.values(CONSULTA_STATUS_CONFIG).find((c) => c.status === status);
    if (!config) return false;

    // Se é string "Sim/Não", é condicional - retorna false por padrão
    // A lógica completa deve usar deveFazerRepasse de statusConsulta.types.ts
    if (typeof config.faturada === "string" && config.faturada === "Sim/Não") {
      // Para compatibilidade, retorna false - use deveFazerRepasse para lógica completa
      return false;
    }

    return config.faturada === true;
  }

  /**
   * Retorna se uma consulta devolve sessão/crédito
   */
  static devolveSessiono(status: string): boolean {
    const config = Object.values(CONSULTA_STATUS_CONFIG).find((c) => c.status === status);
    return config?.acaoSaldo !== ConsultaAcaoSaldo.NaoAltera;
  }

  /**
   * Retorna a origem padrão para um status
   */
  static getOrigemPadrao(status: string): string {
    const config = Object.values(CONSULTA_STATUS_CONFIG).find((c) => c.status === status);
    return config?.origemStatus[0] ?? ConsultaOrigemStatus.Sistemico;
  }

  /**
   * Valida se uma origem é válida para um status
   */
  static isOrigemValida(status: string, origem: string): boolean {
    const config = Object.values(CONSULTA_STATUS_CONFIG).find((c) => c.status === status);
    return config?.origemStatus.includes(origem as ConsultaOrigemStatus) ?? false;
  }

  /**
   * Retorna a descrição de um status
   */
  static getDescricao(status: string): string {
    const config = Object.values(CONSULTA_STATUS_CONFIG).find((c) => c.status === status);
    return config?.descricao ?? "Status desconhecido";
  }

  /**
   * Retorna a tela/gatilho padrão para um status
   */
  static getTelaGatilho(status: string): string {
    const config = Object.values(CONSULTA_STATUS_CONFIG).find((c) => c.status === status);
    return config?.telaGatilho ?? "Desconhecido";
  }

  /**
   * Retorna a ação de saldo para um status
   */
  static getAcaoSaldo(status: string): string {
    const config = Object.values(CONSULTA_STATUS_CONFIG).find((c) => c.status === status);
    return config?.acaoSaldo ?? ConsultaAcaoSaldo.NaoAltera;
  }

  /**
   * Lista todos os status disponíveis
   */
  static listarStatus(): string[] {
    return Object.values(CONSULTA_STATUS_CONFIG).map((c) => c.status);
  }

  /**
   * Retorna a config completa de um status
   */
  static getConfig(status: string) {
    return Object.values(CONSULTA_STATUS_CONFIG).find((c) => c.status === status);
  }
}

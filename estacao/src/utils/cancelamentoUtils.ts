/**
 * Utilitários para cancelamento de consultas
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Verifica se o cancelamento está sendo feito com maior ou igual a 24 horas de antecedência
 * Usa timezone de São Paulo para ser consistente com o backend
 * 
 * Regra: "Caso precise reagendar ou cancelar sua consulta, se possível efetue com uma 
 * antecedência maior a 24 horas da mesma, caso contrário ela será cobrada normalmente."
 * 
 * - >= 24h de antecedência: não é cobrado (devolve sessão) - modal simples
 * - < 24h de antecedência: é cobrado normalmente (não devolve sessão) - modal com motivo
 * 
 * @param date Data da consulta (string no formato YYYY-MM-DD ou Date)
 * @param time Horário da consulta (string no formato HH:MM)
 * @returns true se estiver dentro do prazo (>=24h), false se estiver fora do prazo (<24h)
 */
export function isCancelamentoDentroPrazo(date?: string | Date, time?: string): boolean {
  if (!date || !time) return false;
  
  try {
    // Extrai apenas a data no formato YYYY-MM-DD
    let dateOnly: string;
    if (typeof date === 'string') {
      dateOnly = date.split('T')[0].split(' ')[0];
    } else {
      // Date object - converte para YYYY-MM-DD no timezone de São Paulo
      dateOnly = dayjs(date).tz('America/Sao_Paulo').format('YYYY-MM-DD');
    }
    
    // Valida formato
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      console.error('[isCancelamentoDentroPrazo] Formato de data inválido:', dateOnly);
      return false;
    }
    
    // Valida horário
    const [hora, minuto] = time.split(":").map(Number);
    if (isNaN(hora) || isNaN(minuto)) {
      console.error('[isCancelamentoDentroPrazo] Formato de horário inválido:', time);
      return false;
    }
    
    // Cria data/hora da consulta no timezone de São Paulo
    const dataConsulta = dayjs.tz(`${dateOnly} ${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`, 'America/Sao_Paulo');
    
    // Data/hora atual no timezone de São Paulo
    const agora = dayjs().tz('America/Sao_Paulo');
    
    // Calcula diferença em horas
    const diffHoras = dataConsulta.diff(agora, 'hour', true); // true para retornar decimal
    
    // Maior ou igual a 24 horas (>=)
    const dentroPrazo = diffHoras >= 24;
    
    console.log('[isCancelamentoDentroPrazo] Verificação de prazo', {
      dateOnly,
      time,
      dataConsulta: dataConsulta.format('YYYY-MM-DD HH:mm:ss'),
      agora: agora.format('YYYY-MM-DD HH:mm:ss'),
      diffHoras: diffHoras.toFixed(2),
      dentroPrazo
    });
    
    return dentroPrazo;
  } catch (error) {
    console.error('[isCancelamentoDentroPrazo] Erro ao verificar prazo de cancelamento:', error);
    return false;
  }
}

/**
 * Lista completa de motivos de cancelamento categorizados
 */

// Motivos APROVADOS (Força Maior) - Exigem comprovação e podem resultar em estorno
export const MOTIVOS_APROVADOS = [
  "acidente_ocorrencia_pessoal",
  "acompanhamento_familiar_doente",
  "agravamento_saude_cronica",
  "catastrofes_naturais",
  "compromissos_academicos",
  "compromissos_profissionais",
  "crise_ansiedade_panico",
  "doenca_subita",
  "emergencia_familiar",
  "falecimento_familiar",
  "falta_conexao_operadora",
  "interrupcao_internet_cliente",
  "internacao_hospitalar",
  "obrigacao_legal_judicial",
  "pane_eletrica",
  "problemas_equipamento",
  "procedimento_medico_emergencial",
  "roubo_furto_violencia"
];

// Motivos REPROVADOS - Não se enquadram como força maior, desconta do saldo
export const MOTIVOS_REPROVADOS = [
  "conflito_compromisso",
  "preso_reuniao",
  "instabilidade_internet",
  "atraso_sessao",
  "problemas_barulho_ambiente",
  "problemas_pessoais"
];

/**
 * Verifica se um motivo é aprovado (força maior)
 */
export function isMotivoAprovado(motivo: string): boolean {
  return MOTIVOS_APROVADOS.includes(motivo);
}

/**
 * Verifica se um motivo é reprovado (não força maior)
 */
export function isMotivoReprovado(motivo: string): boolean {
  return MOTIVOS_REPROVADOS.includes(motivo);
}

/**
 * Lista completa de motivos com labels
 */
export const TODOS_MOTIVOS = [
  { value: "acidente_ocorrencia_pessoal", label: "Acidente ou ocorrência pessoal que impossibilitou a sessão", tipo: "aprovado" },
  { value: "acompanhamento_familiar_doente", label: "Acompanhamento urgente de familiar doente", tipo: "aprovado" },
  { value: "agravamento_saude_cronica", label: "Agravamento de condição de saúde crônica", tipo: "aprovado" },
  { value: "catastrofes_naturais", label: "Catástrofes naturais ou eventos climáticos extremos que comprometam a sessão", tipo: "aprovado" },
  { value: "compromissos_academicos", label: "Compromissos acadêmicos inesperados e obrigatórios", tipo: "aprovado" },
  { value: "compromissos_profissionais", label: "Compromissos profissionais urgentes e inesperados", tipo: "aprovado" },
  { value: "crise_ansiedade_panico", label: "Crise aguda de ansiedade ou pânico", tipo: "aprovado" },
  { value: "doenca_subita", label: "Doença súbita pessoal", tipo: "aprovado" },
  { value: "emergencia_familiar", label: "Emergência familiar ou com dependentes", tipo: "aprovado" },
  { value: "falecimento_familiar", label: "Falecimento de familiar de 1º grau", tipo: "aprovado" },
  { value: "falta_conexao_operadora", label: "Falta de conexão geral por problemas com operadora ou tempo", tipo: "aprovado" },
  { value: "interrupcao_internet_cliente", label: "Interrupção abrupta da internet por parte do cliente", tipo: "aprovado" },
  { value: "internacao_hospitalar", label: "Internação hospitalar minha ou de um dependente", tipo: "aprovado" },
  { value: "obrigacao_legal_judicial", label: "Obrigação legal ou judicial imprevista", tipo: "aprovado" },
  { value: "pane_eletrica", label: "Pane elétrica no domicílio", tipo: "aprovado" },
  { value: "problemas_equipamento", label: "Problemas graves com o equipamento (ex: notebook queimou)", tipo: "aprovado" },
  { value: "procedimento_medico_emergencial", label: "Procedimento médico emergencial", tipo: "aprovado" },
  { value: "roubo_furto_violencia", label: "Roubo / Furto ou Violência recente", tipo: "aprovado" },
  { value: "conflito_compromisso", label: "Conflito com outro compromisso previamente marcado", tipo: "reprovado" },
  { value: "preso_reuniao", label: "Fiquei preso(a) em uma reunião", tipo: "reprovado" },
  { value: "instabilidade_internet", label: "Instabilidade na conexão com a internet, mas sem queda total", tipo: "reprovado" },
  { value: "atraso_sessao", label: "Me atrasei para a sessão", tipo: "reprovado" },
  { value: "problemas_barulho_ambiente", label: "Problemas com barulho ou ambiente", tipo: "reprovado" },
  { value: "problemas_pessoais", label: "Problemas pessoais", tipo: "reprovado" }
];

/**
 * Tooltip explicativo sobre força maior
 */
export const FORCA_MAIOR_TOOLTIP = "Motivos de força maior são eventos imprevisíveis, inevitáveis e alheios à vontade do CONTRATANTE que tornam impossível ou excessivamente oneroso o comparecimento à sessão. Consulte nossa Política de Reagendamento e Cancelamento para entender quais situações podem ser aceitas como justificativa válida e a documentação necessária para comprovação.";

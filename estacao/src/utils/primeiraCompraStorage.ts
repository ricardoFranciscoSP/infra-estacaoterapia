/**
 * Utilitário para gerenciar dados temporários da primeira compra
 * 
 * Persiste dados durante o fluxo e limpa após compra aprovada
 * Garante que os dados não sejam reutilizados para segunda compra
 * 
 * Dados são criptografados antes de serem armazenados no localStorage
 */

import { encryptedLocalStorage } from './encryptedStorage';

const STORAGE_KEY = 'primeira-compra-temp';
const STORAGE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutos

export interface PrimeiraCompraTempData {
  planoId: string;
  psicologoId?: string;
  contexto: 'primeira_sessao' | 'marketplace';
  origem?: string;
  utmParams?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
  };
  dadosAgendamento?: {
    psicologoId: string;
    agendaId: string;
    data: string;
    horario: string;
    nomePsicologo: string;
  };
  endereco?: {
    cep: string;
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  timestamp: number;
  compraEfetivada?: boolean; // Flag para indicar que a compra foi aprovada
}

/**
 * Salva dados temporários da primeira compra (criptografado)
 */
export async function salvarDadosPrimeiraCompra(data: Omit<PrimeiraCompraTempData, 'timestamp' | 'compraEfetivada'>): Promise<void> {
  if (typeof window === 'undefined') return;

  const dadosCompletos: PrimeiraCompraTempData = {
    ...data,
    timestamp: Date.now(),
    compraEfetivada: false,
  };

  try {
    await encryptedLocalStorage.setObject(STORAGE_KEY, dadosCompletos, true);
  } catch (error) {
    console.error('[PrimeiraCompraStorage] Erro ao salvar dados:', error);
  }
}

/**
 * Recupera dados temporários da primeira compra (descriptografado)
 * Retorna null se não existir, expirado ou se compra já foi efetivada
 */
export async function recuperarDadosPrimeiraCompra(): Promise<PrimeiraCompraTempData | null> {
  if (typeof window === 'undefined') return null;

  try {
    const data = await encryptedLocalStorage.getObject<PrimeiraCompraTempData>(STORAGE_KEY, true);
    if (!data) return null;

    // Verifica se a compra já foi efetivada
    if (data.compraEfetivada) {
      console.log('[PrimeiraCompraStorage] Compra já foi efetivada, limpando dados');
      await limparDadosPrimeiraCompra();
      return null;
    }

    // Verifica se expirou (24 horas)
    const agora = Date.now();
    if (agora - data.timestamp > STORAGE_EXPIRY_MS) {
      console.log('[PrimeiraCompraStorage] Dados expirados, limpando');
      await limparDadosPrimeiraCompra();
      return null;
    }

    return data;
  } catch (error) {
    console.error('[PrimeiraCompraStorage] Erro ao recuperar dados:', error);
    await limparDadosPrimeiraCompra();
    return null;
  }
}

/**
 * Marca a compra como efetivada e limpa os dados
 * Deve ser chamado após pagamento aprovado
 */
export async function marcarCompraEfetivada(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const data = await encryptedLocalStorage.getObject<PrimeiraCompraTempData>(STORAGE_KEY, true);
    if (data) {
      data.compraEfetivada = true;
      await encryptedLocalStorage.setObject(STORAGE_KEY, data, true);
      
      // Limpa após 1 segundo para garantir que a flag foi salva
      setTimeout(async () => {
        await limparDadosPrimeiraCompra();
      }, 1000);
    }
  } catch (error) {
    console.error('[PrimeiraCompraStorage] Erro ao marcar compra como efetivada:', error);
    // Em caso de erro, limpa diretamente
    await limparDadosPrimeiraCompra();
  }
}

/**
 * Limpa dados temporários da primeira compra
 */
export async function limparDadosPrimeiraCompra(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    encryptedLocalStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[PrimeiraCompraStorage] Erro ao limpar dados:', error);
  }
}

/**
 * Atualiza apenas o endereço nos dados temporários
 */
export async function atualizarEnderecoTemp(endereco: PrimeiraCompraTempData['endereco']): Promise<void> {
  if (typeof window === 'undefined') return;

  const dadosAtuais = await recuperarDadosPrimeiraCompra();
  if (dadosAtuais) {
    dadosAtuais.endereco = endereco;
    dadosAtuais.timestamp = Date.now(); // Atualiza timestamp
    try {
      await encryptedLocalStorage.setObject(STORAGE_KEY, dadosAtuais, true);
    } catch (error) {
      console.error('[PrimeiraCompraStorage] Erro ao atualizar endereço:', error);
    }
  }
}

/**
 * Verifica se há dados temporários válidos
 */
export async function temDadosPrimeiraCompra(): Promise<boolean> {
  const dados = await recuperarDadosPrimeiraCompra();
  return dados !== null;
}


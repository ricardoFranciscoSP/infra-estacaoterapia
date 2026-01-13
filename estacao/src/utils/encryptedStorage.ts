/**
 * Utilitário para criptografar dados sensíveis no localStorage/sessionStorage
 * 
 * Usa Web Crypto API (AES-GCM) para criptografia simétrica
 * A chave é derivada do domínio + um salt único por usuário
 */

// Chave para armazenar a chave de criptografia derivada
const ENCRYPTION_KEY_STORAGE = 'estacao_encryption_key';
const SALT_STORAGE = 'estacao_encryption_salt';

/**
 * Gera um salt único se não existir
 */
function getOrCreateSalt(): ArrayBuffer {
  if (typeof window === 'undefined') {
    throw new Error('encryptedStorage só funciona no browser');
  }

  let salt = sessionStorage.getItem(SALT_STORAGE);

  if (!salt) {
    // Gera um salt aleatório de 16 bytes
    const newSalt = new Uint8Array(16);
    crypto.getRandomValues(newSalt);
    salt = Array.from(newSalt).map(b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(SALT_STORAGE, salt);
  }

  // Converte string hex de volta para Uint8Array
  const hexBytes = salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16));
  // Cria um novo ArrayBuffer para garantir compatibilidade com Web Crypto API
  const saltBuffer = new ArrayBuffer(hexBytes.length);
  new Uint8Array(saltBuffer).set(hexBytes);
  return saltBuffer;
}

/**
 * Deriva uma chave de criptografia usando PBKDF2
 */
async function deriveEncryptionKey(): Promise<CryptoKey> {
  if (typeof window === 'undefined') {
    throw new Error('encryptedStorage só funciona no browser');
  }

  // Tenta recuperar chave do cache (sessionStorage)
  const cachedKey = sessionStorage.getItem(ENCRYPTION_KEY_STORAGE);
  if (cachedKey) {
    try {
      // Importa a chave do formato JSON Web Key
      return await crypto.subtle.importKey(
        'jwk',
        JSON.parse(cachedKey),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
    } catch {
      // Se falhar, gera nova chave
    }
  }

  // Gera um salt único
  const salt = getOrCreateSalt();

  // Usa o domínio + user agent como material da chave
  const keyMaterial = `${window.location.hostname}${navigator.userAgent}`;
  const encoder = new TextEncoder();
  const keyMaterialBuffer = encoder.encode(keyMaterial);

  // Importa o material da chave
  const baseKey = await crypto.subtle.importKey(
    'raw',
    keyMaterialBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Deriva a chave usando PBKDF2
  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  // Cacheia a chave no sessionStorage (apenas durante a sessão)
  try {
    const exportedKey = await crypto.subtle.exportKey('jwk', encryptionKey);
    sessionStorage.setItem(ENCRYPTION_KEY_STORAGE, JSON.stringify(exportedKey));
  } catch {
    // Ignora erro de cache
  }

  return encryptionKey;
}

/**
 * Criptografa dados usando AES-GCM
 */
async function encryptData(data: string): Promise<string> {
  const key = await deriveEncryptionKey();
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Gera IV (Initialization Vector) aleatório
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Criptografa os dados
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    dataBuffer
  );

  // Combina IV + dados criptografados e converte para base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Converte para base64 para armazenamento
  const base64 = btoa(String.fromCharCode(...combined));
  return base64;
}

/**
 * Descriptografa dados usando AES-GCM
 */
async function decryptData(encryptedData: string): Promise<string> {
  try {
    const key = await deriveEncryptionKey();

    // Converte de base64 para Uint8Array
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extrai IV (primeiros 12 bytes) e dados criptografados
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Descriptografa
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );

    // Converte de volta para string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('[encryptedStorage] Erro ao descriptografar:', error);
    throw new Error('Falha ao descriptografar dados');
  }
}

/**
 * Verifica se um valor está criptografado (formato base64 válido)
 */
function isEncrypted(value: string): boolean {
  try {
    // Verifica se é base64 válido e tem tamanho mínimo esperado
    if (value.length < 20) return false;
    atob(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wrapper seguro para localStorage com criptografia automática
 */
export const encryptedLocalStorage = {
  /**
   * Salva um valor criptografado no localStorage
   */
  setItem: async (key: string, value: string, encrypt: boolean = true): Promise<void> => {
    if (typeof window === 'undefined') return;

    try {
      if (encrypt) {
        const encrypted = await encryptData(value);
        localStorage.setItem(key, encrypted);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`[encryptedStorage] Erro ao salvar ${key}:`, error);
      throw error;
    }
  },

  /**
   * Recupera e descriptografa um valor do localStorage
   */
  getItem: async (key: string, encrypted: boolean = true): Promise<string | null> => {
    if (typeof window === 'undefined') return null;

    try {
      const value = localStorage.getItem(key);
      if (!value) return null;

      // Tenta descriptografar se parecer criptografado
      if (encrypted && isEncrypted(value)) {
        try {
          return await decryptData(value);
        } catch {
          // Se falhar, pode ser um valor antigo não criptografado
          // Tenta retornar como está (para migração gradual)
          console.warn(`[encryptedStorage] Falha ao descriptografar ${key}, retornando valor original`);
          return value;
        }
      }

      return value;
    } catch (error) {
      console.error(`[encryptedStorage] Erro ao recuperar ${key}:`, error);
      return null;
    }
  },

  /**
   * Remove um item do localStorage
   */
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },

  /**
   * Salva um objeto JSON criptografado
   */
  setObject: async <T>(key: string, value: T, encrypt: boolean = true): Promise<void> => {
    const json = JSON.stringify(value);
    await encryptedLocalStorage.setItem(key, json, encrypt);
  },

  /**
   * Recupera e descriptografa um objeto JSON
   */
  getObject: async <T>(key: string, encrypted: boolean = true): Promise<T | null> => {
    const json = await encryptedLocalStorage.getItem(key, encrypted);
    if (!json) return null;

    try {
      return JSON.parse(json) as T;
    } catch (error) {
      console.error(`[encryptedStorage] Erro ao parsear JSON de ${key}:`, error);
      return null;
    }
  },
};

/**
 * Wrapper seguro para sessionStorage com criptografia automática
 */
export const encryptedSessionStorage = {
  /**
   * Salva um valor criptografado no sessionStorage
   */
  setItem: async (key: string, value: string, encrypt: boolean = true): Promise<void> => {
    if (typeof window === 'undefined') return;

    try {
      if (encrypt) {
        const encrypted = await encryptData(value);
        sessionStorage.setItem(key, encrypted);
      } else {
        sessionStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`[encryptedStorage] Erro ao salvar ${key}:`, error);
      throw error;
    }
  },

  /**
   * Recupera e descriptografa um valor do sessionStorage
   */
  getItem: async (key: string, encrypted: boolean = true): Promise<string | null> => {
    if (typeof window === 'undefined') return null;

    try {
      const value = sessionStorage.getItem(key);
      if (!value) return null;

      // Tenta descriptografar se parecer criptografado
      if (encrypted && isEncrypted(value)) {
        try {
          return await decryptData(value);
        } catch {
          // Se falhar, pode ser um valor antigo não criptografado
          console.warn(`[encryptedStorage] Falha ao descriptografar ${key}, retornando valor original`);
          return value;
        }
      }

      return value;
    } catch (error) {
      console.error(`[encryptedStorage] Erro ao recuperar ${key}:`, error);
      return null;
    }
  },

  /**
   * Remove um item do sessionStorage
   */
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(key);
  },

  /**
   * Salva um objeto JSON criptografado
   */
  setObject: async <T>(key: string, value: T, encrypt: boolean = true): Promise<void> => {
    const json = JSON.stringify(value);
    await encryptedSessionStorage.setItem(key, json, encrypt);
  },

  /**
   * Recupera e descriptografa um objeto JSON
   */
  getObject: async <T>(key: string, encrypted: boolean = true): Promise<T | null> => {
    const json = await encryptedSessionStorage.getItem(key, encrypted);
    if (!json) return null;

    try {
      return JSON.parse(json) as T;
    } catch (error) {
      console.error(`[encryptedStorage] Erro ao parsear JSON de ${key}:`, error);
      return null;
    }
  },
};

/**
 * Limpa todas as chaves de criptografia (útil para logout)
 */
export function clearEncryptionKeys(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ENCRYPTION_KEY_STORAGE);
  sessionStorage.removeItem(SALT_STORAGE);
}

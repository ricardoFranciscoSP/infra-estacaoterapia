// src/utils/devicePreferences.ts

import { encryptedLocalStorage } from './encryptedStorage';

export interface DevicePreferences {
  cameraDeviceId: string | null;
  microphoneDeviceId: string | null;
  audioOutputDeviceId: string | null;
}

const DEVICE_PREFERENCES_KEY = 'agora_device_preferences';

/**
 * Salva as preferências de dispositivos no localStorage (criptografado)
 */
export async function saveDevicePreferences(preferences: DevicePreferences): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    await encryptedLocalStorage.setObject(DEVICE_PREFERENCES_KEY, preferences, true);
    console.log('💾 [devicePreferences] Preferências salvas:', preferences);
  } catch (error) {
    console.error('❌ [devicePreferences] Erro ao salvar preferências:', error);
  }
}

/**
 * Carrega as preferências de dispositivos do localStorage (descriptografado)
 */
export async function loadDevicePreferences(): Promise<DevicePreferences | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const preferences = await encryptedLocalStorage.getObject<DevicePreferences>(DEVICE_PREFERENCES_KEY, true);
    if (preferences) {
      console.log('📂 [devicePreferences] Preferências carregadas:', preferences);
    }
    return preferences;
  } catch (error) {
    console.error('❌ [devicePreferences] Erro ao carregar preferências:', error);
    return null;
  }
}

/**
 * Limpa as preferências de dispositivos
 */
export function clearDevicePreferences(): void {
  if (typeof window === 'undefined') return;
  
  try {
    encryptedLocalStorage.removeItem(DEVICE_PREFERENCES_KEY);
    console.log('🗑️ [devicePreferences] Preferências limpas');
  } catch (error) {
    console.error('❌ [devicePreferences] Erro ao limpar preferências:', error);
  }
}

/**
 * Atualiza uma preferência específica mantendo as outras
 */
export async function updateDevicePreference<K extends keyof DevicePreferences>(
  key: K,
  value: DevicePreferences[K]
): Promise<void> {
  const current = await loadDevicePreferences() || {
    cameraDeviceId: null,
    microphoneDeviceId: null,
    audioOutputDeviceId: null,
  };
  
  current[key] = value;
  await saveDevicePreferences(current);
}


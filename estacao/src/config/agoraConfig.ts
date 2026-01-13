// src/config/agoraConfig.ts

export const agoraConfig = {
    // Configurações do cliente RTC
    client: {
        mode: "rtc" as const,
        codec: "vp8" as const,
    },

    // Configurações de vídeo
    video: {
        encoderConfig: {
            width: 640,
            height: 480,
            frameRate: 30,
            bitrateMin: 400,
            bitrateMax: 1000,
        }
    },

    // Configurações de áudio
    audio: {
        encoderConfig: {
            sampleRate: 48000,
            stereo: true,
            bitrate: 128,
        }
    },

    // Configurações de rede
    network: {
        // Número máximo de tentativas
        maxRetries: 3,
        // Delay entre tentativas (em ms)
        retryDelay: 1000,
    }
};

// Função para validar configurações
export function validateAgoraConfig(appId: string, token: string, channel: string): string[] {
    const errors: string[] = [];

    if (!appId) {
        errors.push("AppId é obrigatório");
    }

    if (!token) {
        errors.push("Token é obrigatório");
    }

    if (!channel) {
        errors.push("Channel é obrigatório");
    }

    return errors;
}


// Função para gerar configurações de fallback
export function getFallbackConfig() {
    return {
        ...agoraConfig,
        client: {
            ...agoraConfig.client,
            mode: "live" as const, // Fallback para modo live se RTC falhar
        },
    };
}






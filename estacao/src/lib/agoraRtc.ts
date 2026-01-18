import dynamic from 'next/dynamic';

const AgoraRTCLoader = dynamic(() => import('agora-rtc-sdk-ng'), { ssr: false });
let cachedAgoraRTC: typeof import('agora-rtc-sdk-ng').default | null = null;

export async function loadAgoraRTC() {
    if (cachedAgoraRTC) {
        return cachedAgoraRTC;
    }
    const loader = AgoraRTCLoader as unknown as {
        preload?: () => Promise<{ default: typeof import('agora-rtc-sdk-ng').default }>;
    };
    const module = loader.preload ? await loader.preload() : await import('agora-rtc-sdk-ng');
    cachedAgoraRTC = module.default;
    return cachedAgoraRTC;
}

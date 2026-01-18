let cachedAgoraRTC: typeof import('agora-rtc-sdk-ng').default | null = null;

export async function loadAgoraRTC() {
    if (cachedAgoraRTC) {
        return cachedAgoraRTC;
    }
    const loadedModule = await import('agora-rtc-sdk-ng');
    cachedAgoraRTC = loadedModule.default;
    return cachedAgoraRTC;
}

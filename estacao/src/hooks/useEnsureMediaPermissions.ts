import { useEffect, useState } from "react";

/**
 * Hook para garantir que as permissões de microfone e câmera já foram concedidas.
 * Solicita ao usuário caso ainda não tenha concedido.
 * Retorna o status das permissões e se está carregando.
 */
export function useEnsureMediaPermissions() {
    const [hasPermissions, setHasPermissions] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        async function checkAndRequest() {
            setLoading(true);
            setError(null);
            try {
                // Verifica se já tem permissão (usando Permissions API se disponível)
                let audioGranted = false;
                let videoGranted = false;
                if (navigator.permissions && navigator.permissions.query) {
                    try {
                        const audio = await navigator.permissions.query({ name: "microphone" as PermissionName });
                        audioGranted = audio.state === "granted";
                    } catch { }
                    try {
                        const video = await navigator.permissions.query({ name: "camera" as PermissionName });
                        videoGranted = video.state === "granted";
                    } catch { }
                }
                if (audioGranted && videoGranted) {
                    if (isMounted) setHasPermissions(true);
                } else {
                    // Solicita permissão ao usuário
                    await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                    if (isMounted) setHasPermissions(true);
                }
            } catch (err) {
                let msg = "Erro ao solicitar permissões";
                if (err instanceof Error && typeof err.message === "string") {
                    msg = err.message;
                }
                if (isMounted) setError(msg);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        checkAndRequest();
        return () => {
            isMounted = false;
        };
    }, []);

    return { hasPermissions, loading, error };
}

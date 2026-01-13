"use client";
import { useRef, useState, useCallback } from "react";

interface WindowWithWebkitAudioContext extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export function useMediaPreview() {
    const streamRef = useRef<MediaStream | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    const [micLevel, setMicLevel] = useState(0);
    const [ready, setReady] = useState(false);

    const start = useCallback(async (constraints: MediaStreamConstraints) => {
        if (streamRef.current) return streamRef.current;

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        // Mic level
        const windowWithWebkit = window as WindowWithWebkitAudioContext;
        const AudioCtx = window.AudioContext || windowWithWebkit.webkitAudioContext;
        if (!AudioCtx) {
            throw new Error("AudioContext não está disponível neste navegador");
        }
        const audioCtx = new AudioCtx();
        audioCtxRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        const loop = () => {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
                sum += Math.abs(data[i] - 128);
            }
            setMicLevel(sum / data.length);
            requestAnimationFrame(loop);
        };

        loop();
        setReady(true);
        return stream;
    }, []);

    const stop = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        analyserRef.current = null;
        setReady(false);
        setMicLevel(0);
    }, []);

    return { start, stop, micLevel, ready, streamRef };
}

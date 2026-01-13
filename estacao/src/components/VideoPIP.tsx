"use client";
import { useEffect, useRef } from "react";
import { IRemoteVideoTrack } from "agora-rtc-sdk-ng";

interface VideoPIPProps {
  videoTrack: IRemoteVideoTrack | null;
  label?: string;
  className?: string;
}

export default function VideoPIP({ videoTrack, label = "Paciente", className = "" }: VideoPIPProps) {
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoTrack || !videoRef.current) return;

    // Limpa qualquer vídeo anterior
    const container = videoRef.current;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Cria um novo div para o vídeo
    const videoDiv = document.createElement("div");
    videoDiv.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
    `;
    container.appendChild(videoDiv);

    // Reproduz o vídeo no container
    videoTrack.play(videoDiv, { fit: "cover" });

    return () => {
      // Limpa ao desmontar
      if (videoDiv && videoDiv.parentNode) {
        videoTrack.stop();
        videoDiv.parentNode.removeChild(videoDiv);
      }
    };
  }, [videoTrack]);

  if (!videoTrack) {
    return (
      <div className={`bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
        <div className="text-white text-xs text-center p-2">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="text-xs">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden shadow-2xl border-2 border-white bg-black ${className}`}>
      <div ref={videoRef} className="w-full h-full" style={{ minHeight: "120px" }} />
      {label && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
          <p className="text-white text-[10px] font-medium">{label}</p>
        </div>
      )}
    </div>
  );
}

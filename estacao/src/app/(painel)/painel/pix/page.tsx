"use client";
import React, { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Image from "next/image";

function PixContent() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [seconds, setSeconds] = useState(300);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const searchParams = useSearchParams();
  const valorParam = searchParams?.get("valor");
  const parseValor = () => {
    if (!valorParam) return 59.9;
    const cleanValue = valorParam.replace(",", ".");
    const parsedValue = Number(cleanValue);
    return isNaN(parsedValue) || parsedValue <= 0 ? 59.9 : parsedValue;
  };
  const valor = parseValor();

  const pixCode =
    "00020126360014BR.GOV.BCB.PIX0114+551199999999520400005303986540459.905802BR5920NOME DO RECEBEDOR6009SAO PAULO62070503***6304B14F";

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((s) => s - 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (seconds <= 0) {
      router.replace("/painel/success");
    }
  }, [seconds, router]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handlePagamento = () => {
    toast.success("Consulta paga");
    router.replace("/painel/success");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4 py-10">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Pagamento via Pix</h1>

      <div className="mb-2 text-lg font-medium text-gray-700">
        Valor a ser pago:{" "}
        <span className="text-[#8494E9] font-bold">
          R$ {valor.toFixed(2).replace(".", ",")}
        </span>
      </div>

      <div className="flex flex-col items-center my-6">
        <div className="bg-gray-100 rounded-lg flex items-center justify-center mb-4 w-[min(300px,60vw)] h-[min(300px,60vw)]">
          <Image
            src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020126360014BR.GOV.BCB.PIX0114+551199999999520400005303986540459.905802BR5920NOME%20DO%20RECEBEDOR6009SAO%20PAULO62070503***6304B14F"
            alt="QR Code Pix"
            className="w-[180px] h-[180px] md:w-[240px] md:h-[240px] object-contain"
            width={240}
            height={240}
          />
        </div>

        <div className="flex items-center w-full max-w-xl">
          <input
            type="text"
            value={pixCode}
            readOnly
            className="flex-1 border border-gray-300 rounded-l px-3 py-2 text-xs md:text-sm bg-gray-50 font-mono truncate"
          />
          <button
            onClick={handleCopy}
            className="bg-[#8494E9] text-white px-4 py-2 rounded-r text-sm font-medium hover:bg-[#6d7ac7] transition"
          >
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      <div className="mb-4 text-gray-600 text-sm">
        Tempo para expirar o PIX:
        <span className="font-semibold">{formatTime(seconds)}</span>
      </div>

      <button
        onClick={handlePagamento}
        className="bg-[#8494E9] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#6d7ac7] transition"
      >
        Já paguei
      </button>
    </div>
  );
}

export default function PixPage() {
  return (
    <Suspense fallback={<div></div>}>
      <PixContent />
    </Suspense>
  );
}
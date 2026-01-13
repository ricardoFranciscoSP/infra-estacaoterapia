"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function ErrorPage() {
    const router = useRouter();
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

    useEffect(() => {
        // Recupera a URL do checkout salva antes do redirecionamento
        const savedUrl = sessionStorage.getItem('checkoutErrorOrigin');
        if (savedUrl) {
            setCheckoutUrl(savedUrl);
            // Remove a referência após usar
            sessionStorage.removeItem('checkoutErrorOrigin');
        }
    }, []);

    const handleTryAgain = () => {
        if (checkoutUrl) {
            router.push(checkoutUrl);
        } else {
            // Fallback: tenta voltar ou vai para painel
            if (window.history.length > 1) {
                router.back();
            } else {
                router.push("/painel");
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
            <div className="mb-8 text-center">
                <h1 className="text-2xl md:text-3xl font-bold text-[#23272F]">Ops, houve um erro ao finalizar sua compra</h1>
                <h2 className="text-2xl md:text-3xl font-bold text-[#23272F]">Por favor tente novamente</h2>
            </div>
            <Image
                src="/assets/error_exhaustion.svg"
                alt="Error"
                width={282}
                height={282}
                style={{ opacity: 1 }}
                className="mb-8 w-[180px] h-[180px] md:w-[282px] md:h-[282px]"
            />
            <button
                className="
                    w-full max-w-[384px] h-12
                    px-6
                    flex items-center justify-center gap-3
                    rounded-lg border border-[#6D75C0]
                    bg-[#6D75C0] text-white font-semibold text-base
                    transition hover:bg-[#5a61a8]
                "
                style={{ opacity: 1 }}
                onClick={handleTryAgain}
            >
               Tente novamente
            </button>
        </div>
    );
}

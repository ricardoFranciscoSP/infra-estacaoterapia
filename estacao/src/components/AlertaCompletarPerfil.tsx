"use client";
import React, { useState } from "react";
import Link from "next/link";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

// Componente de ícone SVG inline para evitar problemas de importação com Turbopack
// Este é o ícone AlertCircle do lucide-react renderizado como SVG inline
const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default function AlertaCompletarPerfil({ className = "" }: { className?: string }) {
  const [fechado, setFechado] = useState(false);

  if (fechado) return null;

  return (
    <div className={`w-full md:max-w-full max-w-full sm:max-w-full mx-auto ${className}`}>
      <Alert className="bg-yellow-100 border-yellow-300 text-yellow-800">
        <AlertCircleIcon className="text-yellow-500 mr-2" />
        <AlertTitle className="font-semibold break-words whitespace-normal w-full text-[15px] sm:text-base md:text-lg flex flex-wrap items-center">
          Complete seu perfil para aproveitar todos os recursos.{' '}
          <Link
            href="/painel/minha-conta/dados-pessoais"
            className="underline text-yellow-700 font-bold text-base sm:text-lg md:text-xl hover:text-yellow-900 transition ml-1"
          >
            Clique aqui!
          </Link>
        </AlertTitle>
        <AlertDescription>
          {/* ...nenhum conteúdo, pois o texto e o link estão no título... */}
        </AlertDescription>
        <button
          onClick={() => setFechado(true)}
          className="absolute top-2 right-2 p-1 rounded hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          aria-label="Fechar alerta"
        >
          ×
        </button>
      </Alert>
    </div>
  );
}


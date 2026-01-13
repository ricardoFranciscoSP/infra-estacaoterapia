"use client";

import React from "react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>

        <div className="relative z-10">
          {/* 404 Number with gradient */}
          <div className="mb-6">
            <h1 className="text-9xl font-extrabold bg-gradient-to-r from-[#8494E9] via-[#6D75C0] to-[#8494E9] bg-clip-text text-transparent animate-pulse">
              404
            </h1>
          </div>

          {/* Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-[#8494E9]/30 rounded-full blur-xl"></div>
              <div className="relative bg-gradient-to-br from-blue-100 to-purple-100 p-6 rounded-full border-4 border-[#8494E9]/30">
                <svg 
                  className="w-16 h-16 text-[#8494E9]" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Title and description */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#212529] mb-4">
              Página não encontrada
            </h2>
            <p className="text-lg text-[#6C757D] max-w-md mx-auto">
              A página que você está procurando não existe ou foi movida. 
              Verifique o endereço ou volte para o dashboard financeiro.
            </p>
          </div>

          {/* Action button */}
          <div className="flex justify-center gap-4">
            <Link 
              href="/adm-finance" 
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#8494E9] text-white rounded-lg hover:bg-[#6D75C0] transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                />
              </svg>
              Voltar para o Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

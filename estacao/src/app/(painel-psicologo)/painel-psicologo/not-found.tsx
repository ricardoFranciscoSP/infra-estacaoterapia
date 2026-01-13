"use client";

import React from "react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>

        <div className="relative z-10">
          {/* 404 Number with gradient */}
          <div className="mb-6">
            <h1 className="text-9xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent animate-pulse">
              404
            </h1>
          </div>

          {/* Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-200/50 rounded-full blur-xl"></div>
              <div className="relative bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-full border-4 border-indigo-200">
                <svg 
                  className="w-16 h-16 text-indigo-600" 
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
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Página não encontrada
            </h2>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              A página que você está procurando não existe ou foi movida. 
              Verifique o endereço ou volte para o painel.
            </p>
          </div>

          {/* Action button */}
          <div className="flex justify-center gap-4">
            <Link 
              href="/painel-psicologo" 
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
              Voltar para o Painel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

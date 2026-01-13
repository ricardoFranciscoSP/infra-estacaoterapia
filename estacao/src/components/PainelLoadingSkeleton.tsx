"use client";
import React from "react";

/**
 * ⚡ OTIMIZAÇÃO: Componentes de loading skeleton otimizados para o painel
 * Dimensões exatas para evitar CLS (Cumulative Layout Shift)
 */

// Skeleton genérico para páginas do painel
export function PainelLoadingSkeleton() {
    return (
        <main className="flex flex-col w-full min-h-[60vh] px-4 py-6 md:px-6">
            <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
                {/* Título skeleton */}
                <div className="bg-[#E6E9FF] rounded-lg h-10 w-1/3 animate-pulse" style={{ minHeight: 40 }} />
                
                {/* Cards skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-[#E6E9FF] rounded-lg h-48 animate-pulse" />
                    ))}
                </div>
                
                {/* Conteúdo skeleton */}
                <div className="bg-[#E6E9FF] rounded-lg h-64 w-full animate-pulse" />
                <div className="bg-[#E6E9FF] rounded-lg h-32 w-2/3 animate-pulse" />
            </div>
        </main>
    );
}

// Skeleton para página de lista (consultas, psicólogos, etc)
export function PainelListSkeleton() {
    return (
        <main className="flex flex-col w-full min-h-[60vh] px-4 py-6 md:px-6">
            <div className="w-full max-w-7xl mx-auto flex flex-col gap-4">
                {/* Header skeleton */}
                <div className="flex items-center justify-between mb-4">
                    <div className="bg-[#E6E9FF] rounded-lg h-8 w-48 animate-pulse" />
                    <div className="bg-[#E6E9FF] rounded-lg h-10 w-32 animate-pulse" />
                </div>
                
                {/* Lista skeleton */}
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-white border border-[#E6E9FF] rounded-lg p-4 animate-pulse">
                        <div className="flex items-center gap-4">
                            <div className="bg-[#E6E9FF] rounded-full w-16 h-16 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="bg-[#E6E9FF] rounded h-5 w-3/4" />
                                <div className="bg-[#E6E9FF] rounded h-4 w-1/2" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}

// Skeleton para página de formulário
export function PainelFormSkeleton() {
    return (
        <main className="flex flex-col w-full min-h-[60vh] px-4 py-6 md:px-6">
            <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
                {/* Título skeleton */}
                <div className="bg-[#E6E9FF] rounded-lg h-10 w-1/2 animate-pulse" />
                
                {/* Formulário skeleton */}
                <div className="bg-white border border-[#E6E9FF] rounded-lg p-6 space-y-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="space-y-2">
                            <div className="bg-[#E6E9FF] rounded h-4 w-24 animate-pulse" />
                            <div className="bg-[#E6E9FF] rounded h-12 w-full animate-pulse" />
                        </div>
                    ))}
                    <div className="flex gap-4 pt-4">
                        <div className="bg-[#E6E9FF] rounded h-12 w-32 animate-pulse" />
                        <div className="bg-[#E6E9FF] rounded h-12 w-32 animate-pulse" />
                    </div>
                </div>
            </div>
        </main>
    );
}

// Skeleton para página de detalhes
export function PainelDetailSkeleton() {
    return (
        <main className="flex flex-col w-full min-h-[60vh] px-4 py-6 md:px-6">
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
                {/* Header com botão voltar */}
                <div className="flex items-center gap-4">
                    <div className="bg-[#E6E9FF] rounded h-10 w-10 animate-pulse" />
                    <div className="bg-[#E6E9FF] rounded-lg h-8 w-64 animate-pulse" />
                </div>
                
                {/* Conteúdo principal */}
                <div className="bg-white border border-[#E6E9FF] rounded-lg p-6 space-y-4">
                    <div className="bg-[#E6E9FF] rounded h-6 w-full animate-pulse" />
                    <div className="bg-[#E6E9FF] rounded h-6 w-5/6 animate-pulse" />
                    <div className="bg-[#E6E9FF] rounded h-32 w-full animate-pulse mt-4" />
                </div>
            </div>
        </main>
    );
}

// Skeleton para painel do psicólogo (layout diferente)
export function PainelPsicologoSkeleton() {
    return (
        <main className="flex flex-col w-full min-h-[60vh] px-4 py-6 md:px-6">
            <div className="w-full max-w-[1200px] mx-auto flex flex-col gap-6">
                {/* Cards superiores */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white/20 rounded-lg h-32 animate-pulse" />
                    ))}
                </div>
                
                {/* Conteúdo principal */}
                <div className="bg-white/10 rounded-lg p-6 space-y-4">
                    <div className="bg-white/20 rounded h-6 w-1/3 animate-pulse" />
                    <div className="bg-white/20 rounded h-48 w-full animate-pulse" />
                </div>
            </div>
        </main>
    );
}

// Skeleton específico para página de comprar consulta
export function ComprarConsultaSkeleton() {
    return (
        <div className="w-full bg-[#FCFBF6] p-4 lg:p-8 text-gray max-w-[1280px] mx-auto min-h-screen">
            {/* Breadcrumb skeleton - usa button para manter estrutura igual */}
            <button
                type="button"
                className="fira-sans font-medium text-[14px] leading-[24px] text-[#6D75C0] p-0 min-w-fit mb-2 flex items-center gap-1 align-middle hover:underline transition-colors"
                disabled
                aria-label="Carregando"
            >
                <div className="bg-[#E6E9FF] rounded w-5 h-5 animate-pulse" />
                <div className="bg-[#E6E9FF] rounded h-4 w-20 animate-pulse" />
            </button>
            
            {/* Título skeleton */}
            <div className="bg-[#E6E9FF] rounded-lg h-8 w-64 mb-6 animate-pulse" />
            
            {/* Grid principal: Formulário (esquerda) e Resumo (direita) */}
            <div className="lg:grid lg:grid-cols-[3fr_2fr] gap-6">
                {/* Coluna Esquerda: Formulário de Pagamento */}
                <div className="space-y-4">
                    {/* Quantidade skeleton (mobile) */}
                    <div className="lg:hidden border border-gray-200 rounded-xl p-4 space-y-4 mb-4">
                        <div className="flex justify-between items-center">
                            <div className="bg-[#E6E9FF] rounded h-5 w-48 animate-pulse" />
                            <div className="flex items-center space-x-2">
                                <div className="bg-[#E6E9FF] rounded-full w-8 h-8 animate-pulse" />
                                <div className="bg-[#E6E9FF] rounded h-6 w-8 animate-pulse" />
                                <div className="bg-[#E6E9FF] rounded-full w-8 h-8 animate-pulse" />
                            </div>
                        </div>
                        <div className="bg-[#E6E9FF] rounded h-6 w-32 ml-auto animate-pulse" />
                    </div>
                    
                    {/* Título Pagamento */}
                    <div className="bg-[#E6E9FF] rounded h-6 w-32 mt-4 animate-pulse" />
                    
                    {/* Tabs skeleton */}
                    <div className="flex flex-col lg:flex-row gap-4 my-4">
                        <div className="bg-[#E6E9FF] rounded h-8 w-full lg:w-[150px] animate-pulse" />
                        <div className="bg-[#E6E9FF] rounded h-8 w-full lg:w-[150px] animate-pulse" />
                    </div>
                    
                    {/* Formulário de cartão skeleton */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="space-y-2">
                                <div className="bg-[#E6E9FF] rounded h-4 w-24 animate-pulse" />
                                <div className="bg-[#E6E9FF] rounded h-12 w-full animate-pulse" />
                            </div>
                        ))}
                    </div>
                    
                    {/* Formulário de endereço skeleton */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 mt-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-[#E6E9FF] rounded h-5 w-5 animate-pulse" />
                            <div className="bg-[#E6E9FF] rounded h-5 w-48 animate-pulse" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="space-y-2">
                                    <div className="bg-[#E6E9FF] rounded h-4 w-20 animate-pulse" />
                                    <div className="bg-[#E6E9FF] rounded h-10 w-full animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Botão skeleton */}
                    <div className="bg-[#E6E9FF] rounded-lg h-12 w-full mt-6 animate-pulse" />
                </div>
                
                {/* Coluna Direita: Resumo */}
                <div className="space-y-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 sticky top-4">
                        <div className="bg-[#E6E9FF] rounded h-6 w-32 animate-pulse" />
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <div className="bg-[#E6E9FF] rounded h-5 w-24 animate-pulse" />
                                <div className="bg-[#E6E9FF] rounded h-5 w-20 animate-pulse" />
                            </div>
                            <div className="flex justify-between">
                                <div className="bg-[#E6E9FF] rounded h-5 w-32 animate-pulse" />
                                <div className="bg-[#E6E9FF] rounded h-5 w-16 animate-pulse" />
                            </div>
                            <div className="border-t border-gray-200 pt-3 mt-3">
                                <div className="flex justify-between">
                                    <div className="bg-[#E6E9FF] rounded h-6 w-20 animate-pulse" />
                                    <div className="bg-[#E6E9FF] rounded h-6 w-24 animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}










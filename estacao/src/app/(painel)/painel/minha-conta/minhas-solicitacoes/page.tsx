"use client";
import React, { useState, useMemo } from "react";
import Image from "next/image";

import ModalCriarSolicitacao from "@/components/ModalCriarSolicitacao";
import ModalDetalhesSolicitacao from "@/components/ModalDetalhesSolicitacao";
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import { useSolicitacoes, useCreateSolicitacao } from "@/hooks/solicitacaoHook";
import { Solicitacao, CreateSolicitacaoData } from "@/types/solicitacaoTypes";


const statusOptions = [
    { value: "", label: "Todos" },
    { value: "Pendente", label: "Pendente" },
    { value: "Em Análise", label: "Em Análise" },
    { value: "Aprovado", label: "Aprovado" },
    { value: "Recusado", label: "Recusado" },
    { value: "Concluído", label: "Concluído" },
];

export default function MinhasSolicitacoesPage() {
    const [status, setStatus] = useState("");
    const [busca, setBusca] = useState("");
    const [modalCriarAberto, setModalCriarAberto] = useState(false);
    const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
    const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<Solicitacao | null>(null);

    const { solicitacoes, isLoading, refetch } = useSolicitacoes();
    const { createSolicitacaoAsync } = useCreateSolicitacao();

    // Função para formatar data para DD/MM/YYYY
    function formatarData(dataISO: Date | string): string {
        const data = typeof dataISO === 'string' ? new Date(dataISO) : dataISO;
        if (isNaN(data.getTime())) return 'Data inválida';
        
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        return `${dia}/${mes}/${ano}`;
    }

    // Função para formatar data e hora completa
    function formatarDataHora(dataISO: Date | string): string {
        const data = typeof dataISO === 'string' ? new Date(dataISO) : dataISO;
        if (isNaN(data.getTime())) return 'Data inválida';
        
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        const horas = String(data.getHours()).padStart(2, '0');
        const minutos = String(data.getMinutes()).padStart(2, '0');
        return `${dia}/${mes}/${ano} às ${horas}:${minutos}`;
    }

    const solicitacoesFiltradas = useMemo(() => {
        if (!solicitacoes) return [];

        return solicitacoes.filter((s) => {
            const matchStatus = status ? s.Status === status : true;
            const matchBusca = busca
                ? (s.Title?.toLowerCase().includes(busca.toLowerCase()) ||
                   s.Tipo?.toLowerCase().includes(busca.toLowerCase()) ||
                   s.Protocol?.toLowerCase().includes(busca.toLowerCase()))
                : true;
            return matchStatus && matchBusca;
        });
    }, [solicitacoes, status, busca]);

    const handleCreateSolicitacao = async (data: CreateSolicitacaoData) => {
        try {
            await createSolicitacaoAsync(data);
            await refetch();
        } catch (error) {
            console.error('Erro ao criar solicitação:', error);
            throw error;
        }
    };

    const handleVisualizar = (solicitacao: Solicitacao) => {
        setSolicitacaoSelecionada(solicitacao);
        setModalDetalhesAberto(true);
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { bg: string; text: string }> = {
            "Pendente": { bg: "bg-yellow-100", text: "text-yellow-800" },
            "Em Análise": { bg: "bg-blue-100", text: "text-blue-800" },
            "Aprovado": { bg: "bg-green-100", text: "text-green-800" },
            "Recusado": { bg: "bg-red-100", text: "text-red-800" },
            "Concluído": { bg: "bg-gray-100", text: "text-gray-800" },
        };
        
        const config = statusConfig[status] || statusConfig["Pendente"];
        return `${config.bg} ${config.text}`;
    };

    return (
        <>
            <div className="w-full bg-[#FCFBF6] min-h-[calc(100vh-64px)] mb-8">
                <div className="flex-1 flex w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 gap-4 sm:gap-8 py-4 sm:py-8">
                    <div className="flex-1 w-full">
                        {/* Mobile Header */}
                        <div className="block md:hidden mb-4">
                            <BreadcrumbsVoltar />
                        </div>
                        {/* Desktop Header */}
                        <div className="hidden md:block mb-6">
                            <BreadcrumbsVoltar />
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-[#23272F]">Minhas Solicitações</h1>
                            <button
                                className="inline-flex items-center gap-2 bg-[#8494E9] hover:bg-[#6D75C0] text-white font-semibold rounded-lg px-4 sm:px-5 py-2 sm:py-2.5 transition-all shadow-sm hover:shadow-md text-sm md:text-base w-full sm:w-auto justify-center"
                                onClick={() => setModalCriarAberto(true)}
                            >
                                <span>+</span>
                                <span>Criar</span>
                            </button>
                        </div>
                        {/* Filtros */}
                        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <div className="w-full sm:w-auto">
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-1">Status</label>
                                <select
                                    className="border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition text-sm"
                                    value={status}
                                    onChange={e => setStatus(e.target.value)}
                                >
                                    {statusOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-1">Buscar por título, tipo ou protocolo</label>
                                <input
                                    type="text"
                                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition text-sm"
                                    placeholder="Ex: Cancelamento, PRT-..."
                                    value={busca}
                                    onChange={e => setBusca(e.target.value)}
                                />
                            </div>
                        </div>
                
                        {/* Loading */}
                        {isLoading && (
                            <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
                                Carregando solicitações...
                            </div>
                        )}

                        {/* Lista */}
                        {!isLoading && (
                            <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                                    <thead>
                                        <tr className="bg-[#F1F2F4]">
                                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Título</th>
                                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap hidden sm:table-cell">Tipo</th>
                                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap hidden md:table-cell">Protocolo</th>
                                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Data</th>
                                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Status</th>
                                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {solicitacoesFiltradas.length === 0 && !isLoading && (
                                            <tr>
                                                <td colSpan={6} className="text-center py-8 text-gray-400 text-sm sm:text-base">
                                                    Nenhuma solicitação encontrada.
                                                </td>
                                            </tr>
                                        )}
                                        {solicitacoesFiltradas.map((s) => (
                                            <tr key={s.Id} className="hover:bg-gray-50 transition">
                                                <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 font-medium text-gray-900 text-xs sm:text-sm">
                                                    <div className="flex flex-col sm:hidden">
                                                        <span className="font-medium">{s.Title}</span>
                                                        <span className="text-xs text-gray-500 mt-0.5">{s.Tipo}</span>
                                                    </div>
                                                    <span className="hidden sm:inline">{s.Title}</span>
                                                </td>
                                                <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-gray-700 text-xs sm:text-sm hidden sm:table-cell">{s.Tipo}</td>
                                                <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-gray-600 font-mono text-xs hidden md:table-cell">{s.Protocol}</td>
                                                <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-gray-600 text-xs sm:text-sm">{formatarData(s.CreatedAt)}</td>
                                                <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(s.Status)}`}
                                                    >
                                                        {s.Status}
                                                    </span>
                                                </td>
                                                <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center">
                                                    <button
                                                        className="inline-flex items-center justify-center p-1.5 sm:p-2 rounded hover:bg-gray-100 transition"
                                                        title="Visualizar"
                                                        onClick={() => handleVisualizar(s)}
                                                    >
                                                        <Image src="/assets/icons/eye.svg" alt="Visualizar" className="w-4 h-4 sm:w-5 sm:h-5" width={20} height={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Modal de criação de solicitação */}
            <ModalCriarSolicitacao
                open={modalCriarAberto}
                onClose={() => setModalCriarAberto(false)}
                onSubmit={handleCreateSolicitacao}
            />
            {/* Modal de detalhes da solicitação */}
            <ModalDetalhesSolicitacao
                open={modalDetalhesAberto}
                onClose={() => {
                    setModalDetalhesAberto(false);
                    setSolicitacaoSelecionada(null);
                }}
                solicitacao={solicitacaoSelecionada}
                formatarData={formatarDataHora}
                onUpdate={refetch}
            />
        </>
    );
}

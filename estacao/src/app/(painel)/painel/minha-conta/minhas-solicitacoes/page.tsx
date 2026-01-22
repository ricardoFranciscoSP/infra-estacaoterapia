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
            <div className="min-h-screen bg-white max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
                <BreadcrumbsVoltar />
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl md:text-2xl font-bold text-[#23272F]">Minhas Solicitações</h1>
                    <button
                        className="inline-flex items-center gap-2 bg-[#8494E9] hover:bg-[#6D75C0] text-white font-semibold rounded-lg px-5 py-2.5 transition-all shadow-sm hover:shadow-md text-sm md:text-base"
                        onClick={() => setModalCriarAberto(true)}
                    >
                        <span>+</span>
                        <span>Criar</span>
                    </button>
                </div>
                {/* Filtros */}
                <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-48 focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition"
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                        >
                            {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Buscar por título, tipo ou protocolo</label>
                        <input
                            type="text"
                            className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition"
                            placeholder="Ex: Cancelamento, PRT-..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                        />
                    </div>
                </div>
                
                {/* Loading */}
                {isLoading && (
                    <div className="text-center py-8 text-gray-500">
                        Carregando solicitações...
                    </div>
                )}

                {/* Lista */}
                {!isLoading && (
                    <div className="overflow-x-auto bg-white rounded-lg shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead>
                                <tr className="bg-[#F1F2F4]">
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Título</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Tipo</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Protocolo</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Data</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Status</th>
                                    <th className="px-2 md:px-4 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {solicitacoesFiltradas.length === 0 && !isLoading && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-gray-400">
                                            Nenhuma solicitação encontrada.
                                        </td>
                                    </tr>
                                )}
                                {solicitacoesFiltradas.map((s) => (
                                    <tr key={s.Id} className="hover:bg-gray-50 transition">
                                        <td className="px-2 md:px-4 py-3 font-medium text-gray-900">{s.Title}</td>
                                        <td className="px-2 md:px-4 py-3 text-gray-700">{s.Tipo}</td>
                                        <td className="px-2 md:px-4 py-3 text-gray-600 font-mono text-xs">{s.Protocol}</td>
                                        <td className="px-2 md:px-4 py-3 text-gray-600">{formatarData(s.CreatedAt)}</td>
                                        <td className="px-2 md:px-4 py-3">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(s.Status)}`}
                                            >
                                                {s.Status}
                                            </span>
                                        </td>
                                        <td className="px-2 md:px-4 py-3 text-center">
                                            <button
                                                className="inline-flex items-center justify-center p-2 rounded hover:bg-gray-100 transition"
                                                title="Visualizar"
                                                onClick={() => handleVisualizar(s)}
                                            >
                                                <Image src="/assets/icons/eye.svg" alt="Visualizar" className="w-5 h-5" width={20} height={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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

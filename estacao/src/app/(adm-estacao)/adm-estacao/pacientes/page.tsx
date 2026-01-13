"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAdmPaciente } from "@/hooks/admin/useAdmPaciente";

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const FilterIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

interface Paciente {
  Id: string | number;
  Nome: string;
  CreatedAt?: string;
  Status: "Ativo" | "Pendente" | string;
  // Adicione outros campos conforme necessário
}

export default function PacientesPage() {
    const { pacientes, isLoading: isPacientesLoading, refetch } = useAdmPaciente();

    const [busca, setBusca] = useState("");
    const [filtroStatus, setFiltroStatus] = useState("Todos");
    const [pagina, setPagina] = useState(1);
    const porPagina = 5;

    // Use pacientes do hook, ou array vazio se não carregou ainda
    const pacientesFiltrados = (pacientes || []).filter((p: Paciente) => {
        const buscaMatch = p.Nome?.toLowerCase().includes(busca.toLowerCase());
        const statusMatch = filtroStatus === "Todos" || p.Status === filtroStatus;
        return buscaMatch && statusMatch;
    });

    const total = pacientesFiltrados.length;
    const totalPaginas = Math.ceil(total / porPagina);
    const pacientesPaginados = pacientesFiltrados.slice((pagina - 1) * porPagina, pagina * porPagina);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return (
        <main className="w-full p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Pacientes</h1>
                <p className="text-sm text-gray-500">Gerencie e visualize todos os pacientes cadastrados</p>
            </motion.div>

            {/* Filtros */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-5 mb-5"
            >
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Campo de busca */}
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por nome..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                    </div>

                    {/* Filtro de status */}
                    <div className="relative min-w-[200px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FilterIcon />
                        </div>
                        <select
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none appearance-none bg-white cursor-pointer"
                            value={filtroStatus}
                            onChange={(e) => setFiltroStatus(e.target.value)}
                        >
                            <option value="Todos">Todos os status</option>
                            <option value="Ativo">Ativo</option>
                            <option value="Pendente">Pendente</option>
                        </select>
                    </div>
                </div>

                {/* Info e paginação superior */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-600">
                        {total > 0 ? (
                            <>Exibindo <span className="text-[#8494E9] font-semibold">{(pagina - 1) * porPagina + 1}</span> a <span className="text-[#8494E9] font-semibold">{Math.min(pagina * porPagina, total)}</span> de <span className="text-[#8494E9] font-semibold">{total}</span> pacientes</>
                        ) : (
                            "Nenhum paciente encontrado"
                        )}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            onClick={() => setPagina((p) => Math.max(1, p - 1))}
                            disabled={pagina === 1}
                        >
                            ← Anterior
                        </button>
                        <span className="text-sm font-medium text-gray-600 px-3">
                            {pagina} / {totalPaginas || 1}
                        </span>
                        <button
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                            disabled={pagina === totalPaginas || totalPaginas === 0}
                        >
                            Próxima →
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Tabela Desktop */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="hidden md:block bg-white rounded-xl shadow-sm border border-[#E5E9FA] overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-[#8494E9]/5 to-[#8494E9]/10">
                            <tr>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Paciente</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Data Cadastro</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Status</th>
                                <th className="py-4 px-6 text-center text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isPacientesLoading ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-10 h-10 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-gray-500 text-sm">Carregando pacientes...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : pacientesPaginados.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <span className="text-gray-400 text-4xl">🔍</span>
                                            <span className="text-gray-500 font-medium">Nenhum paciente encontrado</span>
                                            <span className="text-gray-400 text-sm">Tente ajustar os filtros de busca</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                pacientesPaginados.map((p: Paciente, i: number) => (
                                    <motion.tr 
                                        key={p.Id || i}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="py-4 px-6">
                                            <span className="font-medium text-gray-800">{p.Nome}</span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-600">
                                            {p.CreatedAt ? new Date(p.CreatedAt).toLocaleDateString("pt-BR") : "-"}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                p.Status === "Ativo"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                            }`}>
                                                {p.Status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link 
                                                    href={`/adm-estacao/paciente/${p.Id}`}
                                                    className="p-2 text-[#8494E9] hover:bg-[#8494E9]/10 rounded-lg transition-all"
                                                    title="Visualizar"
                                                >
                                                    <EyeIcon />
                                                </Link>
                                                <Link 
                                                    href={`/adm-estacao/paciente/${p.Id}?edit=1`}
                                                    className="p-2 text-[#8494E9] hover:bg-[#8494E9]/10 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <PencilIcon />
                                                </Link>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Cards Mobile */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="md:hidden space-y-3"
            >
                {isPacientesLoading ? (
                    <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-8 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-10 h-10 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-gray-500 text-sm"></span>
                        </div>
                    </div>
                ) : pacientesPaginados.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-8 text-center">
                        <span className="text-gray-400 text-4xl block mb-2">🔍</span>
                        <span className="text-gray-500 font-medium block">Nenhum paciente encontrado</span>
                    </div>
                ) : (
                    pacientesPaginados.map((p: Paciente, i: number) => (
                        <motion.div
                            key={p.Id || i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-800 truncate">{p.Nome}</h3>
                                    <p className="text-sm text-gray-500">
                                        {p.CreatedAt ? new Date(p.CreatedAt).toLocaleDateString("pt-BR") : "-"}
                                    </p>
                                </div>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ml-2 ${
                                    p.Status === "Ativo"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-yellow-100 text-yellow-700"
                                }`}>
                                    {p.Status}
                                </span>
                            </div>

                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                                <Link 
                                    href={`/adm-estacao/paciente/${p.Id}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#8494E9] text-white rounded-lg hover:bg-[#6B7DE0] transition-all text-sm font-medium"
                                >
                                    <EyeIcon />
                                    Visualizar
                                </Link>
                                <Link 
                                    href={`/adm-estacao/paciente/${p.Id}?edit=1`}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#E5E9FA] text-[#8494E9] rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                                >
                                    <PencilIcon />
                                    Editar
                                </Link>
                            </div>
                        </motion.div>
                    ))
                )}
            </motion.div>
        </main>
    );
}

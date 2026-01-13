"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { usePlanosAdmin, useDeletePlanoAdmin } from "@/hooks/adm/planosAdminHook";
import ModalPlanoAdmin from "@/components/adm/ModalPlanoAdmin";

export default function PlanosAdminPage() {
    const { data: planos, isLoading, refetch } = usePlanosAdmin();
    const deletePlano = useDeletePlanoAdmin();
    const [showModal, setShowModal] = useState(false);
    const [planoEditando, setPlanoEditando] = useState<string | undefined>(undefined);

    const handleCreate = () => {
        setPlanoEditando(undefined);
        setShowModal(true);
    };

    const handleEdit = (id: string) => {
        setPlanoEditando(id);
        setShowModal(true);
    };

    const handleDelete = async (id: string, nome: string) => {
        if (!confirm(`Tem certeza que deseja deletar o plano "${nome}"?`)) {
            return;
        }

        try {
            await deletePlano.mutateAsync(id);
            await refetch();
        } catch (error) {
            console.error("Erro ao deletar plano:", error);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setPlanoEditando(undefined);
        refetch();
    };

    if (isLoading) {
        return (
            <main className="w-full p-4 sm:p-6 lg:p-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8494E9]"></div>
                </div>
            </main>
        );
    }

    return (
        <main className="w-full p-4 sm:p-6 lg:p-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                            Gestão de Planos
                        </h1>
                        <p className="text-sm text-gray-500">
                            Crie e gerencie os planos de assinatura disponíveis na plataforma.
                        </p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-[#8494E9] text-white rounded-lg font-medium hover:bg-[#6B7DE0] transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Novo Plano
                    </button>
                </div>
            </motion.div>

            {planos && planos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {planos.map((plano) => (
                        <motion.div
                            key={plano.Id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl shadow-sm p-5 border border-[#E5E9FA] hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                        {plano.Nome}
                                    </h3>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                                            plano.Status === "ativo" 
                                                ? "bg-green-100 text-green-800" 
                                                : "bg-gray-100 text-gray-800"
                                        }`}>
                                            {plano.Status}
                                        </span>
                                        {plano.Destaque && (
                                            <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
                                                Destaque
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Tipo:</span>
                                    <span className="font-medium text-gray-800 capitalize">{plano.Tipo}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Preço:</span>
                                    <span className="font-medium text-gray-800">
                                        R$ {plano.Preco.toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Duração:</span>
                                    <span className="font-medium text-gray-800">{plano.Duracao} dias</span>
                                </div>
                                {plano.ProductId && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Product ID:</span>
                                        <span className="font-mono text-xs text-gray-600">{plano.ProductId}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => handleEdit(plano.Id)}
                                    className="flex-1 px-3 py-2 bg-[#8494E9] text-white rounded-lg text-sm font-medium hover:bg-[#6B7DE0] transition-colors"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(plano.Id, plano.Nome)}
                                    className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-xl shadow-sm p-12 border border-[#E5E9FA] text-center"
                >
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Nenhum plano encontrado
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Comece criando seu primeiro plano de assinatura.
                    </p>
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-[#8494E9] text-white rounded-lg font-medium hover:bg-[#6B7DE0] transition-colors"
                    >
                        Criar Primeiro Plano
                    </button>
                </motion.div>
            )}

            {showModal && (
                <ModalPlanoAdmin
                    isOpen={showModal}
                    onClose={handleCloseModal}
                    planoId={planoEditando}
                />
            )}
        </main>
    );
}

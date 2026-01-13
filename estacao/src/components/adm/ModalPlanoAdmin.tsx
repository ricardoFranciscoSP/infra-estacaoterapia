"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlanoAdminById, useCreatePlanoAdmin, useUpdatePlanoAdmin } from "@/hooks/adm/planosAdminHook";
import toast from "react-hot-toast";
import RichTextEditor from "./RichTextEditor";

interface ModalPlanoAdminProps {
    isOpen: boolean;
    onClose: () => void;
    planoId?: string;
}

interface PlanoFormData {
    Nome: string;
    Descricao: string;
    Preco: number;
    Duracao: number;
    Tipo: string;
    Status: string;
    Destaque: boolean;
}

export default function ModalPlanoAdmin({ isOpen, onClose, planoId }: ModalPlanoAdminProps) {
    const { data: planoExistente, isLoading: isLoadingPlano } = usePlanoAdminById(planoId);
    const createPlano = useCreatePlanoAdmin();
    const updatePlano = useUpdatePlanoAdmin();

    const [formData, setFormData] = useState<PlanoFormData>({
        Nome: "",
        Descricao: "",
        Preco: 0,
        Duracao: 30,
        Tipo: "mensal",
        Status: "ativo",
        Destaque: false,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Carrega dados do plano quando está editando
    useEffect(() => {
        if (planoExistente) {
            // Converte Descricao (que pode ser JSON) para string HTML
            let descricaoString = "";
            if (planoExistente.Descricao) {
                if (typeof planoExistente.Descricao === "string") {
                    descricaoString = planoExistente.Descricao;
                } else if (Array.isArray(planoExistente.Descricao)) {
                    // Se for array, converte para HTML
                    descricaoString = planoExistente.Descricao
                        .map((item: unknown) => {
                            if (typeof item === "string") return item;
                            if (typeof item === "object" && item !== null && "descricao" in item) {
                                return String((item as { descricao: string }).descricao);
                            }
                            return String(item);
                        })
                        .join("<br>");
                } else {
                    descricaoString = JSON.stringify(planoExistente.Descricao);
                }
            }

            setFormData({
                Nome: planoExistente.Nome || "",
                Descricao: descricaoString,
                Preco: planoExistente.Preco || 0,
                Duracao: planoExistente.Duracao || 30,
                Tipo: planoExistente.Tipo || "mensal",
                Status: planoExistente.Status || "ativo",
                Destaque: planoExistente.Destaque || false,
            });
        } else if (!planoId) {
            // Reset form quando criando novo
            setFormData({
                Nome: "",
                Descricao: "",
                Preco: 0,
                Duracao: 30,
                Tipo: "mensal",
                Status: "ativo",
                Destaque: false,
            });
        }
    }, [planoExistente, planoId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Validações
            if (!formData.Nome.trim()) {
                toast.error("Nome do plano é obrigatório");
                setIsSubmitting(false);
                return;
            }

            if (formData.Preco <= 0) {
                toast.error("Preço deve ser maior que zero");
                setIsSubmitting(false);
                return;
            }

            if (formData.Duracao <= 0) {
                toast.error("Duração deve ser maior que zero");
                setIsSubmitting(false);
                return;
            }

            if (planoId) {
                // Atualizar plano existente
                await updatePlano.mutateAsync({
                    id: planoId,
                    data: {
                        Nome: formData.Nome,
                        Descricao: formData.Descricao,
                        Preco: formData.Preco,
                        Duracao: formData.Duracao,
                        Tipo: formData.Tipo,
                        Status: formData.Status,
                        Destaque: formData.Destaque,
                    },
                });
            } else {
                // Criar novo plano
                await createPlano.mutateAsync([
                    {
                        Nome: formData.Nome,
                        Descricao: formData.Descricao,
                        Preco: formData.Preco,
                        Duracao: formData.Duracao,
                        Tipo: formData.Tipo,
                        Status: formData.Status,
                        Destaque: formData.Destaque,
                    },
                ]);
            }

            onClose();
        } catch (error) {
            console.error("Erro ao salvar plano:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                >
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                        <h2 className="text-xl font-bold text-gray-800">
                            {planoId ? "Editar Plano" : "Novo Plano"}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Fechar modal"
                        >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {isLoadingPlano && planoId ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8494E9]"></div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nome do Plano *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.Nome}
                                            onChange={(e) => setFormData({ ...formData, Nome: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tipo *
                                        </label>
                                        <select
                                            value={formData.Tipo}
                                            onChange={(e) => setFormData({ ...formData, Tipo: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
                                            required
                                        >
                                            <option value="unico">Único</option>
                                            <option value="mensal">Mensal</option>
                                            <option value="trimestral">Trimestral</option>
                                            <option value="semestral">Semestral</option>
                                            <option value="anual">Anual</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Preço (R$) *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.Preco}
                                            onChange={(e) => setFormData({ ...formData, Preco: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Duração (dias) *
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.Duracao}
                                            onChange={(e) => setFormData({ ...formData, Duracao: parseInt(e.target.value) || 30 })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Status *
                                        </label>
                                        <select
                                            value={formData.Status}
                                            onChange={(e) => setFormData({ ...formData, Status: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
                                            required
                                        >
                                            <option value="ativo">Ativo</option>
                                            <option value="inativo">Inativo</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center pt-8">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.Destaque}
                                                onChange={(e) => setFormData({ ...formData, Destaque: e.target.checked })}
                                                className="w-4 h-4 text-[#8494E9] border-gray-300 rounded focus:ring-[#8494E9]"
                                            />
                                            <span className="text-sm font-medium text-gray-700">Plano em destaque</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Descrição *
                                    </label>
                                    <RichTextEditor
                                        value={formData.Descricao}
                                        onChange={(newValue) => setFormData({ ...formData, Descricao: newValue })}
                                        placeholder="Digite a descrição do plano. Use a barra de ferramentas para formatar ou clique em 'HTML' para editar o código diretamente."
                                    />
                                    <p className="mt-2 text-xs text-gray-500">
                                        Esta descrição será usada na criação/atualização do produto na Vindi. Use o modo Visual para editar com formatação ou o modo HTML para editar o código diretamente.
                                    </p>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                        disabled={isSubmitting}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 bg-[#8494E9] text-white rounded-lg font-medium hover:bg-[#6B7DE0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Salvando...
                                            </>
                                        ) : (
                                            planoId ? "Atualizar" : "Criar"
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

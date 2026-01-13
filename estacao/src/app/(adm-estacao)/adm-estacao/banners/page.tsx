"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useBanners, useDeleteBanner, useToggleBannerActive } from "@/hooks/useBanners";
import { Banner } from "@/services/bannerService";
import ModalBanner from "@/components/adm/ModalBanner";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import Image from "next/image";

export default function BannersPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [bannerEditando, setBannerEditando] = useState<Banner | null>(null);
    const [bannerExcluindo, setBannerExcluindo] = useState<string | null>(null);

    const { data: banners, isLoading, refetch } = useBanners();
    const deleteBanner = useDeleteBanner();
    const toggleActive = useToggleBannerActive();

    useEscapeKey(isModalOpen, () => {
        setIsModalOpen(false);
        setBannerEditando(null);
    });

    const handleCreate = () => {
        setBannerEditando(null);
        setIsModalOpen(true);
    };

    const handleEdit = (banner: Banner) => {
        setBannerEditando(banner);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este banner?")) {
            return;
        }

        try {
            setBannerExcluindo(id);
            await deleteBanner.mutateAsync(id);
            await refetch();
        } catch (error) {
            console.error("Erro ao excluir banner:", error);
        } finally {
            setBannerExcluindo(null);
        }
    };

    const handleToggleActive = async (id: string) => {
        try {
            await toggleActive.mutateAsync(id);
            await refetch();
        } catch (error) {
            console.error("Erro ao alterar status do banner:", error);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setBannerEditando(null);
        refetch();
    };

    return (
        <main className="w-full p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Gestão de Banners</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Gerencie os banners do carrossel da plataforma
                        </p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-[#8494E9] text-white rounded-lg hover:bg-[#6B7FD7] transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Novo Banner
                    </button>
                </div>
            </motion.div>

            {/* Lista de Banners */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] overflow-hidden"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8494E9]"></div>
                        <span className="ml-3 text-gray-600">Carregando banners...</span>
                    </div>
                ) : !banners || banners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <svg
                            className="w-16 h-16 text-gray-300 mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        <p className="text-gray-500 text-lg">Nenhum banner cadastrado</p>
                        <button
                            onClick={handleCreate}
                            className="mt-4 px-4 py-2 bg-[#8494E9] text-white rounded-lg hover:bg-[#6B7FD7] transition-colors"
                        >
                            Criar primeiro banner
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Miniatura
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Título
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Ordem
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Criado em
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {banners.map((banner) => (
                                    <tr key={banner.Id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-20 h-12 rounded overflow-hidden bg-gray-100">
                                                    <Image
                                                        src={banner.UrlImagemDesktop}
                                                        alt={banner.Titulo || "Banner"}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-100">
                                                    <Image
                                                        src={banner.UrlImagemMobile}
                                                        alt={banner.Titulo || "Banner"}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {banner.Titulo || "Sem título"}
                                            </div>
                                            {banner.Descricao && (
                                                <div className="text-xs text-gray-500 truncate max-w-xs">
                                                    {banner.Descricao}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-900">{banner.Ordem}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => handleToggleActive(banner.Id)}
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${
                                                    banner.Ativo
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-gray-100 text-gray-700"
                                                }`}
                                            >
                                                {banner.Ativo ? "Ativo" : "Inativo"}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(banner.CreatedAt).toLocaleDateString("pt-BR")}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(banner)}
                                                    className="text-[#8494E9] hover:text-[#6B7FD7] transition-colors"
                                                    title="Editar"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(banner.Id)}
                                                    disabled={bannerExcluindo === banner.Id}
                                                    className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Excluir"
                                                >
                                                    {bannerExcluindo === banner.Id ? (
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>

            {/* Modal */}
            <ModalBanner
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                banner={bannerEditando}
            />
        </main>
    );
}


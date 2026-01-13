"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateBanner, useUpdateBanner } from "@/hooks/useBanners";
import { Banner } from "@/services/bannerService";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import Image from "next/image";

interface ModalBannerProps {
    isOpen: boolean;
    onClose: () => void;
    banner?: Banner | null;
}

export default function ModalBanner({ isOpen, onClose, banner }: ModalBannerProps) {
    const [titulo, setTitulo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [linkDestino, setLinkDestino] = useState("");
    const [ordem, setOrdem] = useState(0);
    const [ativo, setAtivo] = useState(true);
    const [altTextDesktop, setAltTextDesktop] = useState("");
    const [altTextMobile, setAltTextMobile] = useState("");
    const [titleSEO, setTitleSEO] = useState("");
    const [metaDescription, setMetaDescription] = useState("");
    const [imagemDesktop, setImagemDesktop] = useState<File | null>(null);
    const [imagemMobile, setImagemMobile] = useState<File | null>(null);
    const [previewDesktop, setPreviewDesktop] = useState<string | null>(null);
    const [previewMobile, setPreviewMobile] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEscapeKey(isOpen, () => {
        onCloseRef.current();
    });

    const createBanner = useCreateBanner();
    const updateBanner = useUpdateBanner();

    // Carregar dados do banner quando estiver editando
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                if (banner) {
                    setTitulo(banner.Titulo || "");
                    setDescricao(banner.Descricao || "");
                    setLinkDestino(banner.LinkDestino || "");
                    setOrdem(banner.Ordem);
                    setAtivo(banner.Ativo);
                    setPreviewDesktop(banner.UrlImagemDesktop);
                    setPreviewMobile(banner.UrlImagemMobile);
                    setAltTextDesktop(banner.AltTextDesktop || "");
                    setAltTextMobile(banner.AltTextMobile || "");
                    setTitleSEO(banner.TitleSEO || "");
                    setMetaDescription(banner.MetaDescription || "");
                } else {
                    setTitulo("");
                    setDescricao("");
                    setLinkDestino("");
                    setOrdem(0);
                    setAtivo(true);
                    setPreviewDesktop(null);
                    setPreviewMobile(null);
                    setAltTextDesktop("");
                    setAltTextMobile("");
                    setTitleSEO("");
                    setMetaDescription("");
                }
                setImagemDesktop(null);
                setImagemMobile(null);
            }, 0);
        }
    }, [isOpen, banner]);

    const validateAndSetImage = (file: File, tipo: "desktop" | "mobile") => {
        // Validar tipo
        if (!file.type.startsWith("image/")) {
            alert("Por favor, selecione uma imagem válida");
            return;
        }

        // Validar tamanho (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert("A imagem deve ter no máximo 10MB");
            return;
        }

        if (tipo === "desktop") {
            setImagemDesktop(file);
            setPreviewDesktop(URL.createObjectURL(file));
        } else {
            setImagemMobile(file);
            setPreviewMobile(URL.createObjectURL(file));
        }
    };

    const handleImageChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        tipo: "desktop" | "mobile"
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        validateAndSetImage(file, tipo);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add("border-[#8494E9]", "bg-blue-50");
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove("border-[#8494E9]", "bg-blue-50");
    };

    const handleDrop = (e: React.DragEvent, tipo: "desktop" | "mobile") => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove("border-[#8494E9]", "bg-blue-50");

        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        validateAndSetImage(file, tipo);
    };

    // Normalizar link: se começar com /, adiciona a URL base
    const normalizeLink = (link: string): string => {
        if (!link) return "";
        
        // Se já é uma URL completa (http:// ou https://), retorna como está
        if (link.startsWith("http://") || link.startsWith("https://")) {
            return link;
        }
        
        // Se começa com /, é um caminho relativo - adiciona a URL base
        if (link.startsWith("/")) {
            if (typeof window !== "undefined") {
                return `${window.location.origin}${link}`;
            }
            // Fallback para desenvolvimento/produção
            const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://estacaoterapia.com.br';
            return link.startsWith("/") ? `${websiteUrl.replace(/\/$/, '')}${link}` : link;
        }
        
        // Caso contrário, retorna como está (pode ser um domínio sem protocolo)
        return link;
    };

    const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLinkDestino(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        
        setIsLoading(true);

        try {
            if (banner) {
                // Atualizar
                await updateBanner.mutateAsync({
                    id: banner.Id,
                    data: {
                        Titulo: titulo || undefined,
                        Descricao: descricao || undefined,
                        LinkDestino: linkDestino ? normalizeLink(linkDestino) : undefined,
                        Ordem: ordem,
                        Ativo: ativo,
                        AltTextDesktop: altTextDesktop.trim() || undefined,
                        AltTextMobile: altTextMobile.trim() || undefined,
                        TitleSEO: titleSEO.trim() || undefined,
                        MetaDescription: metaDescription.trim() || undefined,
                    },
                    imagemDesktop: imagemDesktop || undefined,
                    imagemMobile: imagemMobile || undefined,
                });
            } else {
                // Criar - requer ambas as imagens
                if (!imagemDesktop || !imagemMobile) {
                    alert("Por favor, envie tanto a imagem desktop quanto a mobile");
                    setIsLoading(false);
                    return;
                }

                // Validação de Alt Text (recomendado mas não obrigatório)
                if (!altTextDesktop.trim() || !altTextMobile.trim()) {
                    const confirmContinue = confirm(
                        "Os textos alternativos (Alt Text) não foram preenchidos. " +
                        "Isso pode afetar o SEO e a acessibilidade. Deseja continuar mesmo assim?"
                    );
                    if (!confirmContinue) {
                        setIsLoading(false);
                        return;
                    }
                }

                await createBanner.mutateAsync({
                    data: {
                        Titulo: titulo.trim() || undefined,
                        Descricao: descricao.trim() || undefined,
                        LinkDestino: linkDestino.trim() ? normalizeLink(linkDestino.trim()) : undefined,
                        Ordem: ordem,
                        Ativo: ativo,
                        AltTextDesktop: altTextDesktop.trim() || undefined,
                        AltTextMobile: altTextMobile.trim() || undefined,
                        TitleSEO: titleSEO.trim() || undefined,
                        MetaDescription: metaDescription.trim() || undefined,
                    },
                    imagemDesktop,
                    imagemMobile,
                });
            }

            // Fechar modal após sucesso (o toast já é mostrado pelo hook)
            onClose();
        } catch (error) {
            console.error("Erro ao salvar banner:", error);
            // O toast de erro já é mostrado pelo hook useCreateBanner/useUpdateBanner
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-transparent z-[100] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => onCloseRef.current()}
                >
                    <motion.div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ duration: 0.3 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="w-full h-[60px] bg-gradient-to-r from-[#8494E9] to-[#6B7FD7] flex items-center justify-between px-6 rounded-t-xl">
                            <h2 className="text-xl font-bold text-white">
                                {banner ? "Editar Banner" : "Novo Banner"}
                            </h2>
                            <button
                                onClick={() => onCloseRef.current()}
                                className="text-white text-2xl font-bold hover:text-gray-200 transition-colors"
                                aria-label="Fechar"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            <form onSubmit={handleSubmit} noValidate className="space-y-6">
                                {/* Link de Destino - Destaque */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <label className="block text-sm font-semibold text-blue-900 mb-2">
                                        Link de Destino
                                        <span className="text-xs font-normal text-blue-600 ml-2">(opcional - URL para onde o banner redirecionará ao ser clicado)</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                        <input
                                            type="text"
                                            value={linkDestino}
                                            onChange={handleLinkChange}
                                            className="flex-1 px-4 py-2 border-2 border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9] bg-white"
                                            placeholder="https://exemplo.com ou /register ou /ver-psicologos"
                                        />
                                    </div>
                                    {linkDestino && (
                                        <p className="mt-2 text-xs text-blue-700 flex items-center gap-1 flex-wrap">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>Link configurado:</span>
                                            <span className="font-mono text-xs bg-white px-1 rounded break-all">
                                                {normalizeLink(linkDestino)}
                                            </span>
                                        </p>
                                    )}
                                </div>

                                {/* Título e Descrição */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Título (opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={titulo}
                                            onChange={(e) => setTitulo(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9]"
                                            placeholder="Título do banner"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Ordem
                                        </label>
                                        <input
                                            type="number"
                                            value={ordem}
                                            onChange={(e) => setOrdem(parseInt(e.target.value, 10) || 0)}
                                            min={0}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Descrição (opcional)
                                    </label>
                                    <textarea
                                        value={descricao}
                                        onChange={(e) => setDescricao(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9]"
                                        placeholder="Descrição do banner"
                                    />
                                </div>

                                {/* Upload de Imagens */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Imagem Desktop */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Imagem Desktop *
                                        </label>
                                        <div 
                                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center transition-colors cursor-pointer"
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, "desktop")}
                                            onClick={() => document.getElementById("imagemDesktop")?.click()}
                                        >
                                            {previewDesktop ? (
                                                <div className="relative w-full h-32 rounded overflow-hidden bg-gray-100 mb-2">
                                                    <Image
                                                        src={previewDesktop}
                                                        alt="Preview Desktop"
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="py-8">
                                                    <svg
                                                        className="mx-auto h-12 w-12 text-gray-400"
                                                        stroke="currentColor"
                                                        fill="none"
                                                        viewBox="0 0 48 48"
                                                    >
                                                        <path
                                                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                                            strokeWidth={2}
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                    <p className="mt-2 text-sm text-gray-600">
                                                        Clique ou arraste uma imagem aqui
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        PNG, JPG ou WEBP (máx. 10MB)
                                                    </p>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleImageChange(e, "desktop")}
                                                className="hidden"
                                                id="imagemDesktop"
                                                name="imagemDesktop"
                                            />
                                            <label
                                                htmlFor="imagemDesktop"
                                                className="mt-2 inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors text-sm"
                                            >
                                                {previewDesktop ? "Trocar imagem" : "Selecionar imagem"}
                                            </label>
                                        </div>
                                    </div>

                                    {/* Imagem Mobile */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Imagem Mobile *
                                        </label>
                                        <div 
                                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center transition-colors cursor-pointer"
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, "mobile")}
                                            onClick={() => document.getElementById("imagemMobile")?.click()}
                                        >
                                            {previewMobile ? (
                                                <div className="relative w-full h-32 rounded overflow-hidden bg-gray-100 mb-2">
                                                    <Image
                                                        src={previewMobile}
                                                        alt="Preview Mobile"
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="py-8">
                                                    <svg
                                                        className="mx-auto h-12 w-12 text-gray-400"
                                                        stroke="currentColor"
                                                        fill="none"
                                                        viewBox="0 0 48 48"
                                                    >
                                                        <path
                                                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                                            strokeWidth={2}
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                    <p className="mt-2 text-sm text-gray-600">
                                                        Clique ou arraste uma imagem aqui
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        PNG, JPG ou WEBP (máx. 10MB)
                                                    </p>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleImageChange(e, "mobile")}
                                                className="hidden"
                                                id="imagemMobile"
                                                name="imagemMobile"
                                            />
                                            <label
                                                htmlFor="imagemMobile"
                                                className="mt-2 inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors text-sm"
                                            >
                                                {previewMobile ? "Trocar imagem" : "Selecionar imagem"}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Otimização SEO */}
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        <h3 className="text-sm font-semibold text-green-900">Otimização para SEO</h3>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-green-900 mb-1">
                                            Texto Alternativo - Imagem Desktop *
                                            <span className="text-xs font-normal text-green-700 ml-2">(Alt Text - importante para SEO e acessibilidade)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={altTextDesktop}
                                            onChange={(e) => setAltTextDesktop(e.target.value)}
                                            className="w-full px-3 py-2 border-2 border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                            placeholder="Ex: Terapia online acessível e de qualidade"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-green-900 mb-1">
                                            Texto Alternativo - Imagem Mobile *
                                            <span className="text-xs font-normal text-green-700 ml-2">(Alt Text - importante para SEO e acessibilidade)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={altTextMobile}
                                            onChange={(e) => setAltTextMobile(e.target.value)}
                                            className="w-full px-3 py-2 border-2 border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                            placeholder="Ex: Terapia online acessível e de qualidade"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-green-900 mb-1">
                                            Title Tag (opcional)
                                            <span className="text-xs font-normal text-green-700 ml-2">(Aparece na aba do navegador e resultados de busca)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={titleSEO}
                                            onChange={(e) => setTitleSEO(e.target.value)}
                                            maxLength={60}
                                            className="w-full px-3 py-2 border-2 border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                            placeholder="Ex: Terapia Online | Estação Terapia"
                                        />
                                        <p className="mt-1 text-xs text-green-600">
                                            {titleSEO.length}/60 caracteres (recomendado: 50-60)
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-green-900 mb-1">
                                            Meta Description (opcional)
                                            <span className="text-xs font-normal text-green-700 ml-2">(Descrição que aparece nos resultados de busca)</span>
                                        </label>
                                        <textarea
                                            value={metaDescription}
                                            onChange={(e) => setMetaDescription(e.target.value)}
                                            maxLength={160}
                                            rows={3}
                                            className="w-full px-3 py-2 border-2 border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                            placeholder="Ex: Agende sua sessão de terapia online com psicólogos qualificados. Atendimento humanizado e acessível."
                                        />
                                        <p className="mt-1 text-xs text-green-600">
                                            {metaDescription.length}/160 caracteres (recomendado: 150-160)
                                        </p>
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Status
                                    </label>
                                    <select
                                        value={ativo ? "true" : "false"}
                                        onChange={(e) => setAtivo(e.target.value === "true")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9] bg-white"
                                    >
                                        <option value="true">Ativo</option>
                                        <option value="false">Inativo</option>
                                    </select>
                                </div>

                                {/* Botões */}
                                <div className="flex gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => onCloseRef.current()}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                        disabled={isLoading}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className={`relative flex-1 px-4 py-2 bg-[#8494E9] text-white rounded-lg hover:bg-[#6B7FD7] transition-colors flex items-center justify-center overflow-hidden cursor-pointer ${
                                            isLoading ? "opacity-90 cursor-wait" : ""
                                        }`}
                                        disabled={isLoading}
                                    >
                                        {isLoading && (
                                            <div className="absolute inset-0 animate-[shimmer_2s_infinite]" style={{
                                                background: 'linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 255, 255, 0) 100%)',
                                                backgroundSize: '1000px 100%'
                                            }}></div>
                                        )}
                                        <span className="relative z-10 flex items-center">
                                            {isLoading ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Salvando...
                                                </>
                                            ) : (
                                                "Salvar"
                                            )}
                                        </span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


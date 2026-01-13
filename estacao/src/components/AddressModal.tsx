"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface AddressModalProps {
    show: boolean;
    onClose: () => void;
    userAddress: {
        cep: string;
        endereco: string;
        numero?: string;
        complemento: string;
        bairro: string;
        cidade: string;
        estado: string;
    };
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCepBlur: () => void;
    onConcluirCadastro: (e: React.MouseEvent<HTMLButtonElement>) => void;
    addressTouched: boolean;
    userId?: string; // opcional, se necessário para ações futuras
    isLoading?: boolean; // opcional, para mostrar loading no modal
}

export default function AddressModal({
    show,
    onClose,
    userAddress,
    onChange,
    onCepBlur,
    onConcluirCadastro,
    addressTouched,
}: AddressModalProps) {
    // Fecha o modal ao pressionar ESC
    useEscapeKey(show, onClose);
    
    return (
        <AnimatePresence>
            {show && (
                <>
                    {/* MOBILE */}
                    <MobileAddressModal
                        show={show}
                        onClose={onClose}
                        userAddress={userAddress}
                        onChange={onChange}
                        onCepBlur={onCepBlur}
                        onConcluirCadastro={onConcluirCadastro}
                        addressTouched={addressTouched}
                    />
                    {/* DESKTOP */}
                    <motion.div
                        className="hidden md:flex fixed inset-0 z-[9999] items-center justify-center bg-transparent"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="
                                w-[95vw] max-w-[500px] h-auto bg-white relative flex flex-col p-0 rounded-[8px] shadow-lg
                                md:w-[792px] md:h-[512px] md:max-w-none md:rotate-0 md:opacity-100
                            "
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        >
                            {/* Header */}
                            <div className="w-full h-[56px] rounded-t-[8px] bg-[#8494E9] flex items-center justify-center relative px-4 md:px-8">
                                <h3 className="mx-auto font-medium text-[16px] leading-6 text-white text-center w-full">
                                    Endereço de cobrança
                                </h3>
                                <button
                                    className="absolute top-1/2 -translate-y-1/2 right-4 md:right-6 text-white hover:text-gray-200 text-2xl"
                                    onClick={onClose}
                                    aria-label="Fechar"
                                >
                                    ×
                                </button>
                            </div>
                            {/* Conteúdo principal */}
                            <div className="flex flex-col w-full px-4 md:px-8 py-6 gap-4">
                                <div className="w-full h-[36px] flex items-center gap-[6px] rounded-[3px] bg-[#FFEDB3] px-[6px] py-[2px]">
                                    <Image src="/assets/icons/info-circled.svg" alt="info" width={20} height={20} className="w-5 h-5" />
                                    <span className="fira-sans text-[12px] leading-4 text-gray-800">
                                        Seu endereço ainda não foi cadastrado, cadastre agora para finalizar a compra.
                                    </span>
                                </div>
                                {/* Campo CEP sozinho */}
                                <form className="w-full flex flex-col gap-3 mb-4">
                                    <input
                                        className={`w-full h-[40px] px-2 rounded border ${addressTouched && !userAddress.cep ? 'border-red-400' : 'border-[#CACFD4]'} bg-[#FCFBF6] shadow-sm fira-sans text-[15px] leading-6`}
                                        placeholder="CEP*"
                                        name="cep"
                                        value={userAddress.cep}
                                        onChange={onChange}
                                        onBlur={onCepBlur}
                                    />
                                    {/* Restante dos campos lado a lado */}
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                        <input
                                            className={`w-full h-[40px] px-2 rounded border ${addressTouched && !userAddress.endereco ? 'border-red-400' : 'border-[#CACFD4]'} bg-[#FCFBF6] shadow-sm fira-sans text-[15px] leading-6`}
                                            placeholder="Endereço*"
                                            name="endereco"
                                            value={userAddress.endereco}
                                            onChange={onChange}
                                        />
                                        <input
                                            className={`w-full h-[40px] px-2 rounded border ${addressTouched && !userAddress.numero ? 'border-red-400' : 'border-[#CACFD4]'} bg-[#FCFBF6] shadow-sm fira-sans text-[15px] leading-6`}
                                            placeholder="Número*"
                                            name="numero"
                                            value={userAddress.numero}
                                            onChange={onChange}
                                        />
                                        <input
                                            className="w-full h-[40px] px-2 rounded border border-[#CACFD4] bg-[#FCFBF6] shadow-sm fira-sans text-[15px] leading-6"
                                            placeholder="Complemento"
                                            name="complemento"
                                            value={userAddress.complemento}
                                            onChange={onChange}
                                        />
                                        <input
                                            className={`w-full h-[40px] px-2 rounded border ${addressTouched && !userAddress.bairro ? 'border-red-400' : 'border-[#CACFD4]'} bg-[#FCFBF6] shadow-sm fira-sans text-[15px] leading-6`}
                                            placeholder="Bairro*"
                                            name="bairro"
                                            value={userAddress.bairro}
                                            onChange={onChange}
                                        />
                                        <input
                                            className={`w-full h-[40px] px-2 rounded border ${addressTouched && !userAddress.cidade ? 'border-red-400' : 'border-[#CACFD4]'} bg-[#FCFBF6] shadow-sm fira-sans text-[15px] leading-6`}
                                            placeholder="Cidade*"
                                            name="cidade"
                                            value={userAddress.cidade}
                                            onChange={onChange}
                                        />
                                        <input
                                            className={`w-full h-[40px] px-2 rounded border ${addressTouched && !userAddress.estado ? 'border-red-400' : 'border-[#CACFD4]'} bg-[#FCFBF6] shadow-sm fira-sans text-[15px] leading-6`}
                                            placeholder="Estado*"
                                            name="estado"
                                            value={userAddress.estado}
                                            onChange={onChange}
                                        />
                                    </div>
                                </form>
                            </div>
                            {/* Botões de ação */}
                            <div className="flex flex-col items-center w-full px-4 md:px-8 pb-6 gap-3">
                                <button
                                    className="
                                        w-full h-[40px] rounded-[6px] px-4 flex items-center justify-center gap-3
                                        font-medium text-[16px] leading-6
                                        text-[#6D75C0] bg-[#F1F2F4] hover:bg-[#e6e8f5] transition
                                        md:w-[728px]
                                    "
                                    onClick={onConcluirCadastro}
                                    aria-label="Concluir cadastro"
                                    style={{ verticalAlign: 'middle', opacity: 1 }}
                                >
                                    Concluir cadastro
                                </button>
                                <button
                                    className="
                                        w-full h-[40px] rounded-[6px] px-4 flex items-center justify-center gap-3
                                        font-medium text-[16px] leading-6
                                        text-[#6D75C0] bg-transparent hover:bg-[#f6f7fb] transition border border-[#F1F2F4]
                                        md:w-[728px]
                                    "
                                    onClick={onClose}
                                    aria-label="Cancelar"
                                    type="button"
                                    style={{ verticalAlign: 'middle', opacity: 1 }}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Modal mobile (apenas mobile)
function MobileAddressModal({
    show,
    onClose,
    userAddress,
    onChange,
    onCepBlur,
    onConcluirCadastro,
    addressTouched,
}: {
    show: boolean;
    onClose: () => void;
    userAddress: {
        cep: string;
        endereco: string;
        numero?: string;
        complemento?: string;
        bairro: string;
        cidade: string;
        estado: string;
    };
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCepBlur: () => void;
    onConcluirCadastro: (e: React.MouseEvent<HTMLButtonElement>) => void;
    addressTouched: boolean;
}) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="fixed inset-0 bg-white z-[9999] flex flex-col md:hidden"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                    {/* Header */}
                    <div className="relative flex flex-col items-center p-4 border-b border-gray-200">
                        <button
                            onClick={onClose}
                            className="absolute right-4 top-4 text-xl font-bold text-gray-600"
                            aria-label="Fechar"
                        >
                            ×
                        </button>
                        <span className="block text-base font-semibold text-gray-800 mb-2 text-center">
                            Endereço de cobrança
                        </span>
                    </div>
                    {/* Conteúdo */}
                    <div className="p-4 flex-1 flex flex-col overflow-y-auto text-gray-800 text-sm leading-relaxed">
                        <span className="mb-2 font-medium text-center text-[15px] text-[#606C76]">
                            Seu endereço ainda não foi cadastrado, cadastre agora para finalizar a compra.
                        </span>
                        <form className="w-full flex flex-col gap-3 mb-4 mt-2">
                            <input
                                className={`w-full h-[40px] px-2 rounded border ${addressTouched && !userAddress.cep ? 'border-red-400' : 'border-[#CACFD4]'} bg-[#FCFBF6] shadow-sm fira-sans text-[15px] leading-6`}
                                placeholder="CEP*"
                                name="cep"
                                value={userAddress.cep}
                                onChange={onChange}
                                onBlur={onCepBlur}
                            />
                            <input
                                className={`w-full h-[40px] px-2 rounded border ${addressTouched && !userAddress.endereco ? 'border-red-400' : 'border-[#CACFD4]'} bg-[#FCFBF6] shadow-sm fira-sans text-[15px] leading-6`}
                                placeholder="Endereço*"
                                name="endereco"
                                value={userAddress.endereco}
                                onChange={onChange}
                            />
                            <input
                                className={`w-full h-[40px] px-2 rounded border ${addressTouched && !userAddress.numero ? 'border-red-400' : 'border-[#CACFD4]'} bg-[#FCFBF6] shadow-sm fira-sans text-[15px] leading-6`}
                                placeholder="Número*"
                                name="numero"
                                value={userAddress.numero}
                                onChange={onChange}
                            />
                            <input
                                className="w-full h-[40px] px-2 rounded border border-[#CACFD4] bg-[#FCFBF6] shadow-sm fira-sans text-[15px] leading-6"
                                placeholder="Complemento"
                                name="complemento"
                                value={userAddress.complemento}
                                onChange={onChange}
                            />
                            <input
                                className={`w-full h-[40px] px-2 rounded border ${addressTouched && !userAddress.bairro ? 'border-red-400' : 'border-[#CACFD4]'} bg-[#FCFBF6] shadow-sm fira-sans text-[15px] leading-6`}
                                placeholder="Bairro*"
                                name="bairro"
                                value={userAddress.bairro}
                                onChange={onChange}
                            />
                            <input
                                className={`w-full h-[40px] px-2 rounded border ${addressTouched && !userAddress.cidade ? 'border-red-400' : 'border-[#CACFD4]'} bg-[#FCFBF6] shadow-sm fira-sans text-[15px] leading-6`}
                                placeholder="Cidade*"
                                name="cidade"
                                value={userAddress.cidade}
                                onChange={onChange}
                            />
                            <input
                                className={`w-full h-[40px] px-2 rounded border ${addressTouched && !userAddress.estado ? 'border-red-400' : 'border-[#CACFD4]'} bg-[#FCFBF6] shadow-sm fira-sans text-[15px] leading-6`}
                                placeholder="Estado*"
                                name="estado"
                                value={userAddress.estado}
                                onChange={onChange}
                            />
                        </form>
                        <div className="flex flex-col gap-3 w-full mt-auto">
                            <button
                                className="w-full h-10 rounded-[6px] px-4 flex items-center justify-center gap-3 font-medium text-[16px] leading-6 text-[#6D75C0] bg-[#F1F2F4] hover:bg-[#e6e8f5] transition"
                                onClick={onConcluirCadastro}
                                aria-label="Concluir cadastro"
                                style={{ verticalAlign: 'middle', opacity: 1 }}
                            >
                                Concluir cadastro
                            </button>
                            <button
                                className="w-full h-10 rounded-[6px] px-4 flex items-center justify-center gap-3 font-medium text-[16px] leading-6 text-[#6D75C0] bg-transparent hover:bg-[#f6f7fb] transition border border-[#F1F2F4]"
                                onClick={onClose}
                                aria-label="Cancelar"
                                type="button"
                                style={{ verticalAlign: 'middle', opacity: 1 }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


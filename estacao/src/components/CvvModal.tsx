"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface CvvModalProps {
    show: boolean;
    onClose: () => void;
}

export default function CvvModal({ show, onClose }: CvvModalProps) {
    // Fecha o modal ao pressionar ESC
    useEscapeKey(show, onClose);
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-transparent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="w-[95vw] max-w-[792px] h-auto md:w-[792px] md:h-[363px] bg-white relative flex flex-col p-0 rounded-[8px] shadow-lg"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                        {/* Header */}
                        <div className="w-full h-[56px] rounded-t-[8px] bg-[#8494E9] flex items-center justify-center relative px-4 md:px-8">
                            <h3 className="mx-auto font-medium text-[16px] leading-6 text-white text-center w-full">
                                O que é o CVV?
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
                        <div className="flex flex-col md:flex-row flex-1 w-full px-4 md:px-8 py-6 gap-4 md:gap-8 items-center">
                            {/* Texto à esquerda */}
                            <div className="w-full md:flex-1 flex flex-col justify-center mb-4 md:mb-0">
                                <p className="font-normal text-[14px] leading-6 text-[#49525A]">
                                    O CVV é um código de verificação do cartão que possui 3 ou 4 dígitos e geralmente ele fica impresso na parte de trás do cartão, ele serve como um mecanismo adicional de segurança para as transações online.
                                </p>
                            </div>
                            {/* Imagem à direita */}
                            <div className="w-full md:w-auto flex-shrink-0 flex items-center justify-center md:justify-end">
                                <Image
                                    src="/assets/icons/cvv-card.svg"
                                    alt="Onde fica o CVV"
                                    className="w-full max-w-[280px] h-auto md:h-[170px] object-contain"
                                    style={{ maxWidth: '100%', height: 'auto' }}
                                />
                            </div>
                        </div>
                        {/* Botão Fechar */}
                        <div className="flex justify-center items-center w-full px-4 md:px-8 pb-6">
                            <button
                                className="w-full md:w-[728px] h-[40px] rounded-[6px] px-4 flex items-center justify-center gap-3 font-medium text-[16px] leading-6 text-[#6D75C0] bg-[#F6F7FB] hover:bg-[#e6e8f5] transition"
                                onClick={onClose}
                                aria-label="Fechar"
                                style={{ verticalAlign: 'middle' }}
                            >
                                Fechar
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


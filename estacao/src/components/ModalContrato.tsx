"use client";

import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { asTrustedHTML } from "@/utils/trustedTypes";

interface ModalContratoProps {
    show: boolean;
    onClose: () => void;
    contratoUrl: string | null; 
    isLoading?: boolean;
    onConfirm: (assinatura: string | null, contratoHtml: string) => void;
    emitirLoading?: boolean;
}

const ModalContrato: React.FC<ModalContratoProps> = ({  
    show,
    onClose,
    contratoUrl,
    isLoading,
    onConfirm,
    emitirLoading,
}) => {
    // Fecha o modal ao pressionar ESC
    useEscapeKey(show, onClose);
    const contratoRef = useRef<HTMLDivElement>(null);
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [assinou, setAssinou] = useState(false);

    if (!show) return null;

    const handleClear = () => {
        sigCanvas.current?.clear();
        setAssinou(false);
    };

    const handleEndSignature = () => {
        if (!sigCanvas.current?.isEmpty()) {
            setAssinou(true);
        }
    };

    const handleConfirm = () => {
        const assinatura = sigCanvas.current?.isEmpty()
            ? null
            : sigCanvas.current?.toDataURL();
        const contratoHtml = contratoRef.current?.innerHTML || "";
        onConfirm(assinatura ?? null, contratoHtml);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4">
            <style dangerouslySetInnerHTML={{
                __html: asTrustedHTML(`
                    .contrato-content,
                    .contrato-content *,
                    .contrato-content p,
                    .contrato-content span,
                    .contrato-content div,
                    .contrato-content h1,
                    .contrato-content h2,
                    .contrato-content h3,
                    .contrato-content h4,
                    .contrato-content h5,
                    .contrato-content h6,
                    .contrato-content table,
                    .contrato-content th,
                    .contrato-content td,
                    .contrato-content li {
                        color: #1a1a1a !important;
                    }
                    .contrato-content b,
                    .contrato-content strong {
                        color: #000000 !important;
                        font-weight: bold !important;
                    }
                    .btn-confirmar-enviar {
                        color: #ffffff !important;
                        background-color: #8494E9 !important;
                    }
                    .btn-confirmar-enviar:hover {
                        background-color: #6c7ad1 !important;
                    }
                    .btn-confirmar-enviar span {
                        color: #ffffff !important;
                    }
                `)
            }} />
            <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[95vh] p-0 relative flex flex-col overflow-hidden">
                <button
                    className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-2xl cursor-pointer z-10"
                    onClick={onClose}
                    aria-label="Fechar"
                >
                    &times;
                </button>
                <h3 className="text-lg font-semibold mb-2 px-4 md:px-8 pt-8 text-center flex-shrink-0 text-gray-900">
                    CONTRATO DE PRESTAÇÃO DE SERVIÇOS
                </h3>
                
                <div className="flex-1 overflow-y-auto px-4 md:px-8">
                    <div
                        className="bg-white border border-gray-300 rounded-lg mb-4 p-4 md:p-8 overflow-y-auto"
                        style={{
                            fontFamily: "monospace",
                            maxHeight: "35vh",
                            boxShadow: "0 0 0 1px #e5e9fa",
                            color: "#1a1a1a",
                        }}
                        ref={contratoRef}
                    >
                        {isLoading ? (
                            <div className="text-center text-gray-600">
                                Carregando prévia do contrato...
                            </div>
                        ) : contratoUrl ? (
                            <div 
                                dangerouslySetInnerHTML={{ __html: asTrustedHTML(contratoUrl) }} 
                                className="contrato-content"
                                style={{
                                    color: "#1a1a1a",
                                }}
                            />
                        ) : (
                            <div className="text-center text-gray-600">
                                Não foi possível carregar a prévia do contrato.
                            </div>
                        )}
                    </div>

                    <div className="mb-4 space-y-4">
                        <div>
                            <p className="text-sm font-semibold mb-2 text-left">
                                Assine abaixo para confirmar:
                            </p>
                            <SignatureCanvas
                                ref={sigCanvas}
                                canvasProps={{
                                    className: "border border-gray-400 rounded w-full h-32",
                                }}
                                onEnd={handleEndSignature}
                            />
                            <button
                                type="button"
                                onClick={handleClear}
                                className="mt-2 px-4 py-1 bg-gray-200 hover:bg-gray-300 text-sm rounded"
                            >
                                Limpar assinatura
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 px-4 md:px-8 pb-4 md:pb-8 flex-shrink-0 border-t pt-4 bg-white">
                    <button
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 md:px-6 py-2 rounded transition-colors cursor-pointer text-sm md:text-base"
                        onClick={onClose}
                        disabled={emitirLoading}
                    >
                        Cancelar
                    </button>
                    <button
                        className={`font-bold px-4 md:px-6 py-2.5 rounded transition-colors cursor-pointer flex items-center gap-2 text-base md:text-lg ${
                            (!assinou || emitirLoading)
                                ? "bg-gray-300 cursor-not-allowed"
                                : "btn-confirmar-enviar"
                        }`}
                        style={(!assinou || emitirLoading) ? { 
                            backgroundColor: '#d1d5db',
                            color: '#9ca3af'
                        } : { 
                            color: '#ffffff',
                            backgroundColor: '#8494E9'
                        }}
                        onClick={handleConfirm}
                        disabled={!assinou || emitirLoading}
                    >
                        {emitirLoading ? (
                            <span className="animate-spin h-5 w-5 border-2 border-t-transparent rounded-full" style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }}></span>
                        ) : null}
                        <span style={{ color: (!assinou || emitirLoading) ? '#9ca3af' : '#ffffff' }}>Confirmar e Enviar</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalContrato;

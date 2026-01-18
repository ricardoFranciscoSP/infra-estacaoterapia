"use client";
import React, { useState, useRef, useEffect } from "react";
import { asTrustedHTML } from "@/utils/trustedTypes";

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const [mode, setMode] = useState<"visual" | "html">("visual");
    const editorRef = useRef<HTMLDivElement>(null);
    const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Sincroniza o conteúdo quando muda o modo
    useEffect(() => {
        if (mode === "visual" && editorRef.current) {
            editorRef.current.innerHTML = asTrustedHTML(value || "");
        } else if (mode === "html" && htmlTextareaRef.current) {
            htmlTextareaRef.current.value = value || "";
        }
    }, [mode, value]);

    const handleVisualChange = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        // Atualiza o visual também
        if (editorRef.current) {
            editorRef.current.innerHTML = asTrustedHTML(e.target.value);
        }
    };

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleVisualChange();
    };

    const insertHTML = (html: string) => {
        document.execCommand("insertHTML", false, html);
        editorRef.current?.focus();
        handleVisualChange();
    };

    const toolbarButtons = [
        {
            label: "Negrito",
            icon: "B",
            command: () => execCommand("bold"),
            className: "font-bold"
        },
        {
            label: "Itálico",
            icon: "I",
            command: () => execCommand("italic"),
            className: "italic"
        },
        {
            label: "Sublinhado",
            icon: "U",
            command: () => execCommand("underline"),
            className: "underline"
        },
        {
            label: "Tachado",
            icon: "S",
            command: () => execCommand("strikeThrough"),
            className: "line-through"
        },
        { separator: true },
        {
            label: "Lista não ordenada",
            icon: "•",
            command: () => execCommand("insertUnorderedList")
        },
        {
            label: "Lista ordenada",
            icon: "1.",
            command: () => execCommand("insertOrderedList")
        },
        { separator: true },
        {
            label: "Cabeçalho 1",
            icon: "H1",
            command: () => execCommand("formatBlock", "<h1>")
        },
        {
            label: "Cabeçalho 2",
            icon: "H2",
            command: () => execCommand("formatBlock", "<h2>")
        },
        {
            label: "Cabeçalho 3",
            icon: "H3",
            command: () => execCommand("formatBlock", "<h3>")
        },
        {
            label: "Parágrafo",
            icon: "P",
            command: () => execCommand("formatBlock", "<p>")
        },
        { separator: true },
        {
            label: "Alinhar à esquerda",
            icon: "◄",
            command: () => execCommand("justifyLeft")
        },
        {
            label: "Centralizar",
            icon: "⬌",
            command: () => execCommand("justifyCenter")
        },
        {
            label: "Alinhar à direita",
            icon: "►",
            command: () => execCommand("justifyRight")
        },
        { separator: true },
        {
            label: "Link",
            icon: "🔗",
            command: () => {
                const url = prompt("Digite a URL do link:");
                if (url) {
                    const text = window.getSelection()?.toString() || url;
                    insertHTML(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`);
                }
            }
        },
        {
            label: "Imagem",
            icon: "🖼️",
            command: () => {
                const url = prompt("Digite a URL da imagem:");
                if (url) {
                    const alt = prompt("Texto alternativo (alt):") || "";
                    insertHTML(`<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto;" />`);
                }
            }
        },
        { separator: true },
        {
            label: "Desfazer",
            icon: "↶",
            command: () => execCommand("undo")
        },
        {
            label: "Refazer",
            icon: "↷",
            command: () => execCommand("redo")
        },
        {
            label: "Limpar formatação",
            icon: "✕",
            command: () => execCommand("removeFormat")
        }
    ];

    return (
        <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
            {/* Toolbar */}
            <div className="bg-gray-50 border-b border-gray-300 px-4 py-2 flex items-center gap-1 flex-wrap">
                {/* Botão de alternar modo */}
                <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300">
                    <button
                        type="button"
                        onClick={() => setMode("visual")}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                            mode === "visual"
                                ? "bg-[#8494E9] text-white"
                                : "bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                        title="Visual"
                    >
                        Visual
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("html")}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                            mode === "html"
                                ? "bg-[#8494E9] text-white"
                                : "bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                        title="HTML"
                    >
                        HTML
                    </button>
                </div>

                {/* Botões da toolbar (apenas no modo visual) */}
                {mode === "visual" && toolbarButtons.map((btn, idx) => {
                    if ("separator" in btn) {
                        return <div key={`sep-${idx}`} className="w-px h-6 bg-gray-300 mx-1" />;
                    }
                    return (
                        <button
                            key={idx}
                            type="button"
                            onClick={btn.command}
                            className={`px-2 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors ${btn.className || ""}`}
                            title={btn.label}
                        >
                            {btn.icon}
                        </button>
                    );
                })}
            </div>

            {/* Área de edição */}
            {mode === "visual" ? (
                <div className="relative">
                    <div
                        ref={editorRef}
                        contentEditable
                        onInput={handleVisualChange}
                        onBlur={handleVisualChange}
                        className="min-h-[300px] max-h-[500px] overflow-y-auto px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
                        style={{
                            wordWrap: "break-word",
                            whiteSpace: "pre-wrap"
                        }}
                        data-placeholder={placeholder || "Digite o conteúdo aqui..."}
                        suppressContentEditableWarning
                    />
                </div>
            ) : (
                <textarea
                    ref={htmlTextareaRef}
                    value={value}
                    onChange={handleHtmlChange}
                    className="w-full min-h-[300px] max-h-[500px] px-4 py-3 border-0 focus:outline-none focus:ring-2 focus:ring-[#8494E9] resize-none font-mono text-sm"
                    placeholder={placeholder || "Digite ou cole o HTML aqui..."}
                    spellCheck={false}
                />
            )}
        </div>
    );
}

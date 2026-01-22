"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { obterPrimeiroUltimoNome } from "@/utils/nomeUtils";
import { getContextualAvatar, isPsicologoPanel } from "@/utils/avatarUtils";
import { formatarDataCompleta } from "@/utils/consultaUtils";
import { onConsultationStarted, ensureSocketConnection, getSocket } from "@/lib/socket";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useCheckTokens } from "@/hooks/useCheckTokens";
import Image from "next/image";
import toast from "react-hot-toast";

interface PessoaConsulta {
    nome: string;
    avatarUrl?: string;
    Url?: string; // compatibilidade
}

export interface ConsultaModalProps {
    open: boolean;
    onClose: () => void;
    consulta: {
        data: string;
        horario: string;
        paciente?: PessoaConsulta;
        psicologo: PessoaConsulta;
    };
    botaoEntrarDesabilitado?: boolean;
    consultaId?: string | number; // ID da consulta para navegação
    sessaoAtiva?: boolean; // novo prop para indicar se o contador da sessão foi disparado
    statusCancelamento?: string | null; // status de cancelamento
    status?: string | null; // status da consulta (ex: "Disponivel", "Reservado", etc)
    onAbrirCancelar?: (consultaId?: string | number) => void; // nova prop para abrir modal de cancelamento
}

/**
 * Modal unificado de consulta para desktop e mobile
 * Detecta automaticamente o tamanho da tela e renderiza a versão apropriada
 */
export default function ConsultaModal({
    open,
    onClose,
    consulta,
    botaoEntrarDesabilitado,
    consultaId,
    sessaoAtiva,
    statusCancelamento,
    onAbrirCancelar,
}: ConsultaModalProps) {
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);
    const { checkAndGenerateTokens, isLoading: isCheckingTokens } = useCheckTokens();
    const [isProcessingEntry, setIsProcessingEntry] = useState(false);
    const [now, setNow] = useState(() => new Date());

    // Handler para cancelar consulta
    const handleCancelarConsulta = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        const debugInfo = {
            onAbrirCancelar: !!onAbrirCancelar,
            onAbrirCancelarType: typeof onAbrirCancelar,
            consultaId,
            consultaData: consulta.data,
            consultaHorario: consulta.horario,
            timestamp: new Date().toISOString()
        };
        
        console.log('[ConsultaModal] handleCancelarConsulta chamado', debugInfo);
        
        if (!onAbrirCancelar) {
            console.error('[ConsultaModal] onAbrirCancelar não foi passado como prop', debugInfo);
            console.error('[ConsultaModal] Props recebidos:', { open, consultaId, statusCancelamento });
            console.warn('[ConsultaModal] Verifique se a página (consultas/page.tsx) está passando o prop onAbrirCancelar para ConsultaModal');
            toast.error('Erro: função de cancelamento não disponível. Por favor, recarregue a página.');
            return;
        }
        
        console.log('[ConsultaModal] Chamando onAbrirCancelar com consultaId:', consultaId);
        try {
            onAbrirCancelar(consultaId);
            console.log('[ConsultaModal] onAbrirCancelar executado com sucesso');
        } catch (error) {
            console.error('[ConsultaModal] Erro ao chamar onAbrirCancelar:', error);
            toast.error('Erro ao abrir modal de cancelamento. Por favor, tente novamente.');
        }
    };

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        if (!open) return;
        setNow(new Date());
        const interval = setInterval(() => {
            setNow(new Date());
        }, 10000);
        return () => clearInterval(interval);
    }, [open]);

    // Fecha o modal ao pressionar ESC (funciona no Mac também)
    useEscapeKey(open, onClose);

    // Escuta eventos de socket para detectar quando a sessão inicia em tempo real
    // (mantém para casos de início manual, mas não interfere na lógica do botão)
    useEffect(() => {
        if (!consultaId || !open) return;

        ensureSocketConnection();
        onConsultationStarted(() => {
            // Handler vazio - apenas escuta o evento
        }, String(consultaId));

        return () => {
            const socket = getSocket();
            if (socket) {
                socket.off(`consultation:${consultaId}`);
            }
        };
    }, [consultaId, open]);

    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    const isInPsicologoPanel = isPsicologoPanel(pathname);


    // O botão só é habilitado se a sessão estiver ativa (contador disparado) e não estiver desabilitado por outro motivo
    const habilitarEntrar = !!sessaoAtiva && !botaoEntrarDesabilitado;

    // Verifica se o horário da consulta já passou
    const horarioPassou = React.useMemo(() => {
        if (!consulta.data || !consulta.horario) return false;
        
        try {
            // Parse da data e horário
            let dataObj: Date | null = null;
            const dataStr = consulta.data.includes('T') ? consulta.data.split('T')[0] : consulta.data.split(' ')[0];
            const horarioStr = consulta.horario;
            
            if (dataStr && horarioStr) {
                const [ano, mes, dia] = dataStr.split("-");
                const [hora, minuto] = horarioStr.split(":");
                
                if (ano && mes && dia && hora && minuto) {
                    // Cria data no timezone local
                    dataObj = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));
                    
                    // Adiciona 1 hora para considerar o fim da consulta
                    const fimConsulta = new Date(dataObj.getTime() + (60 * 60 * 1000));
                    const agora = new Date();
                    
                    // Verifica se já passou o horário (fim da consulta + 1 hora)
                    return agora > fimConsulta;
                }
            }
        } catch (error) {
            console.error('Erro ao verificar se horário passou:', error);
        }
        
        return false;
    }, [consulta.data, consulta.horario]);

    const handleEntrarNaConsulta = async () => {
        if (!habilitarEntrar || !consultaId) return;
        
        try {
            setIsProcessingEntry(true);
            console.log(`[handleEntrarNaConsulta Modal] Iniciando acesso à consulta: ${consultaId}`);

            // Verifica e gera tokens se necessário
            const tokensResult = await checkAndGenerateTokens(String(consultaId));

            if (!tokensResult) {
                console.error('[handleEntrarNaConsulta Modal] Falha ao verificar tokens');
                return;
            }

            // Verifica se ambos os tokens existem
            if (!tokensResult.patientTokenExists || !tokensResult.psychologistTokenExists) {
                console.error('[handleEntrarNaConsulta Modal] Tokens não estão disponíveis');
                return;
            }

            console.log('[handleEntrarNaConsulta Modal] Tokens verificados com sucesso, navegando para sessão');
            router.push(`/painel/sessao/${consultaId}`);
        } catch (error) {
            console.error('[handleEntrarNaConsulta Modal] Erro ao acessar consulta:', error);
        } finally {
            setIsProcessingEntry(false);
        }
    };

    const avatarUrl = getContextualAvatar(
        isInPsicologoPanel,
        consulta.psicologo,
        consulta.paciente
    );

    const nomePessoa = obterPrimeiroUltimoNome(
        (isInPsicologoPanel ? consulta.paciente?.nome : consulta.psicologo.nome) ||
            (consulta.paciente?.nome ?? consulta.psicologo.nome)
    ) || (consulta.paciente?.nome ?? consulta.psicologo.nome);

    // Garante que a data seja formatada corretamente, usando a mesma fonte que o card
    // Se a data vier em formato ISO ou com timezone, extrai apenas a parte da data
    const dataParaFormatar = consulta.data ? (consulta.data.includes('T') ? consulta.data.split('T')[0] : consulta.data.split(' ')[0]) : "";
    const dataFormatada = formatarDataCompleta(dataParaFormatar || consulta.data);
    const statusCancelamentoValue = useMemo(() => {
        return String(statusCancelamento || status || "").toLowerCase();
    }, [statusCancelamento, status]);

    const isCancelada = useMemo(() => {
        if (!statusCancelamentoValue) return false;
        return statusCancelamentoValue.includes("cancel") || statusCancelamentoValue === "deferido";
    }, [statusCancelamentoValue]);

    const motivoCancelamento = useMemo(() => {
        if (!isCancelada) return "";
        if (statusCancelamentoValue.includes("patient") || statusCancelamentoValue.includes("paciente")) {
            return "Cancelada por ausência do paciente.";
        }
        if (statusCancelamentoValue.includes("psychologist") || statusCancelamentoValue.includes("psicologo")) {
            return "Cancelada por ausência do psicólogo.";
        }
        return "Consulta cancelada.";
    }, [isCancelada, statusCancelamentoValue]);

    const cancelamentoBloqueado = useMemo(() => {
        if (isCancelada) return true;
        if (!dataParaFormatar || !consulta.horario) return false;
        const [ano, mes, dia] = dataParaFormatar.split("-");
        const [hora, minuto] = consulta.horario.split(":");
        if (!ano || !mes || !dia || !hora || !minuto) return false;
        const inicioSessao = new Date(
            Number(ano),
            Number(mes) - 1,
            Number(dia),
            Number(hora),
            Number(minuto),
            0,
            0
        );
        if (Number.isNaN(inicioSessao.getTime())) return false;
        return now.getTime() >= inicioSessao.getTime() + 10 * 60 * 1000;
    }, [consulta.horario, dataParaFormatar, isCancelada, now]);

    // Versão Mobile
    if (isMobile) {
        return (
            <AnimatePresence mode="wait">
                {open && (
                    <motion.div
                        key="mobile-modal"
                        className="fixed inset-0 bg-white z-50 sm:hidden flex flex-col"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                    {/* Header Mobile */}
                    <div className={`relative flex flex-col items-center p-4 border-b border-[#E3E4F3] ${
                        isInPsicologoPanel ? "bg-[#232A5C]" : "bg-[#8494E9]"
                    }`}>
                        <button
                            onClick={onClose}
                            className="absolute right-4 top-4 text-xl font-bold text-white hover:text-gray-200 transition"
                            aria-label="Fechar"
                        >
                            ×
                        </button>
                        <span className="text-white text-base font-semibold mb-2 text-center">
                            Detalhes da consulta
                        </span>
                    </div>

                    {/* Conteúdo do modal */}
                    <div className="p-4 flex-1 flex flex-col overflow-y-auto text-gray-800 text-sm leading-relaxed">
                        <span className="block text-base font-semibold text-gray-800 mb-4 text-center">
                            Detalhes da consulta
                        </span>

                        <div className="flex flex-col items-start mb-4">
                            <div className="flex items-center gap-3 w-full">
                                <Image
                                    src={avatarUrl}
                                    className="w-12 h-12 rounded-full object-cover"
                                    alt="Avatar"
                                    width={48}
                                    height={48}
                                />
                                <div className="flex flex-col justify-center h-12">
                                    <p className="font-semibold">{nomePessoa}</p>
                                </div>
                            </div>

                            {/* Data e horário */}
                            <div className="mt-2 text-left">
                                <p className="font-normal text-[12px] leading-[16px] text-[#606C76] align-middle">
                                    <span className="font-bold">Dia:</span> {dataFormatada}
                                </p>
                                <p className="font-normal text-[14px] leading-[16px] text-[#606C76] align-middle">
                                    <span className="font-bold">Horário:</span> {consulta.horario}
                                </p>
                            </div>
                        </div>

                        {/* Alerta ou motivo de cancelamento */}
                        {isCancelada ? (
                            <div className="bg-red-100 text-red-800 px-3 py-2 rounded-md mb-6 text-sm font-medium">
                                <span>Consulta cancelada.</span>
                                <br />
                                <span>{motivoCancelamento}</span>
                            </div>
                        ) : (
                            <div className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-md mb-6 text-sm font-medium">
                                ⚠️ Informações importantes!
                            </div>
                        )}

                        {!isCancelada && (
                            <p className="font-normal text-[14px] leading-[16px] text-[#606C76] align-middle">
                                Caso precise reagendar ou cancelar sua consulta, se possível efetue com uma antecedência
                                maior a 24 horas da mesma, caso contrário ela será cobrada normalmente.
                            </p>
                        )}

                        <div className="flex-grow" />

                                                {/* Botões: Cancelar e Entrar lado a lado, Fechar abaixo */}
                                                {!isCancelada && !horarioPassou && (
                                                    <div className="flex gap-4 w-full mb-2">
                                                        {/* Botão Cancelar - sempre visível se onAbrirCancelar estiver disponível */}
                                                        {onAbrirCancelar && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    if (cancelamentoBloqueado) return;
                                                                    console.log('[ConsultaModal] Botão Cancelar clicado (mobile)');
                                                                    handleCancelarConsulta(e);
                                                                }}
                                                                aria-label="Cancelar consulta"
                                                                disabled={cancelamentoBloqueado}
                                                                className={`w-1/2 h-10 rounded-[6px] fira-sans border font-medium text-base transition ${
                                                                    cancelamentoBloqueado
                                                                        ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                                                                        : "border-[#6D75C0] text-[#6D75C0] bg-white hover:bg-[#E6E9FF] cursor-pointer"
                                                                }`}
                                                            >
                                                                Cancelar consulta
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={handleEntrarNaConsulta}
                                                            disabled={!habilitarEntrar || !consultaId || isCheckingTokens || isProcessingEntry}
                                                            className={`${onAbrirCancelar ? 'w-1/2' : 'w-full'} h-10 rounded-[6px] fira-sans font-medium text-base transition ${
                                                                habilitarEntrar && consultaId && !isCheckingTokens && !isProcessingEntry
                                                                    ? "bg-[#8494E9] hover:bg-[#6D75C0] text-white cursor-pointer"
                                                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                                            }`}
                                                        >
                                                            {isCheckingTokens || isProcessingEntry ? "Preparando..." : "Entrar na consulta"}
                                                        </button>
                                                    </div>
                                                )}
                                                {/* Botões quando consulta cancelada ou horário passou */}
                                                {(isCancelada || horarioPassou) && (
                                                    <div className="flex gap-4 w-full mb-2">
                                                        {/* Botão Cancelar - sempre visível se onAbrirCancelar estiver disponível */}
                                                        {onAbrirCancelar && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    if (cancelamentoBloqueado) return;
                                                                    console.log('[ConsultaModal] Botão Cancelar clicado (mobile - após horário/cancelada)');
                                                                    handleCancelarConsulta(e);
                                                                }}
                                                                aria-label="Cancelar consulta"
                                                                disabled={cancelamentoBloqueado}
                                                                className={`w-1/2 h-10 rounded-[6px] fira-sans border font-medium text-base transition ${
                                                                    cancelamentoBloqueado
                                                                        ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                                                                        : "border-[#6D75C0] text-[#6D75C0] bg-white hover:bg-[#E6E9FF] cursor-pointer"
                                                                }`}
                                                            >
                                                                Cancelar consulta
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={onClose}
                                                            className={`${onAbrirCancelar ? 'w-1/2' : 'w-full'} h-10 rounded-[6px] fira-sans border border-[#6D75C0] text-[#6D75C0] font-medium text-base bg-white hover:bg-[#E6E9FF] transition`}
                                                        >
                                                            Fechar
                                                        </button>
                                                    </div>
                                                )}
                                                {/* Botão Fechar - sempre visível quando horário passou ou consulta cancelada */}
                                                {(!isCancelada && horarioPassou) && (
                                                    <button
                                                        onClick={onClose}
                                                        className="w-full h-10 rounded-[6px] fira-sans border border-[#6D75C0] text-[#6D75C0] font-medium text-base bg-white hover:bg-[#E6E9FF] transition"
                                                    >
                                                        Fechar
                                                    </button>
                                                )}
                                                {/* Botão Fechar abaixo, sem borda - quando não passou o horário */}
                                                {!isCancelada && !horarioPassou && (
                                                    <button
                                                        onClick={onClose}
                                                        className="w-full mt-1 text-[#6D75C0] font-medium text-base bg-transparent border-none shadow-none hover:underline focus:outline-none"
                                                        style={{ border: 'none', background: 'none', boxShadow: 'none' }}
                                                    >
                                                        Fechar
                                                    </button>
                                                )}
                                                {/* Suporte se cancelada */}
                                                {isCancelada && (
                                                    <button
                                                        onClick={() => window.open(`https://wa.me/5511960892131?text=${encodeURIComponent('Olá, preciso de suporte técnico na Estação Terapia. Minha consulta foi cancelada.')}`, "_blank")}
                                                        className="w-full h-10 rounded-[6px] fira-sans font-medium text-base bg-[#25D366] hover:bg-[#128C7E] text-white cursor-pointer"
                                                    >
                                                        Fale com o Suporte
                                                    </button>
                                                )}
                    </div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    // Versão Desktop
    return (
        <AnimatePresence mode="wait">
            {open && (
                <motion.div
                    key="desktop-modal"
                    className="fixed inset-0 z-50 hidden sm:flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="w-[588px] h-[460px] bg-white rounded-[8px] shadow-lg flex flex-col"
                    >
                {/* Header */}
                <div className={`w-full h-[56px] flex items-center justify-center relative rounded-t-[8px] ${
                    isInPsicologoPanel ? "bg-[#232A5C]" : "bg-[#8494E9]"
                }`}>
                    <span className="text-white text-lg font-semibold mx-auto">
                        Detalhes da consulta
                    </span>
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-white hover:text-gray-200 transition"
                        aria-label="Fechar"
                    >
                        ×
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <Image
                                src={avatarUrl}
                                className="w-16 h-16 rounded-full object-cover"
                                width={64}
                                height={64}
                                alt="Avatar"
                            />
                            <div>
                                <p className="font-semibold text-lg">{nomePessoa}</p>
                                <p className="font-medium text-[14px] leading-[24px] text-[#49525A] align-middle">
                                    <span className="font-bold">Dia:</span> {dataFormatada}
                                </p>
                                <p className="font-medium text-[14px] leading-[24px] text-[#49525A] align-middle">
                                    <span className="font-bold">Horário:</span> {consulta.horario}
                                </p>
                            </div>
                        </div>

                        {/* Alerta ou motivo de cancelamento */}
                        {isCancelada ? (
                            <div className="bg-red-100 text-red-800 px-3 py-2 rounded-md mb-4 text-base font-medium">
                                <span>Consulta cancelada.</span>
                                {motivoCancelamento && motivoCancelamento !== "Consulta cancelada." && (
                                    <>
                                        <br />
                                        <span>{motivoCancelamento}</span>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="bg-[#FFEDB3] text-yellow-800 px-3 py-2 rounded-md mb-4 text-base font-medium">
                                ⚠️ Informações importantes!
                            </div>
                        )}

                        {!isCancelada && (
                            <p className="font-normal text-[14px] leading-[24px] text-[#606C76] align-middle">
                                Caso precise reagendar ou cancelar sua consulta, se possível efetue com uma antecedência
                                maior a 24 horas da mesma, caso contrário ela será cobrada normalmente.
                            </p>
                        )}
                    </div>

                                        {/* Botões: Cancelar e Entrar lado a lado, Fechar abaixo (desktop) */}
                                        {!isCancelada && !horarioPassou && (
                                            <>
                                                <div className="flex gap-4 mt-6 w-full">
                                                    {/* Botão Cancelar - sempre visível se onAbrirCancelar estiver disponível */}
                                                    {onAbrirCancelar && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                if (cancelamentoBloqueado) return;
                                                                console.log('[ConsultaModal] Botão Cancelar clicado (desktop)');
                                                                handleCancelarConsulta(e);
                                                            }}
                                                            aria-label="Cancelar consulta"
                                                            disabled={cancelamentoBloqueado}
                                                            className={`w-1/2 h-10 rounded-[6px] border font-medium text-base transition ${
                                                                cancelamentoBloqueado
                                                                    ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                                                                    : "border-[#6D75C0] text-[#6D75C0] bg-white hover:bg-[#E6E9FF] cursor-pointer"
                                                            }`}
                                                        >
                                                            Cancelar consulta
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={handleEntrarNaConsulta}
                                                        disabled={!habilitarEntrar || !consultaId || isCheckingTokens || isProcessingEntry}
                                                        className={`${onAbrirCancelar ? 'w-1/2' : 'w-full'} h-10 rounded-[6px] font-medium text-base transition ${
                                                            habilitarEntrar && consultaId && !isCheckingTokens && !isProcessingEntry
                                                                ? "bg-[#8494E9] hover:bg-[#6D75C0] text-white cursor-pointer"
                                                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                                        }`}
                                                    >
                                                        {isCheckingTokens || isProcessingEntry ? "Preparando..." : "Entrar na consulta"}
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={onClose}
                                                    className="w-full mt-2 text-[#6D75C0] font-medium text-base bg-transparent border-none shadow-none hover:underline focus:outline-none"
                                                    style={{ border: 'none', background: 'none', boxShadow: 'none' }}
                                                >
                                                    Fechar
                                                </button>
                                            </>
                                        )}
                                        {/* Botões quando consulta cancelada ou horário passou (desktop) */}
                                        {(isCancelada || horarioPassou) && (
                                            <div className="flex gap-4 mt-6 w-full">
                                                {/* Botão Cancelar - sempre visível se onAbrirCancelar estiver disponível */}
                                                {onAbrirCancelar && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            if (cancelamentoBloqueado) return;
                                                            console.log('[ConsultaModal] Botão Cancelar clicado (desktop - após horário/cancelada)');
                                                            handleCancelarConsulta(e);
                                                        }}
                                                        aria-label="Cancelar consulta"
                                                        disabled={cancelamentoBloqueado}
                                                        className={`w-1/2 h-10 rounded-[6px] border font-medium text-base transition ${
                                                            cancelamentoBloqueado
                                                                ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                                                                : "border-[#6D75C0] text-[#6D75C0] bg-white hover:bg-[#E6E9FF] cursor-pointer"
                                                        }`}
                                                    >
                                                        Cancelar consulta
                                                    </button>
                                                )}
                                                <button
                                                    onClick={onClose}
                                                    className={`${onAbrirCancelar ? 'w-1/2' : 'w-full'} h-10 rounded-[6px] border border-[#6D75C0] text-[#6D75C0] font-medium text-base bg-white hover:bg-[#E6E9FF] transition`}
                                                >
                                                    Fechar
                                                </button>
                                            </div>
                                        )}
                                        {/* Suporte se cancelada */}
                                        {isCancelada && (
                                            <button
                                                onClick={() => window.open(`https://wa.me/5511960892131?text=${encodeURIComponent('Olá, preciso de suporte técnico na Estação Terapia. Minha consulta foi cancelada.')}`, "_blank")}
                                                className="w-full h-10 rounded-[6px] font-medium text-base bg-[#25D366] hover:bg-[#128C7E] text-white cursor-pointer"
                                            >
                                                Fale com o Suporte
                                            </button>
                                        )}
                </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

"use client";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import useAgendamentoStore from "@/store/agendamentoStore";
import { formatarData } from "@/utils/formatDate";
import { getAvatarUrl } from "@/utils/avatarUtils";
import Image from "next/image";
import { toast } from "@/components/CustomToastProvider";
import { fetchConsultasAgendadas, fetchConsultasFuturas } from "@/store/consultasStore";
import type { Futuras } from "@/types/consultasTypes";
import type { AxiosErrorResponse } from "@/types/axiosError.types";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  psicologo: {
    Nome: string;
    AvatarUrl: string;
    Data: string;
    Horario: string;
    Id: string;
  };
  psicologoAgendaId: string;
  source?: string;
};

const cards = [
  {
    id: "alone",
    icon: "/icons/alone.svg",
    text: "Na hora da sessão esteja sozinho(a) e em um lugar silencioso",
  },
  {
    id: "headset",
    icon: "/icons/headset.svg",
    text: "Use fones de ouvido para ter um bom áudio e mais privacidade",
  },
  {
    id: "wifi",
    icon: "/icons/wifi.svg",
    text: "Garanta na sessão que sua internet esteja boa e funcionando",
  },
  {
    id: "exclamation",
    icon: "/icons/exclamation-triangle.svg",
    text: "Você será lembrado da sua sessão quando estiver próxima",
  },
  {
    id: "car",
    icon: "/icons/car_block.svg",
    text: "Para sua segurança não será permitido sessões no carro ou trânsito",
  },
  {
    id: "timer",
    icon: "/icons/timer.svg",
    text: "Todos os horários das sessões seguem o fuso horário de Brasília",
  },
  {
    id: "calendar",
    icon: "/icons/calendar_block.svg",
    text: "Cancele ou reagende sua sessão com até 24 horas de antecedência",
  },
  {
    id: "lap",
    icon: "/icons/lap-timer-white.svg",
    text: "A tolerância máxima para atrasos é de até 10 minutos",
  },
];

export default function ModalCadastroAgendamento({
  open,
  onClose,
  onConfirm,
  psicologo,
  psicologoAgendaId,
  source,
}: Props) {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const criarAgendamento = useAgendamentoStore((state) => state.criarAgendamento);

  // Usa a função utilitária para garantir que sempre haverá um avatar
  const safeAvatarUrl = getAvatarUrl({ avatarUrl: psicologo.AvatarUrl });

  // Normaliza data para formato YYYY-MM-DD
  function normalizarData(data: string) {
    // Aceita formatos dd/mm/yyyy ou ISO (yyyy-mm-dd...)
    if (!data) return "";
    if (data.includes("/")) {
      const [dd, mm, yyyy] = data.split("/");
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    // ISO
    return data.slice(0, 10);
  }

  type ConsultaLike = {
    Agenda?: { Data?: string; Horario?: string };
    agenda?: { data?: string; horario?: string };
    Date?: string;
    date?: string;
    Time?: string;
    time?: string;
  };

  async function existeConflitoPeriodo50Minutos(dataBR: string, hora: string): Promise<{ conflito: boolean; consultaConflito?: { data: string; hora: string } }> {
    try {
      const ymdSelecionado = normalizarData(dataBR);
      const horaSelecionada = (hora || "").slice(0, 5);
      const duracaoConsultaMin = 50; // Duração padrão de 50 minutos

      // Busca consultas já agendadas/futuras do paciente
      const [agendadas, futuras] = await Promise.allSettled([
        fetchConsultasAgendadas(),
        fetchConsultasFuturas(),
      ]);

      const consultas: ConsultaLike[] = [];

      if (agendadas.status === "fulfilled") {
        const arr = (agendadas.value as Futuras[] | null) ?? [];
        for (const bloco of arr) {
          const futurasArr = bloco?.futuras ?? [];
          if (Array.isArray(futurasArr)) {
            for (const consulta of futurasArr) {
              if (consulta && typeof consulta === 'object') {
                consultas.push(consulta as ConsultaLike);
              }
            }
          }
        }
      }

      if (futuras.status === "fulfilled" && futuras.value) {
        const f = futuras.value as Futuras;
        if (Array.isArray(f?.futuras)) {
          for (const consulta of f.futuras) {
            if (consulta && typeof consulta === 'object') {
              consultas.push(consulta as ConsultaLike);
            }
          }
        }
        if (f?.consultaAtual?.consultaAtual && typeof f.consultaAtual.consultaAtual === 'object') {
          consultas.push(f.consultaAtual.consultaAtual as ConsultaLike);
        }
      }

      // Cria data/hora da nova consulta no timezone de São Paulo
      const novaConsultaInicio = dayjs.tz(
        `${ymdSelecionado} ${horaSelecionada}:00`,
        'YYYY-MM-DD HH:mm:ss',
        'America/Sao_Paulo'
      );
      const novaConsultaFim = novaConsultaInicio.add(duracaoConsultaMin, 'minute');

      if (!novaConsultaInicio.isValid()) {
        return { conflito: false };
      }

      // Verifica conflitos considerando 50 minutos antes e depois de cada consulta existente
      const consultaConflito = consultas.find((c: ConsultaLike) => {
        const dataApi = c?.Agenda?.Data || c?.agenda?.data || c?.Date || c?.date;
        const horaApi = c?.Agenda?.Horario || c?.agenda?.horario || c?.Time || c?.time;
        if (!dataApi || !horaApi) return false;

        const ymdApi = normalizarData(String(dataApi));
        const horaApiNorm = String(horaApi).slice(0, 5);

        // Cria data/hora da consulta existente
        const inicioConsultaExistente = dayjs.tz(
          `${ymdApi} ${horaApiNorm}:00`,
          'YYYY-MM-DD HH:mm:ss',
          'America/Sao_Paulo'
        );
        const fimConsultaExistente = inicioConsultaExistente.add(duracaoConsultaMin, 'minute');

        if (!inicioConsultaExistente.isValid()) return false;

        // Janela de conflito: 50 minutos antes do início até 50 minutos depois do fim
        const inicioJanelaConflito = inicioConsultaExistente.subtract(50, 'minute');
        const fimJanelaConflito = fimConsultaExistente.add(50, 'minute');

        // Verifica se a nova consulta (início ou fim) está dentro da janela de conflito
        const inicioDentro = novaConsultaInicio.isSameOrAfter(inicioJanelaConflito) && novaConsultaInicio.isBefore(fimJanelaConflito);
        const fimDentro = novaConsultaFim.isAfter(inicioJanelaConflito) && novaConsultaFim.isSameOrBefore(fimJanelaConflito);
        const englobaCompleto = novaConsultaInicio.isBefore(inicioJanelaConflito) && novaConsultaFim.isAfter(fimJanelaConflito);

        return inicioDentro || fimDentro || englobaCompleto;
      });

      if (consultaConflito) {
        const dataApi = consultaConflito?.Agenda?.Data || consultaConflito?.agenda?.data || consultaConflito?.Date || consultaConflito?.date;
        const horaApi = consultaConflito?.Agenda?.Horario || consultaConflito?.agenda?.horario || consultaConflito?.Time || consultaConflito?.time;
        return {
          conflito: true,
          consultaConflito: {
            data: dataApi ? dayjs(dataApi).format('DD/MM/YYYY') : '',
            hora: horaApi ? String(horaApi).slice(0, 5) : ''
          }
        };
      }

      return { conflito: false };
    } catch (error) {
      console.error('[existeConflitoPeriodo50Minutos] Erro ao verificar conflito:', error);
      // Em caso de erro na verificação, por segurança não bloqueamos aqui; o back deve validar também
      return { conflito: false };
    }
  }

  const handleConfirm = async () => {
    // 🔒 PROTEÇÃO: Evita múltiplos cliques simultâneos
    if (loading) {
      console.warn('[ModalCadastroAgendamento] Tentativa de confirmar agendamento enquanto já está em processamento');
      return;
    }
    
    setLoading(true);
    try {
      // 1) Checagem preventiva de conflito: verifica se há consulta dentro de 50 minutos antes ou depois
      const resultadoConflito = await existeConflitoPeriodo50Minutos(psicologo.Data, psicologo.Horario);
      if (resultadoConflito.conflito && resultadoConflito.consultaConflito) {
        toast.error(
          `Você já possui uma consulta agendada no dia ${resultadoConflito.consultaConflito.data} às ${resultadoConflito.consultaConflito.hora}. Não é possível marcar uma consulta dentro do período de 50 minutos antes ou depois de uma consulta já agendada.`
        );
        setLoading(false);
        return;
      }

      // 2) Prossegue com criação do agendamento (o backend deve manter a mesma validação)
      // IMPORTANTE: O backend deve debitar APENAS 1 consulta por reserva
      // Se o backend estiver debitando todas as consultas, isso é um bug no backend
      if (psicologoAgendaId) {
        console.log('[ModalCadastroAgendamento] Criando agendamento para ID:', psicologoAgendaId);
        try {
          await criarAgendamento(psicologoAgendaId);
          console.log('[ModalCadastroAgendamento] Agendamento criado com sucesso');
        } catch (error: unknown) {
          // Trata erro de conflito do backend
          const axiosError = error as AxiosErrorResponse;
          const errorMessage = axiosError?.response?.data?.message || (error instanceof Error ? error.message : 'Erro ao criar agendamento');
          if (errorMessage.includes('50 minutos') || errorMessage.includes('período')) {
            toast.error(errorMessage);
            setLoading(false);
            return;
          }
          throw error; // Re-lança outros erros
        }
      }
      await Promise.resolve(onConfirm?.());
      
      // Toast de sucesso
      toast.success("Agendamento realizado com sucesso! Em breve sua consulta ficará visível em seu painel.");
      
      // Se veio do agendamento rápido, fecha o popup principal
      if (source === "agendamento-rapido") {
        window.dispatchEvent(new CustomEvent("close-agendamento-rapido"));
      }
      setTimeout(() => {
        setLoading(false);
        router.push("/painel");
      }, 1500);
    } catch (err) {
      console.error("[ModalCadastroAgendamento] Erro ao confirmar agendamento:", err);
      // Tenta identificar o tipo de erro vindo do backend
      const errObj = err as { response?: { data?: { message?: string; error?: string }; status?: number }; message?: string };
      const msg = errObj?.response?.data?.message || errObj?.response?.data?.error || errObj?.message;
      
      // Verifica se é erro de processamento duplicado
      if (msg && /já existe.*processando|aguarde/i.test(String(msg))) {
        toast.error("Aguarde o processamento do agendamento anterior.");
      }
      // Verifica se é erro de saldo insuficiente (apenas se a mensagem mencionar saldo explicitamente)
      else if (msg && /saldo|saldo de consultas|não possui saldo|não possui consultas disponíveis|consultas disponível/i.test(String(msg))) {
        toast.error(
          <span>
            Você não possui saldo de consultas disponível.<br/>
            Para agendar uma nova consulta, é necessário adquirir um plano ou consulta avulsa.<br/>
            <a href="/painel/planos" style={{ color: '#6D75C0', textDecoration: 'underline', cursor: 'pointer' }}>
              Clique aqui para comprar
            </a>
          </span>,
          {
            duration: 10000,
          }
        );
      } 
      // Verifica se é conflito de horário
      else if (msg && /conflit|conflito|mesmo horário|já possui/i.test(String(msg))) {
        toast.error("Não foi possível agendar: já existe uma consulta nesse horário.");
      } 
      // Erro genérico
      else {
        toast.error("Não foi possível concluir o agendamento. Tente novamente.");
      }
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {/* Modal Desktop */}
      {open && (
        <motion.div
          key="modal-desktop"
          className="fixed inset-0 z-50 items-center justify-center bg-[#F2F4FD]/80 hidden sm:flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="relative bg-white rounded-[8px] shadow-lg flex flex-col w-[792px] h-[568px] opacity-100"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="w-full h-[56px] rounded-tl-[8px] rounded-tr-[8px] bg-[#8494E9] flex items-center justify-center relative">
              <span className="text-white text-lg font-bold text-center w-full">
                Confirmar agendamento?
              </span>
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-2xl font-bold hover:text-[#d1d5db] transition"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex flex-col flex-1 px-8 pt-8 pb-4">
              {/* Avatar, nome, data e horário */}
              <div className="flex items-center gap-6 mb-6">
                <Image
                  src={safeAvatarUrl}
                  alt={psicologo.Nome}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#8494E9]"
                  style={{ objectFit: "cover" }}
                  priority
                />
                <div className="flex flex-col">
                  <span className="text-[#444D9D] font-semibold text-lg">{psicologo.Nome}</span>
                  <div className="flex flex-row gap-6 mt-1">
                    <span className="text-[#49525A] text-base font-medium">
                      Data: {formatarData(psicologo.Data)}
                    </span>
                    <span className="text-[#49525A] text-base font-medium">
                      Horário: {psicologo.Horario} - horário de Brasília
                    </span>
                  </div>
                </div>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                {cards.map((card) => (
                  <div
                    key={`desktop-card-${card.id}`}
                    className="flex flex-col items-center justify-start bg-[#444D9D] border border-[#444D9D] rounded-[8px] w-[172px] h-[144px] gap-2 px-2 py-4 opacity-100"
                  >
                    <Image
                      src={card.icon}
                      alt={card.text}
                      width={32}
                      height={32}
                      className="w-8 h-8 mb-3"
                      style={{ objectFit: "contain" }}
                      priority
                    />
                    <span className="text-[#FCFBF6] text-[14px] font-medium text-center leading-6">
                      {card.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Botões */}
              <div className="flex flex-row gap-6 justify-center mt-auto">
                <button
                  className="w-[345px] h-12 rounded-[8px] border border-[#6D75C0] text-[#6D75C0] font-semibold text-base flex items-center justify-center px-6 cursor-pointer hover:bg-[#f2f4fd] transition"
                  onClick={onClose}
                  type="button"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  className={`w-[345px] h-12 rounded-[8px] bg-[#8494E9] text-white font-bold text-base flex items-center justify-center px-6 hover:bg-[#6c6bb6] transition cursor-pointer ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                  onClick={handleConfirm}
                  type="button"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      Processando...
                    </span>
                  ) : (
                    "Continuar agendamento"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal Mobile */}
      {open && (
        <motion.div
          key="modal-mobile"
          className="fixed inset-0 bg-white z-50 sm:hidden flex flex-col"
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
            <span className="block text-base font-semibold text-[#444D9D] mb-2 text-center">
              Confirmar agendamento?
            </span>
          </div>

          {/* Conteúdo */}
          <div className="p-4 flex-1 flex flex-col overflow-y-auto text-gray-800 text-sm leading-relaxed">
            {/* Avatar, nome, data e horário */}
            <div className="flex items-center gap-4 mb-4">
              <Image
                src={safeAvatarUrl}
                alt={psicologo.Nome}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover border-2 border-[#8494E9]"
                style={{ objectFit: "cover" }}
                priority
              />
              <div className="flex flex-col">
                <span className="text-[#444D9D] font-semibold text-base">{psicologo.Nome}</span>
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[#49525A] text-sm font-medium">
                    Data: {formatarData(psicologo.Data)}
                  </span>
                  <span className="text-[#49525A] text-sm font-medium">
                    Horário: {psicologo.Horario} - horário de Brasília
                  </span>
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {cards.map((card) => (
                <div
                  key={`mobile-card-${card.id}`}
                  className="flex flex-col items-center justify-start bg-[#444D9D] border border-[#444D9D] rounded-[8px] gap-2 px-2 py-4"
                >
                  <Image
                    src={card.icon}
                    alt={card.text}
                    width={32}
                    height={32}
                    className="w-8 h-8 mb-2"
                    style={{ objectFit: "contain" }}
                    priority
                  />
                  <span className="text-[#FCFBF6] text-[13px] font-medium text-center leading-5">
                    {card.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Botões */}
            <div className="flex flex-col gap-3 w-full mt-auto">
              <button
                className="w-full h-11 rounded-[8px] border border-[#6D75C0] text-[#6D75C0] font-semibold text-base flex items-center justify-center px-6 cursor-pointer hover:bg-[#f2f4fd] transition"
                onClick={onClose}
                type="button"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className={`w-full h-11 rounded-[8px] bg-[#8494E9] text-white font-bold text-base flex items-center justify-center px-6 hover:bg-[#6c6bb6] transition cursor-pointer ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                onClick={handleConfirm}
                type="button"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Processando...
                  </span>
                ) : (
                  "Continuar agendamento"
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
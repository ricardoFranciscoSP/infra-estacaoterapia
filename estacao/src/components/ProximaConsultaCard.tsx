import React, { useEffect, useState } from "react";
import Image from "next/image";
import ConsultaModalDesk from "./ConsultaModalDesk";
import { obterPrimeiroUltimoNome } from "@/utils/nomeUtils";
import { getStatusTagInfo } from "@/utils/statusConsulta.util";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

export type Consulta = {
  Id: string;
  Paciente?: { Nome?: string };
  Date?: string;
  Time?: string;
  Status?: string;
  ReservaSessao?: { Status?: string };
};

interface ProximaConsultaCardProps {
  consultas: Consulta[];
  currentIdx: number;
  setCurrentIdx: React.Dispatch<React.SetStateAction<number>>;
}

const ProximaConsultaCard: React.FC<ProximaConsultaCardProps> = ({
  consultas,
  currentIdx,
  setCurrentIdx,
}) => {
  // Estado para controlar o tempo restante e status da consulta
  const [timeToStart, setTimeToStart] = useState<number>(0); // segundos até iniciar
  const [started, setStarted] = useState<boolean>(false); // consulta iniciou
  const [elapsed, setElapsed] = useState<number>(0); // segundos desde início

  // Estado para controlar o modal de detalhes
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (consultas.length === 0 || currentIdx >= consultas.length) return;

    const consultaAtual = consultas[currentIdx];
    let consultaDate = consultaAtual.Date ? new Date(consultaAtual.Date) : null;
    if (!consultaDate && consultaAtual.Time) {
      const [h, m] = consultaAtual.Time.split(":");
      consultaDate = new Date();
      consultaDate.setHours(Number(h), Number(m), 0, 0);
    }
    if (!consultaDate) return;

    const now = new Date();
    const inicioConsulta = consultaDate.getTime();
    const fimConsulta = inicioConsulta + 15 * 60 * 1000; // 15 minutos

    // Calcula segundos até iniciar
    const secondsToStart = Math.max(0, Math.floor((inicioConsulta - now.getTime()) / 1000));
    setTimeToStart(secondsToStart);
    setStarted(secondsToStart === 0);

    // Timer para avançar consulta
    let timeoutMs = fimConsulta - now.getTime();
    if (timeoutMs < 0) timeoutMs = 0;

    const timer = setTimeout(() => {
      setCurrentIdx((idx) => idx + 1);
    }, timeoutMs);

    // Timer para contador
    const interval = setInterval(() => {
      const now = new Date();
      const secondsToStart = Math.max(0, Math.floor((inicioConsulta - now.getTime()) / 1000));
      setTimeToStart(secondsToStart);
      if (secondsToStart === 0) {
        setStarted(true);
        setElapsed(Math.min(600, Math.floor((now.getTime() - inicioConsulta) / 1000)));
      } else {
        setStarted(false);
        setElapsed(0);
      }
      // Atualiza elapsed se consulta já iniciou
      if (started) {
        setElapsed((prev) => Math.min(600, prev + 1));
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [currentIdx, consultas, setCurrentIdx, started]);

  if (consultas.length === 0 || currentIdx >= consultas.length) return null;

  const consulta = consultas[currentIdx];

  // Função para formatar minutos e segundos
  function formatMMSS(seconds: number) {
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  // Função para calcular ângulo do ponteiro dos minutos (relógio analógico)
  function getMinuteAngle(seconds: number, total: number = 600) {
    // total = 600 segundos (10 minutos)
    const percent = seconds / total;
    return percent * 360;
  }

  // SVG do relógio analógico
  function Clock({ seconds, total = 600, color = "#6D75C0" }: { seconds: number, total?: number, color?: string }) {
    const angle = getMinuteAngle(seconds, total);
    const rad = ((angle - 90) * Math.PI) / 180;
    const r = 8;
    const cx = 12;
    const cy = 12;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
        <circle cx="12" cy="12" r="1.5" fill={color} />
        {/* Ponteiro dos minutos */}
        <line
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Função para verificar se a data é diferente do dia atual
  function getConsultaDateStr(dateStr?: string) {
    if (!dateStr) return null;
    const consultaDate = new Date(dateStr);
    // Formata para dd/MM/yyyy
    return consultaDate.toLocaleDateString("pt-BR");
  }

  const consultaDateStr = consulta.Date ? getConsultaDateStr(consulta.Date) : null;
  const showDate = consultaDateStr && (() => {
    const now = new Date();
    const consultaDate = new Date(consulta.Date!);
    return (
      consultaDate.getDate() !== now.getDate() ||
      consultaDate.getMonth() !== now.getMonth() ||
      consultaDate.getFullYear() !== now.getFullYear()
    );
  })();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={consulta.Id}
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.98 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Card className="relative bg-[#F5F7FF] sm:bg-[#F2F4FD] rounded-[8px] shadow-md
          w-full max-w-full
          sm:w-[588px] sm:h-[132px]
          mb-3 font-fira-sans
          border-0"
        >
          <CardContent className="px-4 py-4 sm:p-6 sm:h-full sm:flex sm:flex-col gap-3">
        {/* Tag de status no canto superior direito */}
        {(() => {
          // Obtém o status da consulta (prioriza ReservaSessao.Status)
          const statusReservaSessao = consulta.ReservaSessao?.Status;
          const statusConsulta = statusReservaSessao || consulta.Status || 'Reservado';
          
          // Verifica se a consulta é futura (ainda não aconteceu)
          let isConsultaFutura = false;
          if (consulta.Date && consulta.Time) {
            try {
              const consultaDate = new Date(consulta.Date);
              const [h, m] = consulta.Time.split(":");
              consultaDate.setHours(Number(h), Number(m), 0, 0);
              const agora = new Date();
              // Consulta é futura se ainda não começou
              isConsultaFutura = consultaDate.getTime() > agora.getTime();
            } catch {
              // Em caso de erro, assume que não é futura
              isConsultaFutura = false;
            }
          }
          
          // Se a consulta é futura, não mostra status de "não compareceu" ou outros status que só fazem sentido após a consulta
          // Para consultas futuras, mostra apenas "Reservado" ou "Agendada"
          let statusParaExibir = statusConsulta;
          if (isConsultaFutura) {
            const statusInvalidosParaFuturas = [
              'PacienteNaoCompareceu',
              'Paciente Não Compareceu',
              'PsicologoNaoCompareceu',
              'Psicólogo Não Compareceu',
              'Cancelled_no_show',
              'cancelled_no_show',
              'Ausente',
              'Realizada',
              'Concluido',
              'Concluído'
            ];
            
            const statusLower = statusConsulta.toLowerCase();
            const isStatusInvalido = statusInvalidosParaFuturas.some(invalido => 
              statusLower.includes(invalido.toLowerCase()) || 
              statusConsulta === invalido
            );
            
            if (isStatusInvalido) {
              // Para consultas futuras com status inválido, força "Reservado"
              statusParaExibir = 'Reservado';
            }
          }
          
          // Usa função centralizada para obter informações do status
          const tagInfo = getStatusTagInfo(statusParaExibir);
          
          return (
            <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold ${tagInfo.bg} ${tagInfo.text} shadow z-10`}>
              {tagInfo.texto}
            </span>
          );
        })()}
        {/* Título e detalhes */}
        <div className="flex items-center justify-between mb-0.5 pr-24 sm:pr-0">
          <span className="text-sm lg:text-sm font-semibold text-gray-800 font-fira-sans">Próxima consulta</span>
          <button
            type="button"
            className="text-xs lg:text-xs text-[#6D75C0] underline font-medium font-fira-sans"
            onClick={() => setModalOpen(true)}
          >
            Detalhes
          </button>
        </div>
        {/* Linha inline: avatar + nome + data/horário (esquerda) | contador (direita) */}
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-3 sm:gap-2">
            <div className="bg-[#6D75C0] rounded-full w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center">
              <Image
                src="/icons/avatar.svg"
                alt="Avatar"
                width={28}
                height={28}
                className="sm:w-[20px] sm:h-[20px]"
              />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold text-base sm:text-sm text-gray-800 leading-tight font-fira-sans">
                {obterPrimeiroUltimoNome(consulta.Paciente?.Nome) || "Paciente"}
              </span>
              <span className="text-xs sm:text-xs text-gray-500 mt-1 flex items-center gap-1 font-fira-sans">
                {showDate && consultaDateStr ? (
                  <>
                    Data: {consultaDateStr} - Horário: {consulta.Time}
                  </>
                ) : (
                  <>Horário: {consulta.Time}</>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-1 mt-2 sm:mt-0 pr-20 sm:pr-0">
            {!started ? (
              <div className="flex items-center gap-1 text-[#6D75C0] font-medium text-xs sm:text-xs bg-[#F3F6FB] rounded px-2 py-1 sm:py-0.5 shadow-sm font-fira-sans">
                <Clock seconds={timeToStart > 600 ? 600 : timeToStart} total={600} color="#6D75C0" />
                <span>
                  Essa consulta se inicia em&nbsp;
                  <span className="font-bold font-fira-sans">{Math.ceil(timeToStart / 60)}</span>
                  &nbsp;minuto{Math.ceil(timeToStart / 60) !== 1 ? "s" : ""}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-green-700 font-medium text-xs sm:text-xs bg-[#E6F4EA] rounded px-2 py-1 sm:py-0.5 shadow-sm font-fira-sans">
                <Clock seconds={600 - elapsed} total={600} color="#2E7D32" />
                <span>
                  Essa consulta iniciou
                  <span className="ml-1 font-bold text-green-900 font-fira-sans">{formatMMSS(600 - elapsed)}</span>
                </span>
              </div>
            )}
          </div>
        </div>
        {/* Botões - alinhados na base, espaçamento ajustado */}
        <div className="flex gap-3 sm:gap-2 w-full mt-auto pt-2">
          <button
            className="flex-1 border border-[#6D75C0] text-[#6D75C0] bg-white rounded-[6px] py-2 sm:py-1.5 text-base sm:text-sm font-medium transition hover:bg-[#F3F6FB] font-fira-sans"
          >
            Cancelar
          </button>
          <button
            className="flex-1 bg-[#F3F6FB] text-gray-400 rounded-[6px] py-2 sm:py-1.5 text-base sm:text-sm font-medium cursor-not-allowed font-fira-sans"
            disabled
          >
            Entrar
          </button>
        </div>
        {/* Modal de detalhes */}
        <ConsultaModalDesk
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          consulta={{
            data: consulta.Date ?? "",
            horario: consulta.Time ?? "",
            id: consulta.Id,
            psicologo: {
              nome: obterPrimeiroUltimoNome(consulta.Paciente?.Nome) || "Paciente",
              avatarUrl: "/icons/avatar.svg"
            }
          }}
        />
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProximaConsultaCard;

import React, { useState } from "react";

type HorarioComId = {
  horario: string;
  id: string;
};

type HorariosPorData = Record<string, string[] | HorarioComId[]>;

interface CalendarioRotativoProps {
  dataSelecionada?: Date | null;
  horariosPorData?: HorariosPorData;
  onAgendar?: (data: Date, hora: string, agendaId?: string) => void;
}

export default function CalendarioRotativo({ dataSelecionada, horariosPorData = {}, onAgendar }: CalendarioRotativoProps) {
  // Gerar os próximos 30 dias
  const totalDias = 30;
  const dias = React.useMemo(() => {
    const agora = new Date();
    agora.setHours(0, 0, 0, 0); // Normaliza para início do dia
    return Array.from({ length: totalDias }, (_, i) => {
      const d = new Date(agora);
      d.setDate(d.getDate() + i);
      return {
        label: `${d.toLocaleDateString("pt-BR", { weekday: "short" })} ${d.getDate()}`,
        date: d,
      };
    });
  }, [totalDias]);


  // Função para converter string "HH:MM" em minutos absolutos
  const horarioStringParaMinutos = React.useCallback((horario: string): number => {
    const [h, m] = horario.split(":").map(Number);
    return h * 60 + m;
  }, []);

  // Filtrar horários por data, aplicando a mesma lógica dos psicólogos
  const horariosPorDia = React.useMemo(() => {
    const agora = new Date();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeYMD = hoje.toISOString().slice(0, 10);

    return dias.map((dia) => {
      const diaYMD = dia.date.toISOString().slice(0, 10);
      const horariosDoDia = horariosPorData[diaYMD] || [];
      
      // Converte para array de objetos {horario, id} se necessário
      const horariosComId: HorarioComId[] = horariosDoDia.map((h) => {
        if (typeof h === 'string') {
          return { horario: h, id: '' };
        }
        return h;
      });
      
      // Filtrar horários retroativos se for hoje
      const horariosFiltrados = horariosComId.filter((h) => {
        const hora = h.horario;
        // Se for hoje, só mostra horários futuros
        if (diaYMD === hojeYMD) {
          const minutosHorario = horarioStringParaMinutos(hora);
          return minutosHorario > minutosAgora;
        }
        // Para outros dias, mostra todos os horários disponíveis
        return true;
      });

      // Ordenar horários
      return horariosFiltrados.sort((a, b) => a.horario.localeCompare(b.horario));
    });
  }, [dias, horariosPorData, horarioStringParaMinutos]);

  // Controle do carrossel
  const diasVisiveis = 7;
  const [startIdx, setStartIdx] = useState(0);

  // Estado de seleção (precisa estar antes do useEffect)
  const [selected, setSelected] = useState<{ diaIdx: number | null; hora: string | null; agendaId?: string }>({
    diaIdx: null,
    hora: null,
    agendaId: undefined,
  });
  
  // Ref para rastrear se o usuário selecionou manualmente um horário
  const selecaoManualRef = React.useRef(false);

  // Efeito para rolar até a dataSelecionada e sincronizar seleção
  React.useEffect(() => {
    // Se foi seleção manual, não faz nada
    if (selecaoManualRef.current) {
      return;
    }
    
    if (dataSelecionada) {
      // Procurar o índice da dataSelecionada (normalizando datas para comparação correta)
      const dataSelecionadaNormalizada = new Date(dataSelecionada);
      dataSelecionadaNormalizada.setHours(0, 0, 0, 0);
      const idx = dias.findIndex(dia => {
        const diaNormalizado = new Date(dia.date);
        diaNormalizado.setHours(0, 0, 0, 0);
        return diaNormalizado.getTime() === dataSelecionadaNormalizada.getTime();
      });
      
      if (idx !== -1) {
        // Sincronizar a seleção com a data selecionada (apenas se não for seleção manual)
        setSelected(prev => {
          const dataKey = dataSelecionada.toISOString().slice(0, 10);
          const currentDataKey = prev.diaIdx !== null ? dias[prev.diaIdx]?.date.toISOString().slice(0, 10) : null;
          
          // Se a data mudou externamente, atualiza a seleção
          if (dataKey !== currentDataKey) {
            // Se já tem um horário selecionado E é da mesma data, mantém a seleção
            if (prev.hora !== null && prev.diaIdx === idx) {
              return prev; // Mantém a seleção atual se for a mesma data e já tem horário
            }
            // Caso contrário, seleciona apenas a coluna (sem horário)
            return { diaIdx: idx, hora: null, agendaId: undefined };
          }
          // Se a data não mudou, mantém a seleção atual
          return prev;
        });
        
        // Se a data não está visível, ajustar startIdx para mostrar
        setStartIdx(prevStartIdx => {
          if (idx < prevStartIdx || idx >= prevStartIdx + diasVisiveis) {
            return Math.max(0, Math.min(idx - Math.floor(diasVisiveis / 2), totalDias - diasVisiveis));
          }
          return prevStartIdx;
        });
      }
    }
  }, [dataSelecionada, dias, diasVisiveis, totalDias]);

  const diasVisiveisArr = dias.slice(startIdx, startIdx + diasVisiveis);
  const horariosVisiveisArr = horariosPorDia.slice(startIdx, startIdx + diasVisiveis);

  // Handler de agendamento (função auxiliar)
  const processarAgendamento = React.useCallback((diaIdx: number, horarioObj: HorarioComId) => {
    const dia = dias[diaIdx];
    if (dia && typeof onAgendar === 'function') {
      // Passa o agendaId diretamente do objeto horário, como no listPsicologo
      onAgendar(dia.date, horarioObj.horario, horarioObj.id || undefined);
    }
  }, [dias, onAgendar]);

  // Handler de clique no horário
  const handleSelect = (diaIdx: number, hora: string, agendaId?: string) => {
    // Marca que foi seleção manual ANTES de atualizar o estado
    selecaoManualRef.current = true;
    setSelected(prev => {
      // Se está clicando no mesmo horário, desseleciona
      if (prev.diaIdx === diaIdx && prev.hora === hora) {
        selecaoManualRef.current = false;
        return { diaIdx: null, hora: null, agendaId: undefined };
      }
      // Seleciona o novo horário (não abre o modal automaticamente)
      return { diaIdx, hora, agendaId };
    });
  };

  const handleLimpar = () => {
    selecaoManualRef.current = false;
    setSelected({ diaIdx: null, hora: null, agendaId: undefined });
  };

  // Handler de agendamento (para o botão)
  const handleAgendar = () => {
    if (selected.diaIdx !== null && selected.hora) {
      const horariosDoDia = horariosPorDia[selected.diaIdx] || [];
      const horarioObj = horariosDoDia.find(h => h.horario === selected.hora);
      if (horarioObj) {
        processarAgendamento(selected.diaIdx, horarioObj);
      }
    }
  };

  // Constantes de layout
  const horariosVisiveisPorColuna = 3;
  const horarioHeight = 22, horariosGap = 4;

  return (
    <div className="w-full max-w-[500px] bg-[#F1F2F4] border border-[#ADB6BD] rounded-[8px] p-4 flex flex-col gap-2 shadow-sm">
      {/* Carrossel de dias */}
      <div className="flex items-center justify-between mb-2">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-[4px] border-2 border-[#ADB6BD] bg-white text-[#6D75C0] disabled:opacity-40"
          onClick={() => setStartIdx(Math.max(0, startIdx - 1))}
          disabled={startIdx === 0}
        >
          &#60;
        </button>
        <div className="flex flex-row gap-1 flex-1 justify-center">
          {diasVisiveisArr.map((dia, idx) => {
            // Novo controle: apenas o dia selecionado pelo usuário fica ativo
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0); // Normaliza para início do dia para comparação correta
            const diaComparacao = new Date(dia.date);
            diaComparacao.setHours(0, 0, 0, 0); // Normaliza para início do dia
            const diaIdxReal = startIdx + idx; // Índice real no array completo de dias
            const isSelecionado = selected.diaIdx === diaIdxReal;
            const isHoje = diaComparacao.getTime() === hoje.getTime();
            return (
              <button
                key={dia.label}
                className={`w-[40px] h-[32px] rounded-[4px] border font-semibold flex flex-col items-center justify-center transition-all duration-150 relative
                  ${isSelecionado ? "bg-[#6D75C0] border-[#6D75C0] text-white" : "bg-[#F8F9FB] border-[#ADB6BD] text-[#75838F]"}`}
                onClick={() => {
                  setSelected({ diaIdx: diaIdxReal, hora: null });
                }}
                style={{ cursor: 'pointer' }}
              >
                <span className={`text-[9px] ${isSelecionado ? "text-white" : "text-[#75838F]"}`}>{dia.label.split(" ")[0]}</span>
                <span className={`font-bold text-[12px] ${isSelecionado ? "text-white" : "text-[#75838F]"}`}>{dia.label.split(" ")[1]}</span>
                {isHoje && !isSelecionado && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[#6D75C0] rounded-full" title="Hoje" />
                )}
              </button>
            );
          })}
        </div>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-[4px] border-2 border-[#ADB6BD] bg-white text-[#6D75C0] disabled:opacity-40"
          onClick={() => setStartIdx(Math.min(totalDias - diasVisiveis, startIdx + 1))}
          disabled={startIdx >= totalDias - diasVisiveis}
        >
          &#62;
        </button>
      </div>

      {/* Tabela de horários: rolagem vertical única, alinhada à seta direita */}
      <div className="w-full flex flex-row" style={{ marginLeft: 25 }}>
        <div
          className="grid overflow-y-auto scrollbar-thin scrollbar-thumb-[#ADB6BD] scrollbar-track-[#F1F2F4]"
          style={{
            gridTemplateColumns: `repeat(${diasVisiveisArr.length}, 40px)`,
            gap: "4px",
            width: `calc(${diasVisiveisArr.length * 40 + (diasVisiveisArr.length - 1) * 4}px + 32px)`, // width maior para alinhar a barra de rolagem à seta
            height: `${horariosVisiveisPorColuna * horarioHeight + (horariosVisiveisPorColuna - 1) * horariosGap}px`,
            minHeight: `${horariosVisiveisPorColuna * horarioHeight + (horariosVisiveisPorColuna - 1) * horariosGap}px`,
            maxHeight: `${horariosVisiveisPorColuna * horarioHeight + (horariosVisiveisPorColuna - 1) * horariosGap}px`,
            paddingRight: "32px", // espaçamento para alinhar a barra de rolagem à seta direita
            overflowX: "hidden", // remove barra horizontal
          }}
        >
          {horariosVisiveisArr.map((horarios, idxRelativo) => {
            const diaIdxReal = startIdx + idxRelativo; // Índice real no array completo de dias
            return (
              <div
                key={diaIdxReal}
                className="flex flex-col items-center flex-shrink-0 w-[40px] h-full"
              >
                {horarios.length === 0
                  ? Array.from({ length: horariosVisiveisPorColuna }).map((_, hidx) => (
                      <div key={hidx} className="w-full h-[22px]" />
                    ))
                  : horarios.map((horarioObj, hidx) => {
                      const hora = horarioObj.horario;
                      // mostrar todos os horários, rolagem única no grid
                      const isSelected = selected.diaIdx === diaIdxReal && selected.hora === hora;
                      // Só desabilita horários se um horário específico foi selecionado (não apenas a coluna)
                      // Se apenas a coluna foi selecionada (selected.hora === null), todos os horários ficam disponíveis
                      const isDisabled = selected.hora !== null && !(selected.diaIdx === diaIdxReal && selected.hora === hora);
                      return (
                        <button
                          key={hidx}
                          onClick={() => handleSelect(diaIdxReal, hora, horarioObj.id)}
                          disabled={isDisabled}
                          className={`w-full h-[22px] rounded-[4px] border text-[10px] font-semibold flex items-center justify-center transition-all duration-150
                            ${
                              isSelected
                                ? "bg-[#6D75C0] text-white border-[#6D75C0]"
                                : isDisabled
                                ? "bg-[#F8F9FB] text-[#ADB6BD] border-[#E3E6E8] opacity-50 cursor-not-allowed"
                                : "bg-[#F8F9FB] text-[#75838F] border-[#E3E6E8] hover:bg-[#E5E7F3] cursor-pointer"
                            }`}
                          style={{ marginBottom: horariosGap, position: 'relative' }}
                        >
                          {hora}
                          {isDisabled && (
                            <span style={{
                              position: 'absolute',
                              left: '50%',
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              pointerEvents: 'none',
                            }}>
                              {/* Ícone X SVG preto centralizado */}
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 4L12 12M12 4L4 12" stroke="#49525A" strokeWidth="2.2" strokeLinecap="round" />
                              </svg>
                            </span>
                          )}
                        </button>
                      );
                    })
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* Botões Ações */}
      <div className="flex justify-end gap-2 mt-3">
        {selected.diaIdx !== null && selected.hora && (
          <button
            onClick={handleLimpar}
            className="w-[90px] h-[28px] bg-[#F8F9FB] text-[#6D75C0] rounded-[4px] text-[13px] font-semibold border border-[#6D75C0] hover:bg-[#E5E7F3]"
          >
            Limpar
          </button>
        )}
        <button
          className={`w-[90px] h-[28px] rounded-[4px] text-[13px] font-semibold border ${
            selected.hora
              ? "bg-[#6D75C0] text-white border-[#6D75C0] hover:bg-[#5b62a6]"
              : "bg-[#F8F9FB] text-[#ADB6BD] border-[#E3E6E8]"
          }`}
          disabled={!selected.hora}
          onClick={handleAgendar}
        >
          Agendar
        </button>
      </div>
    </div>
  );
}

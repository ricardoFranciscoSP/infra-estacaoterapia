'use client';

import { useMemo, useEffect, useState } from 'react';
import { ConsultaApi } from '@/types/consultasTypes';
import { selecionarProximaConsulta, podeEntrarNaConsulta, ProximaConsultaResult } from './selecionar-proxima-consulta';
import { ConsultaCard } from './ConsultaCard';
import { ConsultaEmptyState } from './ConsultaEmptyState';
import { useRouter } from 'next/navigation';
import { useContadorGlobal } from '@/hooks/useContadorGlobal';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Calcula o contador para a consulta (até 1h antes e 5min após iniciar)
 */
function calcularContadorInicio(consulta: ConsultaApi | null): {
  mostrar: boolean;
  frase: string;
  tempo: string;
} {
  if (!consulta) {
    return { mostrar: false, frase: '', tempo: '' };
  }

  try {
    const dataConsulta = consulta.Date || consulta.Agenda?.Data;
    const horarioConsulta = consulta.Time || consulta.Agenda?.Horario;

    if (!dataConsulta || !horarioConsulta) {
      return { mostrar: false, frase: '', tempo: '' };
    }

    // Normaliza data e horário
    const dateOnly = dataConsulta.split('T')[0].split(' ')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return { mostrar: false, frase: '', tempo: '' };
    }

    const horarioTrimmed = horarioConsulta.trim();
    if (!/^\d{1,2}:\d{2}$/.test(horarioTrimmed)) {
      return { mostrar: false, frase: '', tempo: '' };
    }

    const [hora, minuto] = horarioTrimmed.split(':').map(Number);
    if (hora < 0 || hora >= 24 || minuto < 0 || minuto >= 60) {
      return { mostrar: false, frase: '', tempo: '' };
    }

    const horarioNormalizado = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;

    const agora = dayjs().tz('America/Sao_Paulo');
    const dataHoraConsulta = dayjs.tz(
      `${dateOnly} ${horarioNormalizado}`,
      'America/Sao_Paulo'
    );

    if (!dataHoraConsulta.isValid()) {
      return { mostrar: false, frase: '', tempo: '' };
    }

    // Calcula diferença em segundos (positivo = falta tempo, negativo = já começou)
    const diffSegundos = dataHoraConsulta.diff(agora, 'second');

    // Contagem regressiva até o início (mostra desde 1h antes)
    if (diffSegundos > 0 && diffSegundos <= 3600) {
      const horas = Math.floor(diffSegundos / 3600);
      const minutos = Math.floor((diffSegundos % 3600) / 60);
      const segundos = diffSegundos % 60;
      const tempoFormatado = horas > 0
        ? `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
        : `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
      
      return {
        mostrar: true,
        frase: 'Sua sessão inicia em',
        tempo: tempoFormatado,
      };
    }

    // Janela logo após iniciar (até 5 minutos depois) para exibir "Sua sessão iniciou"
    if (diffSegundos <= 0 && diffSegundos >= -300) {
      const segundosPassados = Math.abs(diffSegundos);
      const minutos = Math.floor(segundosPassados / 60);
      const segundos = segundosPassados % 60;
      const tempoFormatado = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
      return {
        mostrar: true,
        frase: 'Sua sessão iniciou',
        tempo: tempoFormatado,
      };
    }

    return { mostrar: false, frase: '', tempo: '' };
  } catch (error) {
    console.error('Erro ao calcular contador de início:', error);
    return { mostrar: false, frase: '', tempo: '' };
  }
}

interface ProximaConsultaProps {
  consultas: ConsultaApi[] | null | undefined;
  onVerDetalhes?: (consulta: ConsultaApi) => void;
  onReagendar?: (consulta: ConsultaApi) => void;
  onEntrarConsulta?: (consulta: ConsultaApi) => void;
}

/**
 * Componente que exibe a próxima consulta com prioridade:
 * 1. Consulta de hoje (se existir)
 * 2. Próxima consulta futura
 * 3. Estado vazio (se não houver consultas)
 */
export function ProximaConsulta({
  consultas,
  onVerDetalhes,
  onReagendar,
  onEntrarConsulta,
}: ProximaConsultaProps) {
  const router = useRouter();
  const [contadorInicio, setContadorInicio] = useState({ mostrar: false, frase: '', tempo: '' });
  
  // Usa o contador global compartilhado em vez de criar um novo intervalo
  const { timestamp } = useContadorGlobal();

  // Seleciona a próxima consulta usando a função utilitária
  const { proximaConsulta }: ProximaConsultaResult = useMemo(() => {
    if (!consultas || consultas.length === 0) {
      return { proximaConsulta: null, isHoje: false, isAmanha: false };
    }
    return selecionarProximaConsulta(consultas);
  }, [consultas]);

  // Calcula e atualiza o contador de início da consulta
  useEffect(() => {
    if (!proximaConsulta) {
      setContadorInicio({ mostrar: false, frase: '', tempo: '' });
      return;
    }

    const contador = calcularContadorInicio(proximaConsulta);
    setContadorInicio(contador);
  }, [proximaConsulta, timestamp]);

  // Verifica se pode entrar na consulta (dentro da janela permitida)
  const podeEntrar = useMemo(() => {
    if (!proximaConsulta) return false;
    return podeEntrarNaConsulta(proximaConsulta);
  }, [proximaConsulta]);

  // Verifica se a sessão já começou olhando o contador
  const sessaoJaComecou = useMemo(() => {
    return contadorInicio.mostrar && contadorInicio.frase === 'Sua sessão iniciou';
  }, [contadorInicio]);

  // O botão está desabilitado se NÃO pode entrar E a sessão ainda não começou
  const botaoDesabilitado = !podeEntrar && !sessaoJaComecou;

  // Badge removido - mantém apenas o status da consulta
  const badge = undefined;

  // Handler para entrar na consulta
  const handleEntrarConsulta = () => {
    if (proximaConsulta) {
      if (onEntrarConsulta) {
        onEntrarConsulta(proximaConsulta);
      } else {
        // Fallback: navegar para a sala da consulta
        const consultaId = proximaConsulta.Id;
        if (consultaId) {
          router.push(`/painel/sessao/${consultaId}`);
        }
      }
    }
  };

  // Se não houver consulta, exibe estado vazio
  if (!proximaConsulta) {
    return (
      <ConsultaEmptyState
        titulo="Você não tem consultas agendadas hoje"
        descricao="Agende uma consulta com um de nossos psicólogos para começar seu acompanhamento."
        ctaText="Agendar consulta"
        ctaHref="/painel/psicologos"
      />
    );
  }

  // Cria o objeto de actions: só inclui onVerDetalhes e onReagendar se forem fornecidos
  // Se não forem fornecidos, o ConsultaCard usará seus modais internos
  const actions: {
    onEntrar: () => void;
    onVerPerfil: () => void;
    onVerDetalhes?: () => void;
    onReagendar?: () => void;
  } = {
    onEntrar: handleEntrarConsulta,
    onVerPerfil: () => {
      const psicologoId = proximaConsulta.Psicologo?.Id;
      if (psicologoId) {
        router.push(`/painel/psicologo/${psicologoId}`);
      }
    },
  };

  // Adiciona handlers customizados apenas se forem fornecidos
  if (onVerDetalhes) {
    actions.onVerDetalhes = () => onVerDetalhes(proximaConsulta);
  }

  if (onReagendar) {
    actions.onReagendar = () => onReagendar(proximaConsulta);
  }

  // Determina qual contador usar (contador de início ou nenhum)
  const contador = contadorInicio.mostrar
    ? {
        mostrar: true,
        frase: contadorInicio.frase,
        tempo: contadorInicio.tempo,
      }
    : undefined;

  // Exibe o card da próxima consulta (mesmo tamanho do card de consultas concluídas)
  return (
    <ConsultaCard
      consulta={proximaConsulta}
      badge={badge}
      showEntrarButton={true}
      actions={actions}
      contador={contador}
      botaoEntrarDesabilitado={botaoDesabilitado}
      isPacientePanel={false} // false para ter o mesmo tamanho (588px) do card de consultas concluídas
    />
  );
}


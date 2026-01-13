'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useConfiguracaoAgenda } from '@/hooks/configuracoesHook';
import { ConfiguracaoAgenda } from '@/services/configuracoesService';
import toast from 'react-hot-toast';

interface ModalAgendaProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalAgenda({
  isOpen,
  onClose,
}: ModalAgendaProps) {
  const { dadosAgenda, atualizarConfiguracaoAgenda } = useConfiguracaoAgenda();
  
  const [formData, setFormData] = useState<ConfiguracaoAgenda>({
    fusoHorarioPadrao: 'America/Sao_Paulo',
    duracaoConsultaMin: 50,
    intervaloEntreConsultas: 10,
    antecedenciaMinAgendamento: 1,
    antecedenciaMaxAgendamento: 4320,
    antecedenciaCancelamento: 24,
    lembreteAntesConsulta: 60,
    horarioGeracaoAutomaticaAgenda: null,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const onCloseRef = useRef(onClose);

  // Atualiza a referência quando onClose muda
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Carregar dados quando o modal abrir
  useEffect(() => {
    if (!isOpen) return;
    
    // Carrega dados apenas quando o modal abrir, usando valores atuais de dadosAgenda
    if (dadosAgenda) {
      setFormData({
        fusoHorarioPadrao: dadosAgenda.fusoHorarioPadrao ?? 'America/Sao_Paulo',
        duracaoConsultaMin: dadosAgenda.duracaoConsultaMin ?? 50,
        intervaloEntreConsultas: dadosAgenda.intervaloEntreConsultas ?? 10,
        antecedenciaMinAgendamento: dadosAgenda.antecedenciaMinAgendamento ?? 1,
        antecedenciaMaxAgendamento: dadosAgenda.antecedenciaMaxAgendamento ?? 4320,
        antecedenciaCancelamento: dadosAgenda.antecedenciaCancelamento ?? 24,
        lembreteAntesConsulta: dadosAgenda.lembreteAntesConsulta ?? 60,
        horarioGeracaoAutomaticaAgenda: dadosAgenda.horarioGeracaoAutomaticaAgenda ?? null,
      });
    } else {
      setFormData({
        fusoHorarioPadrao: 'America/Sao_Paulo',
        duracaoConsultaMin: 50,
        intervaloEntreConsultas: 10,
        antecedenciaMinAgendamento: 1,
        antecedenciaMaxAgendamento: 4320,
        antecedenciaCancelamento: 24,
        lembreteAntesConsulta: 60,
        horarioGeracaoAutomaticaAgenda: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Apenas isOpen como dependência - dadosAgenda carregado apenas quando modal abre

  // Fechar com ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, isLoading]);

  const handleChange = (field: keyof ConfiguracaoAgenda, value: string | number | null) => {
    if (!isLoading) {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setIsLoading(true);

    try {
      await atualizarConfiguracaoAgenda(formData);
      toast.success('Configurações de agenda atualizadas com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar configurações de agenda:', error);
      toast.error('Erro ao atualizar configurações. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const timezones = [
    { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
    { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
    { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
    { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
    { value: 'America/Campo_Grande', label: 'Campo Grande (GMT-4)' },
    { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
    { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
    { value: 'America/Recife', label: 'Recife (GMT-3)' },
    { value: 'America/Bahia', label: 'Bahia (GMT-3)' },
    { value: 'America/Belem', label: 'Belém (GMT-3)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header com cor da plataforma */}
        <div className="bg-[#8494E9] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Editar Configurações de Agenda
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            aria-label="Fechar modal"
            disabled={isLoading}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fuso Horário Padrão
                </label>
                <select
                  value={formData.fusoHorarioPadrao || 'America/Sao_Paulo'}
                  onChange={(e) => handleChange('fusoHorarioPadrao', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {timezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duração Mínima da Consulta (minutos)
                </label>
                <input
                  type="number"
                  value={formData.duracaoConsultaMin || ''}
                  onChange={(e) => handleChange('duracaoConsultaMin', e.target.value ? parseInt(e.target.value) : null)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="50"
                  min="15"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Intervalo Entre Consultas (minutos)
                </label>
                <input
                  type="number"
                  value={formData.intervaloEntreConsultas || ''}
                  onChange={(e) => handleChange('intervaloEntreConsultas', e.target.value ? parseInt(e.target.value) : null)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="10"
                  min="0"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Antecedência Mínima para Agendamento (horas)
                </label>
                <input
                  type="number"
                  value={formData.antecedenciaMinAgendamento || ''}
                  onChange={(e) => handleChange('antecedenciaMinAgendamento', e.target.value ? parseInt(e.target.value) : null)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="1"
                  min="0"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Antecedência Máxima para Agendamento (horas)
                </label>
                <input
                  type="number"
                  value={formData.antecedenciaMaxAgendamento || ''}
                  onChange={(e) => handleChange('antecedenciaMaxAgendamento', e.target.value ? parseInt(e.target.value) : null)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="4320"
                  min="1"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Antecedência para Cancelamento (horas)
                </label>
                <input
                  type="number"
                  value={formData.antecedenciaCancelamento || ''}
                  onChange={(e) => handleChange('antecedenciaCancelamento', e.target.value ? parseInt(e.target.value) : null)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="24"
                  min="0"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lembrete Antes da Consulta (minutos)
                </label>
                <input
                  type="number"
                  value={formData.lembreteAntesConsulta || ''}
                  onChange={(e) => handleChange('lembreteAntesConsulta', e.target.value ? parseInt(e.target.value) : null)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="60"
                  min="0"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horário de Geração Automática de Agenda
                </label>
                <input
                  type="time"
                  value={formData.horarioGeracaoAutomaticaAgenda || ''}
                  onChange={(e) => handleChange('horarioGeracaoAutomaticaAgenda', e.target.value || null)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="03:00"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Horário em que as agendas serão geradas automaticamente (formato 24h)
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Footer com botões */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex-1 px-4 py-2.5 text-white bg-[#8494E9] rounded-lg hover:bg-[#6D75C0] transition-colors disabled:opacity-70 disabled:cursor-not-allowed font-medium relative overflow-hidden"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="relative z-10 flex items-center justify-center">
                  <span className="mr-2">Salvando</span>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </span>
              ) : (
                'Salvar'
              )}
              {isLoading && (
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmerLoading_1.5s_infinite]"></span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


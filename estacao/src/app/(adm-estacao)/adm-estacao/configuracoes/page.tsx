"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useGerarAgendaManual } from "@/hooks/gerarAgendaHook";
import { useConfiguracaoIntegracoes, useConfiguracoes, useConfiguracaoAgenda, useConfiguracaoPagamentos, useUpdateConfiguracao } from "@/hooks/configuracoesHook";
import { useRedesSociais } from "@/hooks/redesSociaisHook";
import ModalIntegracoesExternas from "@/components/adm/ModalIntegracoesExternas";
import ModalAgenda from "@/components/adm/ModalAgenda";
import ModalPagamentos from "@/components/adm/ModalPagamentos";
import ModalRedesSociais from "@/components/adm/ModalRedesSociais";
import toast from "react-hot-toast";

// Ícones SVG (Heroicons outline)
const icons = {
  integracoes: (
    <svg
      className="w-5 h-5 text-blue-500 mr-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m4 0h-1v-4h-1m-4 0h-1v-4h-1m4 0h-1v-4h-1"
      />
    </svg>
  ),
  aparencia: (
    <svg
      className="w-5 h-5 text-blue-500 mr-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m8.485-8.485l-.707.707M4.222 19.778l-.707-.707M21 12h-1M4 12H3m16.485-8.485l-.707.707M4.222 4.222l-.707.707"
      />
    </svg>
  ),
  agenda: (
    <svg
      className="w-5 h-5 text-blue-500 mr-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <rect
        width="18"
        height="18"
        x="3"
        y="4"
        rx="2"
        strokeWidth={2}
        stroke="currentColor"
        fill="none"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 2v4M8 2v4M3 10h18"
      />
    </svg>
  ),
  pagamentos: (
    <svg
      className="w-5 h-5 text-blue-500 mr-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <rect
        width="20"
        height="14"
        x="2"
        y="5"
        rx="2"
        strokeWidth={2}
        stroke="currentColor"
        fill="none"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2 10h20"
      />
    </svg>
  ),
  comunicacao: (
    <svg
      className="w-5 h-5 text-blue-500 mr-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
      />
    </svg>
  ),
  lgpd: (
    <svg
      className="w-5 h-5 text-blue-500 mr-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 11c0-1.104.896-2 2-2s2 .896 2 2-.896 2-2 2-2-.896-2-2zm0 0V7m0 4v4m-4-4c0-1.104.896-2 2-2s2 .896 2 2-.896 2-2 2-2-.896-2-2zm0 0V7m0 4v4"
      />
    </svg>
  ),
  seguranca: (
    <svg
      className="w-5 h-5 text-blue-500 mr-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <rect
        width="18"
        height="12"
        x="3"
        y="8"
        rx="2"
        strokeWidth={2}
        stroke="currentColor"
        fill="none"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 8V6a5 5 0 0110 0v2"
      />
    </svg>
  ),
  publicar: (
    <svg
      className="w-5 h-5 text-blue-500 mr-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
};

// Componente do botão Gerar Agenda
function GerarAgendaButton() {
  const { gerarAgendaAsync, isLoading, isSuccess, error } = useGerarAgendaManual();

  const handleGerarAgenda = async () => {
    try {
      const response = await gerarAgendaAsync();
      // Mostrar mensagem de sucesso com informações dos resultados
      const totalCriados = response.resultados?.reduce((acc, r) => acc + (r.criados || 0), 0) || 0;
      const totalPsicologos = response.resultados?.length || 0;
      toast.success(
        `Agenda gerada com sucesso!\n${totalCriados} agendas criadas para ${totalPsicologos} psicólogo(s).`,
        {
          duration: 5000,
        }
      );
    } catch (err) {
      // Erro já é tratado pelo hook
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao gerar agenda';
      toast.error(`Erro ao gerar agenda: ${errorMessage}`, {
        duration: 5000,
      });
      console.error('Erro ao gerar agenda:', err);
    }
  };

  return (
    <div>
      <button
        onClick={handleGerarAgenda}
        disabled={isLoading}
        className={`
          w-full px-4 py-2 rounded-lg font-medium transition-all duration-200
          ${isLoading 
            ? 'bg-gray-400 cursor-not-allowed text-white' 
            : isSuccess
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-[#8494E9] hover:bg-[#6B7DE0] text-white hover:shadow-md'
          }
          flex items-center justify-center gap-2
        `}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Gerando...
          </>
        ) : isSuccess ? (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Agenda gerada!
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Gerar agenda
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error.message || 'Erro ao gerar agenda'}
        </p>
      )}
    </div>
  );
}

export default function ConfiguracoesPage() {
    const ultimoAcesso = "10 de junho de 2024, 14:32";
    
    // Buscar configurações do servidor
    const { configuracoes, refetch: refetchConfiguracoes } = useConfiguracoes();
    const { updateConfiguracaoAsync, isLoading: isUpdatingMaintenance } = useUpdateConfiguracao();
    
    const { dadosIntegracoes } = useConfiguracaoIntegracoes();
    const { dadosAgenda } = useConfiguracaoAgenda();
    const { dadosPagamentos } = useConfiguracaoPagamentos();
    const { redesSociais } = useRedesSociais();
    
    // Obtém o estado de manutenção atual
    const manutencaoAtiva = configuracoes.length > 0 ? (configuracoes[0].manutencao === true) : false;
    
    // Handler para toggle de manutenção
    const handleToggleManutencao = async (enabled: boolean) => {
        if (!configuracoes || configuracoes.length === 0) {
            toast.error('Erro: Configuração não encontrada');
            return;
        }
        
        try {
            await updateConfiguracaoAsync({
                id: configuracoes[0].Id,
                data: { manutencao: enabled }
            });
            toast.success(`Modo de manutenção ${enabled ? 'ativado' : 'desativado'} com sucesso!`);
            refetchConfiguracoes();
        } catch (error) {
            console.error('Erro ao atualizar modo de manutenção:', error);
            toast.error('Erro ao atualizar modo de manutenção');
        }
    };
  
  // Força buscar dados do banco quando a página montar
  useEffect(() => {
    refetchConfiguracoes();
  }, [refetchConfiguracoes]);
  
  const [isModalIntegracoesOpen, setIsModalIntegracoesOpen] = useState(false);
  const [isModalAgendaOpen, setIsModalAgendaOpen] = useState(false);
  const [isModalPagamentosOpen, setIsModalPagamentosOpen] = useState(false);
  const [isModalRedesSociaisOpen, setIsModalRedesSociaisOpen] = useState(false);

  return (
    <main className="w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          Configurações da Estação
        </h1>
        <p className="text-sm text-gray-500">
          Gerencie as principais configurações do sistema, integrações, agenda, pagamentos e comunicação.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6">
        {/* Coluna 1 e 2: Configurações */}
        <div className="col-span-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Card de Modo de Manutenção */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-white rounded-xl shadow-sm p-5 h-full flex flex-col border border-[#E5E9FA] w-full relative hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-orange-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-gray-800">
                Modo de Manutenção
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Quando ativado, apenas administradores podem acessar o sistema. Pacientes e psicólogos serão redirecionados para a página de manutenção.
            </p>
            
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${manutencaoAtiva ? 'text-orange-600' : 'text-gray-600'}`}>
                {manutencaoAtiva ? 'Manutenção Ativa' : 'Sistema Normal'}
              </span>
              <button
                type="button"
                onClick={() => handleToggleManutencao(!manutencaoAtiva)}
                disabled={isUpdatingMaintenance}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:ring-offset-2
                  ${manutencaoAtiva ? 'bg-orange-500' : 'bg-gray-200'}
                  ${isUpdatingMaintenance ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                role="switch"
                aria-checked={manutencaoAtiva}
                aria-label="Toggle modo de manutenção"
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${manutencaoAtiva ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
            
            {/* Indicador visual */}
            {manutencaoAtiva && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="text-sm text-orange-800 font-medium">
                    Sistema em modo de manutenção
                  </span>
                </div>
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            className="bg-white rounded-xl shadow-sm p-5 h-full flex flex-col border border-[#E5E9FA] w-full relative hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-blue-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11a4 4 0 11-8 0 4 4 0 018 0zm2 2h2m-2-6h2M4 13H2m2-6H2m11 9v2m0-16V2"
                />
              </svg>
              <h2 className="text-lg font-semibold text-gray-800">
                Tokens Agora (Manual)
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Gere tokens manualmente para um par paciente/psicólogo e acompanhe o histórico.
            </p>
            <Link
              href="/adm-estacao/configuracoes/gerar-token-manual"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium bg-[#8494E9] hover:bg-[#6B7DE0] text-white transition"
            >
              Acessar geração manual
            </Link>
          </motion.section>
          
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm p-5 h-full flex flex-col border border-[#E5E9FA] w-full relative hover:shadow-md transition-shadow"
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsModalIntegracoesOpen(true)}
                className="p-2 rounded-full hover:bg-[#8494E9]/10 transition"
                title="Editar integrações externas"
              >
                <svg
                  className="w-5 h-5 text-[#8494E9]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <div className="group relative flex items-center">
                <button
                  type="button"
                  className="p-1 rounded-full hover:bg-[#8494E9]/10 transition"
                  title="Configure integrações externas como Google, Vindi, Agora."
                >
                  <svg
                    className="w-5 h-5 text-[#8494E9]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
                <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 max-w-[200px]">
                  Configure integrações externas
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {icons.integracoes}
              <h2 className="text-lg font-semibold text-gray-800">
                Integrações externas
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Google Tag Manager</label>
                <input
                  readOnly
                  value={dadosIntegracoes?.googleTagManager ?? ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Google Tag Manager"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Google Analytics</label>
                <input
                  readOnly
                  value={dadosIntegracoes?.googleAnalytics ?? ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Google Analytics"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Google Ads</label>
                <input
                  readOnly
                  value={dadosIntegracoes?.googleAds ?? ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Google Ads"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Agora App ID</label>
                <input
                  readOnly
                  value={dadosIntegracoes?.agoraAppId ?? ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Agora App ID"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Agora App Certificate</label>
                <input
                  readOnly
                  value={dadosIntegracoes?.agoraAppCertificate ?? ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Agora App Certificate"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Vindi API Key</label>
                <input
                  readOnly
                  value={dadosIntegracoes?.vindiApiKey ?? ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Vindi API Key"
                />
              </div>
            </div>
          </motion.section>


          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-5 h-full flex flex-col border border-[#E5E9FA] w-full relative hover:shadow-md transition-shadow"
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsModalAgendaOpen(true)}
                className="p-2 rounded-full hover:bg-[#8494E9]/10 transition"
                title="Editar configurações de agenda"
              >
                <svg
                  className="w-5 h-5 text-[#8494E9]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <div className="group relative flex items-center">
                <button
                  type="button"
                  className="p-1 rounded-full hover:bg-[#8494E9]/10 transition"
                  title="Defina regras e horários da agenda de consultas."
                >
                  <svg
                    className="w-5 h-5 text-[#8494E9]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
                <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 max-w-[200px]">
                  Configure regras da agenda
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {icons.agenda}
              <h2 className="text-lg font-semibold text-gray-800">Agenda</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fuso horário padrão</label>
                <input
                  readOnly
                  value={dadosAgenda?.fusoHorarioPadrao || ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Fuso horário padrão"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Duração mínima da consulta (min)</label>
                <input
                  readOnly
                  type="number"
                  value={dadosAgenda?.duracaoConsultaMin || ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Duração mínima da consulta (min)"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Intervalo entre consultas (min)</label>
                <input
                  readOnly
                  type="number"
                  value={dadosAgenda?.intervaloEntreConsultas || ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Intervalo entre consultas (min)"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Antecedência mínima agendamento (h)</label>
                <input
                  readOnly
                  type="number"
                  value={dadosAgenda?.antecedenciaMinAgendamento || ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Antecedência mínima agendamento (h)"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Antecedência máxima agendamento (h)</label>
                <input
                  readOnly
                  type="number"
                  value={dadosAgenda?.antecedenciaMaxAgendamento || ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Antecedência máxima agendamento (h)"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Antecedência para cancelamento (h)</label>
                <input
                  readOnly
                  type="number"
                  value={dadosAgenda?.antecedenciaCancelamento ?? ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Antecedência para cancelamento (h)"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Horário de Geração Automática de Agenda</label>
                <input
                  readOnly
                  type="time"
                  value={dadosAgenda?.horarioGeracaoAutomaticaAgenda ?? ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="00:00"
                />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Geração de Agenda
              </label>
              <GerarAgendaButton />
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="bg-white rounded-xl shadow-sm p-5 h-full flex flex-col border border-[#E5E9FA] w-full relative hover:shadow-md transition-shadow"
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsModalPagamentosOpen(true)}
                className="p-2 rounded-full hover:bg-[#8494E9]/10 transition"
                title="Editar configurações de pagamentos"
              >
                <svg
                  className="w-5 h-5 text-[#8494E9]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <div className="group relative flex items-center">
                <button
                  type="button"
                  className="p-1 rounded-full hover:bg-[#8494E9]/10 transition"
                  title="Configure métodos de pagamento e taxas."
                >
                  <svg
                    className="w-5 h-5 text-[#8494E9]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
                <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 max-w-[200px]">
                  Configure métodos de pagamento
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {icons.pagamentos}
              <h2 className="text-lg font-semibold text-gray-800">Pagamentos</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Percentual de Repasse para Jurídico (%)</label>
                <input
                  readOnly
                  type="number"
                  value={dadosPagamentos?.percentualRepasseJuridico ?? ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Percentual de Repasse para Jurídico (%)"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Percentual de Repasse para Autônomo (%)</label>
                <input
                  readOnly
                  type="number"
                  value={dadosPagamentos?.percentualRepasseAutonomo ?? ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Percentual de Repasse para Autônomo (%)"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input 
                    readOnly
                    type="checkbox" 
                    checked={dadosPagamentos?.emitirNotaFiscal ?? false}
                    className="w-4 h-4 text-[#8494E9] border-gray-300 rounded focus:ring-[#8494E9] cursor-not-allowed" 
                  />
                  Emitir nota fiscal
                </label>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm p-5 h-full flex flex-col border border-[#E5E9FA] w-full relative hover:shadow-md transition-shadow"
          >
            <div className="absolute top-4 right-4">
              <div className="group relative flex items-center">
                <button
                  type="button"
                  className="p-1 rounded-full hover:bg-[#8494E9]/10 transition"
                  title="Ajuste notificações, e-mails e lembretes."
                >
                  <svg
                    className="w-5 h-5 text-[#8494E9]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
                <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 max-w-[200px]">
                  Configure notificações e e-mails
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {icons.comunicacao}
              <h2 className="text-lg font-semibold text-gray-800">Comunicação</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                className="border border-gray-200 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition"
                placeholder="Email Host"
              />
              <input
                type="number"
                className="border border-gray-200 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition"
                placeholder="Email Port"
              />
              <input
                className="border border-gray-200 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition"
                placeholder="Email User"
              />
              <input
                className="border border-gray-200 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition"
                placeholder="Email Password"
              />
              <input
                className="border border-gray-200 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition"
                placeholder="Email From"
              />
              <input
                type="number"
                className="border border-gray-200 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition"
                placeholder="Lembrete antes da consulta (min)"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-[#8494E9] border-gray-300 rounded focus:ring-[#8494E9]" 
                />
                Enviar notificação SMS
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-[#8494E9] border-gray-300 rounded focus:ring-[#8494E9]" 
                />
                Enviar notificação Push
              </label>
            </div>
          </motion.section>


          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.45 }}
            className="bg-white rounded-xl shadow-sm p-5 h-full flex flex-col border border-[#E5E9FA] w-full max-w-md mx-auto relative hover:shadow-md transition-shadow"
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsModalRedesSociaisOpen(true)}
                className="p-2 rounded-full hover:bg-[#8494E9]/10 transition"
                title="Editar redes sociais"
              >
                <svg
                  className="w-5 h-5 text-[#8494E9]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <div className="group relative flex items-center">
                <button
                  type="button"
                  className="p-1 rounded-full hover:bg-[#8494E9]/10 transition"
                  title="Adicione links das redes sociais da estação."
                >
                  <svg
                    className="w-5 h-5 text-[#8494E9]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
                <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 max-w-[200px]">
                  Configure redes sociais
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {icons.publicar}
              <h2 className="text-lg font-semibold text-gray-800">Publicar</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Facebook</label>
                <input
                  readOnly
                  value={redesSociais && redesSociais.length > 0 ? (redesSociais[0].Facebook ?? '') : ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Facebook"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Instagram</label>
                <input
                  readOnly
                  value={redesSociais && redesSociais.length > 0 ? (redesSociais[0].Instagram ?? '') : ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="Instagram"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">LinkedIn</label>
                <input
                  readOnly
                  value={redesSociais && redesSociais.length > 0 ? (redesSociais[0].Linkedin ?? '') : ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="LinkedIn"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">YouTube</label>
                <input
                  readOnly
                  value={redesSociais && redesSociais.length > 0 ? (redesSociais[0].Youtube ?? '') : ''}
                  className="border border-gray-200 rounded-lg px-3 py-2 w-full bg-gray-50 cursor-not-allowed text-gray-700"
                  placeholder="YouTube"
                />
              </div>
            </div>
          </motion.section>
        </div>

        {/* Coluna 3: Informações adicionais */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="col-span-1 hidden lg:block"
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Cartão de informações sobre a estação */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-[#E5E9FA]">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Informações da Estação
              </h2>
              <p className="text-gray-700 text-sm mb-2">
                <span className="font-semibold">Razão Social:</span> MINDFLUENCE PSICOLOGIA LTDA
              </p>
              <p className="text-gray-700 text-sm mb-2">
                <span className="font-semibold">CNPJ:</span> 54.222.003/0001-07
              </p>
              <p className="text-gray-700 text-sm mb-2">
                <span className="font-semibold">Endereço:</span> Al. Rio Negro, 503 - Sala 2020, CEP: 06454-000 - Alphaville Industrial - Barueri, SP - Brasil
              </p>
              <p className="text-gray-700 text-sm mb-2">
                <span className="font-semibold">Telefone:</span> (11) 96089-2131
              </p>
              <p className="text-gray-700 text-sm mb-2">
                <span className="font-semibold">Email:</span> contato@estacaoterapia.com.br
              </p>
              <p className="text-gray-700 text-sm">
                <span className="font-semibold">Último Acesso:</span> {ultimoAcesso}
              </p>
            </div>

            {/* Cartão de dicas e suporte */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-[#E5E9FA]">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Dicas e Suporte
              </h2>
              <ul className="list-disc list-inside text-gray-700 text-sm mb-4 space-y-2">
                <li>
                  Consulte a{" "}
                  <a
                    href="#"
                    className="text-[#8494E9] hover:underline font-medium"
                  >
                    documentação
                  </a>{" "}
                  para mais informações sobre configurações.
                </li>
                <li>
                  Visite nosso{" "}
                  <a
                    href="#"
                    className="text-[#8494E9] hover:underline font-medium"
                  >
                    fórum de suporte
                  </a>{" "}
                  para tirar dúvidas e compartilhar experiências.
                </li>
                <li>
                  Não esqueça de fazer backup das configurações regularmente.
                </li>
              </ul>
              <p className="text-gray-700 text-sm">
                Para suporte técnico, entre em contato pelo email{" "}
                <a
                  href="mailto:ti_ext@estacaoterapia.com.br"
                  className="text-[#8494E9] hover:underline font-medium"
                >
                  ti_ext@estacaoterapia.com.br
                </a>{" "}
                ou telefone (11) 97689-9324.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <ModalIntegracoesExternas
        isOpen={isModalIntegracoesOpen}
        onClose={() => setIsModalIntegracoesOpen(false)}
      />

      <ModalAgenda
        isOpen={isModalAgendaOpen}
        onClose={() => setIsModalAgendaOpen(false)}
      />

      <ModalPagamentos
        isOpen={isModalPagamentosOpen}
        onClose={() => setIsModalPagamentosOpen(false)}
      />

      <ModalRedesSociais
        isOpen={isModalRedesSociaisOpen}
        onClose={() => setIsModalRedesSociaisOpen(false)}
      />
    </main>
  );
}
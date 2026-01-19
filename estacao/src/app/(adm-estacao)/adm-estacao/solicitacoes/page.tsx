"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAllSolicitacoes, useUpdateSolicitacao, useDeleteSolicitacao, useFilterSolicitacoes, useAddResponse, useCreateSolicitacao } from "@/hooks/solicitacaoHook";
import { Solicitacao, CreateSolicitacaoData } from "@/types/solicitacaoTypes";
import { parseThreadFromLog } from "@/utils/solicitacaoThread";
import { api } from "@/lib/axios";
import ModalCriarSolicitacao from "@/components/ModalCriarSolicitacao";
import toast from "react-hot-toast";

// Ícones SVG
const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12s3.5-7 10.5-7 10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={2} />
  </svg>
);

const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L9 13z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7l1 1" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h10" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// Todos os tipos de solicitação para adm-estacao
const TIPOS_SOLICITACAO = [
  { value: "Acessibilidade para Pessoas Com Deficiência", label: "Acessibilidade para Pessoas Com Deficiência" },
  { value: "Alteração de Cartão Crédito", label: "Alteração de Cartão Crédito" },
  { value: "Atraso no Recebimento do Pagamento", label: "Atraso no Recebimento do Pagamento" },
  { value: "Atualização de Nome Social ou Gênero", label: "Atualização de Nome Social ou Gênero" },
  { value: "Ausência/erro de notificação de sessão", label: "Ausência/erro de notificação de sessão" },
  { value: "Cancelamento de Sessão Indevidamente", label: "Cancelamento de Sessão Indevidamente" },
  { value: "Cobrança após cancelamento do plano", label: "Cobrança após cancelamento do plano" },
  { value: "Cobrança de Multa Indevida", label: "Cobrança de Multa Indevida" },
  { value: "Cobrança Recorrente no Cartão de Crédito", label: "Cobrança Recorrente no Cartão de Crédito" },
  { value: "Compra Efetuada - Saldo Não Creditada", label: "Compra Efetuada - Saldo Não Creditada" },
  { value: "Conta comprometida / suspeita de invasão", label: "Conta comprometida / suspeita de invasão" },
  { value: "Contestação de avaliação baixa/negativa (review)", label: "Contestação de avaliação baixa/negativa (review)" },
  { value: "Contestação de Classificação Programa de Reconhecimento", label: "Contestação de Classificação Programa de Reconhecimento" },
  { value: "Contestação de dedução contratual por cancelamento", label: "Contestação de dedução contratual por cancelamento" },
  { value: "Contestação de Penalização", label: "Contestação de Penalização" },
  { value: "Contestação de Perda de Prazo para Solicitação de Saque", label: "Contestação de Perda de Prazo para Solicitação de Saque" },
  { value: "Contestação de Premiação e Reconhecimento", label: "Contestação de Premiação e Reconhecimento" },
  { value: "Denúncia de comportamento inadequado do paciente", label: "Denúncia de comportamento inadequado do paciente" },
  { value: "Dúvida", label: "Dúvida" },
  { value: "Dúvida sobre percentual de repasse contratual", label: "Dúvida sobre percentual de repasse contratual" },
  { value: "Dúvidas sobre regras de cancelamento e reagendamento", label: "Dúvidas sobre regras de cancelamento e reagendamento" },
  { value: "Erro de login/autenticação ou acesso", label: "Erro de login/autenticação ou acesso" },
  { value: "Erro na exibição de dados pessoais/profissionais", label: "Erro na exibição de dados pessoais/profissionais" },
  { value: "Erro na exibição do extrato financeiro (inconsistência)", label: "Erro na exibição do extrato financeiro (inconsistência)" },
  { value: "Erro no agendamento ou reagendamento de sessões", label: "Erro no agendamento ou reagendamento de sessões" },
  { value: "Erro no cadastro/upload de documentação", label: "Erro no cadastro/upload de documentação" },
  { value: "Erro no cálculo da média de avaliações", label: "Erro no cálculo da média de avaliações" },
  { value: "Fale Conosco", label: "Fale Conosco" },
  { value: "Falha de conexão na videoconferência ou chat", label: "Falha de conexão na videoconferência ou chat" },
  { value: "Falta ética do Psicólogo(a)", label: "Falta ética do Psicólogo(a)" },
  { value: "Migração de Psicólogo(a) PF para PJ", label: "Migração de Psicólogo(a) PF para PJ" },
  { value: "Mudança de Plano não ocorreu", label: "Mudança de Plano não ocorreu" },
  { value: "Não recebi o valor integral correspondente às sessões", label: "Não recebi o valor integral correspondente às sessões" },
  { value: "Necessidade de documento fiscal (NF/recibo)", label: "Necessidade de documento fiscal (NF/recibo)" },
  { value: "Outras Solicitações", label: "Outras Solicitações" },
  { value: "Outros Erros em Compras", label: "Outros Erros em Compras" },
  { value: "Prazo de apresentação de documentação vencida", label: "Prazo de apresentação de documentação vencida" },
  { value: "Problema ao solicitar saque", label: "Problema ao solicitar saque" },
  { value: "Problemas na Transação do Pix", label: "Problemas na Transação do Pix" },
  { value: "Problemas para Acessar Sessão", label: "Problemas para Acessar Sessão" },
  { value: "Queixa formal contra conduta profissional", label: "Queixa formal contra conduta profissional" },
  { value: "Reclamações", label: "Reclamações" },
  { value: "Reembolso de pagamentos (funcionalidade ausente)", label: "Reembolso de pagamentos (funcionalidade ausente)" },
  { value: "Solicitação de Exclusão de dados da plataforma", label: "Solicitação de Exclusão de dados da plataforma" },
  { value: "Solicitação de nova abordagem psicoterapêutica", label: "Solicitação de nova abordagem psicoterapêutica" },
  { value: "Solicitação de prontuário/histórico para fins éticos/legais", label: "Solicitação de prontuário/histórico para fins éticos/legais" },
  { value: "Solicitar acesso aos dados pessoais", label: "Solicitar acesso aos dados pessoais" },
  { value: "Solicitar correção de dados pessoais", label: "Solicitar correção de dados pessoais" },
  { value: "Solicitar exclusão de dados/conta", label: "Solicitar exclusão de dados/conta" },
  { value: "Sugestão de novas integrações de pagamento", label: "Sugestão de novas integrações de pagamento" },
  { value: "Sugestões", label: "Sugestões" },
  { value: "Transação de compra não efetuada", label: "Transação de compra não efetuada" },
  { value: "Valor Cobrado Desconhecido", label: "Valor Cobrado Desconhecido" },
  { value: "Valor Cobrado em Duplicidade", label: "Valor Cobrado em Duplicidade" },
  { value: "Valor desconhecido na fatura", label: "Valor desconhecido na fatura" },
  { value: "Solicitação de Descredenciamento Voluntário", label: "Solicitação de Descredenciamento Voluntário" },
  { value: "Apresentação de Defesa de Não Conformidade", label: "Apresentação de Defesa de Não Conformidade" },
  { value: "Apresentação de Recurso de Não Conformidade", label: "Apresentação de Recurso de Não Conformidade" },
  { value: "Contestação por Erro Material Pós-Pagamento", label: "Contestação por Erro Material Pós-Pagamento" },
  { value: "Contestação de Apuração - Estação Valoriza", label: "Contestação de Apuração - Estação Valoriza" },
];

export default function SolicitacoesPage() {
  const [pagina, setPagina] = useState(1);
  const porPagina = 5;
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; solicitacao?: Solicitacao; modo?: "view" | "edit" }>({ open: false });
  const { solicitacoes, isLoading, isError, refetch } = useAllSolicitacoes();
  const { deleteSolicitacao, isLoading: isDeleting } = useDeleteSolicitacao();
  const { filterSolicitacoes, isLoading: isFiltering } = useFilterSolicitacoes();
  const { updateSolicitacaoAsync, isLoading: isUpdating } = useUpdateSolicitacao();
  const { addResponseAsync, isLoading: isAddingResponse } = useAddResponse();
  const { createSolicitacaoAsync } = useCreateSolicitacao();
  
  // Estado para resposta no modal
  const [novaResposta, setNovaResposta] = useState("");
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  
  // Buscar solicitação atualizada quando modal abrir
  const solicitacaoAtual = React.useMemo(() => {
    if (!modal.solicitacao) return null;
    return solicitacoes.find(s => s.Id === modal.solicitacao?.Id) || modal.solicitacao;
  }, [modal.solicitacao, solicitacoes]);

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; solicitacao?: Solicitacao }>({ open: false });
  const [documentoModal, setDocumentoModal] = useState<{ open: boolean; loading: boolean; url: string | null; nome?: string; error?: string | null }>({ open: false, loading: false, url: null });

  const getSignedDocumentUrl = async (documentId: string): Promise<string | null> => {
    try {
      const response = await api.get(`/files/documents/${documentId}`);
      return response.data?.url || null;
    } catch (error) {
      console.error('[getSignedDocumentUrl] Erro ao buscar URL assinada:', error);
      return null;
    }
  };

  // Filtros extras
  const [tipoFiltro, setTipoFiltro] = useState<string | null>(null);
  const [slaFiltro, setSlaFiltro] = useState<string | null>(null);

  // Filtro de busca e status
  const solicitacoesFiltradas = (solicitacoes ?? []).filter(
    s =>
      (statusFiltro === null || s.Status === statusFiltro) &&
      (busca === "" ||
        (s.Title?.toLowerCase().includes(busca.toLowerCase())) ||
        (s.Tipo?.toLowerCase().includes(busca.toLowerCase())))
  );
  const total = solicitacoesFiltradas.length;
  const totalPaginas = Math.ceil(total / porPagina);
  const paginados = solicitacoesFiltradas.slice((pagina - 1) * porPagina, pagina * porPagina);

  // Cards
  const totalRecebidas = (solicitacoes ?? []).filter(s => s.Status === "Pendente" || s.Status === "Em Análise").length;
  const totalResolvidas = (solicitacoes ?? []).filter(s => s.Status === "Aprovado" || s.Status === "Concluído").length;
  const totalCanceladas = (solicitacoes ?? []).filter(s => s.Status === "Recusado").length;
  // Média do tempo de resposta (SLA) de todas as solicitações
  const todasComSLA = (solicitacoes ?? []).filter(s => typeof s.SLA === "number");
  const tempoMedioResposta =
    todasComSLA.length > 0
      ? Math.round(todasComSLA.reduce((acc, cur) => acc + (cur.SLA ?? 0), 0) / todasComSLA.length)
      : 0;

  // Data atual
  function getDataAtualFormatada() {
    const dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const hoje = new Date();
    const diaSemana = dias[hoje.getDay()];
    const dia = String(hoje.getDate()).padStart(2, "0");
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const ano = hoje.getFullYear();
    return `${diaSemana} - ${dia}/${mes}/${ano}`;
  }

  // Função para aplicar filtros
  function aplicarFiltros() {
    const params: { tipo?: string; status?: string; Title?: string; startDate?: Date; endDate?: Date } = {};
    if (tipoFiltro) params.tipo = tipoFiltro;
    if (statusFiltro) params.status = statusFiltro;
    if (busca) params.Title = busca;
    filterSolicitacoes(params);
  }

  return (
    <main className="w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Solicitações Recebidas</h1>
            <p className="text-sm text-gray-500">{getDataAtualFormatada()}</p>
          </div>
          <button
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#8494E9] text-white rounded-lg shadow-sm hover:bg-[#6B7DE0] transition-all font-medium"
            onClick={() => setModalCriarAberto(true)}
          >
            <PlusIcon />
            <span>Criar</span>
          </button>
        </div>
      </motion.div>

      {/* Cards de métricas */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <button
          className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-all text-left ${
            statusFiltro === "Pendente" || statusFiltro === "Em Análise" ? "border-[#8494E9] ring-2 ring-[#8494E9]" : "border-[#E5E9FA]"
          }`}
          onClick={() => { setStatusFiltro("Pendente"); setPagina(1); }}
        >
          <span className="text-sm font-medium text-gray-500 block mb-1">Pendentes</span>
          <span className="text-3xl font-bold text-[#8494E9]">{totalRecebidas}</span>
        </button>
        <button
          className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-all text-left ${
            statusFiltro === "Aprovado" || statusFiltro === "Concluído" ? "border-green-500 ring-2 ring-green-500" : "border-[#E5E9FA]"
          }`}
          onClick={() => { setStatusFiltro("Aprovado"); setPagina(1); }}
        >
          <span className="text-sm font-medium text-gray-500 block mb-1">Aprovadas</span>
          <span className="text-3xl font-bold text-green-600">{totalResolvidas}</span>
        </button>
        <button
          className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-all text-left ${
            statusFiltro === "Recusado" ? "border-red-500 ring-2 ring-red-500" : "border-[#E5E9FA]"
          }`}
          onClick={() => { setStatusFiltro("Recusado"); setPagina(1); }}
        >
          <span className="text-sm font-medium text-gray-500 block mb-1">Recusadas</span>
          <span className="text-3xl font-bold text-red-600">{totalCanceladas}</span>
        </button>
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-5 text-left">
          <span className="text-sm font-medium text-gray-500 block mb-1">SLA Médio</span>
          <span className="text-3xl font-bold text-[#8494E9]">{tempoMedioResposta} min</span>
        </div>
      </motion.div>

      {/* Filtro ativo */}
      {statusFiltro && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4 flex items-center gap-2"
        >
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#8494E9]/10 text-[#8494E9] text-sm font-medium border border-[#8494E9]/20">
            Filtro: {statusFiltro}
          </span>
          <button
            className="text-sm text-[#8494E9] hover:underline font-medium"
            onClick={() => setStatusFiltro(null)}
          >
            Remover filtro
          </button>
        </motion.div>
      )}

      {/* Painel de filtros */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-5 mb-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {/* Busca */}
          <div className="relative lg:col-span-2">
            <input
              type="text"
              placeholder="Buscar por título ou tipo..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <SearchIcon />
            </div>
          </div>

          {/* Filtro de Tipo */}
          <div className="relative">
            <select
              className="w-full appearance-none pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all bg-white cursor-pointer"
              value={tipoFiltro ?? ""}
              onChange={e => setTipoFiltro(e.target.value || null)}
            >
              <option value="">Todos os tipos</option>
              <option value="Financeiro">Financeiro</option>
              <option value="Cadastro">Cadastro</option>
              <option value="Cancelamento">Cancelamento</option>
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <FilterIcon />
            </div>
          </div>

          {/* Filtro de SLA */}
          <div className="relative">
            <select
              className="w-full appearance-none pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all bg-white cursor-pointer"
              value={slaFiltro ?? ""}
              onChange={e => setSlaFiltro(e.target.value || null)}
            >
              <option value="">Todos SLA</option>
              <option value="30">Até 30 min</option>
              <option value="60">Até 60 min</option>
              <option value="120">Até 120 min</option>
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <FilterIcon />
            </div>
          </div>

          {/* Botão Filtrar */}
          <button
            className="px-5 py-2.5 bg-[#8494E9] text-white rounded-lg font-medium hover:bg-[#6B7DE0] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={aplicarFiltros}
            disabled={isFiltering}
          >
            {isFiltering ? "Filtrando..." : "Filtrar"}
          </button>
        </div>

        {/* Info de total e paginação */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span className="text-sm font-medium text-gray-600">
            {total > 0 ? (
              <>Total: <span className="text-[#8494E9] font-semibold">{total}</span> {total === 1 ? 'solicitação' : 'solicitações'}</>
            ) : (
              "Nenhuma solicitação encontrada"
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
            >
              ← Anterior
            </button>
            <span className="text-sm font-medium text-gray-600 px-3">
              {pagina} / {totalPaginas || 1}
            </span>
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas || totalPaginas === 0}
            >
              Próxima →
            </button>
          </div>
        </div>
      </motion.div>
      {/* Tabela de solicitações */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gradient-to-r from-[#8494E9]/5 to-[#8494E9]/10">
              <tr>
                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Protocolo</th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Tipo</th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Título</th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">SLA</th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-500 font-medium">Carregando solicitações...</p>
                    </div>
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">⚠️</span>
                      <p className="text-red-500 font-medium">Erro ao carregar solicitações</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && paginados.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">📋</span>
                      <p className="text-gray-500 font-medium">Nenhuma solicitação encontrada</p>
                      <p className="text-sm text-gray-400">Tente ajustar os filtros de busca</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && paginados.map((item) => (
                <tr key={item.Id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6 text-sm font-mono text-gray-700">{item.Protocol}</td>
                  <td className="py-4 px-6 text-sm text-gray-600">{item.Tipo}</td>
                  <td className="py-4 px-6 text-sm font-medium text-gray-900">{item.Title}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      item.Status === "Aprovado" || item.Status === "Concluído"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : item.Status === "Recusado"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : item.Status === "Em Análise"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                    }`}>
                      {item.Status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">{item.SLA ? `${item.SLA} min` : "-"}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1.5 text-gray-400 hover:text-[#8494E9] hover:bg-[#8494E9]/5 rounded transition-all"
                        title="Visualizar"
                        onClick={() => setModal({ open: true, solicitacao: item, modo: "view" })}
                      >
                        <EyeIcon />
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-[#8494E9] hover:bg-[#8494E9]/5 rounded transition-all"
                        title="Editar"
                        onClick={() => {
                          setModal({ open: true, solicitacao: item, modo: "edit" });
                          setNovaResposta("");
                        }}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                        title="Deletar"
                        onClick={() => setConfirmDelete({ open: true, solicitacao: item })}
                        disabled={isDeleting}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
      {/* Modal de confirmação de exclusão */}
      {confirmDelete.open && confirmDelete.solicitacao && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Confirmar exclusão</h2>
              <p className="mb-6 text-gray-600">
                Tem certeza que deseja excluir a solicitação <span className="font-mono font-semibold text-gray-900">{confirmDelete.solicitacao.Protocol}</span>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                  onClick={() => setConfirmDelete({ open: false })}
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  className="px-5 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    if (confirmDelete.solicitacao) {
                      try {
                        await deleteSolicitacao(confirmDelete.solicitacao.Id);
                        setConfirmDelete({ open: false });
                      } catch (error) {
                        console.error('Erro ao deletar:', error);
                      }
                    }
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de visualização/edição */}
      {modal.open && solicitacaoAtual && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="rounded-t-xl bg-[#8494E9] px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold text-white">
                {modal.modo === "edit" ? "Editar Solicitação" : "Detalhes da Solicitação"}
              </h2>
              <button
                className="text-white hover:text-gray-200 transition-colors"
                onClick={() => {
                  setModal({ open: false });
                  setNovaResposta("");
                }}
                title="Fechar"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {/* Informações da solicitação - Cards */}
              <div className="p-5 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-gray-50 to-gray-100 mb-6">
                {/* Solicitante */}
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Solicitante</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {solicitacaoAtual.User?.Nome || "Não informado"}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {solicitacaoAtual.User?.Email || "Email não informado"}
                  </p>
                </div>
                {/* Protocolo, Tipo e Status inline */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Protocolo</p>
                    <p className="text-sm font-bold text-gray-900 font-mono break-all">{solicitacaoAtual.Protocol}</p>
                  </div>
                  {solicitacaoAtual.Tipo && (
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Tipo</p>
                      <p className="text-sm font-semibold text-gray-900">{solicitacaoAtual.Tipo}</p>
                    </div>
                  )}
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Status</p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        solicitacaoAtual.Status === "Aprovado" || solicitacaoAtual.Status === "Concluído"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : solicitacaoAtual.Status === "Recusado"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : solicitacaoAtual.Status === "Em Análise"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                      }`}>
                        {solicitacaoAtual.Status}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Título e SLA inline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {solicitacaoAtual.Title && (
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Título</p>
                      <p className="text-sm font-semibold text-gray-900">{solicitacaoAtual.Title}</p>
                    </div>
                  )}
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">SLA</p>
                    <p className="text-sm font-semibold text-gray-900">{solicitacaoAtual.SLA ? `${solicitacaoAtual.SLA} min` : "-"}</p>
                  </div>
                </div>
                {/* Documentos */}
                {(() => {
                  // Se tem Documents (array)
                  if (solicitacaoAtual.Documents && solicitacaoAtual.Documents.length > 0) {
                    return (
                      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Documentos</p>
                        <div className="space-y-2">
                          {solicitacaoAtual.Documents.map((doc) => (
                            <button
                              key={doc.Id}
                              onClick={async () => {
                                if (doc.Id) {
                                  setDocumentoModal({ open: true, loading: true, url: null, nome: doc.Type || solicitacaoAtual.Title, error: null });
                                  try {
                                    const url = await getSignedDocumentUrl(doc.Id);
                                    if (!url) {
                                      setDocumentoModal((prev) => ({ ...prev, loading: false, error: 'Não foi possível obter o documento.' }));
                                      return;
                                    }
                                    setDocumentoModal((prev) => ({ ...prev, loading: false, url }));
                                  } catch {
                                    setDocumentoModal((prev) => ({ ...prev, loading: false, error: 'Erro ao abrir documento.' }));
                                  }
                                }
                              }}
                              className="text-sm text-[#8494E9] hover:text-[#6D75C0] hover:underline transition-colors block"
                            >
                              Visualizar documento
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  
                  // Se tem Documentos (string)
                  if (solicitacaoAtual.Documentos) {
                    return (
                      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Documentos</p>
                        <button
                          onClick={async () => {
                            setDocumentoModal({ open: true, loading: true, url: null, nome: solicitacaoAtual.Title, error: null });
                            try {
                              const response = await api.get(`/solicitacoes/${solicitacaoAtual.Id}/documento`);
                              if (response.data?.url) {
                                setDocumentoModal((prev) => ({ ...prev, loading: false, url: response.data.url }));
                              } else {
                                setDocumentoModal((prev) => ({ ...prev, loading: false, error: 'Não foi possível obter o documento.' }));
                              }
                            } catch {
                              setDocumentoModal((prev) => ({ ...prev, loading: false, error: 'Erro ao abrir documento.' }));
                            }
                          }}
                          className="text-sm text-[#8494E9] hover:text-[#6D75C0] hover:underline transition-colors"
                        >
                          Visualizar documento
                        </button>
                      </div>
                    );
                  }
                  
                  return null;
                })()}
              </div>

              {/* Thread de conversa */}
              <div className="mb-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-[#8494E9] uppercase tracking-wider mb-4">Histórico de Conversa</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {(() => {
                    const thread = parseThreadFromLog(solicitacaoAtual.Log);
                    if (thread.mensagens.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          Nenhuma mensagem ainda
                        </div>
                      );
                    }
                    return thread.mensagens.map((msg, idx) => (
                      <div
                        key={msg.id || idx}
                        className={`flex ${msg.autor === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.autor === 'admin'
                              ? 'bg-[#8494E9] text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <div className="text-xs font-medium mb-1 opacity-80">
                            {msg.autorNome || (msg.autor === 'admin' ? 'Administrador' : 'Paciente')}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{msg.mensagem}</div>
                          <div className="text-xs mt-1 opacity-70">
                            {new Date(msg.data).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Formulário de edição/resposta */}
              {modal.modo === "edit" && (
                <form
                  className="pt-6 border-t border-gray-200"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!solicitacaoAtual) return;
                    
                    const form = e.target as HTMLFormElement;
                    const status = (form.status as HTMLSelectElement).value;
                    const resposta = novaResposta.trim();
                    
                    try {
                      // Se houver resposta, adiciona à thread
                      if (resposta) {
                        await addResponseAsync({
                          solicitacaoId: solicitacaoAtual.Id,
                          mensagem: resposta,
                          status: status !== solicitacaoAtual.Status ? status : undefined,
                        });
                      } else if (status !== solicitacaoAtual.Status) {
                        // Se apenas mudou status, atualiza
                        await updateSolicitacaoAsync({
                          id: solicitacaoAtual.Id,
                          dados: { Status: status }
                        });
                      }
                      
                      setNovaResposta("");
                      // Recarregar dados
                      await refetch();
                    } catch (error) {
                      console.error('Erro ao atualizar:', error);
                    }
                  }}
                >
                  <div className="space-y-4">
                    {/* Descrição original (readonly) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Descrição Original</label>
                      <textarea
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 resize-none cursor-not-allowed"
                        value={solicitacaoAtual.Descricao || ''}
                        readOnly
                        disabled
                      />
                    </div>

                    {/* Campo de resposta */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sua Resposta</label>
                      <textarea
                        name="resposta"
                        rows={4}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all resize-none"
                        placeholder="Digite sua resposta..."
                        value={novaResposta}
                        onChange={(e) => setNovaResposta(e.target.value)}
                        disabled={isAddingResponse || isUpdating}
                        required={false}
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Alterar Status</label>
                      <select
                        name="status"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all"
                        defaultValue={solicitacaoAtual.Status}
                        disabled={isAddingResponse || isUpdating}
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Em Análise">Em Análise</option>
                        <option value="Aprovado">Aprovado</option>
                        <option value="Recusado">Recusado</option>
                        <option value="Concluído">Concluído</option>
                      </select>
                    </div>
                  </div>

                  {/* Botões */}
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                      onClick={() => {
                        setModal({ open: false });
                        setNovaResposta("");
                      }}
                      disabled={isAddingResponse || isUpdating}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#8494E9] text-white rounded-lg font-medium hover:bg-[#6B7DE0] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isAddingResponse || isUpdating}
                    >
                      {(isAddingResponse || isUpdating) ? "Salvando..." : novaResposta.trim() ? "Enviar Resposta" : "Atualizar Status"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de visualização de documento */}
      {documentoModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 bg-[#8494E9] text-white">
              <div>
                <p className="text-sm font-semibold">Documento</p>
                {documentoModal.nome && <p className="text-xs text-white/80">{documentoModal.nome}</p>}
              </div>
              <button
                className="p-2 rounded hover:bg-white/10"
                onClick={() => setDocumentoModal({ open: false, loading: false, url: null })}
                aria-label="Fechar"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="p-4 sm:p-6 flex-1 overflow-auto bg-gray-50">
              {documentoModal.loading && (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  Carregando documento...
                </div>
              )}
              {!documentoModal.loading && documentoModal.error && (
                <div className="flex items-center justify-center h-64 text-red-600 text-center">
                  {documentoModal.error}
                </div>
              )}
              {!documentoModal.loading && !documentoModal.error && documentoModal.url && (
                <iframe
                  title="Documento"
                  src={documentoModal.url}
                  className="w-full h-[70vh] bg-white border border-gray-200 rounded-lg shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de criação de solicitação */}
      <ModalCriarSolicitacao
        open={modalCriarAberto}
        onClose={() => setModalCriarAberto(false)}
        tiposSolicitacao={TIPOS_SOLICITACAO}
        onSubmit={async (data: CreateSolicitacaoData) => {
          try {
            await createSolicitacaoAsync(data);
            toast.success("Solicitação criada com sucesso!");
            await refetch();
            setModalCriarAberto(false);
          } catch (error) {
            console.error('Erro ao criar solicitação:', error);
            toast.error("Erro ao criar solicitação. Tente novamente.");
            throw error;
          }
        }}
      />
    </main>
  );
}

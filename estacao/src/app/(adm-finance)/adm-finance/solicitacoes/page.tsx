"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useFinanceSolicitacoes, useUpdateSolicitacao, useDeleteSolicitacao, useFilterSolicitacoes, useAddResponse, useCreateSolicitacao } from "@/hooks/solicitacaoHook";
import { Solicitacao, CreateSolicitacaoData } from "@/types/solicitacaoTypes";
import { parseThreadFromLog } from "@/utils/solicitacaoThread";
import ModalCriarSolicitacao from "@/components/ModalCriarSolicitacao";
import toast from "react-hot-toast";
import { api } from "@/lib/axios";
import { admFinanceService } from "@/services/admFinanceService";
import { psicologoService } from "@/services/psicologo";
import type { Psicologo } from "@/types/psicologoTypes";
import type { FinanceiroPsicologo } from "@/types/admFinanceTypes";

// Type guard para verificar se é um erro do Axios
interface AxiosErrorLike {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

const isAxiosError = (error: unknown): error is AxiosErrorLike => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as AxiosErrorLike).response === 'object'
  );
};

// Tipos de solicitações financeiras definidos localmente
const TIPOS_FINANCEIROS = [
  { value: "Atraso no Recebimento do Pagamento", label: "Atraso no Recebimento do Pagamento" },
  { value: "Cobrança após cancelamento do plano", label: "Cobrança após cancelamento do plano" },
  { value: "Cobrança de Multa Indevida", label: "Cobrança de Multa Indevida" },
  { value: "Cobrança Recorrente no Cartão de Crédito", label: "Cobrança Recorrente no Cartão de Crédito" },
  { value: "Compra Efetuada - Saldo Não Creditada", label: "Compra Efetuada - Saldo Não Creditada" },
  { value: "Contestação de dedução contratual por cancelamento", label: "Contestação de dedução contratual por cancelamento" },
  { value: "Contestação de Perda de Prazo para Solicitação de Saque", label: "Contestação de Perda de Prazo para Solicitação de Saque" },
  { value: "Dúvida sobre percentual de repasse contratual", label: "Dúvida sobre percentual de repasse contratual" },
  { value: "Erro na exibição do extrato financeiro (inconsistência)", label: "Erro na exibição do extrato financeiro (inconsistência)" },
  { value: "Não recebi o valor integral correspondente às sessões", label: "Não recebi o valor integral correspondente às sessões" },
  { value: "Necessidade de documento fiscal (NF/recibo)", label: "Necessidade de documento fiscal (NF/recibo)" },
  { value: "Problema ao solicitar saque", label: "Problema ao solicitar saque" },
  { value: "Problemas na Transação do Pix", label: "Problemas na Transação do Pix" },
  { value: "Reembolso de pagamentos (funcionalidade ausente)", label: "Reembolso de pagamentos (funcionalidade ausente)" },
  { value: "Sugestão de novas integrações de pagamento", label: "Sugestão de novas integrações de pagamento" },
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

// Palavras-chave financeiras para identificação
const KEYWORDS_FINANCEIROS = [
  'pagamento', 'saque', 'cobrança', 'cobranca', 'multa', 'reembolso', 'fatura',
  'financeiro', 'financeira', 'extrato', 'cartão', 'cartao', 'credito', 'crédito',
  'pix', 'transação', 'transacao', 'valor', 'desconto', 'repasse', 'cancelamento-plano',
  'descredenciamento', 'não conformidade', 'nao conformidade', 'recurso', 'contestação',
  'contestacao', 'apuração', 'apuracao', 'estação valoriza', 'estacao valoriza',
  'erro material', 'pós-pagamento', 'pos-pagamento'
];

// Status normalizados para solicitações
const STATUS_SOLICITACAO = {
  PENDENTE: "Pendente",
  EM_ANALISE: "Em Análise",
  APROVADO: "Aprovado",
  RECUSADO: "Recusado",
  CONCLUIDO: "Concluído"
} as const;

// Mapeia variações de status para o padrão normalizado
const normalizarStatus = (status: string | null | undefined): string => {
  if (!status) return STATUS_SOLICITACAO.PENDENTE;
  
  const statusLower = status.toLowerCase().trim();
  
  // Remove acentos e caracteres especiais
  const statusNormalizado = statusLower
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ''); // Remove espaços
  
  // Mapeia variações específicas
  if (statusNormalizado.includes('pagamentoemanalis') || 
      statusNormalizado.includes('emanalis') || 
      statusNormalizado.includes('emanalise') ||
      statusNormalizado.includes('analise')) {
    return STATUS_SOLICITACAO.EM_ANALISE;
  }
  if (statusNormalizado.includes('pendente')) {
    return STATUS_SOLICITACAO.PENDENTE;
  }
  if (statusNormalizado.includes('aprovad') || statusNormalizado.includes('concluido')) {
    return STATUS_SOLICITACAO.APROVADO;
  }
  if (statusNormalizado.includes('recusad') || statusNormalizado.includes('negad')) {
    return STATUS_SOLICITACAO.RECUSADO;
  }
  
  return status; // Retorna original se não identificado
};

// Função para verificar se é tipo financeiro
const isTipoFinanceiro = (tipo: string | null | undefined): boolean => {
  if (!tipo) return false;
  const tipoLower = tipo.toLowerCase();
  
  // Verifica se está na lista de tipos específicos
  const isInList = TIPOS_FINANCEIROS.some(t => 
    tipoLower === t.value.toLowerCase() ||
    tipoLower.includes(t.value.toLowerCase()) ||
    t.value.toLowerCase().includes(tipoLower)
  );
  
  if (isInList) return true;
  
  // Verifica se contém alguma palavra-chave financeira
  return KEYWORDS_FINANCEIROS.some(keyword => tipoLower.includes(keyword.toLowerCase()));
};

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

export default function SolicitacoesPage() {
  const [pagina, setPagina] = useState(1);
  const porPagina = 5;
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; solicitacao?: Solicitacao; modo?: "view" | "edit" }>({ open: false });
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const { solicitacoes, isLoading, isError, error: errorHook, refetch } = useFinanceSolicitacoes();
  const { deleteSolicitacao, isLoading: isDeleting } = useDeleteSolicitacao();
  const { filterSolicitacoes, isLoading: isFiltering } = useFilterSolicitacoes();
  const { updateSolicitacaoAsync, isLoading: isUpdating } = useUpdateSolicitacao();
  const { addResponseAsync, isLoading: isAddingResponse } = useAddResponse();
  const { createSolicitacaoAsync } = useCreateSolicitacao();
  
  // Estado para resposta no modal
  const [novaResposta, setNovaResposta] = useState("");
  
  // Estado para documentos fiscais
  const [documentoFiscal, setDocumentoFiscal] = useState<{ url: string; nome: string; periodo?: string } | null>(null);
  const [loadingPsicologo, setLoadingPsicologo] = useState(false);
  
  // Buscar solicitação atualizada quando modal abrir
  const solicitacaoAtual = useMemo(() => {
    if (!modal.solicitacao) return null;
    return solicitacoes.find(s => s.Id === modal.solicitacao?.Id) || modal.solicitacao;
  }, [modal.solicitacao, solicitacoes]);

  // Buscar psicólogo e documentos fiscais quando modal abrir
  useEffect(() => {
    if (!modal.open || !solicitacaoAtual?.UserId) {
      setDocumentoFiscal(null);
      return;
    }

    const buscarPsicologoEDocumentos = async () => {
      setLoadingPsicologo(true);
      try {
        // Buscar psicólogo
        const psicologoResponse = await psicologoService().getPsicologoId(solicitacaoAtual.UserId);
        if (psicologoResponse.data) {
          const psicologoData = psicologoResponse.data as Psicologo;

          // Verificar se é solicitação de saque
          const isSolicitacaoSaque = solicitacaoAtual.Tipo?.toLowerCase().includes('saque') || 
                                     solicitacaoAtual.Title?.toLowerCase().includes('saque');

          if (isSolicitacaoSaque) {
            // Verificar tipo de pessoa
            const tipoPessoa = psicologoData.PessoalJuridica ? "Pessoa Jurídica" : "Autônomo";
            
            // Buscar pagamentos do psicólogo para obter documentos fiscais
            const pagamentosResponse = await admFinanceService().listarPagamentosPsicologos({
              psicologoId: solicitacaoAtual.UserId,
              pageSize: 100
            });

            if (pagamentosResponse.data?.success && pagamentosResponse.data?.data?.items) {
              const pagamentos = pagamentosResponse.data.data.items as FinanceiroPsicologo[];
              
              // Encontrar pagamento mais recente com documento fiscal
              const pagamentoComDocumento = pagamentos
                .filter(p => p.UrlDocumentoStorage)
                .sort((a, b) => {
                  const dataA = new Date(a.UpdatedAt || a.CreatedAt).getTime();
                  const dataB = new Date(b.UpdatedAt || b.CreatedAt).getTime();
                  return dataB - dataA;
                })[0];

              if (pagamentoComDocumento?.UrlDocumentoStorage) {
                // Resolver URL do storage
                const urlResolvida = pagamentoComDocumento.UrlDocumentoStorage.startsWith('http') 
                  ? pagamentoComDocumento.UrlDocumentoStorage
                  : `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/storage/v1/object/public/${pagamentoComDocumento.UrlDocumentoStorage}`;
                
                setDocumentoFiscal({
                  url: urlResolvida,
                  nome: tipoPessoa === "Pessoa Jurídica" ? "Nota Fiscal" : "Recibo/Comprovante",
                  periodo: pagamentoComDocumento.Periodo || undefined
                });
              } else {
                // Se não houver documento nos pagamentos, verificar documentos do perfil profissional
                const documentos = psicologoData.ProfessionalProfiles?.flatMap(profile => profile.Documents || []) || [];
                const documentoFiscalDoc = documentos.find(doc => 
                  doc.Type?.toLowerCase().includes('fiscal') || 
                  doc.Type?.toLowerCase().includes('nota') ||
                  doc.Type?.toLowerCase().includes('recibo')
                );

                if (documentoFiscalDoc?.Url) {
                  const urlResolvida = documentoFiscalDoc.Url.startsWith('http')
                    ? documentoFiscalDoc.Url
                    : `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/storage/v1/object/public/${documentoFiscalDoc.Url}`;
                  
                  setDocumentoFiscal({
                    url: urlResolvida,
                    nome: documentoFiscalDoc.Type || (tipoPessoa === "Pessoa Jurídica" ? "Nota Fiscal" : "Recibo/Comprovante")
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar psicólogo e documentos:', error);
      } finally {
        setLoadingPsicologo(false);
      }
    };

    buscarPsicologoEDocumentos();
  }, [modal.open, solicitacaoAtual?.UserId, solicitacaoAtual?.Tipo, solicitacaoAtual?.Title]);

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; solicitacao?: Solicitacao }>({ open: false });
  const [documentoModal, setDocumentoModal] = useState<{ open: boolean; loading: boolean; url: string | null; nome?: string; error?: string | null }>({ open: false, loading: false, url: null });

  const getSignedFinanceDocumentUrl = async (documentId: string): Promise<string | null> => {
    try {
      const response = await api.get(`/files/documents/${documentId}`);
      return response.data?.url || null;
    } catch (error) {
      console.error('[getSignedFinanceDocumentUrl] Erro ao buscar URL assinada:', error);
      return null;
    }
  };

  const abrirDocumento = async (item: Solicitacao) => {
    if (!item.Documentos) return;
    setDocumentoModal({ open: true, loading: true, url: null, nome: item.Title, error: null });
    try {
      const url = await getSignedFinanceDocumentUrl(String(item.Documentos));
      if (!url) {
        setDocumentoModal((prev) => ({ ...prev, loading: false, error: 'Não foi possível obter o documento.' }));
        return;
      }
      setDocumentoModal((prev) => ({ ...prev, loading: false, url }));
    } catch {
      setDocumentoModal((prev) => ({ ...prev, loading: false, error: 'Erro ao abrir documento.' }));
    }
  };

  // Filtros extras
  const [tipoFiltro, setTipoFiltro] = useState<string | null>(null);
  const [slaFiltro, setSlaFiltro] = useState<string | null>(null);

  // Filtrar apenas solicitações financeiras
  const solicitacoesFinanceiras = useMemo(() => {
    return (solicitacoes ?? []).filter(s => isTipoFinanceiro(s.Tipo));
  }, [solicitacoes]);

  // Filtro de busca, status e tipo (apenas em solicitações financeiras)
  const solicitacoesFiltradas = solicitacoesFinanceiras.filter(
    s =>
      (statusFiltro === null || normalizarStatus(s.Status) === statusFiltro) &&
      (tipoFiltro === null || s.Tipo === tipoFiltro) &&
      (busca === "" ||
        (s.Title?.toLowerCase().includes(busca.toLowerCase())) ||
        (s.Tipo?.toLowerCase().includes(busca.toLowerCase())))
  );
  const total = solicitacoesFiltradas.length;
  const totalPaginas = Math.ceil(total / porPagina);
  const paginados = solicitacoesFiltradas.slice((pagina - 1) * porPagina, pagina * porPagina);

  // Cards (apenas financeiras)
  const totalRecebidas = solicitacoesFinanceiras.filter(s => 
    normalizarStatus(s.Status) === STATUS_SOLICITACAO.PENDENTE || 
    normalizarStatus(s.Status) === STATUS_SOLICITACAO.EM_ANALISE
  ).length;
  const totalResolvidas = solicitacoesFinanceiras.filter(s => 
    normalizarStatus(s.Status) === STATUS_SOLICITACAO.APROVADO || 
    normalizarStatus(s.Status) === STATUS_SOLICITACAO.CONCLUIDO
  ).length;
  const totalCanceladas = solicitacoesFinanceiras.filter(s => 
    normalizarStatus(s.Status) === STATUS_SOLICITACAO.RECUSADO
  ).length;
  // Média do tempo de resposta (SLA) de todas as solicitações financeiras
  const todasComSLA = solicitacoesFinanceiras.filter(s => typeof s.SLA === "number");
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
    <main className="flex flex-col h-screen w-full overflow-hidden">
      {/* Header Fixo */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 p-6 bg-white border-b border-gray-200"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#212529] mb-2">Solicitações Financeiras</h1>
            <p className="text-sm text-[#6C757D]">{getDataAtualFormatada()}</p>
          </div>
          <button
            onClick={() => setModalCriarAberto(true)}
            className="inline-flex items-center gap-2 bg-[#8494E9] hover:bg-[#6D75C0] text-white font-semibold rounded-lg px-5 py-2.5 transition-all shadow-sm hover:shadow-md text-sm md:text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Criar Solicitação
          </button>
        </div>
      </motion.div>

      {/* Container Scrollável */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Cards de métricas */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <button
          className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-all text-left ${
            statusFiltro === STATUS_SOLICITACAO.PENDENTE || statusFiltro === STATUS_SOLICITACAO.EM_ANALISE ? "border-[#8494E9] ring-2 ring-[#8494E9]" : "border-[#E5E9FA]"
          }`}
          onClick={() => { setStatusFiltro(STATUS_SOLICITACAO.PENDENTE); setPagina(1); }}
        >
          <span className="text-sm font-medium text-gray-500 block mb-1">Pendentes</span>
          <span className="text-3xl font-bold text-[#8494E9]">{totalRecebidas}</span>
        </button>
        <button
          className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-all text-left ${
            statusFiltro === STATUS_SOLICITACAO.APROVADO || statusFiltro === STATUS_SOLICITACAO.CONCLUIDO ? "border-green-500 ring-2 ring-green-500" : "border-[#E5E9FA]"
          }`}
          onClick={() => { setStatusFiltro(STATUS_SOLICITACAO.APROVADO); setPagina(1); }}
        >
          <span className="text-sm font-medium text-gray-500 block mb-1">Aprovadas</span>
          <span className="text-3xl font-bold text-green-600">{totalResolvidas}</span>
        </button>
        <button
          className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-all text-left ${
            statusFiltro === STATUS_SOLICITACAO.RECUSADO ? "border-red-500 ring-2 ring-red-500" : "border-[#E5E9FA]"
          }`}
          onClick={() => { setStatusFiltro(STATUS_SOLICITACAO.RECUSADO); setPagina(1); }}
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
              <option value="">Selecione um tipo...</option>
              {TIPOS_FINANCEIROS.map(tipo => (
                <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
              ))}
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
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#8494E9]/5 to-[#8494E9]/10">
              <tr>
                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Solicitação</th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Tipo</th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Documentos</th>
                <th className="py-4 px-6 text-center text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={3} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-500 font-medium">Carregando solicitações...</p>
                    </div>
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={3} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <span className="text-5xl">⚠️</span>
                      <div className="space-y-3">
                        <p className="text-red-500 font-semibold text-lg">Erro ao carregar solicitações</p>
                        <div className="text-gray-600 text-sm max-w-md space-y-2">
                          <p>
                            {(() => {
                              if (isAxiosError(errorHook)) {
                                return errorHook.response?.status === 401 || errorHook.response?.status === 403 
                                  ? "Você não tem permissão para acessar essas informações ou não está autenticado."
                                  : "Não foi possível conectar com o servidor. Verifique se a API está rodando.";
                              }
                              return "Não foi possível conectar com o servidor. Verifique se a API está rodando.";
                            })()}
                          </p>
                          <p className="text-xs text-gray-500">
                            API: <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:3333</code>
                          </p>
                          {isAxiosError(errorHook) && errorHook.response?.data?.message && (
                            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">
                              {errorHook.response.data.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => refetch()}
                        className="px-5 py-2.5 bg-[#8494E9] text-white rounded-lg font-medium hover:bg-[#6B7DE0] transition-all"
                      >
                        Tentar Novamente
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && paginados.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">📋</span>
                      <p className="text-gray-500 font-medium">Nenhuma solicitação financeira encontrada</p>
                      <p className="text-sm text-gray-400">Tente ajustar os filtros de busca</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && paginados.map((item) => (
                <tr key={item.Id} className="hover:bg-gray-50 transition-colors">
                  {/* Coluna Solicitação: protocolo + título */}
                  <td className="py-4 px-6 align-top">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-mono font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded border border-gray-200 w-fit">
                        {item.Protocol}
                      </span>
                      <p className="text-sm font-medium text-gray-900 leading-snug">{item.Title}</p>
                    </div>
                  </td>

                  {/* Coluna Tipo */}
                  <td className="py-4 px-6 align-top">
                    <span className="px-2.5 py-1 rounded border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700">
                      {item.Tipo}
                    </span>
                  </td>

                  {/* Coluna Status */}
                  <td className="py-4 px-6 align-top">
                    {(() => {
                      const statusNormalizado = normalizarStatus(item.Status);
                      return (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          statusNormalizado === STATUS_SOLICITACAO.APROVADO || statusNormalizado === STATUS_SOLICITACAO.CONCLUIDO
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : statusNormalizado === STATUS_SOLICITACAO.RECUSADO
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : statusNormalizado === STATUS_SOLICITACAO.EM_ANALISE
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                        }`}>
                          {statusNormalizado}
                        </span>
                      );
                    })()}
                  </td>

                  {/* Coluna Documentos */}
                  <td className="py-4 px-6 align-top">
                    {item.Documentos ? (
                      <button
                        onClick={() => abrirDocumento(item)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8494E9] hover:text-[#6D75C0] hover:underline"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Ver documento
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Sem documento</span>
                    )}
                  </td>

                  {/* Coluna Ações */}
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="p-2 text-gray-400 hover:text-[#8494E9] hover:bg-[#8494E9]/5 rounded-lg transition-all"
                        title="Visualizar"
                        onClick={() => setModal({ open: true, solicitacao: item, modo: "view" })}
                      >
                        <EyeIcon />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-[#8494E9] hover:bg-[#8494E9]/5 rounded-lg transition-all"
                        title="Editar"
                        onClick={() => {
                          setModal({ open: true, solicitacao: item, modo: "edit" });
                          setNovaResposta("");
                        }}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 rounded-t-xl bg-[#8494E9] px-6 py-4 flex items-center justify-between z-10">
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
            <div className="p-6">
              {/* Informações da solicitação */}
              <div className="space-y-4 mb-6">
                {/* Protocolo, Tipo e Status inline */}
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Protocolo</label>
                    <p className="text-sm font-mono font-semibold text-gray-900 mt-1">{solicitacaoAtual.Protocol}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</label>
                    <p className="text-sm text-gray-700 mt-1">{solicitacaoAtual.Tipo}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        normalizarStatus(solicitacaoAtual.Status) === STATUS_SOLICITACAO.APROVADO || normalizarStatus(solicitacaoAtual.Status) === STATUS_SOLICITACAO.CONCLUIDO
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : normalizarStatus(solicitacaoAtual.Status) === STATUS_SOLICITACAO.RECUSADO
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : normalizarStatus(solicitacaoAtual.Status) === STATUS_SOLICITACAO.EM_ANALISE
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                      }`}>
                        {normalizarStatus(solicitacaoAtual.Status)}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Título e SLA inline */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Título</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{solicitacaoAtual.Title}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">SLA</label>
                    <p className="text-sm text-gray-700 mt-1">{solicitacaoAtual.SLA ? `${solicitacaoAtual.SLA} min` : "-"}</p>
                  </div>
                </div>
                {/* Documentos - mostrar documento fiscal se for solicitação de saque */}
                {(() => {
                  const isSolicitacaoSaque = solicitacaoAtual.Tipo?.toLowerCase().includes('saque') || 
                                            solicitacaoAtual.Title?.toLowerCase().includes('saque');
                  
                  if (isSolicitacaoSaque && documentoFiscal) {
                    return (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Documentos</label>
                        <button
                          onClick={() => {
                            setDocumentoModal({ open: true, loading: false, url: documentoFiscal.url, nome: documentoFiscal.nome, error: null });
                          }}
                          className="text-sm text-[#8494E9] hover:text-[#6D75C0] hover:underline transition-colors"
                        >
                          {loadingPsicologo ? "Carregando..." : "Visualizar documento"}
                        </button>
                      </div>
                    );
                  }
                  
                  // Fallback para outros tipos de documentos
                  if (solicitacaoAtual.Documents && solicitacaoAtual.Documents.length > 0) {
                    return (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Documentos</label>
                        <div className="space-y-2">
                          {solicitacaoAtual.Documents.map((doc) => (
                            <div key={doc.Id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{doc.Type || "Documento"}</p>
                                {doc.Description && (
                                  <p className="text-xs text-gray-500 truncate">{doc.Description}</p>
                                )}
                              </div>
                              <button
                                onClick={async () => {
                                  if (doc.Id) {
                                    setDocumentoModal({ open: true, loading: true, url: null, nome: doc.Type || solicitacaoAtual.Title, error: null });
                                    try {
                                      const url = await getSignedFinanceDocumentUrl(doc.Id);
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
                                className="ml-2 px-3 py-1.5 text-xs font-medium text-white bg-[#8494E9] rounded hover:bg-[#6D75C0] transition-colors whitespace-nowrap"
                              >
                                Visualizar documento
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  
                  // Se não tem Documents mas tem Documentos (campo string) - usar endpoint de solicitacao
                  if (solicitacaoAtual.Documentos && !solicitacaoAtual.Documents?.length) {
                    return (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Documentos</label>
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
                        defaultValue={normalizarStatus(solicitacaoAtual.Status)}
                        disabled={modal.modo !== "edit"}
                      >
                        <option value={STATUS_SOLICITACAO.PENDENTE}>{STATUS_SOLICITACAO.PENDENTE}</option>
                        <option value={STATUS_SOLICITACAO.EM_ANALISE}>{STATUS_SOLICITACAO.EM_ANALISE}</option>
                        <option value={STATUS_SOLICITACAO.APROVADO}>{STATUS_SOLICITACAO.APROVADO}</option>
                        <option value={STATUS_SOLICITACAO.RECUSADO}>{STATUS_SOLICITACAO.RECUSADO}</option>
                        <option value={STATUS_SOLICITACAO.CONCLUIDO}>{STATUS_SOLICITACAO.CONCLUIDO}</option>
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

      {/* Modal de criação de solicitação */}
      <ModalCriarSolicitacao
        open={modalCriarAberto}
        onClose={() => setModalCriarAberto(false)}
        tiposSolicitacao={TIPOS_FINANCEIROS}
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
      </div>
    </main>
  );
}

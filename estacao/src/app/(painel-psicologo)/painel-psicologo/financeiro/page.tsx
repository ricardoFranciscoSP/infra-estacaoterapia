"use client";
import React, { useState, Fragment, useRef, useEffect, useMemo } from "react";
import { useObterPagamentos, useHistoricoSessoes, useGanhosMensais, useAtendimentosMensais, useSaldoDisponivelResgate, useSaldoRetido } from '@/hooks/psicologos/financeiro.hook';
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import SidebarPsicologo from "../SidebarPsicologo";
// ⚡ PERFORMANCE: Chart.js carregado dinamicamente (lazy load) - reduz bundle inicial em ~200KB
import { LazyBarChart, LazyLineChart } from '@/components/charts/LazyChartWrapper';
import { FormularioSaqueAutonomo } from './FormularioSaqueAutonomo';
import { SaqueStepsModal } from '@/components/SaqueStepsModal';
import { useUserPsicologo } from '@/hooks/user/userPsicologoHook';
import { useFormularioSaqueAutonomoStatus } from '@/hooks/formularioSaqueAutonomoHook';
import { solicitacaoSaqueService } from '@/services/solicitacaoSaqueService';
import toast from 'react-hot-toast';
import useFinanceiroStore from '@/store/psicologos/financeiroStore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// Mock de dados
const pagamentosAReceber = [
  { id: 1, nome: "Consulta João Silva", valor: 120, data: "2024-06-20", status: "A receber" },
  { id: 2, nome: "Consulta Maria Souza", valor: 120, data: "2024-06-22", status: "A receber" },
];
const pagamentosRecebidos = [
  { id: 3, nome: "Consulta Ana Lima", valor: 120, data: "2024-05-25", status: "Recebido" },
  { id: 4, nome: "Consulta Pedro Costa", valor: 120, data: "2024-05-18", status: "Recebido" },
];

// Dados do gráfico Bar serão preparados dinamicamente

const barOptions = {
  plugins: {
    legend: {
      display: true,
      position: "top" as const,
      labels: {
        font: { family: "Fira Sans", size: 12 }
      }
    },
  },
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: "#E5E7EB" }, beginAtZero: true }
  }
};

const lineOptions = {
  plugins: {
    legend: {
      display: true,
      position: "top" as const,
      labels: {
        font: { family: "Fira Sans", size: 12 }
      }
    },
  },
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: "#E5E7EB" }, beginAtZero: true }
  }
};

// Função para calcular fatura do psicólogo
function getFaturaPsicologo(mes: string, ano: string) {
  // Considera consultas recebidas e a receber no período de 01 a 25 do mês
  const consultas = [...pagamentosAReceber, ...pagamentosRecebidos].filter(item => {
    const [anoItem, mesItem, diaItem] = item.data.split("-");
    const dia = parseInt(diaItem);
    return mesItem === mes && anoItem === ano && dia >= 1 && dia <= 25;
  });
  const total = consultas.length * 20;
  return {
    total,
    quantidade: consultas.length,
    periodo: `01/${mes}/${ano} até 25/${mes}/${ano}`,
    pagamento: `30/${mes}/${ano}`

  };
}

export default function FinanceiroPage() {
  const { calculoPagamento } = useObterPagamentos();
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();
  const [now, setNow] = useState<Date | null>(null);
  
  // Dados do psicólogo
  const { psicologo } = useUserPsicologo();
  const psicologoData = psicologo?.user?.[0];
  const { status: formularioStatus, refetch: refetchFormularioStatus } = useFormularioSaqueAutonomoStatus();
  
  // Estados para filtros e paginação
  const [mesFiltro, setMesFiltro] = useState(mesAtual);
  const [anoFiltro, setAnoFiltro] = useState(anoAtual);
  const [mesFiltroGrafico, setMesFiltroGrafico] = useState<number | undefined>(undefined);
  const [anoFiltroGrafico, setAnoFiltroGrafico] = useState(anoAtual);
  const [mesFiltroAtendimentos, setMesFiltroAtendimentos] = useState<number | undefined>(undefined);
  const [anoFiltroAtendimentos, setAnoFiltroAtendimentos] = useState(anoAtual);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Estados para dropdowns
  const [showFiltroGrafico, setShowFiltroGrafico] = useState(false);
  const [showFiltroHistorico, setShowFiltroHistorico] = useState(false);
  const [showFiltroAtendimentos, setShowFiltroAtendimentos] = useState(false);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const currentMonthYearLabel = now
    ? now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '--';
  
  const { historicoSessoes, pagination, isLoading: isLoadingHistorico } = useHistoricoSessoes(mesFiltro, anoFiltro, page, pageSize);
  const { ganhosMensais, isLoading: isLoadingGanhos } = useGanhosMensais(anoFiltroGrafico, mesFiltroGrafico);
  const { atendimentosMensais, isLoading: isLoadingAtendimentos } = useAtendimentosMensais(anoFiltroAtendimentos, mesFiltroAtendimentos);
  const { saldoDisponivelResgate, isLoading: isLoadingSaldo } = useSaldoDisponivelResgate();
  const { saldoRetido, isLoading: isLoadingSaldoRetido } = useSaldoRetido();
  
  // Estados para modais e formulários
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'saque' | 'receita' | 'historico'>("saque");
  const [notaFiscal, setNotaFiscal] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [modalHistoricoOpen, setModalHistoricoOpen] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [saqueStep, setSaqueStep] = useState<'formulario' | 'notaFiscal'>('formulario');
  const [saqueModalOpen, setSaqueModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Buscar fatura do período
  const obterFaturaPeriodo = useFinanceiroStore(state => state.obterFaturaPeriodo);
  const faturaPeriodo = useFinanceiroStore(state => state.faturaPeriodo);
  const isLoadingFaturaPeriodo = useFinanceiroStore(state => state.isLoadingFaturaPeriodo);
  
  // Buscar fatura quando o modal de saque for aberto no step de nota fiscal
  useEffect(() => {
    if (saqueModalOpen && saqueStep === 'notaFiscal') {
      console.log('[FinanceiroPage] Buscando fatura do período para modal autônomo');
      obterFaturaPeriodo();
    }
  }, [saqueModalOpen, saqueStep, obterFaturaPeriodo]);
  
  // Buscar fatura quando o modal de pessoa jurídica for aberto
  useEffect(() => {
    if (modalOpen && modalType === 'saque') {
      console.log('[FinanceiroPage] Buscando fatura do período para modal PJ');
      obterFaturaPeriodo();
    }
  }, [modalOpen, modalType, obterFaturaPeriodo]);

  // Buscar fatura ao montar a página (exibe consultas realizadas / total mesmo antes de abrir modal)
  useEffect(() => {
    console.log('[FinanceiroPage] Buscando fatura do período ao carregar página');
    obterFaturaPeriodo();
  }, [obterFaturaPeriodo]);

  // Estado para última solicitação de saque (da tabela FinanceiroPsicologo)
  const [ultimaSolicitacao, setUltimaSolicitacao] = useState<{
    status: string;
    periodo?: string;
    valor?: number;
    dataPagamento?: string;
    createdAt: string;
  } | null>(null);
  const [isLoadingSolicitacao, setIsLoadingSolicitacao] = useState(false);

  // Buscar última solicitação de saque da tabela FinanceiroPsicologo
  useEffect(() => {
    const buscarUltimaSolicitacao = async () => {
      setIsLoadingSolicitacao(true);
      try {
        const response = await solicitacaoSaqueService.getUltimaSolicitacaoSaque();
        if (response.data.success && response.data.solicitacao) {
          setUltimaSolicitacao({
            status: response.data.solicitacao.status,
            periodo: response.data.solicitacao.periodo,
            valor: response.data.solicitacao.valor,
            dataPagamento: response.data.solicitacao.dataPagamento,
            createdAt: response.data.solicitacao.createdAt
          });
        } else {
          setUltimaSolicitacao(null);
        }
      } catch (error) {
        console.error('Erro ao buscar última solicitação:', error);
        setUltimaSolicitacao(null);
      } finally {
        setIsLoadingSolicitacao(false);
      }
    };

    buscarUltimaSolicitacao();
  }, []);

  // Janela de saque: botão "Receber valor" e link "Enviar documento fiscal" disponíveis somente entre 21 e 23
  const estaNaJanelaSaque = useMemo(() => {
    const dia = dayjs().tz('America/Sao_Paulo').date();
    return dia >= 21 && dia <= 23;
  }, []);

  // Função para verificar se o botão deve estar bloqueado (após último saque, até dia 20 do mês seguinte)
  const isBotaoSaqueBloqueado = useMemo(() => {
    if (!ultimaSolicitacao) return false;
    
    if (!ultimaSolicitacao.createdAt) return false;

    const dataCriacao = new Date(ultimaSolicitacao.createdAt);
    const hoje = new Date();
    
    const mesSeguinte = dataCriacao.getMonth() === 11 ? 0 : dataCriacao.getMonth() + 1;
    const anoSeguinte = dataCriacao.getMonth() === 11 ? dataCriacao.getFullYear() + 1 : dataCriacao.getFullYear();
    const dataLiberacao = new Date(anoSeguinte, mesSeguinte, 20, 0, 0, 0, 0);
    
    return hoje < dataLiberacao;
  }, [ultimaSolicitacao]);

  const bloqueadoReceberValor = !estaNaJanelaSaque || isBotaoSaqueBloqueado;
  const bloqueadoEnviarDoc = !estaNaJanelaSaque || isBotaoSaqueBloqueado;

  // Função para renderizar tag de status (baseado no Status do FinanceiroPsicologo)
  function StatusTag({ status }: { status: string }) {
    const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; icon: string }> = {
      'PagamentoEmAnalise': {
        label: 'Pagamento em análise',
        bgColor: '#FFF6D6',
        textColor: '#B89B2B',
        icon: '⏰'
      },
      'Pendente': {
        label: 'Pagamento em análise',
        bgColor: '#FFF6D6',
        textColor: '#B89B2B',
        icon: '⏰'
      },
      'Aprovado': {
        label: 'Pagamento aprovado',
        bgColor: '#E7F6E7',
        textColor: '#3A7A3A',
        icon: '✓'
      },
      'Processando': {
        label: 'Processando pagamento',
        bgColor: '#E3F2FD',
        textColor: '#1976D2',
        icon: '⏳'
      },
      'Pago': {
        label: 'Pagamento realizado',
        bgColor: '#E7F6E7',
        textColor: '#3A7A3A',
        icon: '✓'
      },
      'Rejeitado': {
        label: 'Pagamento rejeitado',
        bgColor: '#FFE1E1',
        textColor: '#B30000',
        icon: '✗'
      },
      'Cancelado': {
        label: 'Solicitação cancelada',
        bgColor: '#F5F5F5',
        textColor: '#6B7280',
        icon: '✗'
      }
    };

    const config = statusConfig[status] || statusConfig['PagamentoEmAnalise'];

    return (
      <span 
        className="px-3 py-1 rounded-[6px] font-semibold text-[13px] flex items-center gap-1"
        style={{ backgroundColor: config.bgColor, color: config.textColor }}
      >
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  }


  // Calcular valor recebido do mês ANTERIOR (repasses do mês anterior)
  function getMesAnoAnterior(date: Date) {
    const mesAnterior = date.getMonth() === 0 ? 11 : date.getMonth() - 1;
    const anoAnterior = date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear();
    return { mes: mesAnterior, ano: anoAnterior };
  }

  const { mes: mesAnterior, ano: anoAnterior } = getMesAnoAnterior(hoje);
  const { historicoSessoes: historicoSessoesMesAnterior } = useHistoricoSessoes(mesAnterior, anoAnterior, 1, 1000);
  // Considera sessões com statusPagamento = "Pago" no mês anterior
  const repassesRecebidosMesAnterior = historicoSessoesMesAnterior.filter(s => s.statusPagamento === "Pago");
  const valorRecebidoMesAnterior = repassesRecebidosMesAnterior.reduce((acc, s) => acc + s.valor, 0);

  // Para exibir no card principal, use valorRecebidoMesAnterior
  
  // Resetar página quando mudar filtro
  useEffect(() => {
    setPage(1);
  }, [mesFiltro, anoFiltro]);

  // Período recorrente do histórico: 20 do mês anterior a 20 do mês selecionado (ex.: 20/01 a 20/02)
  const periodoHistoricoLabel = useMemo(() => {
    const mesPrev = mesFiltro === 0 ? 11 : mesFiltro - 1;
    const anoPrev = mesFiltro === 0 ? anoFiltro - 1 : anoFiltro;
    return `20/${String(mesPrev + 1).padStart(2, '0')}/${anoPrev} a 20/${String(mesFiltro + 1).padStart(2, '0')}/${anoFiltro}`;
  }, [mesFiltro, anoFiltro]);

  // Detectar mobile
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 640);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.filtro-dropdown')) {
        setShowFiltroGrafico(false);
        setShowFiltroHistorico(false);
        setShowFiltroAtendimentos(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Preparar dados do gráfico
  const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  // Se há filtro de mês, mostrar apenas até aquele mês
  const mesesParaMostrar = mesFiltroGrafico !== undefined 
    ? mesesNomes.slice(0, mesFiltroGrafico + 1)
    : mesesNomes;
  
  const lineData = {
    labels: mesesParaMostrar,
    datasets: [
      {
        label: "Saldo acumulado",
        data: ganhosMensais.map((g, index) => {
          // Calcular saldo acumulado
          return ganhosMensais.slice(0, index + 1).reduce((acc, item) => acc + item.total, 0);
        }),
        borderColor: "#6D75C0",
        backgroundColor: "rgba(109,117,192,0.1)",
        tension: 0.4,
        pointBackgroundColor: "#6D75C0",
        fill: true,
      },
    ],
  };

  // Preparar dados do gráfico de atendimentos
  const mesesAtendimentos = mesFiltroAtendimentos !== undefined
    ? mesesNomes.slice(0, mesFiltroAtendimentos + 1)
    : mesesNomes;
  
  const totalAtendimentos = atendimentosMensais.reduce((acc, item) => acc + item.total, 0);
  
  const barData = {
    labels: mesesAtendimentos,
    datasets: [
      {
        label: "Recebidos",
        data: atendimentosMensais.map((a) => a.recebidos),
        backgroundColor: "#7FBDCC",
        borderRadius: 6,
      },
      {
        label: "A receber",
        data: atendimentosMensais.map((a) => a.aReceber),
        backgroundColor: "#6D75C0",
        borderRadius: 6,
      },
    ],
  };

  console.log('Cálculo de Pagamento:', calculoPagamento);
  
  // Usar dados reais da API ou fallback para dados mock
  const mesAtualStr = String(hoje.getMonth() + 1).padStart(2, "0");
  const faturaPsicologoMock = getFaturaPsicologo(mesAtualStr, String(anoAtual));
  
  // Usar dados reais da API quando disponíveis
  const faturaPsicologo = faturaPeriodo ? {
    periodo: faturaPeriodo.periodo || '',
    pagamento: faturaPeriodo.pagamento || '',
    quantidade: faturaPeriodo.quantidade || 0,
    total: faturaPeriodo.total || 0,
    consultas: faturaPeriodo.consultas || []
  } : {
    periodo: faturaPsicologoMock.periodo,
    pagamento: faturaPsicologoMock.pagamento,
    quantidade: faturaPsicologoMock.quantidade,
    total: faturaPsicologoMock.total,
    consultas: []
  };

  // Debug: Log dos dados da fatura
  console.log('[FinanceiroPage] ===== DADOS DA FATURA =====');
  console.log('[FinanceiroPage] faturaPeriodo:', faturaPeriodo);
  console.log('[FinanceiroPage] faturaPeriodo?.quantidade:', faturaPeriodo?.quantidade);
  console.log('[FinanceiroPage] faturaPeriodo?.total:', faturaPeriodo?.total);
  console.log('[FinanceiroPage] faturaPeriodo?.consultas?.length:', faturaPeriodo?.consultas?.length);
  console.log('[FinanceiroPage] faturaPsicologo:', faturaPsicologo);
  console.log('[FinanceiroPage] isLoadingFaturaPeriodo:', isLoadingFaturaPeriodo);
  console.log('[FinanceiroPage] ============================');

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setNotaFiscal(e.target.files[0]);
    }
  }

  // Verificar se é autônomo ou pessoa jurídica
  const isAutonomo = useMemo(() => {
    if (!psicologoData?.ProfessionalProfiles?.[0]?.TipoPessoaJuridico) return false;
    const tipoPessoa = psicologoData.ProfessionalProfiles[0].TipoPessoaJuridico;
    if (Array.isArray(tipoPessoa)) {
      const temAutonomo = tipoPessoa.some((t: string) => t === "Autonomo");
      const temPJ = tipoPessoa.some((t: string) => 
        t === "Juridico" || t === "PjAutonomo" || t === "Ei" || 
        t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu"
      );
      return temAutonomo && !temPJ;
    }
    return tipoPessoa === "Autonomo";
  }, [psicologoData]);

  const isPessoaJuridica = useMemo(() => {
    if (!psicologoData?.ProfessionalProfiles?.[0]?.TipoPessoaJuridico) return false;
    const tipoPessoa = psicologoData.ProfessionalProfiles[0].TipoPessoaJuridico;
    if (Array.isArray(tipoPessoa)) {
      return tipoPessoa.some((t: string) => 
        t === "Juridico" || t === "PjAutonomo" || t === "Ei" || 
        t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu"
      );
    }
    return tipoPessoa === "Juridico" || tipoPessoa === "PjAutonomo" || 
           tipoPessoa === "Ei" || tipoPessoa === "Mei" || 
           tipoPessoa === "SociedadeLtda" || tipoPessoa === "Eireli" || tipoPessoa === "Slu";
  }, [psicologoData]);

  async function handleSolicitarSaque() {
    if (bloqueadoReceberValor) return;

    // Autônomo: formulário 1x — se já preenchido, nunca mais solicitar; abrir direto na nota fiscal
    if (isAutonomo) {
      await refetchFormularioStatus();
      if (formularioStatus !== true) {
        toast.error('É necessário preencher o formulário de saque autônomo antes de solicitar o saque');
        setSaqueStep('formulario');
        setSaqueModalOpen(true);
        return;
      }
    }
    
    // Buscar fatura do período antes de abrir o modal
    console.log('[handleSolicitarSaque] Buscando fatura do período...');
    try {
      await obterFaturaPeriodo();
      console.log('[handleSolicitarSaque] Fatura carregada:', faturaPeriodo);
    } catch (error) {
      console.error('[handleSolicitarSaque] Erro ao buscar fatura:', error);
      toast.error('Erro ao carregar dados da fatura. Tente novamente.');
    }
    
    if (isAutonomo) {
      // Formulário já preenchido, abrir modal de nota fiscal diretamente
      setSaqueStep('notaFiscal');
      setSaqueModalOpen(true);
    } else if (isPessoaJuridica) {
      // Se for pessoa jurídica, abrir modal de nota fiscal diretamente
      setModalType('saque');
      setModalOpen(true);
    } else {
      // Fallback: abrir modal padrão
      setModalType('saque');
      setModalOpen(true);
    }
  }


  const [isSubmittingSaque, setIsSubmittingSaque] = useState(false);

  async function handleConfirmarSaque() {
    try {
      if (!notaFiscal) {
        toast.error('Por favor, selecione a nota fiscal');
        return;
      }

      // Validar dados antes de enviar
      const valor = faturaPsicologo.total ?? 0;
      const periodo = faturaPsicologo.periodo || '';
      const quantidadeConsultas = faturaPsicologo.quantidade ?? 0;

      console.log('[handleConfirmarSaque] Dados que serão enviados:', {
        valor,
        periodo,
        quantidadeConsultas,
        notaFiscal: {
          name: notaFiscal.name,
          size: notaFiscal.size,
          type: notaFiscal.type
        }
      });

      if (!periodo) {
        toast.error('Período não encontrado. Tente novamente.');
        return;
      }

      if (valor <= 0) {
        toast.error('Valor inválido para saque.');
        return;
      }

      setIsSubmittingSaque(true);

      const resultado = await solicitacaoSaqueService.criarSolicitacaoSaque({
        valor,
        periodo,
        quantidadeConsultas,
        notaFiscal: notaFiscal
      });

      if (resultado.data.success) {
        toast.success(resultado.data.message || 'Solicitação de saque criada com sucesso!');
        handleCloseModal();
        setSaqueModalOpen(false);
        setNotaFiscal(null);
        if (inputRef.current) inputRef.current.value = "";
        
        // Buscar última solicitação para atualizar a tag de status
        try {
          const response = await solicitacaoSaqueService.getUltimaSolicitacaoSaque();
          if (response.data.success && response.data.solicitacao) {
            setUltimaSolicitacao({
              status: response.data.solicitacao.status,
              periodo: response.data.solicitacao.periodo,
              valor: response.data.solicitacao.valor,
              dataPagamento: response.data.solicitacao.dataPagamento,
              createdAt: response.data.solicitacao.createdAt
            });
          }
        } catch (error) {
          console.error('Erro ao buscar última solicitação após criação:', error);
        }
      } else {
        toast.error(resultado.data.message || 'Erro ao criar solicitação de saque');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao criar solicitação';
      toast.error(errorMessage);
    } finally {
      setIsSubmittingSaque(false);
    }
  }

  function handleEnviarReceita() {
    if (bloqueadoEnviarDoc) return;
    setModalType('receita');
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setNotaFiscal(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleVerHistorico() {
    setModalHistoricoOpen(true);
  }

  function handleCloseModalHistorico() {
    setModalHistoricoOpen(false);
  }

  // Função para renderizar status da sessão (inclui todos os status para debug)
  function StatusSessao({ status }: { status: string }) {
    if (status === "Agendada") {
      return (
        <span className="px-3 py-1 rounded-[6px] bg-[#FFF6D6] text-[#B89B2B] font-semibold flex items-center text-[13px]">
          Agendada
        </span>
      );
    }
    if (status === "Em andamento") {
      return (
        <span className="px-3 py-1 rounded-[6px] bg-[#E3F2FD] text-[#1565C0] font-semibold flex items-center text-[13px]">
          Em andamento
        </span>
      );
    }
    if (status === "Reservada") {
      return (
        <span className="px-3 py-1 rounded-[6px] bg-[#F3E5F5] text-[#7B1FA2] font-semibold flex items-center text-[13px]">
          Reservada
        </span>
      );
    }
    if (status === "Reagendada") {
      return (
        <span className="px-3 py-1 rounded-[6px] bg-[#FFF8E1] text-[#F9A825] font-semibold flex items-center text-[13px]">
          Reagendada
        </span>
      );
    }
    if (status === "Cancelada") {
      return (
        <span className="px-3 py-1 rounded-[6px] bg-[#FFE1E1] text-[#B30000] font-semibold flex items-center text-[13px]">
          Cancelada
        </span>
      );
    }
    if (status === "Concluído" || status === "Realizada") {
      return (
        <span className="px-3 py-1 rounded-[6px] bg-[#E7F6E7] text-[#3A7A3A] font-semibold flex items-center text-[13px]">
          Concluído
        </span>
      );
    }
    if (status && status !== "—") {
      return (
        <span className="px-3 py-1 rounded-[6px] bg-[#F5F5F5] text-[#616161] font-semibold flex items-center text-[13px]">
          {status}
        </span>
      );
    }
    return null;
  }

  // Função para garantir que apenas o nome completo do paciente seja exibido
  // Remove qualquer dado sensível que possa vir acidentalmente da API
  function getNomePacienteSeguro(paciente: string | undefined | null): string {
    if (!paciente) return "Não informado";
    
    // Remove possíveis dados sensíveis que possam estar concatenados
    // Remove emails, CPFs, telefones, etc.
    let nome = paciente.trim();
    
    // Remove padrões de email
    nome = nome.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '');
    
    // Remove padrões de CPF (XXX.XXX.XXX-XX ou XXXXXXXXXXX)
    nome = nome.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '');
    
    // Remove padrões de telefone ((XX) XXXXX-XXXX ou (XX) XXXX-XXXX)
    nome = nome.replace(/\b\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g, '');
    
    // Remove múltiplos espaços
    nome = nome.replace(/\s+/g, ' ').trim();
    
    // Se após a limpeza não sobrar nada, retorna "Não informado"
    if (!nome) return "Não informado";
    
    return nome;
  }

  // Função para renderizar status do pagamento
  function StatusPagamento({ status }: { status: string }) {
    if (status === "-" || !status) {
      return <span className="text-[#6B7280] text-[13px]">-</span>;
    }
    if (status === "Não pago") {
      return (
        <span className="flex items-center gap-1 text-[#B30000] text-[13px] font-semibold">
          <span className="text-[16px]">✗</span> Não pago
        </span>
      );
    }
    if (status === "Bloqueado") {
      return (
        <span className="flex items-center gap-1 text-[#B89B2B] text-[13px] font-semibold">
          <span className="text-[16px]">⏳</span> Bloqueado
        </span>
      );
    }
    if (status === "Pago") {
      return (
        <span className="flex items-center gap-1 text-[#3A7A3A] text-[13px] font-semibold">
          <span className="text-[16px]">✓</span> Pago
        </span>
      );
    }
    if (status === "Sem repasse") {
      return (
        <span className="flex items-center gap-1 text-[#6B7280] text-[13px] font-semibold">
          <span className="text-[16px]">-</span> Sem repasse
        </span>
      );
    }
    // Fallback para qualquer outro status
    return (
      <span className="text-[#6B7280] text-[13px] font-semibold">{status}</span>
    );
  }

  if (mostrarFormulario) {
    return <FormularioSaqueAutonomo onClose={() => setMostrarFormulario(false)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen fira-sans bg-[#F6F7FB]"
    >
      <div className="flex justify-center py-4 sm:py-10 pb-32 sm:pb-10">
        {/* Bloco principal centralizado, sem borda verde */}
        <div className="flex max-w-[1300px] w-full min-h-[700px]">
          {/* Sidebar alinhado à esquerda */}
          <aside className="hidden md:flex w-[260px] min-w-[220px] flex-col py-8 px-0">
            <SidebarPsicologo />
          </aside>
          {/* Conteúdo financeiro ocupa todo espaço restante */}
          <main className="flex-1 flex flex-col items-start py-4 sm:py-8 px-4 sm:px-0 w-full">
            {/* Frase de Alerta */}
            <div className="bg-[#FFEDB3] rounded-[10px] border border-[#FFE066] p-4 sm:p-6 mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-[0_2px_8px_rgba(255,237,179,0.15)] w-full max-w-[1020px]">
              <div className="flex items-start gap-3 flex-1">
                <Image src="/icons/icon-exclamacao.svg" alt="Informação" width={24} height={24} className="flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="fira-sans font-semibold text-sm sm:text-[15px] leading-[24px] text-[#B30000] block">Atenção ao prazo de pagamento!</span>
                  <span className="block mt-1 fira-sans font-normal text-xs sm:text-[14px] leading-[22px] text-[#49525A] break-words">
                    Gere e nos envie sua Nota fiscal (para PJ) / Documento Fiscal (Autônomo) até no máximo dia
                    <span className="fira-sans font-semibold text-xs sm:text-[14px] leading-[22px] text-[#6D75C0] ml-1">23 do mês</span>.
                    O pagamento é efetuado até o dia
                    <span className="fira-sans font-semibold text-xs sm:text-[14px] leading-[22px] text-[#6D75C0] ml-1">5 do mês seguinte</span>.
                  </span>
                </div>
              </div>
            </div>
            {/* Cards principais */}
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8 w-full max-w-[1100px]">
              {/* Card principal - Saldo disponível */}
              <div className="bg-white shadow-[0_2px_8px_rgba(109,117,192,0.08)] rounded-[12px] flex flex-col justify-between px-4 sm:px-8 py-4 sm:py-6 w-full md:w-[60%] min-w-0 h-auto min-h-[215px]">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#F6F7FB] text-[#23253a] text-[20px] font-bold">
                        <Image src="/icons/union.svg" alt="Saldo disponível" width={24} height={24} />
                      </span>
                      <span className="fira-sans font-semibold text-[18px] leading-[26px] text-[#23253a]">Saldo disponível para resgate</span>
                    </div>
                    {!isLoadingSolicitacao && ultimaSolicitacao && (
                      <StatusTag status={ultimaSolicitacao.status} />
                    )}
                  </div>
                  <span className="fira-sans text-[14px] text-[#6B7280]">Valor liberado para saque</span>
                  {bloqueadoReceberValor && (
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-[6px]">
                      <p className="text-[12px] text-yellow-800">
                        {!estaNaJanelaSaque
                          ? 'Receber valor e enviar documento fiscal estão disponíveis apenas entre os dias 21 e 23 de cada mês.'
                          : ultimaSolicitacao
                            ? 'Você só poderá solicitar um novo saque a partir do dia 20 do mês seguinte ao último saque.'
                            : ''}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between w-full mt-4">
                  <span className="fira-sans font-bold text-[36px] leading-[40px] text-[#4CAF50] align-middle">
                    {isLoadingSaldo ? (
                      <span className="text-[#6B7280] text-[24px]"></span>
                    ) : (
                      `R$ ${saldoDisponivelResgate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    )}
                  </span>
                  {/* Aviso de INSS para psicólogo autônomo */}
                  {isAutonomo && (
                    <div className="absolute mt-[58px] text-[12px] leading-[16px] text-[#6B7280]">
                      Valor bruto. Considere o desconto de 11% de INSS.
                    </div>
                  )}
                  <button
                    className={`px-6 py-2 rounded-[8px] font-semibold shadow-sm transition whitespace-nowrap text-[16px] leading-[24px] ${
                      saldoDisponivelResgate === 0 || bloqueadoReceberValor
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#8494E9] text-white hover:bg-[#6D75C0] cursor-pointer'
                    }`}
                    onClick={handleSolicitarSaque}
                    disabled={saldoDisponivelResgate === 0 || bloqueadoReceberValor}
                    title={
                      !estaNaJanelaSaque
                        ? 'Disponível apenas entre os dias 21 e 23 de cada mês.'
                        : isBotaoSaqueBloqueado
                          ? 'Você só pode solicitar um novo saque a partir do dia 20 do mês seguinte ao último saque.'
                          : ''
                    }
                  >
                    Receber valor
                  </button>
                </div>
              </div>
              {/* Coluna direita com 2 cards empilhados */}
              <div className="flex flex-col gap-4 sm:gap-6 w-full md:w-[260px] min-w-0 h-auto md:h-[170px] justify-between">
                {/* Card Saldo Retido */}
                <div className="bg-white shadow-[0_2px_8px_rgba(109,117,192,0.08)] rounded-[12px] h-auto md:h-[110px] flex flex-col justify-between p-4 w-full md:w-[380px]">
                  <div className="flex items-center gap-2 mb-1">
                    <Image src="/icons/lock-closed.svg" alt="Saldo retido" width={20} height={20} />
                    <span className="fira-sans font-semibold text-[16px] leading-[22px] text-[#23253a]">Saldo retido</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 flex-1">
                    <span className="fira-sans text-[13px] leading-[18px] text-[#6B7280] break-words">Valor de sessões em processo de aprovação</span>
                    <span className="fira-sans font-bold text-[24px] leading-[32px] text-[#EAB308] align-middle whitespace-nowrap">
                      {isLoadingSaldoRetido ? (
                        <span className="text-[#6B7280] text-[16px]">...</span>
                      ) : (
                        `R$ ${saldoRetido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      )}
                    </span>
                  </div>
                </div>
                {/* Card Enviar Documento Fiscal */}
                <div className="bg-white shadow-[0_2px_8px_rgba(109,117,192,0.08)] rounded-[12px] h-auto md:h-[110px] flex flex-col justify-between p-4 w-full md:w-[380px]">
                  <div className="flex items-center gap-2 mb-2 sm:mb-1">
                    <Image src="/icons/file-text.svg" alt="Enviar Documento Fiscal" width={20} height={20} />
                    <span className="fira-sans font-semibold text-[16px] leading-[22px] text-[#23253a]">Enviar Documento Fiscal</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Image src="/icons/alert-finaceiro.svg" alt="Documento fiscal pendente de envio" width={16} height={16} />
                      <span className="fira-sans font-normal text-[12px] leading-[16px] align-middle text-[#49525A] break-words">
                        {!estaNaJanelaSaque
                          ? 'Disponível entre os dias 21 e 23'
                          : isBotaoSaqueBloqueado
                            ? 'Aguardando próximo período'
                            : 'Documento fiscal pendente de envio'}
                      </span>
                    </div>
                    <button
                      className={`px-4 py-2 font-semibold transition whitespace-nowrap text-[15px] leading-[22px] self-start sm:self-auto ${
                        bloqueadoEnviarDoc
                          ? 'text-gray-400 cursor-not-allowed no-underline'
                          : 'text-[#6D75C0] cursor-pointer hover:underline'
                      }`}
                      onClick={handleEnviarReceita}
                      disabled={bloqueadoEnviarDoc}
                      title={
                        !estaNaJanelaSaque
                          ? 'Disponível apenas entre os dias 21 e 23 de cada mês.'
                          : isBotaoSaqueBloqueado
                            ? 'Você só pode enviar documento fiscal a partir do dia 20 do mês seguinte ao último saque.'
                            : ''
                      }
                    >
                      Enviar documento fiscal
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Modal de steps para autônomo */}
            <SaqueStepsModal
              isOpen={saqueModalOpen}
              onClose={() => {
                setSaqueModalOpen(false);
                setSaqueStep('formulario');
                setNotaFiscal(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              step={saqueStep}
              onStepChange={setSaqueStep}
              faturaPsicologo={{
                periodo: faturaPeriodo?.periodo || faturaPsicologo.periodo,
                pagamento: faturaPeriodo?.pagamento || faturaPsicologo.pagamento,
                quantidade: faturaPeriodo?.quantidade ?? faturaPsicologo.quantidade,
                total: faturaPeriodo?.total ?? faturaPsicologo.total,
                consultas: faturaPeriodo?.consultas || []
              }}
              notaFiscal={notaFiscal}
              inputRef={inputRef}
              onUpload={handleUpload}
              onConfirmarSaque={handleConfirmarSaque}
              isLoadingFatura={isLoadingFaturaPeriodo}
              isSubmitting={isSubmittingSaque}
            />

            {/* Modal de saque para pessoa jurídica */}
            <AnimatePresence>
              {modalOpen && (
                <Fragment>
                  {/* Modal Mobile */}
                  {isMobile ? (
                    <motion.div
                      className="fixed inset-0 z-50 sm:hidden flex flex-col"
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-white w-full h-full flex flex-col">
                        {/* Header colorido mobile */}
                        <div className="bg-[#6D75C0] px-4 py-4 flex items-center justify-between">
                          <h2 className="text-lg font-bold text-white">{modalType === 'saque' ? 'Solicitação de Saque' : 'Enviar Documento Fiscal'}</h2>
                          <button
                            className="text-white text-2xl font-bold hover:text-gray-200"
                            onClick={handleCloseModal}
                            aria-label="Fechar"
                          >
                            ×
                          </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 pb-20">
                          {/* Detalhes do saque */}
                          <div className="mb-4">
                            <div className="text-sm text-gray-700 mb-2 font-semibold">Resumo da Fatura</div>
                            {isLoadingFaturaPeriodo ? (
                              <div className="text-xs text-gray-500">Carregando dados...</div>
                            ) : (
                              <>
                                <div className="grid grid-cols-1 gap-2 text-xs text-gray-700 mb-4">
                                  <div>Período: <span className="font-semibold">{faturaPeriodo?.periodo || faturaPsicologo.periodo || ''}</span></div>
                                  <div>Pagamento previsto: <span className="font-semibold">{faturaPeriodo?.pagamento || faturaPsicologo.pagamento || ''}</span></div>
                                  <div>Consultas realizadas: <span className="font-semibold">{faturaPeriodo?.quantidade ?? faturaPsicologo.quantidade ?? 0}</span></div>
                                  <div>Total a receber: <span className="font-bold text-[#6D75C0]">R$ {(faturaPeriodo?.total ?? faturaPsicologo.total ?? 0).toFixed(2)}</span></div>
                                </div>
                                
                                {faturaPeriodo && faturaPeriodo.quantidade === 0 && (
                                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-[8px]">
                                    <p className="text-xs text-yellow-800">
                                      Nenhuma consulta concluída encontrada no período.
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div className="mb-4">
                            <label className="block mb-2 font-medium text-gray-700 text-sm">Upload da nota fiscal</label>
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              ref={inputRef}
                              onChange={handleUpload}
                              className="block w-full border border-gray-300 rounded-[8px] px-3 py-2 text-xs"
                            />
                            {notaFiscal && (
                              <div className="mt-2 text-xs text-green-700">
                                Arquivo selecionado: {notaFiscal.name}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-3 mt-6 w-full">
                            <button
                              className="w-1/2 px-4 py-2.5 bg-gray-200 text-[#6D75C0] rounded-[8px] font-semibold shadow hover:bg-gray-300 transition text-sm"
                              onClick={handleCloseModal}
                            >
                              Cancelar
                            </button>
                            <button
                              className="w-1/2 px-4 py-2.5 bg-[#6D75C0] text-white rounded-[8px] font-semibold shadow hover:bg-[#5a62a0] transition text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              onClick={modalType === 'saque' ? handleConfirmarSaque : handleCloseModal}
                              disabled={isSubmittingSaque}
                            >
                              {isSubmittingSaque ? (
                                <>
                                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Processando...
                                </>
                              ) : (
                                modalType === 'saque' ? 'Confirmar solicitação' : 'Enviar documento fiscal'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    /* Modal Desktop */
                    <motion.div
                      className="fixed inset-0 z-50 flex items-center justify-center hidden sm:flex bg-transparent"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[520px] relative z-60">
                        {/* Header colorido */}
                        <div className="rounded-t-[16px] bg-[#6D75C0] px-7 py-5 flex items-center justify-between">
                          <h2 className="text-[22px] cursor-pointer font-bold text-white">{modalType === 'saque' ? 'Solicitação de Saque' : 'Enviar Documento Fiscal'}</h2>
                          <button
                            className="text-white text-[28px] font-bold hover:text-gray-200"
                            onClick={handleCloseModal}
                            aria-label="Fechar"
                          >
                            ×
                          </button>
                        </div>
                        <div className="p-7">
                          {/* Detalhes do saque */}
                          <div className="mb-5">
                            <div className="text-[16px] text-gray-700 mb-2 font-semibold">Resumo da Fatura</div>
                            {isLoadingFaturaPeriodo ? (
                              <div className="text-[14px] text-gray-500">Carregando dados...</div>
                            ) : (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[14px] text-gray-700 mb-4">
                                  <div>Período: <span className="font-semibold">{faturaPeriodo?.periodo || faturaPsicologo.periodo || ''}</span></div>
                                  <div>Pagamento previsto: <span className="font-semibold">{faturaPeriodo?.pagamento || faturaPsicologo.pagamento || ''}</span></div>
                                  <div>Consultas realizadas: <span className="font-semibold">{faturaPeriodo?.quantidade ?? faturaPsicologo.quantidade ?? 0}</span></div>
                                  <div>Total a receber: <span className="font-bold text-[#6D75C0]">R$ {(faturaPeriodo?.total ?? faturaPsicologo.total ?? 0).toFixed(2)}</span></div>
                                </div>
                                
                                {faturaPeriodo && faturaPeriodo.quantidade === 0 && (
                                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-[8px]">
                                    <p className="text-[14px] text-yellow-800">
                                      Nenhuma consulta concluída encontrada no período.
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div className="mb-5">
                            <label className="block mb-2 font-medium text-gray-700 text-[15px]">Upload da nota fiscal</label>
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              ref={inputRef}
                              onChange={handleUpload}
                              className="block w-full border border-gray-300 rounded-[8px] px-3 py-2 text-[14px]"
                            />
                            {notaFiscal && (
                              <div className="mt-2 text-xs text-green-700">
                                Arquivo selecionado: {notaFiscal.name}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-4 mt-7 w-full">
                            <button
                              className="w-1/2 px-4 py-2 bg-gray-200 text-[#6D75C0] rounded-[8px] font-semibold shadow hover:bg-gray-300 transition text-[15px]"
                              onClick={handleCloseModal}
                            >
                              Cancelar
                            </button>
                            <button
                              className="w-1/2 px-4 py-2 bg-[#6D75C0] text-white rounded-[8px] font-semibold shadow hover:bg-[#5a62a0] transition text-[15px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              onClick={modalType === 'saque' ? handleConfirmarSaque : handleCloseModal}
                              disabled={isSubmittingSaque}
                            >
                              {isSubmittingSaque ? (
                                <>
                                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Processando...
                                </>
                              ) : (
                                modalType === 'saque' ? 'Confirmar solicitação' : 'Enviar documento fiscal'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </Fragment>
              )}
            </AnimatePresence>
            {/* Modal de histórico de repasses */}
            {modalHistoricoOpen && (
              <Fragment>
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[900px] max-h-[90vh] relative z-60 flex flex-col">
                    {/* Header colorido */}
                    <div className="rounded-t-[16px] bg-[#6D75C0] px-7 py-5 flex items-center justify-between">
                      <h2 className="text-[22px] font-bold text-white">Histórico de Repasses Recebidos</h2>
                      <button
                        className="text-white text-[28px] font-bold hover:text-gray-200"
                        onClick={handleCloseModalHistorico}
                        aria-label="Fechar"
                      >
                        ×
                      </button>
                    </div>
                    <div className="p-7 flex-1 overflow-y-auto">
                      <div className="mb-4">
                        <div className="text-[16px] text-gray-700 mb-2 font-semibold">
                          {`${mesesNomes[mesAnterior]}/${anoAnterior}`}
                        </div>
                        <div className="text-[14px] text-gray-600">
                          Total recebido: <span className="font-bold text-[#6D75C0]">R$ {valorRecebidoMesAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      {repassesRecebidosMesAnterior.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          Nenhum repasse recebido no mês anterior.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-[14px]">
                            <thead>
                              <tr className="text-left text-[#6B7280] border-b border-[#E5E7EB]">
                                <th className="py-3 pr-4 font-semibold">Sessão</th>
                                <th className="py-3 pr-4 font-semibold">Paciente</th>
                                <th className="py-3 pr-4 font-semibold">Data e Horário</th>
                                <th className="py-3 pr-4 font-semibold">Valor</th>
                                <th className="py-3 pr-4 font-semibold">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {repassesRecebidosMesAnterior.map((s) => (
                                <tr key={s.sessaoId} className="border-b border-[#F3F4F6] hover:bg-gray-50">
                                  <td className="py-3 pr-4 text-[#111827]">{s.id}</td>
                                  <td className="py-3 pr-4 text-[#111827]">{getNomePacienteSeguro(s.paciente)}</td>
                                  <td className="py-3 pr-4 text-[#111827]">{s.dataHora}</td>
                                  <td className="py-3 pr-4 text-[#111827] font-semibold">
                                    R$ {s.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-3 pr-4">
                                    <StatusPagamento status={s.statusPagamento} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className="flex justify-end mt-6">
                        <button
                          className="px-6 py-2 bg-[#6D75C0] text-white rounded-[8px] font-semibold shadow hover:bg-[#5a62a0] transition text-[15px]"
                          onClick={handleCloseModalHistorico}
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Fragment>
            )}
            {/* Resumo de movimentações */}
            <div className="flex justify-between mb-3 w-full">
              <h2 className="text-[16px] leading-[24px] font-semibold text-[#23253a]">Resumo de movimentações</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 w-full">
              {/* Valor total recebido */}
              <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-[0_2px_8px_rgba(109,117,192,0.08)] p-5 flex flex-col justify-between w-full h-[290px]">
                <div className="flex flex-col items-start w-full">
                  <span className="fira-sans font-medium text-[16px] leading-[24px] text-[#26220D] mb-1">Valor total recebido</span>
                  <span className="fira-sans font-normal text-[14px] leading-[24px] text-[#49525A] mb-2">
                    {`${mesesNomes[mesAnterior]}/${anoAnterior}`}
                  </span>
                  <div className="flex w-full h-full items-center justify-center">
                    <span className="fira-sans font-semibold text-[40px] leading-[64px] text-[#444D9D] mb-2 text-center">
                      R$ {valorRecebidoMesAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="flex justify-center w-full">
                  <button 
                    onClick={handleVerHistorico}
                    className="text-[15px] text-[#6D75C0] hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Image src="/icons/eye-open.svg" alt="Histórico" width={16} height={16} />
                    Ver histórico
                  </button>
                </div>
              </div>
              {/* Atendimentos (Bar) */}
              <div className="md:col-span-2 bg-white rounded-[14px] border border-[#E5E7EB] shadow-[0_2px_8px_rgba(109,117,192,0.08)] p-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-[15px] font-semibold text-[#23253a]">Atendimentos</div>
                    <div className="text-[13px] text-[#6B7280]">
                      {mesFiltroAtendimentos !== undefined 
                        ? `${mesesNomes[mesFiltroAtendimentos]} de ${anoFiltroAtendimentos}`
                        : currentMonthYearLabel
                      }
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-[13px] text-[#6B7280]">Total de atendimentos <span className="font-semibold">{totalAtendimentos}</span></div>
                    <div className="relative filtro-dropdown">
                      <button 
                        onClick={() => setShowFiltroAtendimentos(!showFiltroAtendimentos)}
                        className="text-[15px] text-[#6D75C0] hover:underline flex items-center gap-1"
                      >
                        <Image src="/icons/mixer-horizontal.svg" alt="Filtrar" width={16} height={16} />
                        Filtrar
                      </button>
                      {showFiltroAtendimentos && (
                        <div className="absolute right-0 mt-2 bg-white rounded-[8px] border border-[#E5E7EB] shadow-lg p-4 z-50 min-w-[200px]">
                          <div className="mb-3">
                            <label className="block text-[13px] font-medium text-[#6B7280] mb-1">Mês</label>
                            <select
                              value={mesFiltroAtendimentos !== undefined ? mesFiltroAtendimentos : ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setMesFiltroAtendimentos(value === '' ? undefined : parseInt(value));
                                setShowFiltroAtendimentos(false);
                              }}
                              className="w-full px-3 py-1.5 border border-[#E5E7EB] rounded-[8px] text-[14px] text-[#23253a] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D75C0] cursor-pointer"
                            >
                              <option value="">Todos os meses</option>
                              <option value={0}>Janeiro</option>
                              <option value={1}>Fevereiro</option>
                              <option value={2}>Março</option>
                              <option value={3}>Abril</option>
                              <option value={4}>Maio</option>
                              <option value={5}>Junho</option>
                              <option value={6}>Julho</option>
                              <option value={7}>Agosto</option>
                              <option value={8}>Setembro</option>
                              <option value={9}>Outubro</option>
                              <option value={10}>Novembro</option>
                              <option value={11}>Dezembro</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[13px] font-medium text-[#6B7280] mb-1">Ano</label>
                            <select
                              value={anoFiltroAtendimentos}
                              onChange={(e) => {
                                setAnoFiltroAtendimentos(parseInt(e.target.value));
                                setShowFiltroAtendimentos(false);
                              }}
                              className="w-full px-3 py-1.5 border border-[#E5E7EB] rounded-[8px] text-[14px] text-[#23253a] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D75C0] cursor-pointer"
                            >
                              {Array.from({ length: 5 }, (_, i) => {
                                const ano = hoje.getFullYear() - 2 + i;
                                return (
                                  <option key={ano} value={ano}>
                                    {ano}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-full h-48 flex items-center justify-center">
                  {isLoadingAtendimentos ? (
                    <div className="text-[#6B7280]">Carregando dados...</div>
                  ) : (
                    <LazyBarChart data={barData} options={barOptions} />
                  )}
                </div>
              </div>
            </div>
            {/* Visão geral de ganhos por mês */}
            <div className="flex items-center justify-between mb-3 w-full">
              <h2 className="text-[16px] leading-[24px] font-semibold text-[#23253a]">Visão geral de ganhos por mês</h2>
              <div className="relative filtro-dropdown">
                <button 
                  onClick={() => setShowFiltroGrafico(!showFiltroGrafico)}
                  className="text-[15px] text-[#6D75C0] hover:underline flex items-center gap-1"
                >
                  <Image src="/icons/mixer-horizontal.svg" alt="Filtrar" width={16} height={16} />
                  Filtrar
                </button>
                {showFiltroGrafico && (
                  <div className="absolute right-0 mt-2 bg-white rounded-[8px] border border-[#E5E7EB] shadow-lg p-4 z-50 min-w-[200px]">
                    <div className="mb-3">
                      <label className="block text-[13px] font-medium text-[#6B7280] mb-1">Mês</label>
                      <select
                        value={mesFiltroGrafico !== undefined ? mesFiltroGrafico : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setMesFiltroGrafico(value === '' ? undefined : parseInt(value));
                          setShowFiltroGrafico(false);
                        }}
                        className="w-full px-3 py-1.5 border border-[#E5E7EB] rounded-[8px] text-[14px] text-[#23253a] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D75C0] cursor-pointer"
                      >
                        <option value="">Todos os meses</option>
                        <option value={0}>Janeiro</option>
                        <option value={1}>Fevereiro</option>
                        <option value={2}>Março</option>
                        <option value={3}>Abril</option>
                        <option value={4}>Maio</option>
                        <option value={5}>Junho</option>
                        <option value={6}>Julho</option>
                        <option value={7}>Agosto</option>
                        <option value={8}>Setembro</option>
                        <option value={9}>Outubro</option>
                        <option value={10}>Novembro</option>
                        <option value={11}>Dezembro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#6B7280] mb-1">Ano</label>
                      <select
                        value={anoFiltroGrafico}
                        onChange={(e) => {
                          setAnoFiltroGrafico(parseInt(e.target.value));
                          setShowFiltroGrafico(false);
                        }}
                        className="w-full px-3 py-1.5 border border-[#E5E7EB] rounded-[8px] text-[14px] text-[#23253a] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D75C0] cursor-pointer"
                      >
                        {Array.from({ length: 5 }, (_, i) => {
                          const ano = hoje.getFullYear() - 2 + i;
                          return (
                            <option key={ano} value={ano}>
                              {ano}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-[0_2px_8px_rgba(109,117,192,0.08)] p-5 mb-6 w-full">
              <div className="w-full h-64 flex items-center justify-center">
                {isLoadingGanhos ? (
                  <div className="text-[#6B7280]">Carregando dados...</div>
                ) : (
                  <LazyLineChart data={lineData} options={lineOptions} />
                )}
              </div>
            </div>
            {/* Histórico das sessões — período recorrente: 20 do mês anterior a 20 do mês selecionado */}
            <div className="bg-[#FCFCF9] rounded-[14px] border border-[#E5E7EB] shadow-[0_2px_8px_rgba(109,117,192,0.08)] p-4 sm:p-6 w-full mb-4 sm:mb-8">
              <div className="flex flex-row items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <h3 className="text-sm sm:text-[16px] font-semibold fira-sans text-[#23253a]">Histórico das sessões</h3>
                  <span className="text-xs sm:text-[13px] text-[#6B7280]" title="Período de faturamento: todas as consultas do psicólogo entre 20 do mês anterior e 20 do mês atual">
                    Período: {periodoHistoricoLabel}
                  </span>
                </div>
                <div className="relative filtro-dropdown">
                  <button 
                    onClick={() => setShowFiltroHistorico(!showFiltroHistorico)}
                    className="text-[15px] text-[#6D75C0] hover:underline flex items-center gap-1 font-medium"
                  >
                    <Image src="/icons/mixer-horizontal.svg" alt="Filtrar" width={16} height={16} />
                    Filtrar
                  </button>
                  {showFiltroHistorico && (
                    <div className="absolute right-0 mt-2 bg-white rounded-[8px] border border-[#E5E7EB] shadow-lg p-4 z-50 min-w-[200px]">
                      <div className="mb-3">
                        <label className="block text-[13px] font-medium text-[#6B7280] mb-1">Mês</label>
                        <select
                          value={mesFiltro}
                          onChange={(e) => {
                            setMesFiltro(parseInt(e.target.value));
                            setShowFiltroHistorico(false);
                          }}
                          className="w-full px-3 py-1.5 border border-[#E5E7EB] rounded-[8px] text-[14px] text-[#23253a] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D75C0] cursor-pointer"
                        >
                          <option value={0}>Janeiro</option>
                          <option value={1}>Fevereiro</option>
                          <option value={2}>Março</option>
                          <option value={3}>Abril</option>
                          <option value={4}>Maio</option>
                          <option value={5}>Junho</option>
                          <option value={6}>Julho</option>
                          <option value={7}>Agosto</option>
                          <option value={8}>Setembro</option>
                          <option value={9}>Outubro</option>
                          <option value={10}>Novembro</option>
                          <option value={11}>Dezembro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#6B7280] mb-1">Ano</label>
                        <select
                          value={anoFiltro}
                          onChange={(e) => {
                            setAnoFiltro(parseInt(e.target.value));
                            setShowFiltroHistorico(false);
                          }}
                          className="w-full px-3 py-1.5 border border-[#E5E7EB] rounded-[8px] text-[14px] text-[#23253a] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D75C0] cursor-pointer"
                        >
                          {Array.from({ length: 5 }, (_, i) => {
                            const ano = hoje.getFullYear() - 2 + i;
                            return (
                              <option key={ano} value={ano}>
                                {ano}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="min-w-[800px] w-full text-xs sm:text-[14px]">
                  <thead>
                    <tr className="text-left text-[#6B7280] border-b border-[#E5E7EB]">
                      <th className="py-2 pr-3 sm:pr-4 font-semibold whitespace-nowrap">Sessão</th>
                      <th className="py-2 pr-3 sm:pr-4 font-semibold whitespace-nowrap">Paciente</th>
                      <th className="py-2 pr-3 sm:pr-4 font-semibold whitespace-nowrap">Data e Horário</th>
                      <th className="py-2 pr-3 sm:pr-4 font-semibold whitespace-nowrap">R$ Valor</th>
                      <th className="py-2 pr-3 sm:pr-4 font-semibold whitespace-nowrap">Status da sessão</th>
                      <th className="py-2 pr-3 sm:pr-4 font-semibold whitespace-nowrap">Status pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingHistorico ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#6B7280]">
                          Carregando histórico...
                        </td>
                      </tr>
                    ) : historicoSessoes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#6B7280]">
                          Nenhuma sessão encontrada no período {periodoHistoricoLabel}.
                        </td>
                      </tr>
                    ) : (
                      historicoSessoes.map((s) => {
                          // Mostra valor se:
                          // 1. Status de pagamento é "Pago" OU
                          // 2. Status de pagamento é "Bloqueado" (tem valor mas ainda não foi pago) OU
                          // 3. Status da sessão é "Cancelada" e tem repasse (statusPagamento não é "Sem repasse")
                          const temValor = s.valor > 0 && (
                            s.statusPagamento === "Pago" || 
                            s.statusPagamento === "Bloqueado" ||
                            (s.statusSessao === "Cancelada" && s.statusPagamento !== "Sem repasse" && s.statusPagamento !== "-")
                          );
                          const valorExibir = temValor 
                            ? `R$ ${s.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                            : "--";
                          return (
                            <tr key={s.sessaoId} className="border-b border-[#F3F4F6] hover:bg-gray-50">
                              <td className="py-2 pr-3 sm:pr-4 text-[#111827]">{s.id}</td>
                              <td className="py-2 pr-3 sm:pr-4 text-[#111827]">{getNomePacienteSeguro(s.paciente)}</td>
                              <td className="py-2 pr-3 sm:pr-4 text-[#111827] whitespace-nowrap">{s.dataHora}</td>
                              <td className="py-2 pr-3 sm:pr-4 text-[#111827] whitespace-nowrap font-medium">{valorExibir}</td>
                              <td className="py-2 pr-3 sm:pr-4">{<StatusSessao status={s.statusSessao} />}</td>
                              <td className="py-2 pr-3 sm:pr-4">{<StatusPagamento status={s.statusPagamento} />}</td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
              {/* Controles de Paginação */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-[#E5E7EB]">
                  <div className="text-xs sm:text-[13px] text-[#6B7280]">
                    Mostrando {((pagination.page - 1) * pagination.pageSize) + 1} a {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total} sessões
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={pagination.page === 1 || isLoadingHistorico}
                      className="px-2 sm:px-3 py-1.5 text-xs sm:text-[14px] text-[#6D75C0] border border-[#E5E7EB] rounded-[8px] bg-white hover:bg-[#F6F7FB] disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Anterior
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            disabled={isLoadingHistorico}
                            className={`px-2 sm:px-3 py-1.5 text-xs sm:text-[14px] rounded-[8px] transition ${
                              pagination.page === pageNum
                                ? 'bg-[#6D75C0] text-white'
                                : 'text-[#6D75C0] border border-[#E5E7EB] bg-white hover:bg-[#F6F7FB]'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={pagination.page === pagination.totalPages || isLoadingHistorico}
                      className="px-2 sm:px-3 py-1.5 text-xs sm:text-[14px] text-[#6D75C0] border border-[#E5E7EB] rounded-[8px] bg-white hover:bg-[#F6F7FB] disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      {/* Espaço extra no mobile para evitar corte */}
      <div className="h-24 sm:h-0"></div>
    </motion.div>
  );
}
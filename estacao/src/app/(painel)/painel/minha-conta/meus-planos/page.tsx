"use client";

import { useCreditoAvulso } from '@/hooks/useHook';
import { CreditoAvulso } from '@/services/userAvulsoService';
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import { useGetUserPlano, useEnvioContrato } from "@/hooks/user/userHook";
import ModalTrocaPlano, { MultaInfo } from "@/components/ModalTrocaPlano";
import { useRouter } from "next/navigation";
import { validarCancelamentoPlano } from "@/hooks/paciente/planoPaciente";
import { useFinanceiro } from "@/hooks/paciente/financeiroHook"; 
import ModalCancelamento from "@/components/ModalCancelamento";
import { pacientePlanoService } from "@/services/planoPacienteService";
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { fetchPlano, Plano } from "@/store/planoStore";

type CicloPlanoType = {
  Id: string;
  CicloInicio: string;
  CicloFim: string;
  Status: string;
  ConsultasDisponiveis: number;
  ConsultasUsadas: number;
  CreatedAt: string;
  UpdatedAt?: string;
};

type PlanoType = {
  Id: string;
  Status: string;
  DataInicio: string;
  DataFim: string;
  PlanoAssinatura?: {
    Tipo: string;
    Preco: number;
    Nome: string;
    Duracao?: number;
  };
  Ciclos?: CicloPlanoType[];
  ControleConsulta?: Array<{
    consultasDisponiveis: number;
    consultasAvulsas: number;
  }>;
  ControleConsultaMensal?: Array<{
    Status: string;
    MesReferencia: number;
    AnoReferencia: number;
  }>;
  dataCompra?: string;
};

type FinanceiroType = {
  Id: string;
  DataVencimento: string;
  CreatedAt?: string;
  PlanoAssinaturaId?: string;
  PlanoAssinatura?: {
    Nome: string;
    Tipo?: string;
    Preco?: number;
  };
  Fatura?: {
    Id: string;
    DataEmissao: string;
    DataVencimento: string;
    Status: string;
    CreatedAt?: string;
  };
  Tipo?: string;
  Valor: number;
  Status: string;
};

// Tipo estendido para incluir flag de próximo pagamento
type FinanceiroTypeComProximoPagamento = FinanceiroType & {
  _isProximoPagamento?: boolean;
  VencimentoInfo?: {
    dataVencimento: string;
    diasParaVencer: number;
    statusVencimento: 'Ativo' | 'Vencido' | 'Proximos3Dias';
    tipo: 'Plano' | 'Avulsa' | 'Consulta';
    origem: 'CicloPlano' | 'Financeiro';
    periodoCiclo?: string;
  };
  CicloPlano?: {
    Id: string;
    CicloInicio: Date | string;
    CicloFim: Date | string;
    Status: string;
    ConsultasDisponiveis: number;
    ConsultasUsadas: number;
  };
};

export default function MeusPlanosPage() {
  const { creditoAvulso } = useCreditoAvulso();
  const [tabAtiva, setTabAtiva] = useState<"detalhes" | "historico">("detalhes");
  const { financeiros: financeirosRaw, isLoading: loadingFinanceiro, isError: errorFinanceiro, refetch: refetchFinanceiro } = useFinanceiro();
  // Normaliza financeiros para sempre ser um array
  const financeiros: FinanceiroType[] = React.useMemo(() => {
    return Array.isArray(financeirosRaw) ? financeirosRaw : [];
  }, [financeirosRaw]);
  const { plano, isLoading: isPlanoLoading, refetch: refetchPlano } = useGetUserPlano();
  const queryClient = useQueryClient();
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>("");
  const [filtroDataFim, setFiltroDataFim] = useState<string>("");

  const [modalCancel, setModalCancel] = useState(false);
  const [modalMudarPlano, setModalMudarPlano] = useState(false);
  const [mensagemCancelamento, setMensagemCancelamento] = useState<string | null>(null);
  const [multaMensagem, setMultaMensagem] = useState<string | null>(null);
  const [multaValor, setMultaValor] = useState<number | null>(null);
  const [cancelamentoLoading, setCancelamentoLoading] = useState(false);
  const [cancelamentoPlanoId, setCancelamentoPlanoId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [planosDisponiveis, setPlanosDisponiveis] = useState<Plano[]>([]);
  const [planoSelecionadoId, setPlanoSelecionadoId] = useState<string>("");
  const [aceiteContrato, setAceiteContrato] = useState(false);
  const [trocaPlanoLoading, setTrocaPlanoLoading] = useState(false);
  const router = useRouter();
  const { mutate: enviarContrato } = useEnvioContrato();

  useEffect(() => {
    refetchFinanceiro();
  }, [ refetchFinanceiro]);

  // Listener de socket.io para atualizações em tempo real
  useEffect(() => {
    let socket: ReturnType<typeof import('@/lib/socket').getSocket> | null = null;
    let cleanup: (() => void) | null = null;

    import('@/lib/socket').then(({ getSocket, ensureSocketConnection }) => {
      socket = getSocket();
      if (!socket) return;

      ensureSocketConnection();

      const handlePaymentUpdated = () => {
        console.log('[MeusPlanosPage] Pagamento atualizado recebido, atualizando histórico...');
        queryClient.invalidateQueries({ queryKey: ['financeiro'] });
        refetchFinanceiro();
      };

      const handleFinanceiroUpdated = () => {
        console.log('[MeusPlanosPage] Financeiro atualizado recebido, atualizando histórico...');
        queryClient.invalidateQueries({ queryKey: ['financeiro'] });
        refetchFinanceiro();
      };

      socket.on('payment:updated', handlePaymentUpdated);
      socket.on('financeiro:updated', handleFinanceiroUpdated);

      cleanup = () => {
        if (socket) {
          socket.off('payment:updated', handlePaymentUpdated);
          socket.off('financeiro:updated', handleFinanceiroUpdated);
        }
      };
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [refetchFinanceiro, queryClient]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const carregarPlanos = async () => {
      const planos = await fetchPlano();
      setPlanosDisponiveis(planos);
    };
    carregarPlanos();
  }, []);

  // Função auxiliar para verificar se um ciclo tem consultas válidas (mesma lógica do PainelPlanoCard)
  const cicloTemConsultasValidas = React.useCallback((ciclo: CicloPlanoType): boolean => {
    // Valida Status do CicloPlano
    if (ciclo.Status !== "Ativo") {
      return false;
    }
    
    // Verifica se tem consultas disponíveis
    if ((ciclo.ConsultasDisponiveis || 0) <= 0) {
      return false;
    }
    
    // Verifica validade de 30 dias a partir de CreatedAt
    if (!ciclo.CreatedAt) {
      return false;
    }
    
    const agora = new Date();
    const dataCriacao = new Date(ciclo.CreatedAt);
    const dataValidade = new Date(dataCriacao);
    dataValidade.setDate(dataValidade.getDate() + 30);
    
    // Ciclo é válido se ainda não passou dos 30 dias
    return dataValidade >= agora;
  }, []);

  // PRIORIDADE: Plano Ativo com consultas válidas OU Cancelado com consultas válidas (mesma lógica do PainelPlanoCard)
  const planoAtivo = React.useMemo(() => {
    if (!Array.isArray(plano) || plano.length === 0) return null;
    
    // PRIORIDADE 1: Plano com Status "Ativo" que tenha ciclo com Status "Ativo" e consultas válidas
    const planoAtivoComConsultas = plano.find((p: PlanoType) => {
      // Valida Status da AssinaturaPlano
      if (p.Status !== 'Ativo' && p.Status !== 'AguardandoPagamento') {
        return false;
      }
      
      // Valida se tem ciclos com Status "Ativo" e consultas válidas
      if (!p.Ciclos || !Array.isArray(p.Ciclos)) {
        return false;
      }
      
      return p.Ciclos.some((ciclo: CicloPlanoType) => cicloTemConsultasValidas(ciclo));
    });
    
    if (planoAtivoComConsultas) {
      return planoAtivoComConsultas;
    }
    
    // PRIORIDADE 2: Plano com Status "Cancelado" que tenha ciclo com Status "Ativo" e consultas válidas
    const planosCancelados = plano
      .filter((p: PlanoType) => p.Status === 'Cancelado')
      .sort((a, b) => {
        const dataA = new Date(a.DataInicio || 0).getTime();
        const dataB = new Date(b.DataInicio || 0).getTime();
        return dataB - dataA; // Mais recente primeiro
      });
    
    for (const p of planosCancelados) {
      if (p.Ciclos && Array.isArray(p.Ciclos)) {
        const temCicloComConsultas = p.Ciclos.some((ciclo: CicloPlanoType) => cicloTemConsultasValidas(ciclo));
        if (temCicloComConsultas) {
          return p;
        }
      }
    }
    
    // PRIORIDADE 3: Se não encontrou com consultas válidas, retorna plano ativo mesmo sem consultas
    const planoAtivoSemConsultas = plano.find((p: PlanoType) => {
      return p.Status === 'Ativo' || p.Status === 'AguardandoPagamento';
    });
    
    if (planoAtivoSemConsultas) {
      return planoAtivoSemConsultas;
    }
    
    return null;
  }, [plano, cicloTemConsultasValidas]);

  const getUltimoPlanoCompra = (): PlanoType | null => {
    if (!plano || plano.length === 0) return null;
    return [...plano].sort((a, b) => new Date(b.DataInicio).getTime() - new Date(a.DataInicio).getTime())[0];
  };

  const ultimoPlano = getUltimoPlanoCompra();
  
  // Plano a ser exibido: apenas o plano ativo (não cancelado)
  // Após mudança de plano, o plano antigo é cancelado e seus ciclos são zerados
  const planoExibido = planoAtivo;

  /**
   * Calcula a multa proporcional baseada na lei do consumidor
   * 
   * Regras:
   * - Período de arrependimento: 7 dias (sem multa)
   * - A partir do 8º dia pode incidir multa
   * - Aplica apenas para planos Semestral e Trimestral (mensal não tem multa)
   * 
   * Fórmula de cálculo:
   * 1. Valor total do plano = valor mensal × número de meses
   * 2. Total de dias do plano = meses × 30 dias
   * 3. Dias usados = dias desde a contratação
   * 4. Dias restantes = total de dias - dias usados
   * 5. Valor diário = valor total / total de dias
   * 6. Valor proporcional restante = valor diário × dias restantes
   * 7. Multa = valor proporcional restante × 20%
   */
  const verificarMulta = (plano: PlanoType | null): { deveAplicar: boolean; valor: number } => {
    if (!plano || !plano.PlanoAssinatura?.Tipo || !plano.DataInicio) {
      return { deveAplicar: false, valor: 0 };
    }

    const valorMensal = plano.PlanoAssinatura.Preco || 0;
    const tipoPlano = plano.PlanoAssinatura.Tipo.toLowerCase();

    // Verifica se o plano tem multa (apenas Semestral e Trimestral)
    let numeroMeses = 0;
    if (tipoPlano === "semestral") {
      numeroMeses = 6;
    } else if (tipoPlano === "trimestral") {
      numeroMeses = 3;
    } else {
      // Plano mensal não tem multa
      return { deveAplicar: false, valor: 0 };
    }

    // Calcula quantos dias se passaram desde o início do plano
    const dataInicio = new Date(plano.DataInicio);
    const dataAtual = new Date();
    const diffMs = dataAtual.getTime() - dataInicio.getTime();
    const diasUsados = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // +1 porque o dia da contratação conta como dia 1

    // Período de arrependimento: 7 dias (sem multa)
    const periodoArrependimento = 7;
    if (diasUsados <= periodoArrependimento) {
      return { deveAplicar: false, valor: 0 };
    }

    // Calcula valor total do plano
    const valorTotalPlano = valorMensal * numeroMeses;

    // Calcula total de dias do plano (aproximação: 30 dias por mês)
    const diasPorMes = 30;
    const totalDiasPlano = numeroMeses * diasPorMes;

    // Calcula dias restantes
    const diasRestantes = Math.max(0, totalDiasPlano - diasUsados);

    // Se não há dias restantes, não aplica multa
    if (diasRestantes <= 0) {
      return { deveAplicar: false, valor: 0 };
    }

    // Calcula valor diário do plano
    const valorDiario = valorTotalPlano / totalDiasPlano;

    // Calcula valor proporcional do período restante
    const valorProporcionalRestante = valorDiario * diasRestantes;

    // Calcula multa de 20% sobre o valor proporcional restante
    const multa = valorProporcionalRestante * 0.20;

    // Arredonda para 2 casas decimais
    const valorMulta = Math.round(multa * 100) / 100;

    return {
      deveAplicar: true,
      valor: valorMulta
    };
  };

  const handleCancelarPlano = (planoId: string) => {
    const planos = plano?.find((p: PlanoType) => p.Id === planoId);
    
    // Validação prévia do status do plano
    if (!planos) {
      toast.error('Plano não encontrado');
      return;
    }
    
    // Verifica se o plano pode ser cancelado
    if (planos.Status !== "Ativo") {
      let mensagemErro = '';
      switch (planos.Status) {
        case "Cancelado":
          mensagemErro = 'Este plano já foi cancelado anteriormente.';
          break;
        case "Expirado":
          mensagemErro = 'Este plano já expirou e não pode ser cancelado.';
          break;
        case "AguardandoPagamento":
          mensagemErro = 'Este plano está aguardando pagamento. Complete o pagamento antes de tentar cancelar.';
          break;
        default:
          mensagemErro = `Este plano está com status "${planos.Status}" e não pode ser cancelado. Apenas planos ativos podem ser cancelados.`;
      }
      toast.error(mensagemErro);
      return;
    }
    
    let mensagem = null;
    
    // Prepara dados para validarCancelamentoPlano
    if (planos) {
      const planoParaValidacao = {
        tipoRecorrencia: planos.PlanoAssinatura?.Tipo || "",
        createdAt: planos.DataInicio,
        dataCompra: planos.dataCompra || planos.DataInicio,
        plano: {
          type: planos.PlanoAssinatura?.Tipo || ""
        }
      };
      const validacao = validarCancelamentoPlano(planoParaValidacao);
      mensagem = validacao.message ?? null;
    }
    
    // Verifica se deve aplicar multa
    const multaInfo = verificarMulta(planos || null);
    
    if (multaInfo.deveAplicar) {
      setMultaMensagem("Multa por descomprometimento do prazo contratual");
      setMultaValor(multaInfo.valor);
    } else {
      setMultaMensagem(null);
      setMultaValor(null);
    }
    
    setMensagemCancelamento(mensagem);
    setCancelamentoPlanoId(planoId);
    setModalCancel(true);
  };

  const handleCloseModal = () => {
    setModalCancel(false);
    setMensagemCancelamento(null);
    setMultaMensagem(null);
    setMultaValor(null);
    setCancelamentoPlanoId(null);
    setCancelamentoLoading(false);
  };

  const handleConfirmarCancelamento = async () => {
    if (!cancelamentoPlanoId || cancelamentoLoading) {
      toast.error('ID do plano não encontrado. Por favor, tente novamente.');
      return;
    }
    
    // Validação adicional do ID
    if (typeof cancelamentoPlanoId !== 'string' || cancelamentoPlanoId.trim() === '') {
      toast.error('ID do plano inválido. Por favor, tente novamente.');
      return;
    }
    
    setCancelamentoLoading(true);
    try {
      // Chamada para API de cancelamento
      const response = await pacientePlanoService().cancelarPlano({ 
        assinaturaPlanoId: cancelamentoPlanoId.trim() 
      });
      
      // Verifica se a resposta indica multa gerada
      const responseData = response?.data || response;
      const hasMulta = responseData?.multa !== undefined;
      
      if (hasMulta) {
        // Se há multa, mostra mensagem informativa
        toast.success(`Plano cancelado com sucesso! Multa de R$ ${responseData.multa.toFixed(2)} gerada e será debitada do seu cartão.`);
      } else {
        // Mostra mensagem de sucesso padrão
        toast.success('Plano cancelado com sucesso!');
      }
      
      // Fecha o modal
      handleCloseModal();
      
      // Invalida o cache e atualiza os dados do plano e financeiro
      queryClient.invalidateQueries({ queryKey: ['userPlano'] });
      await Promise.all([
        refetchPlano(),
        refetchFinanceiro()
      ]);
    } catch (err) {
      const axiosError = err as AxiosError<{ 
        message?: string; 
        multa?: number;
        code?: string;
        statusAtual?: string;
        success?: boolean;
      }>;
      
      // Verifica se é uma resposta de sucesso com multa (status 200 mas com multa)
      if (axiosError?.response?.status === 200 && axiosError?.response?.data?.multa !== undefined) {
        const multa = axiosError.response.data.multa;
        toast.success(`Plano cancelado com sucesso! Multa de R$ ${multa.toFixed(2)} gerada e será debitada do seu cartão.`);
        handleCloseModal();
        // Invalida o cache e atualiza os dados
        queryClient.invalidateQueries({ queryKey: ['userPlano'] });
        await Promise.all([
          refetchPlano(),
          refetchFinanceiro()
        ]);
      } else {
        // Tratamento melhorado de erros com mensagens específicas
        const errorData = axiosError?.response?.data;
        let errorMessage = 'Erro ao cancelar plano';
        
        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.code) {
          // Mensagens amigáveis baseadas no código de erro
          switch (errorData.code) {
            case 'PLANO_JA_CANCELADO':
              errorMessage = 'Este plano já foi cancelado anteriormente.';
              break;
            case 'PLANO_EXPIRADO':
              errorMessage = 'Este plano já expirou e não pode ser cancelado.';
              break;
            case 'PLANO_AGUARDANDO_PAGAMENTO':
              errorMessage = 'Este plano está aguardando pagamento. Complete o pagamento antes de tentar cancelar.';
              break;
            case 'PLANO_STATUS_INVALIDO':
              errorMessage = `Este plano está com status "${errorData.statusAtual || 'indefinido'}" e não pode ser cancelado.`;
              break;
            case 'PLANO_NAO_ENCONTRADO':
              errorMessage = 'Plano não encontrado ou não pertence ao seu usuário.';
              break;
            case 'ASSINATURA_PLANO_ID_OBRIGATORIO':
              errorMessage = 'O ID do plano é obrigatório. Por favor, tente novamente.';
              break;
            case 'ASSINATURA_PLANO_ID_INVALIDO':
              errorMessage = 'O ID do plano fornecido é inválido. Por favor, tente novamente.';
              break;
            default:
              errorMessage = errorData.message || 'Erro ao cancelar plano';
          }
        } else if (axiosError?.message) {
          errorMessage = axiosError.message;
        }
        
        toast.error(errorMessage);
        setCancelamentoLoading(false);
        
        // Se o plano já está cancelado ou em status inválido, fecha o modal e atualiza os dados
        if (errorData?.code === 'PLANO_JA_CANCELADO' || errorData?.code === 'PLANO_EXPIRADO') {
          handleCloseModal();
          queryClient.invalidateQueries({ queryKey: ['userPlano'] });
          await Promise.all([
            refetchPlano(),
            refetchFinanceiro()
          ]);
        }
      }
    }
  };

  const handleAbrirModalMudarPlano = () => {
    if (planosDisponiveis.length === 0) {
      toast.error('Nenhum plano disponível para troca no momento.');
      return;
    }

    // SEMPRE usa o plano ativo para verificar o tipo
    if (!planoAtivo || !planoAtivo.Id) {
      toast.error('Não foi possível encontrar seu plano ativo. Por favor, recarregue a página.');
      return;
    }

    // Obtém o tipo do plano atual (normalizado para lowercase)
    const tipoPlanoAtual = planoAtivo?.PlanoAssinatura?.Tipo?.toLowerCase() || '';
    
    // Filtra planos que não são do mesmo tipo do atual
    // Compara tanto Type quanto Tipo (normalizados para lowercase)
    const planosDisponiveisParaTroca = planosDisponiveis.filter((p) => {
      // Não permite o mesmo ID do plano ativo
      if (p.Id === planoAtivo?.PlanoAssinatura?.Id) return false;
      
      // Não permite o mesmo tipo de plano
      const tipoPlano = (p.Type || p.Tipo || '').toLowerCase();
      if (tipoPlano && tipoPlanoAtual && tipoPlano === tipoPlanoAtual) {
        return false;
      }
      
      return true;
    });

    if (planosDisponiveisParaTroca.length === 0) {
      toast.error('Não há outros planos disponíveis para troca.');
      return;
    }
    
    const primeiroDisponivel = planosDisponiveisParaTroca[0];
    setPlanoSelecionadoId(primeiroDisponivel.Id);
    setAceiteContrato(false);
    // Limpa dados do contrato anterior
    sessionStorage.removeItem('contratoAceito');
    sessionStorage.removeItem('contratoAssinaturaImg');
    sessionStorage.removeItem('contratoHtmlAssinado');
    setModalMudarPlano(true);
  };

  // Função para obter IP público do cliente (com fallback)
  const fetchClientIp = async (): Promise<string | null> => {
    try {
      const res = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      return data.ip ?? null;
    } catch {
      return null;
    }
  };

  const handleConfirmarMudarPlano = async () => {
    if (!planoSelecionadoId) {
      toast.error('Selecione um plano para continuar.');
      return;
    }

    if (!aceiteContrato) {
      toast.error('É necessário aceitar o contrato atualizado para continuar.');
      return;
    }

    // SEMPRE usa o plano ativo para mudança (não o último plano)
    if (!planoAtivo || !planoAtivo.Id) {
      toast.error('Não foi possível encontrar seu plano ativo. Por favor, recarregue a página.');
      return;
    }

    const novoPlano = planosDisponiveis.find((p) => p.Id === planoSelecionadoId);
    if (!novoPlano) {
      toast.error('Plano selecionado não encontrado.');
      return;
    }

    // Validação adicional: não permite trocar para o mesmo tipo de plano
    const tipoPlanoAtual = planoAtivo?.PlanoAssinatura?.Tipo?.toLowerCase() || '';
    const tipoNovoPlano = (novoPlano.Type || novoPlano.Tipo || '').toLowerCase();
    if (tipoPlanoAtual && tipoNovoPlano && tipoPlanoAtual === tipoNovoPlano) {
      toast.error('Não é possível trocar para um plano do mesmo tipo.');
      return;
    }

    const precoAtual = planoAtivo?.PlanoAssinatura?.Preco || 0;
    const isDowngrade = novoPlano.Preco < precoAtual;
    const multaInfo = verificarMulta(planoAtivo);

    setTrocaPlanoLoading(true);
    try {
      const payload = {
        assinaturaPlanoAtualId: planoAtivo.Id, // Usa o plano ativo, não o último plano
        novoPlanoId: novoPlano.Id,
      };

      const servico = pacientePlanoService();
      const response = isDowngrade
        ? await servico.downgradePlano(payload)
        : await servico.upgradePlano(payload);

      // Verifica se a resposta do backend já inclui informação sobre multa
      const responseData = response.data || {};
      const mensagemBase = responseData.message || 'Plano alterado com sucesso!';
      const multaBackend = responseData.multa;
      
      // Se houver multa no backend ou na validação local, informa ao usuário
      const valorMultaFinal = multaBackend || (isDowngrade && multaInfo.deveAplicar ? multaInfo.valor : 0);
      
      if (valorMultaFinal > 0) {
        toast.success(`${mensagemBase} Uma multa de R$ ${valorMultaFinal.toFixed(2)} será cobrada automaticamente no seu cartão.`, {
          duration: 6000,
        });
      } else {
        toast.success(`${mensagemBase} Seu novo plano será ativado em breve (2-5 s).`, {
          duration: 4000,
        });
      }
      
      // Envia o contrato assinado após a mudança de plano
      const contratoAssinaturaImg = sessionStorage.getItem('contratoAssinaturaImg') || "";
      if (contratoAssinaturaImg && novoPlano) {
        (async () => {
          const ip = await fetchClientIp();
          enviarContrato({ 
            plano: novoPlano,
            assinaturaBase64: contratoAssinaturaImg,
            IpNavegador: ip ?? ("" + window.navigator.userAgent)
          }, {
            onSuccess: () => {
              sessionStorage.removeItem('contratoAceito');
              sessionStorage.removeItem('contratoAssinaturaImg');
              sessionStorage.removeItem('contratoHtmlAssinado');
            },
            onError: () => {
              sessionStorage.removeItem('contratoAceito');
              sessionStorage.removeItem('contratoAssinaturaImg');
              sessionStorage.removeItem('contratoHtmlAssinado');
            }
          });
        })();
      }

      setModalMudarPlano(false);
      setAceiteContrato(false);
      setPlanoSelecionadoId("");
      
      // Invalida e refaz as queries para atualizar os dados
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['userPlano'] }),
        queryClient.invalidateQueries({ queryKey: ['verificar-saldo-consulta'] }),
        refetchPlano(),
        refetchFinanceiro()
      ]);
      
      // Aguarda um pouco para garantir que os dados foram atualizados
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refaz as queries novamente para garantir que os ciclos antigos não apareçam
      await Promise.all([
        refetchPlano(),
        queryClient.invalidateQueries({ queryKey: ['verificar-saldo-consulta'] })
      ]);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const mensagemErro = axiosError.response?.data?.message || axiosError.message || 'Erro ao mudar plano';
      toast.error(mensagemErro);
    } finally {
      setTrocaPlanoLoading(false);
    }
  };

  // Busca TODOS os ciclos ativos do plano com consultas válidas (valida Status do CicloPlano) - mesma lógica do PainelPlanoCard
  const ciclosAtivosValidos = React.useMemo(() => {
    if (!planoAtivo || !planoAtivo.Ciclos || !Array.isArray(planoAtivo.Ciclos)) {
      return [];
    }
    
    // Filtra apenas ciclos que têm consultas válidas (Status "Ativo" + consultas disponíveis + validade)
    return planoAtivo.Ciclos.filter((ciclo: CicloPlanoType) => cicloTemConsultasValidas(ciclo));
  }, [planoAtivo, cicloTemConsultasValidas]);

  // Pega o ciclo mais recente entre os válidos (para exibição)
  const cicloAtivo = React.useMemo(() => {
    if (ciclosAtivosValidos.length === 0) {
      return null;
    }
    
    // Ordena por CreatedAt (mais recente primeiro) e pega o primeiro
    return [...ciclosAtivosValidos].sort((a, b) => {
      const dataA = new Date(a.CreatedAt).getTime();
      const dataB = new Date(b.CreatedAt).getTime();
      return dataB - dataA;
    })[0];
  }, [ciclosAtivosValidos]);

  // Calcula consultas restantes somando todos os ciclos ativos e válidos (mesma lógica do PainelPlanoCard)
  const consultasRestantes = React.useMemo(() => {
    if (ciclosAtivosValidos.length === 0) {
      return 0;
    }
    
    // Soma todas as consultas disponíveis dos ciclos válidos
    return ciclosAtivosValidos.reduce((total: number, ciclo: CicloPlanoType) => {
      return total + Math.max(0, ciclo.ConsultasDisponiveis || 0);
    }, 0);
  }, [ciclosAtivosValidos]);

  // Data de validade do ciclo calculada a partir do CreatedAt + 30 dias (usa o ciclo mais recente)
  const dataValidadeCiclo = React.useMemo(() => {
    if (!cicloAtivo?.CreatedAt) return null;
    const dataCriacao = new Date(cicloAtivo.CreatedAt);
    const dataValidade = new Date(dataCriacao);
    dataValidade.setDate(dataValidade.getDate() + 30); // Cada ciclo tem 30 dias de validade
    return dataValidade;
  }, [cicloAtivo]);

  // Calcula dias restantes do ciclo ativo baseado no CreatedAt + 30 dias
  const diasRestantesCiclo = React.useMemo(() => {
    if (!dataValidadeCiclo) return 0;
    const agora = new Date();
    const diffMs = dataValidadeCiclo.getTime() - agora.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [dataValidadeCiclo]);

  // Usa o plano ativo para identificar o plano atual
  const planoAtualId = planoAtivo?.Id || null;

  const planoSelecionado = React.useMemo(() => {
    if (!planoSelecionadoId) return undefined;
    return planosDisponiveis.find((p) => p.Id === planoSelecionadoId);
  }, [planoSelecionadoId, planosDisponiveis]);

  const multaInfoModal: MultaInfo | undefined = React.useMemo(() => {
    if (!ultimoPlano || !planoAtivo) return undefined;
    if (!planoSelecionado) {
      return {
        aplica: false,
        valor: 0,
        mensagem: 'Selecione um novo plano para ver se há multa.',
      };
    }

    const precoAtual = planoAtivo?.PlanoAssinatura?.Preco || 0;
    const isDowngrade = planoSelecionado.Preco < precoAtual;
    if (!isDowngrade) {
      return {
        aplica: false,
        valor: 0,
        mensagem: 'Sem multa. Mudança sem custo adicional.',
      };
    }

    const resultado = verificarMulta(ultimoPlano);
    if (!resultado.deveAplicar) {
      return {
        aplica: false,
        valor: 0,
        mensagem: 'Sem multa. Você já cumpriu o primeiro período.',
      };
    }

    return {
      aplica: true,
      valor: resultado.valor,
      mensagem: 'Multa aplicável por alterar durante o primeiro ciclo.',
    };
  }, [planoSelecionado, ultimoPlano, planoAtivo]);

  // Calcula data da próxima renovação baseada no tipo de plano
  const calcularProximaRenovacao = React.useCallback((tipoPlano: string | undefined, dataInicio: string | undefined): Date | null => {
    if (!tipoPlano || !dataInicio) return null;
    
    const inicio = new Date(dataInicio);
    const agora = new Date();
    
    // Se o plano está ativo, calcula a próxima renovação a partir da data atual
    // Se não está ativo, calcula a partir da data de início
    const dataBase = planoAtivo?.Status === "Ativo" ? agora : inicio;
    
    switch (tipoPlano.toLowerCase()) {
      case "mensal":
        const proximoMes = new Date(dataBase);
        proximoMes.setMonth(proximoMes.getMonth() + 1);
        return proximoMes;
      case "trimestral":
        const proximoTri = new Date(dataBase);
        proximoTri.setMonth(proximoTri.getMonth() + 3);
        return proximoTri;
      case "semestral":
        const proximoSem = new Date(dataBase);
        proximoSem.setMonth(proximoSem.getMonth() + 6);
        return proximoSem;
      case "anual":
        const proximoAno = new Date(dataBase);
        proximoAno.setFullYear(proximoAno.getFullYear() + 1);
        return proximoAno;
      default:
        return null;
    }
  }, [planoAtivo?.Status]);

  const proximaRenovacao = calcularProximaRenovacao(
    planoAtivo?.PlanoAssinatura?.Tipo,
    planoAtivo?.DataInicio
  );

  // Função para exibir status amigável
  function getStatusAmigavel(status: string, isProximoPagamento?: boolean) {
    if (isProximoPagamento && status === "AguardandoPagamento") {
      return "A Vencer";
    }
    
    switch (status) {
      case "AguardandoPagamento":
        return "Aguardando pagamento";
      case "Cancelado":
        return "Cancelado";
      case "EmMonitoramento":
        return "Em monitoramento";
      case "Reprovado":
        return "Reprovado";
      case "Aprovado":
        return "Pago";
      case "EmDisputa":
        return "Em disputa";
      case "Chargeback":
        return "Chargeback";
      default:
        return status || "-";
    }
  }

  // Função para exibir tipo de movimentação financeira
  function getTipoMovimentacao(tipo: string) {
    switch (tipo) {
      case "Plano":
        return "Plano";
      case "Multa":
        return "Multa";
      case "Upgrade":
        return "Upgrade";
      case "Downgrade":
        return "Downgrade";
      case "ConsultaAvulsa":
      case "unico":
        return "Avulsa";
      case "PrimeiraConsulta":
        return "Promocional";
      default:
        return tipo || "Plano";
    }
  }

  // Função auxiliar para obter data de ordenação
  const getDataOrdenacao = useCallback((item: FinanceiroType): number => {
    // Prioriza Fatura.CreatedAt (data de pagamento real)
    if (item.Fatura?.CreatedAt) {
      return new Date(item.Fatura.CreatedAt).getTime();
    }
    // Depois CreatedAt do financeiro (data de criação da transação)
    if (item.CreatedAt) {
      return new Date(item.CreatedAt).getTime();
    }
    // Por último DataVencimento (data de vencimento da parcela)
    if (item.DataVencimento) {
      return new Date(item.DataVencimento).getTime();
    }
    return 0;
  }, []);

  // Função para verificar se um plano é o novo plano após downgrade
  const isNovoPlanoAposDowngrade = useCallback((planoItem: FinanceiroType, downgradeItem: FinanceiroType): boolean => {
    if (planoItem.Tipo !== "Plano" || downgradeItem.Tipo !== "Downgrade") return false;
    
    const dataDowngrade = getDataOrdenacao(downgradeItem);
    const dataPlano = getDataOrdenacao(planoItem);
    
    // O novo plano deve acontecer após ou no mesmo momento do downgrade
    // Aceita até 1 hora antes para considerar possíveis diferenças de timestamp
    if (dataPlano < dataDowngrade - (1000 * 60 * 60)) return false;
    
    // Deve estar dentro de um período razoável (até 7 dias)
    const diffHoras = Math.abs(dataPlano - dataDowngrade) / (1000 * 60 * 60);
    if (diffHoras > 168) return false; // 7 dias
    
    return true;
  }, [getDataOrdenacao]);

  // Função para verificar se um plano é relacionado a um upgrade
  const isPlanoRelacionadoUpgrade = useCallback((planoItem: FinanceiroType, upgradeItem: FinanceiroType): boolean => {
    if (planoItem.Tipo !== "Plano" || upgradeItem.Tipo !== "Upgrade") return false;
    
    const dataUpgrade = getDataOrdenacao(upgradeItem);
    const dataPlano = getDataOrdenacao(planoItem);
    
    // O plano relacionado ao upgrade deve acontecer após ou no mesmo momento
    if (dataPlano < dataUpgrade - (1000 * 60 * 60)) return false;
    
    // Deve estar dentro de um período razoável (até 7 dias)
    const diffHoras = Math.abs(dataPlano - dataUpgrade) / (1000 * 60 * 60);
    if (diffHoras > 168) return false; // 7 dias
    
    return true;
  }, [getDataOrdenacao]);

  // Função para verificar se duas transações estão relacionadas (parte do mesmo downgrade ou upgrade)
  const saoTransacoesRelacionadas = useCallback((transacaoPrincipal: FinanceiroType, outro: FinanceiroType): boolean => {
    const dataPrincipal = getDataOrdenacao(transacaoPrincipal);
    const dataOutro = getDataOrdenacao(outro);
    const diffHoras = Math.abs(dataPrincipal - dataOutro) / (1000 * 60 * 60);
    
    // Se são próximas no tempo (dentro de 48 horas para garantir que pegue o novo plano)
    if (diffHoras > 48) return false;
    
    // Se é Multa e está próxima da transação principal (mesmo dia ou próximo)
    if (outro.Tipo === "Multa") {
      const diffDias = Math.abs(dataPrincipal - dataOutro) / (1000 * 60 * 60 * 24);
      return diffDias <= 1; // Mesmo dia ou dia seguinte
    }
    
    // Se é Plano
    if (outro.Tipo === "Plano") {
      if (transacaoPrincipal.Tipo === "Downgrade") {
        return isNovoPlanoAposDowngrade(outro, transacaoPrincipal);
      } else if (transacaoPrincipal.Tipo === "Upgrade") {
        return isPlanoRelacionadoUpgrade(outro, transacaoPrincipal);
      }
    }
    
    return false;
  }, [getDataOrdenacao, isNovoPlanoAposDowngrade, isPlanoRelacionadoUpgrade]);

  // Ordena e pagina os financeiros - agrupa transações relacionadas a downgrade
  const financeirosOrdenados = React.useMemo(() => {
    if (!Array.isArray(financeiros) || financeiros.length === 0) return [];
    
    // Primeiro, ordena por data (mais recente primeiro)
    const ordenadosPorData = [...financeiros].sort((a, b) => {
      const dataA = getDataOrdenacao(a);
      const dataB = getDataOrdenacao(b);
      return dataB - dataA; // Descendente (mais recente primeiro)
    });
    
    // Agora, agrupa transações relacionadas a downgrade e reordena dentro do grupo
    const resultado: FinanceiroType[] = [];
    const processados = new Set<string>();
    
    ordenadosPorData.forEach((item) => {
      if (processados.has(item.Id)) return;
      
      // Se é um Downgrade ou Upgrade, tenta encontrar Multa e Plano relacionados
      if (item.Tipo === "Downgrade" || item.Tipo === "Upgrade") {
        const grupo: FinanceiroType[] = [];
        processados.add(item.Id);
        
        const dataPrincipal = getDataOrdenacao(item);
        let planoAnteriorEncontrado: FinanceiroType | null = null;
        let multaEncontrada: FinanceiroType | null = null;
        let novoPlanoEncontrado: FinanceiroType | null = null;
        
        // Adiciona a transação principal (Downgrade ou Upgrade) primeiro
        grupo.push(item);
        
        // Para Upgrade, busca o plano anterior (cancelado) que deve vir ANTES ou na mesma data
        if (item.Tipo === "Upgrade") {
          ordenadosPorData.forEach((outro) => {
            if (processados.has(outro.Id)) return;
            if (outro.Id === item.Id) return;
            
            const dataOutro = getDataOrdenacao(outro);
            
            // Busca planos cancelados que foram cancelados antes ou na mesma data do upgrade
            // O plano cancelado deve ter sido cancelado ANTES do upgrade
            if (outro.Tipo === "Plano" && outro.Status === "Cancelado") {
              const diffHoras = Math.abs(dataPrincipal - dataOutro) / (1000 * 60 * 60);
              // Aceita planos cancelados até 48 horas antes do upgrade ou até 1 hora depois (mesmo processo)
              if ((dataOutro <= dataPrincipal + (1000 * 60 * 60) || diffHoras <= 48) && !planoAnteriorEncontrado) {
                planoAnteriorEncontrado = outro;
                grupo.push(outro);
                processados.add(outro.Id);
              }
            }
          });
        }
        
        // Busca Multa e Novo Plano relacionados (que aconteceram após a transação principal)
        ordenadosPorData.forEach((outro) => {
          if (processados.has(outro.Id)) return;
          if (outro.Id === item.Id) return;
          
          const dataOutro = getDataOrdenacao(outro);
          
          // Só busca transações que aconteceram após a transação principal (mesmo dia ou depois)
          if (dataOutro >= dataPrincipal - (1000 * 60 * 60) || Math.abs(dataOutro - dataPrincipal) < (1000 * 60 * 60 * 24 * 7)) {
            // Busca Multa relacionada
            if (outro.Tipo === "Multa" && !multaEncontrada && saoTransacoesRelacionadas(item, outro)) {
              multaEncontrada = outro;
              grupo.push(outro);
              processados.add(outro.Id);
            } 
            // Busca Novo Plano relacionado (mas não se já foi usado como plano anterior cancelado)
            else if (outro.Tipo === "Plano" && !novoPlanoEncontrado && outro.Id !== planoAnteriorEncontrado?.Id) {
              if (item.Tipo === "Downgrade" && isNovoPlanoAposDowngrade(outro, item)) {
                novoPlanoEncontrado = outro;
                grupo.push(outro);
                processados.add(outro.Id);
              } else if (item.Tipo === "Upgrade" && outro.Status !== "Cancelado" && isPlanoRelacionadoUpgrade(outro, item)) {
                // Para Upgrade, o novo plano NÃO pode ser cancelado (é o novo plano ativo)
                novoPlanoEncontrado = outro;
                grupo.push(outro);
                processados.add(outro.Id);
              }
            }
          }
        });
        
        // Ordena o grupo conforme o tipo
        grupo.sort((a, b) => {
          const ordemTipo = (tipo: string | undefined, status: string | undefined) => {
            if (tipo === "Plano" && status === "Cancelado") return 1; // Plano cancelado primeiro (só para Upgrade)
            if (tipo === "Downgrade") return 2;
            if (tipo === "Upgrade") return 2; // Upgrade vem depois do plano cancelado (se houver)
            if (tipo === "Multa") return 3;
            if (tipo === "Plano") return 4; // Novo plano por último
            return 5;
          };
          
          const ordemA = ordemTipo(a.Tipo, a.Status);
          const ordemB = ordemTipo(b.Tipo, b.Status);
          
          if (ordemA !== ordemB) {
            return ordemA - ordemB;
          }
          
          // Se mesmo tipo, mantém ordem por data
          return getDataOrdenacao(a) - getDataOrdenacao(b);
        });
        
        resultado.push(...grupo);
      } else if (item.Tipo === "Plano" && item.Status === "Cancelado") {
        // Se é um plano cancelado, busca a multa relacionada
        const grupo: FinanceiroType[] = [];
        processados.add(item.Id);
        grupo.push(item);
        
        const dataPrincipal = getDataOrdenacao(item);
        
        // Busca multa relacionada (mesmo PlanoAssinaturaId e mesma data aproximada)
        ordenadosPorData.forEach((outro) => {
          if (processados.has(outro.Id)) return;
          if (outro.Id === item.Id) return;
          
          const dataOutro = getDataOrdenacao(outro);
          const diffHoras = Math.abs(dataPrincipal - dataOutro) / (1000 * 60 * 60);
          
          // Busca multa relacionada ao plano cancelado (mesmo PlanoAssinaturaId e até 24 horas depois)
          if (outro.Tipo === "Multa" && 
              outro.PlanoAssinaturaId === item.PlanoAssinaturaId &&
              dataOutro >= dataPrincipal - (1000 * 60 * 60) && // Pode ser até 1 hora antes
              diffHoras <= 24) { // Ou até 24 horas depois
            grupo.push(outro);
            processados.add(outro.Id);
          }
        });
        
        // Ordena: plano cancelado primeiro, depois multa
        grupo.sort((a, b) => {
          if (a.Tipo === "Plano" && b.Tipo === "Multa") return -1;
          if (a.Tipo === "Multa" && b.Tipo === "Plano") return 1;
          return getDataOrdenacao(a) - getDataOrdenacao(b);
        });
        
        resultado.push(...grupo);
      } else {
        // Se não é parte de um grupo de downgrade/upgrade ou plano cancelado, adiciona normalmente
        // Mas verifica se não foi processado antes (pode ter sido incluído em outro grupo)
        if (!processados.has(item.Id)) {
          resultado.push(item);
          processados.add(item.Id);
        }
      }
    });
    
    // Remove duplicatas por Id (garantia adicional)
    const idsVistos = new Set<string>();
    const resultadoUnico = resultado.filter(fin => {
      if (idsVistos.has(fin.Id)) {
        return false;
      }
      idsVistos.add(fin.Id);
      return true;
    });
    
    return resultadoUnico;
  }, [financeiros, getDataOrdenacao, isNovoPlanoAposDowngrade, isPlanoRelacionadoUpgrade, saoTransacoesRelacionadas]);

  // Adiciona próximo pagamento se houver plano ativo
  const financeirosComProximoPagamento = React.useMemo((): FinanceiroTypeComProximoPagamento[] => {
    const resultado: FinanceiroTypeComProximoPagamento[] = [...financeirosOrdenados];
    
    // Se há plano ativo e não há pagamento futuro já na lista
    if (planoAtivo && planoAtivo.Status === "Ativo" && planoAtivo.PlanoAssinatura) {
      const proximaRenovacaoData = calcularProximaRenovacao(
        planoAtivo.PlanoAssinatura.Tipo,
        planoAtivo.DataInicio
      );
      
      if (proximaRenovacaoData) {
        // Verifica se já existe um financeiro com essa data de vencimento
        const jaExiste = resultado.some((f: FinanceiroTypeComProximoPagamento) => {
          if (!f.DataVencimento) return false;
          const dataVenc = new Date(f.DataVencimento);
          const diffDias = Math.abs(dataVenc.getTime() - proximaRenovacaoData.getTime()) / (1000 * 60 * 60 * 24);
          return diffDias < 1; // Mesmo dia (diferença menor que 1 dia)
        });
        
        if (!jaExiste) {
          // Cria registro do próximo pagamento
          const proximoPagamento: FinanceiroTypeComProximoPagamento = {
            Id: `proximo-${planoAtivo.Id}`,
            PlanoAssinaturaId: planoAtivo.PlanoAssinaturaId || "",
            Valor: planoAtivo.PlanoAssinatura.Preco || 0,
            DataVencimento: proximaRenovacaoData.toISOString(),
            Status: "AguardandoPagamento", // Será exibido como "A Vencer"
            Tipo: "Plano",
            CreatedAt: new Date().toISOString(),
            PlanoAssinatura: planoAtivo.PlanoAssinatura,
            // Flag especial para identificar que é próximo pagamento
            _isProximoPagamento: true
          };
          
          // Adiciona no início da lista (mais recente)
          resultado.unshift(proximoPagamento);
        }
      }
    }
    
    return resultado;
  }, [financeirosOrdenados, planoAtivo, calcularProximaRenovacao]);

  // Aplica filtros
  const financeirosFiltrados = React.useMemo(() => {
    let resultado = [...financeirosComProximoPagamento];

    // Filtro por tipo
    if (filtroTipo) {
      resultado = resultado.filter((f) => {
        if (filtroTipo === "ConsultaAvulsa" || filtroTipo === "unico") {
          return f.Tipo === "ConsultaAvulsa" || f.Tipo === "unico";
        }
        return f.Tipo === filtroTipo;
      });
    }

    // Filtro por data
    if (filtroDataInicio || filtroDataFim) {
      resultado = resultado.filter((f) => {
        const dataVencimento = f.DataVencimento ? new Date(f.DataVencimento) : null;
        if (!dataVencimento) return true; // Mantém se não tiver data

        if (filtroDataInicio) {
          const dataInicio = new Date(filtroDataInicio);
          dataInicio.setHours(0, 0, 0, 0);
          if (dataVencimento < dataInicio) return false;
        }

        if (filtroDataFim) {
          const dataFim = new Date(filtroDataFim);
          dataFim.setHours(23, 59, 59, 999);
          if (dataVencimento > dataFim) return false;
        }

        return true;
      });
    }

    return resultado;
  }, [financeirosComProximoPagamento, filtroTipo, filtroDataInicio, filtroDataFim]);

  // Reset página quando filtros mudarem
  React.useEffect(() => {
    setPaginaAtual(1);
  }, [filtroTipo, filtroDataInicio, filtroDataFim, registrosPorPagina]);

  const totalPaginas = Math.ceil(financeirosFiltrados.length / registrosPorPagina);
  const financeirosPaginados = financeirosFiltrados.slice(
    (paginaAtual - 1) * registrosPorPagina,
    paginaAtual * registrosPorPagina
  );

  // Função para obter data de pagamento - sempre mostra quando disponível
  const getDataPagamento = (financeiro: FinanceiroTypeComProximoPagamento): string | null => {
    // Se é próximo pagamento, retorna null (mostra hífen)
    if (financeiro._isProximoPagamento) {
      return null;
    }
    
    // Prioriza Fatura.CreatedAt (data de pagamento real da Vindi) se disponível
    if (financeiro.Fatura?.CreatedAt) {
      return financeiro.Fatura.CreatedAt;
    }
    // Depois CreatedAt do financeiro (data de criação da transação)
    if (financeiro.CreatedAt) {
      return financeiro.CreatedAt;
    }
    // Por último DataVencimento (data de vencimento da parcela)
    return financeiro.DataVencimento || null;
  };

  // Função para calcular próxima cobrança baseada na data de assinatura original
  const getProximaCobranca = (financeiro: FinanceiroTypeComProximoPagamento): Date | null => {
    // Apenas para planos mostra próxima cobrança
    if (financeiro.Tipo !== "Plano") {
      return null;
    }

    // ✅ NOVA LÓGICA: Se tem CicloPlano, usa CicloFim como próxima cobrança
    if (financeiro.CicloPlano?.CicloFim) {
      return new Date(financeiro.CicloPlano.CicloFim);
    }

    // IMPORTANTE: Calcula baseado na data de assinatura original (DataInicio do plano)
    if (!planoAtivo?.DataInicio) {
      // Fallback: usa DataVencimento + 30 dias se não tiver DataInicio
      if (financeiro.DataVencimento) {
        const dataVenc = new Date(financeiro.DataVencimento);
        const proximaData = new Date(dataVenc);
        proximaData.setDate(proximaData.getDate() + 30);
        return proximaData;
      }
      return null;
    }

    // Busca a data do primeiro pagamento/assinatura do plano
    const dataAssinatura = new Date(planoAtivo.DataInicio);
    const diaAssinatura = dataAssinatura.getDate(); // Dia do mês (26)
    
    // Busca todos os financeiros do plano para contar quantas parcelas já foram criadas
    const financeirosDoPlano = financeiros.filter((f: FinanceiroType) => 
      f.Tipo === "Plano" && 
      f.PlanoAssinaturaId === financeiro.PlanoAssinaturaId
    );
    
    // Se temos DataVencimento da parcela atual, calcula qual parcela é esta
    let numeroParcelaAtual = 1;
    if (financeiro.DataVencimento) {
      const dataVenc = new Date(financeiro.DataVencimento);
      // Calcula diferença em meses desde a data de assinatura
      // A primeira parcela vence 30 dias após a assinatura (1 mês depois)
      const mesesDiff = (dataVenc.getFullYear() - dataAssinatura.getFullYear()) * 12 + 
                        (dataVenc.getMonth() - dataAssinatura.getMonth());
      // Se a DataVencimento está no mesmo mês ou próximo mês da assinatura, é a primeira parcela
      numeroParcelaAtual = Math.max(1, mesesDiff);
    } else {
      // Se não tem DataVencimento, assume que é a próxima parcela após as existentes
      numeroParcelaAtual = financeirosDoPlano.length + 1;
    }
    
    // Próxima cobrança = DataInicio + (número da próxima parcela) meses
    // Próxima parcela = parcela atual + 1
    const proximaParcela = numeroParcelaAtual + 1;
    const proximaData = new Date(dataAssinatura);
    proximaData.setMonth(proximaData.getMonth() + proximaParcela);
    
    // Garante que o dia seja o mesmo da assinatura (26)
    proximaData.setDate(diaAssinatura);
    
    return proximaData;
  };

  // Função para buscar o plano cancelado quando é downgrade ou upgrade
  const getPlanoCanceladoDowngrade = (financeiro: FinanceiroType): PlanoType | null => {
    if (financeiro.Tipo !== "Downgrade" && financeiro.Tipo !== "Upgrade") return null;
    
    if (!plano || !Array.isArray(plano) || plano.length === 0) return null;
    
    // Busca a data da transação
    const dataTransacao = financeiro.Fatura?.CreatedAt || financeiro.CreatedAt || financeiro.DataVencimento;
    if (!dataTransacao) return null;
    
    const dataTransacaoDate = new Date(dataTransacao);
    
    // Busca planos cancelados antes ou na mesma data da transação
    // Ordena por data de início (mais recente primeiro)
    const planosCancelados = plano
      .filter((p: PlanoType) => {
        if (p.Status !== "Cancelado") return false;
        if (!p.DataFim) return false;
        const dataFim = new Date(p.DataFim);
        // Plano cancelado antes ou na mesma data da transação
        return dataFim <= dataTransacaoDate;
      })
      .sort((a: PlanoType, b: PlanoType) => {
        const dataFimA = new Date(a.DataFim || a.DataInicio);
        const dataFimB = new Date(b.DataFim || b.DataInicio);
        return dataFimB.getTime() - dataFimA.getTime(); // Mais recente primeiro
      });
    
    // Retorna o plano cancelado mais recente antes da transação
    return planosCancelados.length > 0 ? planosCancelados[0] : null;
  };

  // Função para obter descrição explicativa do tipo
  const getDescricaoTipo = (tipo: string): string => {
    switch (tipo) {
      case "Plano":
        return "Pagamento recorrente do seu plano de assinatura";
      case "Multa":
        return "Taxa aplicada por cancelamento ou alteração durante período de fidelidade";
      case "Upgrade":
        return "Alteração para um plano superior (mais caro)";
      case "Downgrade":
        return "Alteração para um plano inferior (mais barato)";
      case "ConsultaAvulsa":
        return "Compra de consulta individual avulsa";
      case "PrimeiraConsulta":
        return "Primeira consulta promocional";
      default:
        return "Transação financeira";
    }
  };


  // Função para obter informações detalhadas para o tooltip
  const getInfoTooltip = (financeiro: FinanceiroType): string => {
    const planoCancelado = getPlanoCanceladoDowngrade(financeiro);
    const dataPagamento = getDataPagamento(financeiro);
    const dataTransacao = financeiro.Fatura?.CreatedAt || financeiro.CreatedAt || financeiro.DataVencimento;
    
    const info = [];
    
    // Informações básicas
    info.push(`Tipo: ${getTipoMovimentacao(financeiro.Tipo || "Plano")}`);
    
    if (financeiro.Tipo === "Downgrade" && planoCancelado) {
      info.push(``);
      info.push(`⚠️ PLANO ANTERIOR FOI CANCELADO`);
      info.push(``);
      info.push(`Plano cancelado: ${planoCancelado.PlanoAssinatura?.Nome || planoCancelado.PlanoAssinatura?.Tipo || "N/A"}`);
      info.push(`Valor do plano cancelado: R$ ${planoCancelado.PlanoAssinatura?.Preco?.toFixed(2).replace('.', ',') || "0,00"}`);
      
      // Data e hora do cancelamento (data da transação de downgrade)
      if (dataTransacao) {
        const date = new Date(dataTransacao);
        info.push(`Data e hora do cancelamento: ${date.toLocaleDateString("pt-BR")} às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
      }
      
      // Busca o novo plano relacionado no array completo de financeiros
      const novoPlano = Array.isArray(financeiros) ? financeiros.find((outro: FinanceiroType) => {
        return isNovoPlanoAposDowngrade(outro, financeiro);
      }) : undefined;
      
      if (novoPlano) {
        info.push(``);
        info.push(`✅ NOVO PLANO ATIVADO APÓS CANCELAMENTO`);
        info.push(`Novo plano: R$ ${novoPlano.Valor.toFixed(2).replace('.', ',')}`);
        if (novoPlano.PlanoAssinatura?.Nome) {
          info.push(`Nome do novo plano: ${novoPlano.PlanoAssinatura.Nome}`);
        }
        const dataNovoPlano = getDataPagamento(novoPlano);
        if (dataNovoPlano) {
          const dateNovo = new Date(dataNovoPlano);
          info.push(`Data de ativação: ${dateNovo.toLocaleDateString("pt-BR")} às ${dateNovo.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
        }
      }
    } else if (financeiro.Tipo === "Multa") {
      info.push(`Multa de 20% sobre o valor proporcional restante`);
      info.push(``);
      
      // Busca o plano cancelado relacionado (deve ter mesmo PlanoAssinaturaId e Status Cancelado)
      const planoCanceladoRelacionado = Array.isArray(financeiros) ? financeiros.find((outro: FinanceiroType) => {
        return outro.Tipo === "Plano" && 
               outro.Status === "Cancelado" && 
               outro.PlanoAssinaturaId === financeiro.PlanoAssinaturaId &&
               outro.Id !== financeiro.Id;
      }) : undefined;
      
      if (planoCanceladoRelacionado) {
        const valorProporcional = planoCanceladoRelacionado.Valor;
        const valorMulta = financeiro.Valor;
        
        // Calcula valores para exibir no tooltip
        const valorMensal = planoCanceladoRelacionado.PlanoAssinatura?.Preco || 0;
        // Tenta obter o tipo do plano do PlanoAssinatura ou do nome
        const tipoPlanoNome = (planoCanceladoRelacionado.PlanoAssinatura?.Nome || "").toLowerCase();
        const tipoPlanoTipo = (planoCanceladoRelacionado.PlanoAssinatura?.Tipo || "").toLowerCase();
        const tipoPlano = tipoPlanoTipo || tipoPlanoNome;
        
        let numeroMeses = 0;
        if (tipoPlano.includes("semestral")) {
          numeroMeses = 6;
        } else if (tipoPlano.includes("trimestral")) {
          numeroMeses = 3;
        }
        
        if (numeroMeses > 0 && valorMensal > 0) {
          const valorTotalPlano = valorMensal * numeroMeses;
          const totalDiasPlano = numeroMeses * 30;
          const valorDiario = valorTotalPlano / totalDiasPlano;
          const diasRestantes = Math.round(valorProporcional / valorDiario);
          const diasUsados = totalDiasPlano - diasRestantes;
          
          info.push(`📊 CÁLCULO DA MULTA:`);
          info.push(``);
          info.push(`1. Valor mensal: R$ ${valorMensal.toFixed(2).replace('.', ',')}`);
          info.push(`2. Duração do plano: ${numeroMeses} meses`);
          info.push(`3. Valor total do plano: R$ ${valorMensal.toFixed(2).replace('.', ',')} × ${numeroMeses} = R$ ${valorTotalPlano.toFixed(2).replace('.', ',')}`);
          info.push(`4. Total de dias do plano: ${numeroMeses} × 30 = ${totalDiasPlano} dias`);
          info.push(`5. Dias usados: ${diasUsados} dias`);
          info.push(`6. Dias restantes: ${totalDiasPlano} - ${diasUsados} = ${diasRestantes} dias`);
          info.push(`7. Valor diário: R$ ${valorTotalPlano.toFixed(2).replace('.', ',')} / ${totalDiasPlano} = R$ ${valorDiario.toFixed(2).replace('.', ',')}`);
          info.push(`8. Valor proporcional restante: R$ ${valorDiario.toFixed(2).replace('.', ',')} × ${diasRestantes} = R$ ${valorProporcional.toFixed(2).replace('.', ',')}`);
          info.push(`9. Multa de 20%: R$ ${valorProporcional.toFixed(2).replace('.', ',')} × 0,20 = R$ ${valorMulta.toFixed(2).replace('.', ',')}`);
          info.push(``);
        } else {
          // Se não conseguiu calcular, mostra informações básicas
          info.push(`Valor proporcional restante: R$ ${valorProporcional.toFixed(2).replace('.', ',')}`);
          info.push(`Multa de 20%: R$ ${valorMulta.toFixed(2).replace('.', ',')}`);
        }
        
        info.push(`Plano relacionado: ${planoCanceladoRelacionado.PlanoAssinatura?.Nome || planoCanceladoRelacionado.PlanoAssinatura?.Tipo || "N/A"}`);
      } else if (planoCancelado) {
        info.push(`Plano relacionado: ${planoCancelado.PlanoAssinatura?.Nome || planoCancelado.PlanoAssinatura?.Tipo || "N/A"}`);
      }
    } else if (financeiro.Tipo === "Plano") {
      // Verifica se este plano é um novo plano após downgrade
      const downgradeRelacionado = Array.isArray(financeiros) ? financeiros.find((outro: FinanceiroType) => {
        return outro.Tipo === "Downgrade" && isNovoPlanoAposDowngrade(financeiro, outro);
      }) : undefined;
      
      if (downgradeRelacionado) {
        const planoCanceladoRelacionado = getPlanoCanceladoDowngrade(downgradeRelacionado);
        if (planoCanceladoRelacionado) {
          info.push(`✅ PAGAMENTO DO NOVO PLANO`);
          info.push(``);
          info.push(`Este é o pagamento do novo plano ativado após o downgrade.`);
          info.push(`Plano anterior cancelado: ${planoCanceladoRelacionado.PlanoAssinatura?.Nome || planoCanceladoRelacionado.PlanoAssinatura?.Tipo || "N/A"}`);
          const dataCancelamento = downgradeRelacionado.Fatura?.CreatedAt || downgradeRelacionado.CreatedAt || downgradeRelacionado.DataVencimento;
          if (dataCancelamento) {
            const dateCancel = new Date(dataCancelamento);
            info.push(`Data do cancelamento: ${dateCancel.toLocaleDateString("pt-BR")} às ${dateCancel.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
          }
          info.push(``);
        }
      }
      
      info.push(`Valor: R$ ${financeiro.Valor.toFixed(2).replace('.', ',')}`);
      if (financeiro.PlanoAssinatura?.Nome) {
        info.push(`Plano: ${financeiro.PlanoAssinatura.Nome}`);
      }
    } else if (financeiro.Tipo === "Upgrade") {
      info.push(`Alteração para plano superior`);
      info.push(`Valor: R$ ${financeiro.Valor.toFixed(2).replace('.', ',')}`);
    } else {
      info.push(`Valor: R$ ${financeiro.Valor.toFixed(2).replace('.', ',')}`);
    }
    
    if (dataPagamento) {
      const date = new Date(dataPagamento);
      info.push(``);
      info.push(`Data de pagamento: ${date.toLocaleDateString("pt-BR")} às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
    }
    
    if (financeiro.DataVencimento) {
      info.push(`Data de vencimento: ${new Date(financeiro.DataVencimento).toLocaleDateString("pt-BR")}`);
    }
    
    info.push(`Status: ${getStatusAmigavel(financeiro.Status)}`);
    
    return info.join("\n");
  };

  return (
    <div className="min-h-screen bg-[#FCFBF6] max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <div className="w-full">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
          <BreadcrumbsVoltar />
          <h1 className="text-xl md:text-2xl font-semibold text-[#49525A] mb-8">Meu plano</h1>

          <div className="flex border-b border-gray-200 mb-8 gap-2">
            <button
              onClick={() => setTabAtiva("detalhes")}
              className={`flex-1 px-2 py-2 font-medium text-sm md:text-base ${
                tabAtiva === "detalhes" ? "border-b-2 border-[#6366F1] text-[#6366F1]" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Detalhes do plano
            </button>
            <button
              onClick={() => setTabAtiva("historico")}
              className={`flex-1 px-2 py-2 font-medium text-sm md:text-base ${
                tabAtiva === "historico" ? "border-b-2 border-[#6366F1] text-[#6366F1]" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Histórico de pagamentos
            </button>
          </div>

          {tabAtiva === "detalhes" ? (
            <div className="space-y-6">
              {/* NOVO: Indicador de Status do Plano */}
              {planoExibido && planoExibido.Status === "AguardandoPagamento" && (
                <div className="w-full bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded flex items-center gap-3">
                  <div className="animate-spin">
                    <svg className="w-5 h-5 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-yellow-800">⏳ Plano em Processamento</p>
                    <p className="text-sm text-yellow-700">Seu plano será ativado em breve. Atualizando...</p>
                  </div>
                </div>
              )}

              {planoExibido && (planoExibido.Status === "Ativo" || planoExibido.Status === "AguardandoPagamento") && (
                <div className="w-full bg-green-50 border-l-4 border-green-400 p-4 rounded flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-semibold text-green-800">Plano Ativo</p>
                    <p className="text-sm text-green-700">{consultasRestantes} consultas disponíveis | {diasRestantesCiclo} dias de validade</p>
                  </div>
                </div>
              )}
              {planoExibido && planoExibido.Status === "Cancelado" && consultasRestantes > 0 && (
                <div className="w-full bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-yellow-800">Plano Cancelado</p>
                    <p className="text-sm text-yellow-700">{consultasRestantes} consultas disponíveis | {diasRestantesCiclo} dias de validade</p>
                  </div>
                </div>
              )}

              {/* Card Principal */}
              <div className="bg-white border border-[#E3E6E8] rounded-lg p-6 flex flex-col lg:flex-row gap-8 mb-8">
              {/* Esquerda */}
              <div className="flex-1 space-y-4 text-sm text-[#49525A]">

                {isPlanoLoading ? (
                  <p>Carregando plano...</p>
                ) : planoExibido ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <p className="fira-sans">
                          <strong>Plano contratado:</strong>{" "}
                          {planoExibido.PlanoAssinatura?.Nome 
                            ? planoExibido.PlanoAssinatura.Nome 
                            : planoExibido.PlanoAssinatura?.Tipo 
                              ? planoExibido.PlanoAssinatura.Tipo.charAt(0).toUpperCase() + planoExibido.PlanoAssinatura.Tipo.slice(1)
                              : "-"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="fira-sans font-semibold text-[#49525A]">Status:</span>
                        {planoExibido.Status === "Cancelado" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Cancelado
                          </span>
                        ) : planoExibido.Status === "Ativo" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Ativo
                          </span>
                        ) : planoExibido.Status === "AguardandoPagamento" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Aguardando
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p>
                      <strong>Mês:</strong>{" "}
                      {planoExibido.DataInicio ? new Date(planoExibido.DataInicio).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" }) : "-"}
                    </p>
                    <p>
                      <strong>Permanência mínima:</strong>
                      {planoExibido.PlanoAssinatura?.Tipo === "mensal"
                        ? "Não possui"
                        : planoExibido.PlanoAssinatura?.Tipo === "semestral"
                        ? "6 meses"
                        : planoExibido.PlanoAssinatura?.Tipo === "trimestral"
                        ? "3 meses"
                        : planoExibido.PlanoAssinatura?.Tipo === "anual"
                        ? "12 meses"
                        : "-"}
                    </p>
                    <p>
                      <strong>Renovação automática:</strong>{" "}
                      {proximaRenovacao 
                        ? proximaRenovacao.toLocaleDateString("pt-BR", { 
                            day: "2-digit", 
                            month: "2-digit", 
                            year: "numeric" 
                          })
                        : "-"}
                    </p>
                    {planoExibido.DataFim && (
                      <p>
                        <strong>Plano válido até:</strong>{" "}
                        {new Date(planoExibido.DataFim).toLocaleDateString("pt-BR", { 
                          day: "2-digit", 
                          month: "2-digit", 
                          year: "numeric" 
                        })}
                      </p>
                    )}
                    {planoExibido.Status === "Cancelado" && planoExibido.DataFim && (
                      <p>
                        <strong>Data de cancelamento:</strong>{" "}
                        {new Date(planoExibido.DataFim).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    <p>
                      <span className="font-bold text-[#49525A] mr-1 whitespace-nowrap">Consultas extras:</span>
                      <span className="text-[#6366F1] font-semibold mr-2 whitespace-nowrap">
                        {creditoAvulso && Array.isArray(creditoAvulso) && creditoAvulso.length > 0
                          ? creditoAvulso.reduce((acc, c) => acc + c.Quantidade, 0)
                          : 0}
                      </span>
                      {creditoAvulso && Array.isArray(creditoAvulso) && creditoAvulso.length > 0 && (
                        <span className="text-gray-500 text-xs ml-1 whitespace-nowrap">
                          (Falta(m)
                          {(() => {
                            // Calcula dias restantes usando ValidUntil
                            const diasRestantes = creditoAvulso.map(c => {
                              if (c.ValidUntil) {
                                const hoje = new Date();
                                const validUntil = new Date(c.ValidUntil);
                                const diffMs = validUntil.getTime() - hoje.getTime();
                                return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                              }
                              return 0;
                            });
                            return ` ${Math.min(...diasRestantes)} dias para usar suas consultas`;
                          })()}
                          )
                        </span>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="fira-sans">
                      <strong>Consultas avulsas disponíveis:</strong>{" "}
                      <span className="text-[#6366F1] font-semibold mr-2 whitespace-nowrap">
                        {(() => {
                          if (!creditoAvulso || !Array.isArray(creditoAvulso) || creditoAvulso.length === 0) return 0;
                          
                          const agora = new Date();
                          // Filtra apenas créditos com Status 'Ativa', Quantidade > 0 e ValidUntil > agora
                          const creditosValidos = creditoAvulso.filter((c: CreditoAvulso) => {
                            if (c.Status !== 'Ativa' || c.Quantidade <= 0) return false;
                            if (!c.ValidUntil) return false;
                            const validUntil = new Date(c.ValidUntil);
                            return !isNaN(validUntil.getTime()) && validUntil > agora;
                          });
                          
                          // Soma todas as quantidades dos créditos válidos
                          return creditosValidos.reduce((acc: number, c: CreditoAvulso) => acc + c.Quantidade, 0);
                        })()}
                      </span>
                    </p>
                    {(() => {
                      if (!creditoAvulso || !Array.isArray(creditoAvulso) || creditoAvulso.length === 0) {
                        return <p>Você ainda não possui consultas avulsas ou primeira consulta disponível.</p>;
                      }
                      
                      const agora = new Date();
                      // Filtra apenas créditos válidos
                      const creditosValidos = creditoAvulso.filter((c: CreditoAvulso) => {
                        if (c.Status !== 'Ativa' || c.Quantidade <= 0) return false;
                        if (!c.ValidUntil) return false;
                        const validUntil = new Date(c.ValidUntil);
                        return !isNaN(validUntil.getTime()) && validUntil > agora;
                      });
                      
                      if (creditosValidos.length === 0) {
                        return <p>Você ainda não possui consultas avulsas ou primeira consulta disponível.</p>;
                      }
                      
                      // Calcula dias restantes usando ValidUntil (pega o menor)
                      const diasRestantes = creditosValidos.map((c: CreditoAvulso) => {
                        if (c.ValidUntil) {
                          const validUntil = new Date(c.ValidUntil);
                          const diffMs = validUntil.getTime() - agora.getTime();
                          return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                        }
                        return 0;
                      }).filter(d => d > 0);
                      
                      if (diasRestantes.length === 0) {
                        return <p>Você ainda não possui consultas avulsas ou primeira consulta disponível.</p>;
                      }
                      
                      return (
                        <p>
                          <span className="text-gray-500 text-xs ml-1 whitespace-nowrap">
                            Validade: {Math.min(...diasRestantes)} dia(s) para usar suas consultas
                          </span>
                        </p>
                      );
                    })()}
                  </>
                )}

                {/* Botões apenas desktop */}
                <div className="flex gap-4 pt-6">
                  <button
                    className="px-4 py-2 text-sm border border-[#CBD5E1] rounded-md text-[#334155] hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      // Previne execução se estiver desabilitado
                      if (!planoExibido || planoExibido.Status === "Cancelado" || planoExibido.Status === "Expirado" || planoExibido.Status !== "Ativo") {
                        e.preventDefault();
                        toast.error('Não é possível cancelar um plano que não está ativo.');
                        return;
                      }
                      if (ultimoPlano?.Id) {
                        handleCancelarPlano(ultimoPlano.Id);
                      } else {
                        toast.error('Não foi possível identificar o plano para cancelamento. Por favor, recarregue a página.');
                      }
                    }}
                    disabled={
                      cancelamentoLoading || 
                      !planoExibido ||
                      !ultimoPlano?.Id ||
                      planoExibido.Status === "Cancelado" ||
                      planoExibido.Status === "Expirado" ||
                      planoExibido.Status !== "Ativo"
                    }
                    title={
                      planoExibido?.Status === "Cancelado"
                        ? 'Este plano já foi cancelado'
                        : planoExibido?.Status === "Expirado"
                        ? 'Este plano já expirou'
                        : !ultimoPlano?.Id
                        ? 'Plano não encontrado'
                        : planoExibido?.Status !== "Ativo" 
                        ? `Plano com status "${planoExibido?.Status}" não pode ser cancelado` 
                        : 'Cancelar plano ativo'
                    }
                  >
                    {cancelamentoLoading ? 'Cancelando...' : 'Cancelar plano'}
                  </button>
                  <button
                    className="px-4 py-2 text-sm bg-[#6366F1] text-white rounded-md hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#6366F1]"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      // Previne execução se estiver desabilitado
                      if (!planoExibido || planoExibido.Status === "Cancelado") {
                        e.preventDefault();
                        toast.error('Não é possível mudar um plano cancelado.');
                        return;
                      }
                      handleAbrirModalMudarPlano();
                    }}
                    disabled={!planoExibido || planoExibido.Status === "Cancelado"}
                    title={
                      planoExibido?.Status === "Cancelado"
                        ? 'Não é possível mudar um plano cancelado'
                        : 'Mudar para outro plano'
                    }
                  >
                    Mudar de plano
                  </button>
                </div>
              </div>

              {/* Direita */}
              <div className="w-full lg:w-80 border border-[#E3E6E8] rounded-lg p-6 flex flex-col items-center text-center gap-6">
                <span className="bg-[#EEF2FF] text-[#6366F1] text-sm font-medium px-4 py-1 rounded-full">
                  {consultasRestantes} Consultas restantes
                </span>
                {dataValidadeCiclo && cicloAtivo && consultasRestantes > 0 ? (
                  <p className="text-sm text-[#606C76]">
                    Faltam{" "}
                    <span className="font-semibold text-[#6366F1]">{diasRestantesCiclo}</span>{" "}
                    dia(s) para usar suas consultas
                    <br />
                    <span className="text-xs text-gray-500 mt-1 block">
                      Válido até: {dataValidadeCiclo.toLocaleDateString("pt-BR", { 
                        day: "2-digit", 
                        month: "2-digit", 
                        year: "numeric" 
                      })}
                    </span>
                  </p>
                ) : dataValidadeCiclo && cicloAtivo && consultasRestantes === 0 ? (
                  <p className="text-sm text-[#606C76]">
                    Você já utilizou todas as consultas deste ciclo.
                    <br />
                    <span className="text-xs text-gray-500 mt-1 block">
                      Válido até: {dataValidadeCiclo.toLocaleDateString("pt-BR", { 
                        day: "2-digit", 
                        month: "2-digit", 
                        year: "numeric" 
                      })}
                    </span>
                  </p>
                ) : !cicloAtivo && consultasRestantes === 0 && !planoExibido ? (
                  <>
                    <p className="text-sm text-[#606C76] mb-4">
                      Você ainda não possui nenhum plano conosco. Aproveite para adquirir um agora.
                    </p>
                    <button
                      className="w-full bg-[#A3A8F7] text-white font-semibold px-4 py-2 rounded-lg hover:bg-[#232A5C] cursor-pointer"
                      onClick={() => router.push('/painel/planos')}
                    >
                      Comprar plano
                    </button>
                  </>
                ) : null}
                {!dataValidadeCiclo && !cicloAtivo && consultasRestantes === 0 && planoExibido && (
                  <p className="text-sm text-[#606C76]">
                    Nenhuma consulta disponível para o mês vigente.
                  </p>
                )}
                <button
                  className="px-4 py-2 text-sm border border-[#CBD5E1] rounded-md text-[#334155] hover:bg-gray-100"
                  onClick={() => router.push(`/painel/comprar-consulta/321581`)}
                >
                  Comprar consulta(s) avulsa(s)
                </button>
              </div>
            </div>
            </div>
          ) : (
            <div className="w-full mb-8">
              {/* Filtros e Controles */}
              <div className="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
                  {/* Filtro por Tipo */}
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  >
                    <option value="">Todos os tipos</option>
                    <option value="Plano">Plano</option>
                    <option value="ConsultaAvulsa">Avulsa</option>
                    <option value="PrimeiraConsulta">Promocional</option>
                    <option value="Multa">Multa</option>
                    <option value="Upgrade">Upgrade</option>
                    <option value="Downgrade">Downgrade</option>
                  </select>

                  {/* Filtro por Data Início */}
                  <input
                    type="date"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                    placeholder="Data início"
                  />

                  {/* Filtro por Data Fim */}
                  <input
                    type="date"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                    placeholder="Data fim"
                  />
                </div>

                {/* Select de registros por página */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 whitespace-nowrap">Registros por página:</label>
                  <select
                    value={registrosPorPagina}
                    onChange={(e) => {
                      setRegistrosPorPagina(Number(e.target.value));
                      setPaginaAtual(1);
                    }}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Desktop: Tabela elegante */}
              <div className="hidden md:block rounded-xl shadow-sm border border-gray-200 bg-white">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[12%]" />
                    <col className="w-[16%]" />
                    <col className="w-[16%]" />
                    <col className="w-[18%]" />
                    <col className="w-[12%]" />
                    <col className="w-[10%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <thead className="bg-gradient-to-r from-[#EEF2FF] to-[#E0E7FF]">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-[#49525A] uppercase tracking-wider">
                        Data de Vencimento
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-[#49525A] uppercase tracking-wider">
                        Data de Pagamento
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-[#49525A] uppercase tracking-wider">
                        Próxima Cobrança
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-[#49525A] uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-[#49525A] uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-[#49525A] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-[#49525A] uppercase tracking-wider">
                      </th>
                    </tr>
                  </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {loadingFinanceiro && (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6366F1] mb-2"></div>
                              <span className="text-xs text-gray-500">Carregando pagamentos...</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {errorFinanceiro && (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-red-500">
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-xs font-medium">Erro ao carregar pagamentos.</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {!loadingFinanceiro && !errorFinanceiro && financeirosComProximoPagamento.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-xs">Você ainda não possui histórico de pagamentos ou compras.</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {!loadingFinanceiro && !errorFinanceiro && financeirosPaginados.length > 0 && (
                        <>
                          {financeirosPaginados.map((p: FinanceiroTypeComProximoPagamento, i: number) => {
                            const dataPagamento = getDataPagamento(p);
                            
                            // Para próximo pagamento, força status "A Vencer"
                            const isProximoPagamento = p._isProximoPagamento ?? false;
                            const statusExibido = isProximoPagamento
                              ? "AguardandoPagamento" // Será exibido como "A Vencer"
                              : (p.Tipo === "Upgrade" && dataPagamento 
                                  ? "Pago" 
                                  : p.Status);
                            
                            const statusColor = statusExibido === "Aprovado" || statusExibido === "Pago" 
                              ? "bg-green-50 text-green-700 border-green-200" 
                              : statusExibido === "Cancelado"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : statusExibido === "AguardandoPagamento" && isProximoPagamento
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : statusExibido === "AguardandoPagamento"
                              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                              : "bg-gray-50 text-gray-700 border-gray-200";
                            
                            // Para downgrade ou upgrade, busca o plano cancelado e mostra seu valor
                            const planoCancelado = getPlanoCanceladoDowngrade(p);
                            const valorExibido = (p.Tipo === "Downgrade" || p.Tipo === "Upgrade") && planoCancelado?.PlanoAssinatura?.Preco 
                              ? (p.Tipo === "Upgrade" ? p.Valor : planoCancelado.PlanoAssinatura.Preco)
                              : p.Valor;
                            
                            return (
                              <motion.tr 
                                key={p.Id || i} 
                                className="hover:bg-gray-50 transition-colors duration-150"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: i * 0.05 }}
                              >
                                <td className="px-3 py-2 text-xs text-gray-900">
                                  <div className="flex flex-col truncate">
                                    <span className="font-medium truncate">
                                      {/* ✅ Usa VencimentoInfo.dataVencimento se disponível, senão usa DataVencimento */}
                                      {p.VencimentoInfo?.dataVencimento || 
                                        (p.DataVencimento ? new Date(p.DataVencimento).toLocaleDateString("pt-BR", { 
                                          day: "2-digit", 
                                          month: "2-digit", 
                                          year: "numeric" 
                                        }) : "-")}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-600">
                                  <div className="truncate">
                                    {dataPagamento ? (() => {
                                      const date = new Date(dataPagamento);
                                      const dateStr = date.toLocaleDateString("pt-BR", { 
                                        day: "2-digit", 
                                        month: "2-digit", 
                                        year: "numeric" 
                                      });
                                      const timeStr = date.toLocaleTimeString("pt-BR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: false
                                      });
                                      return (
                                        <span className="font-medium truncate" title={`${dateStr} - ${timeStr}`}>
                                          {dateStr} - {timeStr}
                                        </span>
                                      );
                                    })() : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-600">
                                  <div className="truncate">
                                    {(() => {
                                      const proximaCobranca = getProximaCobranca(p);
                                      if (proximaCobranca) {
                                        return (
                                          <span className="font-medium truncate">
                                            {proximaCobranca.toLocaleDateString("pt-BR", { 
                                              day: "2-digit", 
                                              month: "2-digit", 
                                              year: "numeric" 
                                            })}
                                          </span>
                                        );
                                      }
                                      return <span className="text-gray-400">-</span>;
                                    })()}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-col gap-0.5">
                                    <span 
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm w-fit cursor-help"
                                      title={getDescricaoTipo(p.Tipo || "Plano")}
                                      style={{
                                        backgroundColor: 
                                          p.Tipo === "Multa" ? "#FEE2E2" :
                                          p.Tipo === "Upgrade" ? "#DCFCE7" :
                                          p.Tipo === "Downgrade" ? "#FEF3C7" :
                                          p.Tipo === "Plano" ? "#E0E7FF" :
                                          p.Tipo === "ConsultaAvulsa" ? "#DBEAFE" :
                                          p.Tipo === "PrimeiraConsulta" ? "#F3E8FF" :
                                          "#F3F4F6",
                                        color:
                                          p.Tipo === "Multa" ? "#991B1B" :
                                          p.Tipo === "Upgrade" ? "#166534" :
                                          p.Tipo === "Downgrade" ? "#92400E" :
                                          p.Tipo === "Plano" ? "#3730A3" :
                                          p.Tipo === "ConsultaAvulsa" ? "#1E40AF" :
                                          p.Tipo === "PrimeiraConsulta" ? "#6B21A8" :
                                          "#374151"
                                      }}
                                    >
                                      {getTipoMovimentacao(p.Tipo || "Plano")}
                                    </span>
                                    {/* Labels descritivas abaixo de cada tag */}
                                    {(p.Tipo === "Downgrade" || p.Tipo === "Upgrade") && planoCancelado && (
                                      <span className="text-[10px] text-gray-500 truncate" title={`Plano cancelado: ${planoCancelado.PlanoAssinatura?.Nome || planoCancelado.PlanoAssinatura?.Tipo || "N/A"}`}>
                                        Plano cancelado: {planoCancelado.PlanoAssinatura?.Nome || planoCancelado.PlanoAssinatura?.Tipo || "N/A"}
                                      </span>
                                    )}
                                    {p.Tipo === "Multa" && (
                                      <span className="text-[10px] text-gray-500 truncate">
                                        20% do valor do plano cancelado
                                      </span>
                                    )}
                                    {p.Tipo === "Plano" && p.PlanoAssinatura?.Nome && (
                                      <span className="text-[10px] text-gray-500 truncate">
                                        {p.PlanoAssinatura.Nome}
                                      </span>
                                    )}
                                    {(p.Tipo === "ConsultaAvulsa" || p.Tipo === "unico") && (
                                      <span className="text-[10px] text-gray-500 truncate">
                                        Consulta individual
                                      </span>
                                    )}
                                    {p.Tipo === "PrimeiraConsulta" && (
                                      <span className="text-[10px] text-gray-500 truncate">
                                        Consulta promocional
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <span className="text-xs font-semibold text-gray-900">
                                    R$ {typeof valorExibido === "number" ? valorExibido.toFixed(2).replace('.', ',') : "-"}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor}`}>
                                    {getStatusAmigavel(statusExibido, isProximoPagamento)}
                                  </span>
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <div className="group relative cursor-pointer inline-flex">
                                    <svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                      <div className="bg-gray-800 text-white text-xs rounded shadow-lg px-3 py-2 whitespace-pre-line"
                                        style={{ minWidth: '280px', maxWidth: '400px' }}>
                                        {getInfoTooltip(p)}
                                      </div>
                                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 transform rotate-45"></div>
                                    </div>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </>
                      )}
                    </tbody>
                  </table>
              </div>

              {/* Mobile: Cards elegantes */}
              <div className="md:hidden space-y-3">
                {loadingFinanceiro && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6366F1] mb-2"></div>
                      <span className="text-xs text-gray-500">Carregando pagamentos...</span>
                    </div>
                  </div>
                )}
                {errorFinanceiro && (
                  <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4">
                    <div className="flex flex-col items-center justify-center text-red-500">
                      <span className="text-xs font-medium">Erro ao carregar pagamentos.</span>
                    </div>
                  </div>
                )}
                {!loadingFinanceiro && !errorFinanceiro && financeirosOrdenados.length === 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-xs text-center">Você ainda não possui histórico de pagamentos ou compras.</span>
                    </div>
                  </div>
                )}
                {!loadingFinanceiro && !errorFinanceiro && financeirosPaginados.length > 0 && (
                  <>
                    {financeirosPaginados.map((p: FinanceiroTypeComProximoPagamento, i: number) => {
                      const dataPagamento = getDataPagamento(p);
                      const isProximoPagamento = p._isProximoPagamento ?? false;
                      
                      // Para próximo pagamento, força status "A Vencer"
                      const statusExibido = isProximoPagamento
                        ? "AguardandoPagamento" // Será exibido como "A Vencer"
                        : (p.Tipo === "Upgrade" && dataPagamento 
                            ? "Pago" 
                            : p.Status);
                      
                      const statusColor = statusExibido === "Aprovado" || statusExibido === "Pago" 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : statusExibido === "Cancelado"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : statusExibido === "AguardandoPagamento" && isProximoPagamento
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : statusExibido === "AguardandoPagamento"
                        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                        : "bg-gray-50 text-gray-700 border-gray-200";
                      
                      // Para downgrade ou upgrade, busca o plano cancelado e mostra seu valor
                      const planoCancelado = getPlanoCanceladoDowngrade(p);
                      const valorExibido = (p.Tipo === "Downgrade" || p.Tipo === "Upgrade") && planoCancelado?.PlanoAssinatura?.Preco 
                        ? (p.Tipo === "Upgrade" ? p.Valor : planoCancelado.PlanoAssinatura.Preco)
                        : p.Valor;
                      
                      return (
                        <motion.div
                          key={p.Id || i}
                          className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-shadow duration-200"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.05 }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <span 
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm mb-1.5"
                                title={getDescricaoTipo(p.Tipo || "Plano")}
                                style={{
                                  backgroundColor: 
                                    p.Tipo === "Multa" ? "#FEE2E2" :
                                    p.Tipo === "Upgrade" ? "#DCFCE7" :
                                    p.Tipo === "Downgrade" ? "#FEF3C7" :
                                    p.Tipo === "Plano" ? "#E0E7FF" :
                                    p.Tipo === "ConsultaAvulsa" ? "#DBEAFE" :
                                    p.Tipo === "PrimeiraConsulta" ? "#F3E8FF" :
                                    "#F3F4F6",
                                  color:
                                    p.Tipo === "Multa" ? "#991B1B" :
                                    p.Tipo === "Upgrade" ? "#166534" :
                                    p.Tipo === "Downgrade" ? "#92400E" :
                                    p.Tipo === "Plano" ? "#3730A3" :
                                    p.Tipo === "ConsultaAvulsa" ? "#1E40AF" :
                                    p.Tipo === "PrimeiraConsulta" ? "#6B21A8" :
                                    "#374151"
                                }}
                              >
                                {getTipoMovimentacao(p.Tipo || "Plano")}
                              </span>
                              {/* Labels descritivas abaixo de cada tag */}
                              {(p.Tipo === "Downgrade" || p.Tipo === "Upgrade") && planoCancelado && (
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                  Plano cancelado: {planoCancelado.PlanoAssinatura?.Nome || planoCancelado.PlanoAssinatura?.Tipo || "N/A"}
                                </div>
                              )}
                              {p.Tipo === "Multa" && (
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                  20% do valor do plano cancelado
                                </div>
                              )}
                              {p.Tipo === "Plano" && p.PlanoAssinatura?.Nome && (
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                  {p.PlanoAssinatura.Nome}
                                </div>
                              )}
                              {(p.Tipo === "ConsultaAvulsa" || p.Tipo === "unico") && (
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                  Consulta individual
                                </div>
                              )}
                              {p.Tipo === "PrimeiraConsulta" && (
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                  Consulta promocional
                                </div>
                              )}
                              <div className="text-base font-bold text-gray-900">
                                R$ {typeof valorExibido === "number" ? valorExibido.toFixed(2).replace('.', ',') : "-"}
                              </div>
                              {/* Tag de desconto aplicado para Upgrade */}
                              {p.Tipo === "Upgrade" && (() => {
                                // Busca um Financeiro de desconto criado logo após o Upgrade (dentro de 2 horas)
                                const dataUpgrade = p.CreatedAt ? new Date(p.CreatedAt) : p.Fatura?.CreatedAt ? new Date(p.Fatura.CreatedAt) : new Date();
                                const descontoRelacionado = Array.isArray(financeiros) ? financeiros.find((outro: FinanceiroType) => {
                                  if (outro.Tipo !== "Plano" || outro.Id === p.Id) return false;
                                  const dataOutro = outro.CreatedAt ? new Date(outro.CreatedAt) : outro.Fatura?.CreatedAt ? new Date(outro.Fatura.CreatedAt) : new Date();
                                  const diffHoras = (dataOutro.getTime() - dataUpgrade.getTime()) / (1000 * 60 * 60);
                                  // Verifica se foi criado após o upgrade (dentro de 2 horas) e tem valor positivo menor que o valor do plano
                                  const valorPlanoEsperado = p.PlanoAssinatura?.Preco || 0;
                                  return diffHoras > 0 && diffHoras < 2 && outro.Valor > 0 && outro.Valor < valorPlanoEsperado && outro.Valor < 1000; // Desconto geralmente é menor que R$ 1000
                                }) : undefined;
                                
                                if (descontoRelacionado && descontoRelacionado.Valor > 0) {
                                  return (
                                    <div className="text-[10px] text-green-600 font-medium mt-0.5 flex items-center gap-1">
                                      <span>✓</span>
                                      <span>Desconto de R$ {descontoRelacionado.Valor.toFixed(2).replace('.', ',')} aplicado</span>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor}`}>
                              {getStatusAmigavel(statusExibido, isProximoPagamento)}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                            <div>
                              <p className="text-[10px] text-gray-500 mb-0.5">Vencimento</p>
                              <p className="text-xs font-medium text-gray-900">
                                {p.DataVencimento ? new Date(p.DataVencimento).toLocaleDateString("pt-BR", { 
                                  day: "2-digit", 
                                  month: "2-digit", 
                                  year: "numeric" 
                                }) : "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 mb-0.5">Pagamento</p>
                              <p className="text-xs font-medium text-gray-600">
                                {dataPagamento ? (() => {
                                  const date = new Date(dataPagamento);
                                  const dateStr = date.toLocaleDateString("pt-BR", { 
                                    day: "2-digit", 
                                    month: "2-digit", 
                                    year: "numeric" 
                                  });
                                  const timeStr = date.toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false
                                  });
                                  return `${dateStr} - ${timeStr}`;
                                })() : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 mb-0.5">Próxima Cobrança</p>
                              <p className="text-xs font-medium text-gray-600">
                                {(() => {
                                  const proximaCobranca = getProximaCobranca(p);
                                  if (proximaCobranca) {
                                    return proximaCobranca.toLocaleDateString("pt-BR", { 
                                      day: "2-digit", 
                                      month: "2-digit", 
                                      year: "numeric" 
                                    });
                                  }
                                  return <span className="text-gray-400">-</span>;
                                })()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                            <div className="group relative cursor-pointer">
                              <svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <div className="absolute right-0 bottom-full mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                <div className="bg-gray-800 text-white text-xs rounded shadow-lg px-3 py-2 whitespace-pre-line"
                                  style={{ minWidth: '250px', maxWidth: '350px' }}>
                                  {getInfoTooltip(p)}
                                </div>
                                <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-800 transform rotate-45"></div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </>
                )}
                
                {/* Paginação Mobile - REMOVIDA (duplicada) */}
              </div>
              
              {/* Paginação Desktop e Mobile Unificada */}
              {!loadingFinanceiro && !errorFinanceiro && financeirosFiltrados.length > 0 && (
                  <div className="mt-4 flex flex-col items-center justify-between gap-3 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3">
                  <div className="text-xs text-gray-600">
                    Mostrando <span className="font-semibold text-gray-900">{((paginaAtual - 1) * registrosPorPagina) + 1}</span> a{" "}
                    <span className="font-semibold text-gray-900">{Math.min(paginaAtual * registrosPorPagina, financeirosFiltrados.length)}</span> de{" "}
                    <span className="font-semibold text-gray-900">{financeirosFiltrados.length}</span> registros
                  </div>
                    {totalPaginas > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
                          disabled={paginaAtual === 1}
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                        >
                          Anterior
                        </button>
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                            let pageNum;
                            if (totalPaginas <= 5) {
                              pageNum = i + 1;
                            } else if (paginaAtual <= 3) {
                              pageNum = i + 1;
                            } else if (paginaAtual >= totalPaginas - 2) {
                              pageNum = totalPaginas - 4 + i;
                            } else {
                              pageNum = paginaAtual - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setPaginaAtual(pageNum)}
                                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                                  paginaAtual === pageNum
                                    ? "bg-[#6366F1] text-white shadow-sm"
                                    : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
                          disabled={paginaAtual === totalPaginas}
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                        >
                          Próxima
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modais */}
      <AnimatePresence>
        {modalCancel && (
          <ModalCancelamento
            open={modalCancel}
            onClose={handleCloseModal}
            mensagem={mensagemCancelamento}
            onConfirm={handleConfirmarCancelamento}
            isMobile={isMobile}
            loading={cancelamentoLoading}
            multaMensagem={multaMensagem}
            multaValor={multaValor}
          />
        )}
        {modalMudarPlano && (() => {
          // Obtém o tipo do plano atual (normalizado para lowercase)
          const tipoPlanoAtual = planoAtivo?.PlanoAssinatura?.Tipo?.toLowerCase() || '';
          
          // Filtra planos que não são do mesmo tipo do atual para exibição
          const planosFiltrados = planosDisponiveis.filter((p) => {
            // Não permite o mesmo ID
            if (p.Id === planoAtualId) return false;
            
            // Não permite o mesmo tipo de plano
            const tipoPlano = (p.Type || p.Tipo || '').toLowerCase();
            if (tipoPlano && tipoPlanoAtual && tipoPlano === tipoPlanoAtual) {
              return false;
            }
            
            return true;
          });

          return (
            <ModalTrocaPlano
              open={modalMudarPlano}
              onClose={() => {
                setModalMudarPlano(false);
                setAceiteContrato(false);
                setPlanoSelecionadoId("");
                // Limpa dados do contrato ao fechar
                sessionStorage.removeItem('contratoAceito');
                sessionStorage.removeItem('contratoAssinaturaImg');
                sessionStorage.removeItem('contratoHtmlAssinado');
              }}
              planos={planosFiltrados}
              planoAtualId={planoAtualId}
              planoAtualNome={planoAtivo?.PlanoAssinatura?.Nome ?? planoAtivo?.PlanoAssinatura?.Tipo}
              planoSelecionadoId={planoSelecionadoId}
              onSelectPlano={(planoId) => {
                // Validação adicional: não permite selecionar plano do mesmo tipo
                const planoSelecionado = planosDisponiveis.find((p) => p.Id === planoId);
                if (planoSelecionado) {
                  const tipoPlanoSelecionado = (planoSelecionado.Type || planoSelecionado.Tipo || '').toLowerCase();
                  if (tipoPlanoSelecionado && tipoPlanoAtual && tipoPlanoSelecionado === tipoPlanoAtual) {
                    toast.error('Não é possível selecionar um plano do mesmo tipo do atual.');
                    return;
                  }
                }
                setPlanoSelecionadoId(planoId);
              }}
              onConfirm={handleConfirmarMudarPlano}
              aceiteContrato={aceiteContrato}
              onToggleAceite={() => setAceiteContrato((prev) => !prev)}
              isMobile={isMobile}
              loading={trocaPlanoLoading}
              multaInfo={multaInfoModal}
            />
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
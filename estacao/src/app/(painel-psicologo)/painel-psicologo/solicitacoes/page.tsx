"use client";
import React, { useState, Fragment, useRef, useEffect } from "react";
import SidebarPsicologo from "../SidebarPsicologo";
import { solicitacaoService } from "@/services/solicitacoesService";
import { Solicitacao } from "@/types/solicitacaoTypes";
import toast from "react-hot-toast";
import ModalDetalhesSolicitacao from "@/components/ModalDetalhesSolicitacao";

const tiposSolicitacao = [
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
  const [filtro, setFiltro] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [tipo, setTipo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [visualizarOpen, setVisualizarOpen] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<Solicitacao | null>(null);
  const [modoVisualizacao, setModoVisualizacao] = useState(false);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Buscar solicitações do backend
  useEffect(() => {
    const buscarSolicitacoes = async () => {
      setIsLoading(true);
      try {
        const response = await solicitacaoService.getSolicitacoes();
        if (response.data.success && response.data.solicitacoes) {
          // Ordenar por data de criação (mais recente primeiro)
          const sorted = response.data.solicitacoes.sort((a, b) => {
            const dateA = new Date(a.CreatedAt).getTime();
            const dateB = new Date(b.CreatedAt).getTime();
            return dateB - dateA;
          });
          setSolicitacoes(sorted);
        } else {
          setSolicitacoes([]);
        }
      } catch (error) {
        console.error('Erro ao buscar solicitações:', error);
        toast.error('Erro ao carregar solicitações');
        setSolicitacoes([]);
      } finally {
        setIsLoading(false);
      }
    };

    buscarSolicitacoes();
  }, []);

  // Filtra lista conforme busca/filtro
  const listaFiltrada = solicitacoes.filter((s) => {
    if (filtro !== "Todos" && s.Status !== filtro) return false;
    if (busca) {
      const buscaLower = busca.toLowerCase();
      const matchDescricao = s.Descricao?.toLowerCase().includes(buscaLower);
      const matchTitulo = s.Title?.toLowerCase().includes(buscaLower);
      const matchProtocolo = s.Protocol?.toLowerCase().includes(buscaLower);
      if (!matchDescricao && !matchTitulo && !matchProtocolo) return false;
    }
    return true;
  });

  function handleOpenModal() {
    setModalOpen(true);
    setTipo("");
    setTitulo("");
    setDescricao("");
    setArquivo(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleCloseModal() {
    setModalOpen(false);
    setTipo("");
    setTitulo("");
    setDescricao("");
    setArquivo(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setArquivo(e.target.files[0]);
    }
  }

  function handleDescricaoChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (e.target.value.length <= 300) setDescricao(e.target.value);
  }

  async function handleEnviar() {
    if (!tipo || !titulo || !descricao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await solicitacaoService.createSolicitacao({
        Title: titulo,
        Tipo: tipo,
        Descricao: descricao,
        Documentos: arquivo || null
      });

      if (result.data.success) {
        toast.success('Solicitação criada com sucesso!');
        handleCloseModal();
        
        // Recarregar lista de solicitações
        const response = await solicitacaoService.getSolicitacoes();
        if (response.data.success && response.data.solicitacoes) {
          const sorted = response.data.solicitacoes.sort((a, b) => {
            const dateA = new Date(a.CreatedAt).getTime();
            const dateB = new Date(b.CreatedAt).getTime();
            return dateB - dateA;
          });
          setSolicitacoes(sorted);
        }
      } else {
        toast.error(result.data.message || 'Erro ao criar solicitação');
      }
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      toast.error('Erro ao criar solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleVisualizar(solicitacao: Solicitacao, modoVisualizacao: boolean = false) {
    // Usar os dados já carregados da solicitação
    setSolicitacaoSelecionada(solicitacao);
    setModoVisualizacao(modoVisualizacao);
    setVisualizarOpen(true);
  }

  function handleCloseVisualizar() {
    setVisualizarOpen(false);
    setSolicitacaoSelecionada(null);
    setModoVisualizacao(false);
  }

  // Adicione o ícone de olho
  const EyeIcon = () => (
    <svg className="w-5 h-5 text-[#6D75C0]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12s3.5-7 10.5-7 10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={2} />
    </svg>
  );

  // Função para formatar status
  function formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'Pendente': 'Pendente',
      'Aprovada': 'Aprovada',
      'Aprovado': 'Aprovada',
      'Recusada': 'Recusada',
      'Recusado': 'Recusada',
      'Cancelada': 'Cancelada',
      'Cancelado': 'Cancelada',
      'PagamentoEmAnalise': 'Pagamento em análise',
      'Processando': 'Processando',
      'Pago': 'Pago'
    };
    return statusMap[status] || status;
  }

  return (
    <div className="min-h-screen font-fira-sans bg-gradient-to-br from-[#F6F7FB] via-[#F0F1FA] to-[#E3E4F3]">
      <div className="max-w-[1200px] mx-auto w-full flex flex-col md:flex-row">
        <div className="hidden md:flex">
          <SidebarPsicologo />
        </div>
        <main className="flex-1 py-4 sm:py-8 px-3 sm:px-4 md:px-6 font-fira-sans w-full mb-24 sm:mb-8 overflow-x-hidden">
          <div className="max-w-[1000px] mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Solicitações</h1>
              <button
                className="px-4 sm:px-5 py-2 rounded-lg bg-gradient-to-r from-[#6D75C0] to-[#7FBDCC] text-white text-sm sm:text-base font-semibold font-fira-sans hover:from-[#4B51A6] hover:to-[#7FBDCC] transition shadow whitespace-nowrap"
                onClick={handleOpenModal}
              >
                Nova solicitação
              </button>
            </div>
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
              <select
                className="border rounded px-3 py-2 text-sm sm:text-base bg-white"
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
              >
                <option value="Todos">Todos Status</option>
                <option value="Pendente">Pendente</option>
                <option value="Aprovada">Aprovada</option>
                <option value="Recusada">Recusada</option>
              </select>
              <input
                type="text"
                placeholder="Buscar descrição..."
                className="border rounded px-3 py-2 flex-1 text-sm sm:text-base"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
            {/* Lista de solicitações - Desktop Table */}
            <div className="hidden md:block bg-white rounded-lg shadow p-4 border border-[#E5E9FA]">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[800px] text-left">
                  <thead>
                    <tr>
                      <th className="py-2 px-2 sm:px-4 text-[#8494E9] font-medium text-xs sm:text-sm">Protocolo</th>
                      <th className="py-2 px-2 sm:px-4 text-[#8494E9] font-medium text-xs sm:text-sm">Data</th>
                      <th className="py-2 px-2 sm:px-4 text-[#8494E9] font-medium text-xs sm:text-sm">Tipo</th>
                      <th className="py-2 px-2 sm:px-4 text-[#8494E9] font-medium text-xs sm:text-sm">Título</th>
                      <th className="py-2 px-2 sm:px-4 text-[#8494E9] font-medium text-xs sm:text-sm">Status</th>
                      <th className="py-2 px-2 sm:px-4 text-[#8494E9] font-medium text-xs sm:text-sm">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-gray-500">
                          Carregando solicitações...
                        </td>
                      </tr>
                    ) : listaFiltrada.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-gray-500">
                          Nenhuma solicitação encontrada.
                        </td>
                      </tr>
                    ) : (
                      listaFiltrada.map((s) => {
                        const statusFormatado = formatStatus(s.Status);
                        return (
                          <tr key={s.Id} className="border-b border-[#F2F4FD] hover:bg-gray-50">
                            <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm">{s.Protocol}</td>
                            <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm">
                              {new Date(s.CreatedAt).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm">{s.Tipo}</td>
                            <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm truncate max-w-[200px]">{s.Title}</td>
                            <td className="py-2 px-2 sm:px-4">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                statusFormatado === "Pendente" || statusFormatado === "Pagamento em análise" 
                                  ? "bg-yellow-100 text-yellow-700"
                                : statusFormatado === "Aprovada" || statusFormatado === "Pago"
                                  ? "bg-green-100 text-green-700"
                                : statusFormatado === "Recusada" || statusFormatado === "Cancelada"
                                  ? "bg-red-100 text-red-700"
                                : statusFormatado === "Processando"
                                  ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                              }`}>
                                {statusFormatado}
                              </span>
                            </td>
                            <td className="py-2 px-2 sm:px-4">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <button
                                  className="p-1.5 sm:p-2 rounded hover:bg-[#F0F1FA] transition"
                                  title="Visualizar Interações"
                                  onClick={() => handleVisualizar(s, true)}
                                >
                                  <EyeIcon />
                                </button>
                                <button
                                  className="p-1.5 sm:p-2 rounded hover:bg-[#F0F1FA] transition"
                                  title="Editar e Responder"
                                  onClick={() => handleVisualizar(s, false)}
                                >
                                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#6D75C0]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Lista de solicitações - Mobile Cards */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                <div className="bg-white rounded-lg shadow p-4 border border-[#E5E9FA] text-center text-gray-500">
                  Carregando solicitações...
                </div>
              ) : listaFiltrada.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-4 border border-[#E5E9FA] text-center text-gray-500">
                  Nenhuma solicitação encontrada.
                </div>
              ) : (
                listaFiltrada.map((s) => {
                  const statusFormatado = formatStatus(s.Status);
                  return (
                    <div key={s.Id} className="bg-white rounded-lg shadow p-4 border border-[#E5E9FA]">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-500 mb-1">Protocolo</p>
                          <p className="text-sm font-semibold text-gray-900 font-mono break-all">{s.Protocol}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ml-2 ${
                          statusFormatado === "Pendente" || statusFormatado === "Pagamento em análise" 
                            ? "bg-yellow-100 text-yellow-700"
                          : statusFormatado === "Aprovada" || statusFormatado === "Pago"
                            ? "bg-green-100 text-green-700"
                          : statusFormatado === "Recusada" || statusFormatado === "Cancelada"
                            ? "bg-red-100 text-red-700"
                          : statusFormatado === "Processando"
                            ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                        }`}>
                          {statusFormatado}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Data</p>
                          <p className="text-sm text-gray-900">{new Date(s.CreatedAt).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Tipo</p>
                          <p className="text-sm text-gray-900">{s.Tipo}</p>
                        </div>
                      </div>
                      {s.Title && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">Título</p>
                          <p className="text-sm text-gray-900">{s.Title}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F2F4FD]">
                        <button
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#6D75C0] hover:bg-[#F0F1FA] rounded transition"
                          onClick={() => handleVisualizar(s, true)}
                        >
                          <EyeIcon />
                          <span>Ver</span>
                        </button>
                        <button
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#6D75C0] hover:bg-[#F0F1FA] rounded transition"
                          onClick={() => handleVisualizar(s, false)}
                        >
                          <svg className="w-4 h-4 text-[#6D75C0]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {/* Modal Visualizar Solicitação */}
            <ModalDetalhesSolicitacao
              open={visualizarOpen}
              onClose={handleCloseVisualizar}
              solicitacao={solicitacaoSelecionada}
              modoVisualizacao={modoVisualizacao}
              formatarData={(dataISO: Date | string) => {
                const date = typeof dataISO === 'string' ? new Date(dataISO) : dataISO;
                return date.toLocaleString("pt-BR", {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              }}
              onUpdate={async () => {
                // Recarregar lista de solicitações após atualização
                try {
                  const response = await solicitacaoService.getSolicitacoes();
                  if (response.data.success && response.data.solicitacoes) {
                    const sorted = response.data.solicitacoes.sort((a, b) => {
                      const dateA = new Date(a.CreatedAt).getTime();
                      const dateB = new Date(b.CreatedAt).getTime();
                      return dateB - dateA;
                    });
                    setSolicitacoes(sorted);
                    // Atualizar solicitação selecionada se ainda estiver aberta
                    if (solicitacaoSelecionada) {
                      const updated = sorted.find(s => s.Id === solicitacaoSelecionada.Id);
                      if (updated) {
                        setSolicitacaoSelecionada(updated);
                      }
                    }
                  }
                } catch (error) {
                  console.error('Erro ao atualizar solicitações:', error);
                }
              }}
            />
            {/* Modal Nova Solicitação */}
            {modalOpen && (
              <Fragment>
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent">
                  <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] sm:max-h-[95vh] relative z-60 flex flex-col m-4 sm:m-0">
                    {/* Header Mobile/Desktop */}
                    <div className="rounded-t-lg bg-[#232A5C] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
                      <h2 className="text-lg sm:text-xl font-bold text-white">Nova Solicitação</h2>
                      <button
                        className="text-white text-xl sm:text-2xl font-bold hover:text-gray-200 transition p-1"
                        onClick={handleCloseModal}
                        aria-label="Fechar"
                      >
                        ×
                      </button>
                    </div>
                    <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                      <form className="flex flex-col gap-4">
                        <div>
                          <label className="block mb-2 text-sm sm:text-base font-medium text-gray-700">Tipo de solicitação</label>
                          <select
                            className="border rounded px-3 py-2 w-full text-sm sm:text-base"
                            value={tipo}
                            onChange={e => setTipo(e.target.value)}
                          >
                            <option value="">Selecione...</option>
                            {tiposSolicitacao.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block mb-2 text-sm sm:text-base font-medium text-gray-700">Título</label>
                          <input
                            className="border rounded px-3 py-2 w-full text-sm sm:text-base"
                            maxLength={80}
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                            placeholder="Título da solicitação"
                          />
                          <div className="text-xs text-gray-500 mt-1 text-right">{titulo.length}/80</div>
                        </div>
                        <div>
                          <label className="block mb-2 text-sm sm:text-base font-medium text-gray-700">Descrição (máx. 300 caracteres)</label>
                          <textarea
                            className="border rounded px-3 py-2 w-full text-sm sm:text-base"
                            maxLength={300}
                            rows={4}
                            value={descricao}
                            onChange={handleDescricaoChange}
                          />
                          <div className="text-xs text-gray-500 mt-1 text-right">{descricao.length}/300</div>
                        </div>
                        <div>
                          <label className="block mb-2 text-sm sm:text-base font-medium text-gray-700">Upload de arquivo</label>
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            ref={inputRef}
                            onChange={handleUpload}
                            className="block w-full border border-gray-300 rounded px-3 py-2 text-sm sm:text-base"
                          />
                          {arquivo && (
                            <div className="mt-2 text-xs sm:text-sm text-green-700">
                              Arquivo selecionado: {arquivo.name}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 mt-6 w-full">
                          <button
                            type="button"
                            className="w-full sm:w-1/2 px-4 py-2 bg-gray-200 text-[#6D75C0] rounded font-semibold shadow hover:bg-gray-300 transition text-sm sm:text-base"
                            onClick={handleCloseModal}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="w-full sm:w-1/2 px-4 py-2 bg-[#6D75C0] text-white rounded font-semibold shadow hover:bg-[#5a62a0] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                            onClick={handleEnviar}
                            disabled={!tipo || !titulo || !descricao || isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Enviando...
                              </>
                            ) : (
                              'Enviar'
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </Fragment>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

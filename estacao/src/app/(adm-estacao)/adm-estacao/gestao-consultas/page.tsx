"use client";
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useGestaoConsultas, type CancelamentoPendente } from "@/hooks/admin/useGestaoConsultas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, CheckCircle2, XCircle, Eye, Download, Calendar, Clock, User, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/axios";
import Image from "next/image";

export default function GestaoConsultasPage() {
  const {
    cancelamentos,
    isLoading,
    aprovarCancelamento,
    reprovarCancelamento,
    isAprovando,
    isReprovando,
  } = useGestaoConsultas();

  const [selectedCancelamento, setSelectedCancelamento] = useState<string | null>(null);
  const [acaoSelecionada, setAcaoSelecionada] = useState<'aprovar' | 'reprovar' | null>(null);
  const [activeTab, setActiveTab] = useState('todos');
  const [documentoModal, setDocumentoModal] = useState<{
    open: boolean;
    loading: boolean;
    url: string | null;
    nome: string;
    error: string | null;
  }>({
    open: false,
    loading: false,
    url: null,
    nome: '',
    error: null
  });

  // Filtrar cancelamentos por tipo
  const cancelamentosForcaMaior = useMemo(() => {
    return cancelamentos.filter(c => {
      const motivo = (c.Motivo || '').toLowerCase();
      return motivo.includes('força maior') || motivo.includes('forca maior') || 
             motivo.includes('doença') || motivo.includes('doenca') ||
             motivo.includes('emergência') || motivo.includes('emergencia');
    });
  }, [cancelamentos]);

  const cancelamentosNaoCumprimento = useMemo(() => {
    return cancelamentos.filter(c => {
      const motivo = (c.Motivo || '').toLowerCase();
      return motivo.includes('não cumprimento') || motivo.includes('nao cumprimento') ||
             motivo.includes('cancelada não cumprimento contratual paciente');
    });
  }, [cancelamentos]);

  const reagendamentosForaPrazo = useMemo(() => {
    return cancelamentos.filter(c => {
      const protocolo = (c.Protocolo || '').toLowerCase();
      return protocolo.includes('reagend');
    });
  }, [cancelamentos]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // HH:mm
  };

  const getDocumentUrl = (cancelamento: CancelamentoPendente): string | null => {
    if (cancelamento.Documents && cancelamento.Documents.length > 0) {
      return cancelamento.Documents[0].Url;
    }
    return cancelamento.LinkDock || null;
  };

  const handleVisualizarDocumento = async (cancelamento: CancelamentoPendente) => {
    const docUrl = getDocumentUrl(cancelamento);
    if (!docUrl) {
      toast.error('Documento não encontrado');
      return;
    }

    setDocumentoModal({
      open: true,
      loading: true,
      url: null,
      nome: 'Documento de cancelamento',
      error: null
    });

    try {
      // Se tiver ID do documento, busca URL assinada
      if (cancelamento.Documents && cancelamento.Documents[0]?.Id) {
        const response = await api.get(`/files/documents/${cancelamento.Documents[0].Id}`);
        if (response.data?.url) {
          setDocumentoModal(prev => ({ ...prev, loading: false, url: response.data.url }));
          return;
        }
      }
      
      // Fallback para URL direta
      setDocumentoModal(prev => ({ ...prev, loading: false, url: docUrl }));
    } catch (error) {
      console.error('Erro ao carregar documento:', error);
      setDocumentoModal(prev => ({ ...prev, loading: false, url: docUrl }));
    }
  };

  const handleAprovar = (cancelamentoId: string) => {
    setSelectedCancelamento(cancelamentoId);
    setAcaoSelecionada('aprovar');
  };

  const handleReprovar = (cancelamentoId: string) => {
    setSelectedCancelamento(cancelamentoId);
    setAcaoSelecionada('reprovar');
  };

  const confirmarAprovar = () => {
    if (selectedCancelamento) {
      aprovarCancelamento(selectedCancelamento);
      setSelectedCancelamento(null);
      setAcaoSelecionada(null);
    }
  };

  const confirmarReprovar = () => {
    if (selectedCancelamento) {
      reprovarCancelamento(selectedCancelamento);
      setSelectedCancelamento(null);
      setAcaoSelecionada(null);
    }
  };

  const cancelarAcao = () => {
    setSelectedCancelamento(null);
    setAcaoSelecionada(null);
  };

  const renderCancelamentoCard = (cancelamento: CancelamentoPendente) => {
    const docUrl = getDocumentUrl(cancelamento);
    const temDocumento = !!docUrl;

    return (
      <Card key={cancelamento.Id} className="mb-4">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg break-words">Protocolo: {cancelamento.Protocolo}</CardTitle>
              <CardDescription className="mt-1 text-sm">
                {cancelamento.Tipo === 'Psicologo' ? 'Cancelamento por Psicólogo' : 'Cancelamento por Paciente'}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 self-start sm:self-auto shrink-0">
              Em Análise
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Informações da Consulta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-gray-600">Data:</span>
                <span className="font-medium">{formatDate(cancelamento.Data)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-gray-600">Horário:</span>
                <span className="font-medium">{formatTime(cancelamento.Horario)}</span>
              </div>
            </div>

            {/* Informações do Paciente */}
            {cancelamento.Paciente && (
              <div className="border-t pt-3">
                <div className="flex items-start sm:items-center gap-2 text-sm mb-2">
                  <User className="w-4 h-4 text-gray-500 shrink-0 mt-0.5 sm:mt-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">Paciente: </span>
                    <span className="break-words">{cancelamento.Paciente.Nome}</span>
                  </div>
                </div>
                {cancelamento.Paciente.Email && (
                  <div className="flex items-start sm:items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
                    <span className="break-all min-w-0">{cancelamento.Paciente.Email}</span>
                  </div>
                )}
              </div>
            )}

            {/* Informações do Psicólogo */}
            {cancelamento.Psicologo && (
              <div className="border-t pt-3">
                <div className="flex items-start sm:items-center gap-2 text-sm mb-2">
                  <User className="w-4 h-4 text-gray-500 shrink-0 mt-0.5 sm:mt-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">Psicólogo: </span>
                    <span className="break-words">{cancelamento.Psicologo.Nome}</span>
                  </div>
                </div>
                {cancelamento.Psicologo.Email && (
                  <div className="flex items-start sm:items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
                    <span className="break-all min-w-0">{cancelamento.Psicologo.Email}</span>
                  </div>
                )}
              </div>
            )}

            {/* Motivo */}
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-1">Motivo:</p>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md break-words">
                {cancelamento.Motivo || 'Não informado'}
              </p>
            </div>

            {/* Documento */}
            {temDocumento && (
              <div className="border-t pt-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                    <span className="text-sm font-medium">Documento anexado</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVisualizarDocumento(cancelamento)}
                    className="w-full sm:w-auto"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="border-t pt-4 flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => handleAprovar(cancelamento.Id)}
                disabled={isAprovando || isReprovando}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Aprovar
              </Button>
              <Button
                onClick={() => handleReprovar(cancelamento.Id)}
                disabled={isAprovando || isReprovando}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reprovar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8494E9]"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Gestão de Consultas</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Aprove ou reprove cancelamentos e reagendamentos pendentes de análise
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-0 h-auto">
          <TabsTrigger value="todos" className="text-xs sm:text-sm py-2 sm:py-1.5 truncate">
            Todos ({cancelamentos.length})
          </TabsTrigger>
          <TabsTrigger value="forca-maior" className="text-xs sm:text-sm py-2 sm:py-1.5 truncate">
            <span className="hidden sm:inline">Força Maior</span>
            <span className="sm:hidden">Força Maior</span>
            <span className="ml-1">({cancelamentosForcaMaior.length})</span>
          </TabsTrigger>
          <TabsTrigger value="nao-cumprimento" className="text-xs sm:text-sm py-2 sm:py-1.5 truncate">
            <span className="hidden sm:inline">Não Cumprimento</span>
            <span className="sm:hidden">Não Cumpr.</span>
            <span className="ml-1">({cancelamentosNaoCumprimento.length})</span>
          </TabsTrigger>
          <TabsTrigger value="reagendamentos" className="text-xs sm:text-sm py-2 sm:py-1.5 truncate">
            <span className="hidden sm:inline">Reagendamentos</span>
            <span className="sm:hidden">Reagend.</span>
            <span className="ml-1">({reagendamentosForaPrazo.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="space-y-3 sm:space-y-4">
          {cancelamentos.length === 0 ? (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center">
                <p className="text-sm sm:text-base text-gray-500">Nenhum cancelamento pendente de análise</p>
              </CardContent>
            </Card>
          ) : (
            cancelamentos.map(renderCancelamentoCard)
          )}
        </TabsContent>

        <TabsContent value="forca-maior" className="space-y-3 sm:space-y-4">
          {cancelamentosForcaMaior.length === 0 ? (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center">
                <p className="text-sm sm:text-base text-gray-500">Nenhum cancelamento por força maior pendente</p>
              </CardContent>
            </Card>
          ) : (
            cancelamentosForcaMaior.map(renderCancelamentoCard)
          )}
        </TabsContent>

        <TabsContent value="nao-cumprimento" className="space-y-3 sm:space-y-4">
          {cancelamentosNaoCumprimento.length === 0 ? (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center">
                <p className="text-sm sm:text-base text-gray-500">Nenhum cancelamento por não cumprimento pendente</p>
              </CardContent>
            </Card>
          ) : (
            cancelamentosNaoCumprimento.map(renderCancelamentoCard)
          )}
        </TabsContent>

        <TabsContent value="reagendamentos" className="space-y-3 sm:space-y-4">
          {reagendamentosForaPrazo.length === 0 ? (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center">
                <p className="text-sm sm:text-base text-gray-500">Nenhum reagendamento fora do prazo pendente</p>
              </CardContent>
            </Card>
          ) : (
            reagendamentosForaPrazo.map(renderCancelamentoCard)
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Confirmação de Aprovação */}
      <Dialog open={selectedCancelamento !== null && acaoSelecionada === 'aprovar'} onOpenChange={(open) => {
        if (!open) cancelarAcao();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Aprovação</DialogTitle>
            <DialogDescription>
              Ao aprovar este cancelamento, o crédito será devolvido ao paciente (se aplicável) e 
              os emails transacionais serão enviados para paciente e psicólogo. Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelarAcao}>
              Cancelar
            </Button>
            <Button onClick={confirmarAprovar} disabled={isAprovando} className="bg-green-600 hover:bg-green-700">
              {isAprovando ? 'Aprovando...' : 'Confirmar Aprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Reprovação */}
      <Dialog open={selectedCancelamento !== null && acaoSelecionada === 'reprovar'} onOpenChange={(open) => {
        if (!open) cancelarAcao();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Reprovação</DialogTitle>
            <DialogDescription>
              Ao reprovar este cancelamento, o crédito NÃO será devolvido e os emails transacionais 
              serão enviados informando a reprovação. Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelarAcao}>
              Cancelar
            </Button>
            <Button onClick={confirmarReprovar} disabled={isReprovando} variant="destructive">
              {isReprovando ? 'Reprovando...' : 'Confirmar Reprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização de Documento */}
      <Dialog open={documentoModal.open} onOpenChange={(open) => {
        if (!open) {
          setDocumentoModal({ open: false, loading: false, url: null, nome: '', error: null });
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Visualizar Documento</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {documentoModal.loading ? (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[#8494E9] mx-auto mb-4"></div>
                  <p className="text-sm sm:text-base text-gray-600">Carregando documento...</p>
                </div>
              </div>
            ) : documentoModal.error ? (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <div className="text-center">
                  <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-sm sm:text-base text-red-600">{documentoModal.error}</p>
                </div>
              </div>
            ) : documentoModal.url ? (
              <div className="flex flex-col gap-4">
                {(() => {
                  const urlStr = documentoModal.url.toLowerCase();
                  const isPDF = urlStr.includes('.pdf') || urlStr.endsWith('pdf');
                  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].some(ext => urlStr.includes(`.${ext}`));
                  
                  if (isPDF) {
                    return (
                      <iframe
                        src={documentoModal.url}
                        className="w-full h-[50vh] sm:h-[70vh] border rounded-lg"
                        title="Documento PDF"
                      />
                    );
                  } else if (isImage) {
                    return (
                      <div className="flex justify-center">
                        <Image
                          src={documentoModal.url || ''}
                          alt="Documento"
                          width={800}
                          height={600}
                          className="max-w-full max-h-[50vh] sm:max-h-[70vh] rounded-lg border object-contain"
                        />
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex flex-col items-center justify-center text-center text-gray-600 gap-3 py-8 sm:py-12 px-4">
                        <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
                        <p className="text-sm sm:text-base">Tipo de arquivo não suportado para visualização no navegador.</p>
                        <a
                          href={documentoModal.url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 bg-[#8494E9] hover:bg-[#6D75C0] text-white font-semibold px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                          <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                          Baixar documento
                        </a>
                      </div>
                    );
                  }
                })()}
              </div>
            ) : null}
          </div>

          {documentoModal.url && (
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <a
                href={documentoModal.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-[#8494E9] hover:bg-[#6D75C0] text-white font-semibold px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                Baixar documento
              </a>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


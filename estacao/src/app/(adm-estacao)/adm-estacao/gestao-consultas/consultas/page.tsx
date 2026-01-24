"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Pencil, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";
import { useAdmConsultasLista, useUpdateAdmConsultaStatus } from "@/hooks/admin/useAdmConsultas";
import { normalizarStatusExibicao } from "@/utils/statusConsulta.util";

type ConsultaItem = {
  Id: string;
  Date: string;
  Time: string;
  Status: string;
  Paciente?: { Id: string; Nome: string; Email?: string };
  Psicologo?: { Id: string; Nome: string; Email?: string };
  Agenda?: { Data?: string; Horario?: string; Status?: string };
};

// Mapeamento de status técnicos para nomes legíveis
const STATUS_LABELS: Record<string, string> = {
  "Agendada": "Agendada",
  "EmAndamento": "Em Andamento",
  "Realizada": "Realizada",
  "ForaDaPlataforma": "Fora da Plataforma",
  "Fora_plataforma": "Fora da Plataforma (fora do sistema)",
  "PacienteNaoCompareceu": "Paciente Não Compareceu",
  "PsicologoNaoCompareceu": "Psicólogo Não Compareceu",
  "CanceladaPacienteNoPrazo": "Cancelada pelo Paciente (no prazo)",
  "CanceladaPsicologoNoPrazo": "Cancelada pelo Psicólogo (no prazo)",
  "ReagendadaPacienteNoPrazo": "Reagendada pelo Paciente (no prazo)",
  "ReagendadaPsicologoNoPrazo": "Reagendada pelo Psicólogo (no prazo)",
  "CanceladaPacienteForaDoPrazo": "Cancelada pelo Paciente (fora do prazo)",
  "CanceladaPsicologoForaDoPrazo": "Cancelada pelo Psicólogo (fora do prazo)",
  "CanceladaForcaMaior": "Cancelada por Força Maior",
  "CanceladaNaoCumprimentoContratualPaciente": "Cancelada - Não Cumprimento Contratual (Paciente)",
  "ReagendadaPsicologoForaDoPrazo": "Reagendada pelo Psicólogo (fora do prazo)",
  "CanceladaNaoCumprimentoContratualPsicologo": "Cancelada - Não Cumprimento Contratual (Psicólogo)",
  "PsicologoDescredenciado": "Psicólogo Descredenciado",
  "CanceladoAdministrador": "Cancelada pelo Administrador",
  "CANCELAMENTO_SISTEMICO_PSICOLOGO": "Cancelamento Sistêmico (Psicólogo Ausente)",
  "CANCELAMENTO_SISTEMICO_PACIENTE": "Cancelamento Sistêmico (Paciente Ausente)",
  "Reservado": "Reservado",
  "Cancelado": "Cancelada",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABELS);
// Adiciona o novo status do banco se não estiver presente
if (!STATUS_OPTIONS.includes("Fora_plataforma")) {
  STATUS_OPTIONS.push("Fora_plataforma");
}

export default function GestaoConsultasListaPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const { consultas, total, isLoading, refetch } = useAdmConsultasLista({ page, limit });
  const updateConsultaStatus = useUpdateAdmConsultaStatus();

  const [detalhes, setDetalhes] = useState<ConsultaItem | null>(null);
  const [editar, setEditar] = useState<ConsultaItem | null>(null);
  const [statusSelecionado, setStatusSelecionado] = useState<string>("");
  const [repasse, setRepasse] = useState(false);
  const [devolverSessao, setDevolverSessao] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return String(dateStr);
    return date.toLocaleDateString("pt-BR");
  };

  const formatTime = (timeStr?: string) => (timeStr ? timeStr.substring(0, 5) : "-");

  const handleOpenEdit = (consulta: ConsultaItem) => {
    setEditar(consulta);
    // Garante que o status selecionado seja válido
    const statusValido = STATUS_OPTIONS.includes(consulta.Status) 
      ? consulta.Status 
      : STATUS_OPTIONS[0]; // Fallback para primeiro status válido
    setStatusSelecionado(statusValido);
    setRepasse(false);
    setDevolverSessao(false);
  };

  const handleSaveEdit = async () => {
    if (!editar) return;
    
    // Valida se o status selecionado é válido
    if (!statusSelecionado || !STATUS_OPTIONS.includes(statusSelecionado)) {
      toast.error("Por favor, selecione um status válido.");
      return;
    }

    try {
      await updateConsultaStatus.mutateAsync({
        id: editar.Id,
        status: statusSelecionado,
        repasse: repasse || false,
        devolverSessao: devolverSessao || false,
      });
      toast.success("Consulta atualizada com sucesso.");
      setEditar(null);
      await refetch();
    } catch (error: any) {
      console.error("Erro ao atualizar consulta:", error);
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Não foi possível atualizar a consulta.";
      toast.error(errorMessage);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <CardTitle>Consultas</CardTitle>
              <CardDescription>Lista completa de consultas da plataforma</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{total} consultas</Badge>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-500">Carregando consultas...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Data</th>
                    <th className="py-2 pr-4">Horário</th>
                    <th className="py-2 pr-4">Paciente</th>
                    <th className="py-2 pr-4">Psicólogo</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {consultas.map((consulta) => (
                    <tr key={consulta.Id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4">{formatDate(consulta.Date)}</td>
                      <td className="py-3 pr-4">{formatTime(consulta.Time)}</td>
                      <td className="py-3 pr-4">{consulta.Paciente?.Nome || "-"}</td>
                      <td className="py-3 pr-4">{consulta.Psicologo?.Nome || "-"}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">{normalizarStatusExibicao(consulta.Status)}</Badge>
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetalhes(consulta)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(consulta)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {consultas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-500">
                        Nenhuma consulta encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detalhes} onOpenChange={() => setDetalhes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da consulta</DialogTitle>
            <DialogDescription>Informações completas da consulta selecionada.</DialogDescription>
          </DialogHeader>
          {detalhes && (
            <div className="space-y-2 text-sm">
              <p><strong>ID:</strong> {detalhes.Id}</p>
              <p><strong>Data:</strong> {formatDate(detalhes.Date)}</p>
              <p><strong>Horário:</strong> {formatTime(detalhes.Time)}</p>
              <p><strong>Status:</strong> {normalizarStatusExibicao(detalhes.Status)}</p>
              <p><strong>Paciente:</strong> {detalhes.Paciente?.Nome || "-"}</p>
              <p><strong>Psicólogo:</strong> {detalhes.Psicologo?.Nome || "-"}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editar} onOpenChange={() => setEditar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar consulta</DialogTitle>
            <DialogDescription>Atualize status e ações financeiras.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={statusSelecionado} onValueChange={setStatusSelecionado}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione o status">
                    {statusSelecionado ? STATUS_LABELS[statusSelecionado] || statusSelecionado : "Selecione o status"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status] || status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-[#2D3A8C] focus:ring-[#2D3A8C]"
                  checked={repasse}
                  onChange={(event) => setRepasse(event.target.checked)}
                />
                Atribuir repasse para o psicólogo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-[#2D3A8C] focus:ring-[#2D3A8C]"
                  checked={devolverSessao}
                  onChange={(event) => setDevolverSessao(event.target.checked)}
                />
                Devolver consulta ao paciente
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditar(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateConsultaStatus.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

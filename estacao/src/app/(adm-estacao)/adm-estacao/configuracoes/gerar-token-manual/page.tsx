"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAdmPaciente } from "@/hooks/admin/useAdmPaciente";
import { useAdmPsicologo } from "@/hooks/admin/useAdmPsicologo";
import type { Paciente } from "@/types/pacienteTypes";
import type { Psicologo } from "@/types/psicologoTypes";
import { tokenManualService, TokenAuditItem } from "@/services/tokenManualService";

export default function GerarTokenManualPage() {
  const { pacientes, isLoading: isLoadingPacientes } = useAdmPaciente();
  const { psicologos, isLoading: isLoadingPsicologos } = useAdmPsicologo();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedPsychologistId, setSelectedPsychologistId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenLogs, setTokenLogs] = useState<TokenAuditItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [consultaFilter, setConsultaFilter] = useState<string>("");
  const [nameFilter, setNameFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "system">("all");
  const [showTokens, setShowTokens] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedConsultaId, setDebouncedConsultaId] = useState<string>("");
  const [debouncedNameFilter, setDebouncedNameFilter] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<TokenAuditItem | null>(null);

  const patientOptions = useMemo(() => {
    return (pacientes ?? []).map((p: Paciente) => ({
      id: p.Id,
      label: `${p.Nome} (${p.Email})`,
    }));
  }, [pacientes]);

  const psychologistOptions = useMemo(() => {
    return (psicologos ?? []).map((p: Psicologo) => ({
      id: p.Id,
      label: `${p.Nome} (${p.Email})`,
    }));
  }, [psicologos]);

  const patientNameById = useMemo(() => {
    const entries = (pacientes ?? []).map((p: Paciente) => [p.Id, p.Nome] as const);
    return new Map<string, string>(entries);
  }, [pacientes]);

  const psychologistNameById = useMemo(() => {
    const entries = (psicologos ?? []).map((p: Psicologo) => [p.Id, p.Nome] as const);
    return new Map<string, string>(entries);
  }, [psicologos]);

  const fetchLogs = useCallback(
    async (consultaId?: string, nextPage: number = page, nextSource = sourceFilter) => {
    try {
      setIsLoadingLogs(true);
      const response = await tokenManualService().listGeneratedTokens({
        page: nextPage,
        limit,
        consultaId: consultaId && consultaId.trim() ? consultaId.trim() : undefined,
        source: nextSource,
      });
      setTokenLogs(response.items ?? []);
      setTotalCount(response.count ?? 0);
    } catch (error) {
      console.error("Erro ao carregar logs de tokens:", error);
      toast.error("Não foi possível carregar a lista de tokens.");
      setTokenLogs([]);
      setTotalCount(0);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [limit, page, sourceFilter]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedConsultaId(consultaFilter.trim());
    }, 400);
    return () => clearTimeout(handle);
  }, [consultaFilter]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedNameFilter(nameFilter.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handle);
  }, [nameFilter]);

  useEffect(() => {
    setPage(1);
    if (debouncedConsultaId !== "") {
      fetchLogs(debouncedConsultaId, 1, sourceFilter);
    } else {
      fetchLogs(undefined, 1, sourceFilter);
    }
  }, [debouncedConsultaId, fetchLogs, sourceFilter]);

  useEffect(() => {
    const consultaId = debouncedConsultaId ? debouncedConsultaId : undefined;
    fetchLogs(consultaId, page, sourceFilter);
  }, [debouncedConsultaId, fetchLogs, page, limit, sourceFilter]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setSelectedPatientId("");
    setSelectedPsychologistId("");
  };

  const handleGenerateTokens = async () => {
    if (!selectedPatientId || !selectedPsychologistId) {
      toast.error("Selecione paciente e psicólogo.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await tokenManualService().generateManualTokens({
        patientId: selectedPatientId,
        psychologistId: selectedPsychologistId,
      });

      if (response.data?.success) {
        toast.success("Tokens gerados com sucesso!");
        handleCloseModal();
        setPage(1);
        await fetchLogs(consultaFilter.trim() || undefined, 1, sourceFilter);
      } else {
        const msg = response.data?.error || response.data?.message || "Falha ao gerar tokens.";
        toast.error(msg);
      }
    } catch (error: any) {
      let backendMsg = "Erro ao gerar tokens manualmente.";
      if (error?.response) {
        if (typeof error.response.data === "string") {
          backendMsg = error.response.data;
        } else if (error.response.data?.message) {
          backendMsg = error.response.data.message;
        } else if (error.response.data?.error) {
          backendMsg = error.response.data.error;
        }
      } else if (error?.message) {
        backendMsg = error.message;
      }
      console.error("Erro ao gerar tokens manualmente:", error);
      toast.error(backendMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetails = (item: TokenAuditItem) => {
    setSelectedLog(item);
  };

  const handleCloseDetails = () => {
    setSelectedLog(null);
  };

  const maskToken = (token?: string | null) => {
    if (!token) return "-";
    if (showTokens) return token;
    if (token.length <= 8) return "****";
    return `${token.slice(0, 4)}****${token.slice(-4)}`;
  };

  const handleCopyToken = async (token?: string | null) => {
    if (!token) {
      toast.error("Token não disponível.");
      return;
    }
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Token copiado.");
    } catch (error) {
      console.error("Erro ao copiar token:", error);
      toast.error("Não foi possível copiar o token.");
    }
  };

  const filteredLogs = useMemo(() => {
    if (!debouncedNameFilter) return tokenLogs;
    return tokenLogs.filter((item) => {
      const patientId = item.metadata?.patientId;
      const psychologistId = item.metadata?.psychologistId;
      const patientName = patientId ? patientNameById.get(patientId) ?? "" : "";
      const psychologistName = psychologistId ? psychologistNameById.get(psychologistId) ?? "" : "";
      const searchable = `${patientName} ${psychologistName}`.toLowerCase();
      return searchable.includes(debouncedNameFilter);
    });
  }, [debouncedNameFilter, patientNameById, psychologistNameById, tokenLogs]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <main className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          Geração Manual de Tokens
        </h1>
        <p className="text-sm text-gray-500">
          Selecione o par paciente/psicólogo para gerar os tokens da consulta mais recente.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 border border-[#E5E9FA] mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Gerar tokens manualmente
            </h2>
            <p className="text-sm text-gray-600">
              Clique em criar para abrir o modal de seleção.
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium bg-[#8494E9] hover:bg-[#6B7DE0] text-white transition"
          >
            Criar
          </button>
        </div>
      </div>

      <section className="bg-white rounded-xl shadow-sm p-5 border border-[#E5E9FA]">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-800">
              Tokens gerados
            </h2>
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={showTokens}
                onChange={(event) => setShowTokens(event.target.checked)}
              />
              Mostrar tokens
            </label>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={consultaFilter}
              onChange={(event) => setConsultaFilter(event.target.value)}
              placeholder="Filtrar por ID da consulta"
              className="w-full sm:max-w-md border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={nameFilter}
              onChange={(event) => setNameFilter(event.target.value)}
              placeholder="Buscar por nome (paciente ou psicólogo)"
              className="w-full sm:max-w-md border rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as "all" | "manual" | "system")}
              className="w-full sm:max-w-xs border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Todas as origens</option>
              <option value="manual">Manual</option>
              <option value="system">Sistema</option>
            </select>
            <select
              value={String(limit)}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              className="w-full sm:max-w-[140px] border rounded-lg px-3 py-2 text-sm"
            >
              <option value="10">10 por página</option>
              <option value="20">20 por página</option>
              <option value="50">50 por página</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPage(1);
                  fetchLogs(consultaFilter.trim() || undefined, 1, sourceFilter);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#8494E9] text-white hover:bg-[#6B7DE0]"
              >
                Filtrar
              </button>
              <button
                onClick={() => {
                  setConsultaFilter("");
                  setNameFilter("");
                  setSourceFilter("all");
                  setPage(1);
                  fetchLogs(undefined, 1, "all");
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
        {isLoadingLogs ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : filteredLogs.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum resultado para os filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Paciente</th>
                  <th className="py-2 pr-4">Psicólogo</th>
                  <th className="py-2 pr-4">Origem</th>
                  <th className="py-2 pr-4">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">
                      {item.metadata?.patientId
                        ? patientNameById.get(item.metadata.patientId) ?? item.metadata.patientId
                        : "-"}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">
                      {item.metadata?.psychologistId
                        ? psychologistNameById.get(item.metadata.psychologistId) ??
                          item.metadata.psychologistId
                        : "-"}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">
                      {item.origin === "manual"
                        ? "manual"
                        : item.metadata?.source ?? "system"}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">
                      <button
                        onClick={() => handleOpenDetails(item)}
                        className="inline-flex items-center gap-2 text-[#8494E9] hover:text-[#6B7DE0]"
                        title="Ver detalhes"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span className="text-sm">Detalhes</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-xs text-gray-500">
                Exibindo {filteredLogs.length} de {totalCount} registros
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page <= 1}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    page <= 1
                      ? "border-gray-200 text-gray-300"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Anterior
                </button>
                <span className="text-xs text-gray-600">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page >= totalPages}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    page >= totalPages
                      ? "border-gray-200 text-gray-300"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Criar tokens manualmente
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
                disabled={isSubmitting}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paciente
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(event) => setSelectedPatientId(event.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  disabled={isLoadingPacientes || isSubmitting}
                >
                  <option value="">Selecione o paciente</option>
                  {patientOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Psicólogo
                </label>
                <select
                  value={selectedPsychologistId}
                  onChange={(event) => setSelectedPsychologistId(event.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  disabled={isLoadingPsicologos || isSubmitting}
                >
                  <option value="">Selecione o psicólogo</option>
                  {psychologistOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateTokens}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                  isSubmitting ? "bg-gray-400" : "bg-[#8494E9] hover:bg-[#6B7DE0]"
                }`}
              >
                {isSubmitting ? "Gerando..." : "Gerar tokens"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Detalhes do token
              </h3>
              <button
                onClick={handleCloseDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <span className="text-gray-500">Data</span>
                <div>{new Date(selectedLog.timestamp).toLocaleString("pt-BR")}</div>
              </div>
              <div>
                <span className="text-gray-500">Origem</span>
                <div>{selectedLog.metadata?.source ?? "-"}</div>
              </div>
              <div>
                <span className="text-gray-500">Consulta</span>
                <div>{selectedLog.metadata?.consultaId ?? "-"}</div>
              </div>
              <div>
                <span className="text-gray-500">Channel</span>
                <div>{selectedLog.metadata?.channelName ?? "-"}</div>
              </div>
              <div>
                <span className="text-gray-500">Paciente</span>
                <div>
                  {selectedLog.metadata?.patientId
                    ? patientNameById.get(selectedLog.metadata.patientId) ??
                      selectedLog.metadata.patientId
                    : "-"}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Psicólogo</span>
                <div>
                  {selectedLog.metadata?.psychologistId
                    ? psychologistNameById.get(selectedLog.metadata.psychologistId) ??
                      selectedLog.metadata.psychologistId
                    : "-"}
                </div>
              </div>
              <div>
                <span className="text-gray-500">UID Paciente</span>
                <div>{selectedLog.metadata?.patientUid ?? "-"}</div>
              </div>
              <div>
                <span className="text-gray-500">UID Psicólogo</span>
                <div>{selectedLog.metadata?.psychologistUid ?? "-"}</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-800">Tokens</h4>
                <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={showTokens}
                    onChange={(event) => setShowTokens(event.target.checked)}
                  />
                  Mostrar tokens
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-32">Token Paciente</span>
                  <span className="break-all">{maskToken(selectedLog.metadata?.patientToken)}</span>
                  <button
                    onClick={() => handleCopyToken(selectedLog.metadata?.patientToken)}
                    className="text-xs text-[#8494E9] hover:text-[#6B7DE0]"
                  >
                    Copiar
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-32">Token Psicólogo</span>
                  <span className="break-all">{maskToken(selectedLog.metadata?.psychologistToken)}</span>
                  <button
                    onClick={() => handleCopyToken(selectedLog.metadata?.psychologistToken)}
                    className="text-xs text-[#8494E9] hover:text-[#6B7DE0]"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

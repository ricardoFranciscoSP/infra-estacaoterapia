"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { BackupItem, BackupSchedule, backupService } from "@/services/backupService";

type ActionState = {
  isLoading: boolean;
  fileName?: string;
};

const dayLabels = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const defaultSchedule: BackupSchedule = {
  enabled: false,
  dayOfWeek: 5,
  time: "00:00",
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
};

const formatDate = (iso: string) => {
  if (!iso) return "-";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
};

const getFileNameFromResponse = (fallback: string, disposition?: string) => {
  if (!disposition) return fallback;
  const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i);
  const fileName = match?.[1] || match?.[2];
  return fileName ? decodeURIComponent(fileName) : fallback;
};

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [action, setAction] = useState<ActionState>({ isLoading: false });
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [schedule, setSchedule] = useState<BackupSchedule>(defaultSchedule);
  const [scheduleDraft, setScheduleDraft] = useState<BackupSchedule>(defaultSchedule);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const sortedBackups = useMemo(
    () =>
      [...backups].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [backups]
  );

  const fetchBackups = useCallback(async () => {
    try {
      setLoadingList(true);
      const response = await backupService.list();
      setBackups(response.data.items || []);
    } catch (error) {
      console.error("Erro ao listar backups:", error);
      toast.error("Erro ao carregar backups");
    } finally {
      setLoadingList(false);
    }
  }, []);

  const fetchSchedule = useCallback(async () => {
    try {
      setScheduleLoading(true);
      const response = await backupService.getSchedule();
      setSchedule(response.data);
    } catch (error) {
      console.error("Erro ao carregar agendamento:", error);
      toast.error("Erro ao carregar agendamento");
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
    fetchSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    try {
      setAction({ isLoading: true });
      const response = await backupService.generate();
      const backup = response.data.backup;
      toast.success("Backup gerado com sucesso");
      await fetchBackups();
      if (backup?.name) {
        await handleDownload(backup.name);
      }
    } catch (error) {
      console.error("Erro ao gerar backup:", error);
      toast.error("Erro ao gerar backup");
    } finally {
      setAction({ isLoading: false });
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      setAction({ isLoading: true, fileName });
      const response = await backupService.download(fileName);
      const blob = new Blob([response.data], { type: "application/sql" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getFileNameFromResponse(
        fileName,
        response.headers?.["content-disposition"]
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar backup:", error);
      toast.error("Erro ao baixar backup");
    } finally {
      setAction({ isLoading: false });
    }
  };

  const handleDelete = async (fileName: string) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o backup "${fileName}"? Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    try {
      setAction({ isLoading: true, fileName });
      await backupService.delete(fileName);
      toast.success("Backup removido");
      await fetchBackups();
    } catch (error) {
      console.error("Erro ao excluir backup:", error);
      toast.error("Erro ao excluir backup");
    } finally {
      setAction({ isLoading: false });
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      toast.error("Selecione um arquivo .sql");
      return;
    }

    const confirmed = window.confirm(
      "Tem certeza que deseja restaurar este backup? Isso substituirá os dados atuais."
    );
    if (!confirmed) return;

    try {
      setAction({ isLoading: true });
      await backupService.restore(restoreFile);
      toast.success("Backup restaurado com sucesso");
      setRestoreFile(null);
      await fetchBackups();
    } catch (error) {
      console.error("Erro ao restaurar backup:", error);
      toast.error("Erro ao restaurar backup");
    } finally {
      setAction({ isLoading: false });
    }
  };

  const handleOpenSchedule = () => {
    setScheduleDraft(schedule);
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    try {
      setScheduleLoading(true);
      const response = await backupService.updateSchedule(scheduleDraft);
      setSchedule(response.data);
      toast.success("Agendamento atualizado");
      setScheduleModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      toast.error("Erro ao salvar agendamento");
    } finally {
      setScheduleLoading(false);
    }
  };

  return (
    <main className="w-full p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          Backups do Banco de Dados
        </h1>
        <p className="text-sm text-gray-500">
          Gere backups, faça download e restaure quando necessário.
        </p>
      </motion.div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-5 border border-[#E5E9FA] flex flex-col gap-4"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Gerar backup</h2>
            <p className="text-sm text-gray-500">
              Crie um arquivo .sql do banco atual e faça o download imediatamente.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={action.isLoading}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              action.isLoading
                ? "bg-gray-400 cursor-not-allowed text-white"
                : "bg-[#8494E9] hover:bg-[#6B7DE0] text-white"
            }`}
          >
            {action.isLoading ? "Gerando..." : "Gerar backup"}
          </button>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-5 border border-[#E5E9FA] flex flex-col gap-4"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Restaurar backup</h2>
            <p className="text-sm text-gray-500">
              Faça upload de um arquivo .sql para restaurar o banco.
            </p>
          </div>
          <input
            type="file"
            accept=".sql"
            onChange={(event) => setRestoreFile(event.target.files?.[0] || null)}
            className="w-full text-sm text-gray-600"
          />
          <button
            type="button"
            onClick={handleRestore}
            disabled={action.isLoading || !restoreFile}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              action.isLoading || !restoreFile
                ? "bg-gray-300 cursor-not-allowed text-white"
                : "bg-[#E57373] hover:bg-[#D55D5D] text-white"
            }`}
          >
            {action.isLoading ? "Restaurando..." : "Restaurar backup"}
          </button>
        </motion.section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-5 border border-[#E5E9FA]"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Status</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              <span className="font-medium">Total de backups:</span>{" "}
              {sortedBackups.length}
            </p>
            <p>
              <span className="font-medium">Última atualização:</span>{" "}
              {sortedBackups[0] ? formatDate(sortedBackups[0].updatedAt) : "-"}
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-5 border border-[#E5E9FA] flex flex-col gap-4"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Agendamento</h2>
            <p className="text-sm text-gray-500">
              Configure a rotina automática de geração de backup.
            </p>
          </div>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              <span className="font-medium">Status:</span>{" "}
              {schedule.enabled ? "Ativo" : "Inativo"}
            </p>
            <p>
              <span className="font-medium">Dia:</span>{" "}
              {dayLabels[schedule.dayOfWeek] ?? "-"}
            </p>
            <p>
              <span className="font-medium">Horário:</span> {schedule.time || "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenSchedule}
            disabled={scheduleLoading}
            className="w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-[#E5E9FA] hover:bg-[#F2F4FD]"
          >
            {scheduleLoading ? "Carregando..." : "Configurar agendamento"}
          </button>
        </motion.section>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 bg-white rounded-xl shadow-sm p-5 border border-[#E5E9FA]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Backups realizados</h2>
          <button
            type="button"
            onClick={fetchBackups}
            disabled={loadingList || action.isLoading}
            className="px-3 py-2 text-sm rounded-md border border-[#E5E9FA] hover:bg-[#F2F4FD]"
          >
            {loadingList ? "Atualizando..." : "Atualizar"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2 px-3">Versão</th>
                <th className="py-2 px-3">Arquivo</th>
                <th className="py-2 px-3">Tamanho</th>
                <th className="py-2 px-3">Criado em</th>
                <th className="py-2 px-3">Atualizado em</th>
                <th className="py-2 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {sortedBackups.length === 0 && (
                <tr>
                  <td className="py-4 px-3 text-center text-gray-500" colSpan={6}>
                    {loadingList ? "Carregando..." : "Nenhum backup encontrado"}
                  </td>
                </tr>
              )}
              {sortedBackups.map((backup, index) => (
                <tr key={backup.name}>
                  <td className="py-2 px-3 text-gray-500">{String(index + 1).padStart(2, "0")}</td>
                  <td className="py-2 px-3 font-medium">{backup.name}</td>
                  <td className="py-2 px-3">{formatBytes(backup.size)}</td>
                  <td className="py-2 px-3">{formatDate(backup.createdAt)}</td>
                  <td className="py-2 px-3">{formatDate(backup.updatedAt)}</td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(backup.name)}
                        disabled={action.isLoading && action.fileName === backup.name}
                        className="p-2 rounded-md border border-[#E5E9FA] hover:bg-[#F2F4FD]"
                        title="Baixar"
                        aria-label={`Baixar ${backup.name}`}
                      >
                        <svg
                          className="w-4 h-4 text-[#8494E9]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4-4m-4 4l-4-4" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 17v3h16v-3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(backup.name)}
                        disabled={action.isLoading && action.fileName === backup.name}
                        className="text-sm text-red-600 hover:text-red-700 hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>

      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Agendamento de backup
            </h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={scheduleDraft.enabled}
                  onChange={(event) =>
                    setScheduleDraft((prev) => ({
                      ...prev,
                      enabled: event.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-[#8494E9] border-gray-300 rounded"
                />
                Ativar rotina automática
              </label>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Dia da semana</label>
                <select
                  value={scheduleDraft.dayOfWeek}
                  onChange={(event) =>
                    setScheduleDraft((prev) => ({
                      ...prev,
                      dayOfWeek: Number(event.target.value),
                    }))
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {dayLabels.map((label, index) => (
                    <option key={label} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Horário</label>
                <input
                  type="time"
                  value={scheduleDraft.time}
                  onChange={(event) =>
                    setScheduleDraft((prev) => ({
                      ...prev,
                      time: event.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={scheduleLoading}
                className={`px-4 py-2 text-sm rounded-lg font-medium ${
                  scheduleLoading
                    ? "bg-gray-300 text-white cursor-not-allowed"
                    : "bg-[#8494E9] text-white hover:bg-[#6B7DE0]"
                }`}
              >
                {scheduleLoading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

"use client";
import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAdmNotifications, useAddNotificationAll, useAddNotificationUser } from "@/hooks/admin/notificationsAdmin";
import { Notification } from "@/services/notificationService";
import { userService, User } from "@/services/userService";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";

// Ícones SVG
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const MAX_MESSAGE_LENGTH = 500;

// Função para formatar data ISO para DD/MM/YYYY
function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR");
}

// Função para exibir destinatário
function getDestinatario(notification: Notification) {
  if (notification.IsForAllUsers) return "Todos";
  if (notification.UserId) {
    // Se tem UserId, mostra quantos usuários receberam (poderia ser melhorado buscando os nomes)
    const userIds = notification.UserId.split(",").filter(id => id.trim());
    return userIds.length > 0 ? `${userIds.length} usuário(s)` : "Usuário(s)";
  }
  return "Usuário(s)";
}

export default function NotificacoesPage() {
  // Estado do modal
  const [showModal, setShowModal] = useState(false);

  // Estado do formulário
  const [form, setForm] = useState({
    title: "",
    message: "",
    all: false,
    psicologos: false,
    pacientes: false,
    selectedUsers: [] as string[],
    searchName: "", // Busca por nome
  });
  // Estado do filtro e paginação
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Hooks de notificações
  const { notifications, isLoading, isError, refetch } = useAdmNotifications();
  const addAllMutation = useAddNotificationAll();
  const addUserMutation = useAddNotificationUser();

  // Buscar psicólogos
  const { data: psicologosData, isLoading: isLoadingPsicologos } = useQuery<User[]>({
    queryKey: ['users', 'Psychologist'],
    queryFn: async () => {
      const response = await userService.list({ role: 'Psychologist' });
      return response.data;
    },
    enabled: form.psicologos,
  });

  // Buscar pacientes
  const { data: pacientesData, isLoading: isLoadingPacientes } = useQuery<User[]>({
    queryKey: ['users', 'Patient'],
    queryFn: async () => {
      const response = await userService.list({ role: 'Patient' });
      return response.data;
    },
    enabled: form.pacientes,
  });

  // Lista de usuários para exibir no select (filtrada por busca)
  const usuariosParaExibir = useMemo(() => {
    let lista: User[] = [];
    
    if (form.psicologos && psicologosData) {
      lista = [...lista, ...psicologosData];
    }
    if (form.pacientes && pacientesData) {
      lista = [...lista, ...pacientesData];
    }

    // Filtrar por nome
    if (form.searchName.trim()) {
      const searchLower = form.searchName.toLowerCase();
      lista = lista.filter(u => 
        u.Nome?.toLowerCase().includes(searchLower) ||
        u.Email?.toLowerCase().includes(searchLower)
      );
    }

    return lista;
  }, [form.psicologos, form.pacientes, form.searchName, psicologosData, pacientesData]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Filtro e paginação reais
  const filtered = (Array.isArray(notifications) ? notifications as Notification[] : []).filter((n: Notification) =>
    (n.Title?.toLowerCase().includes(search.toLowerCase()) ||
      n.Message?.toLowerCase().includes(search.toLowerCase()))
  );
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const { name, value, type } = target;
    const checked = type === "checkbox" ? (target as HTMLInputElement).checked : undefined;
    setForm(prev => {
      const updates: Partial<typeof prev> = {
        [name]: type === "checkbox" ? checked : value,
      } as Partial<typeof prev>;
      
      // Se marcar "Todos", desmarca os outros
      if (name === "all" && checked) {
        updates.psicologos = false;
        updates.pacientes = false;
        updates.selectedUsers = [];
      }
      
      // Se marcar psicólogos ou pacientes, desmarca "Todos"
      if ((name === "psicologos" || name === "pacientes") && checked) {
        updates.all = false;
      }
      
      return { ...prev, ...updates };
    });
  }
  
  function handleUserSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setForm(prev => ({ ...prev, selectedUsers: selected }));
  }
  
  function handleCancel() {
    setShowModal(false);
    setForm({ title: "", message: "", all: false, psicologos: false, pacientes: false, selectedUsers: [], searchName: "" });
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (form.all) {
        // Enviar para todos
        await addAllMutation.mutateAsync({
          Id: Date.now().toString(),
          Title: form.title,
          Message: form.message,
          UserId: "",
          IsForAllUsers: true,
          CreatedAt: new Date().toISOString(),
        });
        toast.success("Notificação enviada para todos os usuários!");
      } else if ((form.psicologos || form.pacientes) && form.selectedUsers.length > 0) {
        // Enviar para usuários selecionados (um por vez)
        const promises = form.selectedUsers.map(userId =>
          addUserMutation.mutateAsync({
            Id: `${Date.now()}-${userId}`,
            Title: form.title,
            Message: form.message,
            UserId: userId,
            CreatedAt: new Date().toISOString(),
          })
        );
        
        await Promise.all(promises);
        toast.success(`Notificação enviada para ${form.selectedUsers.length} usuário(s)!`);
      } else {
        toast.error("Selecione pelo menos um público e selecione os usuários.");
        return;
      }
      
      await refetch();
      handleCancel();
    } catch (error) {
      console.error("Erro ao enviar notificação:", error);
      toast.error("Erro ao enviar notificação. Tente novamente.");
    }
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Notificações</h1>
            <p className="text-sm text-gray-500">Gerencie e envie notificações para usuários</p>
          </div>
          <button
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#8494E9] text-white rounded-lg shadow-sm hover:bg-[#6B7DE0] transition-all font-medium"
            onClick={() => setShowModal(true)}
          >
            <PlusIcon />
            <span>Criar Notificação</span>
          </button>
        </div>
      </motion.div>

      {/* Filtros */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-5 mb-5"
      >
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por título ou mensagem..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <SearchIcon />
          </div>
        </div>

        {/* Info de total */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span className="text-sm font-medium text-gray-600">
            {filtered.length > 0 ? (
              <>Total: <span className="text-[#8494E9] font-semibold">{filtered.length}</span> {filtered.length === 1 ? 'notificação' : 'notificações'}</>
            ) : (
              "Nenhuma notificação encontrada"
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Anterior
            </button>
            <span className="text-sm font-medium text-gray-600 px-3">
              {page} / {totalPages}
            </span>
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Próxima →
            </button>
          </div>
        </div>
      </motion.div>

      {/* Lista de notificações */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gradient-to-r from-[#8494E9]/5 to-[#8494E9]/10">
              <tr>
                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Título</th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Mensagem</th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Data</th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Destinatário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-500 font-medium">Carregando notificações...</p>
                    </div>
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">⚠️</span>
                      <p className="text-red-500 font-medium">Erro ao carregar notificações</p>
                      <button 
                        onClick={() => refetch()} 
                        className="text-sm text-[#8494E9] hover:underline"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && paginated.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">🔔</span>
                      <p className="text-gray-500 font-medium">Nenhuma notificação encontrada</p>
                      <p className="text-sm text-gray-400">Crie uma nova notificação para começar</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && paginated.map((n: Notification) => (
                <tr key={n.Id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6 text-sm font-medium text-gray-900">{n.Title}</td>
                  <td className="py-4 px-6 text-sm text-gray-600 max-w-xs truncate">{n.Message}</td>
                  <td className="py-4 px-6 text-sm text-gray-600">{formatDate(n.CreatedAt ?? "")}</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#8494E9]/10 text-[#8494E9] border border-[#8494E9]/20">
                      {getDestinatario(n)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal de criação */}
      {showModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg"
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <BellIcon />
                <h2 className="text-xl font-semibold text-gray-800">Criar Notificação</h2>
              </div>
              <button 
                className="text-gray-400 hover:text-gray-600 transition-colors" 
                onClick={handleCancel}
              >
                <CloseIcon />
              </button>
            </div>

            {/* Formulário */}
            <form className="px-6 py-5" onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                <input
                  type="text"
                  name="title"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all"
                  placeholder="Digite o título da notificação"
                  value={form.title}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem</label>
                <textarea
                  name="message"
                  rows={4}
                  maxLength={MAX_MESSAGE_LENGTH}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all resize-none"
                  placeholder="Digite a mensagem da notificação"
                  value={form.message}
                  onChange={handleFormChange}
                  required
                />
                <div className="flex justify-between items-center mt-1">
                  <span className={`text-xs ${form.message.length >= MAX_MESSAGE_LENGTH ? 'text-red-500' : 'text-gray-500'}`}>
                    {form.message.length}/{MAX_MESSAGE_LENGTH} caracteres
                  </span>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-3">Públicos</label>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="all"
                      checked={form.all}
                      onChange={handleFormChange}
                      className="w-4 h-4 text-[#8494E9] border-gray-300 rounded focus:ring-[#8494E9]"
                    />
                    <span className="text-sm text-gray-700">Todos os usuários</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="psicologos"
                      checked={form.psicologos}
                      onChange={handleFormChange}
                      className="w-4 h-4 text-[#8494E9] border-gray-300 rounded focus:ring-[#8494E9]"
                    />
                    <span className="text-sm text-gray-700">Psicólogos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="pacientes"
                      checked={form.pacientes}
                      onChange={handleFormChange}
                      className="w-4 h-4 text-[#8494E9] border-gray-300 rounded focus:ring-[#8494E9]"
                    />
                    <span className="text-sm text-gray-700">Paciente</span>
                  </label>
                </div>
              </div>

              {/* Busca e Select de usuários */}
              {(form.psicologos || form.pacientes) && (
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Buscar por nome</label>
                  <input
                    type="text"
                    name="searchName"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all"
                    placeholder="Digite o nome ou email..."
                    value={form.searchName}
                    onChange={handleFormChange}
                  />
                  
                  <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">Selecionar Usuários</label>
                  {(isLoadingPsicologos || isLoadingPacientes) ? (
                    <div className="w-full px-4 py-8 border border-gray-200 rounded-lg text-center text-gray-500">
                      Carregando usuários...
                    </div>
                  ) : usuariosParaExibir.length === 0 ? (
                    <div className="w-full px-4 py-8 border border-gray-200 rounded-lg text-center text-gray-500">
                      {form.searchName ? "Nenhum usuário encontrado" : "Nenhum usuário disponível"}
                    </div>
                  ) : (
                    <>
                      <select
                        multiple
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all"
                        value={form.selectedUsers}
                        onChange={handleUserSelect}
                        size={6}
                      >
                        {usuariosParaExibir.map(u => (
                          <option key={u.Id} value={u.Id} className="py-1">
                            {u.Nome} {u.Email ? `(${u.Email})` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {form.selectedUsers.length > 0 
                          ? `${form.selectedUsers.length} usuário(s) selecionado(s). `
                          : ''}
                        Segure Ctrl/Cmd para selecionar múltiplos usuários
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Botões */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-all"
                  onClick={handleCancel}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#8494E9] text-white font-medium hover:bg-[#6B7DE0] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={addAllMutation.isPending || addUserMutation.isPending}
                >
                  {addAllMutation.isPending || addUserMutation.isPending ? "Enviando..." : "Enviar Notificação"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </main>
  );
}
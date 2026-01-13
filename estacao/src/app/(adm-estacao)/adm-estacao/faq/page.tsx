"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useFaqs, useCreateFaq, useUpdateFaq, useDeleteFaq } from "@/hooks/admin/useFaq";
import { FAQ } from "@/types/faq.types";
import { useEnums } from "@/hooks/enumsHook";

// Ícones SVG inline
const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const SearchIcon = () => (
	<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
	</svg>
);

const FilterIcon = () => (
	<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
	</svg>
);

const PlusIcon = () => (
	<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
	</svg>
);

const LoadingSpinner = () => (
	<div className="flex items-center justify-center p-12">
		<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8494E9]"></div>
	</div>
);

export default function FaqPage() {
  const { data: faqs = [], isLoading, isError, refetch } = useFaqs();
  const createFaq = useCreateFaq();
  const updateFaq = useUpdateFaq();
  const deleteFaq = useDeleteFaq();
  const { enums } = useEnums();

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [form, setForm] = useState({ Pergunta: "", Resposta: "", Status: "Ativo", Tipo: "Paciente" });
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroTarget, setFiltroTarget] = useState("Todos");

  // Carregar opções de enum
  const statusOptions = enums?.status?.faqStatus?.map(status => ({
    value: status,
    label: status
  })) || [{ value: "Ativo", label: "Ativo" }, { value: "Inativo", label: "Inativo" }];

  const targetOptions = enums?.tipos?.faqTipo?.map(tipo => ({
    value: tipo,
    label: tipo === "Psicologo" ? "Psicólogo" : tipo
  })) || [{ value: "Paciente", label: "Paciente" }, { value: "Psicologo", label: "Psicólogo" }];

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleCancel() {
    setShowModal(false);
    setForm({ Pergunta: "", Resposta: "", Status: "Ativo", Tipo: "Paciente" });
  }

  function handleEditCancel() {
    setShowEditModal(false);
    setEditId(null);
    setForm({ Pergunta: "", Resposta: "", Status: "Ativo", Tipo: "Paciente" });
  }

  function handleDeleteConfirm(id: string) {
    setDeleteId(id);
    setShowDeleteModal(true);
  }

  function confirmDelete() {
    if (deleteId) {
      deleteFaq.mutate(deleteId, {
        onSuccess: () => {
          setShowDeleteModal(false);
          setDeleteId(null);
        }
      });
    }
  }

  function cancelDelete() {
    setShowDeleteModal(false);
    setDeleteId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createFaq.mutate(form, {
      onSuccess: () => {
        handleCancel();
      }
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) {
      updateFaq.mutate(
        { id: editId, faq: form },
        {
          onSuccess: () => {
            handleEditCancel();
          }
        }
      );
    }
  }

  function handleEdit(faq: FAQ) {
    setEditId(faq.Id);
    setForm({
      Pergunta: faq.Pergunta,
      Resposta: faq.Resposta,
      Status: faq.Status,
      Tipo: faq.Tipo,
    });
    setShowEditModal(true);
  }

  function getTagColor(tag: string) {
    if (tag === "Ativo") return "bg-green-100 text-green-700";
    if (tag === "Inativo") return "bg-yellow-100 text-yellow-700";
    if (tag === "Psicologo") return "bg-blue-100 text-blue-700";
    if (tag === "Paciente") return "bg-purple-100 text-purple-700";
    return "bg-gray-100 text-gray-700";
  }

  // Filtros
  const faqsFiltrados = faqs.filter((f) => {
    const buscaMatch = 
      f.Pergunta.toLowerCase().includes(busca.toLowerCase()) ||
      f.Resposta.toLowerCase().includes(busca.toLowerCase());
    const statusMatch = filtroStatus === "Todos" || f.Status === filtroStatus;
    const targetMatch = filtroTarget === "Todos" || f.Tipo === filtroTarget;
    return buscaMatch && statusMatch && targetMatch;
  });

  if (isLoading) {
    return (
      <main className="w-full p-4 sm:p-6 lg:p-8">
        <LoadingSpinner />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="w-full p-4 sm:p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">Erro ao carregar FAQs</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-[#8494E9] text-white rounded-lg hover:bg-[#6B7DE0] transition-all"
          >
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">FAQ</h1>
            <p className="text-sm text-gray-500">Gerencie as perguntas frequentes da plataforma</p>
          </div>
          <button
            className="flex items-center justify-center gap-2 bg-[#8494E9] text-white px-5 py-2.5 rounded-lg shadow-sm hover:bg-[#6B7DE0] transition-all font-medium"
            onClick={() => setShowModal(true)}
          >
            <PlusIcon />
            Criar FAQ
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
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Campo de busca */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Buscar por pergunta ou resposta..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          {/* Filtro de status */}
          <div className="relative min-w-[180px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FilterIcon />
            </div>
            <select
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none appearance-none bg-white cursor-pointer"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="Todos">Todos os status</option>
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Filtro de público */}
          <div className="relative min-w-[180px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FilterIcon />
            </div>
            <select
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none appearance-none bg-white cursor-pointer"
              value={filtroTarget}
              onChange={(e) => setFiltroTarget(e.target.value)}
            >
              <option value="Todos">Todos os públicos</option>
              {targetOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <span className="text-sm font-medium text-gray-600">
            {faqsFiltrados.length > 0 ? (
              <>Exibindo <span className="text-[#8494E9] font-semibold">{faqsFiltrados.length}</span> {faqsFiltrados.length === 1 ? 'pergunta' : 'perguntas'}</>
            ) : (
              "Nenhuma FAQ encontrada"
            )}
          </span>
        </div>
      </motion.div>

      {/* Lista de FAQs */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {faqsFiltrados.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-12 text-center">
            <span className="text-gray-400 text-4xl block mb-2">❓</span>
            <span className="text-gray-500 font-medium block">Nenhuma FAQ encontrada</span>
            <span className="text-gray-400 text-sm">Tente ajustar os filtros de busca</span>
          </div>
        ) : (
          faqsFiltrados.map((faq, i) => (
            <motion.div
              key={faq.Id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-5 hover:shadow-md transition-all relative"
            >
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  className="p-2 rounded-lg text-[#8494E9] hover:bg-[#8494E9]/10 transition-all"
                  onClick={() => handleEdit(faq)}
                  title="Editar"
                >
                  <PencilIcon />
                </button>
                <button
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all"
                  onClick={() => handleDeleteConfirm(faq.Id)}
                  title="Excluir"
                >
                  <TrashIcon />
                </button>
              </div>
              <div className="font-bold text-gray-800 mb-2 pr-20">{faq.Pergunta}</div>
              <div className="text-gray-600 text-sm mb-4 line-clamp-2">{faq.Resposta}</div>
              <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getTagColor(faq.Status)}`}>
                  {faq.Status}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getTagColor(faq.Tipo)}`}>
                  {faq.Tipo === "Psicologo" ? "Psicólogo" : faq.Tipo}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Modal de criação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-[#8494E9] w-[700px] animate-fadeIn transition-all duration-300">
            <div className="flex justify-center items-center px-8 py-6 bg-[#8494E9] rounded-t-2xl relative">
              <h2 className="text-2xl font-bold text-white text-center flex-1">Nova FAQ</h2>
              <button
                className="absolute right-8 top-6 text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200"
                onClick={handleCancel}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <form className="px-8 py-6" onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block font-semibold text-gray-800 mb-2">Pergunta</label>
                <input
                  type="text"
                  name="Pergunta"
                  className="w-full border border-blue-200 rounded-lg px-4 py-3 text-gray-800 bg-white shadow focus:outline-none focus:border-[#8494E9] focus:ring-2 focus:ring-[#8494E9]/30 transition-all duration-150"
                  value={form.Pergunta}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block font-semibold text-gray-800 mb-2">Resposta</label>
                <textarea
                  name="Resposta"
                  className="w-full border border-blue-200 rounded-lg px-4 py-3 text-gray-800 bg-white shadow focus:outline-none focus:border-[#8494E9] focus:ring-2 focus:ring-[#8494E9]/30 transition-all duration-150"
                  value={form.Resposta}
                  onChange={handleFormChange}
                  required
                  rows={4}
                />
              </div>
              <div className="mb-6 flex gap-6">
                <div className="flex-1 relative">
                  <label className="block font-semibold text-gray-800 mb-2">Status</label>
                  <select
                    name="Status"
                    className="w-full border border-blue-200 rounded-lg px-4 py-3 pr-10 text-gray-800 bg-white shadow focus:outline-none focus:border-[#8494E9] focus:ring-2 focus:ring-[#8494E9]/30 transition-all duration-150 appearance-none"
                    value={form.Status}
                    onChange={handleFormChange}
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute top-10 right-4 flex items-center">
                    <svg className="w-4 h-4 text-[#8494E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
                <div className="flex-1 relative">
                  <label className="block font-semibold text-gray-800 mb-2">Público-alvo</label>
                  <select
                    name="Tipo"
                    className="w-full border border-blue-200 rounded-lg px-4 py-3 pr-10 text-gray-800 bg-white shadow focus:outline-none focus:border-[#8494E9] focus:ring-2 focus:ring-[#8494E9]/30 transition-all duration-150 appearance-none"
                    value={form.Tipo}
                    onChange={handleFormChange}
                  >
                    {targetOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute top-10 right-4 flex items-center">
                    <svg className="w-4 h-4 text-[#8494E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-8">
                <button
                  type="button"
                  className="px-6 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-semibold transition-all duration-200"
                  onClick={handleCancel}
                  disabled={createFaq.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-[#8494E9] text-white font-semibold hover:bg-[#6c7ad1] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={createFaq.isPending}
                >
                  {createFaq.isPending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de edição */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-[#8494E9] w-[700px] animate-fadeIn transition-all duration-300">
            <div className="flex justify-center items-center px-8 py-6 bg-[#8494E9] rounded-t-2xl relative">
              <h2 className="text-2xl font-bold text-white text-center flex-1">Editar FAQ</h2>
              <button
                className="absolute right-8 top-6 text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200"
                onClick={handleEditCancel}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <form className="px-8 py-6" onSubmit={handleEditSubmit}>
              <div className="mb-6">
                <label className="block font-semibold text-gray-800 mb-2">Pergunta</label>
                <input
                  type="text"
                  name="Pergunta"
                  className="w-full border border-blue-200 rounded-lg px-4 py-3 text-gray-800 bg-white shadow focus:outline-none focus:border-[#8494E9] focus:ring-2 focus:ring-[#8494E9]/30 transition-all duration-150"
                  value={form.Pergunta}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block font-semibold text-gray-800 mb-2">Resposta</label>
                <textarea
                  name="Resposta"
                  className="w-full border border-blue-200 rounded-lg px-4 py-3 text-gray-800 bg-white shadow focus:outline-none focus:border-[#8494E9] focus:ring-2 focus:ring-[#8494E9]/30 transition-all duration-150"
                  value={form.Resposta}
                  onChange={handleFormChange}
                  required
                  rows={4}
                />
              </div>
              <div className="mb-6 flex gap-6">
                <div className="flex-1 relative">
                  <label className="block font-semibold text-gray-800 mb-2">Status</label>
                  <select
                    name="Status"
                    className="w-full border border-blue-200 rounded-lg px-4 py-3 pr-10 text-gray-800 bg-white shadow focus:outline-none focus:border-[#8494E9] focus:ring-2 focus:ring-[#8494E9]/30 transition-all duration-150 appearance-none"
                    value={form.Status}
                    onChange={handleFormChange}
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute top-10 right-4 flex items-center">
                    <svg className="w-4 h-4 text-[#8494E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
                <div className="flex-1 relative">
                  <label className="block font-semibold text-gray-800 mb-2">Público-alvo</label>
                  <select
                    name="Tipo"
                    className="w-full border border-blue-200 rounded-lg px-4 py-3 pr-10 text-gray-800 bg-white shadow focus:outline-none focus:border-[#8494E9] focus:ring-2 focus:ring-[#8494E9]/30 transition-all duration-150 appearance-none"
                    value={form.Tipo}
                    onChange={handleFormChange}
                  >
                    {targetOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute top-10 right-4 flex items-center">
                    <svg className="w-4 h-4 text-[#8494E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-8">
                <button
                  type="button"
                  className="px-6 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-semibold transition-all duration-200"
                  onClick={handleEditCancel}
                  disabled={updateFaq.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-[#8494E9] text-white font-semibold hover:bg-[#6c7ad1] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={updateFaq.isPending}
                >
                  {updateFaq.isPending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">Confirmar exclusão</h2>
            <p className="text-gray-600 text-sm mb-6 text-center">Tem certeza que deseja excluir esta FAQ? Essa ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-all"
                onClick={cancelDelete}
              >
                Cancelar
              </button>
              <button
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={confirmDelete}
                disabled={deleteFaq.isPending}
              >
                {deleteFaq.isPending ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}

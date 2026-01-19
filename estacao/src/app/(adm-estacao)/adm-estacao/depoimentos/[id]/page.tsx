"use client";
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAdmReviews } from "@/hooks/admin/useReviews";
import toast from 'react-hot-toast'; 

function Input({ label, value, onChange, disabled, type = "text" }: {
  label: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-800 mb-2">{label}</label>
      <input
        type={type}
        className="border border-blue-200 rounded-lg px-4 py-2 w-full bg-white shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-150 disabled:bg-gray-100 text-gray-800"
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, disabled }: {
  label: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-800 mb-2">{label}</label>
      <textarea
        className="border border-blue-200 rounded-lg px-4 py-2 w-full bg-white shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-150 disabled:bg-gray-100 text-gray-800"
        value={value}
        onChange={onChange}
        disabled={disabled}
        rows={4}
      />
    </div>
  );
}

function Star({ filled }: { filled: boolean }) {
  return filled ? (
    <svg className="w-5 h-5 text-yellow-400 inline" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
    </svg>
  ) : (
    <svg className="w-5 h-5 text-gray-300 inline" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
    </svg>
  );
}


export default function DepoimentoDetalhePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  const editMode = searchParams?.get("edit") === "1";
  const { reviews, isLoading, updateReview } = useAdmReviews();

  // Busca o review específico da lista em cache pelo ID exato
  const review = reviews.find(r => r.Id === id);

  // Log para debug (pode remover depois)
  useEffect(() => {
    if (review) {
      console.log('Review encontrada:', { id: review.Id, paciente: review.User?.Nome });
    } else if (!isLoading) {
      console.log('Review não encontrada para o ID:', id);
    }
  }, [review, id, isLoading]);

  const [comentarioEdit, setComentarioEdit] = useState("");
  const [tituloEdit, setTituloEdit] = useState("");
  const [statusEdit, setStatusEdit] = useState("");
  const [ratingEdit, setRatingEdit] = useState(0);
  const [showHome, setShowHome] = useState(false);
  const [showPsico, setShowPsico] = useState(false);

  // Atualiza os campos de edição quando o review é carregado
  useEffect(() => {
    if (review) {
      setTituloEdit(review.Titulo ?? "");
      setComentarioEdit(review.Comentario ?? "");
      setStatusEdit(review.Status ?? "");
      setRatingEdit(review.Rating ?? 0);
      setShowHome(review.MostrarNaHome ?? false);
      setShowPsico(review.MostrarNaPsicologo ?? false);
    }
  }, [review]);

  if (isLoading) {
    return <div className="p-6 font-fira-sans">Carregando depoimento...</div>;
  }

  if (!review) {
    return (
      <div className="p-6 font-fira-sans">
        <p className="text-red-500">Depoimento não encontrado.</p>
        <Link href="/adm-estacao/depoimentos" className="text-blue-600 hover:underline mt-4 inline-block">
          Voltar para lista de depoimentos
        </Link>
      </div>
    );
  }

  return (
    <motion.main
      className="w-full p-2 md:p-6 font-fira-sans"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Breadcrumbs */}
      <nav className="text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
        <ol className="list-reset flex">
          <li>
            <Link href="/adm-estacao/depoimentos" className="text-blue-600 hover:underline cursor-pointer">
              Depoimentos
            </Link>
          </li>
          <li>
            <span className="mx-2">/</span>
          </li>
          <li className="text-gray-800 font-medium">{review.User?.Nome ?? "-"}</li>
        </ol>
      </nav>

      <h1 className="text-2xl font-bold mb-4 text-[#8494E9] text-left">Detalhes do Depoimento</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Dados do Paciente/Profissional */}
        <div className="bg-gray-50 rounded-xl shadow-lg p-6 border border-blue-200 w-full">
          <Input label="Nome do Paciente" value={review.User?.Nome ?? "-"} disabled />
          <Input label="E-mail do Paciente" value={review.User?.Email ?? "-"} disabled />
          <Input label="Nome do Profissional" value={review.Psicologo?.Nome ?? "-"} disabled />
          <Input label="Data de Publicação" value={review.CreatedAt ? new Date(review.CreatedAt).toLocaleDateString("pt-BR") : "-"} disabled />
          <div className="mb-4">
            <label className="text-sm font-semibold text-gray-800 mb-2 block">Avaliação (Estrelas)</label>
            {editMode ? (
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingEdit(star)}
                    className="focus:outline-none"
                  >
                    <Star filled={star <= ratingEdit} />
                  </button>
                ))}
                <span className="text-sm text-gray-600 ml-2">({ratingEdit})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i}>
                    <Star filled={i < (review.Rating ?? 0)} />
                  </span>
                ))}
                <span className="text-sm text-gray-600 ml-1">({review.Rating ?? 0})</span>
              </div>
            )}
          </div>
        </div>
        {/* Card Comentário e Status */}
        <div className="bg-gray-50 rounded-xl shadow-lg p-6 border border-blue-200 w-full">
          <Input
            label="Título"
            value={editMode ? tituloEdit : (review.Titulo ?? "")}
            onChange={editMode ? (e) => setTituloEdit(e.target.value) : undefined}
            disabled={!editMode}
          />
          <TextArea
            label="Comentário"
            value={editMode ? comentarioEdit : (review.Comentario ?? "")}
            onChange={editMode ? (e) => setComentarioEdit(e.target.value) : undefined}
            disabled={!editMode}
          />
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-2">Status</label>
            {editMode ? (
              <select
                className="border border-blue-200 rounded-lg px-4 py-2 w-full bg-white shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-150 text-gray-800"
                value={statusEdit}
                onChange={e => setStatusEdit(e.target.value)}
              >
                <option value="Aprovado">Aprovado</option>
                <option value="Pendente">Pendente</option>
                <option value="Removido">Removido</option>
                <option value="Reprovado">Reprovado</option>
              </select>
            ) : (
              <span className={`px-4 py-2 rounded font-semibold text-white
                ${review.Status === "Aprovado" ? "bg-green-600" : review.Status === "Pendente" ? "bg-yellow-500" : "bg-gray-400"}
              `}>
                {review.Status}
              </span>
            )}
          </div>
          {/* Campos Mostrar na Home e na Página do Psicólogo */}
          <div className="mb-4 flex flex-row gap-8 items-center">
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <input
                    type="checkbox"
                    checked={showHome}
                    onChange={e => setShowHome(e.target.checked)}
                    className="w-5 h-5 rounded bg-white border border-blue-200 focus:ring-2 focus:ring-blue-200 transition-all"
                    style={{
                      accentColor: "#8494E9",
                      backgroundColor: "#fff"
                    }}
                  />
                  <label className="text-sm font-semibold text-gray-800 mb-0 text-left">Mostrar na Home</label>
                </>
              ) : (
                <>
                  <span className="px-3 py-1 rounded bg-blue-100 text-blue-700 font-semibold">{showHome ? "Sim" : "Não"}</span>
                  <label className="text-sm font-semibold text-gray-800 mb-0 text-left">Mostrar na Home</label>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <input
                    type="checkbox"
                    checked={showPsico}
                    onChange={e => setShowPsico(e.target.checked)}
                    className="w-5 h-5 rounded bg-white border border-blue-200 focus:ring-2 focus:ring-blue-200 transition-all"
                    style={{
                      accentColor: "#8494E9",
                      backgroundColor: "#fff"
                    }}
                  />
                  <label className="text-sm font-semibold text-gray-800 mb-0 text-left">Mostrar na página do Psicólogo</label>
                </>
              ) : (
                <>
                  <span className="px-3 py-1 rounded bg-blue-100 text-blue-700 font-semibold">{showPsico ? "Sim" : "Não"}</span>
                  <label className="text-sm font-semibold text-gray-800 mb-0 text-left">Mostrar na página do Psicólogo</label>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Botões */}
      <div className="mt-6 flex flex-col md:flex-row justify-end gap-4">
        {editMode ? (
          <>
            <button
              className="w-full md:w-[180px] h-12 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center gap-3 px-6 text-gray-700 text-[16px] font-normal leading-6 cursor-pointer"
              style={{
                fontFamily: "var(--font-fira-sans), system-ui, sans-serif",
                fontStyle: "normal",
                letterSpacing: "0%",
                verticalAlign: "middle",
              }}
              onClick={() => router.push("/adm-estacao/depoimentos")}
            >
              Cancelar
            </button>
            <button
              className="w-full md:w-[300px] h-12 rounded-lg bg-[#8494E9] hover:bg-[#6c7ad1] transition-colors flex items-center justify-center gap-3 px-6 text-white text-[18px] font-normal leading-6 cursor-pointer"
              style={{
                fontFamily: "var(--font-fira-sans), system-ui, sans-serif",
                fontStyle: "normal",
                letterSpacing: "0%",
                verticalAlign: "middle",
              }}
              onClick={async () => {
                await updateReview(id, {
                  Id: id,
                  Rating: ratingEdit,
                  Titulo: tituloEdit,
                  Comentario: comentarioEdit,
                  Status: statusEdit,
                  MostrarNaHome: showHome,
                  MostrarNaPsicologo: showPsico,
                });
                toast.success("Atualizado com sucesso!");
                router.push(`/adm-estacao/depoimentos/${id}`);
              }}
            >
              Salvar edição
            </button>
          </>
        ) : (
          <button
            className="w-full md:w-[300px] h-12 rounded-lg bg-[#8494E9] hover:bg-[#6c7ad1] transition-colors flex items-center justify-center gap-3 px-6 text-white text-[18px] font-normal leading-6 cursor-pointer"
            style={{
              fontFamily: "Fira Sans, sans-serif",
              fontStyle: "normal",
              letterSpacing: "0%",
              verticalAlign: "middle",
            }}
            onClick={() => router.push(`/adm-estacao/depoimentos/${id}?edit=1`)}
          >
            Editar
          </button>
        )}
      </div>
    </motion.main>
  );
}
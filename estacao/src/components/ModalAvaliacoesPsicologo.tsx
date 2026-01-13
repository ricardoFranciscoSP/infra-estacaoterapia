"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { reviewService } from "@/services/reviewService";
import { useUserBasic } from "@/hooks/user/userHook";
import Image from "next/image";

interface Review {
  Id: string;
  Rating: number;
  Comment?: string;
  Comentario?: string; // Pode vir como Comentario também
  UserId?: string;
  User?: {
    Nome?: string;
    Images?: Array<{ Url?: string }>;
  };
  CreatedAt?: string;
}

interface ModalAvaliacoesPsicologoProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalAvaliacoesPsicologo({ isOpen, onClose }: ModalAvaliacoesPsicologoProps) {
  useEscapeKey(isOpen, onClose);
  const { user } = useUserBasic();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const fetchReviews = useCallback(async () => {
    if (!user?.Id) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await reviewService.getReviewsByPsicologoId(user.Id);
      const reviewsData = response.data?.reviews || response.data || [];
      const todasReviews = Array.isArray(reviewsData) ? reviewsData : [];
      
      // Aplica paginação no frontend
      const inicio = (page - 1) * pageSize;
      const fim = inicio + pageSize;
      const reviewsPaginadas = todasReviews.slice(inicio, fim);
      
      setReviews(reviewsPaginadas);
      setTotalReviews(todasReviews.length);
      setTotalPages(Math.max(1, Math.ceil(todasReviews.length / pageSize)));
    } catch (err) {
      console.error("Erro ao buscar avaliações:", err);
      setError("Erro ao carregar avaliações");
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.Id, page]);

  useEffect(() => {
    if (isOpen && user?.Id) {
      setPage(1);
      fetchReviews();
    }
  }, [isOpen, user?.Id, fetchReviews]);

  useEffect(() => {
    if (isOpen && user?.Id) {
      fetchReviews();
    }
  }, [page, isOpen, user?.Id, fetchReviews]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-lg ${
          i < rating ? "text-yellow-500" : "text-gray-300"
        }`}
      >
        ★
      </span>
    ));
  };

  const getAvatarUrl = (user?: Review["User"]) => {
    if (user?.Images?.[0]?.Url) {
      return user.Images[0].Url;
    }
    return "/assets/default-avatar.png";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Desktop Modal */}
          <motion.div
            className="hidden lg:flex fixed inset-0 z-50 items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-transparent"
              onClick={onClose}
            />
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative z-10"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Header */}
              <div className="flex items-center px-6 py-4 border-b border-[#E3E4F3] rounded-t-2xl bg-[#232A5C] relative">
                <div className="flex-1 flex justify-center">
                  <h2 className="text-lg font-bold text-white">Suas avaliações</h2>
                </div>
                <button
                  onClick={onClose}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-white text-2xl px-2 py-1 rounded hover:bg-[#6D75C0] transition"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Paginação Superior */}
                {totalPages > 1 && (
                  <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Total: <span className="font-semibold">{totalReviews}</span> avaliações
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1 || isLoading}
                          className="px-3 py-1.5 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                        >
                          Anterior
                        </button>
                        <span className="text-sm text-gray-600 min-w-[100px] text-center">
                          Página {page} de {totalPages}
                        </span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages || isLoading}
                          className="px-3 py-1.5 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lista de Avaliações */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#232A5C]"></div>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12 text-red-500">{error}</div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-lg">
                        Você ainda não recebeu avaliações.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => {
                        const comentario = review.Comment || review.Comentario || '';
                        return (
                          <div
                            key={review.Id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0">
                                <Image
                                  src={getAvatarUrl(review.User)}
                                  alt={review.User?.Nome || "Usuário"}
                                  width={48}
                                  height={48}
                                  className="rounded-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      {review.User?.Nome || "Anônimo"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatDate(review.CreatedAt)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {renderStars(review.Rating)}
                                  </div>
                                </div>
                                {comentario && (
                                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                      {comentario}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Paginação Inferior */}
                {totalPages > 1 && (
                  <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, totalReviews)} de {totalReviews} avaliações
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-4 py-2 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition font-medium"
                        >
                          Anterior
                        </button>
                        <span className="text-sm text-gray-600 min-w-[100px] text-center">
                          Página {page} de {totalPages}
                        </span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-4 py-2 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition font-medium"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Mobile Modal */}
          <motion.div
            className="lg:hidden fixed inset-0 z-50 flex flex-col bg-white"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Header Mobile */}
            <div className="relative flex flex-col items-center p-4 border-b border-[#E3E4F3] bg-[#232A5C]">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-xl font-bold text-white hover:text-gray-200 transition"
                aria-label="Fechar"
              >
                ×
              </button>
              <h2 className="text-base font-semibold text-white mb-2 text-center">
                Suas avaliações
              </h2>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Paginação Superior Mobile */}
              {totalPages > 1 && (
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      Página {page} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                        className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || isLoading}
                        className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de Avaliações Mobile */}
              <div className="flex-1 p-4 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#232A5C]"></div>
                  </div>
                ) : error ? (
                  <div className="text-center py-12 text-red-500">{error}</div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">
                      Você ainda não recebeu avaliações.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => {
                      const comentario = review.Comment || review.Comentario || '';
                      return (
                        <div
                          key={review.Id}
                          className="border border-gray-200 rounded-lg p-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <Image
                                src={getAvatarUrl(review.User)}
                                alt={review.User?.Nome || "Usuário"}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-semibold text-sm text-gray-900">
                                    {review.User?.Nome || "Anônimo"}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(review.CreatedAt)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  {renderStars(review.Rating)}
                                </div>
                              </div>
                              {comentario && (
                                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                  <p className="text-xs text-gray-700 whitespace-pre-wrap">
                                    {comentario}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Paginação Inferior Mobile */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-xs rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 font-medium"
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-gray-600">
                      {page}/{totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 text-xs rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 font-medium"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


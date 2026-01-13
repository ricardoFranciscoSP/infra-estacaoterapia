"use client";
import React, { useState } from "react";
import { useCreateReview } from "@/hooks/reviewHook";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useQueryClient } from '@tanstack/react-query';

type ModalAvaliacoesProps = {
  onClose: () => void;
  onSuccess?: () => void;
  onCancel?: () => void;
  psicologoId: string;
  consultationId?: string;
  required?: boolean; // Se true, não permite fechar sem avaliar
};



export default function ModalAvaliacoes({ onClose, onSuccess, onCancel, psicologoId, consultationId, required = false }: ModalAvaliacoesProps) {
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const { mutate, isPending } = useCreateReview();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (rating === 0 || comment.trim() === "") {
      setShowWarning(true);
      return;
    }
    
    mutate(
      { psicologoId, rating, comment },
      {
        onSuccess: async () => {
          // NOTA: A consulta já foi finalizada ANTES de abrir este modal (no handleConfirmExit ou beforeunload)
          // A finalização já atualizou:
          // - Consulta.Status -> "Realizada"
          // - Agenda.Status -> "Concluido"
          // - ReservaSessao.Status -> "Concluido"
          // - Processou o repasse usando percentualRepasseJuridico ou percentualRepasseAutonomo da tabela Configuracao
          // - Limpou tokens do Agora
          
          // Apenas invalida queries para atualizar o painel com o status correto
          if (consultationId) {
            try {
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] }),
                queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] }),
                queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] }),
                queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] }),
              ]);
              
              // Força refetch imediato
              await queryClient.refetchQueries({ queryKey: ['consultaAtualEmAndamento'] });
              console.log("✅ [ModalAvaliacoes] Queries invalidadas após envio de avaliação");
            } catch (error) {
              console.error("❌ [ModalAvaliacoes] Erro ao invalidar queries:", error);
              // Não bloqueia o fluxo se houver erro
            }
          }
          
          toast.success("Avaliação enviada com sucesso! Obrigado por compartilhar sua experiência.");
          onClose();
          
          // Chama callback de sucesso se fornecido
          if (onSuccess) {
            onSuccess();
          } else {
            // Fallback: redireciona após delay
            setTimeout(() => {
              router.push("/painel");
            }, 600);
          }
        },
        onError: () => {
          toast.error("Não foi possível enviar sua avaliação. Tente novamente.");
        },
      }
    );
  };

  const handleClose = () => {
    // Se for obrigatório, não permite fechar sem avaliar
    if (required) {
      if (rating === 0 || comment.trim() === "") {
        // Se não preencheu nada, mostra aviso mas não permite fechar
        setShowWarning(true);
        return;
      }
      // Se preencheu mas não enviou, pergunta se quer sair sem enviar
      const confirmClose = window.confirm(
        "Você precisa avaliar o psicólogo antes de sair. Deseja realmente sair sem enviar a avaliação?"
      );
      if (!confirmClose) return;
    } else {
      // Se não for obrigatório, permite fechar normalmente
      if (rating > 0 || comment.trim() !== "") {
        const confirmClose = window.confirm(
          "Você tem uma avaliação preenchida. Deseja realmente sair sem enviar?"
        );
        if (!confirmClose) return;
      }
    }
    
    onClose();
    
    // Chama callback de cancelamento se fornecido
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-transparent z-50">
      <div
        className="bg-white rounded-lg shadow-lg flex flex-col"
        style={{ width: 500, height: 340, borderRadius: 8, opacity: 1 }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6"
          style={{ width: '100%', height: 50, borderTopLeftRadius: 8, borderTopRightRadius: 8, background: '#8494E9', opacity: 1 }}
        >
          <h2
            className="flex-1 text-center text-white font-[Fira Sans] font-medium text-[16px] leading-6"
            style={{ fontFamily: 'var(--font-fira-sans), system-ui, sans-serif', fontWeight: 500, fontSize: 16, lineHeight: '24px', letterSpacing: 0 }}
          >
            Avalie seu psicólogo
          </h2>
          {!required && (
            <button
              onClick={handleClose}
              className="ml-2 text-white hover:text-gray-200 text-xl font-bold"
              aria-label="Fechar modal"
              style={{ verticalAlign: 'middle' }}
            >
              ×
            </button>
          )}
        </div>
        {/* Conteúdo */}
        <div className="flex-1 flex flex-col px-6 pt-4 pb-3 overflow-y-auto">
          <label className="text-gray-700 font-medium mb-2 text-sm" htmlFor="comment">Comentário</label>
          <textarea
            id="comment"
            className="w-full border border-gray-300 rounded p-2 mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#8494E9] text-sm"
            placeholder="Deixe um comentário"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            style={{ fontFamily: 'var(--font-fira-sans), system-ui, sans-serif' }}
            maxLength={200}
          />
          <div className="text-xs text-gray-500 text-right -mt-2 mb-3">{comment.length}/200</div>
          {showWarning && (rating === 0 || comment.trim() === "") && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              Por favor, preencha o comentário e selecione uma avaliação antes de enviar.
            </div>
          )}
          <label className="text-gray-700 font-medium mb-2 text-sm" htmlFor="rating">
            Avaliação {rating > 0 && <span className="text-gray-500">({rating})</span>}
          </label>
          <div className="flex items-center gap-2 mb-3" id="rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`Avaliar com ${star} estrela${star > 1 ? 's' : ''}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill={(hoverRating || rating) >= star ? '#FFD700' : '#E5E7EB'}
                  className="w-6 h-6 transition-colors"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.966a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.921-.755 1.688-1.54 1.118l-3.38-2.455a1 1 0 00-1.175 0l-3.38 2.455c-.784.57-1.838-.197-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.049 9.393c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.966z" />
                </svg>
              </button>
            ))}
          </div>
        </div>
        {/* Botões */}
        <div className="flex w-full px-6 pb-4 gap-3">
          {!required && (
            <button
              className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded font-medium text-sm hover:bg-gray-300 transition-colors"
              onClick={handleClose}
              style={{ borderRadius: 8 }}
            >
              Cancelar
            </button>
          )}
          <button
            className={`${required ? 'w-full' : 'flex-1'} bg-[#8494E9] text-white px-3 py-2 rounded font-medium text-sm hover:bg-[#6c7dc7] transition-colors disabled:opacity-60 disabled:cursor-not-allowed`}
            onClick={handleSubmit}
            disabled={rating === 0 || comment.trim() === "" || isPending}
            style={{ borderRadius: 8 }}
            aria-busy={isPending}
          >
            {isPending ? "Enviando..." : "Enviar Avaliação"}
          </button>
        </div>
      </div>
    </div>
  );
}

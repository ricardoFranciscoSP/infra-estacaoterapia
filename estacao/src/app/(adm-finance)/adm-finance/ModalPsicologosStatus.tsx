"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Psicologo, PagamentoStatus } from "./types";
import { STATUS_CONFIG, PAGINATION_ITEMS_PER_PAGE, COLORS } from "./types";
import { getInitials, formatCurrency } from "./utils";

interface ModalPsicologosStatusProps {
  open: boolean;
  onClose: () => void;
  status: PagamentoStatus;
  psicologos?: Psicologo[];
}

/**
 * Gera dados mockados de psicólogos
 */
const getMockPsicologos = (): Psicologo[] => {
  const tipos: ("Autônomo" | "Pessoa Jurídica")[] = ["Autônomo", "Pessoa Jurídica"];
  return [
    {
      id: "1",
      nome: "Emanuel Ricardo da Silva",
      crp: "CRP 12/34567",
      dataCadastro: "05/12/2025",
      valor: 1250.0,
      consultas: 15,
      tipo: tipos[0],
    },
    {
      id: "2",
      nome: "Lorena Allana Ribeiro",
      crp: "CRP 12/34568",
      dataCadastro: "04/12/2025",
      valor: 890.5,
      consultas: 12,
      tipo: tipos[1],
    },
    {
      id: "3",
      nome: "Kamilly Aparecida Sophia Lima",
      crp: "CRP 12/34569",
      dataCadastro: "03/12/2025",
      valor: 2100.0,
      consultas: 21,
      tipo: tipos[0],
    },
    {
      id: "4",
      nome: "Roberto Elias Junior",
      crp: "CRP 12/34570",
      dataCadastro: "02/12/2025",
      valor: 750.0,
      consultas: 8,
      tipo: tipos[1],
    },
    {
      id: "5",
      nome: "Analu Renata Carolina Rezende",
      crp: "CRP 12/34571",
      dataCadastro: "01/12/2025",
      valor: 1650.75,
      consultas: 18,
      tipo: tipos[0],
    },
  ];
};

const PaginationButton: React.FC<{
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}> = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      disabled
        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
        : `bg-[${COLORS.primary}] text-white hover:bg-[#6D75C0]`
    }`}
  >
    {children}
  </button>
);

const PageButton: React.FC<{
  pageNumber: number;
  isActive: boolean;
  onClick: () => void;
}> = ({ pageNumber, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? `bg-[${COLORS.primary}] text-white`
        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`}
  >
    {pageNumber}
  </button>
);

interface PsicologoRowProps {
  psicologo: Psicologo;
  index: number;
  badgeBg: string;
  badgeText: string;
  status: PagamentoStatus;
}

const PsicologoRow: React.FC<PsicologoRowProps> = ({ psicologo, index, badgeBg, badgeText, status }) => (
  <motion.tr
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: index * 0.01 }}
    className="hover:bg-gray-50/50 transition-colors"
  >
    <td className="py-3 px-4">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-full bg-[${COLORS.primary}]/8 flex items-center justify-center text-[${COLORS.primary}] font-medium text-xs flex-shrink-0`}>
          {getInitials(psicologo.nome)}
        </div>
        <span className="text-sm font-normal text-gray-700">{psicologo.nome}</span>
      </div>
    </td>
    <td className="py-3 px-4 text-xs text-gray-500 font-mono">{psicologo.crp}</td>
    <td className="py-3 px-4">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-normal ${
          psicologo.tipo === "Autônomo" ? `bg-[${COLORS.primary}]/8 text-[${COLORS.primary}]` : "bg-amber-50 text-amber-600"
        }`}
      >
        {psicologo.tipo}
      </span>
    </td>
    <td className="py-3 px-4 text-xs text-gray-500">{psicologo.dataCadastro}</td>
    <td className="py-3 px-4">
      <span className="text-sm font-medium text-gray-900">{formatCurrency(psicologo.valor)}</span>
    </td>
    <td className="py-3 px-4 text-xs text-gray-500">{psicologo.consultas}</td>
    <td className="py-3 px-4">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-normal ${badgeBg} ${badgeText}`}>
        {status}
      </span>
    </td>
    <td className="py-3 px-4">
      <div className="flex items-center justify-center gap-1.5">
        <button
          onClick={() => {
            window.location.href = `/adm-finance/psicologos/${psicologo.id}`;
          }}
          className={`p-1.5 text-[${COLORS.primary}] hover:bg-[${COLORS.primary}]/10 rounded-md transition-all hover:scale-110`}
          title="Visualizar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button
          onClick={() => {
            window.location.href = `/adm-finance/psicologos/${psicologo.id}?edit=1`;
          }}
          className={`p-1.5 text-[${COLORS.primary}] hover:bg-[${COLORS.primary}]/10 rounded-md transition-all hover:scale-110`}
          title="Editar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </td>
  </motion.tr>
);

export const ModalPsicologosStatus: React.FC<ModalPsicologosStatusProps> = ({
  open,
  onClose,
  status,
  psicologos,
}) => {
  const [pagina, setPagina] = useState(1);

  const dados = psicologos || getMockPsicologos();
  const config = STATUS_CONFIG[status];

  const totalPaginas = Math.ceil(dados.length / PAGINATION_ITEMS_PER_PAGE);

  const dadosPaginados = useMemo((): Psicologo[] => {
    const inicio = (pagina - 1) * PAGINATION_ITEMS_PER_PAGE;
    const fim = inicio + PAGINATION_ITEMS_PER_PAGE;
    return dados.slice(inicio, fim);
  }, [dados, pagina]);

  React.useEffect(() => {
    if (open) {
      setPagina(1);
    }
  }, [open]);

  const handlePrevious = useCallback((): void => {
    setPagina((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNext = useCallback((): void => {
    setPagina((prev) => Math.min(totalPaginas, prev + 1));
  }, [totalPaginas]);

  const handlePageClick = useCallback((pageNumber: number): void => {
    setPagina(pageNumber);
  }, []);

  const renderPaginationButtons = (): React.ReactNode[] => {
    const buttons: React.ReactNode[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, pagina - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPaginas, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      buttons.push(
        <PageButton key={1} pageNumber={1} isActive={pagina === 1} onClick={() => handlePageClick(1)} />
      );
      if (startPage > 2) {
        buttons.push(
          <span key="ellipsis1" className="px-2">
            ...
          </span>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <PageButton
          key={i}
          pageNumber={i}
          isActive={pagina === i}
          onClick={() => handlePageClick(i)}
        />
      );
    }

    if (endPage < totalPaginas) {
      if (endPage < totalPaginas - 1) {
        buttons.push(
          <span key="ellipsis2" className="px-2">
            ...
          </span>
        );
      }
      buttons.push(
        <PageButton
          key={totalPaginas}
          pageNumber={totalPaginas}
          isActive={pagina === totalPaginas}
          onClick={() => handlePageClick(totalPaginas)}
        />
      );
    }

    return buttons;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[65vh] flex flex-col relative"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl bg-[#8494E9]">
                <h2 className="text-xl font-bold text-white">{config.title}</h2>
                <button
                  onClick={onClose}
                  className="text-white text-2xl font-bold hover:opacity-80 transition-opacity px-2 py-1 rounded"
                  aria-label="Fechar modal"
                >
                  ×
                </button>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                {/* Paginação Superior */}
                {totalPaginas > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 pb-4 border-b border-[#E5E9FA]">
                    <div className="text-sm text-gray-600">
                      Mostrando {(pagina - 1) * PAGINATION_ITEMS_PER_PAGE + 1} a{" "}
                      {Math.min(pagina * PAGINATION_ITEMS_PER_PAGE, dados.length)} de {dados.length} psicólogos
                    </div>
                    <div className="flex items-center gap-2">
                      <PaginationButton onClick={handlePrevious} disabled={pagina === 1}>
                        Anterior
                      </PaginationButton>
                      <div className="flex items-center gap-1 overflow-x-auto max-w-[300px]">
                        {renderPaginationButtons()}
                      </div>
                      <PaginationButton onClick={handleNext} disabled={pagina === totalPaginas}>
                        Próxima
                      </PaginationButton>
                    </div>
                  </div>
                )}

                {/* Tabela com scroll */}
                <div className="flex-1 overflow-y-auto overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white sticky top-0 border-b border-gray-100">
                      <tr>
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          CRP
                        </th>
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Consultas
                        </th>
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="py-2.5 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {dadosPaginados.map((psicologo, index) => (
                        <PsicologoRow
                          key={psicologo.id}
                          psicologo={psicologo}
                          index={index}
                          badgeBg={config.badgeBg}
                          badgeText={config.badgeText}
                          status={status}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginação Inferior */}
                {totalPaginas > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-[#E5E9FA]">
                    <div className="text-sm text-gray-600">
                      Mostrando {(pagina - 1) * PAGINATION_ITEMS_PER_PAGE + 1} a{" "}
                      {Math.min(pagina * PAGINATION_ITEMS_PER_PAGE, dados.length)} de {dados.length} psicólogos
                    </div>
                    <div className="flex items-center gap-2">
                      <PaginationButton onClick={handlePrevious} disabled={pagina === 1}>
                        Anterior
                      </PaginationButton>
                      <div className="flex items-center gap-1 overflow-x-auto max-w-[300px]">
                        {renderPaginationButtons()}
                      </div>
                      <PaginationButton onClick={handleNext} disabled={pagina === totalPaginas}>
                        Próxima
                      </PaginationButton>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

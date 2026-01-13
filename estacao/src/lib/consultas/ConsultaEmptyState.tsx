'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
// Ícones SVG inline para evitar problemas de importação com Turbopack
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

interface ConsultaEmptyStateProps {
  titulo?: string;
  descricao?: string;
  ctaText?: string;
  ctaHref?: string;
}

export function ConsultaEmptyState({
  titulo = 'Você não tem consultas agendadas hoje',
  descricao = 'Agende uma consulta com um de nossos psicólogos para começar seu acompanhamento.',
  ctaText = 'Agendar consulta',
  ctaHref = '/painel/psicologos',
}: ConsultaEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="
        w-full max-w-full sm:max-w-[588px] rounded-2xl border-2 border-dashed border-gray-300 
        bg-gradient-to-br from-gray-50 to-white p-12
        flex flex-col items-center justify-center text-center
        min-h-[300px]
      "
    >
      {/* Ícone */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="
          w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100
          flex items-center justify-center mb-6
          shadow-lg
        "
      >
        <CalendarIcon className="w-12 h-12 text-indigo-600" />
      </motion.div>

      {/* Título */}
      <motion.h3
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-gray-900 mb-3"
      >
        {titulo}
      </motion.h3>

      {/* Descrição */}
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-gray-600 mb-8 max-w-md"
      >
        {descricao}
      </motion.p>

      {/* CTA Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Link
          href={ctaHref}
          className="
            inline-flex items-center gap-3 px-8 py-4 
            bg-gradient-to-r from-indigo-600 to-purple-600 
            text-white font-semibold rounded-xl 
            shadow-lg hover:shadow-xl 
            transform hover:scale-105 
            transition-all duration-300
            hover:from-indigo-700 hover:to-purple-700
          "
        >
          <PlusIcon className="w-5 h-5" />
          {ctaText}
        </Link>
      </motion.div>

      {/* Decoração */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-purple-200 rounded-full opacity-20 blur-3xl" />
      </div>
    </motion.div>
  );
}

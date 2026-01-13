'use client';
 
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { faqService } from '@/services/faqService';
import { FAQ } from '@/types/faq.types';

export const FAQPAGE: React.FC = () => {
  const [tab, setTab] = useState<'paciente' | 'psicologo'>('paciente');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const tipo = tab === 'paciente' ? 'Paciente' : 'Psicologo';
        const data = await faqService.getFaqsPublic(tipo);
        setFaqs(data || []);
      } catch (err: unknown) {
        console.error('Erro ao buscar FAQs:', err);
        const errorMessage = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error || (err as { message?: string }).message || 'Erro ao carregar perguntas frequentes. Verifique sua conexão e tente novamente.'
          : err instanceof Error
          ? err.message
          : 'Erro ao carregar perguntas frequentes. Verifique sua conexão e tente novamente.';
        setError(errorMessage);
        setFaqs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFaqs();
  }, [tab]);

return (
  <div className="w-full flex flex-col items-center mt-12 mb-20 px-2">
    <div className="w-full max-w-[1650px] mx-auto flex flex-col gap-8 px-4 xl:px-32 2xl:px-64">
      {/* Header + Tabs */}
      <div className="w-full flex flex-col md:flex-row md:justify-between md:items-start mb-2">
        {/* Mobile: Título centralizado, Subtítulo abaixo, Tabs abaixo */}
        <div className="flex flex-col items-center md:items-start w-full md:w-auto">
          <h1 className="fira-sans font-semibold text-[32px] md:text-[40px] leading-[40px] md:leading-[64px] text-[#26220D] mb-2 text-center md:text-left" style={{letterSpacing:0, verticalAlign:'middle'}}>
            Perguntas frequentes
          </h1>
          <div className="fira-sans font-normal text-[14px] md:text-[16px] leading-[20px] md:leading-[24px] text-[#49525A] mt-2 text-center md:text-left max-w-full md:max-w-2xl" style={{letterSpacing:0, verticalAlign:'middle'}}>
            Aqui estão de forma resumida as principais dúvidas e respostas com base em regras operacionais, contratos e processos da plataforma. Ela serve como complemento, mas não substitui os Termos e Contratos aceitos no momento da contratação.
          </div>
        </div>
        {/* Tabs: Mobile lado a lado abaixo do subtítulo, Desktop à direita */}
        <div className="flex mt-6 md:mt-8 w-full md:w-auto justify-center md:justify-end">
          <div className="flex" style={{ width: '100%', maxWidth: '588px', height: 60 }}>
            <button
              className={`flex-1 md:w-[294px] h-[60px] p-4 text-base font-medium transition-colors border-b-[1.5px] ${
                tab === 'paciente'
                  ? 'bg-[#E5E9FA] border-[#8494E9] border-b-[1.5px] text-[#23253a]'
                  : 'bg-transparent border-b-[1.5px] border-[#E5E9FA] text-[#8494E9]'
              }`}
              style={{ borderRadius: '12px 0 0 12px', marginRight: 0 }}
              onClick={() => setTab('paciente')}
            >
              Paciente
            </button>
            <button
              className={`flex-1 md:w-[294px] h-[60px] p-4 text-base font-medium transition-colors border-b-[1.5px] ${
                tab === 'psicologo'
                  ? 'bg-[#E5E9FA] border-[#8494E9] border-b-[1.5px] text-[#23253a]'
                  : 'bg-transparent border-b-[1.5px] border-[#E5E9FA] text-[#8494E9]'
              }`}
              style={{ borderRadius: '0 12px 12px 0', marginLeft: 0 }}
              onClick={() => setTab('psicologo')}
            >
              Psicólogo(a)
            </button>
          </div>
        </div>
      </div>
      {/* Accordions */}
      <div className="w-full flex flex-col gap-3 mt-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8494E9]"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg px-5 py-4 text-red-600">
            {error}
          </div>
        ) : faqs.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 text-gray-600 text-center">
            Nenhuma pergunta frequente disponível no momento.
          </div>
        ) : (
          faqs.map((item, idx) => (
            <AccordionItem 
              key={item.Id} 
              question={`${idx + 1}. ${item.Pergunta}`} 
              answer={item.Resposta} 
            />
          ))
        )}
      </div>
    </div>
  </div>
    );
};

const AccordionItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-[#E3E4F3] rounded-lg px-5 py-4 cursor-pointer transition-all border border-[#8494E9]">
      <div className="flex justify-between items-center" onClick={() => setOpen(!open)}>
        <span className="text-base font-medium text-[#23253a]">{question}</span>
        <svg
          className={`w-5 h-5 text-[#8494E9] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mt-2 text-[#49525A]"
          >
            {answer}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FAQPAGE;
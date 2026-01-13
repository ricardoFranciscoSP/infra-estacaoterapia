'use client';
 
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { faqService } from '@/services/faqService';
import { FAQ } from '@/types/faq.types';

export const FAQPsicologo: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await faqService.getFaqsPublic('Psicologo');
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
  }, []);

  return (
    <div className="w-full flex flex-col items-center mt-8 mb-20 px-2">
      <div className="w-full max-w-[1200px] mx-auto flex flex-col gap-8 px-4 xl:px-8">
        {/* Header */}
        <div className="w-full flex flex-col">
          <h1 className="fira-sans font-semibold text-[32px] sm:text-[40px] leading-[48px] sm:leading-[64px] text-[#26220D] mb-2" style={{letterSpacing:0, verticalAlign:'middle'}}>
            Perguntas<br />frequentes
          </h1>
          <div className="fira-sans font-normal text-[14px] sm:text-[16px] leading-[20px] sm:leading-[24px] text-[#49525A] mt-2 whitespace-pre-line" style={{letterSpacing:0, verticalAlign:'middle'}}>
            Aqui estão de forma resumida as principais dúvidas e respostas <br className="hidden sm:block" />com base em regras operacionais, contratos e processos<br className="hidden sm:block" /> da plataforma.
            Ela serve como complemento, mas não substitui os <br className="hidden sm:block" />Termos e Contratos aceitos no momento da contratação
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
        <span className="text-base font-medium text-[#23253a] pr-4">{question}</span>
        <svg
          className={`w-5 h-5 text-[#8494E9] transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
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

export default FAQPsicologo;


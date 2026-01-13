'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useConfiguracaoPagamentos } from '@/hooks/configuracoesHook';
import { ConfiguracaoPagamentos } from '@/services/configuracoesService';
import toast from 'react-hot-toast';

interface ModalPagamentosProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalPagamentos({
  isOpen,
  onClose,
}: ModalPagamentosProps) {
  const { dadosPagamentos, atualizarPagamentos } = useConfiguracaoPagamentos();
  
  const [formData, setFormData] = useState<ConfiguracaoPagamentos>({
    percentualRepasseJuridico: 40,
    percentualRepasseAutonomo: 32,
    emitirNotaFiscal: false,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const onCloseRef = useRef(onClose);

  // Atualiza a referência quando onClose muda
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Carregar dados quando o modal abrir
  useEffect(() => {
    if (!isOpen) return;
    
    // Carrega dados apenas quando o modal abrir, usando valores atuais de dadosPagamentos
    if (dadosPagamentos) {
      setFormData({
        percentualRepasseJuridico: dadosPagamentos.percentualRepasseJuridico ?? 40,
        percentualRepasseAutonomo: dadosPagamentos.percentualRepasseAutonomo ?? 32,
        emitirNotaFiscal: dadosPagamentos.emitirNotaFiscal ?? false,
      });
    } else {
      // Se não houver dados, usa valores padrão
      setFormData({
        percentualRepasseJuridico: 40,
        percentualRepasseAutonomo: 32,
        emitirNotaFiscal: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Apenas isOpen como dependência - dadosPagamentos carregado apenas quando modal abre

  // Fechar com ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, isLoading]);

  const handleChange = (field: keyof ConfiguracaoPagamentos, value: string | number | boolean | null) => {
    if (!isLoading) {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setIsLoading(true);

    try {
      await atualizarPagamentos(formData);
      toast.success('Configurações de pagamentos atualizadas com sucesso!');
      onCloseRef.current();
    } catch (error) {
      console.error('Erro ao atualizar configurações de pagamentos:', error);
      toast.error('Erro ao atualizar configurações. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header com cor da plataforma */}
        <div className="bg-[#8494E9] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Editar Configurações de Pagamentos
          </h2>
          <button
            onClick={() => onCloseRef.current()}
            className="text-white hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            aria-label="Fechar modal"
            disabled={isLoading}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Percentual de Repasse para Jurídico (%)
                </label>
                <input
                  type="number"
                  value={formData.percentualRepasseJuridico || ''}
                  onChange={(e) => handleChange('percentualRepasseJuridico', e.target.value ? parseFloat(e.target.value) : null)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="40"
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Percentual de Repasse para Autônomo (%)
                </label>
                <input
                  type="number"
                  value={formData.percentualRepasseAutonomo || ''}
                  onChange={(e) => handleChange('percentualRepasseAutonomo', e.target.value ? parseFloat(e.target.value) : null)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="32"
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={isLoading}
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.emitirNotaFiscal || false}
                    onChange={(e) => handleChange('emitirNotaFiscal', e.target.checked)}
                    className="w-4 h-4 text-[#8494E9] border-gray-300 rounded focus:ring-[#8494E9] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  />
                  Emitir nota fiscal
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Footer com botões */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onCloseRef.current()}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex-1 px-4 py-2.5 text-white bg-[#8494E9] rounded-lg hover:bg-[#6D75C0] transition-colors disabled:opacity-70 disabled:cursor-not-allowed font-medium relative overflow-hidden"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="relative z-10 flex items-center justify-center">
                  <span className="mr-2">Salvando</span>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </span>
              ) : (
                'Salvar'
              )}
              {isLoading && (
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmerLoading_1.5s_infinite]"></span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


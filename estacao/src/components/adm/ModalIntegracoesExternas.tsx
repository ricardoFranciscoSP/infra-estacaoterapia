'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useConfiguracaoIntegracoes } from '@/hooks/configuracoesHook';
import { ConfiguracaoIntegracoes } from '@/services/configuracoesService';
import toast from 'react-hot-toast';

interface ModalIntegracoesExternasProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalIntegracoesExternas({
  isOpen,
  onClose,
}: ModalIntegracoesExternasProps) {
  const { dadosIntegracoes, atualizarIntegracoes } = useConfiguracaoIntegracoes();
  
  const [formData, setFormData] = useState<ConfiguracaoIntegracoes>({
    googleTagManager: '',
    googleAnalytics: '',
    googleAds: '',
    agoraAppId: '',
    agoraAppCertificate: '',
    vindiApiKey: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const onCloseRef = useRef(onClose);

  // Atualiza a referência quando onClose muda
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Carregar dados quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      if (dadosIntegracoes) {
        setFormData({
          googleTagManager: dadosIntegracoes.googleTagManager || '',
          googleAnalytics: dadosIntegracoes.googleAnalytics || '',
          googleAds: dadosIntegracoes.googleAds || '',
          agoraAppId: dadosIntegracoes.agoraAppId || '',
          agoraAppCertificate: dadosIntegracoes.agoraAppCertificate || '',
          vindiApiKey: dadosIntegracoes.vindiApiKey || '',
        });
      } else {
        // Se não houver dados, limpa o formulário
        setFormData({
          googleTagManager: '',
          googleAnalytics: '',
          googleAds: '',
          agoraAppId: '',
          agoraAppCertificate: '',
          vindiApiKey: '',
        });
      }
    }
  }, [isOpen, dadosIntegracoes]);

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

  const handleChange = (field: keyof ConfiguracaoIntegracoes, value: string) => {
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
      await atualizarIntegracoes(formData);
      toast.success('Integrações atualizadas com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar integrações:', error);
      toast.error('Erro ao atualizar integrações. Tente novamente.');
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
            Editar Integrações Externas
          </h2>
          <button
            onClick={onClose}
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
                  Google Tag Manager
                </label>
                <input
                  type="text"
                  value={formData.googleTagManager || ''}
                  onChange={(e) => handleChange('googleTagManager', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="GTM-XXXXXXX"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Analytics
                </label>
                <input
                  type="text"
                  value={formData.googleAnalytics || ''}
                  onChange={(e) => handleChange('googleAnalytics', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="G-XXXXXXXXXX"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Ads
                </label>
                <input
                  type="text"
                  value={formData.googleAds || ''}
                  onChange={(e) => handleChange('googleAds', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Google Ads ID"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agora App ID
                </label>
                <input
                  type="text"
                  value={formData.agoraAppId || ''}
                  onChange={(e) => handleChange('agoraAppId', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Agora App ID"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agora App Certificate
                </label>
                <input
                  type="text"
                  value={formData.agoraAppCertificate || ''}
                  onChange={(e) => handleChange('agoraAppCertificate', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Agora App Certificate"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vindi API Key
                </label>
                <input
                  type="text"
                  value={formData.vindiApiKey || ''}
                  onChange={(e) => handleChange('vindiApiKey', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Vindi API Key"
                  disabled={isLoading}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer com botões */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
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


"use client";
import React from 'react';
import { Metadata } from 'next';
import { getUltimoAcesso } from '@/lib/maintenance';

// Ícones SVG inline para evitar problemas de importação com Turbopack
const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" width="24" height="24">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const RefreshCwIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" width="24" height="24">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" width="24" height="24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" width="16" height="16">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MailIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" width="16" height="16">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const HeartIcon = ({ className, fill }: { className?: string; fill?: string }) => (
  <svg className={className} fill={fill || "none"} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" width="64" height="64">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export const metadata: Metadata = {
  title: 'Sistema em Manutenção | Estação Terapia',
  description: 'Estamos realizando melhorias no sistema. Em breve estaremos de volta.',
  robots: 'noindex, nofollow',
};

// Força renderização dinâmica para permitir fetch com cache: 'no-store'
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Informações da estação (do footer)
const ESTACAO_INFO = {
  id: '123456',
  cnpj: '12.345.678/0001-90',
  endereco: 'Av. Brasil, 1234 - Centro, Cidade - UF',
  telefone: '(11) 91234-5678',
  email: 'contato@estacaoterapia.com.br',
};

// Informações de suporte técnico
const SUPORTE_INFO = {
  email: 'ti_ext@estacaoterapia.com.br',
  telefone: '(11) 99769-9324'
};

export default async function MaintenancePage() {
  // Busca o último acesso do sistema
  const ultimoAcessoData = await getUltimoAcesso();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FCFBF6] via-[#F8F6F1] to-[#F3F1EC] flex items-center justify-center p-4 font-sans">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#6D75C0]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#6D75C0]/5 rounded-full blur-3xl" />
      </div>

      {/* Card principal */}
      <div className="relative w-full max-w-4xl">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden">
          {/* Header com gradiente */}
          <div className="bg-gradient-to-r from-[#6D75C0] to-[#8B92D8] p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/5" />
            <div className="relative z-10 flex items-center justify-center gap-4">
              <div className="relative">
                <HeartIcon className="w-16 h-16 text-red-300" fill="rgb(252 165 165)" />
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-8 md:p-12 space-y-8">
            {/* Título */}
            <div className="text-center space-y-3">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Sistema em Manutenção
              </h1>
              <p className="text-lg text-gray-600 max-w-md mx-auto">
                Estamos realizando melhorias para proporcionar uma experiência ainda melhor
              </p>
            </div>

            {/* Cards informativos - lado a lado */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-xl p-5 border border-blue-200/50">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <ClockIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Breve Retorno
                    </h3>
                    <p className="text-sm text-gray-600">
                      Logo estaremos de volta
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100/30 rounded-xl p-5 border border-purple-200/50">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                    <RefreshCwIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Melhorias
                    </h3>
                    <p className="text-sm text-gray-600">
                      Sistema sendo atualizado
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100/30 rounded-xl p-5 border border-green-200/50">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                    <ShieldIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Seus Dados
                    </h3>
                    <p className="text-sm text-gray-600">
                      Estão seguros
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações da Estação e Dicas de Suporte - lado a lado */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Card: Informações da Estação */}
              <div className="bg-white/60 border border-gray-200/50 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 text-lg">Informações da Estação</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600 font-medium">ID da Estação:</span>
                    <span className="text-gray-900 font-semibold">{ESTACAO_INFO.id}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600 font-medium">CNPJ:</span>
                    <span className="text-gray-900">{ESTACAO_INFO.cnpj}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600 font-medium">Endereço:</span>
                    <span className="text-gray-900 text-right">{ESTACAO_INFO.endereco}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600 font-medium">Telefone:</span>
                    <a href={`tel:${ESTACAO_INFO.telefone.replace(/\D/g, '')}`} className="text-[#6D75C0] hover:text-[#5A62A8] font-medium transition-colors">
                      {ESTACAO_INFO.telefone}
                    </a>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600 font-medium">Email:</span>
                    <a href={`mailto:${ESTACAO_INFO.email}`} className="text-[#6D75C0] hover:text-[#5A62A8] font-medium transition-colors">
                      {ESTACAO_INFO.email}
                    </a>
                  </div>
                  <div className="flex justify-between items-start pt-2 border-t border-gray-200">
                    <span className="text-gray-600 font-medium">Último Acesso:</span>
                    <span className="text-gray-900 font-semibold">
                      {ultimoAcessoData?.data || 'Sem registros'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card: Dicas e Suporte */}
              <div className="bg-white/60 border border-gray-200/50 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 text-lg">Dicas e Suporte</h2>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-[#6D75C0] font-bold mt-0.5">•</span>
                    <span className="text-gray-600">Consulte a <span className="font-medium text-gray-900">documentação</span> para mais informações sobre configurações.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#6D75C0] font-bold mt-0.5">•</span>
                    <span className="text-gray-600">Visite nosso <span className="font-medium text-gray-900">fórum de suporte</span> para tirar dúvidas e compartilhar experiências.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#6D75C0] font-bold mt-0.5">•</span>
                    <span className="text-gray-600">Não esqueça de fazer <span className="font-medium text-gray-900">backup</span> das configurações regularmente.</span>
                  </li>
                </ul>
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Para suporte técnico:</span>
                  </p>
                  <div className="space-y-2">
                    <a 
                      href={`mailto:${SUPORTE_INFO.email}`}
                      className="flex items-center gap-2 text-[#6D75C0] hover:text-[#5A62A8] font-medium transition-colors text-sm"
                    >
                      <MailIcon className="w-4 h-4" />
                      {SUPORTE_INFO.email}
                    </a>
                    <a 
                      href={`tel:${SUPORTE_INFO.telefone.replace(/\D/g, '')}`}
                      className="flex items-center gap-2 text-[#6D75C0] hover:text-[#5A62A8] font-medium transition-colors text-sm"
                    >
                      <PhoneIcon className="w-4 h-4" />
                      {SUPORTE_INFO.telefone}
                    </a>
                  </div>
                </div>
              </div>
            </div>


            {/* Barra de progresso animada */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">Progresso da manutenção</span>
                <span className="text-[#6D75C0] font-semibold">Em andamento...</span>
              </div>
              <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#6D75C0] to-[#8B92D8] rounded-full animate-[loading-bar_2s_ease-in-out_infinite]" 
                     style={{ width: '40%' }} />
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-4">
              <p className="text-sm text-gray-500">
                Agradecemos a sua compreensão e paciência
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Estação Terapia • Cuidando de você
              </p>
            </div>
          </div>
        </div>

        {/* Badge flutuante */}
        <div className="absolute -top-4 -right-4 bg-[#6D75C0] text-white px-6 py-2 rounded-full shadow-lg transform rotate-12 animate-pulse-slow flex items-center gap-2">
          <HeartIcon className="w-4 h-4 text-red-300" fill="rgb(252 165 165)" />
          <span className="text-sm font-bold">Estação Terapia</span>
        </div>
      </div>
    </div>
  );
}

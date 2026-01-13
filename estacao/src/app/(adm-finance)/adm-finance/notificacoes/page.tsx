"use client";

import React from "react";

export default function NotificacoesPage() {
  return (
    <main className="p-3 sm:p-4 md:p-6 lg:p-8 bg-[#FCFBF6] min-h-screen w-full overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#23253a] mb-2">Notificações</h1>
        <p className="text-sm sm:text-base text-[#6C757D]">Visualize notificações administrativas e ações pendentes.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-12 text-center">
        <p className="text-gray-500">Sistema de notificações em desenvolvimento.</p>
        <p className="text-sm text-gray-400 mt-2">
          As notificações aparecerão aqui quando houver ações pendentes relacionadas ao financeiro.
        </p>
      </div>
    </main>
  );
}


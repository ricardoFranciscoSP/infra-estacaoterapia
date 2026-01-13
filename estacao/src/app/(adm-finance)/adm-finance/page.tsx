"use client";

import React, { useEffect } from "react";
import { DashboardCards } from "./DashboardCards";
import { PedidosSaqueTable } from "./PedidosSaqueTable";
import { useAdmFinanceStore } from "@/store/admFinanceStore";

function getUserNameFromCookie() {
  if (typeof window === 'undefined') return '';
  try {
    const cookie = document.cookie.split('; ').find(row => row.startsWith('user-data-client='));
    if (!cookie) return '';
    const value = decodeURIComponent(cookie.split('=')[1]);
    const user = JSON.parse(value);
    return user?.Nome || user?.name || '';
  } catch {
    return '';
  }
}

export default function FinanceDashboard() {
  const [userName, setUserName] = React.useState('');
  const { estatisticas, fetchEstatisticas, isLoadingEstatisticas } = useAdmFinanceStore();

  useEffect(() => {
    setUserName(getUserNameFromCookie());
    fetchEstatisticas();
  }, [fetchEstatisticas]);

  // Data e hora atual formatada
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const stats = estatisticas || {
    totalPsicologos: 0,
    psicologosPagos: 0,
    psicologosPendentes: 0,
    psicologosReprovados: 0,
  };

  return (
    <main className="p-3 sm:p-4 md:p-6 lg:p-8 bg-[#FCFBF6] min-h-screen w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#23253a] mb-1">Dashboard</h1>
          <p className="text-[#6c6bb6] text-sm sm:text-base">Olá{userName ? `, ${userName}` : ''}! Aqui está um resumo do sistema.</p>
        </div>
        <div className="text-right sm:text-right flex-shrink-0">
          <span className="text-[#23253a] text-xs sm:text-sm font-medium whitespace-nowrap">{dateStr}, {timeStr}</span>
        </div>
      </div>
      <DashboardCards 
        psicologos={stats.totalPsicologos} 
        pagos={stats.psicologosPagos} 
        pendentes={stats.psicologosPendentes} 
        reprovados={stats.psicologosReprovados}
        isLoading={isLoadingEstatisticas}
      />
      
      {/* Tabela de Pedidos de Saque */}
      <PedidosSaqueTable />
    </main>
  );
}

'use client';

import dynamic from 'next/dynamic';
import { ChartData, ChartOptions } from 'chart.js';

/**
 * Componentes de gráficos carregados dinamicamente para melhorar performance
 * Chart.js é uma biblioteca pesada (~200KB) que não precisa estar no bundle inicial
 * Usa ssr: false para evitar carregamento no servidor (client-only)
 */
const ChartComponents = dynamic(() => import('./ChartComponents'), {
  loading: () => (
    <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-lg">
      <div className="text-gray-500 text-sm">Carregando gráfico...</div>
    </div>
  ),
  ssr: false, // Chart.js não precisa ser renderizado no servidor
});

interface LazyBarChartProps {
  data: ChartData<'bar'>;
  options?: ChartOptions<'bar'>;
}

interface LazyLineChartProps {
  data: ChartData<'line'>;
  options?: ChartOptions<'line'>;
}

interface LazyDoughnutChartProps {
  data: ChartData<'doughnut'>;
  options?: ChartOptions<'doughnut'>;
}

export function LazyBarChart({ data, options }: LazyBarChartProps) {
  return <ChartComponents type="bar" data={data} options={options} />;
}

export function LazyLineChart({ data, options }: LazyLineChartProps) {
  return <ChartComponents type="line" data={data} options={options} />;
}

export function LazyDoughnutChart({ data, options }: LazyDoughnutChartProps) {
  return <ChartComponents type="doughnut" data={data} options={options} />;
}


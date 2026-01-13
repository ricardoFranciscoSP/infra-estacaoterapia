'use client';

import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';

// Flag para garantir que o Chart.js seja registrado apenas uma vez
// ⚡ PERFORMANCE: Registro acontece apenas no cliente, não no servidor
let chartJSRegistered = false;

if (typeof window !== 'undefined' && !chartJSRegistered) {
  try {
    ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement);
    chartJSRegistered = true;
  } catch {
    // Se houver erro no registro, tenta novamente (pode ser que já esteja registrado)
    // Chart.js lança erro se tentar registrar duplicado, então ignoramos
    chartJSRegistered = true;
  }
}

interface ChartComponentsProps {
  type: 'bar' | 'line' | 'doughnut';
  data: ChartData<'bar'> | ChartData<'line'> | ChartData<'doughnut'>;
  options?: ChartOptions<'bar'> | ChartOptions<'line'> | ChartOptions<'doughnut'>;
}

/**
 * Componente interno que renderiza os gráficos
 * Carregado apenas quando necessário (via dynamic import)
 */
export default function ChartComponents({ type, data, options }: ChartComponentsProps) {
  switch (type) {
    case 'bar':
      return <Bar data={data as ChartData<'bar'>} options={options as ChartOptions<'bar'>} />;
    case 'line':
      return <Line data={data as ChartData<'line'>} options={options as ChartOptions<'line'>} />;
    case 'doughnut':
      return <Doughnut data={data as ChartData<'doughnut'>} options={options as ChartOptions<'doughnut'>} />;
    default:
      return null;
  }
}


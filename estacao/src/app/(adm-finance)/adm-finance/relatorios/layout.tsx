import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Relatórios | Painel Administrativo | Estação Terapia',
  description: 'Visualize relatórios e métricas',
};

export default function RelatoriosAdmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

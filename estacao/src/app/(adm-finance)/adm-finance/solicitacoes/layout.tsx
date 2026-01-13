import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Solicitações | Painel Administrativo | Estação Terapia',
  description: 'Gerencie solicitações de psicólogos',
};

export default function SolicitacoesAdmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manutenção | Estação Terapia',
  description: 'Sistema em manutenção',
};

export default function ManutencaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

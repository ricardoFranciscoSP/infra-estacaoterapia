import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termo de Uso | Estação Terapia',
  description: 'Termos de uso da plataforma',
};

export default function TermoUsoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

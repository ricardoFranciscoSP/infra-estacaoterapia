import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termo de Uso - Psicólogos | Estação Terapia',
  description: 'Termos de uso para psicólogos',
};

export default function TermoUsoPsicologoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

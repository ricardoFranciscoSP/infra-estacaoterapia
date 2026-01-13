import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Psicólogos | Estação Terapia',
  description: 'Encontre seu psicólogo',
};

export default function PsicologosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

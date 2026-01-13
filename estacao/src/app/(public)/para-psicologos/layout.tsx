import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Para Psicólogos | Estação Terapia',
  description: 'Trabalhe conosco como psicólogo',
};

export default function ParaPsicologosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

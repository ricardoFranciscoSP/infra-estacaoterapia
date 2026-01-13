import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Perguntas Frequentes | Estação Terapia',
  description: 'Perguntas frequentes para psicólogos',
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


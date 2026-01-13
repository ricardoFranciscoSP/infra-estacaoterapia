import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ - Perguntas Frequentes | Estação Terapia',
  description: 'Tire suas dúvidas',
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

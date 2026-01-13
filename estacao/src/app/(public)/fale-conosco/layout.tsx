import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fale Conosco | Estação Terapia',
  description: 'Entre em contato conosco',
};

export default function FaleConoscoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

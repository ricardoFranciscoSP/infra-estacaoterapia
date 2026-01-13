import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Perguntas Frequentes | Estação Terapia',
  description: 'Tire suas dúvidas',
};

export default function PerguntasFrequentesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

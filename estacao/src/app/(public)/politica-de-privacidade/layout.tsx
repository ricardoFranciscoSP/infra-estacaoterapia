import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade | Estação Terapia',
  description: 'Nossa política de privacidade',
};

export default function PoliticaPrivacidadeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

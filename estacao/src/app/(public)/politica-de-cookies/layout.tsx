import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Cookies | Estação Terapia',
  description: 'Nossa política de cookies',
};

export default function PoliticaCookiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

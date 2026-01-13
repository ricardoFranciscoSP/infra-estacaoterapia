import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ver Psicólogos | Estação Terapia',
  description: 'Conheça nossos psicólogos',
};

export default function VerPsicologosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

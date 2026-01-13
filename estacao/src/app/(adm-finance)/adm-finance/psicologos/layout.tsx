import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Psicólogos | Painel Administrativo | Estação Terapia',
  description: 'Gerencie os psicólogos da plataforma',
};

export default function PsicologosAdmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

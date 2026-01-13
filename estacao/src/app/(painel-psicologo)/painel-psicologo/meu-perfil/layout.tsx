import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meu Perfil | Estação Terapia',
  description: 'Edite suas informações de perfil',
};

export default function PerfilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

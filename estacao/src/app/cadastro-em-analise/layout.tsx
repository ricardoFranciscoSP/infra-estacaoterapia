import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cadastro em Análise | Estação Terapia',
  description: 'Seu cadastro está em análise',
};

export default function CadastroEmAnaliseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

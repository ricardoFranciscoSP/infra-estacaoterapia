import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout - Planos | Estação Terapia',
  description: 'Finalize sua compra',
};

export default function CheckoutPlanosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

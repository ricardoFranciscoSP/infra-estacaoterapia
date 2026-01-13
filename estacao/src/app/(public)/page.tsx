"use client";
// src/app/page.tsx
import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import BannerRotativo from '@/components/BannerRotativo';
import { useVendaPlanos } from '@/hooks/public/planosVendaHook';

// Componentes críticos para LCP - importação direta
// BannerRotativo é mantido direto pois é o primeiro elemento visível

// ⚡ OTIMIZAÇÃO: Lazy load components com intersection observer para carregar apenas quando visíveis
const ComoFunciona = dynamic(() => import('@/components/ComoFunciona'), {
  loading: () => <div className="min-h-[600px]" aria-hidden="true" />,
  ssr: true,
});

const CallToActionPaciente = dynamic(() => import('@/components/CtaPaciente'), {
  loading: () => <div className="min-h-[500px] bg-[#E5E9FA]" aria-hidden="true" />,
  ssr: true,
});

const PlataformaBeneficios = dynamic(() => import('@/components/Plataforma'), {
  loading: () => <div className="min-h-[300px]" aria-hidden="true" />,
  ssr: true,
});

const CallToAction = dynamic(() => import('@/components/CallToAction'), {
  loading: () => <div className="min-h-[300px]" aria-hidden="true" />,
  ssr: true,
});

const CallToActionPsicologo = dynamic(() => import('@/components/CallToActionPsicologo'), {
  loading: () => <div className="min-h-[300px]" aria-hidden="true" />,
  ssr: true,
});

// ⚡ PERFORMANCE: Carrossel carregado com ssr: false - componente pesado que não precisa estar no SSR
const TestimonialCarousel = dynamic(() => import('@/components/TestimonialCarousel'), {
  loading: () => <div className="min-h-[400px]" aria-hidden="true" />,
  ssr: false, // Carrossel com animações não precisa estar no SSR
});

const Divisor = dynamic(() => import('@/components/Divisor'), {
  loading: () => <div className="min-h-[100px]" aria-hidden="true" />,
  ssr: true,
});

const FaqSection = dynamic(() => import('@/components/DuvidasFrequentes'), {
  loading: () => <div className="min-h-[400px]" aria-hidden="true" />,
  ssr: true,
});

const PlanosSection = dynamic(() => import('@/components/Planos'), {
  loading: () => <div className="min-h-[500px]" aria-hidden="true" />,
  ssr: true,
});

export default function HomePage() {
  const { planos, isLoading } = useVendaPlanos();

  // ⚡ OTIMIZAÇÃO: Event listener não crítico carregado após hidratação
  useEffect(() => {
    // Defer não crítico para não bloquear renderização
    const timer = setTimeout(() => {
      const disableContextMenu = (e: MouseEvent) => {
        e.preventDefault();
      };
      document.addEventListener('contextmenu', disableContextMenu);
      return () => {
        document.removeEventListener('contextmenu', disableContextMenu);
      };
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full overflow-x-hidden" style={{ margin: 0, padding: 0, width: '100%', maxWidth: 'none' }}>
      <div className="w-full overflow-x-hidden" style={{ margin: 0, padding: 0, width: '100%', maxWidth: 'none' }}>
        <BannerRotativo />
      </div>
      <section id="como-funciona">
        <ComoFunciona />
      </section>
      <section id="para-pacientes">
        <CallToActionPaciente />
      </section>
      <section>
        <PlataformaBeneficios />
      </section>
      <section id="para-psicologos">
        <CallToActionPsicologo />
      </section>
      <section className="px-4 sm:px-8">
        <CallToAction />
      </section>
      <section className="px-4 sm:px-8">
        <TestimonialCarousel />
      </section>
      <section>
        <Divisor />
      </section>
      <section className="px-4 sm:px-8">
        <FaqSection />
      </section>
      <section id="planos">
        <PlanosSection planos={Array.isArray(planos) ? planos : []} loading={isLoading} />
      </section>
    </div>
  );
}
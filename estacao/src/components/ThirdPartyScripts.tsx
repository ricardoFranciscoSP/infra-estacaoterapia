'use client';

import dynamic from 'next/dynamic';

// ⚡ OTIMIZAÇÃO: Wrapper Client Component para scripts de terceiros
// Scripts de terceiros carregados apenas no cliente após hidratação
const GoogleIntegrations = dynamic(() => import('@/components/GoogleIntegrations'), {
  ssr: false, // Scripts de terceiros não precisam de SSR
});

const GoAdoptConsent = dynamic(() => import('@/components/GoAdoptConsent'), {
  ssr: false, // Script de consentimento não precisa de SSR
});

export default function ThirdPartyScripts() {
  return (
    <>
      <GoogleIntegrations />
      <GoAdoptConsent />
    </>
  );
}


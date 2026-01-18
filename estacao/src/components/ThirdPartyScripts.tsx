'use client';

import { useEffect, useState } from 'react';
import GoogleIntegrations from '@/components/GoogleIntegrations';
import GoAdoptConsent from '@/components/GoAdoptConsent';

// Wrapper Client Component para scripts de terceiros
// Renderiza apenas após mount para evitar instabilidades em HMR no dev

export default function ThirdPartyScripts() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <GoogleIntegrations />
      <GoAdoptConsent />
    </>
  );
}


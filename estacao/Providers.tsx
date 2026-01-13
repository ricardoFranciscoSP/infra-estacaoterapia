'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { queryClient } from '@/lib/queryClient';
import { CustomToastProvider } from '@/components/CustomToastProvider';
import { AuthRestoreProvider } from '@/provider/AuthRestoreProvider';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthRestoreProvider>
        <CustomToastProvider />
        {children}
      </AuthRestoreProvider>
    </QueryClientProvider>
  );
}

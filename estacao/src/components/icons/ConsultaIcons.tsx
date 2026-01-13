'use client';

import React from 'react';

// Ícones SVG inline para ConsultaCard - arquivo separado para evitar problemas de cache HMR
// Componentes React.memo para melhor performance e evitar re-renders desnecessários

export const ClockIcon = React.memo(({ className }: { className?: string }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    strokeWidth={2} 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    viewBox="0 0 24 24" 
    width="16" 
    height="16"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
));

ClockIcon.displayName = 'ClockIcon';

export const UserIcon = React.memo(({ className }: { className?: string }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    strokeWidth={2} 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    viewBox="0 0 24 24" 
    width="16" 
    height="16"
    aria-hidden="true"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
));

UserIcon.displayName = 'UserIcon';

export const CalendarIcon = React.memo(({ className }: { className?: string }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    strokeWidth={2} 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    viewBox="0 0 24 24" 
    width="16" 
    height="16"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
));

CalendarIcon.displayName = 'CalendarIcon';


"use client";
import React from 'react';
import { CustomToastProvider } from '@/components/CustomToastProvider';

// Layout específico para sala de vídeo do psicólogo - sem header e footer
const RoomLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="w-full h-screen overflow-hidden" style={{ overflowX: 'hidden', overflowY: 'hidden', width: '100vw', height: '100vh' }}>
      <CustomToastProvider />
      {children}
    </div>
  );
};

export default RoomLayout;

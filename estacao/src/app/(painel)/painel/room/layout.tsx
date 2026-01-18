import React from 'react';
import RoomProviders from '@/components/RoomProviders';

// Layout específico para sala de vídeo - sem header e footer
const RoomLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="w-full h-screen overflow-hidden" style={{ overflowX: 'hidden', overflowY: 'hidden', width: '100vw', height: '100vh' }}>
      <RoomProviders>{children}</RoomProviders>
    </div>
  );
};

export default RoomLayout;

import React from 'react';
import { CustomToastProvider } from '@/components/CustomToastProvider';
 import '@/globals.css';

export const metadata = {
  title: 'Estação terapia - Cadastro',
  description: 'Plataforma de terapia online',
}


const RootLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
        <>
          <div className="flex-1">{children}</div>
          <CustomToastProvider />
        </>
  );
};

export default RootLayout;
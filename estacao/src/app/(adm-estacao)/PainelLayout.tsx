"use client";
import React, { useState, useEffect } from 'react';
import { Header } from '@/components/adm/Header';
import { Sidebar } from '@/components/adm/Sidebar';
import { Rodape } from '@/components/adm/Rodape';
import { AnimatePresence, motion } from "framer-motion";
import { useUserBasic } from '@/hooks/user/userHook';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useAllowedSidebarLabels } from '@/hooks/useAllowedSidebarLabels';
import LoggedErrorBoundary from '@/components/LoggedErrorBoundary';

const PainelLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useProtectedRoute("Admin");

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, isLoading: userLoading } = useUserBasic();
  const allowedLabels = useAllowedSidebarLabels();
  const sidebarModules = Array.isArray(allowedLabels) ? allowedLabels : undefined;
  
  // Garante que o componente só renderize após a hidratação
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Verificação adicional: se for Finance, redireciona imediatamente
  useEffect(() => {
    if (mounted && user && user.Role === "Finance") {
      window.location.href = "/no-permission";
    }
  }, [user, mounted]);

  // Durante a hidratação, renderiza o mesmo conteúdo que será renderizado após
  if (!mounted || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFBF6]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8494E9]" />
      </div>
    );
  }

  return (
    <LoggedErrorBoundary>
      <div className="flex flex-col min-h-screen bg-[#FCFBF6]">
        <Header onOpenSidebarMobile={() => setMobileSidebarOpen(true)} />
        {/* Sidebar mobile */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-transparent z-30 sm:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-y-0 left-0 z-40 sm:hidden"
              >
                <Sidebar mobile onClose={() => setMobileSidebarOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
        <div className="flex-1 w-full">
          <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 md:px-6 flex flex-col sm:flex-row">
            <Sidebar modules={sidebarModules} />
            <main className="flex-1 py-2 sm:py-4 md:py-8 sm:pl-4 md:pl-8 flex flex-col w-full overflow-x-hidden">
              {children}
              <Rodape />
            </main>
          </div>
        </div>
      </div>
    </LoggedErrorBoundary>
  );
};

export default PainelLayout;

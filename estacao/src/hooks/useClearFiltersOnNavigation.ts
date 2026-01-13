"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePsicologoFilterStore } from "@/store/filters/psicologoFilterStore";

/**
 * Hook que limpa os filtros de psicólogo quando o usuário navega para outras páginas
 * Deve ser usado no componente de nível mais alto (layout ou página)
 */
export function useClearFiltersOnNavigation() {
  const pathname = usePathname();
  const prevPathnameRef = useRef<string | null>(null);
  const { reset } = usePsicologoFilterStore();

  useEffect(() => {
    // Inicializa com o pathname atual se ainda não foi definido
    if (!prevPathnameRef.current) {
      prevPathnameRef.current = pathname || null;
      return;
    }

    const isPsicologosPage = 
      pathname?.startsWith("/painel/psicologos") || 
      pathname === "/ver-psicologos";

    // Se estava na página de psicólogos e agora não está mais, limpa os filtros
    if (prevPathnameRef.current) {
      const wasOnPsicologosPage = 
        prevPathnameRef.current.startsWith("/painel/psicologos") || 
        prevPathnameRef.current === "/ver-psicologos";
      
      if (wasOnPsicologosPage && !isPsicologosPage) {
        reset();
      }
    }

    prevPathnameRef.current = pathname || null;
  }, [pathname, reset]);

  // Listener adicional para capturar navegações que podem não ser detectadas pelo usePathname
  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      const isPsicologosPage = 
        currentPath.startsWith("/painel/psicologos") || 
        currentPath === "/ver-psicologos";
      
      if (prevPathnameRef.current) {
        const wasOnPsicologosPage = 
          prevPathnameRef.current.startsWith("/painel/psicologos") || 
          prevPathnameRef.current === "/ver-psicologos";
        
        if (wasOnPsicologosPage && !isPsicologosPage) {
          reset();
        }
      }
      
      prevPathnameRef.current = currentPath;
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [reset]);
}


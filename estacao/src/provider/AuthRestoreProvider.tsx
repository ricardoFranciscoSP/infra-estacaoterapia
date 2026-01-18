import { useEffect } from "react";
import { parseCookies } from "nookies";
import { useAuthStore } from "@/store/authStore";

export function AuthRestoreProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    async function restoreUser() {
      if (typeof window === "undefined") return;
      
      // Verifica se há token de autenticação (cookie httpOnly setado pelo backend)
      const cookies = parseCookies();
      const hasToken = !!cookies.token;
      
      if (!hasToken) {
        // Se não há token, não há usuário logado
        return;
      }

      if (typeof window !== "undefined") {
        try {
          const { default: Cookies } = await import("js-cookie");
          Cookies.set("auth", "1", {
            expires: 7,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          });
        } catch {
          // silencioso
        }
      }
      
      try {
        // Tenta buscar do cookie primeiro (mais rápido)
        const userDataClient = cookies['user-data-client'];
        
        if (userDataClient) {
          try {
            const user = JSON.parse(decodeURIComponent(userDataClient));
            setUser(user);
          } catch {
            // Se o cookie estiver corrompido, busca do backend
            await fetchUser();
          }
        } else {
          // Se não há cookie, busca do backend
          await fetchUser();
        }
      } catch (error) {
        console.error('Erro ao restaurar usuário:', error);
        // Em caso de erro, tenta buscar do backend
        try {
          await fetchUser();
        } catch (fetchError) {
          console.error('Erro ao buscar usuário do backend:', fetchError);
        }
      }
    }
    
    restoreUser();
  }, [setUser, fetchUser]);

  return <>{children}</>;
}

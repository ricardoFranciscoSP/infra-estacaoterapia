import React, { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";

const allMenuItems = [
  { label: "Dados Pessoais", href: "/painel/minha-conta/dados-pessoais" },
  { label: "Alterar Senha", href: "/painel/minha-conta/alterar-senha" },
  { label: "Minhas Consultas", href: "/painel/consultas" },
  { label: "Psicólogos Favoritos", href: "/painel/minha-conta/psicologos-favoritos" },
  { label: "Minhas Solicitações", href: "/painel/minha-conta/minhas-solicitacoes" },
  { label: "Trocar Cartão", href: "/painel/minha-conta/trocar-cartao" },
  { label: "Meus Planos", href: "/painel/minha-conta/meus-planos" },
  { label: "Política e termos", href: "/painel/minha-conta/politicas-e-termos" },
];

export default function PainelSidebar({ active }: { active?: string }) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  // Filtra menu items baseado no role do usuário
  const menuItems = useMemo(() => {
    // Se o usuário for psicólogo, remove "Psicólogos Favoritos"
    if (user?.Role === "Psychologist") {
      return allMenuItems.filter(item => item.label !== "Psicólogos Favoritos");
    }
    return allMenuItems;
  }, [user?.Role]);

  return (
    <motion.aside
      className="w-64 p-4 flex flex-col gap-2 min-h-[400px]"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <h2 className="font-semibold text-[32px] leading-10 text-[#49525A] mb-4">Minha conta</h2>
      <nav className="flex flex-col gap-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 rounded-md text-[16px] font-medium leading-6 transition-colors font-sans ${
              active === item.href
                ? "bg-indigo-100 text-[#6D75C0]"
                : "hover:bg-gray-100 text-[#6D75C0]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <hr className="my-6 border-t border-[#E3E6E8]" />
      <div className="mt-2">
        <button
          type="button"
          className="px-3 py-2 rounded-md text-[16px] font-medium leading-6 transition-colors font-sans text-[#6D75C0] hover:bg-gray-100"
          onClick={async () => {
            await logout();
          }}
        >
          Sair
        </button>
      </div>
    </motion.aside>
  );
}

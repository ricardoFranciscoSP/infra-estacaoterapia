"use client";

import dynamic from "next/dynamic";
import HeaderSkeleton from "@/components/HeaderSkeleton";

// ⚡ OTIMIZAÇÃO: Header carregado no cliente para evitar HMR instável no dev
const Header = dynamic(() => import("@/components/Header"), {
  loading: () => <HeaderSkeleton />,
  ssr: false,
});

export default function ClientPublicHeader() {
  return <Header />;
}

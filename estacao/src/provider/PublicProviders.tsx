"use client";

import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { CustomToastProvider } from "@/components/CustomToastProvider";

export default function PublicProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <CustomToastProvider />
    </QueryClientProvider>
  );
}

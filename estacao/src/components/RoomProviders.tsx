"use client";

import React from "react";
import { CustomToastProvider } from "@/components/CustomToastProvider";
import LoggedErrorBoundary from "@/components/LoggedErrorBoundary";

export default function RoomProviders({ children }: { children: React.ReactNode }) {
  return (
    <LoggedErrorBoundary>
      <CustomToastProvider />
      {children}
    </LoggedErrorBoundary>
  );
}

"use client";
/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext } from "react";
import type { PageId } from "@/app/routerTypes";

export type AppNavContextValue = {
  currentPage: PageId;
  recommendationLaunchPage: PageId;
};

const AppNavContext = createContext<AppNavContextValue | null>(null);

export function AppNavProvider({
  value,
  children,
}: {
  value: AppNavContextValue;
  children: React.ReactNode;
}) {
  return <AppNavContext.Provider value={value}>{children}</AppNavContext.Provider>;
}

export function useAppNav() {
  const ctx = useContext(AppNavContext);
  if (!ctx) {
    throw new Error("useAppNav must be used within AppNavProvider.");
  }
  return ctx;
}

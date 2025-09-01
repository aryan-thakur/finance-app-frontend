"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname?.startsWith("/login");
  return (
    <>
      {!hideNav && <AppNav />}
      {children}
    </>
  );
}


"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import styles from "./AppShell.module.css";

export function MainContainer({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const constrained = !pathname?.includes("/dashboard");

  return <main className={`${styles.main} ${constrained ? styles.mainConstrained : ""}`}>{children}</main>;
}


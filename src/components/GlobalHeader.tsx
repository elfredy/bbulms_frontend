"use client";

import { usePathname } from "next/navigation";

import { LocaleSwitcher } from "@/components/LocaleSwitcher";

import styles from "./AppShell.module.css";

export function GlobalHeader() {
  const pathname = usePathname();
  if (pathname?.includes("/dashboard")) return null;

  return (
    <header className={styles.header}>
      <div className={styles.brand}>BBU LMS</div>
      <LocaleSwitcher />
    </header>
  );
}


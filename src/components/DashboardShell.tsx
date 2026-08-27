"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { LogoutButton } from "@/components/LogoutButton";

import styles from "./DashboardShell.module.css";

export type DashboardNavItem = {
  href: string;
  label: string;
  badge?: string;
  section?: string;
};

export type DashboardMe = {
  display_name: string;
  username?: string | null;
  user_type?: string | null;
  is_superadmin?: boolean | null;
};

type Props = {
  me: DashboardMe;
  items: DashboardNavItem[];
  children: ReactNode;
};

function isActive(pathname: string, href: string) {
  if (href === pathname) return true;
  if (href !== "/" && pathname.startsWith(href + "/")) {
    if (/\/dashboard\/admin$/.test(href.replace(/\/$/, ""))) return false;
    return true;
  }
  return false;
}

export function DashboardShell({ me, items, children }: Props) {
  const pathname = usePathname();

  const grouped = items.reduce<Record<string, DashboardNavItem[]>>((acc, item) => {
    const key = item.section ?? "";
    acc[key] ??= [];
    acc[key].push(item);
    return acc;
  }, {});

  const sections = Object.keys(grouped);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Dashboard navigation">
        <div className={styles.brand}>
          <div className={styles.brandTitle}>BBU LMS</div>
          <LocaleSwitcher />
        </div>

        <div className={styles.userCard}>
          <p className={styles.userName}>{me.display_name}</p>
          <p className={styles.userMeta}>
            {[me.username ? `@${me.username}` : null, me.user_type].filter(Boolean).join(" · ") || "\u00a0"}
          </p>
          {me.is_superadmin ? <p className={styles.userMeta}>Superadmin · aktiv</p> : null}
        </div>

        <nav className={styles.nav}>
          {sections.map((section) => (
            <div key={section}>
              {section ? <div className={styles.navSectionLabel}>{section}</div> : null}
              {grouped[section].map((item) => {
                const active = pathname ? isActive(pathname, item.href) : false;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span>{item.label}</span>
                    {item.badge ? <span className={styles.pill}>{item.badge}</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <div className={styles.content}>
        <div className={styles.topbar}>
          <div className={styles.spacer} />
          <LogoutButton className={`${styles.btn} ${styles.btnPrimary}`} />
        </div>
        {children}
      </div>
    </div>
  );
}


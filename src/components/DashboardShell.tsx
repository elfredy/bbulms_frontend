"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
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
  const normalized = href.replace(/\/$/, "");
  if (/\/dashboard$/.test(normalized)) return false;
  if (href !== "/" && pathname.startsWith(href + "/")) {
    if (/\/dashboard\/admin$/.test(normalized)) return false;
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

  const activeSections = useMemo(() => {
    const open = new Set<string>();
    for (const item of items) {
      if (pathname && isActive(pathname, item.href) && item.section) open.add(item.section);
    }
    return open;
  }, [items, pathname]);

  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(activeSections));

  useEffect(() => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      activeSections.forEach((s) => next.add(s));
      return next;
    });
  }, [activeSections]);

  function toggleSection(section: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

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
          <div className={styles.menuTitle}>Menyu</div>
          {sections.map((section) => {
            const sectionItems = grouped[section];
            if (!section) {
              return (
                <div key="root">
                  {sectionItems.map((item) => {
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
              );
            }

            const expanded = openSections.has(section);
            return (
              <div key={section} className={styles.navSection}>
                <button
                  type="button"
                  className={styles.navSectionToggle}
                  aria-expanded={expanded}
                  onClick={() => toggleSection(section)}
                >
                  <span className={styles.sectionIcon} aria-hidden>
                    {expanded ? "−" : "+"}
                  </span>
                  <span>{section}</span>
                </button>
                {expanded ? (
                  <div className={styles.navSub}>
                    {sectionItems.map((item) => {
                      const active = pathname ? isActive(pathname, item.href) : false;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`${styles.navSubItem} ${active ? styles.navSubItemActive : ""}`}
                          aria-current={active ? "page" : undefined}
                        >
                          <span className={styles.bullet} aria-hidden />
                          <span>{item.label}</span>
                          {item.badge ? <span className={styles.pill}>{item.badge}</span> : null}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
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

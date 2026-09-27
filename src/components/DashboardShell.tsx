"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
  user_type_label?: string | null;
  is_superadmin?: boolean | null;
  must_change_password?: boolean | null;
  available_roles?: { id: string; label: string }[];
};

type UnlockNotice = {
  id: string;
  course_id: string;
  course_meeting_id: string;
  message: string;
  meeting_date?: string | null;
  course_code?: string | null;
  subject_name_az?: string | null;
  teacher_name?: string | null;
  confirmed?: boolean;
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
  const router = useRouter();

  useEffect(() => {
    if (!me.must_change_password || !pathname) return;
    if (pathname.includes("/change-password")) return;
    const locale = pathname.split("/").filter(Boolean)[0] || "az";
    router.replace(`/${locale}/dashboard/change-password`);
  }, [me.must_change_password, pathname, router]);

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
  const [notices, setNotices] = useState<UnlockNotice[]>([]);
  const [noticesOpen, setNoticesOpen] = useState(false);

  useEffect(() => {
    if (!noticesOpen) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setNoticesOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [noticesOpen]);

  useEffect(() => {
    if (!me.is_superadmin) return;
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/admin/journal/unlock-requests", { credentials: "include", cache: "no-store" });
        if (!res.ok || !alive) return;
        const data = (await res.json()) as { items?: UnlockNotice[] };
        if (alive) setNotices(Array.isArray(data.items) ? data.items : []);
      } catch {
        /* bildiriş siyahısı açıq qalır */
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    window.addEventListener("bbu-journal-unlocks-changed", load);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("bbu-journal-unlocks-changed", load);
    };
  }, [me.is_superadmin]);

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
          <div className={styles.brandMark}>
            <Image className={styles.brandLogo} src="/30il.png" alt="" width={36} height={36} />
            <div className={styles.brandTitle}>BBU LMS</div>
          </div>
          <LocaleSwitcher />
        </div>

        <div className={styles.userCard}>
          <p className={styles.userName}>{me.display_name}</p>
          <p className={styles.userMeta}>{me.user_type_label || me.user_type || "\u00a0"}</p>
          {me.available_roles && me.available_roles.length > 1 ? (
            <label className={styles.roleSwitch}>
              <span>Profil</span>
              <select
                className={styles.roleSelect}
                value={me.user_type ?? ""}
                onChange={async (e) => {
                  const next = e.target.value;
                  if (!next || next === me.user_type) return;
                  await fetch("/api/auth/switch-role", {
                    method: "POST",
                    credentials: "include",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ user_type: next }),
                  });
                  router.push(pathname?.replace(/\/dashboard.*/, "/dashboard") || "/dashboard");
                  router.refresh();
                }}
              >
                {me.available_roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {me.is_superadmin ? <p className={styles.userMeta}>Superadmin · aktiv</p> : null}
          {me.is_superadmin ? (
            <div className={styles.noticeBox}>
              <button
                type="button"
                className={styles.noticeToggle}
                aria-haspopup="dialog"
                aria-expanded={noticesOpen}
                onClick={() => setNoticesOpen(true)}
              >
                <span>Bildirişlər</span>
                {notices.length ? <span className={styles.noticeCount}>{notices.length}</span> : null}
              </button>
            </div>
          ) : null}
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
                        {!item.badge && me.is_superadmin && item.href.endsWith("/admin/journal") && notices.length ? (
                          <span className={styles.pill}>{notices.length}</span>
                        ) : null}
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
                          {!item.badge && me.is_superadmin && item.href.endsWith("/admin/journal") && notices.length ? (
                            <span className={styles.pill}>{notices.length}</span>
                          ) : null}
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
        {pathname?.includes("/dashboard/journal/") ? null : (
          <div className={styles.topbar}>
            <div className={styles.spacer} />
            <LogoutButton className={`${styles.btn} ${styles.btnPrimary}`} />
          </div>
        )}
        {children}
      </div>

      {me.is_superadmin && noticesOpen ? (
        <div className={styles.noticeOverlay} role="presentation" onClick={() => setNoticesOpen(false)}>
          <div
            className={styles.noticeModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-notices-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className={styles.noticeModalHead}>
              <h2 id="journal-notices-title" className={styles.noticeModalTitle}>
                Bildirişlər
                {notices.length ? <span className={styles.noticeCount}>{notices.length}</span> : null}
              </h2>
              <button type="button" className={styles.noticeClose} onClick={() => setNoticesOpen(false)}>
                Bağla
              </button>
            </div>
            {notices.length === 0 ? (
              <p className={styles.noticeEmpty}>Açıq müraciət yoxdur</p>
            ) : (
              <ul className={styles.noticeList}>
                {notices.map((n) => {
                  const locale = pathname?.split("/").filter(Boolean)[0] || "az";
                  const title = [n.course_code, n.subject_name_az].filter(Boolean).join(" — ") || "Fənn qrupu";
                  const href = `/${locale}/dashboard/admin/journal?course_id=${encodeURIComponent(n.course_id)}&meeting_id=${encodeURIComponent(n.course_meeting_id)}`;
                  return (
                    <li key={n.id}>
                      <Link href={href} className={styles.noticeItem} onClick={() => setNoticesOpen(false)}>
                        <span className={styles.noticeTitle}>{title}</span>
                        <span className={styles.noticeMeta}>
                          {n.teacher_name || "Müəllim"}
                          {n.meeting_date ? ` · ${n.meeting_date}` : ""}
                          {` · ${n.confirmed ? "Təsdiq" : "Bağlı"}`}
                        </span>
                        <span className={styles.noticeMsg}>{n.message}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

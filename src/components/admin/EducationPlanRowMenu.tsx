"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "../SubjectGroupRowMenu.module.css";

async function readDetail(res: Response, fallback: string) {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function EducationPlanRowMenu({ planId, locale }: { planId: string; locale: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const base = `/${locale}/dashboard/admin/education-plans/${planId}`;

  useEffect(() => {
    if (!open) return;
    const el = triggerRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setMenuPos({ top: r.top, right: window.innerWidth - r.left + 8 });
    }
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  async function clonePlan() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/education-plans/${encodeURIComponent(planId)}/clone`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        window.alert(await readDetail(res, "Nüsxələnmədi"));
        return;
      }
      const data = (await res.json()) as { id?: string };
      setOpen(false);
      if (data.id) router.push(`/${locale}/dashboard/admin/education-plans/${data.id}`);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className={open ? `${styles.trigger} ${styles.triggerOpen}` : styles.trigger}
        aria-label="Əməliyyatlar"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ☰
      </button>
      {open ? (
        <div className={styles.menu} role="menu" style={menuPos ? { top: menuPos.top, right: menuPos.right } : undefined}>
          <button type="button" className={styles.item} role="menuitem" disabled={busy} onClick={() => go(base)}>
            Fənlər üzrə əməliyyatlar
          </button>
          <button type="button" className={styles.item} role="menuitem" disabled={busy} onClick={() => go(`${base}/groups`)}>
            Qrup əlavə et
          </button>
          <button type="button" className={styles.item} role="menuitem" disabled={busy} onClick={() => go(`${base}/edit`)}>
            Yenilə
          </button>
          <button type="button" className={styles.item} role="menuitem" disabled={busy} onClick={() => void clonePlan()}>
            Nüsxələ
          </button>
        </div>
      ) : null}
    </div>
  );
}

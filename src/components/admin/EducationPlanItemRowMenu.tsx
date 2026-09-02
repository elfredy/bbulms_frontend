"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

export function EducationPlanItemRowMenu({
  planId,
  itemId,
  kind,
  locale,
}: {
  planId: string;
  itemId: string;
  kind: "SUBJECT" | "EXPERIENCE" | "THESIS";
  locale: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  const base = `/${locale}/dashboard/admin/education-plans/${planId}`;
  const editHref =
    kind === "SUBJECT"
      ? `${base}/subjects/${itemId}/edit`
      : kind === "EXPERIENCE"
        ? `${base}/experiences/${itemId}/edit`
        : `${base}/theses/${itemId}/edit`;
  const deleteUrl =
    kind === "SUBJECT"
      ? `/api/admin/education-plans/${encodeURIComponent(planId)}/subjects/${encodeURIComponent(itemId)}`
      : kind === "EXPERIENCE"
        ? `/api/admin/education-plans/${encodeURIComponent(planId)}/experiences/${encodeURIComponent(itemId)}`
        : `/api/admin/education-plans/${encodeURIComponent(planId)}/theses/${encodeURIComponent(itemId)}`;
  const cloneUrl =
    kind === "SUBJECT"
      ? `/api/admin/education-plans/${encodeURIComponent(planId)}/subjects/${encodeURIComponent(itemId)}/clone`
      : null;

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

  async function onDelete() {
    if (!window.confirm("Silmək istəyirsiniz?")) return;
    setBusy(true);
    try {
      const res = await fetch(deleteUrl, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        window.alert(await readDetail(res, "Silinmədi"));
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onClone() {
    if (!cloneUrl) return;
    setBusy(true);
    try {
      const res = await fetch(cloneUrl, { method: "POST", credentials: "include" });
      if (!res.ok) {
        window.alert(await readDetail(res, "Nüsxələnmədi"));
        return;
      }
      setOpen(false);
      router.refresh();
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
          <button
            type="button"
            className={styles.item}
            role="menuitem"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              router.push(editHref);
            }}
          >
            Yenilə
          </button>
          {cloneUrl ? (
            <button type="button" className={styles.item} role="menuitem" disabled={busy} onClick={() => void onClone()}>
              Nüsxələ
            </button>
          ) : null}
          <button type="button" className={styles.item} role="menuitem" disabled={busy} onClick={() => void onDelete()}>
            Sil
          </button>
        </div>
      ) : null}
    </div>
  );
}

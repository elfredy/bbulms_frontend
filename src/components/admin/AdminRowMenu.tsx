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

export function AdminRowMenu({
  editHref,
  deleteUrl,
  deleteConfirm,
  extraHref,
  extraLabel,
}: {
  editHref?: string;
  deleteUrl?: string;
  deleteConfirm?: string;
  extraHref?: string;
  extraLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

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
    if (!deleteUrl) return;
    if (!window.confirm(deleteConfirm || "Silmək istəyirsiniz?")) return;
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
          {editHref ? (
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
          ) : null}
          {extraHref && extraLabel ? (
            <button
              type="button"
              className={styles.item}
              role="menuitem"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                router.push(extraHref);
              }}
            >
              {extraLabel}
            </button>
          ) : null}
          {deleteUrl ? (
            <button type="button" className={styles.item} role="menuitem" disabled={busy} onClick={() => void onDelete()}>
              Sil
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

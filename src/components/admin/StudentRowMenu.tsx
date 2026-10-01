"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "../SubjectGroupRowMenu.module.css";

type SubjectRow = {
  course_id: string;
  subject_name_az: string | null;
  education_year_name: string | null;
  semester_name_az: string | null;
  credit: number;
  education_group_name: string | null;
};

type EnrollmentData = {
  group_name: string | null;
  subjects: SubjectRow[];
};

async function readDetail(res: Response, fallback: string) {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function StudentRowMenu({
  studentId,
  editHref,
  deleteUrl,
}: {
  studentId: string;
  editHref: string;
  deleteUrl: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EnrollmentData | null>(null);
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
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/students/${encodeURIComponent(studentId)}/enrollments`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await readDetail(res, "Məlumat yüklənmədi."));
        return res.json();
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Məlumat yüklənmədi.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, studentId]);

  async function onDelete() {
    if (!window.confirm("Tələbəni silmək istəyirsiniz?")) return;
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
        aria-label="Qrup və fənnlər"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ⋮
      </button>
      {open ? (
        <div
          className={styles.menu}
          role="menu"
          style={{
            ...(menuPos ? { top: menuPos.top, right: menuPos.right } : {}),
            minWidth: 280,
            maxWidth: 360,
            maxHeight: "70vh",
            overflow: "auto",
          }}
        >
          <div style={{ padding: "8px 14px 10px", display: "grid", gap: 6, borderBottom: "1px solid var(--border)" }}>
            {loading ? <span className={styles.label}>Yüklənir…</span> : null}
            {error ? <span className={styles.error}>{error}</span> : null}
            {data ? (
              <>
                <span className={styles.label}>Qrup: {data.group_name || "—"}</span>
                {data.subjects.length === 0 ? (
                  <span className={styles.label}>Fənn qrupuna qoşulmayıb.</span>
                ) : (
                  data.subjects.map((subject) => (
                    <span key={subject.course_id} style={{ fontSize: "0.9rem", color: "#1d2939" }}>
                      {subject.subject_name_az || subject.course_id}
                      <span className={styles.label} style={{ display: "block" }}>
                        {[
                          subject.education_group_name,
                          subject.credit ? `${subject.credit} kredit` : null,
                          subject.education_year_name,
                          subject.semester_name_az,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  ))
                )}
              </>
            ) : null}
          </div>
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
          <button type="button" className={styles.item} role="menuitem" disabled={busy} onClick={() => void onDelete()}>
            Sil
          </button>
        </div>
      ) : null}
    </div>
  );
}

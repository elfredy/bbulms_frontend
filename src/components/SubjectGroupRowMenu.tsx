"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SearchableSelect } from "./SearchableSelect";
import styles from "./SubjectGroupRowMenu.module.css";

type Opt = { id: string; name?: string | null; name_az?: string | null; org_name_az?: string | null };

async function readDetail(res: Response, fallback: string) {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function SubjectGroupRowMenu({
  courseId,
  organizationId,
  educationPlanSubjectId,
}: {
  courseId: string;
  organizationId?: string | null;
  educationPlanSubjectId?: string | null;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [teachers, setTeachers] = useState<Opt[]>([]);
  const [lessonTypes, setLessonTypes] = useState<Opt[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [lessonTypeId, setLessonTypeId] = useState("");
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!addOpen) return;
    let cancelled = false;
    const params = new URLSearchParams({ limit: "200" });
    if (organizationId) params.set("organization_id", organizationId);
    if (educationPlanSubjectId) params.set("education_plan_subject_id", educationPlanSubjectId);
    fetch(`/api/admin/education-plans/lookups/teachers?${params}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        if (!cancelled) setTeachers(d.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setTeachers([]);
      });
    fetch("/api/admin/subject-groups/lookups", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setLessonTypes(d.lesson_types ?? []);
        const seminar = (d.lesson_types ?? []).find((x: Opt) => (x.name_az || "").toLowerCase().includes("seminar"));
        setLessonTypeId((seminar?.id || d.lesson_types?.[0]?.id || "") as string);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [addOpen, organizationId, educationPlanSubjectId]);

  async function onDelete() {
    if (!window.confirm("Fənn qrupunu silmək istəyirsiniz?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/subject-groups/${encodeURIComponent(courseId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        setError(await readDetail(res, "Silinmədi"));
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onActivate() {
    if (!window.confirm("Jurnalı aktivləşdirmək istəyirsiniz?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/subject-groups/${encodeURIComponent(courseId)}/activate-journal`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setError(await readDetail(res, "Jurnal aktivləşdirilmədi"));
        return;
      }
      const data = await res.json().catch(() => null);
      setOpen(false);
      if (data?.warning) window.alert(String(data.warning));
      else window.alert("Jurnal aktivləşdirildi.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onAddTeacher() {
    if (!teacherId || !lessonTypeId) {
      setError("Müəllim və dərs növünü seçin.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${encodeURIComponent(courseId)}/assign-teacher`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teacher_id: teacherId, lesson_type_id: lessonTypeId }),
      });
      if (!res.ok) {
        setError(await readDetail(res, "Müəllim əlavə olunmadı"));
        return;
      }
      setAddOpen(false);
      setOpen(false);
      setTeacherId("");
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
        onClick={() => {
          setError(null);
          setOpen((v) => !v);
        }}
      >
        ☰
      </button>
      {open ? (
        <div
          className={styles.menu}
          role="menu"
          style={menuPos ? { top: menuPos.top, right: menuPos.right } : undefined}
        >
            <button
              type="button"
              className={styles.item}
              role="menuitem"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                router.push(`/${locale}/dashboard/admin/subject-groups/${encodeURIComponent(courseId)}/edit`);
              }}
            >
              Yenilə
            </button>
            <button
              type="button"
              className={styles.item}
              role="menuitem"
              disabled={busy}
              onClick={() => {
                setError(null);
                setOpen(false);
                setAddOpen(true);
              }}
            >
              Müəllim əlavə et
            </button>
            <button type="button" className={styles.item} role="menuitem" disabled={busy} onClick={() => void onDelete()}>
              Sil
            </button>
            <button type="button" className={styles.item} role="menuitem" disabled={busy} onClick={() => void onActivate()}>
              Jurnalın aktivləşdirilməsi
            </button>
            {error ? <p className={styles.error}>{error}</p> : null}
        </div>
      ) : null}

      {addOpen ? (
        <div className={styles.modal} role="dialog" aria-modal="true">
          <div className={styles.dialog}>
            <h3 className={styles.title}>Müəllim əlavə et</h3>
            <label className={styles.field}>
              <span className={styles.label}>Müəllim</span>
              <SearchableSelect
                value={teacherId}
                onChange={setTeacherId}
                placeholder="— seç —"
                searchPlaceholder="Axtar…"
                options={teachers.map((t) => ({
                  id: t.id,
                  label: t.org_name_az ? `${t.name || t.id} · ${t.org_name_az}` : t.name || t.id,
                }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Dərs növü</span>
              <select className={styles.select} value={lessonTypeId} onChange={(e) => setLessonTypeId(e.target.value)}>
                <option value="">— seç —</option>
                {lessonTypes.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name_az || o.name || o.id}
                  </option>
                ))}
              </select>
            </label>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.ghost}
                onClick={() => {
                  setAddOpen(false);
                  setError(null);
                }}
              >
                Bağla
              </button>
              <button type="button" className={styles.primary} disabled={busy} onClick={() => void onAddTeacher()}>
                {busy ? "Əlavə olunur…" : "Əlavə et"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

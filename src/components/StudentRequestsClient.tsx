"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import styles from "./StudentRequests.module.css";

type TeacherOpt = { teacher_id: string; teacher_name: string; lesson_type_az?: string | null };
type Target = {
  course_id: string;
  course_code?: string | null;
  subject_name_az?: string | null;
  teachers: TeacherOpt[];
};
type RequestItem = {
  id: string;
  course_id: string;
  teacher_id: string;
  message: string;
  reply?: string | null;
  status: string;
  created_at?: string;
  subject_name_az?: string | null;
  teacher_name?: string | null;
};

async function readDetail(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    /* ignore */
  }
  return fallback;
}

function statusLabel(status: string): string {
  if (status === "open") return "Açıq";
  if (status === "answered") return "Cavab var";
  return status;
}

function fmtWhen(v?: string): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 16);
  return d.toLocaleString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function StudentRequestsClient() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [courseId, setCourseId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [tRes, rRes] = await Promise.all([
        fetch("/api/student/requests/targets", { credentials: "include", cache: "no-store" }),
        fetch("/api/student/requests", { credentials: "include", cache: "no-store" }),
      ]);
      if (!tRes.ok) {
        setError(await readDetail(tRes, "Fənnlər yüklənmədi"));
        return;
      }
      if (!rRes.ok) {
        setError(await readDetail(rRes, "Müraciətlər yüklənmədi"));
        return;
      }
      const tData = await tRes.json();
      const rData = await rRes.json();
      setTargets(tData.items || []);
      setItems(rData.items || []);
    } catch {
      setError("Yüklənmədi");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const teachers = useMemo(() => {
    const t = targets.find((x) => x.course_id === courseId);
    return t?.teachers || [];
  }, [targets, courseId]);

  useEffect(() => {
    if (!teachers.length) {
      setTeacherId("");
      return;
    }
    if (!teachers.some((t) => t.teacher_id === teacherId)) {
      setTeacherId(teachers[0].teacher_id);
    }
  }, [teachers, teacherId]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/student/requests", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ course_id: courseId, teacher_id: teacherId, message }),
      });
      if (!res.ok) {
        setError(await readDetail(res, "Göndərilmədi"));
        return;
      }
      setMessage("");
      setOk("Müraciət göndərildi");
      await load();
    } catch {
      setError("Göndərilmədi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h2 className={styles.title}>Yeni müraciət</h2>
        <div className={styles.field}>
          <span className={styles.label}>Fənn</span>
          <select
            className={styles.select}
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            <option value="">Seçin</option>
            {targets.map((t) => (
              <option key={t.course_id} value={t.course_id}>
                {t.subject_name_az || t.course_code || t.course_id}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Müəllim</span>
          <select
            className={styles.select}
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            disabled={!teachers.length}
          >
            {!teachers.length ? <option value="">Əvvəl fənn seçin</option> : null}
            {teachers.map((t) => (
              <option key={t.teacher_id} value={t.teacher_id}>
                {t.teacher_name}
                {t.lesson_type_az ? ` (${t.lesson_type_az})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Mətn (maks. 300 simvol)</span>
          <textarea
            className={styles.textarea}
            value={message}
            maxLength={300}
            placeholder="Qısa yazın…"
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className={styles.meta}>{message.length}/300</p>
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}
        {ok ? <p className={styles.ok}>{ok}</p> : null}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={busy || !courseId || !teacherId || message.trim().length < 3}
            onClick={() => void submit()}
          >
            {busy ? "Göndərilir…" : "Göndər"}
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.title}>Müraciətlərim</h2>
        <div className={styles.list}>
          {!items.length ? <p className={styles.meta}>Hələ müraciət yoxdur.</p> : null}
          {items.map((it) => (
            <div key={it.id} className={styles.item}>
              <div className={styles.itemHead}>
                <p className={styles.subject}>{it.subject_name_az || "Fənn"}</p>
                <span className={it.status === "open" ? styles.badgeOpen : styles.badgeAnswered}>
                  {statusLabel(it.status)}
                </span>
              </div>
              <p className={styles.meta}>
                {it.teacher_name || "Müəllim"}
                {it.created_at ? ` · ${fmtWhen(it.created_at)}` : ""}
              </p>
              <p className={styles.msg}>{it.message}</p>
              {it.reply ? (
                <p className={styles.reply}>
                  <strong>Cavab:</strong> {it.reply}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "./TeacherExam.module.css";

type ExamItem = {
  id: string;
  course_id: string;
  course_code: string | null;
  subject_name_az: string | null;
  start_date: string | null;
  exam_status_az: string | null;
  student_count: number;
  course_close_status?: number;
};

type ScoreRow = { code: string; point: string };

async function readDetail(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function TeacherExamClient() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [examId, setExamId] = useState("");
  const [meta, setMeta] = useState<{
    exam_status_az?: string;
    course_code?: string | null;
    closed?: boolean;
  } | null>(null);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [points, setPoints] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setBusy(true);
      try {
        const res = await fetch("/api/teacher/exams", { credentials: "include", cache: "no-store" });
        if (!res.ok) {
          if (alive) setError(await readDetail(res, "İmtahan siyahısı yüklənmədi"));
          return;
        }
        const data = await res.json();
        if (!alive) return;
        const items: ExamItem[] = data.items || [];
        setExams(items);
        if (items.length && !examId) setExamId(items[0].id);
      } catch {
        if (alive) setError("İmtahan siyahısı yüklənmədi");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadScores = useCallback(async (id: string) => {
    if (!id) return;
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch(`/api/teacher/exams/${encodeURIComponent(id)}/anonymous-scores`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError(await readDetail(res, "Kodlar yüklənmədi"));
        setRows([]);
        return;
      }
      const data = await res.json();
      const items: ScoreRow[] = data.items || [];
      setRows(items);
      setMeta({
        exam_status_az: data.exam_status_az,
        course_code: data.course_code,
        closed: Boolean(data.closed),
      });
      const map: Record<string, string> = {};
      for (const r of items) map[r.code] = r.point || "";
      setPoints(map);
    } catch {
      setError("Kodlar yüklənmədi");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (examId) void loadScores(examId);
  }, [examId, loadScores]);

  const save = async () => {
    if (!examId || meta?.closed) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const scores = rows.map((r) => ({ code: r.code, point: points[r.code] ?? "" }));
      const res = await fetch(`/api/teacher/exams/${encodeURIComponent(examId)}/anonymous-scores`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores }),
      });
      if (!res.ok) {
        setError(await readDetail(res, "Ballar saxlanılmadı"));
        return;
      }
      const data = await res.json();
      setOkMsg(`${data.saved || 0} bal yadda saxlandı`);
    } catch {
      setError("Ballar saxlanılmadı");
    } finally {
      setSaving(false);
    }
  };

  const selected = exams.find((e) => e.id === examId);

  return (
    <div className={styles.wrap}>
      <div className={styles.main}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>
            {selected ? [selected.course_code, selected.subject_name_az].filter(Boolean).join(" — ") : "İmtahan balları"}
          </h2>
          <p className={styles.meta}>
            Tələbə adları göstərilmir. Hər kodun yanına bal yazın.
            {meta?.exam_status_az ? ` · ${meta.exam_status_az}` : ""}
          </p>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
        {okMsg ? <p className={styles.ok}>{okMsg}</p> : null}
        {meta?.closed ? <p className={styles.warn}>Jurnal bağlıdır — bal yazmaq olmaz.</p> : null}

        <div className={styles.gridCard}>
          <div className={styles.tableWrap}>
            {!examId ? (
              <p className={styles.empty}>Sağdan imtahan seçin.</p>
            ) : busy && rows.length === 0 ? (
              <p className={styles.empty}>Yüklənir…</p>
            ) : rows.length === 0 ? (
              <p className={styles.empty}>Kod tapılmadı.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>#</th>
                    <th className={styles.th}>Kod</th>
                    <th className={styles.th}>Bal</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.code} className={styles.row}>
                      <td className={`${styles.td} ${styles.tdCenter}`}>{i + 1}</td>
                      <td className={`${styles.td} ${styles.codeCell}`}>{r.code}</td>
                      <td className={`${styles.td} ${styles.tdCenter}`}>
                        <input
                          className={styles.scoreInput}
                          value={points[r.code] ?? ""}
                          disabled={Boolean(meta?.closed) || saving}
                          inputMode="decimal"
                          onChange={(e) =>
                            setPoints((prev) => ({
                              ...prev,
                              [r.code]: e.target.value,
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <button
          type="button"
          className={styles.btnPrimary}
          disabled={!examId || saving || Boolean(meta?.closed) || rows.length === 0}
          onClick={() => void save()}
        >
          {saving ? "Saxlanır…" : "Balları saxla"}
        </button>
      </div>

      <aside className={styles.side}>
        <h2 className={styles.sideTitle}>İmtahanlar</h2>
        <p className={styles.meta}>Admin tərəfindən yaradılmış, sizin fənn qruplarınızın imtahanları.</p>
        {exams.map((e) => (
          <button
            key={e.id}
            type="button"
            className={examId === e.id ? styles.examBtnActive : styles.examBtn}
            onClick={() => setExamId(e.id)}
          >
            <div>{e.subject_name_az || e.course_code || e.id}</div>
            <div className={styles.meta}>
              {e.course_code || ""} · {e.exam_status_az || ""} · {e.student_count} tələbə
              {e.start_date ? ` · ${e.start_date}` : ""}
            </div>
          </button>
        ))}
        {!exams.length && !busy ? (
          <p className={styles.meta}>Hələ imtahan yoxdur. Admin «İmtahan» modulundan yaratmalıdır.</p>
        ) : null}
      </aside>
    </div>
  );
}

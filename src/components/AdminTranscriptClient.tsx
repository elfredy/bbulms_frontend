"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SearchableSelect } from "@/components/SearchableSelect";

import styles from "./AdminTranscript.module.css";

type Opt = { id: string; name_az?: string | null; name?: string | null; faculty_id?: string | null };

type StudentOpt = { student_id: string; full_name: string; student_card_no?: string | null };

type TranscriptRow = {
  id: string;
  subject_name: string | null;
  credit: number | null;
  subject_code: string | null;
  eps_education_year: string | null;
  semester: string | null;
  before_point: string | null;
  exam_point: string | null;
  end_point: string | null;
  point_word: string | null;
};

type StudentHeader = {
  student_id: string;
  full_name: string;
  faculty_name?: string | null;
  speciality_name?: string | null;
  group_name?: string | null;
  student_card_no?: string | null;
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

function label(o: Opt): string {
  return o.name_az || o.name || o.id;
}

export function AdminTranscriptClient({
  locale,
  initialGroupId,
}: {
  locale: string;
  initialGroupId?: string;
}) {
  const [lookups, setLookups] = useState<{
    current_year_id: string | null;
    faculties: Opt[];
    specialties: Opt[];
    years: Opt[];
  } | null>(null);
  const [facultyId, setFacultyId] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [yearId, setYearId] = useState("");
  const [groupId, setGroupId] = useState(initialGroupId || "");
  const [groups, setGroups] = useState<Opt[]>([]);
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [studentId, setStudentId] = useState("");
  const [header, setHeader] = useState<StudentHeader | null>(null);
  const [rows, setRows] = useState<TranscriptRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/transcript/lookups", { credentials: "include", cache: "no-store" });
        if (!res.ok) {
          if (alive) setError(await readDetail(res, "Lookup yüklənmədi"));
          return;
        }
        const data = await res.json();
        if (!alive) return;
        setLookups(data);
        setYearId(data.current_year_id || "");
      } catch {
        if (alive) setError("Lookup yüklənmədi");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!lookups) return;
    let alive = true;
    (async () => {
      const params = new URLSearchParams();
      if (facultyId) params.set("faculty_id", facultyId);
      if (specialtyId) params.set("specialty_id", specialtyId);
      if (yearId) params.set("education_year_id", yearId);
      params.set("limit", "300");
      const res = await fetch(`/api/admin/transcript/groups?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!alive) return;
      if (!res.ok) {
        setGroups([]);
        return;
      }
      const data = await res.json();
      const items: Opt[] = (data.items || []).map((g: { id: string; name: string }) => ({
        id: g.id,
        name_az: g.name,
      }));
      setGroups(items);
      if (groupId && !items.some((g) => g.id === groupId)) {
        // keep initial group if not in filtered list
      }
    })();
    return () => {
      alive = false;
    };
  }, [lookups, facultyId, specialtyId, yearId, groupId]);

  useEffect(() => {
    if (!groupId) {
      setStudents([]);
      setStudentId("");
      setHeader(null);
      setRows([]);
      return;
    }
    let alive = true;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/transcript/students?education_group_id=${encodeURIComponent(groupId)}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!alive) return;
        if (!res.ok) {
          setError(await readDetail(res, "Tələbə siyahısı yüklənmədi"));
          setStudents([]);
          return;
        }
        const data = await res.json();
        const list: StudentOpt[] = data.items || [];
        setStudents(list);
        if (list.length && !list.some((s) => s.student_id === studentId)) {
          setStudentId(list[0].student_id);
        }
      } catch {
        if (alive) setError("Tələbə siyahısı yüklənmədi");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const loadTranscript = useCallback(async (sid: string) => {
    if (!sid) return;
    setBusy(true);
    setError(null);
    try {
      // Qrup yalnız tələbə seçimi üçündür; yekun transkript tələbənin bütün fənlərini göstərir.
      const res = await fetch(`/api/admin/transcript/students/${encodeURIComponent(sid)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError(await readDetail(res, "Transkript yüklənmədi"));
        setRows([]);
        setHeader(null);
        return;
      }
      const data = await res.json();
      setHeader(data.student || null);
      setRows(data.items || []);
    } catch {
      setError("Transkript yüklənmədi");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (studentId) void loadTranscript(studentId);
  }, [studentId, loadTranscript]);

  const downloadBlob = async (urlPath: string, filename: string, failMsg: string) => {
    const res = await fetch(urlPath, { credentials: "include", cache: "no-store" });
    if (!res.ok) {
      setError(await readDetail(res, failMsg));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportXlsx = async () => {
    if (!studentId) return;
    setExporting(true);
    setError(null);
    try {
      await downloadBlob(
        `/api/admin/transcript/students/${encodeURIComponent(studentId)}/export`,
        `transkript_${(header?.full_name || studentId).replace(/\s+/g, "_")}.xlsx`,
        "Export alınmadı",
      );
    } catch {
      setError("Export alınmadı");
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    if (!studentId) return;
    setExportingPdf(true);
    setError(null);
    try {
      await downloadBlob(
        `/api/admin/transcript/students/${encodeURIComponent(studentId)}/export.pdf`,
        `transkript_${(header?.full_name || studentId).replace(/\s+/g, "_")}.pdf`,
        "PDF alınmadı",
      );
    } catch {
      setError("PDF alınmadı");
    } finally {
      setExportingPdf(false);
    }
  };

  const specialtyOpts = useMemo(() => {
    const all = lookups?.specialties || [];
    const filtered = facultyId ? all.filter((s) => s.faculty_id === facultyId) : all;
    return filtered.map((o) => ({ id: o.id, label: label(o) }));
  }, [lookups, facultyId]);

  const facultyOpts = useMemo(
    () => (lookups?.faculties || []).map((o) => ({ id: o.id, label: label(o) })),
    [lookups],
  );
  const yearOpts = useMemo(
    () => (lookups?.years || []).map((o) => ({ id: o.id, label: label(o) })),
    [lookups],
  );
  const groupOpts = useMemo(() => groups.map((o) => ({ id: o.id, label: label(o) })), [groups]);

  void locale;

  return (
    <div className={styles.wrap}>
      <div className={styles.main}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.docKicker}>Bakı Biznes Universiteti</p>
            <h2 className={styles.studentTitle}>Tələbə transkripti</h2>
            {header ? (
              <div className={styles.docMeta}>
                <div>
                  <span>Tələbə</span>
                  <strong>{header.full_name}</strong>
                </div>
                <div>
                  <span>Fakültə</span>
                  <strong>{header.faculty_name || "—"}</strong>
                </div>
                <div>
                  <span>İxtisas</span>
                  <strong>{header.speciality_name || "—"}</strong>
                </div>
                <div>
                  <span>Qrup</span>
                  <strong>{header.group_name || "—"}</strong>
                </div>
                <div>
                  <span>Tələbə bileti</span>
                  <strong>{header.student_card_no || "—"}</strong>
                </div>
              </div>
            ) : (
              <p className={styles.meta}>Sağdan fakültə / ixtisas / akademik qrup və tələbə seçin.</p>
            )}
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={!studentId || exportingPdf || rows.length === 0}
              onClick={() => void exportPdf()}
            >
              {exportingPdf ? "PDF…" : "PDF export"}
            </button>
            <button
              type="button"
              className={styles.btn}
              disabled={!studentId || exporting || rows.length === 0}
              onClick={() => void exportXlsx()}
            >
              {exporting ? "Export…" : "Excel export"}
            </button>
          </div>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.gridCard}>
          <div className={styles.tableWrap}>
            {!studentId ? (
              <p className={styles.empty}>Tələbə seçin.</p>
            ) : busy && rows.length === 0 ? (
              <p className={styles.empty}>Yüklənir…</p>
            ) : rows.length === 0 ? (
              <p className={styles.empty}>Transkript sətiri yoxdur.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>#</th>
                    <th className={styles.th}>Fənn</th>
                    <th className={styles.th}>Kredit</th>
                    <th className={styles.th}>Fənn qrupunun kodu</th>
                    <th className={styles.th}>Tədris ili</th>
                    <th className={styles.th}>Semestr</th>
                    <th className={styles.th}>İmtahanqabağı bal</th>
                    <th className={styles.th}>İmtahan balı</th>
                    <th className={styles.th}>Yekun bal</th>
                    <th className={styles.th}>Qiymət</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id || `${r.subject_code}-${i}`} className={styles.row}>
                      <td className={`${styles.td} ${styles.tdCenter}`}>{i + 1}</td>
                      <td className={styles.td}>{r.subject_name || "—"}</td>
                      <td className={`${styles.td} ${styles.tdCenter}`}>{r.credit ?? "—"}</td>
                      <td className={styles.td}>{r.subject_code || "—"}</td>
                      <td className={`${styles.td} ${styles.tdCenter}`}>{r.eps_education_year || "—"}</td>
                      <td className={`${styles.td} ${styles.tdCenter}`}>{r.semester || "—"}</td>
                      <td className={`${styles.td} ${styles.tdCenter}`}>{r.before_point || "0"}</td>
                      <td className={`${styles.td} ${styles.tdCenter}`}>{r.exam_point || "0"}</td>
                      <td className={`${styles.td} ${styles.tdCenter}`}>{r.end_point || "0"}</td>
                      <td className={`${styles.td} ${styles.tdCenter}`}>{r.point_word || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <aside className={styles.side}>
        <h2 className={styles.sideTitle}>Filter</h2>
        <div className={styles.field}>
          <span className={styles.label}>Fakültə</span>
          <SearchableSelect
            value={facultyId}
            options={[{ id: "", label: "Hamısı" }, ...facultyOpts]}
            onChange={(id) => {
              setFacultyId(id);
              setSpecialtyId("");
              setGroupId("");
            }}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.label}>İxtisas</span>
          <SearchableSelect
            value={specialtyId}
            options={[{ id: "", label: "Hamısı" }, ...specialtyOpts]}
            onChange={(id) => {
              setSpecialtyId(id);
              setGroupId("");
            }}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Tədris ili</span>
          <SearchableSelect
            value={yearId}
            options={[{ id: "", label: "Hamısı" }, ...yearOpts]}
            onChange={(id) => {
              setYearId(id);
              setGroupId("");
            }}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Akademik qrup</span>
          <SearchableSelect
            value={groupId}
            options={groupOpts}
            onChange={(id) => setGroupId(id)}
            placeholder="Qrup seçin"
          />
        </div>

        {groupId ? (
          <>
            <p className={styles.meta}>Tələbələr ({students.length})</p>
            <div className={styles.studentList}>
              {students.map((s, i) => (
                <button
                  key={s.student_id}
                  type="button"
                  className={studentId === s.student_id ? styles.studentBtnActive : styles.studentBtn}
                  onClick={() => setStudentId(s.student_id)}
                >
                  {i + 1}. {s.full_name}
                </button>
              ))}
              {!students.length && !busy ? <p className={styles.meta}>Tələbə yoxdur.</p> : null}
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}

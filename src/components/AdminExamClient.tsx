"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SearchableSelect } from "@/components/SearchableSelect";

import styles from "./AdminExam.module.css";

type Opt = { id: string; name_az?: string | null; code?: string | null; name?: string | null };

type ExamRow = {
  id: string;
  type_name_az: string | null;
  code: string | null;
  subject_name_az: string | null;
  start_date: string | null;
  start_end_time: string | null;
  duration: number;
  exam_status_az: string | null;
  room_name: string | null;
  int_exam_type_name_az: string | null;
  student_count: number;
  repetition: number;
};

type CourseOpt = {
  id: string;
  code: string | null;
  subject_name_az: string | null;
  faculty_name_az: string | null;
};

type StudentOpt = {
  student_id: string;
  full_name: string;
  status_name_az: string | null;
  enter_code?: string | null;
  point?: string;
};

type Lookups = {
  current_year_id: string | null;
  exam_types: Opt[];
  int_exam_types: Opt[];
  rooms: Opt[];
  faculties: Opt[];
  years: Opt[];
  semesters: Opt[];
  defaults: { type_id: string; int_exam_type: string; repetition: number };
};

type Mode = "filters" | "create" | "scores";

async function readDetail(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) return data.detail.map((d: { msg?: string }) => d.msg || "").filter(Boolean).join("; ") || fallback;
  } catch {
    /* ignore */
  }
  return fallback;
}

function optLabel(o: Opt): string {
  return o.name_az || o.name || o.code || o.id;
}

function courseLabel(c: CourseOpt): string {
  return [c.code, c.subject_name_az].filter(Boolean).join(" — ") || c.id;
}

function todayDmy(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baku",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date());
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const y = parts.find((p) => p.type === "year")?.value ?? "2026";
  return `${d}/${m}/${y}`;
}

export function AdminExamClient({ locale }: { locale: string }) {
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [facultyId, setFacultyId] = useState("");
  const [yearId, setYearId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [repetitionFilter, setRepetitionFilter] = useState("");
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<ExamRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("filters");
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // create form
  const [cTypeId, setCTypeId] = useState("");
  const [cFacultyId, setCFacultyId] = useState("");
  const [cYearId, setCYearId] = useState("");
  const [cSemesterId, setCSemesterId] = useState("");
  const [cCourseId, setCCourseId] = useState("");
  const [cRoomId, setCRoomId] = useState("");
  const [cIntType, setCIntType] = useState("");
  const [cRepetition, setCRepetition] = useState("0");
  const [cStartDate, setCStartDate] = useState(todayDmy());
  const [cStartTime, setCStartTime] = useState("00:00");
  const [cEndTime, setCEndTime] = useState("00:00");
  const [cDuration, setCDuration] = useState("0");
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [courseStudents, setCourseStudents] = useState<StudentOpt[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // scores
  const [scoreStudents, setScoreStudents] = useState<StudentOpt[]>([]);
  const [scorePoints, setScorePoints] = useState<Record<string, string>>({});
  const [scoreMeta, setScoreMeta] = useState<{ exam_status_az?: string; course_id?: string } | null>(null);

  const pageSize = 50;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/exams/lookups", { credentials: "include", cache: "no-store" });
        if (!res.ok) {
          if (alive) setError(await readDetail(res, "Lookup yüklənmədi"));
          return;
        }
        const data = (await res.json()) as Lookups;
        if (!alive) return;
        setLookups(data);
        setYearId(data.current_year_id || "");
        setCYearId(data.current_year_id || "");
        setCTypeId(data.defaults?.type_id || data.exam_types[0]?.id || "");
        setCIntType(data.defaults?.int_exam_type || data.int_exam_types[0]?.id || "");
        const korpus = data.rooms.find((r) => (r.name_az || "").toLowerCase().includes("korpus 1"));
        setCRoomId(korpus?.id || data.rooms[0]?.id || "");
      } catch {
        if (alive) setError("Lookup yüklənmədi");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loadList = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (facultyId) params.set("faculty_id", facultyId);
      if (yearId) params.set("education_year_id", yearId);
      if (semesterId) params.set("semester_id", semesterId);
      if (typeId) params.set("type_id", typeId);
      if (repetitionFilter !== "") params.set("repetition", repetitionFilter);
      if (q) params.set("q", q);
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      const res = await fetch(`/api/admin/exams?${params}`, { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        setError(await readDetail(res, "İmtahan siyahısı yüklənmədi"));
        setItems([]);
        return;
      }
      const data = await res.json();
      setItems(data.items || []);
      setTotal(Number(data.total) || 0);
    } catch {
      setError("İmtahan siyahısı yüklənmədi");
      setItems([]);
    } finally {
      setBusy(false);
    }
  }, [facultyId, yearId, semesterId, typeId, repetitionFilter, q, page]);

  useEffect(() => {
    if (!lookups) return;
    void loadList();
  }, [lookups, loadList]);

  useEffect(() => {
    if (mode !== "create" || !cYearId) return;
    let alive = true;
    (async () => {
      const params = new URLSearchParams();
      if (cFacultyId) params.set("faculty_id", cFacultyId);
      if (cYearId) params.set("education_year_id", cYearId);
      if (cSemesterId) params.set("semester_id", cSemesterId);
      params.set("limit", "200");
      const res = await fetch(`/api/admin/exams/courses?${params}`, { credentials: "include", cache: "no-store" });
      if (!alive) return;
      if (!res.ok) {
        setCourses([]);
        return;
      }
      const data = await res.json();
      setCourses(data.items || []);
    })();
    return () => {
      alive = false;
    };
  }, [mode, cFacultyId, cYearId, cSemesterId]);

  useEffect(() => {
    if (mode !== "create" || !cCourseId) {
      setCourseStudents([]);
      setSelectedStudents(new Set());
      return;
    }
    let alive = true;
    (async () => {
      const res = await fetch(`/api/admin/exams/courses/${cCourseId}/students`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!alive) return;
      if (!res.ok) {
        setCourseStudents([]);
        return;
      }
      const data = await res.json();
      const list: StudentOpt[] = data.items || [];
      setCourseStudents(list);
      setSelectedStudents(new Set(list.map((s) => s.student_id)));
    })();
    return () => {
      alive = false;
    };
  }, [mode, cCourseId]);

  const openCreate = () => {
    setMode("create");
    setSelectedExamId(null);
    setOkMsg(null);
    setError(null);
    setCStartDate(todayDmy());
    setCRepetition("0");
    setCCourseId("");
    if (lookups) {
      setCTypeId(lookups.defaults?.type_id || lookups.exam_types[0]?.id || "");
      setCIntType(lookups.defaults?.int_exam_type || lookups.int_exam_types[0]?.id || "");
      setCYearId(lookups.current_year_id || yearId || "");
    }
  };

  const openScores = async (examId: string) => {
    setMode("scores");
    setSelectedExamId(examId);
    setOkMsg(null);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/exams/${examId}/scores`, { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        setError(await readDetail(res, "Ballar yüklənmədi"));
        return;
      }
      const data = await res.json();
      const list: StudentOpt[] = data.items || [];
      setScoreStudents(list);
      setScoreMeta({ exam_status_az: data.exam_status_az, course_id: data.course_id });
      const pts: Record<string, string> = {};
      for (const s of list) pts[s.student_id] = s.point || "";
      setScorePoints(pts);
    } catch {
      setError("Ballar yüklənmədi");
    } finally {
      setBusy(false);
    }
  };

  const submitCreate = async () => {
    if (!cTypeId || !cCourseId || !cRoomId || !cIntType || !cStartDate) {
      setError("Məcburi sahələri doldurun");
      return;
    }
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/admin/exams", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type_id: cTypeId,
          course_id: cCourseId,
          room_id: cRoomId,
          int_exam_type: cIntType,
          start_date: cStartDate,
          start_time: cStartTime || "00:00",
          end_time: cEndTime || "00:00",
          duration: Number(cDuration) || 0,
          repetition: Number(cRepetition) || 0,
          student_ids: Array.from(selectedStudents),
        }),
      });
      if (!res.ok) {
        setError(await readDetail(res, "İmtahan yaradılmadı"));
        return;
      }
      const data = await res.json();
      setOkMsg(`İmtahan əlavə olundu (${data.student_count || 0} tələbə)`);
      setMode("filters");
      setPage(1);
      await loadList();
      if (data.id) void openScores(String(data.id));
    } catch {
      setError("İmtahan yaradılmadı");
    } finally {
      setSaving(false);
    }
  };

  const submitScores = async () => {
    if (!selectedExamId) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const scores = scoreStudents.map((s) => ({
        student_id: s.student_id,
        point: scorePoints[s.student_id] ?? "",
      }));
      const res = await fetch(`/api/admin/exams/${selectedExamId}/scores`, {
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

  const deleteExam = async (examId: string) => {
    if (!window.confirm("İmtahanı silmək istəyirsiniz?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/exams/${examId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        setError(await readDetail(res, "Silinmədi"));
        return;
      }
      if (selectedExamId === examId) {
        setMode("filters");
        setSelectedExamId(null);
      }
      setOkMsg("İmtahan silindi");
      await loadList();
    } catch {
      setError("Silinmədi");
    } finally {
      setBusy(false);
    }
  };

  const facultyOpts = useMemo(
    () => (lookups?.faculties || []).map((o) => ({ id: o.id, label: optLabel(o) })),
    [lookups],
  );
  const yearOpts = useMemo(
    () => (lookups?.years || []).map((o) => ({ id: o.id, label: optLabel(o) })),
    [lookups],
  );
  const semesterOpts = useMemo(
    () => (lookups?.semesters || []).map((o) => ({ id: o.id, label: optLabel(o) })),
    [lookups],
  );
  const typeOpts = useMemo(
    () => (lookups?.exam_types || []).map((o) => ({ id: o.id, label: optLabel(o) })),
    [lookups],
  );
  const intTypeOpts = useMemo(
    () => (lookups?.int_exam_types || []).map((o) => ({ id: o.id, label: optLabel(o) })),
    [lookups],
  );
  const roomOpts = useMemo(
    () => (lookups?.rooms || []).map((o) => ({ id: o.id, label: optLabel(o) })),
    [lookups],
  );
  const courseOpts = useMemo(
    () => courses.map((c) => ({ id: c.id, label: courseLabel(c) })),
    [courses],
  );

  const allSelected = courseStudents.length > 0 && selectedStudents.size === courseStudents.length;

  void locale;

  return (
    <div className={styles.wrap}>
      <div className={styles.main}>
        <div className={styles.toolbar}>
          <div className={styles.field}>
            <span className={styles.label}>Fakültə</span>
            <SearchableSelect
              value={facultyId}
              options={[{ id: "", label: "Hamısı" }, ...facultyOpts]}
              onChange={(id) => {
                setFacultyId(id);
                setPage(1);
              }}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Tədris ili</span>
            <SearchableSelect
              value={yearId}
              options={yearOpts}
              onChange={(id) => {
                setYearId(id);
                setPage(1);
              }}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Semestr</span>
            <SearchableSelect
              value={semesterId}
              options={[{ id: "", label: "Hamısı" }, ...semesterOpts]}
              onChange={(id) => {
                setSemesterId(id);
                setPage(1);
              }}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Növ</span>
            <SearchableSelect
              value={typeId}
              options={[{ id: "", label: "Hamısı" }, ...typeOpts]}
              onChange={(id) => {
                setTypeId(id);
                setPage(1);
              }}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Status</span>
            <select
              className={styles.select}
              value={repetitionFilter}
              onChange={(e) => {
                setRepetitionFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Hamısı</option>
              <option value="0">Əsas</option>
              <option value="1">Təkrar</option>
            </select>
          </div>
          <div className={styles.fieldGrow}>
            <span className={styles.label}>Axtarış</span>
            <input
              className={styles.input}
              value={qDraft}
              placeholder="Kod / fənn / otaq"
              onChange={(e) => setQDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setQ(qDraft.trim());
                  setPage(1);
                }
              }}
            />
          </div>
          <div className={styles.toolbarActions}>
            <button
              type="button"
              className={styles.btn}
              onClick={() => {
                setQ(qDraft.trim());
                setPage(1);
              }}
            >
              Axtar
            </button>
            <button type="button" className={styles.btnPrimary} onClick={openCreate}>
              İmtahan əlavə et
            </button>
          </div>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
        {okMsg ? <p className={styles.ok}>{okMsg}</p> : null}

        <div className={styles.gridCard}>
          <div className={styles.tableWrap}>
            {!lookups || (busy && items.length === 0) ? (
              <p className={styles.empty}>Yüklənir…</p>
            ) : items.length === 0 ? (
              <p className={styles.empty}>İmtahan tapılmadı.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={`${styles.th} ${styles.tdNum}`}>#</th>
                    <th className={styles.th}>Növü</th>
                    <th className={styles.th}>Kod</th>
                    <th className={styles.th}>Başlama</th>
                    <th className={styles.th}>Saat</th>
                    <th className={styles.th}>Otaq</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Tələbə</th>
                    <th className={styles.th} />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`${styles.row} ${selectedExamId === row.id ? styles.rowActive : ""}`}
                    >
                      <td className={`${styles.td} ${styles.tdNum}`}>{(page - 1) * pageSize + idx + 1}</td>
                      <td className={styles.td}>{row.type_name_az || "—"}</td>
                      <td className={styles.td}>
                        <div>{row.code || "—"}</div>
                        <div className={styles.meta}>{row.subject_name_az}</div>
                      </td>
                      <td className={styles.td}>{row.start_date || "—"}</td>
                      <td className={styles.td}>{row.start_end_time || "—"}</td>
                      <td className={styles.td}>{row.room_name || "—"}</td>
                      <td className={styles.td}>
                        <span className={row.repetition === 1 ? styles.badgeRepeat : styles.badgeMain}>
                          {row.exam_status_az || (row.repetition === 1 ? "Təkrar" : "Əsas")}
                        </span>
                      </td>
                      <td className={styles.td}>{row.student_count}</td>
                      <td className={styles.td}>
                        <button type="button" className={styles.linkBtn} onClick={() => void openScores(row.id)}>
                          Ballar
                        </button>
                        {" · "}
                        <button type="button" className={styles.linkBtn} onClick={() => void deleteExam(row.id)}>
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className={styles.pager}>
          <button
            type="button"
            className={styles.btn}
            disabled={page <= 1 || busy}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Əvvəlki
          </button>
          <span className={styles.meta}>
            Səhifə {page} / {lastPage} · {total} imtahan
          </span>
          <button
            type="button"
            className={styles.btn}
            disabled={page >= lastPage || busy}
            onClick={() => setPage((p) => p + 1)}
          >
            Növbəti
          </button>
        </div>
      </div>

      <aside className={styles.side}>
        {mode === "create" ? (
          <>
            <h2 className={styles.sideTitle}>İmtahan əlavə et</h2>
            <div className={styles.field}>
              <span className={styles.label}>İmtahan növü *</span>
              <SearchableSelect value={cTypeId} options={typeOpts} onChange={setCTypeId} />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Fakültə</span>
              <SearchableSelect
                value={cFacultyId}
                options={[{ id: "", label: "Hamısı" }, ...facultyOpts]}
                onChange={(id) => {
                  setCFacultyId(id);
                  setCCourseId("");
                }}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Tədris ili *</span>
              <SearchableSelect
                value={cYearId}
                options={yearOpts}
                onChange={(id) => {
                  setCYearId(id);
                  setCCourseId("");
                }}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Semestr *</span>
              <SearchableSelect
                value={cSemesterId}
                options={[{ id: "", label: "— seç —" }, ...semesterOpts]}
                onChange={(id) => {
                  setCSemesterId(id);
                  setCCourseId("");
                }}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Fənn qrupu *</span>
              <SearchableSelect
                value={cCourseId}
                options={courseOpts}
                onChange={setCCourseId}
                placeholder="Fənn qrupu seçin"
              />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Otaq *</span>
              <SearchableSelect value={cRoomId} options={roomOpts} onChange={setCRoomId} />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>İmtahanın növü *</span>
              <SearchableSelect value={cIntType} options={intTypeOpts} onChange={setCIntType} />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Status</span>
              <select className={styles.select} value={cRepetition} onChange={(e) => setCRepetition(e.target.value)}>
                <option value="0">Əsas</option>
                <option value="1">Təkrar</option>
              </select>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Başlama tarixi *</span>
              <input className={styles.input} value={cStartDate} onChange={(e) => setCStartDate(e.target.value)} placeholder="DD/MM/YYYY" />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Başlama / bitmə</span>
              <div style={{ display: "flex", gap: 6 }}>
                <input className={styles.input} value={cStartTime} onChange={(e) => setCStartTime(e.target.value)} />
                <input className={styles.input} value={cEndTime} onChange={(e) => setCEndTime(e.target.value)} />
              </div>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Müddət (dəq)</span>
              <input className={styles.input} value={cDuration} onChange={(e) => setCDuration(e.target.value)} />
            </div>

            {cCourseId ? (
              <>
                <label className={styles.checkAll}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedStudents(new Set(courseStudents.map((s) => s.student_id)));
                      else setSelectedStudents(new Set());
                    }}
                  />
                  Tələbələr ({selectedStudents.size}/{courseStudents.length})
                </label>
                <div className={styles.studentList}>
                  {courseStudents.map((s, i) => (
                    <label key={s.student_id} className={styles.studentRow}>
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(s.student_id)}
                        onChange={(e) => {
                          setSelectedStudents((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(s.student_id);
                            else next.delete(s.student_id);
                            return next;
                          });
                        }}
                      />
                      <span>
                        {i + 1}. {s.full_name}
                      </span>
                      <span className={styles.meta}>{s.status_name_az || ""}</span>
                    </label>
                  ))}
                </div>
              </>
            ) : null}

            <div className={styles.actions}>
              <button type="button" className={styles.btnPrimary} disabled={saving} onClick={() => void submitCreate()}>
                {saving ? "Saxlanır…" : "Saxla"}
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={() => {
                  setMode("filters");
                  setError(null);
                }}
              >
                Geri
              </button>
            </div>
          </>
        ) : mode === "scores" && selectedExamId ? (
          <>
            <h2 className={styles.sideTitle}>İmtahan balları</h2>
            <p className={styles.meta}>
              {scoreMeta?.exam_status_az || "—"} · {scoreStudents.length} tələbə
              <br />
              Əsas → jurnal EVA_03 · Təkrar → repeat_exam
            </p>
            <p className={styles.meta}>Kod yalnız admində görünür; müəllim yalnız kodla yazır.</p>
            <div className={styles.studentList} style={{ maxHeight: "52vh" }}>
              {scoreStudents.map((s, i) => (
                <div key={s.student_id} className={styles.studentRow} style={{ gridTemplateColumns: "22px 72px 1fr 72px" }}>
                  <span className={styles.meta}>{i + 1}</span>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 800, fontSize: "0.75rem" }}>
                    {s.enter_code || "—"}
                  </span>
                  <span>{s.full_name}</span>
                  <input
                    className={styles.scoreInput}
                    value={scorePoints[s.student_id] ?? ""}
                    onChange={(e) =>
                      setScorePoints((prev) => ({
                        ...prev,
                        [s.student_id]: e.target.value,
                      }))
                    }
                    inputMode="decimal"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.btnPrimary} disabled={saving} onClick={() => void submitScores()}>
                {saving ? "Saxlanır…" : "Balları saxla"}
              </button>
              <button
                type="button"
                className={styles.btn}
                onClick={() => {
                  if (!selectedExamId) return;
                  void (async () => {
                    try {
                      const res = await fetch(
                        `/api/admin/exams/${encodeURIComponent(selectedExamId)}/scores/export`,
                        { credentials: "include", cache: "no-store" },
                      );
                      if (!res.ok) {
                        setError(await readDetail(res, "Export alınmadı"));
                        return;
                      }
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `imtahan_kodlar_${selectedExamId}.xlsx`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch {
                      setError("Export alınmadı");
                    }
                  })();
                }}
              >
                Excel (kodlar)
              </button>
              <button
                type="button"
                className={styles.btn}
                onClick={() => {
                  setMode("filters");
                  setSelectedExamId(null);
                }}
              >
                Geri
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.sideTitle}>İmtahan</h2>
            <p className={styles.meta}>
              Siyahıdan imtahan seçib balları əl ilə daxil edin, və ya yeni imtahan əlavə edin.
            </p>
            <button type="button" className={styles.btnPrimary} onClick={openCreate}>
              İmtahan əlavə et
            </button>
          </>
        )}
      </aside>
    </div>
  );
}

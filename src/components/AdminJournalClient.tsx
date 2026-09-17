"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SearchableSelect } from "@/components/SearchableSelect";
import { fmtClockRange } from "@/lib/clock-time";

import styles from "./AdminJournal.module.css";

type Opt = { id: string; name_az?: string | null; code?: string | null; faculty_id?: string | null; name?: string | null };
type CourseOpt = {
  id: string;
  code: string | null;
  subject_name_az: string | null;
  specialty_name_az: string | null;
  status_name_az: string | null;
};
type Meeting = {
  course_meeting_id: string;
  meeting_date: string | null;
  start_time: string | null;
  end_time: string | null;
  point_status: string | null;
  lesson_type_id: string | null;
  lesson_type_az: string | null;
  confirmed?: boolean;
};
type Student = { student_id: string; person_fullname: string; qb_count: number; half_group_az?: string | null };
type Eva = { course_eva_id: string; evaluation_code: string | null; evaluation_name_az: string | null };
type Cell = {
  student_id: string;
  course_eva_id: string;
  course_meeting_id: string;
  evaluation_code: string | null;
  value: string | null;
};
type Grid = {
  course: {
    id: string;
    code: string | null;
    subject_name_az: string | null;
    status_name_az: string | null;
    journal_activated?: boolean;
  };
  students: Student[];
  meetings: Meeting[];
  evaluations: Eva[];
  cells: Cell[];
};

const WINDOW_SIZE = 7;
const STATUS_CONFIRMED = "110000058";
const ATTENDANCE_CODES = new Set(["i.e", "q.b", "qb", "q.iş", "ü.z"]);

function isQb(raw: string | null | undefined): boolean {
  const s = String(raw ?? "").trim().toLowerCase().replace(/\s+/g, "");
  return s === "q.b" || s === "qb";
}

function parseNum(v: string | null | undefined): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function lessonTypeShort(m: Meeting): string | null {
  const id = String(m.lesson_type_id ?? "").trim();
  if (id === "110000111") return "M";
  if (id === "110000112") return "S";
  if (id === "110000113") return "L";
  const name = String(m.lesson_type_az ?? "").trim().toLowerCase();
  if (name.startsWith("müha") || name.startsWith("muha")) return "M";
  if (name.startsWith("sem")) return "S";
  if (name.startsWith("lab")) return "L";
  return null;
}

function cellTone(value: string): string {
  const v = value.trim();
  if (!v) return styles.cellEmpty;
  const s = v.toLowerCase();
  if (ATTENDANCE_CODES.has(s) || isQb(v)) {
    if (isQb(v)) return styles.cellNeutral;
    return styles.cellGood;
  }
  const n = parseNum(v);
  if (n == null) return styles.cellNeutral;
  if (n >= 8) return styles.cellGood;
  if (n >= 6) return styles.cellWarn;
  return styles.cellNeutral;
}

function courseLabel(c: CourseOpt): string {
  return [c.code, c.subject_name_az].filter(Boolean).join(" — ") || c.id;
}

export function AdminJournalClient({
  initialCourseId,
}: {
  locale: string;
  initialCourseId?: string;
}) {
  const [lookups, setLookups] = useState<{
    current_year_id: string | null;
    faculties: Opt[];
    specialties: Opt[];
    years: Opt[];
    semesters: Opt[];
    course_types: Opt[];
  } | null>(null);
  const [facultyId, setFacultyId] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [yearId, setYearId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [courseTypeId, setCourseTypeId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groups, setGroups] = useState<Opt[]>([]);
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [courseId, setCourseId] = useState(initialCourseId ?? "");
  const [grid, setGrid] = useState<Grid | null>(null);
  const [windowStart, setWindowStart] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [halfFilter, setHalfFilter] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/journal/lookups", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        setLookups(data);
        const year = data.years?.find((y: Opt) => y.id === data.current_year_id) ?? data.years?.[0];
        const sem = data.semesters?.find((s: Opt) => (s.code || "").toUpperCase() === "PY") ?? data.semesters?.[0];
        const fac =
          data.faculties?.find((f: Opt) => (f.name_az || "").toLowerCase().includes("biznes")) ?? data.faculties?.[0];
        const ctype =
          data.course_types?.find((t: Opt) => (t.name_az || "").toLowerCase().includes("əsas")) ?? data.course_types?.[0];
        if (year?.id) setYearId(year.id);
        if (sem?.id) setSemesterId(sem.id);
        if (fac?.id) setFacultyId(fac.id);
        if (ctype?.id) setCourseTypeId(ctype.id);
      })
      .catch(() => {
        if (alive) setError("Filterlər yüklənmədi");
      });
    return () => {
      alive = false;
    };
  }, []);

  const specialties = useMemo(() => {
    const all = lookups?.specialties ?? [];
    if (!facultyId) return all;
    return all.filter((s) => s.faculty_id === facultyId);
  }, [lookups, facultyId]);

  useEffect(() => {
    if (specialtyId && !specialties.some((s) => s.id === specialtyId)) setSpecialtyId("");
  }, [specialties, specialtyId]);

  useEffect(() => {
    setGroupId("");
    setGroups([]);
    if (!yearId) return;
    const params = new URLSearchParams();
    if (facultyId) params.set("faculty_id", facultyId);
    if (specialtyId) params.set("specialty_id", specialtyId);
    params.set("education_year_id", yearId);
    let alive = true;
    fetch(`/api/admin/journal/groups?${params}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive) return;
        setGroups(data?.items ?? []);
      });
    return () => {
      alive = false;
    };
  }, [facultyId, specialtyId, yearId]);

  useEffect(() => {
    if (!yearId) {
      setCourses([]);
      return;
    }
    const params = new URLSearchParams();
    params.set("education_year_id", yearId);
    if (facultyId) params.set("faculty_id", facultyId);
    if (specialtyId) params.set("specialty_id", specialtyId);
    if (semesterId) params.set("semester_id", semesterId);
    if (courseTypeId) params.set("course_type_id", courseTypeId);
    if (groupId) params.set("education_group_id", groupId);
    let alive = true;
    fetch(`/api/admin/journal/courses?${params}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive) return;
        const items = (data?.items ?? []) as CourseOpt[];
        setCourses(items);
      });
    return () => {
      alive = false;
    };
  }, [facultyId, specialtyId, yearId, semesterId, courseTypeId, groupId]);

  const loadGrid = useCallback(async (id: string) => {
    if (!id) {
      setGrid(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/journal/courses/${encodeURIComponent(id)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setGrid(null);
        setError("Jurnal yüklənmədi");
        return;
      }
      const data = (await res.json()) as Grid;
      setGrid(data);
      setWindowStart(0);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadGrid(courseId);
    setHalfFilter("");
    if (!courseId || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("course_id", courseId);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [courseId, loadGrid]);

  const courseOptions = useMemo(() => {
    const list = [...courses];
    if (courseId && grid?.course?.id === courseId && !list.some((c) => c.id === courseId)) {
      list.unshift({
        id: courseId,
        code: grid.course.code,
        subject_name_az: grid.course.subject_name_az,
        specialty_name_az: null,
        status_name_az: grid.course.status_name_az,
      });
    }
    return list;
  }, [courses, courseId, grid]);

  const evaAttendance = useMemo(
    () => (grid?.evaluations ?? []).filter((e) => (e.evaluation_code ?? "").trim().toUpperCase() === "EVA_01"),
    [grid],
  );
  const evaSeminar = useMemo(
    () => (grid?.evaluations ?? []).filter((e) => (e.evaluation_code ?? "").trim().toUpperCase() === "EVA_02"),
    [grid],
  );

  const halfOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of grid?.students ?? []) {
      const name = String(s.half_group_az ?? "").trim();
      if (name) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "az"));
  }, [grid]);

  const visibleStudents = useMemo(() => {
    const list = grid?.students ?? [];
    if (!halfFilter) return list;
    return list.filter((s) => String(s.half_group_az ?? "").trim() === halfFilter);
  }, [grid, halfFilter]);

  const cellMap = useMemo(() => {
    const m = new Map<string, Cell>();
    for (const c of grid?.cells ?? []) {
      m.set(`${c.course_meeting_id}:${c.student_id}:${c.course_eva_id}`, c);
    }
    return m;
  }, [grid]);

  function displayValue(studentId: string, meetingId: string): string {
    const evaA = evaAttendance[0];
    const evaS = evaSeminar[0];
    const vS = evaS ? cellMap.get(`${meetingId}:${studentId}:${evaS.course_eva_id}`)?.value ?? "" : "";
    const vA = evaA ? cellMap.get(`${meetingId}:${studentId}:${evaA.course_eva_id}`)?.value ?? "" : "";
    if (String(vS).trim() && parseNum(vS) != null) return String(vS).trim();
    if (String(vA).trim()) return String(vA).trim();
    if (String(vS).trim()) return String(vS).trim();
    const fallback = (grid?.cells ?? []).find(
      (c) => c.student_id === studentId && c.course_meeting_id === meetingId && String(c.value ?? "").trim(),
    );
    return String(fallback?.value ?? "").trim();
  }

  const meetings = grid?.meetings ?? [];
  const windowMeetings = meetings.slice(windowStart, windowStart + WINDOW_SIZE);
  const maxStart = Math.max(0, meetings.length - WINDOW_SIZE);

  async function activateJournal() {
    if (!courseId) return;
    if (!window.confirm("Jurnalı aktivləşdirmək istəyirsiniz?")) return;
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch(`/api/admin/subject-groups/${encodeURIComponent(courseId)}/activate-journal`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "Jurnal aktivləşdirilmədi");
        return;
      }
      setOkMsg(data?.warning || "Jurnal aktivləşdirildi.");
      await loadGrid(courseId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <section className={styles.gridCard}>
        {error ? <p className={styles.error} style={{ padding: "12px 14px 0" }}>{error}</p> : null}
        {!courseId ? (
          <p className={styles.empty}>Davamiyyətə baxmaq üçün sağdan fənn qrupunu seçin.</p>
        ) : !grid || busy && !grid.students.length ? (
          <p className={styles.empty}>{busy ? "Yüklənir…" : "Jurnal tapılmadı."}</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={`${styles.th} ${styles.nameCol}`}>
                    <div className={styles.pager}>
                      <button
                        type="button"
                        className={styles.pagerBtn}
                        onClick={() => setWindowStart((s) => Math.max(0, s - WINDOW_SIZE))}
                        disabled={windowStart <= 0}
                      >
                        Geri
                      </button>
                      <button
                        type="button"
                        className={styles.pagerBtn}
                        onClick={() => setWindowStart((s) => Math.min(maxStart, s + WINDOW_SIZE))}
                        disabled={windowStart >= maxStart}
                      >
                        İrəli
                      </button>
                    </div>
                  </th>
                  {windowMeetings.map((m) => {
                    const lt = lessonTypeShort(m);
                    const confirmed = Boolean(m.confirmed) || String(m.point_status ?? "") === STATUS_CONFIRMED;
                    return (
                      <th key={m.course_meeting_id} className={styles.th}>
                        <div className={styles.headDate}>
                          {m.meeting_date || "—"}
                          {lt ? ` (${lt})` : ""}
                        </div>
                        <span className={styles.headTime}>{fmtClockRange(m.start_time, m.end_time) || " "}</span>
                        <span className={styles.headStatus}>{confirmed ? "Təsdiq olunub" : " "}</span>
                      </th>
                    );
                  })}
                  <th className={`${styles.th} ${styles.qbCol}`}>q.b</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.length === 0 ? (
                  <tr>
                    <td className={`${styles.td} ${styles.nameCol}`} colSpan={windowMeetings.length + 2}>
                      Bu fənn qrupunda{halfFilter ? " bu yarımqrup üçün" : ""} tələbə yoxdur.
                    </td>
                  </tr>
                ) : (
                  visibleStudents.map((s, idx) => (
                    <tr key={s.student_id} className={styles.row}>
                      <td className={`${styles.td} ${styles.nameCol}`}>
                        {idx + 1}. {s.person_fullname}
                        {s.half_group_az ? <span className={styles.halfTag}>{s.half_group_az}</span> : null}
                      </td>
                      {windowMeetings.map((m) => {
                        const value = displayValue(s.student_id, m.course_meeting_id);
                        return (
                          <td key={m.course_meeting_id} className={styles.td}>
                            <span className={`${styles.cell} ${cellTone(value)}`}>{value || "—"}</span>
                          </td>
                        );
                      })}
                      <td className={`${styles.td} ${styles.qbCol} ${s.qb_count > 0 ? styles.qbAlert : styles.qbZero}`}>
                        {s.qb_count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className={styles.side}>
        <label className={styles.field}>
          <span className={styles.label}>Fakültə</span>
          <select className={styles.select} value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
            <option value="">Hamısı</option>
            {(lookups?.faculties ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name_az ?? f.id}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>İxtisas</span>
          <SearchableSelect
            value={specialtyId}
            onChange={setSpecialtyId}
            placeholder="Hamısı"
            options={specialties.map((s) => ({ id: s.id, label: s.name_az || s.id }))}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Tədris ili</span>
          <select className={styles.select} value={yearId} onChange={(e) => setYearId(e.target.value)}>
            <option value="">— seç —</option>
            {(lookups?.years ?? []).map((y) => (
              <option key={y.id} value={y.id}>
                {y.name_az ?? y.id}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Semestr</span>
          <select className={styles.select} value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
            <option value="">Hamısı</option>
            {(lookups?.semesters ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_az ?? s.id}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Fənn qrupu növü</span>
          <select className={styles.select} value={courseTypeId} onChange={(e) => setCourseTypeId(e.target.value)}>
            <option value="">Hamısı</option>
            {(lookups?.course_types ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name_az ?? t.id}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Akademik qrup</span>
          <SearchableSelect
            value={groupId}
            onChange={setGroupId}
            placeholder="Hamısı"
            options={groups.map((g) => ({ id: g.id, label: g.name || g.id }))}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Fənn qrupu</span>
          <SearchableSelect
            value={courseId}
            onChange={setCourseId}
            placeholder="— seç —"
            searchPlaceholder="Kod və ya fənn axtar…"
            options={courseOptions.map((c) => ({ id: c.id, label: courseLabel(c) }))}
            emptyText="Fənn qrupu tapılmadı"
          />
        </label>
        {halfOptions.length > 0 ? (
          <label className={styles.field}>
            <span className={styles.label}>Yarımqrup</span>
            <select className={styles.select} value={halfFilter} onChange={(e) => setHalfFilter(e.target.value)}>
              <option value="">Hamısı</option>
              {halfOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {grid?.course ? (
          <p className={styles.meta}>
            {grid.course.subject_name_az || grid.course.code || courseId}
            {grid.course.status_name_az ? ` · ${grid.course.status_name_az}` : ""}
            {` · ${visibleStudents.length} tələbə · ${grid.meetings.length} dərs`}
          </p>
        ) : (
          <p className={styles.meta}>{courses.length} fənn qrupu</p>
        )}
        <button type="button" className={styles.activate} onClick={() => void activateJournal()} disabled={!courseId || busy}>
          Jurnalın aktivləşdirilməsi
        </button>
        {okMsg ? <p className={styles.ok}>{okMsg}</p> : null}
      </aside>
    </div>
  );
}

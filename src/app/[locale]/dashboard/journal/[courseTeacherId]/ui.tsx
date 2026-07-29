"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import styles from "./journal.module.css";

import type { CourseEvaluationItem, CourseMeetingItem, JournalCell, StudentRosterItem } from "@/lib/api";
import {
  createTeacherCourseExercise,
  getTeacherCourseExercisePoints,
  getTeacherCourseExercises,
  getTeacherJournalGrid,
  getTeacherJournalPointsGrid,
  getTeacherJournalResultSimple,
  upsertTeacherCourseExercisePoint,
  upsertTeacherJournalCell,
  upsertTeacherJournalPoint,
} from "@/lib/api-client";

type TabId = "summary" | "attendance" | "exam" | "referat" | "colloquium";

const TABS: { id: TabId; label: string }[] = [
  { id: "summary", label: "Ümumi" },
  { id: "attendance", label: "Aktivlik/Davamiyyət" },
  { id: "exam", label: "İmtahan" },
  { id: "referat", label: "Referat" },
  { id: "colloquium", label: "Kollokvium" },
];

const ATTENDANCE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "—" },
  { value: "i.e", label: "i.e" },
  { value: "q.b", label: "q.b" },
  { value: "q.iş", label: "q.iş" },
  { value: "ü.z", label: "ü.z" },
];

const DISPLAY_START_DATE = "2026-02-16";
const MEETING_WINDOW_SIZE = 11; // 5 days before + today + 5 days after

function cellToneClass(stylesObj: typeof styles, rawValue: string, isAttendanceCell: boolean): string {
  const v = (rawValue ?? "").trim();
  if (!v) return stylesObj.cellEmpty;

  if (isAttendanceCell) {
    const s = v.toLowerCase();
    if (s === "q.b") return stylesObj.cellNeutral;
    if (s === "i.e" || s === "q.iş" || s === "ü.z") return stylesObj.cellGood;
    return stylesObj.cellNeutral;
  }

  const n = parseNum(v);
  if (n == null) return stylesObj.cellNeutral;
  if (n >= 8) return stylesObj.cellGood;
  if (n >= 6) return stylesObj.cellWarn;
  if (n > 0) return stylesObj.cellBad;
  return stylesObj.cellNeutral;
}

function fmtMeeting(m: CourseMeetingItem): string {
  const d = fmtDateLabel(m.meeting_date);
  const t = fmtTimeRange(m.start_time, m.end_time);
  return [d, t].filter(Boolean).join(" ");
}

function key(studentId: string, courseEvaId: string): string {
  return `${studentId}:${courseEvaId}`;
}

function byCode(evals: CourseEvaluationItem[], code: string) {
  return evals.filter((e) => (e.evaluation_code ?? "").trim() === code);
}

function parseNum(v: string | null | undefined): number | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function fmtDateLabel(d: string | null | undefined): string {
  if (!d) return "—";
  const s = String(d);
  const yyyy = s.slice(0, 4);
  const mm = s.slice(5, 7);
  const dd = s.slice(8, 10);
  if (yyyy.length === 4 && mm.length === 2 && dd.length === 2 && s[4] === "-" && s[7] === "-") {
    return `${dd}-${mm}-${yyyy}`;
  }
  return s;
}

function fmtTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  return [start, end].filter(Boolean).join(" - ");
}

function dateOnly(v: string | null | undefined): string {
  return String(v ?? "").slice(0, 10);
}

export function JournalClient({
  locale,
  courseTeacherId,
  courseId,
  lessonTypeId,
  meetings,
  roster,
  evaluations,
}: {
  locale: string;
  courseTeacherId: string;
  courseId: string;
  lessonTypeId: string | null;
  meetings: CourseMeetingItem[];
  roster: StudentRosterItem[];
  evaluations: CourseEvaluationItem[];
}) {
  const visibleMeetings = useMemo(() => {
    return meetings
      .filter((m) => {
        const d = dateOnly(m.meeting_date);
        return d ? d >= DISPLAY_START_DATE : false;
      })
      .sort((a, b) => {
        const da = dateOnly(a.meeting_date);
        const db = dateOnly(b.meeting_date);
        return da.localeCompare(db);
      });
  }, [meetings]);

  const [tab, setTab] = useState<TabId>("attendance");
  const [meetingId, setMeetingId] = useState<string>("");
  const [cells, setCells] = useState<Record<string, JournalCell>>({});
  const [pointCells, setPointCells] = useState<Record<string, JournalCell>>({});
  const [pendingByKey, setPendingByKey] = useState<Record<string, string>>({});
  const [exercisePendingByKey, setExercisePendingByKey] = useState<Record<string, string>>({});
  const [meetingPendingByKey, setMeetingPendingByKey] = useState<Record<string, string>>({});
  const [meetingWindowStart, setMeetingWindowStart] = useState<number>(0);
  const [meetingWindowCellsByMeetingId, setMeetingWindowCellsByMeetingId] = useState<Record<string, Record<string, JournalCell>>>({});
  const [resultByStudentId, setResultByStudentId] = useState<
    Record<
      string,
      {
        davamiyyet: number;
        aktivlik: number;
        collokvium: number;
        serbestish: number;
        imtahana_qederki_bal: number;
        imtahan: number;
        yekun_bal: number;
      }
    >
  >({});
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [exerciseItemsByType, setExerciseItemsByType] = useState<Record<string, { items: any[] }>>({});
  const [exercisePointsByExerciseId, setExercisePointsByExerciseId] = useState<Record<string, Record<string, string>>>({});
  const [newExerciseDateByType, setNewExerciseDateByType] = useState<Record<string, string>>({
    colloquium: "",
    referat: "",
  });

  const evalAttendance = useMemo(() => byCode(evaluations, "EVA_01"), [evaluations]);
  const evalSeminar = useMemo(() => byCode(evaluations, "EVA_02"), [evaluations]);
  const evalReferat = useMemo(() => byCode(evaluations, "EVA_05"), [evaluations]);
  const evalColloq = useMemo(() => byCode(evaluations, "EVA_07"), [evaluations]);
  const evalExam = useMemo(() => byCode(evaluations, "EVA_03"), [evaluations]);

  const evaById = useMemo(() => {
    const m = new Map<string, CourseEvaluationItem>();
    for (const e of evaluations) m.set(e.course_eva_id, e);
    return m;
  }, [evaluations]);

  const visibleEvals = useMemo(() => {
    if (tab === "attendance") return [...evalAttendance, ...evalSeminar];
    if (tab === "referat") return evalReferat;
    if (tab === "colloquium") return evalColloq;
    if (tab === "exam") return evalExam;
    return [];
  }, [tab, evalAttendance, evalSeminar, evalReferat, evalColloq, evalExam]);

  const meetingWindow = useMemo(() => {
    const slice = visibleMeetings.slice(meetingWindowStart, meetingWindowStart + MEETING_WINDOW_SIZE);
    return slice;
  }, [visibleMeetings, meetingWindowStart]);

  function meetingCellKey(mid: string, studentId: string, courseEvaId: string): string {
    return `${mid}:${studentId}:${courseEvaId}`;
  }

  function loadMeetingWindowGrids(mids: string[]) {
    const uniq = Array.from(new Set(mids.filter(Boolean)));
    if (uniq.length === 0) return;
    setErr(null);
    startTransition(async () => {
      const results = await Promise.all(uniq.map((mid) => getTeacherJournalGrid(courseId, mid)));
      const next: Record<string, Record<string, JournalCell>> = {};
      for (let i = 0; i < uniq.length; i++) {
        const mid = uniq[i];
        const res = results[i];
        if (!res) continue;
        const map: Record<string, JournalCell> = {};
        for (const c of res.cells) map[key(c.student_id, c.course_eva_id)] = c;
        next[mid] = map;
      }
      setMeetingWindowCellsByMeetingId((prev) => ({ ...prev, ...next }));
    });
  }

  function loadMeetingGrid(mid: string) {
    setErr(null);
    startTransition(async () => {
      const res = await getTeacherJournalGrid(courseId, mid);
      if (!res) {
        setErr("Jurnal yüklənmədi");
        return;
      }
      const map: Record<string, JournalCell> = {};
      for (const c of res.cells) {
        map[key(c.student_id, c.course_eva_id)] = c;
      }
      setCells(map);
      setPendingByKey({});
    });
  }

  function loadPointsGrid() {
    setErr(null);
    startTransition(async () => {
      const res = await getTeacherJournalPointsGrid(courseId);
      if (!res) {
        setErr("Qiymətlər yüklənmədi");
        return;
      }
      const map: Record<string, JournalCell> = {};
      for (const c of res.cells) {
        map[key(c.student_id, c.course_eva_id)] = c;
      }
      setPointCells(map);
      setPendingByKey({});
    });
  }

  function loadResult() {
    setErr(null);
    startTransition(async () => {
      const res = await getTeacherJournalResultSimple(courseId);
      if (!res) {
        // don't block the rest of the page if this fails
        return;
      }
      const map: Record<string, any> = {};
      for (const r of res.results) {
        map[String(r.student_id)] = {
          davamiyyet: Number(r.davamiyyet) || 0,
          aktivlik: Number(r.aktivlik) || 0,
          collokvium: Number(r.collokvium) || 0,
          serbestish: Number(r.serbestish) || 0,
          imtahana_qederki_bal: Number(r.imtahana_qederki_bal) || 0,
          imtahan: Number(r.imtahan) || 0,
          yekun_bal: Number(r.yekun_bal) || 0,
        };
      }
      setResultByStudentId(map);
    });
  }

  function loadExercises(type: "colloquium" | "referat") {
    startTransition(async () => {
      const list = await getTeacherCourseExercises(courseId, type);
      if (!list) return;
      setExerciseItemsByType((prev) => ({ ...prev, [type]: { items: list.items } }));

      // Load points for each exercise (kept small: per exercise, per roster)
      const pointsMapByExerciseId: Record<string, Record<string, string>> = {};
      for (const it of list.items) {
        // eslint-disable-next-line no-await-in-loop
        const pts = await getTeacherCourseExercisePoints(courseId, type, it.course_execises_id);
        if (!pts) continue;
        const m: Record<string, string> = {};
        for (const c of pts.cells) m[String(c.student_id)] = c.value ?? "";
        pointsMapByExerciseId[String(it.course_execises_id)] = m;
      }
      setExercisePointsByExerciseId((prev) => ({ ...prev, ...pointsMapByExerciseId }));
      setExercisePendingByKey((prev) => {
        const prefix = `${type}:`;
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (!k.startsWith(prefix)) next[k] = v;
        }
        return next;
      });
    });
  }

  async function addExercise(type: "colloquium" | "referat") {
    const d = (newExerciseDateByType[type] ?? "").trim();
    if (!d) {
      setErr("Tarix seçin");
      return;
    }
    setErr(null);
    startTransition(async () => {
      const created = await createTeacherCourseExercise(courseId, { type, start_date: d });
      if (!created) {
        setErr("Yeni tarix əlavə olunmadı");
        return;
      }
      setNewExerciseDateByType((prev) => ({ ...prev, [type]: "" }));
      loadExercises(type);
      loadResult();
    });
  }

  function stageExercisePoint(type: "colloquium" | "referat", exerciseId: string, studentId: string, value: string) {
    setErr(null);
    const next = value.trim();
    if (next) {
      const n = parseNum(next);
      if (n == null) {
        setErr("Rəqəm daxil edin");
        return;
      }
      if (n < 0) {
        setErr("Mənfi ola bilməz");
        return;
      }
    }
    const k = `${type}:${exerciseId}:${studentId}`;
    setExercisePendingByKey((prev) => ({ ...prev, [k]: next }));
  }

  // initial load
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const idxToday = visibleMeetings.findIndex((m) => dateOnly(m.meeting_date) === today);
    const maxStart = Math.max(0, visibleMeetings.length - MEETING_WINDOW_SIZE);
    const initialStart = Math.min(maxStart, Math.max(0, (idxToday >= 0 ? idxToday : 0) - 5));
    setMeetingWindowStart(initialStart);

    const initialMeetingId =
      (idxToday >= 0 ? String(visibleMeetings[idxToday]?.course_meeting_id ?? "") : "") ||
      String(visibleMeetings[0]?.course_meeting_id ?? "") ||
      String(meetings[0]?.course_meeting_id ?? "");
    setMeetingId(initialMeetingId);
    if (initialMeetingId) loadMeetingGrid(initialMeetingId);
    loadPointsGrid();
    loadResult();
    loadExercises("colloquium");
    loadExercises("referat");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab !== "attendance") return;
    const mids = meetingWindow.map((m) => String(m.course_meeting_id));
    loadMeetingWindowGrids(mids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, meetingWindowStart]);

  function isMeetingEval(courseEvaId: string): boolean {
    return (evaById.get(courseEvaId)?.evaluation_code ?? "").trim() === "EVA_01";
  }

  const bulkDefaults = useMemo(() => {
    const init: Record<string, string> = {};
    for (const e of visibleEvals) init[e.course_eva_id] = "";
    return init;
  }, [visibleEvals]);

  const [bulkValueByEvaId, setBulkValueByEvaId] = useState<Record<string, string>>({});

  useEffect(() => {
    setBulkValueByEvaId((prev) => ({ ...bulkDefaults, ...prev }));
  }, [bulkDefaults]);

  function optionsForEval(e: CourseEvaluationItem): { value: string; label: string }[] {
    if (isMeetingEval(e.course_eva_id)) return ATTENDANCE_OPTIONS;
    const max = e.max_point ?? 10;
    const opts: { value: string; label: string }[] = [{ value: "", label: "—" }];
    for (let i = 0; i <= max; i++) opts.push({ value: String(i), label: String(i) });
    return opts;
  }

  function bulkApply(e: CourseEvaluationItem) {
    const v = (bulkValueByEvaId[e.course_eva_id] ?? "").trim();
    setErr(null);
    for (const s of roster) {
      setLocal(s.student_id, e.course_eva_id, v);
    }
  }

  function currentValue(studentId: string, courseEvaId: string): string {
    const k = key(studentId, courseEvaId);
    if (isMeetingEval(courseEvaId)) return cells[k]?.value ?? "";
    return pointCells[k]?.value ?? "";
  }

  function setLocal(studentId: string, courseEvaId: string, value: string) {
    const k = key(studentId, courseEvaId);
    if (isMeetingEval(courseEvaId)) {
      setCells((prev) => ({ ...prev, [k]: { student_id: studentId, course_eva_id: courseEvaId, value: value || null } }));
    } else {
      setPointCells((prev) => ({ ...prev, [k]: { student_id: studentId, course_eva_id: courseEvaId, value: value || null } }));
    }
    setPendingByKey((prev) => ({ ...prev, [k]: value }));
  }

  async function save(studentId: string, courseEvaId: string, value: string) {
    setErr(null);
    const eva = evaById.get(courseEvaId);
    const max = eva?.max_point ?? null;
    const next = value.trim();
    if (!isMeetingEval(courseEvaId) && next) {
      const n = parseNum(next);
      if (n == null) {
        setErr("Rəqəm daxil edin");
        return;
      }
      if (n < 0) {
        setErr("Mənfi ola bilməz");
        return;
      }
      if (max != null && n > max) {
        setErr(`Maksimum ${max}-dir`);
        return;
      }
    }

    if (isMeetingEval(courseEvaId)) {
      if (!meetingId) {
        setErr("Dərs tarixi seçin");
        return;
      }
      const res = await upsertTeacherJournalCell(courseId, {
        student_id: studentId,
        course_eva_id: courseEvaId,
        course_meeting_id: meetingId,
        value: next || null,
      });
      if (!res) {
        setErr("Yadda saxlanmadı");
        return;
      }
      const map: Record<string, JournalCell> = {};
      for (const c of res.cells) map[key(c.student_id, c.course_eva_id)] = c;
      setCells(map);
    } else {
      const res = await upsertTeacherJournalPoint(courseId, {
        student_id: studentId,
        course_eva_id: courseEvaId,
        value: next || null,
      });
      if (!res) {
        setErr("Yadda saxlanmadı");
        return;
      }
      const map: Record<string, JournalCell> = {};
      for (const c of res.cells) map[key(c.student_id, c.course_eva_id)] = c;
      setPointCells(map);
    }
  }

  const pendingCount = useMemo(() => Object.keys(pendingByKey).length, [pendingByKey]);
  const meetingPendingCount = useMemo(() => Object.keys(meetingPendingByKey).length, [meetingPendingByKey]);
  const exercisePendingCount = useMemo(() => {
    if (tab !== "referat" && tab !== "colloquium") return 0;
    const prefix = `${tab}:`;
    return Object.keys(exercisePendingByKey).filter((k) => k.startsWith(prefix)).length;
  }, [exercisePendingByKey, tab]);

  function cancelPendingForAttendance() {
    setPendingByKey({});
    setMeetingPendingByKey({});
    if (meetingId) loadMeetingGrid(meetingId);
    loadPointsGrid();
    const mids = meetingWindow.map((m) => String(m.course_meeting_id));
    loadMeetingWindowGrids(mids);
  }

  function cancelPendingForExercises(exType: "colloquium" | "referat") {
    setExercisePendingByKey((prev) => {
      const prefix = `${exType}:`;
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (!k.startsWith(prefix)) next[k] = v;
      }
      return next;
    });
    loadExercises(exType);
  }

  function confirmSaveAttendance() {
    if (meetingPendingCount === 0) return;
    if (!window.confirm("Daxil etdiyiniz göstəriciləri yadda saxlamaq istəyirsiniz?")) return;

    setErr(null);
    startTransition(async () => {
      for (const [k, v] of Object.entries(meetingPendingByKey)) {
        const parts = k.split(":");
        const mid = parts[0];
        const studentId = parts[1];
        const courseEvaId = parts[2];
        if (!mid || !studentId || !courseEvaId) continue;
        // eslint-disable-next-line no-await-in-loop
        const res = await upsertTeacherJournalCell(courseId, {
          student_id: studentId,
          course_eva_id: courseEvaId,
          course_meeting_id: mid,
          value: v.trim() || null,
        });
        if (!res) {
          setErr("Yadda saxlanmadı");
          return;
        }
        const map: Record<string, JournalCell> = {};
        for (const c of res.cells) map[key(c.student_id, c.course_eva_id)] = c;
        setMeetingWindowCellsByMeetingId((prev) => ({ ...prev, [mid]: map }));
      }
      setMeetingPendingByKey({});
      loadResult();
    });
  }

  function confirmSaveExercises(exType: "colloquium" | "referat") {
    const prefix = `${exType}:`;
    const entries = Object.entries(exercisePendingByKey).filter(([k]) => k.startsWith(prefix));
    if (entries.length === 0) return;
    if (!window.confirm("Daxil etdiyiniz göstəriciləri yadda saxlamaq istəyirsiniz?")) return;

    setErr(null);
    startTransition(async () => {
      for (const [k, v] of entries) {
        const parts = k.split(":");
        const type = parts[0] as "colloquium" | "referat";
        const exerciseId = parts[1];
        const studentId = parts[2];
        if (!type || !exerciseId || !studentId) continue;
        // eslint-disable-next-line no-await-in-loop
        const res = await upsertTeacherCourseExercisePoint(courseId, type, exerciseId, { student_id: studentId, value: v || null });
        if (!res) {
          setErr("Yadda saxlanmadı (1 həftə limiti bitmiş ola bilər)");
          return;
        }
        const m: Record<string, string> = {};
        for (const c of res.cells) m[String(c.student_id)] = c.value ?? "";
        setExercisePointsByExerciseId((prev) => ({ ...prev, [exerciseId]: m }));
      }
      setExercisePendingByKey((prev) => {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (!k.startsWith(prefix)) next[k] = v;
        }
        return next;
      });
      loadExercises(exType);
      loadResult();
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>E-jurnal</h1>
          <p className={styles.meta}>CourseTeacherId: {courseTeacherId} · CourseId: {courseId}</p>
        </div>
        <a className={styles.backButton} href={`/${locale}/dashboard`}>
          Geri
        </a>
      </div>

      <div className={styles.controls}>
        <div className={styles.field}>
          <div className={styles.label}>Dərs tipi</div>
          <select className={styles.select} value={lessonTypeId ?? ""} disabled>
            <option value="">{lessonTypeId ?? "—"}</option>
          </select>
        </div>

        <div className={styles.field}>
          <div className={styles.label}>Dərs tarixi</div>
          <select
            className={styles.select}
            value={meetingId}
            onChange={(e) => {
              const mid = String(e.target.value);
              setMeetingId(mid);
              if (mid) loadMeetingGrid(mid);
            }}
            disabled={meetings.length === 0}
          >
            {meetings.map((m) => (
              <option key={m.course_meeting_id} value={m.course_meeting_id}>
                {fmtMeeting(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.tabsWrap}>
        <div className={styles.tabsList} role="tablist" aria-label="Jurnal bölmələri">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.panel}>
        {tab === "exam" ? (
          <div className={styles.muted} style={{ marginBottom: 12 }}>
            Qeyd: İmtahan balı digər şöbə tərəfindən daxil edilir. Bu bölmədə dəyişiklik etmək mümkün deyil.
          </div>
        ) : null}

        {tab === "attendance" ? (
          <div className={styles.controls} style={{ marginBottom: 12 }}>
            <div className={styles.field}>
              <div className={styles.label}>&nbsp;</div>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => confirmSaveAttendance()}
                disabled={isPending || meetingPendingCount === 0}
              >
                Təsdiq et
              </button>
            </div>
            <div className={styles.field}>
              <div className={styles.label}>&nbsp;</div>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={() => cancelPendingForAttendance()}
                disabled={isPending || meetingPendingCount === 0}
              >
                Ləğv et
              </button>
            </div>
            <div className={styles.muted} style={{ alignSelf: "end" }}>
              {meetingPendingCount ? `${meetingPendingCount} dəyişiklik gözləyir` : "Dəyişiklik yoxdur"}
            </div>
          </div>
        ) : null}

        {tab === "attendance" ? (
          <div className={styles.tableWrap}>
            <div className={styles.controls} style={{ marginBottom: 12 }}>
              <div className={styles.field}>
                <div className={styles.label}>&nbsp;</div>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnNav}`}
                  onClick={() => setMeetingWindowStart((s) => Math.max(0, s - 5))}
                  disabled={isPending || meetingWindowStart <= 0}
                >
                  Prev
                </button>
              </div>
              <div className={styles.field}>
                <div className={styles.label}>&nbsp;</div>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnNav}`}
                  onClick={() =>
                    setMeetingWindowStart((s) => Math.min(Math.max(0, visibleMeetings.length - MEETING_WINDOW_SIZE), s + 5))
                  }
                  disabled={isPending || meetingWindowStart + MEETING_WINDOW_SIZE >= visibleMeetings.length}
                >
                  Next
                </button>
              </div>
              <div className={styles.muted} style={{ alignSelf: "end" }}>
                {meetingWindow.length
                  ? `${meetingWindowStart + 1}-${Math.min(visibleMeetings.length, meetingWindowStart + meetingWindow.length)} / ${visibleMeetings.length}`
                  : "Dərs tarixi yoxdur"}
              </div>
            </div>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={`${styles.th} ${styles.nameCol}`}>Tələbə</th>
                  {meetingWindow.map((m) => (
                    <th key={m.course_meeting_id} className={`${styles.th} ${styles.thCell}`}>
                      <div>{fmtDateLabel(m.meeting_date)}</div>
                      <div className={styles.muted} style={{ fontSize: 12 }}>
                        {fmtTimeRange(m.start_time, m.end_time)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr key={s.student_id} className={styles.row}>
                    <td className={`${styles.td} ${styles.nameCol}`}>{s.person_fullname}</td>
                    {meetingWindow.map((m) => {
                      const mid = String(m.course_meeting_id);
                      const cellMap = meetingWindowCellsByMeetingId[mid] ?? {};
                      const evaA = evalAttendance[0];
                      const evaS = evalSeminar[0];
                      const vA = evaA ? (cellMap[key(s.student_id, evaA.course_eva_id)]?.value ?? "") : "";
                      const vS = evaS ? (cellMap[key(s.student_id, evaS.course_eva_id)]?.value ?? "") : "";
                      const toneA = cellToneClass(styles, vA, true);
                      const toneS = cellToneClass(styles, vS, false);

                      return (
                        <td key={mid} className={`${styles.td} ${styles.tdCell}`}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {evaA ? (
                              <select
                                className={`${styles.cellSelect} ${toneA}`}
                                value={vA}
                                onChange={(ev) => {
                                  const next = String(ev.target.value);
                                  const kk = key(s.student_id, evaA.course_eva_id);
                                  setMeetingWindowCellsByMeetingId((prev) => ({
                                    ...prev,
                                    [mid]: { ...(prev[mid] ?? {}), [kk]: { student_id: s.student_id, course_eva_id: evaA.course_eva_id, value: next || null } },
                                  }));
                                  setMeetingPendingByKey((prev) => ({ ...prev, [meetingCellKey(mid, s.student_id, evaA.course_eva_id)]: next }));
                                }}
                                disabled={isPending}
                              >
                                {ATTENDANCE_OPTIONS.map((o) => (
                                  <option key={o.label} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            ) : null}

                            {evaS ? (
                              <select
                                className={`${styles.cellSelect} ${toneS}`}
                                value={vS}
                                onChange={(ev) => {
                                  const next = String(ev.target.value);
                                  const kk = key(s.student_id, evaS.course_eva_id);
                                  setMeetingWindowCellsByMeetingId((prev) => ({
                                    ...prev,
                                    [mid]: { ...(prev[mid] ?? {}), [kk]: { student_id: s.student_id, course_eva_id: evaS.course_eva_id, value: next || null } },
                                  }));
                                  setMeetingPendingByKey((prev) => ({ ...prev, [meetingCellKey(mid, s.student_id, evaS.course_eva_id)]: next }));
                                }}
                                disabled={isPending}
                              >
                                {optionsForEval(evaS).map((o) => (
                                  <option key={o.label} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "summary" ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={`${styles.th} ${styles.nameCol}`}>Tələbə</th>
                  <th className={styles.th}>Davamiyyət</th>
                  <th className={styles.th}>Aktivlik</th>
                  <th className={styles.th}>Kollokvium</th>
                  <th className={styles.th}>Sərbəst iş</th>
                  <th className={styles.th}>İmtahana qədər</th>
                  <th className={styles.th}>İmtahan</th>
                  <th className={styles.th}>Yekun</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => {
                  const r = resultByStudentId[s.student_id] ?? {
                    davamiyyet: 0,
                    aktivlik: 0,
                    collokvium: 0,
                    serbestish: 0,
                    imtahana_qederki_bal: 0,
                    imtahan: 0,
                    yekun_bal: 0,
                  };
                  return (
                    <tr key={s.student_id} className={styles.row}>
                      <td className={`${styles.td} ${styles.nameCol}`}>{s.person_fullname}</td>
                      <td className={`${styles.td} ${styles.tdCell}`}>{r.davamiyyet.toFixed(2).replace(/\.00$/, "")}</td>
                      <td className={`${styles.td} ${styles.tdCell}`}>{r.aktivlik.toFixed(2).replace(/\.00$/, "")}</td>
                      <td className={`${styles.td} ${styles.tdCell}`}>{r.collokvium.toFixed(2).replace(/\.00$/, "")}</td>
                      <td className={`${styles.td} ${styles.tdCell}`}>{r.serbestish.toFixed(2).replace(/\.00$/, "")}</td>
                      <td className={`${styles.td} ${styles.tdCell}`}>{r.imtahana_qederki_bal.toFixed(2).replace(/\.00$/, "")}</td>
                      <td className={`${styles.td} ${styles.tdCell}`}>{r.imtahan.toFixed(2).replace(/\.00$/, "")}</td>
                      <td className={`${styles.td} ${styles.tdCell}`}>{r.yekun_bal.toFixed(2).replace(/\.00$/, "")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className={styles.muted}>
              Dərslər: {DISPLAY_START_DATE}-dən etibarən e-jurnalda göstərilir. Köhnə tarixlər oxuna bilər, amma dəyişiklik edilmir.
            </div>
            <div className={styles.muted}>Qeyd: Bu cədvəl serverdə “köhnə sistem” hesablanma qaydası ilə çıxarılır.</div>
          </div>
        ) : tab === "attendance" ? null : visibleEvals.length === 0 ? (
          tab === "colloquium" || tab === "referat" ? (
            <div className={styles.tableWrap}>
              <div className={styles.muted}>Yüklənir…</div>
            </div>
          ) : (
            <div className={styles.muted}>Bu bölmə üçün qiymətləndirmə tapılmadı.</div>
          )
        ) : (
          <div className={styles.tableWrap}>
            {tab === "colloquium" || tab === "referat" ? (
              (() => {
                const exType = tab === "colloquium" ? "colloquium" : "referat";
                const items = (exerciseItemsByType[exType]?.items ?? []) as any[];
                const max = exType === "referat" ? 15 : 15;
                return (
                  <>
                    <div className={styles.controls} style={{ marginBottom: 12 }}>
                      <div className={styles.field}>
                        <div className={styles.label}>&nbsp;</div>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnPrimary}`}
                          onClick={() => confirmSaveExercises(exType as any)}
                          disabled={isPending || exercisePendingCount === 0}
                        >
                          Təsdiq et
                        </button>
                      </div>
                      <div className={styles.field}>
                        <div className={styles.label}>&nbsp;</div>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnDanger}`}
                          onClick={() => cancelPendingForExercises(exType as any)}
                          disabled={isPending || exercisePendingCount === 0}
                        >
                          Ləğv et
                        </button>
                      </div>
                      <div className={styles.muted} style={{ alignSelf: "end" }}>
                        {exercisePendingCount ? `${exercisePendingCount} dəyişiklik gözləyir` : "Dəyişiklik yoxdur"}
                      </div>
                    </div>

                    <div className={styles.controls} style={{ marginBottom: 12 }}>
                      <div className={styles.field}>
                        <div className={styles.label}>Tarix</div>
                        <input
                          className={styles.select}
                          type="date"
                          value={newExerciseDateByType[exType] ?? ""}
                          onChange={(e) => setNewExerciseDateByType((prev) => ({ ...prev, [exType]: String(e.target.value) }))}
                          disabled={isPending}
                        />
                      </div>
                      <div className={styles.field}>
                        <div className={styles.label}>&nbsp;</div>
                        <button type="button" className={styles.bulkButton} onClick={() => addExercise(exType as any)} disabled={isPending}>
                          Əlavə et
                        </button>
                      </div>
                      <div className={styles.muted} style={{ alignSelf: "end" }}>
                        Qaydalar: referat 1 dəfə; kollokvium sayı birdən çox ola bilər; hər tarix 1 həftə aktivdir.
                      </div>
                    </div>

                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th className={`${styles.th} ${styles.nameCol}`}>Tələbə</th>
                          {items.map((it) => (
                            <th key={it.course_execises_id} className={`${styles.th} ${styles.thCell}`}>
                              <div>{fmtDateLabel(it.start_date)}</div>
                              <div className={styles.muted} style={{ fontSize: 12 }}>
                                {it.editable ? "Aktiv" : "Bağlı"}
                              </div>
                            </th>
                          ))}
                          {exType === "colloquium" ? <th className={`${styles.th} ${styles.thCell}`}>Orta</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {roster.map((s) => {
                          const vals = items.map((it) => parseNum(exercisePointsByExerciseId[it.course_execises_id]?.[s.student_id] ?? "") ?? 0);
                          const avg = exType === "colloquium" ? (items.length ? vals.reduce((a, b) => a + b, 0) / items.length : 0) : 0;
                          return (
                            <tr key={s.student_id} className={styles.row}>
                              <td className={`${styles.td} ${styles.nameCol}`}>{s.person_fullname}</td>
                              {items.map((it) => {
                                const current = exercisePointsByExerciseId[it.course_execises_id]?.[s.student_id] ?? "";
                                const tone = cellToneClass(styles, current, false);
                                return (
                                  <td key={it.course_execises_id} className={`${styles.td} ${styles.tdCell}`}>
                                    <select
                                      className={`${styles.cellSelect} ${tone}`}
                                      value={current}
                                      onChange={(ev) => {
                                        const next = String(ev.target.value);
                                        setExercisePointsByExerciseId((prev) => ({
                                          ...prev,
                                          [it.course_execises_id]: { ...(prev[it.course_execises_id] ?? {}), [s.student_id]: next },
                                        }));
                                        stageExercisePoint(exType as any, it.course_execises_id, s.student_id, next);
                                      }}
                                      disabled={isPending || !it.editable}
                                    >
                                      <option value="">—</option>
                                      {Array.from({ length: max + 1 }, (_, i) => (
                                        <option key={i} value={String(i)}>
                                          {i}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                );
                              })}
                              {exType === "colloquium" ? <td className={`${styles.td} ${styles.tdCell}`}>{avg.toFixed(2).replace(/\.00$/, "")}</td> : null}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                );
              })()
            ) : (
              <table className={styles.table}>
              <thead>
                <tr>
                  <th className={`${styles.th} ${styles.nameCol}`}>Tələbə</th>
                  {visibleEvals.map((e) => (
                    <th key={e.course_eva_id} className={`${styles.th} ${styles.thCell}`}>
                      <div>
                        {(e.evaluation_name_az || e.evaluation_code || "—") + (e.max_point != null ? ` (max ${e.max_point})` : "")}
                      </div>
                      <div className={styles.bulkRow}>
                        <select
                          className={styles.cellSelect}
                          value={bulkValueByEvaId[e.course_eva_id] ?? ""}
                          onChange={(ev) =>
                            setBulkValueByEvaId((prev) => ({ ...prev, [e.course_eva_id]: String(ev.target.value) }))
                          }
                          disabled={isPending || tab === "exam"}
                        >
                          {optionsForEval(e).map((o) => (
                            <option key={o.label} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={styles.bulkButton}
                          onClick={() => bulkApply(e)}
                          disabled={isPending || tab === "exam" || (isMeetingEval(e.course_eva_id) && !meetingId)}
                        >
                          Hamısına
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr key={s.student_id} className={styles.row}>
                    <td className={`${styles.td} ${styles.nameCol}`}>{s.person_fullname}</td>
                    {visibleEvals.map((e) => {
                      const v = currentValue(s.student_id, e.course_eva_id);
                      const tone = cellToneClass(styles, v, isMeetingEval(e.course_eva_id));
                      return (
                        <td key={e.course_eva_id} className={`${styles.td} ${styles.tdCell}`}>
                          <select
                            className={`${styles.cellSelect} ${tone}`}
                            value={v}
                            onChange={(ev) => {
                              const next = String(ev.target.value);
                              setLocal(s.student_id, e.course_eva_id, next);
                            }}
                            disabled={isPending || tab === "exam" || (isMeetingEval(e.course_eva_id) && !meetingId)}
                          >
                            {optionsForEval(e).map((o) => (
                              <option key={o.label} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        )}

        {err ? <div className={styles.error}>{err}</div> : null}
      </div>
    </div>
  );
}


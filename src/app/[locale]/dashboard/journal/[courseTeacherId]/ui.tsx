"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import styles from "./journal.module.css";

import type { CourseEvaluationItem, CourseMeetingItem, JournalCell, StudentRosterItem } from "@/lib/api";
import { fmtClockRange, fmtClockTime } from "@/lib/clock-time";
import {
  confirmTeacherCourseExercise,
  confirmTeacherJournalMeeting,
  requestTeacherJournalUnlock,
  createTeacherCourseExercise,
  getTeacherCourseExerciseAllPoints,
  getTeacherCourseExercises,
  getTeacherJournalGrid,
  getTeacherJournalPointsGrid,
  getTeacherJournalQbCounts,
  getTeacherJournalResultSimple,
  upsertTeacherCourseExercisePointsBulk,
  upsertTeacherJournalCell,
  upsertTeacherJournalCellsBulk,
  upsertTeacherJournalPoint,
} from "@/lib/api-client";
import { LogoutButton } from "@/components/LogoutButton";
import { TeacherCourseLessons } from "@/components/TeacherCourseLessons";

type TabId = "summary" | "lessons" | "files" | "attendance" | "exam" | "referat" | "colloquium";

const STATUS_CONFIRMED = "110000058";

function isConfirmedStatus(v: string | null | undefined): boolean {
  return String(v ?? "").trim() === STATUS_CONFIRMED;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "summary", label: "Ümumi" },
  { id: "lessons", label: "Dərslər" },
  { id: "files", label: "Fayllar" },
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

const ATTENDANCE_CODE_SET = new Set(
  ATTENDANCE_OPTIONS.map((o) => o.value.trim().toLowerCase()).filter(Boolean),
);

const COLUMN_WINDOW_SIZE = 12;
const COLUMN_WINDOW_STEP = 6;
const WEEK_DAY_LABELS = ["", "I", "II", "III", "IV", "V", "VI", "VII"];
const LEAVE_INCOMPLETE_MSG =
  "Bəzi tələbələrdə qiymət və ya i.e / q.b yazılmayıb (qırmızı sətirlər). Dəyişikliklər yadda qalır, ümumi hesablama üçün təsdiq lazımdır. Səhifəni tərk etmək istəyirsiniz?";

function isAttendanceValue(rawValue: string | null | undefined): boolean {
  return ATTENDANCE_CODE_SET.has(String(rawValue ?? "").trim().toLowerCase());
}

function isQbText(rawValue: string | null | undefined): boolean {
  const s = String(rawValue ?? "").trim().toLowerCase().replace(/\s+/g, "");
  return s === "q.b" || s === "qb";
}

function meetingStartMs(m: CourseMeetingItem): number | null {
  const d = dateOnly(m.meeting_date);
  if (!d) return null;
  const t = fmtClockTime(m.start_time);
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
  const ms = Date.parse(`${d}T${t}:00+04:00`);
  return Number.isFinite(ms) ? ms : null;
}

function isQbLocked(m: CourseMeetingItem, display: string, now: number): boolean {
  if (!isQbText(display)) return false;
  const start = meetingStartMs(m);
  if (start == null) return false;
  return now >= start + 15 * 60 * 1000;
}

/** Davamiyyət kodları əvvəl, sonra qiymət (0–max). */
function combinedMeetingOptions(maxPoint = 10): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [{ value: "", label: "—" }];
  for (const o of ATTENDANCE_OPTIONS) {
    if (o.value) opts.push(o);
  }
  for (let i = 0; i <= maxPoint; i++) opts.push({ value: String(i), label: String(i) });
  return opts;
}

function cellToneClass(stylesObj: typeof styles, rawValue: string, isAttendanceCell: boolean): string {
  const v = (rawValue ?? "").trim();
  if (!v) return stylesObj.cellEmpty;

  if (isAttendanceCell || isAttendanceValue(v)) {
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
  const needle = code.trim().toUpperCase();
  const exact = evals.filter((e) => (e.evaluation_code ?? "").trim().toUpperCase() === needle);
  if (exact.length) return exact;
  const nameOf = (e: CourseEvaluationItem) => (e.evaluation_name_az ?? "").trim().toLowerCase();
  if (needle === "EVA_01") {
    return evals.filter((e) => /davamiyy|mühazirə bal|muhazire bal/.test(nameOf(e)));
  }
  if (needle === "EVA_02") {
    return evals.filter((e) => /aktivlik|dərs aktiv|ders aktiv/.test(nameOf(e)));
  }
  return [];
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
  const s = String(d).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[1].padStart(2, "0")}-${dmy[2].padStart(2, "0")}-${dmy[3]}`;
  return s;
}

function exercisePointDisplay(v: string | null | undefined): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const n = parseNum(s);
  if (n == null) return s;
  if (n >= 0 && n <= 100) return String(n);
  return "";
}

function fmtDateShort(d: string | null | undefined): string {
  const s = fmtDateLabel(d);
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[1]}.${m[2]}`;
  return s;
}

function fmtTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  return fmtClockRange(start, end);
}

/** Mühazirə → M, Seminar → S, Laboratoriya → L */
function lessonTypeShort(m: CourseMeetingItem): string | null {
  const id = String(m.lesson_type_id ?? "").trim();
  if (id === "110000111") return "M";
  if (id === "110000112") return "S";
  if (id === "110000113") return "L";
  const name = String(m.lesson_type_az ?? "").trim().toLowerCase();
  if (name.startsWith("müha") || name.startsWith("muha") || name.includes("lecture")) return "M";
  if (name.startsWith("sem")) return "S";
  if (name.startsWith("lab")) return "L";
  return null;
}

function dateOnly(v: string | null | undefined): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const t = Date.parse(s);
  if (Number.isFinite(t)) {
    const baku = new Date(t + 4 * 60 * 60 * 1000);
    const y = baku.getUTCFullYear();
    const mo = String(baku.getUTCMonth() + 1).padStart(2, "0");
    const d = String(baku.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
  return s.slice(0, 10);
}

function compareMeetings(a: CourseMeetingItem, b: CourseMeetingItem): number {
  const da = dateOnly(a.meeting_date);
  const db = dateOnly(b.meeting_date);
  if (da !== db) return da.localeCompare(db);
  const ta = String(a.start_time ?? "");
  const tb = String(b.start_time ?? "");
  if (ta !== tb) return ta.localeCompare(tb);
  return String(a.course_meeting_id).localeCompare(String(b.course_meeting_id));
}

function weekDayOf(m: CourseMeetingItem): number {
  const d = dateOnly(m.meeting_date);
  if (d) {
    const js = new Date(`${d}T12:00:00`).getDay();
    if (Number.isFinite(js)) return js === 0 ? 7 : js;
  }
  const wd = Number(m.week_day ?? 0);
  if (wd >= 1 && wd <= 7) return wd;
  return 0;
}

type MeetingColumn = { tag: "Üst" | "Alt"; m: CourseMeetingItem };

function isUpperCalendarWeek(iso: string, semesterStart: string): boolean {
  const startMonday = mondayOfIso(semesterStart);
  const dayMonday = mondayOfIso(iso);
  const ms = Date.parse(`${dayMonday}T12:00:00`) - Date.parse(`${startMonday}T12:00:00`);
  if (!Number.isFinite(ms)) return true;
  const idx = Math.round(ms / (7 * 86400000)) + 1;
  return idx % 2 === 1;
}

function columnTag(m: CourseMeetingItem, semesterStart: string | null): "Üst" | "Alt" {
  const wt = Number(m.week_type ?? 0);
  if (wt === 2) return "Alt";
  if (wt === 1) return "Üst";
  const d = dateOnly(m.meeting_date);
  if (semesterStart && d) return isUpperCalendarWeek(d, semesterStart) ? "Üst" : "Alt";
  return "Üst";
}

function todayInBaku(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isFutureLesson(m: CourseMeetingItem, today: string): boolean {
  const d = dateOnly(m.meeting_date);
  return Boolean(d) && d > today;
}

function isLessonOpen(m: CourseMeetingItem, today: string): boolean {
  if (m.calendar_active === true) return true;
  if (m.calendar_active === false) return false;
  const d = dateOnly(m.meeting_date);
  return Boolean(d) && d === today;
}

function mondayOfIso(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
  const js = dt.getUTCDay();
  const back = js === 0 ? 6 : js - 1;
  dt.setUTCDate(dt.getUTCDate() - back);
  return dt.toISOString().slice(0, 10);
}

function windowStartForToday(cols: MeetingColumn[], today: string, size: number): number {
  const maxStart = Math.max(0, cols.length - size);
  if (!cols.length) return 0;
  const weekStart = mondayOfIso(today);
  const firstThisWeek = cols.findIndex((c) => {
    const d = dateOnly(c.m.meeting_date);
    return Boolean(d) && d >= weekStart;
  });
  const idxToday = cols.findIndex((c) => dateOnly(c.m.meeting_date) === today);
  let start = firstThisWeek >= 0 ? firstThisWeek : 0;
  if (idxToday >= 0) {
    start = Math.min(start, Math.max(0, idxToday - 2));
  }
  return Math.min(maxStart, Math.max(0, start));
}

function buildMeetingColumns(meetings: CourseMeetingItem[], semesterStart: string | null): MeetingColumn[] {
  const cols = meetings
    .filter((m) => Boolean(dateOnly(m.meeting_date)))
    .map((m) => ({ tag: columnTag(m, semesterStart), m }));
  cols.sort((a, b) => compareMeetings(a.m, b.m));
  return cols;
}

export function JournalClient({
  locale,
  courseTeacherId,
  courseId,
  educationGroupName,
  halfGroupName,
  subjectName,
  lessonTypeId,
  semesterStart = null,
  meetings,
  roster,
  evaluations,
  initialTab,
}: {
  locale: string;
  courseTeacherId: string;
  courseId: string;
  educationGroupName?: string | null;
  halfGroupName?: string | null;
  subjectName?: string | null;
  lessonTypeId: string | null;
  semesterStart?: string | null;
  meetings: CourseMeetingItem[];
  roster: StudentRosterItem[];
  evaluations: CourseEvaluationItem[];
  initialTab?: TabId;
}) {
  const [liveMeetings, setLiveMeetings] = useState(meetings);
  const visibleMeetings = useMemo(() => {
    return [...liveMeetings]
      .filter((m) => Boolean(dateOnly(m.meeting_date)))
      .sort(compareMeetings);
  }, [liveMeetings]);

  const meetingColumns = useMemo(
    () => buildMeetingColumns(visibleMeetings, semesterStart ?? null),
    [visibleMeetings, semesterStart],
  );

  const [tab, setTab] = useState<TabId>(initialTab ?? "attendance");
  const [meetingId, setMeetingId] = useState<string>("");
  const [cells, setCells] = useState<Record<string, JournalCell>>({});
  const [pointCells, setPointCells] = useState<Record<string, JournalCell>>({});
  const [pendingByKey, setPendingByKey] = useState<Record<string, string>>({});
  const [exercisePendingByKey, setExercisePendingByKey] = useState<Record<string, string>>({});
  const [meetingPendingByKey, setMeetingPendingByKey] = useState<Record<string, string>>({});
  const [meetingWindowStart, setMeetingWindowStart] = useState<number>(0);
  const [meetingWindowCellsByMeetingId, setMeetingWindowCellsByMeetingId] = useState<Record<string, Record<string, JournalCell>>>({});
  const [meetingLockedById, setMeetingLockedById] = useState<Record<string, boolean>>({});
  const [appealOpenId, setAppealOpenId] = useState<string | null>(null);
  const [appealDraft, setAppealDraft] = useState("");
  const [qbCountByStudentId, setQbCountByStudentId] = useState<Record<string, number>>({});
  const [bulkValueByMeetingId, setBulkValueByMeetingId] = useState<Record<string, string>>({});
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
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [savingHint, setSavingHint] = useState<string | null>(null);
  const [leaveHighlight, setLeaveHighlight] = useState(false);
  const meetingSaveQueueRef = useRef<Record<string, { student_id: string; course_eva_id: string; value: string | null }[]>>({});
  const meetingSavingRef = useRef<Record<string, boolean>>({});
  const exerciseSaveQueueRef = useRef<Record<string, { type: "colloquium" | "referat"; cells: { student_id: string; value: string | null }[] }>>({});
  const exerciseSavingRef = useRef<Record<string, boolean>>({});
  const meetingPendingRef = useRef<Record<string, string>>({});
  const exercisePendingRef = useRef<Record<string, string>>({});
  const leaveAllowedRef = useRef(false);
  const needsLeaveWarnRef = useRef(false);

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

  const columnWindow = useMemo(() => {
    return meetingColumns.slice(meetingWindowStart, meetingWindowStart + COLUMN_WINDOW_SIZE);
  }, [meetingColumns, meetingWindowStart]);

  const meetingWindow = useMemo(() => {
    return columnWindow.map((c) => c.m);
  }, [columnWindow]);

  function meetingCellKey(mid: string, studentId: string, courseEvaId: string): string {
    return `${mid}:${studentId}:${courseEvaId}`;
  }

  useEffect(() => {
    meetingPendingRef.current = meetingPendingByKey;
  }, [meetingPendingByKey]);

  useEffect(() => {
    exercisePendingRef.current = exercisePendingByKey;
  }, [exercisePendingByKey]);

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);

  async function flushMeetingQueue(mid: string): Promise<boolean> {
    if (meetingSavingRef.current[mid]) return true;
    meetingSavingRef.current[mid] = true;
    let ok = true;
    try {
      while ((meetingSaveQueueRef.current[mid] ?? []).length) {
        const batch = meetingSaveQueueRef.current[mid];
        meetingSaveQueueRef.current[mid] = [];
        const uniq = new Map<string, { student_id: string; course_eva_id: string; value: string | null }>();
        for (const c of batch) uniq.set(`${c.student_id}:${c.course_eva_id}`, c);
        const cells = Array.from(uniq.values());
        if (!cells.length) continue;
        setSavingHint("Yadda saxlanılır…");
        const res = await upsertTeacherJournalCellsBulk(courseId, { course_meeting_id: mid, cells });
        if (!res.ok) {
          setErr(res.error);
          meetingSaveQueueRef.current[mid] = [...cells, ...(meetingSaveQueueRef.current[mid] ?? [])];
          ok = false;
          break;
        }
        setMeetingPendingByKey((prev) => {
          const next = { ...prev };
          for (const c of cells) delete next[meetingCellKey(mid, c.student_id, c.course_eva_id)];
          return next;
        });
      }
    } finally {
      meetingSavingRef.current[mid] = false;
      if (ok && (meetingSaveQueueRef.current[mid] ?? []).length) {
        ok = await flushMeetingQueue(mid);
      }
    }
    if (ok) {
      setSavingHint(null);
      loadQbCounts();
    }
    return ok;
  }

  function queueMeetingCells(mid: string, cells: { student_id: string; course_eva_id: string; value: string | null }[]) {
    if (!cells.length) return;
    meetingSaveQueueRef.current[mid] = [...(meetingSaveQueueRef.current[mid] ?? []), ...cells];
    void flushMeetingQueue(mid);
  }

  async function flushAllMeetingQueues(): Promise<boolean> {
    const mids = Object.keys(meetingSaveQueueRef.current);
    let ok = true;
    for (const mid of mids) {
      if (!(await flushMeetingQueue(mid))) ok = false;
    }
    return ok;
  }

  async function flushExerciseQueue(exType: "colloquium" | "referat", exerciseId: string): Promise<boolean> {
    const qk = `${exType}:${exerciseId}`;
    if (exerciseSavingRef.current[qk]) return true;
    exerciseSavingRef.current[qk] = true;
    let ok = true;
    try {
      while ((exerciseSaveQueueRef.current[qk]?.cells ?? []).length) {
        const batch = exerciseSaveQueueRef.current[qk].cells;
        exerciseSaveQueueRef.current[qk] = { type: exType, cells: [] };
        const uniq = new Map<string, { student_id: string; value: string | null }>();
        for (const c of batch) uniq.set(c.student_id, c);
        const cells = Array.from(uniq.values());
        if (!cells.length) continue;
        setSavingHint("Yadda saxlanılır…");
        const res = await upsertTeacherCourseExercisePointsBulk(courseId, exType, exerciseId, { cells });
        if (!res) {
          setErr("Yadda saxlanmadı (1 həftə limiti bitmiş və ya təsdiqlənmiş ola bilər)");
          exerciseSaveQueueRef.current[qk] = { type: exType, cells: [...cells, ...(exerciseSaveQueueRef.current[qk]?.cells ?? [])] };
          ok = false;
          break;
        }
        setExercisePendingByKey((prev) => {
          const next = { ...prev };
          for (const c of cells) delete next[`${exType}:${exerciseId}:${c.student_id}`];
          return next;
        });
      }
    } finally {
      exerciseSavingRef.current[qk] = false;
      if (ok && (exerciseSaveQueueRef.current[qk]?.cells ?? []).length) {
        ok = await flushExerciseQueue(exType, exerciseId);
      }
    }
    if (ok) setSavingHint(null);
    return ok;
  }

  function queueExerciseCells(exType: "colloquium" | "referat", exerciseId: string, cells: { student_id: string; value: string | null }[]) {
    if (!cells.length) return;
    const qk = `${exType}:${exerciseId}`;
    const cur = exerciseSaveQueueRef.current[qk]?.cells ?? [];
    exerciseSaveQueueRef.current[qk] = { type: exType, cells: [...cur, ...cells] };
    void flushExerciseQueue(exType, exerciseId);
  }

  async function flushAllExerciseQueues(): Promise<boolean> {
    let ok = true;
    for (const [qk, item] of Object.entries(exerciseSaveQueueRef.current)) {
      const parts = qk.split(":");
      const exType = parts[0] as "colloquium" | "referat";
      const exerciseId = parts.slice(1).join(":");
      if (!exerciseId || (item.cells ?? []).length === 0) continue;
      if (!(await flushExerciseQueue(exType, exerciseId))) ok = false;
    }
    return ok;
  }

  useEffect(() => {
    const flush = () => {
      void flushAllMeetingQueues();
      void flushAllExerciseQueues();
    };
    const onHide = () => flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const seminarMaxPoint = Math.min(Number(evalSeminar[0]?.max_point ?? 10) || 10, 10);
  const meetingCombinedOpts = useMemo(() => combinedMeetingOptions(seminarMaxPoint), [seminarMaxPoint]);

  /** Qiymət varsa onu, yoxsa davamiyyət kodunu göstər. */
  function meetingCombinedDisplay(
    cellMap: Record<string, JournalCell>,
    studentId: string,
  ): string {
    const evaA = evalAttendance[0];
    const evaS = evalSeminar[0];
    const vS = evaS ? (cellMap[key(studentId, evaS.course_eva_id)]?.value ?? "") : "";
    const vA = evaA ? (cellMap[key(studentId, evaA.course_eva_id)]?.value ?? "") : "";
    if (vS.trim() && parseNum(vS) != null) return String(vS).trim();
    if (vA.trim()) return String(vA).trim();
    if (vS.trim()) return String(vS).trim();
    return "";
  }

  /** Bir select: rəqəm → EVA_02 (+ i.e), davamiyyət kodu → EVA_01 (aktivlik silinir). */
  function setMeetingCombined(mid: string, studentId: string, rawNext: string, meeting: CourseMeetingItem) {
    if (meetingLockedById[mid] || !isLessonOpen(meeting, todayInBaku())) return;
    const evaA = evalAttendance[0];
    const evaS = evalSeminar[0];
    if (!evaA && !evaS) return;

    const cellMap = meetingWindowCellsByMeetingId[mid] ?? {};
    const currentDisplay = meetingCombinedDisplay(cellMap, studentId);
    if (isQbLocked(meeting, currentDisplay, nowMs)) return;

    const next = String(rawNext ?? "").trim();
    const n = parseNum(next);
    const isAtt = isAttendanceValue(next);
    const cells: { student_id: string; course_eva_id: string; value: string | null }[] = [];

    setMeetingWindowCellsByMeetingId((prev) => {
      const nextMap = { ...(prev[mid] ?? {}) };
      const write = (evaId: string, value: string | null) => {
        nextMap[key(studentId, evaId)] = { student_id: studentId, course_eva_id: evaId, value };
      };

      if (!next) {
        if (evaA) write(evaA.course_eva_id, null);
        if (evaS) write(evaS.course_eva_id, null);
      } else if (n != null) {
        if (evaS) write(evaS.course_eva_id, next);
        if (evaA) write(evaA.course_eva_id, "i.e");
      } else if (isAtt) {
        if (evaA) write(evaA.course_eva_id, next);
        if (evaS) write(evaS.course_eva_id, null);
      } else {
        return prev;
      }
      return { ...prev, [mid]: nextMap };
    });

    setMeetingPendingByKey((prev) => {
      const p = { ...prev };
      if (!next) {
        if (evaA) p[meetingCellKey(mid, studentId, evaA.course_eva_id)] = "";
        if (evaS) p[meetingCellKey(mid, studentId, evaS.course_eva_id)] = "";
      } else if (n != null) {
        if (evaS) p[meetingCellKey(mid, studentId, evaS.course_eva_id)] = next;
        if (evaA) p[meetingCellKey(mid, studentId, evaA.course_eva_id)] = "i.e";
      } else if (isAtt) {
        if (evaA) p[meetingCellKey(mid, studentId, evaA.course_eva_id)] = next;
        if (evaS) p[meetingCellKey(mid, studentId, evaS.course_eva_id)] = "";
      }
      return p;
    });

    if (!next) {
      if (evaA) cells.push({ student_id: studentId, course_eva_id: evaA.course_eva_id, value: null });
      if (evaS) cells.push({ student_id: studentId, course_eva_id: evaS.course_eva_id, value: null });
    } else if (n != null) {
      if (evaS) cells.push({ student_id: studentId, course_eva_id: evaS.course_eva_id, value: next });
      if (evaA) cells.push({ student_id: studentId, course_eva_id: evaA.course_eva_id, value: "i.e" });
    } else if (isAtt) {
      if (evaA) cells.push({ student_id: studentId, course_eva_id: evaA.course_eva_id, value: next });
      if (evaS) cells.push({ student_id: studentId, course_eva_id: evaS.course_eva_id, value: null });
    }
    queueMeetingCells(mid, cells);
    if (isQbText(next)) setNowMs(Date.now());
  }

  function bulkApplyMeeting(mid: string, meeting: CourseMeetingItem) {
    if (meetingLockedById[mid] || !isLessonOpen(meeting, todayInBaku())) return;
    const raw = (bulkValueByMeetingId[mid] ?? "").trim();
    const evaA = evalAttendance[0];
    const evaS = evalSeminar[0];
    if (!evaA && !evaS) return;

    const n = parseNum(raw);
    const isAtt = isAttendanceValue(raw);
    setErr(null);
    const persistCells: { student_id: string; course_eva_id: string; value: string | null }[] = [];
    const currentMap = meetingWindowCellsByMeetingId[mid] ?? {};

    setMeetingWindowCellsByMeetingId((prev) => {
      const source = prev[mid] ?? {};
      const cellMap = { ...source };
      for (const s of roster) {
        const display = meetingCombinedDisplay(source, s.student_id);
        if (isQbLocked(meeting, display, nowMs)) continue;
        const write = (evaId: string, value: string | null) => {
          cellMap[key(s.student_id, evaId)] = { student_id: s.student_id, course_eva_id: evaId, value };
        };
        if (!raw) {
          if (evaA) write(evaA.course_eva_id, null);
          if (evaS) write(evaS.course_eva_id, null);
        } else if (n != null) {
          if (evaS) write(evaS.course_eva_id, raw);
          if (evaA) write(evaA.course_eva_id, "i.e");
        } else if (isAtt) {
          if (evaA) write(evaA.course_eva_id, raw);
          if (evaS) write(evaS.course_eva_id, null);
        }
      }
      return { ...prev, [mid]: cellMap };
    });

    setMeetingPendingByKey((prev) => {
      const p = { ...prev };
      for (const s of roster) {
        const display = meetingCombinedDisplay(currentMap, s.student_id);
        if (isQbLocked(meeting, display, nowMs)) continue;
        if (!raw) {
          if (evaA) p[meetingCellKey(mid, s.student_id, evaA.course_eva_id)] = "";
          if (evaS) p[meetingCellKey(mid, s.student_id, evaS.course_eva_id)] = "";
        } else if (n != null) {
          if (evaS) p[meetingCellKey(mid, s.student_id, evaS.course_eva_id)] = raw;
          if (evaA) p[meetingCellKey(mid, s.student_id, evaA.course_eva_id)] = "i.e";
        } else if (isAtt) {
          if (evaA) p[meetingCellKey(mid, s.student_id, evaA.course_eva_id)] = raw;
          if (evaS) p[meetingCellKey(mid, s.student_id, evaS.course_eva_id)] = "";
        }
      }
      return p;
    });

    for (const s of roster) {
      const display = meetingCombinedDisplay(currentMap, s.student_id);
      if (isQbLocked(meeting, display, nowMs)) continue;
      if (!raw) {
        if (evaA) persistCells.push({ student_id: s.student_id, course_eva_id: evaA.course_eva_id, value: null });
        if (evaS) persistCells.push({ student_id: s.student_id, course_eva_id: evaS.course_eva_id, value: null });
      } else if (n != null) {
        if (evaS) persistCells.push({ student_id: s.student_id, course_eva_id: evaS.course_eva_id, value: raw });
        if (evaA) persistCells.push({ student_id: s.student_id, course_eva_id: evaA.course_eva_id, value: "i.e" });
      } else if (isAtt) {
        if (evaA) persistCells.push({ student_id: s.student_id, course_eva_id: evaA.course_eva_id, value: raw });
        if (evaS) persistCells.push({ student_id: s.student_id, course_eva_id: evaS.course_eva_id, value: null });
      }
    }

    queueMeetingCells(mid, persistCells);
    if (isQbText(raw)) setNowMs(Date.now());
  }

  function loadMeetingWindowGrids(mids: string[]) {
    const uniq = Array.from(new Set(mids.filter(Boolean)));
    if (uniq.length === 0) return;
    setErr(null);
    startTransition(async () => {
      const results = await Promise.all(uniq.map((mid) => getTeacherJournalGrid(courseId, mid)));
      const next: Record<string, Record<string, JournalCell>> = {};
      const locked: Record<string, boolean> = {};
      for (let i = 0; i < uniq.length; i++) {
        const mid = uniq[i];
        const res = results[i];
        if (!res) continue;
        const map: Record<string, JournalCell> = {};
        for (const c of res.cells) map[key(c.student_id, c.course_eva_id)] = c;
        next[mid] = map;
        locked[mid] = Boolean(res.meeting_confirmed) || res.editable === false || isConfirmedStatus(
          liveMeetings.find((m) => String(m.course_meeting_id) === mid)?.point_status
        );
      }
      setMeetingWindowCellsByMeetingId((prev) => {
        const merged = { ...prev, ...next };
        const pending = meetingPendingRef.current;
        for (const [k, v] of Object.entries(pending)) {
          const parts = k.split(":");
          const pmid = parts[0];
          const studentId = parts[1];
          const courseEvaId = parts[2];
          if (!pmid || !studentId || !courseEvaId || !merged[pmid]) continue;
          merged[pmid] = {
            ...merged[pmid],
            [key(studentId, courseEvaId)]: { student_id: studentId, course_eva_id: courseEvaId, value: v || null },
          };
        }
        return merged;
      });
      setMeetingLockedById((prev) => ({ ...prev, ...locked }));
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

  function loadQbCounts() {
    void getTeacherJournalQbCounts(courseId).then((res) => {
      if (!res) return;
      const map: Record<string, number> = {};
      for (const r of res.items) map[String(r.student_id)] = Number(r.qb_count) || 0;
      setQbCountByStudentId(map);
    });
  }

  function loadExercises(type: "colloquium" | "referat") {
    startTransition(async () => {
      const [list, allPts] = await Promise.all([
        getTeacherCourseExercises(courseId, type),
        getTeacherCourseExerciseAllPoints(courseId, type),
      ]);
      if (!list) return;
      setExerciseItemsByType((prev) => ({ ...prev, [type]: { items: list.items } }));

      const pointsMapByExerciseId: Record<string, Record<string, string>> = {};
      for (const it of list.items) pointsMapByExerciseId[String(it.course_execises_id)] = {};
      if (allPts) {
        for (const c of allPts.cells) {
          const eid = String(c.course_execises_id);
          if (!pointsMapByExerciseId[eid]) pointsMapByExerciseId[eid] = {};
          pointsMapByExerciseId[eid][String(c.student_id)] = exercisePointDisplay(c.value);
        }
      }
      setExercisePointsByExerciseId((prev) => {
        const merged = { ...prev, ...pointsMapByExerciseId };
        for (const [k, v] of Object.entries(exercisePendingRef.current)) {
          if (!k.startsWith(`${type}:`)) continue;
          const parts = k.split(":");
          const eid = parts[1];
          const sid = parts[2];
          if (!eid || !sid) continue;
          merged[eid] = { ...(merged[eid] ?? {}), [sid]: v };
        }
        return merged;
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
    queueExerciseCells(type, exerciseId, [{ student_id: studentId, value: next || null }]);
  }

  // initial load
  useEffect(() => {
    const initialLocked: Record<string, boolean> = {};
    for (const m of meetings) {
      const mid = String(m.course_meeting_id);
      if (isConfirmedStatus(m.point_status)) initialLocked[mid] = true;
    }
    if (Object.keys(initialLocked).length) setMeetingLockedById(initialLocked);

    const today = todayInBaku();
    const idxToday = meetingColumns.findIndex((c) => dateOnly(c.m.meeting_date) === today);
    setMeetingWindowStart(windowStartForToday(meetingColumns, today, COLUMN_WINDOW_SIZE));

    const initialMeetingId =
      String(meetingColumns[idxToday >= 0 ? idxToday : 0]?.m.course_meeting_id ?? "") ||
      String(visibleMeetings[0]?.course_meeting_id ?? "") ||
      String(meetings[0]?.course_meeting_id ?? "");
    setMeetingId(initialMeetingId);
    if (initialMeetingId) loadMeetingGrid(initialMeetingId);
    loadPointsGrid();
    loadResult();
    loadQbCounts();
    loadExercises("colloquium");
    loadExercises("referat");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLiveMeetings(meetings);
  }, [meetings]);

  useEffect(() => {
    if (meetings.length > 0) return;
    let cancelled = false;
    fetch(`/api/teacher/courses/${encodeURIComponent(courseTeacherId)}/meetings`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const items = Array.isArray(data?.meetings) ? data.meetings : [];
        if (!cancelled && items.length) setLiveMeetings(items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [courseTeacherId, meetings.length]);

  useEffect(() => {
    if (!visibleMeetings.length) return;
    const today = todayInBaku();
    const idxToday = meetingColumns.findIndex((c) => dateOnly(c.m.meeting_date) === today);
    setMeetingId((prev) => {
      if (prev && visibleMeetings.some((m) => String(m.course_meeting_id) === prev)) return prev;
      return String(meetingColumns[idxToday >= 0 ? idxToday : 0]?.m.course_meeting_id ?? visibleMeetings[0]?.course_meeting_id ?? "");
    });
    setMeetingWindowStart((prev) => {
      if (prev !== 0) return prev;
      return windowStartForToday(meetingColumns, today, COLUMN_WINDOW_SIZE);
    });
  }, [meetingColumns, visibleMeetings]);

  useEffect(() => {
    if (tab !== "attendance") {
      void flushAllMeetingQueues();
      return;
    }
    let cancelled = false;
    void (async () => {
      await flushAllMeetingQueues();
      if (cancelled) return;
      const mids = meetingWindow.map((m) => String(m.course_meeting_id));
      loadMeetingWindowGrids(mids);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, meetingWindowStart, meetingColumns.length]);

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
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      const map: Record<string, JournalCell> = {};
      for (const c of res.data.cells) map[key(c.student_id, c.course_eva_id)] = c;
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
  const attendanceCanConfirm = useMemo(() => {
    const today = todayInBaku();
    return meetingWindow.some((m) => {
      if (!isLessonOpen(m, today)) return false;
      const mid = String(m.course_meeting_id);
      if (meetingLockedById[mid]) return false;
      if (Object.keys(meetingPendingByKey).some((k) => k.startsWith(`${mid}:`))) return true;
      const cellMap = meetingWindowCellsByMeetingId[mid] ?? {};
      return Object.values(cellMap).some((c) => String(c.value ?? "").trim() !== "");
    });
  }, [meetingWindow, meetingLockedById, meetingPendingByKey, meetingWindowCellsByMeetingId]);
  const exerciseCanConfirm = useMemo(() => {
    if (tab !== "referat" && tab !== "colloquium") return false;
    if (exercisePendingCount > 0) return true;
    const items = (exerciseItemsByType[tab]?.items ?? []) as any[];
    return items.some((it) => {
      if (it.confirmed || !it.editable) return false;
      const pts = exercisePointsByExerciseId[String(it.course_execises_id)] ?? {};
      return Object.values(pts).some((v) => String(v ?? "").trim() !== "");
    });
  }, [tab, exercisePendingCount, exerciseItemsByType, exercisePointsByExerciseId]);

  const incompleteStudentIds = useMemo(() => {
    const today = todayInBaku();
    const ids = new Set<string>();
    for (const m of visibleMeetings) {
      if (!isLessonOpen(m, today)) continue;
      const mid = String(m.course_meeting_id);
      if (meetingLockedById[mid]) continue;
      const cellMap = meetingWindowCellsByMeetingId[mid] ?? {};
      const started = roster.some((s) => meetingCombinedDisplay(cellMap, s.student_id).trim() !== "");
      if (!started) continue;
      for (const s of roster) {
        if (!meetingCombinedDisplay(cellMap, s.student_id).trim()) ids.add(s.student_id);
      }
    }
    for (const exType of ["colloquium", "referat"] as const) {
      const items = (exerciseItemsByType[exType]?.items ?? []) as any[];
      for (const it of items) {
        if (it.confirmed || !it.editable) continue;
        const eid = String(it.course_execises_id);
        const pts = exercisePointsByExerciseId[eid] ?? {};
        const started = roster.some((s) => exercisePointDisplay(pts[s.student_id]).trim() !== "");
        if (!started) continue;
        for (const s of roster) {
          if (!exercisePointDisplay(pts[s.student_id]).trim()) ids.add(s.student_id);
        }
      }
    }
    return ids;
  }, [
    visibleMeetings,
    meetingLockedById,
    meetingWindowCellsByMeetingId,
    roster,
    exerciseItemsByType,
    exercisePointsByExerciseId,
  ]);

  const hasInFlightSaves =
    meetingPendingCount > 0 ||
    Object.keys(exercisePendingByKey).length > 0 ||
    Object.values(meetingSaveQueueRef.current).some((q) => q.length > 0);

  needsLeaveWarnRef.current = incompleteStudentIds.size > 0 || hasInFlightSaves;

  function confirmLeavePage(): boolean {
    if (leaveAllowedRef.current) return true;
    if (!needsLeaveWarnRef.current) return true;
    setLeaveHighlight(true);
    const ok = window.confirm(LEAVE_INCOMPLETE_MSG);
    if (ok) {
      leaveAllowedRef.current = true;
      void flushAllMeetingQueues();
      void flushAllExerciseQueues();
    }
    return ok;
  }

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (leaveAllowedRef.current || !needsLeaveWarnRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onDocClick = (e: MouseEvent) => {
      if (leaveAllowedRef.current || !needsLeaveWarnRef.current) return;
      if (e.defaultPrevented) return;
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const a = el.closest("a");
      if (!a) return;
      if (a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let next: URL;
      try {
        next = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (next.origin !== window.location.origin) return;
      if (next.pathname === window.location.pathname && next.search === window.location.search) return;
      setLeaveHighlight(true);
      if (!window.confirm(LEAVE_INCOMPLETE_MSG)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      leaveAllowedRef.current = true;
      void flushAllMeetingQueues();
      void flushAllExerciseQueues();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onDocClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onDocClick, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  function cancelPendingForAttendance() {
    setPendingByKey({});
    setMeetingPendingByKey({});
    meetingSaveQueueRef.current = {};
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
    for (const qk of Object.keys(exerciseSaveQueueRef.current)) {
      if (qk.startsWith(`${exType}:`)) delete exerciseSaveQueueRef.current[qk];
    }
    loadExercises(exType);
  }

  function meetingHasStoredValues(mid: string): boolean {
    if (Object.keys(meetingPendingRef.current).some((k) => k.startsWith(`${mid}:`))) return true;
    if ((meetingSaveQueueRef.current[mid] ?? []).length) return true;
    const cellMap = meetingWindowCellsByMeetingId[mid] ?? {};
    return Object.values(cellMap).some((c) => String(c.value ?? "").trim() !== "");
  }

  function confirmSaveAttendance() {
    const today = todayInBaku();
    const futureIds = new Set(
      meetingWindow.filter((m) => !isLessonOpen(m, today)).map((m) => String(m.course_meeting_id))
    );
    const mids = meetingWindow
      .filter((m) => !futureIds.has(String(m.course_meeting_id)))
      .map((m) => String(m.course_meeting_id))
      .filter((mid) => !meetingLockedById[mid] && meetingHasStoredValues(mid));
    if (mids.length === 0) return;
    if (!window.confirm("Qiymətləndirməni təsdiqləmək istəyirsiniz? Təsdiqdən sonra dəyişiklik mümkün olmayacaq və ümumi hesablamada nəzərə alınacaq.")) return;

    setErr(null);
    startTransition(async () => {
      if (!(await flushAllMeetingQueues())) return;

      const pendingByMeeting: Record<string, { student_id: string; course_eva_id: string; value: string | null }[]> = {};
      for (const [k, v] of Object.entries(meetingPendingRef.current)) {
        const parts = k.split(":");
        const mid = parts[0];
        const studentId = parts[1];
        const courseEvaId = parts[2];
        if (!mid || !studentId || !courseEvaId) continue;
        if (meetingLockedById[mid] || futureIds.has(mid)) continue;
        (pendingByMeeting[mid] ??= []).push({
          student_id: studentId,
          course_eva_id: courseEvaId,
          value: v.trim() || null,
        });
      }

      const confirmIds = Array.from(new Set([...mids, ...Object.keys(pendingByMeeting)])).filter(
        (mid) => !futureIds.has(mid)
      );
      for (const mid of confirmIds) {
        const cells = pendingByMeeting[mid];
        if (cells?.length) {
          const res = await upsertTeacherJournalCellsBulk(courseId, {
            course_meeting_id: mid,
            cells,
          });
          if (!res.ok) {
            setErr(res.error);
            return;
          }
        }
        const confirmed = await confirmTeacherJournalMeeting(courseId, { course_meeting_id: mid });
        if (!confirmed) {
          setErr("Təsdiq alınmadı");
          return;
        }
        const map: Record<string, JournalCell> = {};
        for (const c of confirmed.cells) map[key(c.student_id, c.course_eva_id)] = c;
        setMeetingWindowCellsByMeetingId((prev) => ({ ...prev, [mid]: map }));
        setMeetingLockedById((prev) => ({ ...prev, [mid]: true }));
      }

      setMeetingPendingByKey({});
      loadResult();
    });
  }

  function sendAppeal(mid: string) {
    const message = appealDraft.trim();
    if (message.length < 3) {
      setErr("Müraciəti bir az ətraflı yazın");
      return;
    }
    setErr(null);
    startTransition(async () => {
      const res = await requestTeacherJournalUnlock(courseId, { course_meeting_id: mid, message });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setLiveMeetings((prev) =>
        prev.map((item) => (String(item.course_meeting_id) === mid ? { ...item, unlock_request: res.message } : item))
      );
      setAppealOpenId(null);
      setAppealDraft("");
    });
  }

  function confirmSaveExercises(exType: "colloquium" | "referat") {
    const prefix = `${exType}:`;
    const items = (exerciseItemsByType[exType]?.items ?? []) as any[];
    const idsFromPending = Object.keys(exercisePendingRef.current)
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.split(":")[1])
      .filter(Boolean);
    const idsFromSaved = items
      .filter((it) => !it.confirmed && it.editable)
      .map((it) => String(it.course_execises_id))
      .filter((eid) => {
        const pts = exercisePointsByExerciseId[eid] ?? {};
        return Object.values(pts).some((v) => String(v ?? "").trim() !== "");
      });
    const touchedExerciseIds = Array.from(new Set([...idsFromPending, ...idsFromSaved]));
    if (touchedExerciseIds.length === 0) return;
    if (!window.confirm("Qiymətləndirməni təsdiqləmək istəyirsiniz? Təsdiqdən sonra dəyişiklik mümkün olmayacaq və ümumi hesablamada nəzərə alınacaq.")) return;

    setErr(null);
    startTransition(async () => {
      if (!(await flushAllExerciseQueues())) return;

      for (const exerciseId of touchedExerciseIds) {
        const pendingCells: { student_id: string; value: string | null }[] = [];
        for (const [k, v] of Object.entries(exercisePendingRef.current)) {
          if (!k.startsWith(`${exType}:${exerciseId}:`)) continue;
          const studentId = k.split(":")[2];
          if (!studentId) continue;
          pendingCells.push({ student_id: studentId, value: v || null });
        }
        if (pendingCells.length) {
          const res = await upsertTeacherCourseExercisePointsBulk(courseId, exType, exerciseId, { cells: pendingCells });
          if (!res) {
            setErr("Yadda saxlanmadı (1 həftə limiti bitmiş və ya təsdiqlənmiş ola bilər)");
            return;
          }
        }
        const confirmed = await confirmTeacherCourseExercise(courseId, exType, exerciseId);
        if (!confirmed) {
          setErr("Təsdiq alınmadı");
          return;
        }
        const m: Record<string, string> = {};
        for (const c of confirmed.cells) m[String(c.student_id)] = exercisePointDisplay(c.value);
        setExercisePointsByExerciseId((prev) => ({ ...prev, [exerciseId]: m }));
      }

      setExercisePendingByKey((prev) => {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (!k.startsWith(prefix)) next[k] = v;
        }
        return next;
      });
      const touched = new Set(touchedExerciseIds);
      setExerciseItemsByType((prev) => {
        const cur = prev[exType];
        if (!cur) return prev;
        return {
          ...prev,
          [exType]: {
            items: cur.items.map((it) =>
              touched.has(String(it.course_execises_id)) ? { ...it, confirmed: true, editable: false } : it,
            ),
          },
        };
      });
      loadResult();
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerCard}>
        <div className={styles.headerMain}>
          <h1 className={styles.title}>E-jurnal{subjectName ? ` · ${subjectName}` : ""}</h1>
          <p className={styles.meta}>
            {educationGroupName ? (
              <span className={styles.groupMeta}>Qrup: {educationGroupName}</span>
            ) : null}
            {educationGroupName && halfGroupName ? " · " : null}
            {halfGroupName ? <span>Yarımqrup: {halfGroupName}</span> : null}
            {educationGroupName || halfGroupName ? " · " : null}
            CourseTeacherId: {courseTeacherId} · CourseId: {courseId}
          </p>
        </div>
        {tab !== "lessons" && tab !== "files" && tab !== "summary" ? (
          <div className={styles.headerFilters}>
            <div className={styles.field}>
              <div className={styles.label}>Dərs tipi</div>
              <select className={styles.select} value={lessonTypeId ?? ""} disabled>
                <option value={lessonTypeId ?? ""}>
                  {liveMeetings.find((m) => m.lesson_type_az)?.lesson_type_az || lessonTypeId || "—"}
                </option>
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
                disabled={visibleMeetings.length === 0}
              >
                {visibleMeetings.length === 0 ? <option value="">Tarix yoxdur</option> : null}
                {visibleMeetings.map((m) => (
                  <option key={m.course_meeting_id} value={m.course_meeting_id}>
                    {fmtMeeting(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
        <div className={styles.headerActions}>
          <a className={styles.backButton} href={`/${locale}/dashboard`}>
            Geri
          </a>
          <LogoutButton className={styles.logoutButton} onBeforeLogout={confirmLeavePage} />
        </div>
      </div>

      <div className={styles.tabsWrap}>
        <div className={styles.tabsList} role="tablist" aria-label="Jurnal bölmələri">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`}
              onClick={() => {
                void flushAllMeetingQueues();
                void flushAllExerciseQueues();
                setTab(t.id);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.panel}>
        {tab === "lessons" || tab === "files" ? (
          <TeacherCourseLessons courseId={courseId} mode={tab} />
        ) : tab === "exam" ? (
          <div className={styles.muted} style={{ marginBottom: 12 }}>
            Qeyd: İmtahan balı digər şöbə tərəfindən daxil edilir. Bu bölmədə dəyişiklik etmək mümkün deyil.
          </div>
        ) : null}

        {tab === "attendance" ? (
          <div className={styles.actionBar}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => confirmSaveAttendance()}
              disabled={isPending || !attendanceCanConfirm}
            >
              Təsdiq et
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnDanger}`}
              onClick={() => cancelPendingForAttendance()}
              disabled={isPending || meetingPendingCount === 0}
            >
              Ləğv et
            </button>
            <div className={styles.actionHint}>
              {savingHint
                ? savingHint
                : meetingPendingCount
                  ? `${meetingPendingCount} dəyişiklik yadda saxlanır`
                  : attendanceCanConfirm
                    ? "Qiymətlər yadda saxlanılıb. Ümumi hesablama üçün təsdiq edin."
                    : "Dəyişiklik yoxdur"}
            </div>
            {incompleteStudentIds.size > 0 ? (
              <p className={styles.leaveBanner}>
                {incompleteStudentIds.size} tələbədə qiymət və ya i.e / q.b yazılmayıb (qırmızı).
                {leaveHighlight ? " Səhifəni tərk etməzdən əvvəl yazın və ya təsdiq edin." : ""}
              </p>
            ) : null}
            <div className={styles.actionHint}>
              Üst və alt həftə tarix sırası ilə göstərilir. Yalnız bu günün dərsi aktivdir. Növbəti günlərə qiymət yazmaq və təsdiq etmək olmaz.
            </div>
            {!evalAttendance[0] && !evalSeminar[0] ? (
              <div className={`${styles.actionHint} ${styles.actionHintWarn}`}>
                Qiymətləndirmə (davamiyyət/aktivlik) tapılmadı. Səhifəni yeniləyin; yoxdursa fənn qrupuna EVA_01 və EVA_02 əlavə edin.
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "attendance" ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={`${styles.th} ${styles.nameCol}`}>Tələbə</th>
                  {columnWindow.map(({ tag, m }) => {
                    const mid = String(m.course_meeting_id);
                    const lt = lessonTypeShort(m);
                    const dayLabel = WEEK_DAY_LABELS[weekDayOf(m)] ?? "";
                    const locked = Boolean(meetingLockedById[mid]);
                    const today = todayInBaku();
                    const future = isFutureLesson(m, today);
                    const closed = !isLessonOpen(m, today);
                    const appeal = String(m.unlock_request ?? "").trim();
                    return (
                      <th key={mid} className={`${styles.th} ${styles.thCell}`}>
                        <div className={styles.pairTitle}>
                          <div className={styles.pairKicker}>
                            <span>{dayLabel}</span>
                            {lt ? <span className={styles.pairType}>{lt}</span> : null}
                          </div>
                          {fmtTimeRange(m.start_time, m.end_time) ? (
                            <div className={styles.pairTime}>{fmtTimeRange(m.start_time, m.end_time)}</div>
                          ) : null}
                        </div>
                        <div className={styles.halfHead}>
                          <div className={styles.halfMeta}>
                            <span className={tag === "Üst" ? styles.weekTagUp : styles.weekTagDown}>{tag}</span>
                            <span className={styles.halfDate}>{fmtDateShort(m.meeting_date)}</span>
                            {locked ? (
                              <button
                                type="button"
                                className={`${styles.mailBtn} ${appeal ? styles.mailBtnSent : ""}`}
                                title={appeal ? "Müraciət göndərilib. Mətni dəyişmək üçün açın." : "Təsdiqin qaldırılması üçün müraciət yazın"}
                                aria-label="Müraciət"
                                aria-expanded={appealOpenId === mid}
                                onClick={() => {
                                  setAppealOpenId((cur) => (cur === mid ? null : mid));
                                  setAppealDraft(appeal);
                                }}
                              >
                                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                                  <path
                                    fill="currentColor"
                                    d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"
                                  />
                                </svg>
                              </button>
                            ) : null}
                          </div>
                          {locked && appealOpenId === mid ? (
                            <form
                              className={styles.appealBox}
                              onSubmit={(ev) => {
                                ev.preventDefault();
                                sendAppeal(mid);
                              }}
                            >
                              <textarea
                                className={styles.appealInput}
                                rows={3}
                                maxLength={500}
                                placeholder="Nəyi dəyişmək lazımdır?"
                                value={appealDraft}
                                onChange={(ev) => setAppealDraft(ev.target.value)}
                                disabled={isPending}
                              />
                              <button type="submit" className={styles.appealSend} disabled={isPending}>
                                Göndər
                              </button>
                            </form>
                          ) : null}
                          {locked && appeal && appealOpenId !== mid ? (
                            <div className={styles.appealNote}>Müraciət göndərilib</div>
                          ) : null}
                          {locked ? (
                            <div className={styles.lockedNote}>Təsdiqlənib</div>
                          ) : closed ? (
                            <div className={styles.futureNote}>{future ? "Gələcək dərs" : "Bağlı"}</div>
                          ) : (
                            <div className={styles.bulkRowStack}>
                              <select
                                className={styles.cellSelect}
                                value={bulkValueByMeetingId[mid] ?? ""}
                                onChange={(ev) =>
                                  setBulkValueByMeetingId((prev) => ({ ...prev, [mid]: String(ev.target.value) }))
                                }
                                disabled={isPending}
                              >
                                {meetingCombinedOpts.map((o) => (
                                  <option key={`${o.value}-${o.label}`} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className={styles.bulkButton}
                                onClick={() => bulkApplyMeeting(mid, m)}
                                disabled={isPending}
                              >
                                Hamısına
                              </button>
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className={`${styles.th} ${styles.qbCol}`}>
                    <span className={styles.qbHead}>q.b</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s, idx) => {
                  const rowMissing = incompleteStudentIds.has(s.student_id);
                  return (
                  <tr key={s.student_id} className={`${styles.row} ${rowMissing ? styles.rowMissing : ""}`}>
                    <td className={`${styles.td} ${styles.nameCol}`}>
                      {idx + 1}. {s.person_fullname}
                    </td>
                    {columnWindow.map(({ m }) => {
                      const mid = String(m.course_meeting_id);
                      const locked = Boolean(meetingLockedById[mid]);
                      const today = todayInBaku();
                      const future = isFutureLesson(m, today);
                      const closed = !isLessonOpen(m, today);
                      const cellMap = meetingWindowCellsByMeetingId[mid] ?? {};
                      const display = meetingCombinedDisplay(cellMap, s.student_id);
                      const started = !locked && !closed && roster.some((x) => meetingCombinedDisplay(cellMap, x.student_id).trim() !== "");
                      const cellMissing = started && !display.trim();
                      const tone = cellMissing ? styles.cellMissing : cellToneClass(styles, display, isAttendanceValue(display));
                      const qbLocked = isQbLocked(m, display, nowMs);
                      return (
                        <td key={mid} className={`${styles.td} ${styles.tdCell}`}>
                          <select
                            className={`${styles.cellSelect} ${tone}`}
                            value={display}
                            onChange={(ev) => setMeetingCombined(mid, s.student_id, String(ev.target.value), m)}
                            disabled={isPending || locked || closed || qbLocked}
                            title={
                              future
                                ? "Bu dərsin tarixi hələ çatmayıb"
                                : closed
                                  ? "Yalnız bu günün dərsi aktivdir"
                                  : qbLocked
                                  ? "q.b dərs başladıqdan 15 dəqiqə sonra dəyişdirilə bilməz"
                                  : cellMissing
                                    ? "Qiymət və ya i.e / q.b yazılmayıb"
                                    : undefined
                            }
                          >
                            {meetingCombinedOpts.map((o) => (
                              <option key={`${o.value}-${o.label}`} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                    <td className={`${styles.td} ${styles.qbCol} ${(qbCountByStudentId[s.student_id] ?? 0) > 0 ? styles.qbAlert : ""}`}>
                      {qbCountByStudentId[s.student_id] ?? 0}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={styles.pagerRow}>
                  <td className={`${styles.td} ${styles.nameCol} ${styles.pagerNavCell}`}>
                    <div className={styles.pagerNav}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnNav}`}
                        onClick={() => setMeetingWindowStart((s) => Math.max(0, s - COLUMN_WINDOW_STEP))}
                        disabled={isPending || meetingWindowStart <= 0}
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnNav}`}
                        onClick={() =>
                          setMeetingWindowStart((s) =>
                            Math.min(Math.max(0, meetingColumns.length - COLUMN_WINDOW_SIZE), s + COLUMN_WINDOW_STEP),
                          )
                        }
                        disabled={isPending || meetingWindowStart + COLUMN_WINDOW_SIZE >= meetingColumns.length}
                      >
                        Next
                      </button>
                    </div>
                    {columnWindow.length === 0 ? (
                      <div className={styles.pagerMeta}>
                        Dərs tarixi yoxdur. Cədvəl təsdiqlənəndən sonra burda tələbə və dərs sütunları görünəcək; qiyməti siyahıdan seçib yazmaq olar.
                      </div>
                    ) : null}
                  </td>
                  {columnWindow.length > 0 ? (
                    <td
                      className={`${styles.td} ${styles.pagerMetaCell}`}
                      colSpan={columnWindow.length + 1}
                    >
                      <div className={styles.pagerMeta}>
                        {`${meetingWindowStart + 1}-${Math.min(meetingColumns.length, meetingWindowStart + columnWindow.length)} / ${meetingColumns.length}`}
                      </div>
                    </td>
                  ) : (
                    <td className={`${styles.td} ${styles.qbCol}`} />
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        ) : null}

        {tab === "lessons" || tab === "files" ? null : tab === "summary" ? (
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
                {roster.map((s, idx) => {
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
                      <td className={`${styles.td} ${styles.nameCol}`}>
                        {idx + 1}. {s.person_fullname}
                      </td>
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
            <div className={styles.muted}>Qeyd: Yalnız təsdiqlənmiş qiymətlər ümumi hesablamaya daxil edilir.</div>
          </div>
        ) : tab === "attendance" ? null : tab === "colloquium" || tab === "referat" || visibleEvals.length > 0 ? (
          <div className={styles.tableWrap}>
            {tab === "colloquium" || tab === "referat" ? (
              (() => {
                const exType = tab === "colloquium" ? "colloquium" : "referat";
                const items = (exerciseItemsByType[exType]?.items ?? []) as any[];
                const max = exType === "referat" ? 15 : 15;
                return (
                  <>
                    <div className={styles.actionBar}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={() => confirmSaveExercises(exType as any)}
                        disabled={isPending || !exerciseCanConfirm}
                      >
                        Təsdiq et
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnDanger}`}
                        onClick={() => cancelPendingForExercises(exType as any)}
                        disabled={isPending || exercisePendingCount === 0}
                      >
                        Ləğv et
                      </button>
                      <div className={styles.actionHint}>
                        {savingHint
                          ? savingHint
                          : exercisePendingCount
                            ? `${exercisePendingCount} dəyişiklik yadda saxlanır`
                            : exerciseCanConfirm
                              ? "Qiymətlər yadda saxlanılıb. Ümumi hesablama üçün təsdiq edin."
                              : "Dəyişiklik yoxdur"}
                      </div>
                      {incompleteStudentIds.size > 0 ? (
                        <p className={styles.leaveBanner}>
                          {incompleteStudentIds.size} tələbədə qiymət yazılmayıb (qırmızı).
                          {leaveHighlight ? " Səhifəni tərk etməzdən əvvəl yazın və ya təsdiq edin." : ""}
                        </p>
                      ) : null}
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
                                {it.confirmed ? "Təsdiqlənib" : it.editable ? "Aktiv" : "Bağlı"}
                              </div>
                            </th>
                          ))}
                          {exType === "colloquium" ? <th className={`${styles.th} ${styles.thCell}`}>Orta</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {roster.map((s, idx) => {
                          const vals = items.map((it) => parseNum(exercisePointDisplay(exercisePointsByExerciseId[it.course_execises_id]?.[s.student_id])) ?? 0);
                          const avg = exType === "colloquium" ? (items.length ? vals.reduce((a, b) => a + b, 0) / items.length : 0) : 0;
                          const rowMissing = incompleteStudentIds.has(s.student_id);
                          return (
                            <tr key={s.student_id} className={`${styles.row} ${rowMissing ? styles.rowMissing : ""}`}>
                              <td className={`${styles.td} ${styles.nameCol}`}>
                                {idx + 1}. {s.person_fullname}
                              </td>
                              {items.map((it) => {
                                const current = exercisePointDisplay(exercisePointsByExerciseId[it.course_execises_id]?.[s.student_id]);
                                const started =
                                  !it.confirmed &&
                                  it.editable &&
                                  roster.some((x) =>
                                    exercisePointDisplay(exercisePointsByExerciseId[it.course_execises_id]?.[x.student_id]).trim() !== "",
                                  );
                                const cellMissing = started && !current.trim();
                                const tone = cellMissing ? styles.cellMissing : cellToneClass(styles, current, false);
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
                                      title={cellMissing ? "Qiymət yazılmayıb" : undefined}
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
                {roster.map((s, idx) => (
                  <tr key={s.student_id} className={styles.row}>
                    <td className={`${styles.td} ${styles.nameCol}`}>
                      {idx + 1}. {s.person_fullname}
                    </td>
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
        ) : (
          <div className={styles.muted}>Bu bölmə üçün qiymətləndirmə tapılmadı.</div>
        )}

        {err ? <div className={styles.error}>{err}</div> : null}
      </div>
    </div>
  );
}


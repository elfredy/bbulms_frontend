"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import styles from "./journal.module.css";

import type { CourseEvaluationItem, CourseMeetingItem, JournalCell, StudentRosterItem } from "@/lib/api";
import {
  confirmTeacherCourseExercise,
  confirmTeacherJournalMeeting,
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

const STATUS_CONFIRMED = "110000058";

function isConfirmedStatus(v: string | null | undefined): boolean {
  return String(v ?? "").trim() === STATUS_CONFIRMED;
}

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

const ATTENDANCE_CODE_SET = new Set(
  ATTENDANCE_OPTIONS.map((o) => o.value.trim().toLowerCase()).filter(Boolean),
);

const PAIR_WINDOW_SIZE = 6;
const PAIR_WINDOW_STEP = 3;
const WEEK_DAY_LABELS = ["", "I", "II", "III", "IV", "V", "VI", "VII"];

function isAttendanceValue(rawValue: string | null | undefined): boolean {
  return ATTENDANCE_CODE_SET.has(String(rawValue ?? "").trim().toLowerCase());
}

/** Qiymət (0–max) + davamiyyət kodları (10-dan sonra). */
function combinedMeetingOptions(maxPoint = 10): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [{ value: "", label: "—" }];
  for (let i = 0; i <= maxPoint; i++) opts.push({ value: String(i), label: String(i) });
  for (const o of ATTENDANCE_OPTIONS) {
    if (o.value) opts.push(o);
  }
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

function fmtTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  return [start, end].filter(Boolean).join(" - ");
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
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return s.slice(0, 10);
}

type MeetingPair = {
  key: string;
  week_day: number;
  start_time: string | null;
  end_time: string | null;
  lesson_type_az: string | null;
  lesson_type_id: string | null;
  upper: CourseMeetingItem | null;
  lower: CourseMeetingItem | null;
};

function weekDayOf(m: CourseMeetingItem): number {
  const wd = Number(m.week_day ?? 0);
  if (wd >= 1 && wd <= 7) return wd;
  const d = dateOnly(m.meeting_date);
  if (!d) return 0;
  const js = new Date(`${d}T12:00:00`).getDay();
  return js === 0 ? 7 : js;
}

function weekHalfOf(m: CourseMeetingItem): 1 | 2 | 0 {
  const wt = Number(m.week_type ?? 0);
  if (wt === 1 || wt === 2) return wt;
  return 0;
}

function daysBetween(a: string, b: string): number {
  const da = Date.parse(`${a}T12:00:00`);
  const db = Date.parse(`${b}T12:00:00`);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return 999;
  return Math.round((db - da) / 86400000);
}

function pairHalves(p: MeetingPair): { tag: "Üst" | "Alt"; m: CourseMeetingItem }[] {
  const out: { tag: "Üst" | "Alt"; m: CourseMeetingItem }[] = [];
  if (p.upper) out.push({ tag: "Üst", m: p.upper });
  if (p.lower) out.push({ tag: "Alt", m: p.lower });
  return out;
}

function buildMeetingPairs(meetings: CourseMeetingItem[]): MeetingPair[] {
  const buckets = new Map<string, CourseMeetingItem[]>();
  for (const m of meetings) {
    const key = `${weekDayOf(m)}|${m.clock_id ?? ""}|${m.lesson_type_id ?? ""}`;
    const arr = buckets.get(key) ?? [];
    arr.push(m);
    buckets.set(key, arr);
  }

  const pairs: MeetingPair[] = [];
  for (const [slotKey, arr] of buckets) {
    arr.sort((a, b) => dateOnly(a.meeting_date).localeCompare(dateOnly(b.meeting_date)));
    let i = 0;
    while (i < arr.length) {
      const a = arr[i];
      const b = arr[i + 1];
      const gap = b ? daysBetween(dateOnly(a.meeting_date), dateOnly(b.meeting_date)) : 999;
      const canPair = Boolean(b) && gap >= 5 && gap <= 10;
      let upper: CourseMeetingItem | null = null;
      let lower: CourseMeetingItem | null = null;
      if (canPair && b) {
        const ha = weekHalfOf(a);
        const hb = weekHalfOf(b);
        if (ha === 2 && hb !== 2) {
          upper = b;
          lower = a;
        } else {
          upper = a;
          lower = b;
        }
        i += 2;
      } else {
        if (weekHalfOf(a) === 2) lower = a;
        else upper = a;
        i += 1;
      }
      const sample = upper ?? lower;
      if (!sample) continue;
      pairs.push({
        key: `${slotKey}|${dateOnly(sample.meeting_date)}|${sample.course_meeting_id}`,
        week_day: weekDayOf(sample),
        start_time: sample.start_time ?? null,
        end_time: sample.end_time ?? null,
        lesson_type_az: sample.lesson_type_az ?? null,
        lesson_type_id: sample.lesson_type_id ?? null,
        upper,
        lower,
      });
    }
  }

  pairs.sort((p, q) => {
    const da = dateOnly((p.upper ?? p.lower)?.meeting_date);
    const db = dateOnly((q.upper ?? q.lower)?.meeting_date);
    if (da !== db) return da.localeCompare(db);
    return String(p.start_time ?? "").localeCompare(String(q.start_time ?? ""));
  });
  return pairs;
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
    return [...meetings]
      .filter((m) => Boolean(dateOnly(m.meeting_date)))
      .sort((a, b) => {
        const da = dateOnly(a.meeting_date);
        const db = dateOnly(b.meeting_date);
        return da.localeCompare(db);
      });
  }, [meetings]);

  const meetingPairs = useMemo(() => buildMeetingPairs(visibleMeetings), [visibleMeetings]);

  const [tab, setTab] = useState<TabId>("attendance");
  const [meetingId, setMeetingId] = useState<string>("");
  const [cells, setCells] = useState<Record<string, JournalCell>>({});
  const [pointCells, setPointCells] = useState<Record<string, JournalCell>>({});
  const [pendingByKey, setPendingByKey] = useState<Record<string, string>>({});
  const [exercisePendingByKey, setExercisePendingByKey] = useState<Record<string, string>>({});
  const [meetingPendingByKey, setMeetingPendingByKey] = useState<Record<string, string>>({});
  const [meetingWindowStart, setMeetingWindowStart] = useState<number>(0);
  const [meetingWindowCellsByMeetingId, setMeetingWindowCellsByMeetingId] = useState<Record<string, Record<string, JournalCell>>>({});
  const [meetingLockedById, setMeetingLockedById] = useState<Record<string, boolean>>({});
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

  const pairWindow = useMemo(() => {
    return meetingPairs.slice(meetingWindowStart, meetingWindowStart + PAIR_WINDOW_SIZE);
  }, [meetingPairs, meetingWindowStart]);

  const meetingWindow = useMemo(() => {
    return pairWindow.flatMap((p) => pairHalves(p).map((h) => h.m));
  }, [pairWindow]);

  function meetingCellKey(mid: string, studentId: string, courseEvaId: string): string {
    return `${mid}:${studentId}:${courseEvaId}`;
  }

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
  function setMeetingCombined(mid: string, studentId: string, rawNext: string) {
    if (meetingLockedById[mid]) return;
    const evaA = evalAttendance[0];
    const evaS = evalSeminar[0];
    if (!evaA && !evaS) return;

    const next = String(rawNext ?? "").trim();
    const n = parseNum(next);
    const isAtt = isAttendanceValue(next);

    setMeetingWindowCellsByMeetingId((prev) => {
      const cellMap = { ...(prev[mid] ?? {}) };
      const write = (evaId: string, value: string | null) => {
        cellMap[key(studentId, evaId)] = { student_id: studentId, course_eva_id: evaId, value };
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
      return { ...prev, [mid]: cellMap };
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
  }

  function bulkApplyMeeting(mid: string) {
    if (meetingLockedById[mid]) return;
    const raw = (bulkValueByMeetingId[mid] ?? "").trim();
    const evaA = evalAttendance[0];
    const evaS = evalSeminar[0];
    if (!evaA && !evaS) return;

    const n = parseNum(raw);
    const isAtt = isAttendanceValue(raw);
    setErr(null);

    setMeetingWindowCellsByMeetingId((prev) => {
      const cellMap = { ...(prev[mid] ?? {}) };
      for (const s of roster) {
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
          meetings.find((m) => String(m.course_meeting_id) === mid)?.point_status
        );
      }
      setMeetingWindowCellsByMeetingId((prev) => ({ ...prev, ...next }));
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
        for (const c of pts.cells) m[String(c.student_id)] = exercisePointDisplay(c.value);
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
    const initialLocked: Record<string, boolean> = {};
    for (const m of meetings) {
      const mid = String(m.course_meeting_id);
      if (isConfirmedStatus(m.point_status)) initialLocked[mid] = true;
    }
    if (Object.keys(initialLocked).length) setMeetingLockedById(initialLocked);

    const today = new Date().toISOString().slice(0, 10);
    const idxToday = meetingPairs.findIndex((p) => {
      const du = dateOnly(p.upper?.meeting_date);
      const dl = dateOnly(p.lower?.meeting_date);
      return du === today || dl === today;
    });
    const maxStart = Math.max(0, meetingPairs.length - PAIR_WINDOW_SIZE);
    const initialStart = Math.min(maxStart, Math.max(0, (idxToday >= 0 ? idxToday : 0) - 2));
    setMeetingWindowStart(initialStart);

    const initialMeetingId =
      String(
        (idxToday >= 0 ? meetingPairs[idxToday]?.upper ?? meetingPairs[idxToday]?.lower : null)?.course_meeting_id ?? "",
      ) ||
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
    if (!window.confirm("Daxil etdiyiniz göstəriciləri yadda saxlayıb təsdiqləmək istəyirsiniz? Təsdiqdən sonra dəyişiklik mümkün olmayacaq.")) return;

    setErr(null);
    startTransition(async () => {
      const touchedMids = new Set<string>();
      for (const [k, v] of Object.entries(meetingPendingByKey)) {
        const parts = k.split(":");
        const mid = parts[0];
        const studentId = parts[1];
        const courseEvaId = parts[2];
        if (!mid || !studentId || !courseEvaId) continue;
        if (meetingLockedById[mid]) continue;
        touchedMids.add(mid);
        // eslint-disable-next-line no-await-in-loop
        const res = await upsertTeacherJournalCell(courseId, {
          student_id: studentId,
          course_eva_id: courseEvaId,
          course_meeting_id: mid,
          value: v.trim() || null,
        });
        if (!res.ok) {
          setErr(res.error);
          return;
        }
        const map: Record<string, JournalCell> = {};
        for (const c of res.data.cells) map[key(c.student_id, c.course_eva_id)] = c;
        setMeetingWindowCellsByMeetingId((prev) => ({ ...prev, [mid]: map }));
      }

      for (const mid of touchedMids) {
        // eslint-disable-next-line no-await-in-loop
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

  function confirmSaveExercises(exType: "colloquium" | "referat") {
    const prefix = `${exType}:`;
    const entries = Object.entries(exercisePendingByKey).filter(([k]) => k.startsWith(prefix));
    if (entries.length === 0) return;
    if (!window.confirm("Daxil etdiyiniz göstəriciləri yadda saxlayıb təsdiqləmək istəyirsiniz? Təsdiqdən sonra dəyişiklik mümkün olmayacaq.")) return;

    setErr(null);
    startTransition(async () => {
      const touchedExerciseIds = new Set<string>();
      for (const [k, v] of entries) {
        const parts = k.split(":");
        const type = parts[0] as "colloquium" | "referat";
        const exerciseId = parts[1];
        const studentId = parts[2];
        if (!type || !exerciseId || !studentId) continue;
        touchedExerciseIds.add(exerciseId);
        // eslint-disable-next-line no-await-in-loop
        const res = await upsertTeacherCourseExercisePoint(courseId, type, exerciseId, { student_id: studentId, value: v || null });
        if (!res) {
          setErr("Yadda saxlanmadı (1 həftə limiti bitmiş və ya təsdiqlənmiş ola bilər)");
          return;
        }
        const m: Record<string, string> = {};
        for (const c of res.cells) m[String(c.student_id)] = exercisePointDisplay(c.value);
        setExercisePointsByExerciseId((prev) => ({ ...prev, [exerciseId]: m }));
      }

      for (const exerciseId of touchedExerciseIds) {
        // eslint-disable-next-line no-await-in-loop
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
            <div className={styles.muted} style={{ alignSelf: "end", padding: 0 }}>
              Üst və alt həftə eyni xanada düzəldilir (sol — üst, sağ — alt).
            </div>
          </div>
        ) : null}

        {tab === "attendance" ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={`${styles.th} ${styles.nameCol}`}>Tələbə</th>
                  {pairWindow.map((p) => {
                    const halves = pairHalves(p);
                    const lt = lessonTypeShort(p.upper ?? p.lower ?? ({} as CourseMeetingItem));
                    const dayLabel = WEEK_DAY_LABELS[p.week_day] ?? "";
                    const split = halves.length > 1;
                    return (
                      <th key={p.key} className={`${styles.th} ${styles.thCell} ${split ? styles.thPair : ""}`}>
                        <div className={styles.pairTitle}>
                          {[dayLabel, fmtTimeRange(p.start_time, p.end_time), lt].filter(Boolean).join(" · ")}
                        </div>
                        <div className={split ? styles.splitHead : undefined}>
                          {halves.map(({ tag, m }) => {
                            const mid = String(m.course_meeting_id);
                            const locked = Boolean(meetingLockedById[mid]);
                            return (
                              <div key={mid} className={styles.halfHead}>
                                <div className={tag === "Üst" ? styles.weekTagUp : styles.weekTagDown}>{tag}</div>
                                <div>{fmtDateLabel(m.meeting_date)}</div>
                                {locked ? (
                                  <div className={styles.muted} style={{ fontSize: 12, fontWeight: 700, padding: "0.35rem 0 0", color: "rgba(20, 83, 45, 1)" }}>
                                    Təsdiqlənib
                                  </div>
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
                                      onClick={() => bulkApplyMeeting(mid)}
                                      disabled={isPending}
                                    >
                                      Hamıya eyni
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {roster.map((s, idx) => (
                  <tr key={s.student_id} className={styles.row}>
                    <td className={`${styles.td} ${styles.nameCol}`}>
                      {idx + 1}. {s.person_fullname}
                    </td>
                    {pairWindow.map((p) => {
                      const halves = pairHalves(p);
                      const split = halves.length > 1;
                      return (
                        <td key={p.key} className={`${styles.td} ${styles.tdCell} ${split ? styles.tdPair : ""}`}>
                          <div className={split ? styles.splitBody : undefined}>
                            {halves.map(({ m }) => {
                              const mid = String(m.course_meeting_id);
                              const locked = Boolean(meetingLockedById[mid]);
                              const cellMap = meetingWindowCellsByMeetingId[mid] ?? {};
                              const display = meetingCombinedDisplay(cellMap, s.student_id);
                              const tone = cellToneClass(styles, display, isAttendanceValue(display));
                              return (
                                <select
                                  key={mid}
                                  className={`${styles.cellSelect} ${tone}`}
                                  value={display}
                                  onChange={(ev) => setMeetingCombined(mid, s.student_id, String(ev.target.value))}
                                  disabled={isPending || locked}
                                >
                                  {meetingCombinedOpts.map((o) => (
                                    <option key={`${o.value}-${o.label}`} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={styles.pagerRow}>
                  <td className={`${styles.td} ${styles.nameCol} ${styles.pagerNavCell}`}>
                    <div className={styles.pagerNav}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnNav}`}
                        onClick={() => setMeetingWindowStart((s) => Math.max(0, s - PAIR_WINDOW_STEP))}
                        disabled={isPending || meetingWindowStart <= 0}
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnNav}`}
                        onClick={() =>
                          setMeetingWindowStart((s) =>
                            Math.min(Math.max(0, meetingPairs.length - PAIR_WINDOW_SIZE), s + PAIR_WINDOW_STEP),
                          )
                        }
                        disabled={isPending || meetingWindowStart + PAIR_WINDOW_SIZE >= meetingPairs.length}
                      >
                        Next
                      </button>
                    </div>
                    {pairWindow.length === 0 ? (
                      <div className={styles.pagerMeta}>Dərs tarixi yoxdur</div>
                    ) : null}
                  </td>
                  {pairWindow.length > 0 ? (
                    <td
                      className={`${styles.td} ${styles.pagerMetaCell}`}
                      colSpan={pairWindow.length}
                    >
                      <div className={styles.pagerMeta}>
                        {`${meetingWindowStart + 1}-${Math.min(meetingPairs.length, meetingWindowStart + pairWindow.length)} / ${meetingPairs.length}`}
                      </div>
                    </td>
                  ) : null}
                </tr>
              </tfoot>
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
            <div className={styles.muted}>Qeyd: Bu cədvəl serverdə “köhnə sistem” hesablanma qaydası ilə çıxarılır.</div>
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
                          return (
                            <tr key={s.student_id} className={styles.row}>
                              <td className={`${styles.td} ${styles.nameCol}`}>
                                {idx + 1}. {s.person_fullname}
                              </td>
                              {items.map((it) => {
                                const current = exercisePointDisplay(exercisePointsByExerciseId[it.course_execises_id]?.[s.student_id]);
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


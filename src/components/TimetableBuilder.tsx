"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";

import styles from "./TimetableBuilder.module.css";
import {
  adminTimetableBoard,
  adminTimetableGroups,
  adminTimetableLookups,
  adminTimetablePlace,
  adminTimetableUnplace,
  type TimetableAssignedSlot,
  type TimetableAvailableLesson,
  type TimetableLookups,
} from "@/lib/api-client";

type SelectedLesson = {
  course_id: string;
  lesson_type_id: string;
};

function lessonKey(courseId: string, lessonTypeId: string) {
  return `${courseId}:${lessonTypeId}`;
}

function slotKey(weekDay: number, clockId: string, weekType: number) {
  return `${weekDay}:${clockId}:${weekType}`;
}

export function TimetableBuilder() {
  const [lookups, setLookups] = useState<TimetableLookups | null>(null);
  const [subjectTypeId, setSubjectTypeId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [yearId, setYearId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [kurs, setKurs] = useState("3");
  const [groupId, setGroupId] = useState("");
  const [groups, setGroups] = useState<{ education_group_id: string; education_group_name: string | null }[]>([]);
  const [clocks, setClocks] = useState<{ id: string; start_time: string | null; end_time: string | null }[]>([]);
  const [available, setAvailable] = useState<TimetableAvailableLesson[]>([]);
  const [assigned, setAssigned] = useState<TimetableAssignedSlot[]>([]);
  const [selected, setSelected] = useState<SelectedLesson | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    adminTimetableLookups().then((data) => {
      if (!alive || !data) return;
      setLookups(data);
      const year = data.years.find((y) => y.name === "2025/2026") ?? data.years[0];
      const sem = data.semesters.find((s) => (s.code || "").toUpperCase() === "PY") ?? data.semesters[0];
      const st = data.subject_types.find((t) => (t.code || "").toUpperCase() === "MAINCOURSE") ?? data.subject_types[0];
      const fac = data.faculties.find((f) => (f.name_az || "").toLowerCase().includes("biznes")) ?? data.faculties[0];
      if (year?.id) setYearId(year.id);
      if (sem?.id) setSemesterId(sem.id);
      if (st?.id) setSubjectTypeId(st.id);
      if (fac?.id) setFacultyId(fac.id);
      if (data.clocks.length) setClocks(data.clocks);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setGroupId("");
    setGroups([]);
    if (!facultyId || !yearId || !kurs) return;
    let alive = true;
    adminTimetableGroups({ faculty_id: facultyId, education_year_id: yearId, kurs: Number(kurs) }).then((data) => {
      if (!alive) return;
      setGroups(data?.items ?? []);
    });
    return () => {
      alive = false;
    };
  }, [facultyId, yearId, kurs]);

  const loadBoard = useCallback(async () => {
    if (!groupId || !yearId || !semesterId) {
      setAssigned([]);
      setAvailable([]);
      return;
    }
    const data = await adminTimetableBoard({
      education_group_id: groupId,
      education_year_id: yearId,
      semester_id: semesterId,
      subject_type_id: subjectTypeId || undefined,
    });
    if (!data) {
      setError("Cədvəl yüklənmədi");
      return;
    }
    setClocks(data.clocks);
    setAssigned(data.assigned);
    setAvailable(data.available);
    setSelected((cur) => {
      if (!cur) return cur;
      const still = data.available.some((a) => a.course_id === cur.course_id && a.lesson_type_id === cur.lesson_type_id);
      return still ? cur : null;
    });
  }, [groupId, yearId, semesterId, subjectTypeId]);

  useEffect(() => {
    setError(null);
    void loadBoard();
  }, [loadBoard]);

  const assignedMap = useMemo(() => {
    const map = new Map<string, TimetableAssignedSlot[]>();
    for (const slot of assigned) {
      const wt = Number(slot.week_type);
      const keys = wt === 3 ? [slotKey(slot.week_day, slot.clock_id, 1), slotKey(slot.week_day, slot.clock_id, 2)] : [slotKey(slot.week_day, slot.clock_id, wt)];
      for (const k of keys) {
        const arr = map.get(k) ?? [];
        arr.push(slot);
        map.set(k, arr);
      }
    }
    return map;
  }, [assigned]);

  const selectedLesson = useMemo(
    () => available.find((a) => selected && a.course_id === selected.course_id && a.lesson_type_id === selected.lesson_type_id) ?? null,
    [available, selected]
  );

  async function place(weekDay: number, clockId: string, weekType: 1 | 2, lesson: SelectedLesson) {
    if (!groupId || !yearId || !semesterId) return;
    setBusy(true);
    setError(null);
    const res = await adminTimetablePlace({
      education_group_id: groupId,
      education_year_id: yearId,
      semester_id: semesterId,
      course_id: lesson.course_id,
      lesson_type_id: lesson.lesson_type_id,
      clock_id: clockId,
      week_day: weekDay,
      week_type: weekType,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await loadBoard();
  }

  async function unplace(slot: TimetableAssignedSlot) {
    if (!groupId) return;
    const ok = window.confirm("Bu dərs xanadan silinsin?");
    if (!ok) return;
    setBusy(true);
    setError(null);
    const res = await adminTimetableUnplace({
      education_group_id: groupId,
      course_id: slot.course_id,
      lesson_type_id: slot.lesson_type_id,
      clock_id: slot.clock_id,
      week_day: Number(slot.week_day),
      week_type: Number(slot.week_type),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await loadBoard();
  }

  function onHalfClick(weekDay: number, clockId: string, weekType: 1 | 2, lessonOverride?: SelectedLesson) {
    if (busy) return;
    const occ = assignedMap.get(slotKey(weekDay, clockId, weekType))?.[0];
    if (occ) {
      void unplace(occ);
      return;
    }
    const lesson = lessonOverride ?? selected;
    if (!lesson) {
      setError("Əvvəl sağdakı fənni seçin, sonra xanaya klikləyin");
      return;
    }
    const info = available.find((a) => a.course_id === lesson.course_id && a.lesson_type_id === lesson.lesson_type_id);
    if (weekType === 1 && info && info.remaining_up <= 0) {
      setError("Bu fənn üçün üst həftə saatı qalmayıb");
      return;
    }
    if (weekType === 2 && info && info.remaining_down <= 0) {
      setError("Bu fənn üçün alt həftə saatı qalmayıb");
      return;
    }
    void place(weekDay, clockId, weekType, lesson);
  }

  function onDragStart(e: DragEvent<HTMLButtonElement>, lesson: TimetableAvailableLesson) {
    setSelected({ course_id: lesson.course_id, lesson_type_id: lesson.lesson_type_id });
    e.dataTransfer.setData("text/plain", lessonKey(lesson.course_id, lesson.lesson_type_id));
    e.dataTransfer.effectAllowed = "copy";
  }

  function onDrop(e: DragEvent<HTMLButtonElement>, weekDay: number, clockId: string, weekType: 1 | 2) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    const [courseId, lessonTypeId] = raw.split(":");
    const lesson = courseId && lessonTypeId ? { course_id: courseId, lesson_type_id: lessonTypeId } : selected;
    if (lesson) setSelected(lesson);
    onHalfClick(weekDay, clockId, weekType, lesson ?? undefined);
  }

  const days = lookups?.days ?? [
    { week_day: 1, label: "I" },
    { week_day: 2, label: "II" },
    { week_day: 3, label: "III" },
    { week_day: 4, label: "IV" },
    { week_day: 5, label: "V" },
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.gridCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thTime} />
              {days.map((d) => (
                <th key={d.week_day} className={styles.thDay}>
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clocks.map((clock) => (
              <tr key={clock.id}>
                <td className={styles.timeCell}>
                  {clock.start_time} - {clock.end_time}
                </td>
                {days.map((d) => (
                  <td key={`${clock.id}-${d.week_day}`}>
                    <div className={styles.split}>
                      {([1, 2] as const).map((wt) => {
                        const occ = assignedMap.get(slotKey(d.week_day, clock.id, wt))?.[0];
                        const canPlace =
                          Boolean(selected) &&
                          !occ &&
                          ((wt === 1 && (selectedLesson?.remaining_up ?? 0) > 0) || (wt === 2 && (selectedLesson?.remaining_down ?? 0) > 0));
                        return (
                          <button
                            key={wt}
                            type="button"
                            disabled={busy || (!occ && !groupId)}
                            className={`${styles.slot} ${occ ? styles.slotFilled : ""} ${canPlace ? styles.slotActive : ""} ${!groupId ? styles.slotDisabled : ""}`}
                            onClick={() => onHalfClick(d.week_day, clock.id, wt)}
                            onDragOver={(e) => {
                              e.preventDefault();
                            }}
                            onDrop={(e) => onDrop(e, d.week_day, clock.id, wt)}
                            title={wt === 1 ? "Üst həftə" : "Alt həftə"}
                          >
                            {occ ? (
                              <>
                                <span className={styles.slotName}>{occ.subject_name_az}</span>
                                <span className={styles.letter}>{occ.lesson_letter}</span>
                              </>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <aside className={styles.side}>
        <label className={styles.field}>
          <span className={styles.label}>Fənnin tipi</span>
          <select className={styles.select} value={subjectTypeId} onChange={(e) => setSubjectTypeId(e.target.value)}>
            <option value="">Hamısı</option>
            {(lookups?.subject_types ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name_az ?? t.id}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Fakültə</span>
          <select className={styles.select} value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
            <option value="">— seç —</option>
            {(lookups?.faculties ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name_az ?? f.id}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Tədris ili</span>
          <select className={styles.select} value={yearId} onChange={(e) => setYearId(e.target.value)}>
            <option value="">— seç —</option>
            {(lookups?.years ?? []).map((y) => (
              <option key={y.id} value={y.id}>
                {y.name ?? y.id}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Fənn qrupu semestr</span>
          <select className={styles.select} value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
            <option value="">— seç —</option>
            {(lookups?.semesters ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_az ?? s.id}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Kurs</span>
          <select className={styles.select} value={kurs} onChange={(e) => setKurs(e.target.value)}>
            {(lookups?.kurs_options ?? [1, 2, 3, 4]).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Akademik qrup</span>
          <select className={styles.select} value={groupId} onChange={(e) => setGroupId(e.target.value)} disabled={!facultyId}>
            <option value="">— seç —</option>
            {groups.map((g) => (
              <option key={g.education_group_id} value={g.education_group_id}>
                {g.education_group_name ?? g.education_group_id}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className={styles.error}>{error}</p> : <p className={styles.hint}>Fənni seçib xananın sol (üst) və ya sağ (alt) yarısına qoyun.</p>}

        <div className={styles.chips}>
          {!groupId ? (
            <div className={styles.emptyChips}>Qrup seçəndən sonra fənnlər burada görünəcək.</div>
          ) : available.length === 0 ? (
            <div className={styles.emptyChips}>Yerləşdiriləcək fənn qalmayıb.</div>
          ) : (
            available.map((lesson) => {
              const isSel = selected?.course_id === lesson.course_id && selected?.lesson_type_id === lesson.lesson_type_id;
              return (
                <button
                  key={lessonKey(lesson.course_id, lesson.lesson_type_id)}
                  type="button"
                  draggable
                  className={`${styles.chip} ${isSel ? styles.chipSelected : ""}`}
                  onClick={() => setSelected({ course_id: lesson.course_id, lesson_type_id: lesson.lesson_type_id })}
                  onDragStart={(e) => onDragStart(e, lesson)}
                  title={`${lesson.lesson_type_az ?? ""} · üst ${lesson.remaining_up} / alt ${lesson.remaining_down}`}
                >
                  <span>{lesson.subject_name_az}</span>
                  <span className={styles.chipLetter}>{lesson.lesson_letter}</span>
                </button>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}

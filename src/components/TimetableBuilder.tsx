"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";

import styles from "./TimetableBuilder.module.css";
import { SearchableSelect } from "./SearchableSelect";
import { fmtClockRange } from "@/lib/clock-time";
import {
  adminTimetableBoard,
  adminTimetableConfirm,
  adminTimetableGroups,
  adminTimetableLookups,
  adminTimetablePlace,
  adminTimetableSetRoom,
  adminTimetableUnplace,
  type TimetableAssignedSlot,
  type TimetableAvailableLesson,
  type TimetableLookups,
  type TimetableOccupiedRoom,
} from "@/lib/api-client";

type SelectedLesson = {
  course_id: string;
  lesson_type_id: string;
  course_group_id?: string | null;
};

type RoomOpt = { id: string; name: string | null; faculty_id?: string | null; occupied?: boolean };

function lessonKey(courseId: string, lessonTypeId: string, courseGroupId?: string | null) {
  return `${courseId}:${lessonTypeId}:${courseGroupId || ""}`;
}

function asWeekType(value: unknown): 1 | 2 | 3 {
  const n = Number(value);
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 1;
}

const MASTER_CLOCK_STARTS = new Set(["18:30", "20:00", "21:30"]);

function isMasterName(value: string | null | undefined) {
  return (value || "").toLowerCase().includes("magistr");
}

function slotKey(weekDay: number, clockId: string, weekType: number) {
  return `${weekDay}:${clockId}:${weekType}`;
}

function fmtColumnDate(iso?: string | null) {
  if (!iso || iso.length < 10) return "";
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
}

function remainingOf(lesson: TimetableAvailableLesson | null | undefined) {
  if (!lesson) return 0;
  if (typeof lesson.remaining === "number") return lesson.remaining;
  return Number(lesson.remaining_up || 0) + Number(lesson.remaining_down || 0);
}

function chipActive(lesson: TimetableAvailableLesson) {
  return remainingOf(lesson) > 0 || Boolean(lesson.can_join);
}

function sameLesson(
  a: { course_id: string; lesson_type_id: string; course_group_id?: string | null },
  b: { course_id: string; lesson_type_id: string; course_group_id?: string | null }
) {
  return a.course_id === b.course_id && a.lesson_type_id === b.lesson_type_id && (a.course_group_id || "") === (b.course_group_id || "");
}

function isSiblingHalf(
  a: { course_id: string; lesson_type_id: string; course_group_id?: string | null },
  b: { course_id: string; lesson_type_id: string; course_group_id?: string | null }
) {
  return (
    a.course_id === b.course_id &&
    a.lesson_type_id === b.lesson_type_id &&
    Boolean(a.course_group_id) &&
    Boolean(b.course_group_id) &&
    a.course_group_id !== b.course_group_id
  );
}

function slotTooltip(occ: TimetableAssignedSlot) {
  return [occ.teacher_fullname || occ.subject_name_az, occ.half_group_az, "silmək üçün klik"].filter(Boolean).join(" · ");
}

function weekTypesOverlap(a: number, b: number) {
  return a === 3 || b === 3 || a === b;
}

function isStreamShare(
  a: { course_id?: string | null; lesson_letter?: string | null; subject_id?: string | null; education_plan_subject_id?: string | null },
  b: { course_id?: string | null; lesson_letter?: string | null; subject_id?: string | null; education_plan_subject_id?: string | null }
) {
  if (a.course_id && b.course_id && a.course_id === b.course_id) return false;
  if (!a.lesson_letter || a.lesson_letter !== b.lesson_letter) return false;
  if (a.lesson_letter !== "M" && a.lesson_letter !== "S") return false;
  if (a.subject_id && b.subject_id) return a.subject_id === b.subject_id;
  return Boolean(a.education_plan_subject_id) && a.education_plan_subject_id === b.education_plan_subject_id;
}

export function TimetableBuilder() {
  const [lookups, setLookups] = useState<TimetableLookups | null>(null);
  const [subjectTypeId, setSubjectTypeId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [educationLevelId, setEducationLevelId] = useState("");
  const [yearId, setYearId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [kurs, setKurs] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groups, setGroups] = useState<
    {
      education_group_id: string;
      education_group_name: string | null;
      education_year_name?: string | null;
      education_level_az?: string | null;
      kurs?: number | null;
    }[]
  >([]);
  const [clocks, setClocks] = useState<{ id: string; start_time: string | null; end_time: string | null }[]>([]);
  const [available, setAvailable] = useState<TimetableAvailableLesson[]>([]);
  const [assigned, setAssigned] = useState<TimetableAssignedSlot[]>([]);
  const [occupiedRooms, setOccupiedRooms] = useState<TimetableOccupiedRoom[]>([]);
  const [columnDates, setColumnDates] = useState<Record<string, string>>({});
  const [hoursRemaining, setHoursRemaining] = useState(0);
  const [selected, setSelected] = useState<SelectedLesson | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [confirmInfo, setConfirmInfo] = useState({
    meeting_count: 0,
    pending_count: 0,
    confirmed_count: 0,
    teacher_count: 0,
    confirmed: false,
  });

  useEffect(() => {
    let alive = true;
    adminTimetableLookups().then((data) => {
      if (!alive || !data) return;
      setLookups(data);
      const year = data.years.find((y) => y.name === "2026/2027") ?? data.years.find((y) => y.name === "2025/2026") ?? data.years[0];
      const sem = data.semesters.find((s) => (s.code || "").toUpperCase() === "PY") ?? data.semesters[0];
      if (year?.id) setYearId(year.id);
      if (sem?.id) setSemesterId(sem.id);
      if (data.clocks.length) setClocks(data.clocks);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setGroupId("");
    setGroups([]);
    if (!facultyId || !yearId) return;
    let alive = true;
    adminTimetableGroups({
      faculty_id: facultyId,
      education_year_id: yearId,
      education_level_id: educationLevelId || null,
      kurs: kurs ? Number(kurs) : null,
    }).then((data) => {
      if (!alive) return;
      setGroups(data?.items ?? []);
    });
    return () => {
      alive = false;
    };
  }, [facultyId, yearId, educationLevelId, kurs]);

  const loadBoard = useCallback(async () => {
    if (!groupId || !yearId || !semesterId) {
      setAssigned([]);
      setAvailable([]);
      setOccupiedRooms([]);
      setColumnDates({});
      setHoursRemaining(0);
      setConfirmInfo({ meeting_count: 0, pending_count: 0, confirmed_count: 0, teacher_count: 0, confirmed: false });
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
    setOccupiedRooms(data.occupied_rooms ?? []);
    setColumnDates(data.column_dates ?? {});
    setHoursRemaining(Number(data.hours_remaining ?? 0));
    setConfirmInfo({
      meeting_count: Number(data.meeting_count ?? 0),
      pending_count: Number(data.pending_count ?? 0),
      confirmed_count: Number(data.confirmed_count ?? 0),
      teacher_count: Number(data.teacher_count ?? 0),
      confirmed: Boolean(data.confirmed),
    });
    setSelected((cur) => {
      if (!cur) return cur;
      const still = data.available.find(
        (a) => a.course_id === cur.course_id && a.lesson_type_id === cur.lesson_type_id && (a.course_group_id || "") === (cur.course_group_id || "")
      );
      if (!still || !chipActive(still)) return null;
      return cur;
    });
  }, [groupId, yearId, semesterId, subjectTypeId]);

  useEffect(() => {
    setError(null);
    void loadBoard();
  }, [loadBoard]);

  const assignedMap = useMemo(() => {
    const map = new Map<string, TimetableAssignedSlot[]>();
    for (const slot of assigned) {
      const k = slotKey(Number(slot.week_day), slot.clock_id, asWeekType(slot.week_type));
      const arr = map.get(k) ?? [];
      arr.push(slot);
      map.set(k, arr);
    }
    return map;
  }, [assigned]);

  const visibleClocks = useMemo(() => {
    const facultyName = lookups?.faculties.find((f) => f.id === facultyId)?.name_az;
    const levelName = lookups?.education_levels.find((l) => l.id === educationLevelId)?.name_az;
    if (!isMasterName(facultyName) && !isMasterName(levelName)) return clocks;
    const evening = clocks.filter((c) => MASTER_CLOCK_STARTS.has((c.start_time || "").slice(0, 5)));
    return evening.length ? evening : clocks;
  }, [clocks, facultyId, educationLevelId, lookups]);

  const selectedLesson = useMemo(
    () =>
      available.find(
        (a) =>
          selected &&
          a.course_id === selected.course_id &&
          a.lesson_type_id === selected.lesson_type_id &&
          (a.course_group_id || "") === (selected.course_group_id || "")
      ) ?? null,
    [available, selected]
  );

  const groupedLessons = useMemo(() => {
    const map = new Map<string, { key: string; subject_name_az: string | null; items: TimetableAvailableLesson[] }>();
    for (const lesson of available) {
      const key = (lesson.subject_name_az || lesson.course_id).trim().toLocaleLowerCase("az");
      const cur = map.get(key) ?? {
        key,
        subject_name_az: lesson.subject_name_az,
        items: [],
      };
      if (!cur.items.some((x) => lessonKey(x.course_id, x.lesson_type_id, x.course_group_id) === lessonKey(lesson.course_id, lesson.lesson_type_id, lesson.course_group_id))) {
        cur.items.push(lesson);
      }
      map.set(key, cur);
    }
    return [...map.values()];
  }, [available]);

  const rooms = lookups?.rooms ?? [];

  async function confirmTimetable() {
    if (!groupId || !yearId || !semesterId) return;
    if (confirmInfo.meeting_count <= 0) {
      setError("Əvvəl cədvələ dərs qoyun");
      return;
    }
    if (hoursRemaining > 0) {
      setError("Bütün fənn saatları cədvələ qoyulmadan təsdiq etmək olmaz");
      return;
    }
    const ok = window.confirm(
      "Cədvəl təsdiqlənsin? Təsdiqdən sonra bu qrupun dərsləri aid olduğu müəllimlərin kabinetində və e-jurnda görünəcək."
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    setOkMsg(null);
    const res = await adminTimetableConfirm({
      education_group_id: groupId,
      education_year_id: yearId,
      semester_id: semesterId,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOkMsg(
      res.teacher_count > 0
        ? `Cədvəl təsdiqləndi. ${res.teacher_count} müəllimin kabinetində dərslər görünəcək.`
        : "Cədvəl təsdiqləndi."
    );
    await loadBoard();
  }

  async function place(weekDay: number, clockId: string, weekType: 1 | 2 | 3, lesson: SelectedLesson) {
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
      course_group_id: lesson.course_group_id || null,
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
      course_group_id: slot.course_group_id || null,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await loadBoard();
  }

  async function setRoom(slot: TimetableAssignedSlot, roomId: string | null) {
    if (!groupId) return;
    setBusy(true);
    setError(null);
    const res = await adminTimetableSetRoom({
      education_group_id: groupId,
      course_id: slot.course_id,
      lesson_type_id: slot.lesson_type_id,
      clock_id: slot.clock_id,
      week_day: Number(slot.week_day),
      week_type: Number(slot.week_type),
      room_id: roomId,
      course_group_id: slot.course_group_id || null,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await loadBoard();
  }

  function onHalfClick(weekDay: number, clockId: string, weekType: 1 | 2 | 3, lessonOverride?: SelectedLesson, clicked?: TimetableAssignedSlot) {
    if (busy) return;
    const list = assignedMap.get(slotKey(weekDay, clockId, weekType)) ?? [];
    const lesson = lessonOverride ?? selected;
    if (clicked && (!lesson || sameLesson(clicked, lesson) || !isSiblingHalf(clicked, lesson))) {
      void unplace(clicked);
      return;
    }
    if (lesson && list.some((x) => sameLesson(x, lesson))) {
      return;
    }
    const fullList = assignedMap.get(slotKey(weekDay, clockId, 3)) ?? [];
    const upList = assignedMap.get(slotKey(weekDay, clockId, 1)) ?? [];
    const downList = assignedMap.get(slotKey(weekDay, clockId, 2)) ?? [];
    if (weekType === 3 && (upList.length || downList.length)) {
      if (lesson && [...upList, ...downList].some((x) => isSiblingHalf(x, lesson))) {
        const target: 1 | 2 | null = upList.length && !downList.length ? 2 : downList.length && !upList.length ? 1 : null;
        if (target) {
          void place(weekDay, clockId, target, lesson);
          return;
        }
      }
      setError("Bu xanada üst və ya alt həftə dərsi var. Əvvəl onları silin.");
      return;
    }
    if (weekType !== 3 && fullList.length) {
      if (!(lesson && fullList.some((x) => isSiblingHalf(x, lesson)))) {
        setError("Bu xanada tam dərs var. Əvvəl onu silin.");
        return;
      }
    }
    if (!lesson) {
      setError("Əvvəl sağdakı fənni seçin, sonra xanaya klikləyin");
      return;
    }
    const info = available.find(
      (a) => a.course_id === lesson.course_id && a.lesson_type_id === lesson.lesson_type_id && (a.course_group_id || "") === (lesson.course_group_id || "")
    );
    const rem = remainingOf(info);
    const joining = Boolean(
      info?.can_join &&
        [...list, ...upList, ...downList, ...fullList].some((x) => isSiblingHalf(x, lesson))
    );
    if (weekType !== 3 && rem <= 0 && !joining && !list.some((x) => isSiblingHalf(x, lesson))) {
      setError("Bu fənn üçün boş saat qalmayıb");
      return;
    }
    if (weekType === 3 && rem < 2 && !joining && !list.some((x) => isSiblingHalf(x, lesson))) {
      setError("Tam dərs üçün 2 saat lazımdır");
      return;
    }
    void place(weekDay, clockId, weekType, lesson);
  }

  function onDragStart(e: DragEvent<HTMLButtonElement>, lesson: TimetableAvailableLesson) {
    if (remainingOf(lesson) <= 0) {
      e.preventDefault();
      return;
    }
    setSelected({ course_id: lesson.course_id, lesson_type_id: lesson.lesson_type_id, course_group_id: lesson.course_group_id || null });
    e.dataTransfer.setData("text/plain", lessonKey(lesson.course_id, lesson.lesson_type_id, lesson.course_group_id));
    e.dataTransfer.effectAllowed = "copy";
  }

  function allowDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function onDrop(e: DragEvent<HTMLElement>, weekDay: number, clockId: string, weekType: 1 | 2 | 3) {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData("text/plain");
    const [courseId, lessonTypeId, courseGroupId] = raw.split(":");
    const lesson =
      courseId && lessonTypeId
        ? { course_id: courseId, lesson_type_id: lessonTypeId, course_group_id: courseGroupId || null }
        : selected;
    if (lesson) setSelected(lesson);
    onHalfClick(weekDay, clockId, weekType, lesson ?? undefined);
  }

  const days = lookups?.days ?? [
    { week_day: 1, label: "I", name_az: "Bazar ertəsi" },
    { week_day: 2, label: "II", name_az: "Çərşənbə axşamı" },
    { week_day: 3, label: "III", name_az: "Çərşənbə" },
    { week_day: 4, label: "IV", name_az: "Cümə axşamı" },
    { week_day: 5, label: "V", name_az: "Cümə" },
    { week_day: 6, label: "VI", name_az: "Şənbə" },
  ];

  function renderSlot(weekDay: number, clockId: string, weekType: 1 | 2 | 3, occList: TimetableAssignedSlot[], canPlace: boolean) {
    const half = weekType !== 3;
    const title = weekType === 1 ? "Üst həftə" : weekType === 2 ? "Alt həftə" : "Tam dərs";
    const tag = weekType === 1 ? "Üst" : weekType === 2 ? "Alt" : "Tam";
    const occ = occList[0];
    const canDrop = Boolean(groupId) && (occList.length === 0 || (selected && occList.some((x) => isSiblingHalf(x, selected)) && !occList.some((x) => sameLesson(x, selected))));
    const roomOptionsFor = (item: TimetableAssignedSlot): RoomOpt[] =>
      (item.room_id && !rooms.some((r) => r.id === item.room_id) ? [{ id: item.room_id, name: item.room_name || item.room_id }, ...rooms] : rooms).map((r) => {
        const occupied = occupiedRooms.some(
          (o) =>
            o.room_id === r.id &&
            o.clock_id === clockId &&
            Number(o.week_day) === weekDay &&
            weekTypesOverlap(Number(o.week_type), weekType) &&
            !(
              o.course_id === item.course_id &&
              o.lesson_type_id === item.lesson_type_id &&
              Number(o.week_type) === weekType &&
              (o.course_group_id || "") === (item.course_group_id || "")
            ) &&
            !isStreamShare(item, o),
        );
        return { ...r, occupied };
      });

    return (
      <div
        className={`${styles.slot} ${half ? styles.slotHalf : styles.slotFull} ${occ ? styles.slotFilled : ""} ${canPlace ? styles.slotActive : ""} ${!groupId ? styles.slotDisabled : ""}`}
        onDragOver={canDrop ? allowDrop : undefined}
        onDrop={canDrop ? (e) => onDrop(e, weekDay, clockId, weekType) : undefined}
      >
        <span className={styles.weekTag}>{tag}</span>
        {occList.length ? (
          <div className={styles.slotStack}>
            {occList.map((item) => (
              <div key={lessonKey(item.course_id, item.lesson_type_id, item.course_group_id)} className={styles.slotItem}>
                <div className={styles.slotRoomRow} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                  {item.half_group_az ? <span className={styles.slotHalfTag}>{item.half_group_az}</span> : null}
                  <SearchableSelect
                    compact
                    value={item.room_id ?? ""}
                    disabled={busy}
                    placeholder="Otaq"
                    searchPlaceholder="Otaq axtar…"
                    triggerClassName={styles.slotRoom}
                    options={roomOptionsFor(item).map((r) => ({
                      id: r.id,
                      label: r.occupied ? `${r.name || r.id} · doludur` : r.name || r.id,
                      disabled: Boolean(r.occupied),
                    }))}
                    onChange={(id) => {
                      void setRoom(item, id || null);
                    }}
                  />
                </div>
                <button
                  type="button"
                  className={styles.slotBody}
                  disabled={busy}
                  title={slotTooltip(item)}
                  onClick={() => onHalfClick(weekDay, clockId, weekType, undefined, item)}
                >
                  <span className={styles.slotName}>
                    {item.subject_name_az}
                    {item.half_group_az ? ` · ${item.half_group_az}` : ""}
                  </span>
                  <span className={styles.letter}>{item.lesson_letter}</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className={styles.slotBody}
            disabled={busy || !groupId}
            title={title}
            onClick={() => onHalfClick(weekDay, clockId, weekType)}
            onDragOver={allowDrop}
            onDrop={(e) => onDrop(e, weekDay, clockId, weekType)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.gridCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thTime} />
              {days.map((d) => (
                <th key={d.week_day} className={styles.thDay}>
                  <div>{d.label}</div>
                  {d.name_az ? <div className={styles.thDayName}>{d.name_az}</div> : null}
                  {columnDates[String(d.week_day)] ? (
                    <div className={styles.thDayDate}>{fmtColumnDate(columnDates[String(d.week_day)])}</div>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleClocks.map((clock) => (
              <tr key={clock.id}>
                <td className={styles.timeCell}>
                  {fmtClockRange(clock.start_time, clock.end_time) || "—"}
                </td>
                {days.map((d) => {
                  const up = assignedMap.get(slotKey(d.week_day, clock.id, 1)) ?? [];
                  const down = assignedMap.get(slotKey(d.week_day, clock.id, 2)) ?? [];
                  const full = assignedMap.get(slotKey(d.week_day, clock.id, 3)) ?? [];
                  const rem = remainingOf(selectedLesson);
                  const joinable = Boolean(
                    selected?.course_group_id &&
                      [...up, ...down, ...full].some((x) => isSiblingHalf(x, selected))
                  );
                  const canStack = (list: TimetableAssignedSlot[]) =>
                    Boolean(selected && list.some((x) => isSiblingHalf(x, selected)) && !list.some((x) => sameLesson(x, selected)));
                  const canUp =
                    Boolean(selected) &&
                    !full.length &&
                    ((up.length === 0 && (rem > 0 || joinable)) || canStack(up));
                  const canDown =
                    Boolean(selected) &&
                    !full.length &&
                    ((down.length === 0 && (rem > 0 || joinable)) || canStack(down));
                  const canFull =
                    Boolean(selected) &&
                    ((full.length === 0 && !up.length && !down.length && rem >= 2) ||
                      canStack(full) ||
                      ((up.length > 0 || down.length > 0) && joinable));
                  return (
                    <td key={`${clock.id}-${d.week_day}`}>
                      <div className={styles.cell}>
                        <div className={styles.halves}>
                          {renderSlot(d.week_day, clock.id, 1, up, canUp)}
                          {renderSlot(d.week_day, clock.id, 2, down, canDown)}
                        </div>
                        {renderSlot(d.week_day, clock.id, 3, full, canFull)}
                      </div>
                    </td>
                  );
                })}
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
          <select
            className={styles.select}
            value={facultyId}
            onChange={(e) => {
              const id = e.target.value;
              setFacultyId(id);
              const fac = (lookups?.faculties ?? []).find((f) => f.id === id);
              const isMaster = isMasterName(fac?.name_az);
              if (isMaster) {
                const level =
                  (lookups?.education_levels ?? []).find((l) => (l.name_az || "").trim().toLowerCase() === "magistratura") ??
                  (lookups?.education_levels ?? []).find((l) => isMasterName(l.name_az)) ??
                  null;
                if (level?.id) setEducationLevelId(level.id);
              } else if (isMasterName((lookups?.education_levels ?? []).find((l) => l.id === educationLevelId)?.name_az)) {
                setEducationLevelId("");
              }
            }}
          >
            <option value="">— seç —</option>
            {(lookups?.faculties ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name_az ?? f.id}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Təhsil səviyyəsi</span>
          <select className={styles.select} value={educationLevelId} onChange={(e) => setEducationLevelId(e.target.value)}>
            <option value="">Hamısı</option>
            {(lookups?.education_levels ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name_az ?? l.id}
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
            <option value="">Hamısı</option>
            {(lookups?.kurs_options ?? [1, 2, 3, 4, 5]).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Akademik qrup</span>
          <SearchableSelect
            value={groupId}
            onChange={setGroupId}
            disabled={!facultyId}
            placeholder="— seç —"
            searchPlaceholder="Qrup axtar…"
            options={groups.map((g) => ({
              id: g.education_group_id,
              label:
                [
                  g.education_group_name,
                  g.education_level_az,
                  g.kurs != null ? `${g.kurs} kurs` : null,
                  g.education_year_name,
                ]
                  .filter(Boolean)
                  .join(" · ") || g.education_group_id,
            }))}
          />
          {facultyId && yearId && groups.length === 0 ? (
            <span className={styles.hint}>
              Bu fakültə və il üçün qrup tapılmadı. Səviyyəni və ya kursu “Hamısı” edin, magistratura üçün fakültədən Magistratura seçin.
            </span>
          ) : null}
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}
        {okMsg ? <p className={styles.okMsg}>{okMsg}</p> : null}
        {!error && !okMsg ? (
          <p className={styles.hint}>Fənni seçib sol sütunda üst və ya alt həftəyə, sağda isə hər həftəki tam dərsə atın. Bitirdikdən sonra təsdiq edin.</p>
        ) : null}

        <button
          type="button"
          className={styles.confirmBtn}
          disabled={busy || !groupId || confirmInfo.meeting_count <= 0 || hoursRemaining > 0 || confirmInfo.confirmed}
          onClick={() => void confirmTimetable()}
        >
          {confirmInfo.confirmed ? "Təsdiqlənib" : "Təsdiq et"}
        </button>
        {confirmInfo.meeting_count > 0 && !confirmInfo.confirmed ? (
          <p className={styles.hint}>
            {hoursRemaining > 0
              ? `Təsdiq üçün qalan ${hoursRemaining} saatı da cədvələ qoyun.`
              : `${confirmInfo.pending_count} dərs təsdiq gözləyir${confirmInfo.teacher_count > 0 ? ` · ${confirmInfo.teacher_count} müəllim` : ""}.`}
          </p>
        ) : null}

        <div className={styles.chips}>
          {!groupId ? (
            <div className={styles.emptyChips}>Qrup seçəndən sonra fənnlər burada görünəcək.</div>
          ) : groupedLessons.length === 0 ? (
            <div className={styles.emptyChips}>Yerləşdiriləcək fənn qalmayıb.</div>
          ) : (
            groupedLessons.map((group) => (
              <div key={group.key} className={styles.subjectBlock}>
                <div className={styles.subjectTitle}>{group.subject_name_az}</div>
                {group.items.map((lesson) => {
                  const isSel =
                    selected?.course_id === lesson.course_id &&
                    selected?.lesson_type_id === lesson.lesson_type_id &&
                    (selected?.course_group_id || "") === (lesson.course_group_id || "");
                  const rem = remainingOf(lesson);
                  const done = !chipActive(lesson);
                  const label = [lesson.lesson_type_az ?? lesson.lesson_letter, lesson.half_group_az].filter(Boolean).join(" · ");
                  return (
                    <button
                      key={lessonKey(lesson.course_id, lesson.lesson_type_id, lesson.course_group_id)}
                      type="button"
                      draggable={!done}
                      disabled={done}
                      className={`${styles.chip} ${isSel ? styles.chipSelected : ""} ${done ? styles.chipDone : ""}`}
                      onClick={() => {
                        if (done) return;
                        setSelected({
                          course_id: lesson.course_id,
                          lesson_type_id: lesson.lesson_type_id,
                          course_group_id: lesson.course_group_id || null,
                        });
                      }}
                      onDragStart={(e) => onDragStart(e, lesson)}
                      title={`${label}${lesson.teacher_fullname ? ` · ${lesson.teacher_fullname}` : ""} · qalan ${rem} saat`}
                    >
                      <span className={styles.chipName}>
                        <span className={styles.chipLetter}>{lesson.lesson_letter}</span>
                        {label}
                      </span>
                      <span className={styles.chipHours}>{rem}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

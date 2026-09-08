"use client";

import { useMemo, useState } from "react";

import type { StudentScheduleResponse, StudentScheduleSlot } from "@/lib/api";

import styles from "./StudentScheduleGrid.module.css";

const WEEK_FILTERS = [
  { id: "1", label: "Üst həftə" },
  { id: "2", label: "Alt həftə" },
] as const;

function weekTypeLabel(weekType: number | null | undefined) {
  if (weekType === 1) return "Üst";
  if (weekType === 2) return "Alt";
  if (weekType === 3) return "Hər həftə";
  return null;
}

function matchesFilter(slot: StudentScheduleSlot, filter: "1" | "2") {
  const wt = Number(slot.week_type ?? 3);
  return wt === 3 || String(wt) === filter;
}

function formatDate(value: string | null) {
  if (!value) return "";
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;
  const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return `${dmy[1].padStart(2, "0")}.${dmy[2].padStart(2, "0")}.${dmy[3]}`;
  return value;
}

function SlotCard({ slot }: { slot: StudentScheduleSlot }) {
  const badge = weekTypeLabel(slot.week_type);
  return (
    <div className={styles.slot}>
      <p className={styles.slotTitle}>{slot.subject_name_az || "Fənn"}</p>
      {slot.lesson_type_az ? <p className={styles.slotMeta}>{slot.lesson_type_az}</p> : null}
      {slot.teacher_fullname ? <p className={styles.slotMeta}>{slot.teacher_fullname}</p> : null}
      {slot.room_name ? <p className={styles.slotMeta}>{slot.room_name}</p> : null}
      {badge && Number(slot.week_type) !== 3 ? <span className={styles.badge}>{badge}</span> : null}
    </div>
  );
}

export function StudentScheduleGrid({ data }: { data: StudentScheduleResponse }) {
  const [filter, setFilter] = useState<"1" | "2">("1");
  const weekly = useMemo(() => data.weekly.filter((slot) => matchesFilter(slot, filter)), [data.weekly, filter]);

  const byCell = useMemo(() => {
    const map = new Map<string, StudentScheduleSlot[]>();
    for (const slot of weekly) {
      const key = `${slot.week_day}:${slot.clock_id ?? slot.start_time ?? ""}`;
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return map;
  }, [weekly]);

  if (data.weekly.length === 0 && data.upcoming.length === 0) {
    return <p className={styles.empty}>Bu tədris ili üçün dərs cədvəli hələ yoxdur.</p>;
  }

  return (
    <div className={styles.wrap}>
      {data.weekly.length > 0 ? (
        <>
          <div className={styles.filters} role="tablist" aria-label="Həftə növü">
            {WEEK_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={`${styles.filter} ${filter === item.id ? styles.filterActive : ""}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className={styles.hint}>Hər həftə keçirilən dərslər hər iki görünüşdə göstərilir.</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thTime}>Saat</th>
                  {data.days.map((day) => (
                    <th key={day.week_day}>{day.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.clocks.map((clock) => (
                  <tr key={clock.id}>
                    <th className={styles.thTime}>
                      {[clock.start_time, clock.end_time].filter(Boolean).join("–") || "—"}
                    </th>
                    {data.days.map((day) => {
                      const slots = byCell.get(`${day.week_day}:${clock.id}`) ?? [];
                      return (
                        <td key={`${day.week_day}-${clock.id}`}>
                          {slots.length ? (
                            <div className={styles.cellStack}>
                              {slots.map((slot) => (
                                <SlotCard key={`${slot.course_id}-${slot.week_type}-${slot.course_meeting_id}`} slot={slot} />
                              ))}
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className={styles.empty}>Həftəlik cədvəl hələ qurulmayıb.</p>
      )}

      {data.upcoming.length > 0 ? (
        <section className={styles.upcoming}>
          <h2 className={styles.upcomingTitle}>Yaxın dərslər</h2>
          <ul className={styles.upcomingList}>
            {data.upcoming.map((slot) => (
              <li key={`${slot.course_meeting_id}-${slot.meeting_date}`} className={styles.upcomingItem}>
                <div>
                  <p className={styles.slotTitle}>{slot.subject_name_az || "Fənn"}</p>
                  <p className={styles.slotMeta}>
                    {[
                      formatDate(slot.meeting_date),
                      [slot.start_time, slot.end_time].filter(Boolean).join("–"),
                      slot.lesson_type_az,
                      slot.room_name,
                      slot.teacher_fullname,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

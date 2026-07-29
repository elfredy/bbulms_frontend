"use client";

import { useState } from "react";
import Link from "next/link";

import type { TeacherCourseItem } from "@/lib/api";

import styles from "./TeacherDashboardTabs.module.css";

export type TeacherDashboardTabSpec = {
  id: "current" | "past" | "attestation" | "practice";
  label: string;
  subtitle: string;
  empty: string;
  items: TeacherCourseItem[];
};

type Props = {
  yearHint: string;
  tabs: TeacherDashboardTabSpec[];
  unnamedCourse: string;
  locale: string;
};

function displayName(c: TeacherCourseItem, fallback: string): string {
  const sub = c.subject_name_az?.trim();
  const code = (c.course_code ?? "").trim();
  return sub || code || fallback;
}

function CourseRows({
  items,
  empty,
  unnamedCourse,
  locale,
}: {
  items: TeacherCourseItem[];
  empty: string;
  unnamedCourse: string;
  locale: string;
}) {
  if (items.length === 0) {
    return <p className={styles.empty}>{empty}</p>;
  }

  const grouped = (() => {
    const m = new Map<
      string,
      {
        course_id: string;
        course_code: string | null | undefined;
        subject_name_az: string | null | undefined;
        education_year_name: string | null | undefined;
        lesson_type_az_set: Set<string>;
        course_teacher_ids: string[];
      }
    >();
    for (const c of items) {
      const cid = String(c.course_id ?? "").trim();
      const key = cid || c.course_teacher_id;
      const cur = m.get(key) ?? {
        course_id: cid,
        course_code: c.course_code,
        subject_name_az: c.subject_name_az,
        education_year_name: c.education_year_name,
        lesson_type_az_set: new Set<string>(),
        course_teacher_ids: [],
      };
      if (c.lesson_type_az) cur.lesson_type_az_set.add(String(c.lesson_type_az));
      cur.course_teacher_ids.push(String(c.course_teacher_id));
      m.set(key, cur);
    }
    return Array.from(m.values());
  })();

  return (
    <ul className={styles.courseList}>
      {grouped.map((g) => {
        const ctPrimary = g.course_teacher_ids[0];
        const ctIds = g.course_teacher_ids.join(",");
        const lessonTypes = Array.from(g.lesson_type_az_set.values()).filter(Boolean).join(" · ");
        const code = (g.course_code ?? "").trim();
        return (
        <li key={ctIds} className={styles.courseCard}>
          <h3 className={styles.courseName}>
            {(g.subject_name_az?.trim() || code || unnamedCourse) + (g.course_teacher_ids.length > 1 ? " (birləşdirilmiş)" : "")}
          </h3>
          {!g.subject_name_az?.trim() && code ? <div className={styles.courseCodePill}>{code}</div> : null}
          <p className={styles.courseMeta}>
            {[g.education_year_name, lessonTypes].filter(Boolean).join(" · ") || "\u00a0"}
          </p>
          <div className={styles.courseActions}>
            <Link href={`/${locale}/dashboard/journal/${ctPrimary}?ct_ids=${encodeURIComponent(ctIds)}`} className={styles.linkButton}>
              E-jurnal
            </Link>
          </div>
        </li>
      )})}
    </ul>
  );
}

export function TeacherDashboardTabs({ yearHint, tabs, unnamedCourse, locale }: Props) {
  const [active, setActive] = useState(tabs[0]?.id ?? "current");
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  if (!current) {
    return null;
  }

  return (
    <div>
      <p className={styles.yearBanner}>{yearHint}</p>

      <div className={styles.tabsWrap}>
        <div className={styles.tabsList} role="tablist" aria-label="Fənn qrupları">
          {tabs.map((tab) => {
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
                onClick={() => setActive(tab.id)}
              >
                {tab.label}
                <span className={styles.badge} aria-label={`Say: ${tab.items.length}`}>
                  {tab.items.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.panel} role="tabpanel" id={`panel-${current.id}`}>
        <p className={styles.panelSubtitle}>{current.subtitle}</p>
        <CourseRows items={current.items} empty={current.empty} unnamedCourse={unnamedCourse} locale={locale} />
      </div>
    </div>
  );
}

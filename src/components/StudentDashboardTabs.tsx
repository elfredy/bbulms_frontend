"use client";

import { useState } from "react";

import type { StudentCourseItem } from "@/lib/api";

import styles from "./TeacherDashboardTabs.module.css";

export type StudentDashboardTabSpec = {
  id: "current" | "past" | "future" | "attestation" | "practice";
  label: string;
  subtitle: string;
  empty: string;
  items: StudentCourseItem[];
};

type Props = {
  yearHint: string;
  tabs: StudentDashboardTabSpec[];
  unnamedCourse: string;
};

function displayName(c: StudentCourseItem, fallback: string): string {
  const sub = c.subject_name_az?.trim();
  return sub || fallback;
}

function CourseRows({
  items,
  empty,
  unnamedCourse,
}: {
  items: StudentCourseItem[];
  empty: string;
  unnamedCourse: string;
}) {
  if (items.length === 0) {
    return <p className={styles.empty}>{empty}</p>;
  }

  return (
    <ul className={styles.courseList}>
      {items.map((c) => (
        <li key={c.course_student_id} className={styles.courseCard}>
          <h3 className={styles.courseName}>{displayName(c, unnamedCourse)}</h3>
          <p className={styles.courseMeta}>{c.education_year_name || "\u00a0"}</p>
        </li>
      ))}
    </ul>
  );
}

export function StudentDashboardTabs({ yearHint, tabs, unnamedCourse }: Props) {
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

      <div className={styles.panel} role="tabpanel">
        <p className={styles.panelSubtitle}>{current.subtitle}</p>
        <CourseRows items={current.items} empty={current.empty} unnamedCourse={unnamedCourse} />
      </div>
    </div>
  );
}

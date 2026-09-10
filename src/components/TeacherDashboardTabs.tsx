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

type CourseCard = {
  course_id: string;
  course_code: string | null | undefined;
  subject_name_az: string | null | undefined;
  education_year_name: string | null | undefined;
  semester_id: string | null | undefined;
  semester_name_az: string | null | undefined;
  education_group_name_set: Set<string>;
  lesson_type_az_set: Set<string>;
  lesson_type_code_set: Set<string>;
  course_teacher_ids: string[];
};

function lessonLetter(codes: Set<string>, names: Set<string>): string {
  const code = Array.from(codes)
    .map((c) => c.toUpperCase())
    .join(" ");
  const name = Array.from(names).join(" ").toLowerCase();
  if (code.includes("LEC") || /\bM\b/.test(code) || name.includes("mühazirə") || name.includes("muhazire")) {
    return "M";
  }
  if (code.includes("SEM") || /\bS\b/.test(code) || name.includes("seminar")) return "S";
  if (code.includes("LAB") || /\bL\b/.test(code) || name.includes("laborator")) return "L";
  if (code.includes("FM") || name.includes("fərdi")) return "F";
  const first = Array.from(codes)[0] || Array.from(names)[0] || "";
  return (first.trim().charAt(0) || "M").toUpperCase();
}

function sectionTitle(card: CourseCard): string {
  const sem = card.semester_name_az?.trim();
  const year = card.education_year_name?.trim();
  if (sem && year) return `${sem} : ${year}`;
  return year || sem || "Digər";
}

function mergeCourses(items: TeacherCourseItem[]): CourseCard[] {
  const m = new Map<string, CourseCard>();
  for (const c of items) {
    const cid = String(c.course_id ?? "").trim();
    const key = cid || c.course_teacher_id;
    const cur = m.get(key) ?? {
      course_id: cid,
      course_code: c.course_code,
      subject_name_az: c.subject_name_az,
      education_year_name: c.education_year_name,
      semester_id: c.semester_id,
      semester_name_az: c.semester_name_az,
      education_group_name_set: new Set<string>(),
      lesson_type_az_set: new Set<string>(),
      lesson_type_code_set: new Set<string>(),
      course_teacher_ids: [],
    };
    if (c.education_group_name) {
      for (const part of String(c.education_group_name).split(",")) {
        const name = part.trim();
        if (name) cur.education_group_name_set.add(name);
      }
    }
    if (c.lesson_type_az) cur.lesson_type_az_set.add(String(c.lesson_type_az));
    if (c.lesson_type_code) cur.lesson_type_code_set.add(String(c.lesson_type_code));
    cur.course_teacher_ids.push(String(c.course_teacher_id));
    m.set(key, cur);
  }
  return Array.from(m.values());
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

  const grouped = mergeCourses(items);
  const sections = new Map<string, CourseCard[]>();
  for (const g of grouped) {
    const title = sectionTitle(g);
    const list = sections.get(title) ?? [];
    list.push(g);
    sections.set(title, list);
  }

  return (
    <div className={styles.semesterList}>
      {Array.from(sections.entries()).map(([title, cards]) => (
        <section key={title} className={styles.semesterBlock}>
          <h2 className={styles.semesterTitle}>{title}</h2>
          <ul className={styles.courseList}>
            {cards.map((g) => {
              const ctPrimary = g.course_teacher_ids[0];
              const ctIds = g.course_teacher_ids.join(",");
              const code = (g.course_code ?? "").trim();
              const letter = lessonLetter(g.lesson_type_code_set, g.lesson_type_az_set);
              const groupNames = Array.from(g.education_group_name_set.values()).filter(Boolean).join(", ");
              const subtitle = code || groupNames;
              return (
                <li key={ctIds} className={styles.courseCard}>
                  <div className={styles.courseMain}>
                    <span className={styles.lessonBadge} aria-hidden>
                      {letter}
                    </span>
                    <div className={styles.courseBody}>
                      <h3 className={styles.courseName}>{g.subject_name_az?.trim() || code || unnamedCourse}</h3>
                      {subtitle ? <p className={styles.courseCode}>{subtitle}</p> : null}
                    </div>
                  </div>
                  <div className={styles.courseActions}>
                    <Link
                      href={`/${locale}/dashboard/journal/${ctPrimary}?ct_ids=${encodeURIComponent(ctIds)}`}
                      className={styles.linkButton}
                    >
                      E-jurnal
                    </Link>
                    <Link
                      href={`/${locale}/dashboard/journal/${ctPrimary}?ct_ids=${encodeURIComponent(ctIds)}&tab=lessons`}
                      className={styles.linkButton}
                    >
                      Dərslər
                    </Link>
                    <Link
                      href={`/${locale}/dashboard/journal/${ctPrimary}?ct_ids=${encodeURIComponent(ctIds)}&tab=files`}
                      className={styles.linkButton}
                    >
                      Fayllar
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
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

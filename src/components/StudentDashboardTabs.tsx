"use client";

import Link from "next/link";
import { useState } from "react";

import type { StudentCourseItem, StudentScoreSummary } from "@/lib/api";

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
  locale: string;
  summary?: StudentScoreSummary | null;
};

function hasText(v: string | null | undefined): boolean {
  return v != null && String(v).trim() !== "";
}

function ScoreLine({ c }: { c: StudentCourseItem }) {
  if (!hasText(c.before_point) && !hasText(c.end_point)) return null;
  return (
    <p className={styles.courseMeta} title={c.is_final ? "Jurnal bağlanıb (rəsmi)" : "Cari hesab (təsdiqlənmiş dərslər)"}>
      {hasText(c.before_point) ? <>İmtahana qədər: <strong>{c.before_point}</strong></> : null}
      {hasText(c.exam_point) ? <> · İmtahan: <strong>{c.exam_point}</strong></> : null}
      {hasText(c.end_point) ? <> · Yekun: <strong>{c.end_point}</strong></> : null}
      {c.is_final ? null : " (cari)"}
    </p>
  );
}

function SummaryCards({ summary }: { summary: StudentScoreSummary }) {
  const cards: { label: string; value: string; hint?: string }[] = [];
  if (hasText(summary.average_point)) {
    cards.push({
      label: "Ümumi ortalama bal",
      value: summary.average_point as string,
      hint: `Jurnalı bağlanmış ${summary.final_count} fənn üzrə yekun ballar${
        hasText(summary.weighted_average_point) ? ` · kreditə görə: ${summary.weighted_average_point}` : ""
      }`,
    });
  }
  if (hasText(summary.current_before_average)) {
    cards.push({
      label: "İmtahana qədərki ortalama bal",
      value: summary.current_before_average as string,
      hint: `Cari ${summary.current_count} fənn üzrə (təsdiqlənmiş dərslərə görə)`,
    });
  }
  if (cards.length === 0) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.7rem", marginTop: "1rem" }}>
      {cards.map((card) => (
        <div
          key={card.label}
          style={{ padding: "0.85rem 0.95rem", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
        >
          <p style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)" }}>{card.value}</p>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>{card.label}</p>
          {card.hint ? <p style={{ margin: "0.2rem 0 0", fontSize: "0.76rem", color: "var(--muted)" }}>{card.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

function displayName(c: StudentCourseItem, fallback: string): string {
  const sub = c.subject_name_az?.trim();
  return sub || fallback;
}

function CourseRows({
  items,
  empty,
  unnamedCourse,
  locale,
}: {
  items: StudentCourseItem[];
  empty: string;
  unnamedCourse: string;
  locale: string;
}) {
  if (items.length === 0) {
    return <p className={styles.empty}>{empty}</p>;
  }

  return (
    <ul className={styles.courseList}>
      {items.map((c) => (
        <li key={c.course_student_id} className={styles.courseCard}>
          <Link href={`/${locale}/dashboard/courses/${encodeURIComponent(c.course_id)}`} className={styles.courseCardLink}>
            <h3 className={styles.courseName}>{displayName(c, unnamedCourse)}</h3>
            <p className={styles.courseMeta}>{c.education_year_name || "\u00a0"}</p>
            <ScoreLine c={c} />
            <span className={styles.linkButton}>Ətraflı</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function StudentDashboardTabs({ yearHint, tabs, unnamedCourse, locale, summary }: Props) {
  const [active, setActive] = useState(tabs[0]?.id ?? "current");
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  if (!current) {
    return null;
  }

  return (
    <div>
      <p className={styles.yearBanner}>{yearHint}</p>
      {summary ? <SummaryCards summary={summary} /> : null}

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
        <CourseRows items={current.items} empty={current.empty} unnamedCourse={unnamedCourse} locale={locale} />
      </div>
    </div>
  );
}

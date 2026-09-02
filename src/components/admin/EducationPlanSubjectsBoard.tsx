"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EducationPlanItemRowMenu } from "./EducationPlanItemRowMenu";

import type { AdminDictOption, AdminEducationPlanSubjectItem } from "@/lib/api";

import styles from "../../app/[locale]/dashboard/dashboard.module.css";

function n(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return 0;
  return Number(v);
}

function kindOf(s: AdminEducationPlanSubjectItem): "SUBJECT" | "EXPERIENCE" | "THESIS" {
  const t = String(s.type_name ?? "SUBJECT").toUpperCase();
  if (t === "EXPERIENCE") return "EXPERIENCE";
  if (t === "THESIS") return "THESIS";
  return "SUBJECT";
}

export function EducationPlanSubjectsBoard({
  locale,
  planId,
  subjects,
  semesters,
}: {
  locale: string;
  planId: string;
  subjects: AdminEducationPlanSubjectItem[];
  semesters: AdminDictOption[];
}) {
  const [q, setQ] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const base = `/${locale}/dashboard/admin/education-plans/${planId}`;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return subjects.filter((s) => {
      if (semesterId && String(s.semester_id ?? "") !== semesterId) return false;
      if (!needle) return true;
      const blob = [s.subject_name_az, s.code, s.subject_block_name_az, s.semester_name_az]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [subjects, q, semesterId]);

  const groups = useMemo(() => {
    const map = new Map<string, AdminEducationPlanSubjectItem[]>();
    for (const s of filtered) {
      const block = s.subject_block_name_az?.trim() || (kindOf(s) === "EXPERIENCE" ? "Təcrübə" : kindOf(s) === "THESIS" ? "Attestasiya" : "Blok göstərilməyib");
      const sem = s.semester_name_az?.trim() || "Semestr göstərilməyib";
      const title = semesterId ? block : `${block} · ${sem}`;
      const arr = map.get(title) ?? [];
      arr.push(s);
      map.set(title, arr);
    }
    return [...map.entries()].map(([title, items]) => ({ title, items }));
  }, [filtered, semesterId]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className={styles.toolbar}>
        <input
          className={`${styles.input} ${styles.toolbarGrow}`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Axtar"
        />
        <select className={styles.select} value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
          <option value="">Semestr</option>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name_az || s.id}
            </option>
          ))}
        </select>
        <Link className={styles.actionLinkPrimary} href={`${base}/subjects/new${semesterId ? `?semester_id=${encodeURIComponent(semesterId)}` : ""}`}>
          Fənn əlavə et
        </Link>
        <Link className={styles.actionLinkPrimary} href={`${base}/experiences/new${semesterId ? `?semester_id=${encodeURIComponent(semesterId)}` : ""}`}>
          Təcrübə əlavə et
        </Link>
        <Link className={styles.actionLinkPrimary} href={`${base}/theses/new${semesterId ? `?semester_id=${encodeURIComponent(semesterId)}` : ""}`}>
          Attestasiya əlavə et
        </Link>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.alertMuted}>Fənn yoxdur</p>
      ) : (
        <div className={styles.tableCard} style={{ marginTop: 0 }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>#</th>
                <th className={styles.th}>Kod</th>
                <th className={styles.th}>Fənn adı</th>
                <th className={styles.th}>Kredit</th>
                <th className={styles.th}>Ümumi saatlar</th>
                <th className={styles.th}>Auditoriyadan kənar</th>
                <th className={styles.th}>Auditoriyadaxili</th>
                <th className={styles.th}>Mühazirə</th>
                <th className={styles.th}>Seminar</th>
                <th className={styles.th}>Laboratoriya</th>
                <th className={styles.th}>Kurs işi</th>
                <th className={styles.th} />
              </tr>
            </thead>
            {groups.map((g) => {
              const credit = g.items.reduce((a, s) => a + n(s.credit), 0);
              const m = g.items.reduce((a, s) => a + n(s.m_hours), 0);
              const semH = g.items.reduce((a, s) => a + n(s.s_hours), 0);
              const l = g.items.reduce((a, s) => a + n(s.l_hours), 0);
              const inn = g.items.reduce((a, s) => a + n(s.in_hours ?? n(s.m_hours) + n(s.s_hours) + n(s.l_hours) + n(s.fm_hours)), 0);
              const out = g.items.reduce((a, s) => a + n(s.out_hours), 0);
              const all = inn + out;
              return (
                <tbody key={g.title}>
                  <tr className={styles.blockHead}>
                    <td className={styles.td} colSpan={3}>
                      {g.title}
                    </td>
                    <td className={styles.td}>{credit || ""}</td>
                    <td className={styles.td}>{all || ""}</td>
                    <td className={styles.td}>{out || ""}</td>
                    <td className={styles.td}>{inn || ""}</td>
                    <td className={styles.td}>{m || ""}</td>
                    <td className={styles.td}>{semH || ""}</td>
                    <td className={styles.td}>{l || ""}</td>
                    <td className={styles.td} />
                    <td className={styles.td} />
                  </tr>
                  {g.items.map((s, i) => {
                    const inH = n(s.in_hours ?? n(s.m_hours) + n(s.s_hours) + n(s.l_hours) + n(s.fm_hours));
                    const outH = n(s.out_hours);
                    return (
                      <tr key={`${s.type_name}-${s.id}`} className={styles.row}>
                        <td className={`${styles.td} ${styles.tdNum}`}>{i + 1}</td>
                        <td className={styles.td}>{s.code ?? "—"}</td>
                        <td className={`${styles.td} ${styles.tdName}`}>{s.subject_name_az ?? s.code ?? s.id}</td>
                        <td className={styles.td}>{s.credit ?? "—"}</td>
                        <td className={styles.td}>{inH + outH || "—"}</td>
                        <td className={styles.td}>{s.out_hours ?? (outH || "—")}</td>
                        <td className={styles.td}>{s.in_hours ?? (inH || "—")}</td>
                        <td className={styles.td}>{s.m_hours ?? "—"}</td>
                        <td className={styles.td}>{s.s_hours ?? "—"}</td>
                        <td className={styles.td}>{s.l_hours ?? "—"}</td>
                        <td className={styles.td}>{n(s.course_work) ? "Var" : "—"}</td>
                        <td className={styles.td}>
                          <EducationPlanItemRowMenu planId={planId} itemId={s.id} kind={kindOf(s)} locale={locale} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";

import styles from "./AdminForm.module.css";

export function AcademicCalendarFilter({
  years,
  currentId,
  locale,
}: {
  years: { id: string; name?: string | null }[];
  currentId: string;
  locale: string;
}) {
  const router = useRouter();
  return (
    <label className={styles.field} style={{ maxWidth: 360, marginBottom: 16 }}>
      <span className={styles.label}>Tədris ili</span>
      <select
        className={styles.select}
        value={currentId}
        onChange={(e) => {
          const params = new URLSearchParams();
          if (e.target.value) params.set("education_year_id", e.target.value);
          router.push(`/${locale}/dashboard/admin/academic-calendar?${params.toString()}`);
        }}
      >
        {years.map((y) => (
          <option key={y.id} value={y.id}>
            {y.name || y.id}
          </option>
        ))}
      </select>
    </label>
  );
}

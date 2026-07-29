import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { adminListCourses, getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string }>;
};

export default async function AdminCoursesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const q = (sp.q ?? "").trim() || null;
  const data = await adminListCourses(q, null, null, 100, 0);
  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>{t("timetable")}</h1>
            <p className={styles.meta}>{t("loadError")}</p>
          </div>
          <Link className={styles.meta} href={`/${locale}/dashboard/admin`}>
            {t("back")}
          </Link>
        </header>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{t("timetable")}</h1>
          <p className={styles.meta}>{t("coursesHint")}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href={`/${locale}/dashboard/admin/courses/new`} style={primaryButtonStyle}>
            Course yarat
          </Link>
          <Link className={styles.meta} href={`/${locale}/dashboard/admin`}>
            {t("back")}
          </Link>
        </div>
      </header>

      <div className={styles.content}>
        <form style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("searchPlaceholder")}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            {t("search")}
          </button>
        </form>

        <div style={{ marginTop: 12 }}>
          {data.items.length === 0 ? (
            <p className={styles.alertMuted}>{t("empty")}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
              {data.items.map((c) => (
                <li key={c.course_id}>
                  <Link href={`/${locale}/dashboard/admin/courses/${c.course_id}`}>
                    {c.subject_name_az ?? c.course_code ?? c.course_id}
                  </Link>
                  <div className={styles.meta}>
                    {[c.education_year_name, c.evaluation_type_id, c.course_code].filter(Boolean).join(" · ") || "\u00a0"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  fontWeight: 600,
  textDecoration: "none",
  whiteSpace: "nowrap",
};


import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { adminListCourseMeetings, getMe } from "@/lib/api";

import styles from "../../../dashboard.module.css";
import tableStyles from "./meetings-table.module.css";

type Props = {
  params: Promise<{ locale: string; courseId: string }>;
  searchParams?: Promise<{ from?: string; to?: string }>;
};

function fmtTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  const s = (start ?? "").trim();
  const e = (end ?? "").trim();
  if (s && e) return `${s} – ${e}`;
  return s || e || "—";
}

export default async function AdminCourseMeetingsPage({ params, searchParams }: Props) {
  const { locale, courseId } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const from = (sp.from ?? "").trim() || null;
  const to = (sp.to ?? "").trim() || null;

  const data = await adminListCourseMeetings(courseId, from, to);
  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>{t("timetable")}</h1>
            <p className={styles.meta}>{t("loadError")}</p>
          </div>
          <Link className={styles.meta} href={`/${locale}/dashboard/admin/courses`}>
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
          <h1 className={styles.title}>{t("timetableCourse", { id: courseId })}</h1>
          <p className={styles.meta}>{t("meetingsHint")}</p>
        </div>
        <Link className={styles.meta} href={`/${locale}/dashboard/admin/courses`}>
          {t("back")}
        </Link>
      </header>

      <div className={styles.content}>
        <form
          action={`/${locale}/dashboard/admin/courses/${courseId}`}
          method="get"
          style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <div className={styles.meta}>{t("fromDate")}</div>
            <input
              name="from"
              type="date"
              defaultValue={from ?? ""}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
              }}
            />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <div className={styles.meta}>{t("toDate")}</div>
            <input
              name="to"
              type="date"
              defaultValue={to ?? ""}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
              }}
            />
          </div>
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
            {t("apply")}
          </button>
        </form>

        <div className={tableStyles.tableWrap}>
          {data.items.length === 0 ? (
            <p className={styles.alertMuted} style={{ margin: 0, padding: "1rem 1.15rem" }}>
              {t("emptyMeetings")}
            </p>
          ) : (
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th className={tableStyles.th}>Tarix</th>
                  <th className={tableStyles.th}>Saat</th>
                  <th className={tableStyles.th}>Dərs növü</th>
                  <th className={tableStyles.th}>Müəllim</th>
                  <th className={tableStyles.th}>Otaq</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((m) => (
                  <tr key={m.course_meeting_id} className={tableStyles.row}>
                    <td className={tableStyles.td}>{m.meeting_date?.trim() || "—"}</td>
                    <td className={`${tableStyles.td} ${tableStyles.tdTime}`}>{fmtTimeRange(m.start_time, m.end_time)}</td>
                    <td className={tableStyles.td}>{m.lesson_type_az?.trim() || "—"}</td>
                    <td className={tableStyles.td}>{m.teacher_fullname?.trim() || "—"}</td>
                    <td className={tableStyles.td}>{m.room_name?.trim() || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}


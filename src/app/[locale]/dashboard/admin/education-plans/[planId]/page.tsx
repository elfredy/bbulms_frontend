import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { adminGetEducationPlan, getMe } from "@/lib/api";

import styles from "../../../dashboard.module.css";

type Props = { params: Promise<{ locale: string; planId: string }> };

export default async function AdminEducationPlanDetailPage({ params }: Props) {
  const { locale, planId } = await params;
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const data = await adminGetEducationPlan(planId);
  if (!data) notFound();

  const p = data.plan;
  const specialty = [p.specialty_name_az, p.faculty_name_az].filter(Boolean).join(" / ") || p.org_name_az;

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{p.name ?? t("educationPlanDetail")}</h1>
          <p className={styles.meta}>
            {[specialty, p.education_level_name_az, p.education_type_name_az].filter(Boolean).join(" · ")}
          </p>
          {p.note ? <p className={styles.meta}>{p.note}</p> : null}
        </div>
        <div className={styles.headerActions}>
          <Link
            className={styles.actionLink}
            href={`/${locale}/dashboard/admin/subject-groups/new?education_plan_id=${encodeURIComponent(planId)}`}
          >
            {t("subjectGroupCreate")}
          </Link>
          <Link
            className={styles.actionLink}
            href={`/${locale}/dashboard/admin/subject-groups?education_plan_id=${encodeURIComponent(planId)}`}
          >
            {t("subjectGroups")}
          </Link>
          <Link className={styles.meta} href={`/${locale}/dashboard/admin/education-plans`}>
            {t("back")}
          </Link>
        </div>
      </header>

      <div className={styles.content} style={{ display: "grid", gap: 18 }}>
        <section>
          <h2 className={styles.welcome} style={{ fontSize: "1.05rem" }}>
            {t("educationPlanSubjects")}
          </h2>
          {data.subjects.length === 0 ? (
            <p className={styles.alertMuted}>{t("empty")}</p>
          ) : (
            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>#</th>
                    <th className={styles.th}>{t("colSubject")}</th>
                    <th className={styles.th}>{t("colSemester")}</th>
                    <th className={styles.th}>Kod</th>
                    <th className={styles.th}>Kredit</th>
                    <th className={styles.th}>M</th>
                    <th className={styles.th}>S</th>
                    <th className={styles.th}>L</th>
                    <th className={styles.th}>Blok</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subjects.map((s, i) => (
                    <tr key={s.id} className={styles.row}>
                      <td className={`${styles.td} ${styles.tdNum}`}>{i + 1}</td>
                      <td className={`${styles.td} ${styles.tdName}`}>{s.subject_name_az ?? s.code ?? s.id}</td>
                      <td className={styles.td}>{s.semester_name_az ?? "—"}</td>
                      <td className={styles.td}>{s.code ?? "—"}</td>
                      <td className={styles.td}>{s.credit ?? "—"}</td>
                      <td className={styles.td}>{s.m_hours ?? "—"}</td>
                      <td className={styles.td}>{s.s_hours ?? "—"}</td>
                      <td className={styles.td}>{s.l_hours ?? "—"}</td>
                      <td className={styles.td}>{s.subject_block_name_az ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.tableFooter}>
                <span>
                  {t("rowCount")}: {data.subjects.length}
                </span>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className={styles.welcome} style={{ fontSize: "1.05rem" }}>
            {t("educationPlanGroups")}
          </h2>
          {data.groups.length === 0 ? (
            <p className={styles.alertMuted}>{t("empty")}</p>
          ) : (
            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>#</th>
                    <th className={styles.th}>{t("colName")}</th>
                    <th className={styles.th}>{t("colYear")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groups.map((g, i) => (
                    <tr key={g.id} className={styles.row}>
                      <td className={`${styles.td} ${styles.tdNum}`}>{i + 1}</td>
                      <td className={`${styles.td} ${styles.tdName}`}>
                        <Link href={`/${locale}/dashboard/admin/groups/${g.id}`}>{g.name ?? g.id}</Link>
                      </td>
                      <td className={styles.td}>{g.education_year_name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

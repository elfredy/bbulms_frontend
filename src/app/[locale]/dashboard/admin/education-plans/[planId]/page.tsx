import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { EducationPlanSubjectsBoard } from "@/components/admin/EducationPlanSubjectsBoard";
import { adminEducationPlanLookups, adminGetEducationPlan, getMe } from "@/lib/api";

import styles from "../../../dashboard.module.css";

type Props = { params: Promise<{ locale: string; planId: string }> };

export default async function AdminEducationPlanDetailPage({ params }: Props) {
  const { locale, planId } = await params;
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const [data, lookups] = await Promise.all([adminGetEducationPlan(planId), adminEducationPlanLookups()]);
  if (!data) notFound();

  const p = data.plan;
  const specialty = [p.specialty_name_az, p.faculty_name_az].filter(Boolean).join(" / ") || p.org_name_az;
  const creditTotal = data.subjects.reduce((a, s) => a + Number(s.credit || 0), 0);

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>
            {p.name ?? t("educationPlanDetail")}
            {creditTotal ? ` · Kredit ${creditTotal}` : ""}
          </h1>
          <p className={styles.meta}>
            {[specialty, p.education_level_name_az, p.education_type_name_az].filter(Boolean).join(" · ")}
          </p>
          {p.note ? <p className={styles.meta}>{p.note}</p> : null}
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.actionLink} href={`/${locale}/dashboard/admin/education-plans/${planId}/groups`}>
            Qrup əlavə et
          </Link>
          <Link className={styles.actionLink} href={`/${locale}/dashboard/admin/education-plans/${planId}/edit`}>
            Yenilə
          </Link>
          <Link className={styles.actionLink} href={`/${locale}/dashboard/admin/education-plans`} aria-label="Bağla">
            ×
          </Link>
        </div>
      </header>

      <div className={styles.content} style={{ display: "grid", gap: 18 }}>
        <section>
          <EducationPlanSubjectsBoard
            locale={locale}
            planId={planId}
            subjects={data.subjects}
            semesters={lookups?.semesters ?? []}
          />
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

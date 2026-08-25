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

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{p.name ?? t("educationPlanDetail")}</h1>
          <p className={styles.meta}>
            {[p.org_name_az, p.education_level_name_az, p.education_type_name_az, p.status_name_az].filter(Boolean).join(" · ")}
          </p>
          {p.note ? <p className={styles.meta}>{p.note}</p> : null}
        </div>
        <Link className={styles.meta} href={`/${locale}/dashboard/admin/education-plans`}>
          {t("back")}
        </Link>
      </header>

      <div className={styles.content} style={{ display: "grid", gap: 18 }}>
        <section>
          <h2 className={styles.welcome} style={{ fontSize: "1.05rem" }}>
            {t("educationPlanSubjects")}
          </h2>
          {data.subjects.length === 0 ? (
            <p className={styles.alertMuted}>{t("empty")}</p>
          ) : (
            <ul style={{ margin: 8, paddingLeft: 18, display: "grid", gap: 10 }}>
              {data.subjects.map((s) => (
                <li key={s.id}>
                  <div>{s.subject_name_az ?? s.code ?? s.id}</div>
                  <div className={styles.meta}>
                    {[
                      s.semester_name_az,
                      s.subject_block_name_az,
                      s.code,
                      s.credit != null ? `${s.credit} kredit` : null,
                      s.m_hours != null ? `M ${s.m_hours}` : null,
                      s.s_hours != null ? `S ${s.s_hours}` : null,
                      s.l_hours != null ? `L ${s.l_hours}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className={styles.welcome} style={{ fontSize: "1.05rem" }}>
            {t("educationPlanGroups")}
          </h2>
          {data.groups.length === 0 ? (
            <p className={styles.alertMuted}>{t("empty")}</p>
          ) : (
            <ul style={{ margin: 8, paddingLeft: 18, display: "grid", gap: 8 }}>
              {data.groups.map((g) => (
                <li key={g.id}>
                  <Link href={`/${locale}/dashboard/admin/groups/${g.id}`}>{g.name ?? g.id}</Link>
                  <div className={styles.meta}>{g.education_year_name ?? "\u00a0"}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

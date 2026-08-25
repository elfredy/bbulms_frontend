import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { adminListEducationPlans, getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string }>;
};

export default async function AdminEducationPlansPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const q = (sp.q ?? "").trim() || null;
  const data = await adminListEducationPlans(q, 100, 0);
  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>{t("educationPlans")}</h1>
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
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{t("educationPlans")}</h1>
          <p className={styles.meta}>{t("educationPlansHint")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/${locale}/dashboard/admin/education-plans/new`} className={styles.actionLink}>
            {t("educationPlanCreate")}
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
              {data.items.map((p) => (
                <li key={p.id}>
                  <Link href={`/${locale}/dashboard/admin/education-plans/${p.id}`}>{p.name ?? p.id}</Link>
                  <div className={styles.meta}>
                    {[
                      p.org_name_az,
                      p.education_level_name_az,
                      p.education_type_name_az,
                      p.status_name_az,
                      `${p.subject_count} fənn`,
                      `${p.group_count} qrup`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
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

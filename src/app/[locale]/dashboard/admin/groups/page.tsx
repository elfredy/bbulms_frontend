import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { adminListGroups, getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string }>;
};

export default async function AdminGroupsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const q = (sp.q ?? "").trim() || null;
  const data = await adminListGroups(q, 100, 0);
  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>{t("groups")}</h1>
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
          <h1 className={styles.title}>{t("groups")}</h1>
          <p className={styles.meta}>{t("groupsHint")}</p>
        </div>
        <Link className={styles.meta} href={`/${locale}/dashboard/admin`}>
          {t("back")}
        </Link>
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
              {data.items.map((g) => (
                <li key={g.education_group_id}>
                  <Link href={`/${locale}/dashboard/admin/groups/${g.education_group_id}`}>
                    {g.education_group_name ?? g.education_group_id}
                  </Link>
                  <div className={styles.meta}>
                    {[g.education_year_name, `${g.student_count} ${t("students")}`].filter(Boolean).join(" · ")}
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


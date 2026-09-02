import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { EducationPlanRowMenu } from "@/components/admin/EducationPlanRowMenu";
import { adminEducationPlanLookups, adminListEducationPlans, getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    q?: string;
    education_type_id?: string;
    education_level_id?: string;
    status_id?: string;
    page?: string;
    pageSize?: string;
  }>;
};

function statusClass(name: string | null | undefined) {
  const n = (name ?? "").toLowerCase();
  if (n.includes("təsdiq olunub") || n.includes("approved")) return styles.badgeOk;
  if (n.includes("gözləyir") || n.includes("təsdiq olunur") || n.includes("pending")) return styles.badgePending;
  return styles.badge;
}

function specialtyLabel(p: { specialty_name_az?: string | null; faculty_name_az?: string | null; org_name_az: string | null }) {
  const parts = [p.specialty_name_az, p.faculty_name_az].filter(Boolean);
  return parts.length ? parts.join(" / ") : p.org_name_az || "—";
}

function pageList(current: number, last: number) {
  const pages = new Set<number>([1, last, current, current - 1, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
}

export default async function AdminEducationPlansPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const q = (sp.q ?? "").trim();
  const educationTypeId = (sp.education_type_id ?? "").trim();
  const educationLevelId = (sp.education_level_id ?? "").trim();
  const statusId = (sp.status_id ?? "").trim();
  const pageSize = Math.min(500, Math.max(1, Number(sp.pageSize) || 20));
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * pageSize;

  const [data, lookups] = await Promise.all([
    adminListEducationPlans({
      q: q || null,
      education_type_id: educationTypeId || null,
      education_level_id: educationLevelId || null,
      status_id: statusId || null,
      limit: pageSize,
      offset,
    }),
    adminEducationPlanLookups(),
  ]);

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

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / pageSize));
  const qs = (extra: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (educationTypeId) params.set("education_type_id", educationTypeId);
    if (educationLevelId) params.set("education_level_id", educationLevelId);
    if (statusId) params.set("status_id", statusId);
    params.set("pageSize", String(pageSize));
    Object.entries(extra).forEach(([k, v]) => {
      if (v == null || v === "") params.delete(k);
      else params.set(k, String(v));
    });
    return params.toString();
  };

  const stats = data.stats ?? { bachelor_count: 0, master_count: 0, fulltime_count: 0, parttime_count: 0, total: 0 };

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{t("educationPlans")}</h1>
          <p className={styles.meta}>{t("educationPlansHint")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/${locale}/dashboard/admin/education-plans/new`} className={styles.actionLinkPrimary}>
            {t("educationPlanCreate")}
          </Link>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statValue}>
              {stats.bachelor_count} / {stats.master_count}
            </p>
            <p className={styles.statLabel}>{t("educationPlanLevelStats")}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>
              {stats.fulltime_count} / {stats.parttime_count}
            </p>
            <p className={styles.statLabel}>{t("educationPlanTypeStats")}</p>
          </div>
        </div>

        <form className={styles.toolbar}>
          <input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className={styles.input} />
          <select name="education_level_id" defaultValue={educationLevelId} className={styles.select}>
            <option value="">{t("educationLevel")}</option>
            {(lookups?.education_levels ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name_az ?? o.id}
              </option>
            ))}
          </select>
          <select name="education_type_id" defaultValue={educationTypeId} className={styles.select}>
            <option value="">{t("educationType")}</option>
            {(lookups?.education_types ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name_az ?? o.id}
              </option>
            ))}
          </select>
          <select name="status_id" defaultValue={statusId} className={styles.select}>
            <option value="">{t("status")}</option>
            {(lookups?.statuses ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name_az ?? o.id}
              </option>
            ))}
          </select>
          <select name="pageSize" defaultValue={String(pageSize)} className={styles.select}>
            {[20, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <input type="hidden" name="page" value="1" />
          <button type="submit" className={styles.button}>
            {t("search")}
          </button>
        </form>

        {data.items.length === 0 ? (
          <p className={styles.alertMuted}>{t("empty")}</p>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>#</th>
                  <th className={styles.th}>{t("colName")}</th>
                  <th className={styles.th}>{t("colSpecialty")}</th>
                  <th className={styles.th}>{t("educationType")}</th>
                  <th className={styles.th}>{t("educationLevel")}</th>
                  <th className={styles.th}>{t("status")}</th>
                  <th className={styles.th} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((p, i) => (
                  <tr key={p.id} className={styles.row}>
                    <td className={`${styles.td} ${styles.tdNum}`}>{offset + i + 1}</td>
                    <td className={`${styles.td} ${styles.tdName}`}>
                      <Link href={`/${locale}/dashboard/admin/education-plans/${p.id}`} title={p.note ?? undefined}>
                        {p.name ?? p.id}
                      </Link>
                      <div className={styles.tdMuted}>
                        {[p.subject_count != null ? `${p.subject_count} fənn` : null, p.group_count != null ? `${p.group_count} qrup` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </td>
                    <td className={styles.td}>{specialtyLabel(p)}</td>
                    <td className={styles.td}>{p.education_type_name_az ?? "—"}</td>
                    <td className={styles.td}>{p.education_level_name_az ?? "—"}</td>
                    <td className={styles.td}>
                      <span className={statusClass(p.status_name_az)}>{p.status_name_az ?? "—"}</span>
                    </td>
                    <td className={styles.td}>
                      <EducationPlanRowMenu planId={p.id} locale={locale} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.tableFooter}>
              <span>
                {t("rowCount")}: {data.total}
              </span>
              <nav className={styles.pager} aria-label="Pagination">
                {page > 1 ? (
                  <Link className={styles.pageLink} href={`?${qs({ page: page - 1 })}`}>
                    ‹
                  </Link>
                ) : null}
                {pageList(page, totalPages).map((n) => (
                  <Link key={n} className={n === page ? styles.pageLinkActive : styles.pageLink} href={`?${qs({ page: n })}`}>
                    {n}
                  </Link>
                ))}
                {page < totalPages ? (
                  <Link className={styles.pageLink} href={`?${qs({ page: page + 1 })}`}>
                    ›
                  </Link>
                ) : null}
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { adminListSubjectGroups, getMe } from "@/lib/api";
import { SubjectGroupRowMenu } from "@/components/SubjectGroupRowMenu";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    q?: string;
    education_plan_id?: string;
    page?: string;
    pageSize?: string;
    created?: string;
  }>;
};

function statusClass(name: string | null | undefined) {
  const n = (name ?? "").toLowerCase();
  if (n.includes("təsdiq olunub") || n.includes("approved")) return styles.badgeOk;
  if (n.includes("gözləyir") || n.includes("təsdiq olunur") || n.includes("pending")) return styles.badgePending;
  return styles.badge;
}

function specialtyLabel(p: { specialty_name_az: string | null; faculty_name_az: string | null }) {
  const parts = [p.specialty_name_az, p.faculty_name_az].filter(Boolean);
  return parts.length ? parts.join(" / ") : "—";
}

function pageList(current: number, last: number) {
  const pages = new Set<number>([1, last, current, current - 1, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
}

export default async function AdminSubjectGroupsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const q = (sp.q ?? "").trim();
  const educationPlanId = (sp.education_plan_id ?? "").trim();
  const createdId = (sp.created ?? "").trim();
  const pageSize = Math.min(500, Math.max(1, Number(sp.pageSize) || 20));
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * pageSize;

  const data = await adminListSubjectGroups({
    q: q || null,
    education_plan_id: educationPlanId || null,
    limit: pageSize,
    offset,
  });

  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>{t("subjectGroups")}</h1>
            <p className={styles.meta}>{t("loadError")}</p>
          </div>
        </header>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / pageSize));
  const createdItem = createdId ? data.items.find((g) => g.id === createdId) : undefined;
  const qs = (extra: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (educationPlanId) params.set("education_plan_id", educationPlanId);
    params.set("pageSize", String(pageSize));
    Object.entries(extra).forEach(([k, v]) => {
      if (v == null || v === "") params.delete(k);
      else params.set(k, String(v));
    });
    return params.toString();
  };

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{t("subjectGroups")}</h1>
          <p className={styles.meta}>{t("subjectGroupsHint")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/${locale}/dashboard/admin/subject-groups/new`} className={styles.actionLinkPrimary}>
            {t("subjectGroupCreate")}
          </Link>
        </div>
      </header>

      <div className={styles.content}>
        <form className={styles.toolbar}>
          <input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className={styles.input} />
          {educationPlanId ? <input type="hidden" name="education_plan_id" value={educationPlanId} /> : null}
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

        {createdId ? (
          <p className={styles.alertOk}>
            {t("subjectGroupCreated", {
              label: [createdItem?.subject_name_az, createdItem?.code].filter(Boolean).join(" — ") || createdId,
            })}
          </p>
        ) : null}

        {data.items.length === 0 ? (
          <p className={styles.alertMuted}>{t("empty")}</p>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>#</th>
                  <th className={styles.th}>{t("colSpecialty")}</th>
                  <th className={styles.th}>{t("colSubject")}</th>
                  <th className={styles.th}>{t("colSubjectGroupCode")}</th>
                  <th className={styles.th}>{t("colSemester")}</th>
                  <th className={styles.th}>{t("colLang")}</th>
                  <th className={styles.th}>{t("educationType")}</th>
                  <th className={styles.th}>{t("colYear")}</th>
                  <th className={styles.th}>{t("status")}</th>
                  <th className={styles.th} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((g, i) => (
                  <tr key={g.id} className={g.id === createdId ? `${styles.row} ${styles.rowCreated}` : styles.row}>
                    <td className={`${styles.td} ${styles.tdNum}`}>{offset + i + 1}</td>
                    <td className={styles.td}>{specialtyLabel(g)}</td>
                    <td className={`${styles.td} ${styles.tdName}`}>{g.subject_name_az ?? "—"}</td>
                    <td className={styles.td}>{g.code ?? "—"}</td>
                    <td className={styles.td}>{g.semester_name_az ?? "—"}</td>
                    <td className={styles.td}>{g.education_lang_name_az ?? "—"}</td>
                    <td className={styles.td}>{g.education_type_name_az ?? "—"}</td>
                    <td className={styles.td}>{g.education_year_name ?? "—"}</td>
                    <td className={styles.td}>
                      <span className={statusClass(g.status_name_az)}>{g.status_name_az ?? "—"}</span>
                    </td>
                    <td className={styles.td}>
                      <SubjectGroupRowMenu
                        courseId={g.id}
                        organizationId={g.organization_id}
                        educationPlanSubjectId={g.education_plan_subject_id}
                      />
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

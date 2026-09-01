import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminRowMenu } from "@/components/admin/AdminRowMenu";
import { pageList } from "@/lib/admin-org";
import { adminListGroups, getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string; page?: string; pageSize?: string }>;
};

export default async function AdminGroupsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations("admin");
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const q = (sp.q ?? "").trim();
  const pageSize = Math.min(200, Math.max(1, Number(sp.pageSize) || 25));
  const page = Math.max(1, Number(sp.page) || 1);
  const data = await adminListGroups(q || null, pageSize, (page - 1) * pageSize);

  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>Tələbə qrupları</h1>
            <p className={styles.meta}>{t("loadError")}</p>
          </div>
        </header>
      </div>
    );
  }

  const stats = (data as any).stats ?? {};
  const total = Number((data as any).total ?? data.items.length);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const qs = (extra: Record<string, string | number>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("pageSize", String(pageSize));
    Object.entries(extra).forEach(([k, v]) => params.set(k, String(v)));
    return params.toString();
  };

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>Tələbə qrupları</h1>
          <p className={styles.meta}>Tələbələr qrupa bağlanır. Qrup detallarında tələbə siyahısı və dərs cədvəli var.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/${locale}/dashboard/admin/groups/new`} className={styles.actionLinkPrimary}>
            Qrup əlavə et
          </Link>
        </div>
      </header>
      <div className={styles.content}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statValue}>
              {stats.bachelor_count ?? 0} / {stats.master_count ?? 0}
            </p>
            <p className={styles.statLabel}>Bakalavr / Magistr (ixtisasları)</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>
              {stats.fulltime_count ?? 0} / {stats.parttime_count ?? 0}
            </p>
            <p className={styles.statLabel}>Əyani / Qiyabi</p>
          </div>
        </div>
        <form className={styles.toolbar}>
          <input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className={styles.input} />
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
                  <th className={styles.th}>Qrup adı</th>
                  <th className={styles.th}>İxtisas</th>
                  <th className={styles.th}>Təhsil səviyyəsi</th>
                  <th className={styles.th}>Təhsil forması</th>
                  <th className={styles.th}>Tədris ili</th>
                  <th className={styles.th} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((g: any, i) => (
                  <tr key={g.education_group_id} className={styles.row}>
                    <td className={`${styles.td} ${styles.tdNum}`}>{(page - 1) * pageSize + i + 1}</td>
                    <td className={`${styles.td} ${styles.tdName}`}>
                      <Link href={`/${locale}/dashboard/admin/groups/${g.education_group_id}`}>
                        {g.education_group_name ?? g.education_group_id}
                      </Link>
                      <div className={styles.tdMuted}>
                        {g.student_count} tələbə
                      </div>
                    </td>
                    <td className={styles.td}>{[g.specialty_name_az, g.faculty_name_az].filter(Boolean).join(" / ") || "—"}</td>
                    <td className={styles.td}>{g.education_level_az ?? "—"}</td>
                    <td className={styles.td}>{g.education_type_az ?? "—"}</td>
                    <td className={styles.td}>{g.education_year_name ?? "—"}</td>
                    <td className={styles.td}>
                      <AdminRowMenu
                        editHref={`/${locale}/dashboard/admin/groups/${g.education_group_id}/edit`}
                        extraHref={`/${locale}/dashboard/admin/groups/${g.education_group_id}`}
                        extraLabel="Detal / cədvəl"
                        deleteUrl={`/api/admin/groups/${g.education_group_id}`}
                        deleteConfirm="Qrupu silmək istəyirsiniz?"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.tableFooter}>
              <span>
                {t("rowCount")}: {total}
              </span>
              <nav className={styles.pager}>
                {pageList(page, totalPages).map((n) => (
                  <Link key={n} className={n === page ? styles.pageLinkActive : styles.pageLink} href={`?${qs({ page: n })}`}>
                    {n}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminRowMenu } from "@/components/admin/AdminRowMenu";
import { pageList } from "@/lib/admin-org";
import { adminListTeachers, getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string; page?: string; pageSize?: string }>;
};

export default async function AdminTeachersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations("admin");
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const q = (sp.q ?? "").trim();
  const pageSize = Math.min(200, Math.max(1, Number(sp.pageSize) || 25));
  const page = Math.max(1, Number(sp.page) || 1);
  const data = await adminListTeachers(q || null, pageSize, (page - 1) * pageSize);

  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>Pedaqoji heyət</h1>
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
          <h1 className={styles.title}>Pedaqoji heyət</h1>
          <p className={styles.meta}>Müəllimlər kafedraya bağlıdır — sərbəst əlavə olunmur.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/${locale}/dashboard/admin/teachers/new`} className={styles.actionLinkPrimary}>
            Müəllim əlavə et
          </Link>
        </div>
      </header>
      <div className={styles.content}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{stats.total ?? total}</p>
            <p className={styles.statLabel}>Ümumi say</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>
              {stats.male_count ?? 0} / {stats.female_count ?? 0}
            </p>
            <p className={styles.statLabel}>Kişi / Qadın</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>
              {stats.full_staff_count ?? 0} / {stats.other_staff_count ?? 0}
            </p>
            <p className={styles.statLabel}>Tam / Digər ştat</p>
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
                  <th className={styles.th}>Soyad Ad Ata adı</th>
                  <th className={styles.th}>Cinsi</th>
                  <th className={styles.th}>Qəbul forması</th>
                  <th className={styles.th}>Başlama tarixi</th>
                  <th className={styles.th}>Struktur</th>
                  <th className={styles.th} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((x: any, i) => (
                  <tr key={x.teacher_id} className={styles.row}>
                    <td className={`${styles.td} ${styles.tdNum}`}>{(page - 1) * pageSize + i + 1}</td>
                    <td className={`${styles.td} ${styles.tdName}`}>
                      <Link href={`/${locale}/dashboard/admin/teachers/${x.teacher_id}`}>{x.teacher_fullname ?? x.teacher_id}</Link>
                    </td>
                    <td className={styles.td}>{x.gender_name_az ?? "—"}</td>
                    <td className={styles.td}>{x.in_action_name_az ?? "—"}</td>
                    <td className={styles.td}>{x.in_action_date ?? "—"}</td>
                    <td className={styles.td}>{x.department_name_az ?? "—"}</td>
                    <td className={styles.td}>
                      <AdminRowMenu
                        editHref={`/${locale}/dashboard/admin/teachers/${x.teacher_id}`}
                        extraHref={`/${locale}/dashboard/admin/teachers/${x.teacher_id}`}
                        extraLabel="Fənnlər"
                        deleteUrl={`/api/admin/teachers/${x.teacher_id}`}
                        deleteConfirm="Müəllimi silmək istəyirsiniz?"
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

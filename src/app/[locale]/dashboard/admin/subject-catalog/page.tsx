import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminRowMenu } from "@/components/admin/AdminRowMenu";
import { adminInstitutionLookups, adminListSubjectCatalog, pageList } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string; department_id?: string; page?: string; pageSize?: string }>;
};

export default async function SubjectCatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const q = (sp.q ?? "").trim();
  const departmentId = (sp.department_id ?? "").trim();
  const pageSize = Math.min(200, Math.max(1, Number(sp.pageSize) || 25));
  const page = Math.max(1, Number(sp.page) || 1);
  const [data, lookups] = await Promise.all([
    adminListSubjectCatalog({ q: q || null, department_id: departmentId || null, limit: pageSize, offset: (page - 1) * pageSize }),
    adminInstitutionLookups(),
  ]);

  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>Kafedralar üzrə fənn kataloqu</h1>
            <p className={styles.meta}>Məlumat yüklənmədi.</p>
          </div>
        </header>
      </div>
    );
  }

  const stats = data.stats ?? {};
  const totalPages = Math.max(1, Math.ceil((data.total || 0) / pageSize));
  const qs = (extra: Record<string, string | number>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (departmentId) params.set("department_id", departmentId);
    params.set("pageSize", String(pageSize));
    Object.entries(extra).forEach(([k, v]) => params.set(k, String(v)));
    return params.toString();
  };

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>Kafedralar üzrə fənn kataloqu</h1>
          <p className={styles.meta}>Fənnlər kafedraya bağlanır. Tədris planları bu kataloqdan istifadə edir.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/${locale}/dashboard/admin/subject-catalog/new`} className={styles.actionLinkPrimary}>
            Fənni kafedraya bağla
          </Link>
        </div>
      </header>
      <div className={styles.content}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{stats.department_count ?? 0}</p>
            <p className={styles.statLabel}>Kafedra</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{stats.subject_count ?? data.total}</p>
            <p className={styles.statLabel}>Fənn</p>
          </div>
        </div>
        <form className={styles.toolbar}>
          <input name="q" defaultValue={q} placeholder="Fənn və ya kafedra…" className={styles.input} />
          <select name="department_id" defaultValue={departmentId} className={styles.select}>
            <option value="">Kafedra</option>
            {(lookups?.departments ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name_az || d.id}
              </option>
            ))}
          </select>
          <input type="hidden" name="page" value="1" />
          <button type="submit" className={styles.button}>
            Axtar
          </button>
        </form>
        {data.items.length === 0 ? (
          <p className={styles.alertMuted}>Nəticə tapılmadı.</p>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>#</th>
                  <th className={styles.th}>Kafedra</th>
                  <th className={styles.th}>Fənn adı</th>
                  <th className={styles.th} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((row, i) => (
                  <tr key={row.id} className={styles.row}>
                    <td className={`${styles.td} ${styles.tdNum}`}>{(page - 1) * pageSize + i + 1}</td>
                    <td className={styles.td}>{row.department_name_az ?? "—"}</td>
                    <td className={`${styles.td} ${styles.tdName}`}>
                      <Link href={`/${locale}/dashboard/admin/subject-catalog/${row.id}`}>{row.subject_name_az ?? row.id}</Link>
                    </td>
                    <td className={styles.td}>
                      <AdminRowMenu
                        editHref={`/${locale}/dashboard/admin/subject-catalog/${row.id}`}
                        deleteUrl={`/api/admin/subject-catalog/${row.id}`}
                        deleteConfirm="Fənni kataloqdan çıxarmaq istəyirsiniz?"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.tableFooter}>
              <span>Sətir sayı: {data.total}</span>
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

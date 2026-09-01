import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminRowMenu } from "@/components/admin/AdminRowMenu";
import { adminListOrders, pageList } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string; page?: string; pageSize?: string }>;
};

export default async function AdminOrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const q = (sp.q ?? "").trim();
  const pageSize = Math.min(200, Math.max(1, Number(sp.pageSize) || 25));
  const page = Math.max(1, Number(sp.page) || 1);
  const data = await adminListOrders({ q: q || null, limit: pageSize, offset: (page - 1) * pageSize });

  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>Tələbə əmrləri</h1>
            <p className={styles.meta}>Məlumat yüklənmədi.</p>
          </div>
        </header>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / pageSize));
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
          <h1 className={styles.title}>Tələbə əmrləri</h1>
          <p className={styles.meta}>Tələbə qəbulu və status dəyişikliyi əmrləri. Tələbə əlavə edəndə əmr seçilməlidir.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/${locale}/dashboard/admin/orders/new`} className={styles.actionLinkPrimary}>
            Əmr əlavə et
          </Link>
        </div>
      </header>
      <div className={styles.content}>
        <form className={styles.toolbar}>
          <input name="q" defaultValue={q} placeholder="Seriya, tip, qeyd…" className={styles.input} />
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
                  <th className={styles.th}>Seriya</th>
                  <th className={styles.th}>Tip</th>
                  <th className={styles.th}>Forma</th>
                  <th className={styles.th}>Səviyyə</th>
                  <th className={styles.th}>Tarix</th>
                  <th className={styles.th}>Tələbə</th>
                  <th className={styles.th} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((o, i) => (
                  <tr key={o.id} className={styles.row}>
                    <td className={`${styles.td} ${styles.tdNum}`}>{(page - 1) * pageSize + i + 1}</td>
                    <td className={`${styles.td} ${styles.tdName}`}>
                      <Link href={`/${locale}/dashboard/admin/orders/${o.id}`}>{o.serial || o.id}</Link>
                    </td>
                    <td className={styles.td}>{o.type_name_az ?? "—"}</td>
                    <td className={styles.td}>{o.form_name_az ?? "—"}</td>
                    <td className={styles.td}>{o.edu_level_name_az ?? "—"}</td>
                    <td className={styles.td}>{o.order_date ?? "—"}</td>
                    <td className={styles.td}>{o.student_count ?? 0}</td>
                    <td className={styles.td}>
                      <AdminRowMenu
                        editHref={`/${locale}/dashboard/admin/orders/${o.id}`}
                        deleteUrl={`/api/admin/orders/${o.id}`}
                        deleteConfirm="Əmri silmək istəyirsiniz?"
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

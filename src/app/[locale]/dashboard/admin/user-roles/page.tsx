import Link from "next/link";
import { redirect } from "next/navigation";

import { adminSearchUserRoles, pageList } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string; page?: string; pageSize?: string }>;
};

export default async function AdminUserRolesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const q = (sp.q ?? "").trim();
  const pageSize = Math.min(100, Math.max(1, Number(sp.pageSize) || 25));
  const page = Math.max(1, Number(sp.page) || 1);
  const data = q ? await adminSearchUserRoles({ q, limit: pageSize, offset: (page - 1) * pageSize }) : { items: [], total: 0 };

  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>İstifadəçi rolları</h1>
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
          <h1 className={styles.title}>İstifadəçi rolları</h1>
          <p className={styles.meta}>FİN ilə tapın. Rolu dəyişin və ya parolu FİN-ə sıfırlayın.</p>
        </div>
      </header>
      <div className={styles.content}>
        <form className={styles.toolbar}>
          <input name="q" defaultValue={q} placeholder="FİN kod, ad, istifadəçi adı…" className={styles.input} autoFocus />
          <input type="hidden" name="page" value="1" />
          <button type="submit" className={styles.button}>
            Axtar
          </button>
        </form>
        {!q ? (
          <p className={styles.alertMuted}>Axtarışa FİN kodu daxil edin. Rol dəyişmək və ya parolu sıfırlamaq üçün nəticədən şəxsi açın.</p>
        ) : data.items.length === 0 ? (
          <p className={styles.alertMuted}>Nəticə tapılmadı.</p>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>#</th>
                  <th className={styles.th}>Soyad Ad Ata adı</th>
                  <th className={styles.th}>FİN</th>
                  <th className={styles.th}>İstifadəçi adı</th>
                  <th className={styles.th}>Cari rol</th>
                  <th className={styles.th}>Kafedra</th>
                  <th className={styles.th}>Qeydlər</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((x, i) => (
                  <tr key={x.person_id} className={styles.row}>
                    <td className={`${styles.td} ${styles.tdNum}`}>{(page - 1) * pageSize + i + 1}</td>
                    <td className={`${styles.td} ${styles.tdName}`}>
                      <Link href={`/${locale}/dashboard/admin/user-roles/${x.person_id}`}>{x.fullname ?? x.person_id}</Link>
                    </td>
                    <td className={styles.td}>{x.pincode ?? "—"}</td>
                    <td className={styles.td}>{x.username ?? "—"}</td>
                    <td className={styles.td}>{x.user_type_label}</td>
                    <td className={styles.td}>{x.department_name_az ?? "—"}</td>
                    <td className={styles.td}>
                      {[x.has_student ? "Tələbə qeydi" : null, x.has_teacher ? "Müəllim qeydi" : null].filter(Boolean).join(" · ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.tableFooter}>
              <span>Sətir: {data.total}</span>
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

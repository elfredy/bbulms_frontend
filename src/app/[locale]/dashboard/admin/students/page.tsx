import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminRowMenu } from "@/components/admin/AdminRowMenu";
import { adminInstitutionLookups, adminListStudents, pageList } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string; education_group_id?: string; page?: string; pageSize?: string }>;
};

export default async function AdminStudentsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const q = (sp.q ?? "").trim();
  const groupId = (sp.education_group_id ?? "").trim();
  const pageSize = Math.min(200, Math.max(1, Number(sp.pageSize) || 25));
  const page = Math.max(1, Number(sp.page) || 1);
  const [data, lookups] = await Promise.all([
    adminListStudents({ q: q || null, education_group_id: groupId || null, limit: pageSize, offset: (page - 1) * pageSize }),
    adminInstitutionLookups(),
  ]);

  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>Tələbələr</h1>
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
    if (groupId) params.set("education_group_id", groupId);
    params.set("pageSize", String(pageSize));
    Object.entries(extra).forEach(([k, v]) => params.set(k, String(v)));
    return params.toString();
  };

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>Tələbələr</h1>
          <p className={styles.meta}>Əlavə, silmə və yeniləmə. Yeni tələbə mütləq qrupa bağlanır.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/${locale}/dashboard/admin/students/new`} className={styles.actionLinkPrimary}>
            Tələbə əlavə et
          </Link>
        </div>
      </header>
      <div className={styles.content}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{stats.total ?? data.total}</p>
            <p className={styles.statLabel}>Ümumi tələbələr</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>
              {stats.paid_count ?? 0} / {stats.state_count ?? 0}
            </p>
            <p className={styles.statLabel}>Ödənişli / Dövlət sifarişi</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>
              {stats.fulltime_count ?? 0} / {stats.parttime_count ?? 0}
            </p>
            <p className={styles.statLabel}>Əyani / Qiyabi</p>
          </div>
        </div>
        <form className={styles.toolbar}>
          <input name="q" defaultValue={q} placeholder="Ad, FİN, qrup…" className={styles.input} />
          <select name="education_group_id" defaultValue={groupId} className={styles.select}>
            <option value="">Qrup</option>
            {(lookups?.groups ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name || g.id}
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
                  <th className={styles.th}>Soyad Ad Ata adı</th>
                  <th className={styles.th}>Finkod</th>
                  <th className={styles.th}>Cinsi</th>
                  <th className={styles.th}>Fakültə / İxtisas</th>
                  <th className={styles.th}>Qrup</th>
                  <th className={styles.th} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((s, i) => (
                  <tr key={s.student_id} className={styles.row}>
                    <td className={`${styles.td} ${styles.tdNum}`}>{(page - 1) * pageSize + i + 1}</td>
                    <td className={`${styles.td} ${styles.tdName}`}>
                      <Link href={`/${locale}/dashboard/admin/students/${s.student_id}`}>{s.fullname || s.student_id}</Link>
                    </td>
                    <td className={styles.td}>{s.pincode ?? "—"}</td>
                    <td className={styles.td}>{s.gender_name_az ?? "—"}</td>
                    <td className={styles.td}>{[s.faculty_name_az, s.specialty_name_az].filter(Boolean).join(" / ") || "—"}</td>
                    <td className={styles.td}>{s.group_name ?? "—"}</td>
                    <td className={styles.td}>
                      <AdminRowMenu
                        editHref={`/${locale}/dashboard/admin/students/${s.student_id}`}
                        deleteUrl={`/api/admin/students/${s.student_id}`}
                        deleteConfirm="Tələbəni silmək istəyirsiniz?"
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

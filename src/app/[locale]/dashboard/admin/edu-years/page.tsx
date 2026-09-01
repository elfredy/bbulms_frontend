import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminRowMenu } from "@/components/admin/AdminRowMenu";
import { adminListEduYears } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string }>;
};

export default async function EduYearsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const q = (sp.q ?? "").trim();
  const data = await adminListEduYears(q || null);

  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>Tədris illərinin qrafiki</h1>
            <p className={styles.meta}>Məlumat yüklənmədi.</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>Tədris illərinin qrafiki</h1>
          <p className={styles.meta}>Tədris ilinin adı, başlama və bitmə tarixləri. Akademik təqvim bu qrafikə əsasən qurulur.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/${locale}/dashboard/admin/edu-years/new`} className={styles.actionLinkPrimary}>
            Tədris ili əlavə et
          </Link>
        </div>
      </header>
      <div className={styles.content}>
        <form className={styles.toolbar}>
          <input name="q" defaultValue={q} placeholder="Tədris ili…" className={styles.input} />
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
                  <th className={styles.th}>Tədris ili</th>
                  <th className={styles.th}>Başlama</th>
                  <th className={styles.th}>Bitmə</th>
                  <th className={styles.th} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((y, i) => (
                  <tr key={y.id} className={styles.row}>
                    <td className={`${styles.td} ${styles.tdNum}`}>{i + 1}</td>
                    <td className={`${styles.td} ${styles.tdName}`}>
                      <Link href={`/${locale}/dashboard/admin/edu-years/${y.id}`}>{y.name || y.id}</Link>
                    </td>
                    <td className={styles.td}>{y.start_date ?? "—"}</td>
                    <td className={styles.td}>{y.end_date ?? "—"}</td>
                    <td className={styles.td}>
                      <AdminRowMenu
                        editHref={`/${locale}/dashboard/admin/edu-years/${y.id}`}
                        deleteUrl={`/api/admin/edu-years/${y.id}`}
                        deleteConfirm="Tədris ilini silmək istəyirsiniz?"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.tableFooter}>
              <span>Sətir sayı: {data.total}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminRowMenu } from "@/components/admin/AdminRowMenu";
import { adminListEvaluationTypes } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string }>;
};

export default async function EvaluationPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const q = (sp.q ?? "").trim();
  const data = await adminListEvaluationTypes(q || null);

  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>Qiymətləndirmə sistemi</h1>
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
          <h1 className={styles.title}>Qiymətləndirmə sistemi</h1>
          <p className={styles.meta}>Fənn qruplarında istifadə olunan qiymətləndirmə tipləri, ballar və keçid faizi.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/${locale}/dashboard/admin/evaluation/new`} className={styles.actionLinkPrimary}>
            Qiymətləndirmə əlavə et
          </Link>
        </div>
      </header>
      <div className={styles.content}>
        <form className={styles.toolbar}>
          <input name="q" defaultValue={q} placeholder="Ad, tip…" className={styles.input} />
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
                  <th className={styles.th}>Ad</th>
                  <th className={styles.th}>Tip</th>
                  <th className={styles.th}>Bal</th>
                  <th className={styles.th}>Keçid %</th>
                  <th className={styles.th}>Növ</th>
                  <th className={styles.th} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => (
                  <tr key={item.id} className={styles.row}>
                    <td className={`${styles.td} ${styles.tdNum}`}>{i + 1}</td>
                    <td className={`${styles.td} ${styles.tdName}`}>
                      <Link href={`/${locale}/dashboard/admin/evaluation/${item.id}`}>{item.name || item.id}</Link>
                    </td>
                    <td className={styles.td}>{item.evaluation_name_az ?? "—"}</td>
                    <td className={styles.td}>{item.point ?? "—"}</td>
                    <td className={styles.td}>{item.successful_pass_percent ?? "—"}</td>
                    <td className={styles.td}>{item.type_name_az ?? "—"}</td>
                    <td className={styles.td}>
                      <AdminRowMenu
                        editHref={`/${locale}/dashboard/admin/evaluation/${item.id}`}
                        deleteUrl={`/api/admin/evaluation-types/${item.id}`}
                        deleteConfirm="Qiymətləndirməni silmək istəyirsiniz?"
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

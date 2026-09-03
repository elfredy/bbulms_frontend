import { redirect } from "next/navigation";

import { SubjectBlockCreateForm } from "@/components/admin/SubjectBlockCreateForm";
import { SubjectCatalogForm } from "@/components/admin/SubjectCatalogForm";
import { adminInstitutionLookups, adminListSubjectBlocks } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function SubjectBlocksPage({ params }: Props) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const [data, lookups] = await Promise.all([adminListSubjectBlocks(), adminInstitutionLookups()]);

  if (!data || !lookups) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>Fənn blokları</h1>
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
          <h1 className={styles.title}>Fənn blokları</h1>
          <p className={styles.meta}>
            Tədris planında fənnin bloku (İxtisas peşə, Humanitar və s.). Buradan yeni blok və yeni fənn əlavə edib kafedraya təhkim etmək olar.
          </p>
        </div>
      </header>
      <div className={styles.content}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{data.total}</p>
            <p className={styles.statLabel}>Blok</p>
          </div>
        </div>

        <SubjectBlockCreateForm />

        {data.items.length === 0 ? (
          <p className={styles.alertMuted}>Blok tapılmadı.</p>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>#</th>
                  <th className={styles.th}>Blok</th>
                  <th className={styles.th}>Kod</th>
                  <th className={styles.th}>Plan fənləri</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row, i) => (
                  <tr key={row.id} className={styles.row}>
                    <td className={`${styles.td} ${styles.tdNum}`}>{i + 1}</td>
                    <td className={`${styles.td} ${styles.tdName}`}>{row.name_az || row.id}</td>
                    <td className={styles.td}>{row.code || "—"}</td>
                    <td className={styles.td}>{row.plan_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <section className={styles.tableCard} style={{ padding: 20, marginTop: 24 }}>
          <h2 className={styles.title} style={{ fontSize: "1.15rem" }}>
            Yeni fənn əlavə et / kafedraya təhkim et
          </h2>
          <p className={styles.meta} style={{ marginBottom: 16 }}>
            Fənn adı yoxdursa yazın, sonra kafedranı seçin. Tədris planları bu kataloqdan istifadə edir.
          </p>
          <SubjectCatalogForm lookups={lookups} locale={locale} redirectTo={`/${locale}/dashboard/admin/subject-blocks`} />
        </section>
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { getMe, getTutorOverview } from "@/lib/api";

import styles from "../dashboard.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function TutorDashboardPage({ params }: Props) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (me.user_type !== "TYUTOR" && me.user_type !== "OWNER" && me.user_type !== "SUPERADMIN" && me.user_type !== "ADMIN") {
    redirect(`/${locale}/dashboard`);
  }

  const data = await getTutorOverview();

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>Tyutor paneli</h1>
          <p className={styles.meta}>Sizə bağlanan tələbə qrupları və tələbə sayı.</p>
        </div>
        <Link className={styles.meta} href={`/${locale}/dashboard`}>
          Geri
        </Link>
      </header>
      <div className={styles.content}>
        {!data ? (
          <p className={styles.alertError}>Məlumat yüklənmədi.</p>
        ) : data.groups.length === 0 ? (
          <p className={styles.alertMuted}>Sizə təyin olunmuş qrup yoxdur. Admin qrup kartında tyutor seçməlidir.</p>
        ) : (
          <>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <p className={styles.statValue}>{data.groups.length}</p>
                <p className={styles.statLabel}>Qrup</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statValue}>{data.student_count}</p>
                <p className={styles.statLabel}>Tələbə</p>
              </div>
            </div>
            <div className={styles.tableCard} style={{ marginTop: 16 }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Qrup</th>
                    <th className={styles.th}>İxtisas</th>
                    <th className={styles.th}>Tədris ili</th>
                    <th className={styles.th}>Tələbə</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groups.map((g) => (
                    <tr key={g.education_group_id} className={styles.row}>
                      <td className={`${styles.td} ${styles.tdName}`}>{g.education_group_name ?? g.education_group_id}</td>
                      <td className={styles.td}>{g.specialty_name_az ?? "—"}</td>
                      <td className={styles.td}>{g.education_year_name ?? "—"}</td>
                      <td className={styles.td}>{g.student_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

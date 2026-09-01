import { redirect } from "next/navigation";

import { AcademicCalendarFilter } from "@/components/admin/AcademicCalendarFilter";
import { adminAcademicCalendar } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ education_year_id?: string }>;
};

export default async function AcademicCalendarPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const data = await adminAcademicCalendar(sp.education_year_id ?? null);

  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>Akademik təqvim</h1>
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
          <h1 className={styles.title}>Akademik təqvim</h1>
          <p className={styles.meta}>
            Həftələr seçilmiş tədris ilinin başlama və bitmə tarixinə görə qurulur. Tək həftə — Üst həftə, cüt həftə — Alt həftə.
          </p>
        </div>
      </header>
      <div className={styles.content}>
        {data.years.length === 0 ? (
          <p className={styles.alertMuted}>Əvvəlcə tədris ili əlavə edin.</p>
        ) : (
          <>
            <AcademicCalendarFilter years={data.years} currentId={data.year?.id ?? ""} locale={locale} />
            {data.year ? (
              <p className={styles.meta} style={{ marginBottom: 12 }}>
                {[data.year.name, data.year.start_date, data.year.end_date].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            {data.weeks.length === 0 ? (
              <p className={styles.alertMuted}>Bu il üçün həftə qurula bilmədi. Tarixləri yoxlayın.</p>
            ) : (
              <div className={styles.tableCard}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Həftə</th>
                      <th className={styles.th}>Başlama</th>
                      <th className={styles.th}>Bitmə</th>
                      <th className={styles.th}>Növ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.weeks.map((w) => (
                      <tr key={w.week} className={styles.row}>
                        <td className={`${styles.td} ${styles.tdNum}`}>{w.week}</td>
                        <td className={styles.td}>{w.start_date}</td>
                        <td className={styles.td}>{w.end_date}</td>
                        <td className={styles.td}>{w.week_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className={styles.tableFooter}>
                  <span>Həftə sayı: {data.total}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

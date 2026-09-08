import { redirect } from "next/navigation";

import { StudentScheduleGrid } from "@/components/StudentScheduleGrid";
import { getMe, getStudentSchedule } from "@/lib/api";

import styles from "../dashboard.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function StudentSchedulePage({ params }: Props) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  const isStudent = me.user_type === "STUDENT" && me.student_id != null;
  if (!isStudent) redirect(`/${locale}/dashboard`);

  const data = await getStudentSchedule();

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>Dərs cədvəli</h1>
          <p className={styles.meta}>
            {data?.current_education_year_name
              ? `${data.current_education_year_name} tədris ili üzrə həftəlik dərslər, auditoriya və müəllim.`
              : "Cari tədris ili üzrə həftəlik dərslər, auditoriya və müəllim."}
          </p>
        </div>
      </header>
      <div className={styles.content}>
        {data ? (
          <StudentScheduleGrid data={data} />
        ) : (
          <p className={styles.alertError}>Cədvəl yüklənmədi. Backend və verilənlər bazasını yoxlayın.</p>
        )}
      </div>
    </div>
  );
}

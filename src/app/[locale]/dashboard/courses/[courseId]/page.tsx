import { redirect } from "next/navigation";

import { StudentCourseDetailView } from "@/components/StudentCourseDetail";
import { getMe, getStudentCourseDetail } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = { params: Promise<{ locale: string; courseId: string }> };

export default async function StudentCoursePage({ params }: Props) {
  const { locale, courseId } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (me.must_change_password) redirect(`/${locale}/dashboard/change-password`);
  if (me.user_type !== "STUDENT" || me.student_id == null) redirect(`/${locale}/dashboard`);

  const data = await getStudentCourseDetail(courseId);

  return (
    <div className={styles.pageWide}>
      {data ? (
        <StudentCourseDetailView data={data} locale={locale} />
      ) : (
        <p className={styles.alertError}>Fənn məlumatı yüklənmədi. Bu fənn sizin qeydiyyatınızda olmaya bilər.</p>
      )}
    </div>
  );
}

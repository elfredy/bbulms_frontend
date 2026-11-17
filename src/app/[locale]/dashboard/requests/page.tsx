import { redirect } from "next/navigation";

import { StudentRequestsClient } from "@/components/StudentRequestsClient";
import { TeacherRequestsClient } from "@/components/TeacherRequestsClient";
import { getMe } from "@/lib/api";

import styles from "../dashboard.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function RequestsPage({ params }: Props) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);

  const isStudent = me.user_type === "STUDENT" && me.student_id != null;
  const isTeacher = me.teacher_id != null;

  if (!isStudent && !isTeacher) redirect(`/${locale}/dashboard`);

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>Müraciətlər</h1>
          <p className={styles.meta}>
            {isStudent
              ? "Fənn müəlliminə qısa müraciət yazın. Müəllim cavabını burada görəcəksiniz."
              : "Tələbə müraciətlərinə qısa cavab yazın."}
          </p>
        </div>
      </header>
      <div className={styles.content}>
        {isStudent ? <StudentRequestsClient /> : null}
        {!isStudent && isTeacher ? <TeacherRequestsClient /> : null}
      </div>
    </div>
  );
}

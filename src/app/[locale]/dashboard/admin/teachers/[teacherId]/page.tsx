import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { adminGetTeacherDetail, getMe } from "@/lib/api";

import styles from "../../../dashboard.module.css";

type Props = { params: Promise<{ locale: string; teacherId: string }> };

export default async function AdminTeacherDetailPage({ params }: Props) {
  const { locale, teacherId } = await params;
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const data = await adminGetTeacherDetail(teacherId);
  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>{t("teacherDetail")}</h1>
            <p className={styles.meta}>{t("loadError")}</p>
          </div>
          <Link className={styles.meta} href={`/${locale}/dashboard/admin/teachers`}>
            {t("back")}
          </Link>
        </header>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{data.teacher.teacher_fullname ?? data.teacher.teacher_id}</h1>
          <p className={styles.meta}>{`TeacherId: ${data.teacher.teacher_id}`}</p>
        </div>
        <Link className={styles.meta} href={`/${locale}/dashboard/admin/teachers`}>
          {t("back")}
        </Link>
      </header>

      <div className={styles.content}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{t("courses")}</h2>
        {data.courses.length === 0 ? (
          <p className={styles.alertMuted}>{t("emptyCourses")}</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
            {data.courses.map((c) => (
              <li key={c.course_teacher_id}>
                <div>{c.subject_name_az ?? c.course_id}</div>
                <div className={styles.meta}>
                  {[c.education_year_name, c.lesson_type_az, `CT:${c.course_teacher_id}`].filter(Boolean).join(" · ")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


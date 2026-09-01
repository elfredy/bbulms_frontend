import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import formStyles from "@/components/admin/AdminForm.module.css";
import { TeacherForm } from "@/components/admin/TeacherForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminInstitutionLookups } from "@/lib/admin-org";
import { adminGetTeacherDetail, getMe } from "@/lib/api";

import styles from "../../../dashboard.module.css";

type Props = { params: Promise<{ locale: string; teacherId: string }> };

export default async function AdminTeacherDetailPage({ params }: Props) {
  const { locale, teacherId } = await params;
  const t = await getTranslations("admin");
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const [data, lookups] = await Promise.all([adminGetTeacherDetail(teacherId), adminInstitutionLookups()]);
  if (!data || !lookups) {
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

  const teacher = data.teacher as any;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <AdminFormPage
        wide
        title={teacher.teacher_fullname ?? teacher.teacher_id}
        hint={[teacher.department_name_az, teacher.faculty_name_az].filter(Boolean).join(" · ") || undefined}
        backHref={`/${locale}/dashboard/admin/teachers`}
      >
        <TeacherForm lookups={lookups} initial={teacher} locale={locale} />
      </AdminFormPage>
      <div className={formStyles.pageWrap} style={{ paddingTop: 0 }}>
        <div className={`${formStyles.panel} ${formStyles.panelWide}`}>
          <header className={formStyles.panelHead}>
            <h2 className={formStyles.panelTitle}>{t("courses")}</h2>
          </header>
          <div className={formStyles.panelBody}>
            {data.courses.length === 0 ? (
              <p className={formStyles.hint}>{t("emptyCourses")}</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
                {data.courses.map((c) => (
                  <li key={c.course_teacher_id}>
                    <div>{c.subject_name_az ?? c.course_id}</div>
                    <div className={formStyles.hint}>
                      {[c.education_year_name, c.lesson_type_az, `CT:${c.course_teacher_id}`].filter(Boolean).join(" · ")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { adminGetDepartmentDetail, getMe } from "@/lib/api";

import styles from "../../../dashboard.module.css";

type Props = { params: Promise<{ locale: string; departmentId: string }> };

export default async function AdminDepartmentDetailPage({ params }: Props) {
  const { locale, departmentId } = await params;
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const data = await adminGetDepartmentDetail(departmentId);
  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>{t("departmentDetail")}</h1>
            <p className={styles.meta}>{t("loadError")}</p>
          </div>
          <Link className={styles.meta} href={`/${locale}/dashboard/admin/departments`}>
            {t("back")}
          </Link>
        </header>
      </div>
    );
  }

  const dept = data.department as any;

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{dept.department_name_az ?? dept.department_id}</h1>
          <p className={styles.meta}>
            {[dept.faculty_name_az, dept.department_code, `ID: ${dept.department_id}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Link className={styles.meta} href={`/${locale}/dashboard/admin/departments`}>
          {t("back")}
        </Link>
      </header>

      <div className={styles.content} style={{ display: "grid", gap: 20 }}>
        <section>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{t("departmentOwners")}</h2>
          {data.owners.length === 0 ? (
            <p className={styles.alertMuted}>{t("emptyOwners")}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
              {data.owners.map((o) => (
                <li key={o.user_id}>
                  {o.username} <span className={styles.meta}>({o.user_type})</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{t("teachers")}</h2>
          {data.teachers.length === 0 ? (
            <p className={styles.alertMuted}>{t("emptyTeachers")}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
              {data.teachers.map((x) => (
                <li key={x.teacher_id}>
                  <Link href={`/${locale}/dashboard/admin/teachers/${x.teacher_id}`}>{x.teacher_fullname ?? x.teacher_id}</Link>
                  <div className={styles.meta}>{`${x.course_count} ${t("courses").toLowerCase()}`}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{t("courses")}</h2>
          {data.courses.length === 0 ? (
            <p className={styles.alertMuted}>{t("emptyCourses")}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
              {data.courses.map((c) => (
                <li key={c.course_id}>
                  <Link href={`/${locale}/dashboard/admin/courses/${c.course_id}`}>{c.subject_name_az ?? c.course_id}</Link>
                  <div className={styles.meta}>{[c.education_year_name, c.course_code].filter(Boolean).join(" · ")}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

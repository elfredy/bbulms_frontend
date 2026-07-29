import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { getDepartmentCourses, getDepartmentOverview, getDepartmentTeachers, getMe } from "@/lib/api";

import styles from "../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string; ok?: string; err?: string }>;
};

export default async function DepartmentDashboardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations("department");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_department_user) redirect(`/${locale}/dashboard`);

  const overview = await getDepartmentOverview();
  const q = (sp.q ?? "").trim() || null;
  const teachers = await getDepartmentTeachers(q, 100, 0);
  const courses = await getDepartmentCourses(q, 100, 0);

  if (!overview) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>{t("title")}</h1>
            <p className={styles.meta}>{t("loadError")}</p>
          </div>
          <Link className={styles.meta} href={`/${locale}/dashboard`}>
            {t("back")}
          </Link>
        </header>
      </div>
    );
  }

  async function linkTeacherAction(formData: FormData) {
    "use server";
    const cookieStore = await cookies();
    const header = cookieStore.toString();
    if (!header) redirect(`/${locale}/login`);

    const teacherId = String(formData.get("teacher_id") ?? "").trim();
    if (!teacherId) redirect(`/${locale}/dashboard/department?err=teacher`);

    const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
    const res = await fetch(`${origin}/api/department/teachers/link`, {
      method: "POST",
      headers: { cookie: header, "content-type": "application/json" },
      body: JSON.stringify({ teacher_id: teacherId }),
    });
    if (!res.ok) redirect(`/${locale}/dashboard/department?err=link`);
    redirect(`/${locale}/dashboard/department?ok=link`);
  }

  const deptName = overview.department.department_name_az ?? me.department_name_az ?? t("title");

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{deptName}</h1>
          <p className={styles.meta}>
            {[overview.department.faculty_name_az, t("stats", {
              teachers: overview.teacher_count,
              courses: overview.course_count,
              materials: overview.material_count,
            })].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Link className={styles.meta} href={`/${locale}/dashboard`}>
          {t("back")}
        </Link>
      </header>

      <div className={styles.content} style={{ display: "grid", gap: 20 }}>
        {sp.ok === "link" ? <p className={styles.meta}>{t("linkOk")}</p> : null}
        {sp.err ? <p className={styles.alertError}>{t("actionError")}</p> : null}

        <form style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("searchPlaceholder")}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
            }}
          />
          <button type="submit" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", cursor: "pointer" }}>
            {t("search")}
          </button>
        </form>

        <section>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{t("teachers")}</h2>
          {!teachers || teachers.items.length === 0 ? (
            <p className={styles.alertMuted}>{t("emptyTeachers")}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
              {teachers.items.map((x) => (
                <li key={x.teacher_id}>
                  <div>{x.teacher_fullname ?? x.teacher_id}</div>
                  <div className={styles.meta}>
                    {x.linked_to_department ? t("linked") : t("notLinked")} · {x.course_count} {t("courses")}
                  </div>
                  {!x.linked_to_department ? (
                    <form action={linkTeacherAction} style={{ marginTop: 6 }}>
                      <input type="hidden" name="teacher_id" value={x.teacher_id} />
                      <button type="submit" style={{ fontSize: 13, cursor: "pointer" }}>
                        {t("linkTeacher")}
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{t("courses")}</h2>
          {!courses || courses.items.length === 0 ? (
            <p className={styles.alertMuted}>{t("emptyCourses")}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
              {courses.items.map((c) => (
                <li key={c.course_id}>
                  <Link href={`/${locale}/dashboard/department/courses/${c.course_id}`}>
                    {c.subject_name_az ?? c.course_code ?? c.course_id}
                  </Link>
                  <div className={styles.meta}>
                    {[c.education_year_name, `${c.material_count} ${t("materials")}`].filter(Boolean).join(" · ")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

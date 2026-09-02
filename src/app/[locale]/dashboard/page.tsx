import { getTranslations } from "next-intl/server";

import { StudentDashboardTabs } from "@/components/StudentDashboardTabs";
import { TeacherDashboardTabs } from "@/components/TeacherDashboardTabs";
import { getMe, getStudentCourses, getTeacherCourses } from "@/lib/api";

import styles from "./dashboard.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("dashboard");

  const user = await getMe();
  if (!user) return null;

  const isTeacher = user.teacher_id != null;
  const isStudent = user.user_type === "STUDENT" && user.student_id != null;
  const isDepartmentUser = Boolean(user.is_department_user);
  const isSuperadmin = Boolean(user.is_superadmin);

  const teacherCourses = isTeacher ? await getTeacherCourses() : null;
  const studentCourses = isStudent ? await getStudentCourses() : null;

  const yearTeacher = teacherCourses
    ? t("yearHint", {
        year: teacherCourses.current_education_year_name ?? String(teacherCourses.current_education_year_id ?? "—"),
      })
    : "";

  const yearStudent = studentCourses
    ? t("student.yearHint", {
        year: studentCourses.current_education_year_name ?? String(studentCourses.current_education_year_id ?? "—"),
      })
    : "";

  const teacherTabs = teacherCourses
    ? [
        {
          id: "current" as const,
          label: t("sections.current"),
          subtitle: t("sections.currentSub"),
          empty: t("empty.current"),
          items: teacherCourses.teaching_current,
        },
        {
          id: "past" as const,
          label: t("sections.past"),
          subtitle: t("sections.pastSub"),
          empty: t("empty.past"),
          items: teacherCourses.teaching_past,
        },
        {
          id: "attestation" as const,
          label: t("sections.attestation"),
          subtitle: t("sections.attestationSub"),
          empty: t("empty.attestation"),
          items: teacherCourses.attestation,
        },
        {
          id: "practice" as const,
          label: t("sections.practice"),
          subtitle: t("sections.practiceSub"),
          empty: t("empty.practice"),
          items: teacherCourses.practice,
        },
      ]
    : [];

  const studentTabs = studentCourses
    ? [
        {
          id: "current" as const,
          label: t("student.current"),
          subtitle: t("student.currentSub"),
          empty: t("empty.current"),
          items: studentCourses.current,
        },
        {
          id: "past" as const,
          label: t("student.past"),
          subtitle: t("student.pastSub"),
          empty: t("empty.past"),
          items: studentCourses.past,
        },
        {
          id: "future" as const,
          label: t("student.future"),
          subtitle: t("student.futureSub"),
          empty: t("empty.future"),
          items: studentCourses.future,
        },
        {
          id: "attestation" as const,
          label: t("student.attestation"),
          subtitle: t("student.attestationSub"),
          empty: t("empty.attestation"),
          items: studentCourses.attestation,
        },
        {
          id: "practice" as const,
          label: t("student.practice"),
          subtitle: t("student.practiceSub"),
          empty: t("empty.practice"),
          items: studentCourses.practice,
        },
      ]
    : [];

  const unnamed = t("unnamedCourse");

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.welcome}>{t("welcome", { displayName: user.display_name })}</p>
          {user.username ? <p className={styles.meta}>{t("loginId", { username: user.username })}</p> : null}
          {user.user_type ? <p className={styles.meta}>{t("role", { role: user.user_type })}</p> : null}
          {isSuperadmin ? <p className={styles.meta}>Superadmin: aktiv</p> : null}
        </div>
        <div className={styles.headerActions}>
          {isDepartmentUser ? (
            <a className={styles.actionLink} href={`/${locale}/dashboard/department`}>
              Kafedra paneli
            </a>
          ) : null}
          {isSuperadmin ? (
            <a className={styles.actionLink} href={`/${locale}/dashboard/admin`}>
              Admin panel
            </a>
          ) : null}
        </div>
      </header>

      <div className={styles.content}>
        {isTeacher && teacherCourses == null ? (
          <p className={styles.alertError}>{t("coursesLoadError")}</p>
        ) : null}
        {isStudent && studentCourses == null ? (
          <p className={styles.alertError}>{t("coursesLoadError")}</p>
        ) : null}

        {isTeacher && teacherCourses ? (
          <TeacherDashboardTabs yearHint={yearTeacher} tabs={teacherTabs} unnamedCourse={unnamed} locale={locale} />
        ) : null}

        {isStudent && studentCourses ? (
          <StudentDashboardTabs yearHint={yearStudent} tabs={studentTabs} unnamedCourse={unnamed} />
        ) : null}

        {!isTeacher && !isStudent && !isDepartmentUser ? <p className={styles.alertMuted}>{t("nonTeacher")}</p> : null}
        {isDepartmentUser && !isTeacher && !isStudent ? (
          <p className={styles.alertMuted}>
            Kafedra hesabı ilə müəllimləri və mühazirə materiallarını idarə etmək üçün{" "}
            <a href={`/${locale}/dashboard/department`}>Kafedra panelinə</a> keçin.
          </p>
        ) : null}
      </div>
    </div>
  );
}

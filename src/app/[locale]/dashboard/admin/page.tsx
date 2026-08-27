import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { getMe } from "@/lib/api";

import styles from "../dashboard.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminHomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.meta}>{t("subtitle")}</p>
        </div>
        <Link className={styles.meta} href={`/${locale}/dashboard`}>
          {t("back")}
        </Link>
      </header>

      <div className={styles.content}>
        <ul style={{ display: "grid", gap: 12, paddingLeft: 18 }}>
          <li>
            <Link href={`/${locale}/dashboard/admin/education-plans`}>{t("educationPlans")}</Link>
          </li>
          <li>
            <Link href={`/${locale}/dashboard/admin/subject-groups`}>{t("subjectGroups")}</Link>
          </li>
          <li>
            <Link href={`/${locale}/dashboard/admin/courses`}>{t("timetable")}</Link>
          </li>
          <li>
            <Link href={`/${locale}/dashboard/admin/groups`}>{t("groups")}</Link>
          </li>
          <li>
            <Link href={`/${locale}/dashboard/admin/teachers`}>{t("teachers")}</Link>
          </li>
          <li>
            <Link href={`/${locale}/dashboard/admin/departments`}>{t("departments")}</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}


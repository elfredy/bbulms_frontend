import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { SubjectGroupCreateForm } from "@/components/SubjectGroupCreateForm";
import { getMe } from "@/lib/api";

import styles from "../../../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string; courseId: string }>;
};

export default async function AdminSubjectGroupEditPage({ params }: Props) {
  const { locale, courseId } = await params;
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{t("subjectGroupEdit")}</h1>
          <p className={styles.meta}>{t("subjectGroupsHint")}</p>
        </div>
        <Link className={styles.meta} href={`/${locale}/dashboard/admin/subject-groups`}>
          {t("back")}
        </Link>
      </header>
      <div className={styles.content}>
        <SubjectGroupCreateForm initialCourseId={courseId} />
      </div>
    </div>
  );
}

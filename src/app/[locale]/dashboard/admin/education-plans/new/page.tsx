import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { EducationPlanCreateForm } from "@/components/EducationPlanCreateForm";
import { adminEducationPlanLookups, getMe } from "@/lib/api";

import styles from "../../../dashboard.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminEducationPlanCreatePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const lookups = await adminEducationPlanLookups();
  if (!lookups) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>{t("educationPlanCreate")}</h1>
            <p className={styles.meta}>{t("loadError")}</p>
          </div>
          <Link className={styles.meta} href={`/${locale}/dashboard/admin/education-plans`}>
            {t("back")}
          </Link>
        </header>
      </div>
    );
  }

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{t("educationPlanCreate")}</h1>
          <p className={styles.meta}>{t("educationPlanCreateHint")}</p>
        </div>
        <Link className={styles.meta} href={`/${locale}/dashboard/admin/education-plans`}>
          {t("back")}
        </Link>
      </header>
      <div className={styles.content}>
        <EducationPlanCreateForm lookups={lookups} />
      </div>
    </div>
  );
}

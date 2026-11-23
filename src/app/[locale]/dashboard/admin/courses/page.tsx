import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { TimetableBuilder } from "@/components/TimetableBuilder";
import { getMe } from "@/lib/api";
import { canAccessAdminPath } from "@/lib/permissions";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminCoursesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!canAccessAdminPath(me, "courses")) redirect(`/${locale}/dashboard`);

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{t("timetableCreate")}</h1>
          <p className={styles.meta}>{t("timetableCreateHint")}</p>
        </div>
        <Link className={styles.meta} href={`/${locale}/dashboard/admin`}>
          {t("back")}
        </Link>
      </header>

      <div className={styles.content}>
        <TimetableBuilder />
      </div>
    </div>
  );
}

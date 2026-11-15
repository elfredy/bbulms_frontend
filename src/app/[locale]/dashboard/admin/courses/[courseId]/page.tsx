import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminCourseMeetingsClient } from "@/components/AdminCourseMeetingsClient";
import { adminListCourseMeetings, getMe } from "@/lib/api";

import styles from "../../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string; courseId: string }>;
  searchParams?: Promise<{ from?: string; to?: string }>;
};

export default async function AdminCourseMeetingsPage({ params, searchParams }: Props) {
  const { locale, courseId } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const from = (sp.from ?? "").trim() || null;
  const to = (sp.to ?? "").trim() || null;

  const data = await adminListCourseMeetings(courseId, from, to);
  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>{t("timetable")}</h1>
            <p className={styles.meta}>{t("loadError")}</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <AdminCourseMeetingsClient
      locale={locale}
      courseId={courseId}
      from={from}
      to={to}
      initialItems={data.items}
      initialCounts={data.counts ?? {}}
      labels={{
        title: t("timetableCourse", { id: courseId }),
        hint: t("meetingsHint"),
        back: t("back"),
        fromDate: t("fromDate"),
        toDate: t("toDate"),
        apply: t("apply"),
        empty: t("emptyMeetings"),
        loadError: t("loadError"),
      }}
    />
  );
}

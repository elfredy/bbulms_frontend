import { redirect } from "next/navigation";

import { AdminTranscriptClient } from "@/components/AdminTranscriptClient";
import { getMe } from "@/lib/api";
import { canAccessAdminPath } from "@/lib/permissions";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ education_group_id?: string }>;
};

export default async function StudentTranscriptPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!canAccessAdminPath(me, "student-transcript")) redirect(`/${locale}/dashboard`);

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>Tələbə transkripti</h1>
          <p className={styles.meta}>
            Akademik qrupa görə tələbə seçin, yekun transkriptə baxın və Excel export edin.
          </p>
        </div>
      </header>
      <div className={styles.content}>
        <AdminTranscriptClient
          locale={locale}
          initialGroupId={(sp.education_group_id ?? "").trim() || undefined}
        />
      </div>
    </div>
  );
}

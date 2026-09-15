import { redirect } from "next/navigation";

import { AdminJournalClient } from "@/components/AdminJournalClient";
import { getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ course_id?: string }>;
};

export default async function AdminJournalPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>Jurnal admin</h1>
          <p className={styles.meta}>Fənn qrupuna görə tələbə davamiyyəti. q.b sayı sətrin sonunda avtomatik hesablanır.</p>
        </div>
      </header>
      <div className={styles.content}>
        <AdminJournalClient locale={locale} initialCourseId={(sp.course_id ?? "").trim() || undefined} />
      </div>
    </div>
  );
}

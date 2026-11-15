import { redirect } from "next/navigation";

import { TeacherExamClient } from "@/components/TeacherExamClient";
import { getMe } from "@/lib/api";

import styles from "../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TeacherExamsPage({ params }: Props) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (me.teacher_id == null) redirect(`/${locale}/dashboard`);

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>İmtahan balları</h1>
          <p className={styles.meta}>
            İmtahanı yalnız admin yaradır. Sizə təyin olunmuş imtahanlarda tələbə adları gizlidir — qarışıq
            kodların yanına bal yazın.
          </p>
        </div>
      </header>
      <div className={styles.content}>
        <TeacherExamClient />
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";

import { AdminExamClient } from "@/components/AdminExamClient";
import { getMe } from "@/lib/api";

import styles from "../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminExamsPage({ params }: Props) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>İmtahan</h1>
          <p className={styles.meta}>
            İmtahan əlavə edin və tələbə nəticələrini əl ilə daxil edin. Əsas imtahan balları jurnala (EVA_03), təkrar
            imtahan balları isə təkrar imtahan cədvəlinə yazılır.
          </p>
        </div>
      </header>
      <div className={styles.content}>
        <AdminExamClient locale={locale} />
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { StudentImportForm } from "@/components/admin/StudentImportForm";
import { adminInstitutionLookups } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

import styles from "../../../dashboard.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function ImportStudentsPage({ params }: Props) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const lookups = await adminInstitutionLookups();
  if (!lookups) redirect(`/${locale}/dashboard/admin/students`);

  return (
    <div className={styles.pageWide}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>Çoxlu tələbə əlavə et</h1>
          <p className={styles.meta}>
          BAK və ya magistr Excel-ini yükləyin. Qrup sütunu və təhsil səviyyəsi (Magistratura) nəzərə alınır — magistr
          tələbələr bakalavr qruplarına düşmür.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/${locale}/dashboard/admin/students`} className={styles.actionLink}>
            Tələbələrə qayıt
          </Link>
        </div>
      </header>
      <div className={styles.content}>
        <StudentImportForm lookups={lookups} locale={locale} />
      </div>
    </div>
  );
}

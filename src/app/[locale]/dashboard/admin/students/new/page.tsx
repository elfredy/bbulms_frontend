import { redirect } from "next/navigation";

import { StudentForm } from "@/components/admin/StudentForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminInstitutionLookups } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string }> };

export default async function NewStudentPage({ params }: Props) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const lookups = await adminInstitutionLookups();
  if (!lookups) redirect(`/${locale}/dashboard/admin/students`);

  return (
    <AdminFormPage
      wide
      title="Tələbə əlavə et"
      hint="Tələbə mütləq mövcud qrupa və tələbə əmrinə bağlanır."
      backHref={`/${locale}/dashboard/admin/students`}
    >
      <StudentForm lookups={lookups} locale={locale} />
    </AdminFormPage>
  );
}

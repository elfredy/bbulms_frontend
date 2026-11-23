import Link from "next/link";
import { redirect } from "next/navigation";

import { StudentForm } from "@/components/admin/StudentForm";
import { AdminFormPage, FormHint } from "@/components/admin/form-shared";
import { adminInstitutionLookups } from "@/lib/admin-org";
import { getMe } from "@/lib/api";
import { canAccessAdminPath } from "@/lib/permissions";

type Props = { params: Promise<{ locale: string }> };

export default async function NewStudentPage({ params }: Props) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!canAccessAdminPath(me, "students/new")) redirect(`/${locale}/dashboard`);
  const lookups = await adminInstitutionLookups();
  if (!lookups) redirect(`/${locale}/dashboard/admin/students`);

  return (
    <AdminFormPage
      wide
      title="Tələbə əlavə et"
      hint="Tələbə mütləq mövcud qrupa və tələbə əmrinə bağlanır."
      backHref={`/${locale}/dashboard/admin/students`}
    >
      <FormHint>
        Bir neçə tələbə üçün <Link href={`/${locale}/dashboard/admin/students/import`}>Excel ilə çoxlu əlavə et</Link>.
      </FormHint>
      <StudentForm lookups={lookups} locale={locale} />
    </AdminFormPage>
  );
}

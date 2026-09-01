import { redirect } from "next/navigation";

import { TeacherForm } from "@/components/admin/TeacherForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminInstitutionLookups } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string }> };

export default async function NewTeacherPage({ params }: Props) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const lookups = await adminInstitutionLookups();
  if (!lookups) redirect(`/${locale}/dashboard/admin/teachers`);

  return (
    <AdminFormPage wide title="Müəllim əlavə et" hint="Müəllim mütləq kafedraya bağlanır." backHref={`/${locale}/dashboard/admin/teachers`}>
      <TeacherForm lookups={lookups} locale={locale} />
    </AdminFormPage>
  );
}

import { redirect } from "next/navigation";

import { SubjectCatalogForm } from "@/components/admin/SubjectCatalogForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminInstitutionLookups } from "@/lib/admin-org";
import { getMe } from "@/lib/api";
import { canAccessAdminPath } from "@/lib/permissions";

type Props = { params: Promise<{ locale: string }> };

export default async function NewSubjectCatalogPage({ params }: Props) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!canAccessAdminPath(me, "subject-catalog/new")) redirect(`/${locale}/dashboard`);
  const lookups = await adminInstitutionLookups();
  if (!lookups) redirect(`/${locale}/dashboard/admin/subject-catalog`);

  return (
    <AdminFormPage title="Fənni kafedraya bağla" hint="Kafedra və fənn adı mütləqdir." backHref={`/${locale}/dashboard/admin/subject-catalog`}>
      <SubjectCatalogForm lookups={lookups} locale={locale} />
    </AdminFormPage>
  );
}

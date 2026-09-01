import { redirect } from "next/navigation";

import { SubjectCatalogForm } from "@/components/admin/SubjectCatalogForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminGetSubjectCatalog, adminInstitutionLookups } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string; catalogId: string }> };

export default async function EditSubjectCatalogPage({ params }: Props) {
  const { locale, catalogId } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const [lookups, item] = await Promise.all([adminInstitutionLookups(), adminGetSubjectCatalog(catalogId)]);
  if (!lookups || !item) redirect(`/${locale}/dashboard/admin/subject-catalog`);

  return (
    <AdminFormPage
      title="Fənn kataloqunu yenilə"
      hint={item.subject_name_az ?? item.id}
      backHref={`/${locale}/dashboard/admin/subject-catalog`}
    >
      <SubjectCatalogForm lookups={lookups} initial={item} locale={locale} />
    </AdminFormPage>
  );
}

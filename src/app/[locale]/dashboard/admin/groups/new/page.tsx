import { redirect } from "next/navigation";

import { GroupForm } from "@/components/admin/GroupForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminInstitutionLookups } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string }> };

export default async function NewGroupPage({ params }: Props) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const lookups = await adminInstitutionLookups();
  if (!lookups) redirect(`/${locale}/dashboard/admin/groups`);

  return (
    <AdminFormPage wide title="Qrup əlavə et" hint="Səviyyə, ixtisas, ad və təhsil forması mütləqdir." backHref={`/${locale}/dashboard/admin/groups`}>
      <GroupForm lookups={lookups} locale={locale} />
    </AdminFormPage>
  );
}

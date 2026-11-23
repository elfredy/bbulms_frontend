import { redirect } from "next/navigation";

import { GroupForm } from "@/components/admin/GroupForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminInstitutionLookups } from "@/lib/admin-org";
import { adminGetGroupDetail, getMe } from "@/lib/api";
import { canAccessAdminPath } from "@/lib/permissions";

type Props = { params: Promise<{ locale: string; educationGroupId: string }> };

export default async function EditGroupPage({ params }: Props) {
  const { locale, educationGroupId } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!canAccessAdminPath(me, "groups/[educationGroupId]/edit")) redirect(`/${locale}/dashboard`);
  const [lookups, data] = await Promise.all([adminInstitutionLookups(), adminGetGroupDetail(educationGroupId)]);
  if (!lookups || !data) redirect(`/${locale}/dashboard/admin/groups`);

  return (
    <AdminFormPage
      wide
      title="Qrupu yenilə"
      hint={data.group.education_group_name ?? educationGroupId}
      backHref={`/${locale}/dashboard/admin/groups/${educationGroupId}`}
    >
      <GroupForm lookups={lookups} initial={data.group} locale={locale} />
    </AdminFormPage>
  );
}

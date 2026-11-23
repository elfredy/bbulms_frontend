import { redirect } from "next/navigation";

import { EvaluationTypeForm } from "@/components/admin/EvaluationTypeForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminGetEvaluationType, adminListEvaluationTypes } from "@/lib/admin-org";
import { getMe } from "@/lib/api";
import { canAccessAdminPath } from "@/lib/permissions";

type Props = { params: Promise<{ locale: string; itemId: string }> };

export default async function EditEvaluationPage({ params }: Props) {
  const { locale, itemId } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!canAccessAdminPath(me, "evaluation/[itemId]")) redirect(`/${locale}/dashboard`);
  const [lookupsData, item] = await Promise.all([adminListEvaluationTypes(), adminGetEvaluationType(itemId)]);
  if (!lookupsData || !item) redirect(`/${locale}/dashboard/admin/evaluation`);

  return (
    <AdminFormPage
      wide
      title="Qiymətləndirməni yenilə"
      hint={item.name || item.id}
      backHref={`/${locale}/dashboard/admin/evaluation`}
    >
      <EvaluationTypeForm lookups={lookupsData.lookups} initial={item} locale={locale} />
    </AdminFormPage>
  );
}

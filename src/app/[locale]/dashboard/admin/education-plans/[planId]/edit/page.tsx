import { redirect } from "next/navigation";

import { EducationPlanEditForm } from "@/components/admin/EducationPlanEditForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminEducationPlanLookups, adminGetEducationPlan, getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string; planId: string }> };

export default async function EditEducationPlanPage({ params }: Props) {
  const { locale, planId } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const [lookups, data] = await Promise.all([adminEducationPlanLookups(), adminGetEducationPlan(planId)]);
  if (!lookups || !data) redirect(`/${locale}/dashboard/admin/education-plans`);

  return (
    <AdminFormPage wide title="Tədris planını yenilə" hint={data.plan.name ?? planId} backHref={`/${locale}/dashboard/admin/education-plans`}>
      <EducationPlanEditForm lookups={lookups} initial={data.plan} locale={locale} />
    </AdminFormPage>
  );
}

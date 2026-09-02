import { redirect } from "next/navigation";

import { EducationPlanGroupsForm } from "@/components/admin/EducationPlanGroupsForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminGetEducationPlan, getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string; planId: string }> };

export default async function AddEducationPlanGroupsPage({ params }: Props) {
  const { locale, planId } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const data = await adminGetEducationPlan(planId);
  if (!data) redirect(`/${locale}/dashboard/admin/education-plans`);

  return (
    <AdminFormPage
      title="Qrup əlavə et"
      hint={data.plan.name ?? planId}
      backHref={`/${locale}/dashboard/admin/education-plans/${planId}`}
    >
      <EducationPlanGroupsForm
        planId={planId}
        organizationId={data.plan.organization_id}
        locale={locale}
        existing={data.groups}
      />
    </AdminFormPage>
  );
}

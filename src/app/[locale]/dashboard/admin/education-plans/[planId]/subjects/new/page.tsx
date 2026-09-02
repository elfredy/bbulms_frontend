import { redirect } from "next/navigation";

import { EducationPlanSubjectForm } from "@/components/admin/EducationPlanSubjectForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminEducationPlanLookups, adminGetEducationPlan, getMe } from "@/lib/api";

type Props = {
  params: Promise<{ locale: string; planId: string }>;
  searchParams?: Promise<{ semester_id?: string }>;
};

export default async function NewEducationPlanSubjectPage({ params, searchParams }: Props) {
  const { locale, planId } = await params;
  const sp = (await searchParams) ?? {};
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const [lookups, data] = await Promise.all([adminEducationPlanLookups(), adminGetEducationPlan(planId)]);
  if (!lookups || !data) redirect(`/${locale}/dashboard/admin/education-plans`);

  return (
    <AdminFormPage wide title="Fənn əlavə et" hint={data.plan.name ?? planId} backHref={`/${locale}/dashboard/admin/education-plans/${planId}`}>
      <EducationPlanSubjectForm
        locale={locale}
        planId={planId}
        organizationId={data.plan.organization_id}
        lookups={lookups}
        defaultSemesterId={sp.semester_id ?? null}
      />
    </AdminFormPage>
  );
}

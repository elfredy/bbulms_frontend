import { redirect } from "next/navigation";

import { EducationPlanExperienceForm } from "@/components/admin/EducationPlanExperienceForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminEducationPlanLookups, adminGetEducationPlan, getMe } from "@/lib/api";

type Props = {
  params: Promise<{ locale: string; planId: string }>;
  searchParams?: Promise<{ semester_id?: string }>;
};

export default async function NewEducationPlanExperiencePage({ params, searchParams }: Props) {
  const { locale, planId } = await params;
  const sp = (await searchParams) ?? {};
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const [lookups, data] = await Promise.all([adminEducationPlanLookups(), adminGetEducationPlan(planId)]);
  if (!lookups || !data) redirect(`/${locale}/dashboard/admin/education-plans`);

  return (
    <AdminFormPage title="Təcrübə əlavə et" hint={data.plan.name ?? planId} backHref={`/${locale}/dashboard/admin/education-plans/${planId}`}>
      <EducationPlanExperienceForm locale={locale} planId={planId} lookups={lookups} defaultSemesterId={sp.semester_id ?? null} />
    </AdminFormPage>
  );
}

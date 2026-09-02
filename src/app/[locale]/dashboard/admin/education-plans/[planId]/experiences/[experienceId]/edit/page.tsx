import { notFound, redirect } from "next/navigation";

import { EducationPlanExperienceForm } from "@/components/admin/EducationPlanExperienceForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminEducationPlanLookups, adminGetEducationPlan, getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string; planId: string; experienceId: string }> };

export default async function EditEducationPlanExperiencePage({ params }: Props) {
  const { locale, planId, experienceId } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const [lookups, data] = await Promise.all([adminEducationPlanLookups(), adminGetEducationPlan(planId)]);
  if (!lookups || !data) redirect(`/${locale}/dashboard/admin/education-plans`);
  const initial = data.subjects.find((s) => s.id === experienceId && String(s.type_name ?? "").toUpperCase() === "EXPERIENCE");
  if (!initial) notFound();

  return (
    <AdminFormPage title="Təcrübəni yenilə" hint={initial.subject_name_az ?? data.plan.name ?? planId} backHref={`/${locale}/dashboard/admin/education-plans/${planId}`}>
      <EducationPlanExperienceForm locale={locale} planId={planId} lookups={lookups} initial={initial} />
    </AdminFormPage>
  );
}

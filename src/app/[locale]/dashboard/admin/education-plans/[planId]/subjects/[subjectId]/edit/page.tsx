import { notFound, redirect } from "next/navigation";

import { EducationPlanSubjectForm } from "@/components/admin/EducationPlanSubjectForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminEducationPlanLookups, adminGetEducationPlan, getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string; planId: string; subjectId: string }> };

export default async function EditEducationPlanSubjectPage({ params }: Props) {
  const { locale, planId, subjectId } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const [lookups, data] = await Promise.all([adminEducationPlanLookups(), adminGetEducationPlan(planId)]);
  if (!lookups || !data) redirect(`/${locale}/dashboard/admin/education-plans`);
  const initial = data.subjects.find((s) => s.id === subjectId && String(s.type_name ?? "SUBJECT").toUpperCase() === "SUBJECT");
  if (!initial) notFound();

  return (
    <AdminFormPage wide title="Fənni yenilə" hint={initial.subject_name_az ?? data.plan.name ?? planId} backHref={`/${locale}/dashboard/admin/education-plans/${planId}`}>
      <EducationPlanSubjectForm
        locale={locale}
        planId={planId}
        organizationId={data.plan.organization_id}
        lookups={lookups}
        initial={initial}
      />
    </AdminFormPage>
  );
}

import { notFound, redirect } from "next/navigation";

import { EducationPlanThesisForm } from "@/components/admin/EducationPlanThesisForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminEducationPlanLookups, adminGetEducationPlan, getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string; planId: string; thesisId: string }> };

export default async function EditEducationPlanThesisPage({ params }: Props) {
  const { locale, planId, thesisId } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const [lookups, data] = await Promise.all([adminEducationPlanLookups(), adminGetEducationPlan(planId)]);
  if (!lookups || !data) redirect(`/${locale}/dashboard/admin/education-plans`);
  const initial = data.subjects.find((s) => s.id === thesisId && String(s.type_name ?? "").toUpperCase() === "THESIS");
  if (!initial) notFound();

  return (
    <AdminFormPage title="Attestasiyanı yenilə" hint={data.plan.name ?? planId} backHref={`/${locale}/dashboard/admin/education-plans/${planId}`}>
      <EducationPlanThesisForm locale={locale} planId={planId} lookups={lookups} initial={initial} />
    </AdminFormPage>
  );
}

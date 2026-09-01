import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { SubjectGroupCreateForm } from "@/components/SubjectGroupCreateForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { getMe } from "@/lib/api";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ education_plan_id?: string }>;
};

export default async function AdminSubjectGroupCreatePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  return (
    <AdminFormPage wide title={t("subjectGroupCreate")} hint={t("subjectGroupsHint")} backHref={`/${locale}/dashboard/admin/subject-groups`}>
      <SubjectGroupCreateForm initialPlanId={sp.education_plan_id ?? null} />
    </AdminFormPage>
  );
}

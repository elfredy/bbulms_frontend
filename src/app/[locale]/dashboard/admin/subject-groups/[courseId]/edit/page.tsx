import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { SubjectGroupCreateForm } from "@/components/SubjectGroupCreateForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { getMe } from "@/lib/api";
import { canAccessAdminPath } from "@/lib/permissions";

type Props = {
  params: Promise<{ locale: string; courseId: string }>;
};

export default async function AdminSubjectGroupEditPage({ params }: Props) {
  const { locale, courseId } = await params;
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!canAccessAdminPath(me, "subject-groups/[courseId]/edit")) redirect(`/${locale}/dashboard`);

  return (
    <AdminFormPage wide title={t("subjectGroupEdit")} hint={t("subjectGroupsHint")} backHref={`/${locale}/dashboard/admin/subject-groups`}>
      <SubjectGroupCreateForm initialCourseId={courseId} />
    </AdminFormPage>
  );
}

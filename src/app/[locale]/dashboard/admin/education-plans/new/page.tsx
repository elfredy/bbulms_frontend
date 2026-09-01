import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { EducationPlanCreateForm } from "@/components/EducationPlanCreateForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminEducationPlanLookups, getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminEducationPlanCreatePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const lookups = await adminEducationPlanLookups();
  if (!lookups) {
    return (
      <AdminFormPage title={t("educationPlanCreate")} hint={t("loadError")} backHref={`/${locale}/dashboard/admin/education-plans`}>
        <p>{t("loadError")}</p>
      </AdminFormPage>
    );
  }

  return (
    <AdminFormPage
      wide
      title={t("educationPlanCreate")}
      hint={t("educationPlanCreateHint")}
      backHref={`/${locale}/dashboard/admin/education-plans`}
    >
      <EducationPlanCreateForm lookups={lookups} />
    </AdminFormPage>
  );
}

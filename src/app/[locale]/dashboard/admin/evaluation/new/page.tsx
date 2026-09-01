import { redirect } from "next/navigation";

import { EvaluationTypeForm } from "@/components/admin/EvaluationTypeForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminListEvaluationTypes } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string }> };

export default async function NewEvaluationPage({ params }: Props) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const data = await adminListEvaluationTypes();
  if (!data) redirect(`/${locale}/dashboard/admin/evaluation`);

  return (
    <AdminFormPage
      wide
      title="Qiymətləndirmə əlavə et"
      hint="Ad, qiymətləndirmə tipi və maksimum bal mütləqdir."
      backHref={`/${locale}/dashboard/admin/evaluation`}
    >
      <EvaluationTypeForm lookups={data.lookups} locale={locale} />
    </AdminFormPage>
  );
}

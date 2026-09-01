import { redirect } from "next/navigation";

import { EduYearForm } from "@/components/admin/EduYearForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string }> };

export default async function NewEduYearPage({ params }: Props) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  return (
    <AdminFormPage title="Tədris ili əlavə et" hint="Ad, başlama və bitmə tarixi mütləqdir." backHref={`/${locale}/dashboard/admin/edu-years`}>
      <EduYearForm locale={locale} />
    </AdminFormPage>
  );
}

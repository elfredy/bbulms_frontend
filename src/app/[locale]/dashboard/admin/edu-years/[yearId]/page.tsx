import { redirect } from "next/navigation";

import { EduYearForm } from "@/components/admin/EduYearForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminGetEduYear } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string; yearId: string }> };

export default async function EditEduYearPage({ params }: Props) {
  const { locale, yearId } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const year = await adminGetEduYear(yearId);
  if (!year) redirect(`/${locale}/dashboard/admin/edu-years`);

  return (
    <AdminFormPage title="Tədris ilini yenilə" hint={year.name || year.id} backHref={`/${locale}/dashboard/admin/edu-years`}>
      <EduYearForm initial={year} locale={locale} />
    </AdminFormPage>
  );
}

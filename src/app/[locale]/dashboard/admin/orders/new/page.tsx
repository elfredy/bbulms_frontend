import { redirect } from "next/navigation";

import { OrderForm } from "@/components/admin/OrderForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminInstitutionLookups } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string }> };

export default async function NewOrderPage({ params }: Props) {
  const { locale } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const lookups = await adminInstitutionLookups();
  if (!lookups) redirect(`/${locale}/dashboard/admin/orders`);

  return (
    <AdminFormPage title="Əmr əlavə et" hint="Tip, forma, səviyyə, seriya və tarix mütləqdir." backHref={`/${locale}/dashboard/admin/orders`}>
      <OrderForm lookups={lookups} locale={locale} />
    </AdminFormPage>
  );
}

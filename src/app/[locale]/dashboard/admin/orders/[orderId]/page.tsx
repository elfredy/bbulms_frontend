import { redirect } from "next/navigation";

import { OrderForm } from "@/components/admin/OrderForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminGetOrder, adminInstitutionLookups } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string; orderId: string }> };

export default async function EditOrderPage({ params }: Props) {
  const { locale, orderId } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const [lookups, order] = await Promise.all([adminInstitutionLookups(), adminGetOrder(orderId)]);
  if (!lookups || !order) redirect(`/${locale}/dashboard/admin/orders`);

  return (
    <AdminFormPage title="Əmri yenilə" hint={order.serial || order.id} backHref={`/${locale}/dashboard/admin/orders`}>
      <OrderForm lookups={lookups} initial={order} locale={locale} />
    </AdminFormPage>
  );
}

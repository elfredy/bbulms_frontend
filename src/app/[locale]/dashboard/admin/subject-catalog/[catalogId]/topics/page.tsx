import { redirect } from "next/navigation";

import { SubjectCatalogTopicsForm } from "@/components/admin/SubjectCatalogTopicsForm";
import { adminListSubjectCatalogTopics } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string; catalogId: string }> };

export default async function SubjectCatalogTopicsPage({ params }: Props) {
  const { locale, catalogId } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const data = await adminListSubjectCatalogTopics(catalogId, { limit: 25, offset: 0 });
  if (!data) redirect(`/${locale}/dashboard/admin/subject-catalog`);

  return <SubjectCatalogTopicsForm catalogId={catalogId} locale={locale} initial={data} />;
}

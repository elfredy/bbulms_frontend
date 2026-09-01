import { redirect } from "next/navigation";

import { StudentForm } from "@/components/admin/StudentForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminGetStudent, adminInstitutionLookups } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

type Props = { params: Promise<{ locale: string; studentId: string }> };

export default async function EditStudentPage({ params }: Props) {
  const { locale, studentId } = await params;
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);
  const [lookups, student] = await Promise.all([adminInstitutionLookups(), adminGetStudent(studentId)]);
  if (!lookups || !student) redirect(`/${locale}/dashboard/admin/students`);

  return (
    <AdminFormPage
      wide
      title="Tələbəni yenilə"
      hint={[student.lastname, student.firstname, student.patronymic].filter(Boolean).join(" ")}
      backHref={`/${locale}/dashboard/admin/students`}
    >
      <StudentForm lookups={lookups} initial={student} locale={locale} />
    </AdminFormPage>
  );
}

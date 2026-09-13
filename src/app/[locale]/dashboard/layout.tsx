import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/DashboardShell";
import { getMe } from "@/lib/api";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;

  const me = await getMe();
  if (!me) {
    redirect(`/${locale}/login`);
  }

  const role = (me.user_type || "").toUpperCase();
  const isAdminRole = role === "ADMIN" || role === "SUPERADMIN";
  const isStudent = role === "STUDENT" && me.student_id;
  const isTutor = role === "TYUTOR";
  const isDepartment = Boolean(me.is_department_user) && (role === "OWNER" || role === "TYUTOR");
  const forcePassword = Boolean(me.must_change_password);
  const items = forcePassword
    ? [{ href: `/${locale}/dashboard/change-password`, label: "Şifrəni dəyiş" }]
    : [
        { href: `/${locale}/dashboard`, label: "Şəxsi kabinet" },
        ...(isStudent ? [{ href: `/${locale}/dashboard/schedule`, label: "Dərs cədvəli", section: "Tələbə" }] : []),
        ...(isTutor ? [{ href: `/${locale}/dashboard/tutor`, label: "Tyutor paneli", section: "Tyutor" }] : []),
        ...(isAdminRole
          ? [
              { href: `/${locale}/dashboard/admin/edu-years`, label: "Tədris illərinin qrafiki", section: "Planlama" },
              { href: `/${locale}/dashboard/admin/academic-calendar`, label: "Akademik təqvim", section: "Planlama" },
              { href: `/${locale}/dashboard/admin/evaluation`, label: "Qiymətləndirmə sistemi", section: "Planlama" },
              { href: `/${locale}/dashboard/admin/orders`, label: "Tələbə əmrləri", section: "Müəssisə idarəsi" },
              { href: `/${locale}/dashboard/admin/students`, label: "Tələbələr", section: "Müəssisə idarəsi" },
              { href: `/${locale}/dashboard/admin/teachers`, label: "Pedaqoji heyət", section: "Müəssisə idarəsi" },
              { href: `/${locale}/dashboard/admin/teachers?staff_role=TYUTOR`, label: "Tyutorlar", section: "Müəssisə idarəsi" },
              { href: `/${locale}/dashboard/admin/teachers?staff_role=LABORANT`, label: "Laborantlar", section: "Müəssisə idarəsi" },
              { href: `/${locale}/dashboard/admin/user-roles`, label: "İstifadəçi rolları", section: "Müəssisə idarəsi" },
              { href: `/${locale}/dashboard/admin/groups`, label: "Tələbə qrupları", section: "Müəssisə idarəsi" },
              { href: `/${locale}/dashboard/admin/subject-catalog`, label: "Kafedralar üzrə fənn kataloqu", section: "Təhsil proqramları" },
              { href: `/${locale}/dashboard/admin/subject-blocks`, label: "Fənn blokları", section: "Təhsil proqramları" },
              { href: `/${locale}/dashboard/admin/education-plans`, label: "Tədris planları", section: "Təhsil proqramları" },
              { href: `/${locale}/dashboard/admin/subject-groups`, label: "Fənn qrupları", section: "Təhsil proqramları" },
              { href: `/${locale}/dashboard/admin/courses`, label: "Cari semestrin dərs cədvəli", section: "Təhsil proqramları" },
            ]
          : []),
        ...(isDepartment ? [{ href: `/${locale}/dashboard/department`, label: "Kafedra paneli", section: "Kafedra" }] : []),
      ];

  return (
    <DashboardShell
      me={{
        display_name: me.display_name,
        username: me.username,
        user_type: me.user_type,
        user_type_label: me.user_type_label,
        is_superadmin: me.is_superadmin,
        must_change_password: me.must_change_password,
        available_roles: me.available_roles,
      }}
      items={items}
    >
      {children}
    </DashboardShell>
  );
}

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

  const items = [
    { href: `/${locale}/dashboard`, label: "Şəxsi kabinet" },
    ...(me.is_superadmin
      ? [
          { href: `/${locale}/dashboard/admin/edu-years`, label: "Tədris illərinin qrafiki", section: "Planlama" },
          { href: `/${locale}/dashboard/admin/academic-calendar`, label: "Akademik təqvim", section: "Planlama" },
          { href: `/${locale}/dashboard/admin/evaluation`, label: "Qiymətləndirmə sistemi", section: "Planlama" },
          { href: `/${locale}/dashboard/admin/orders`, label: "Tələbə əmrləri", section: "Müəssisə idarəsi" },
          { href: `/${locale}/dashboard/admin/students`, label: "Tələbələr", section: "Müəssisə idarəsi" },
          { href: `/${locale}/dashboard/admin/teachers`, label: "Pedaqoji heyət", section: "Müəssisə idarəsi" },
          { href: `/${locale}/dashboard/admin/groups`, label: "Tələbə qrupları", section: "Müəssisə idarəsi" },
          { href: `/${locale}/dashboard/admin/subject-catalog`, label: "Kafedralar üzrə fənn kataloqu", section: "Təhsil proqramları" },
          { href: `/${locale}/dashboard/admin/education-plans`, label: "Tədris planları", section: "Təhsil proqramları" },
          { href: `/${locale}/dashboard/admin/subject-groups`, label: "Fənn qrupları", section: "Təhsil proqramları" },
          { href: `/${locale}/dashboard/admin/courses`, label: "Cari semestrin dərs cədvəli", section: "Təhsil proqramları" },
        ]
      : []),
    ...(me.is_department_user
      ? [{ href: `/${locale}/dashboard/department`, label: "Kafedra paneli", section: "Kafedra" }]
      : []),
  ];

  return (
    <DashboardShell
      me={{
        display_name: me.display_name,
        username: me.username,
        user_type: me.user_type,
        is_superadmin: me.is_superadmin,
      }}
      items={items}
    >
      {children}
    </DashboardShell>
  );
}


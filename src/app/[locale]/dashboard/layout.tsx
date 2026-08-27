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
    { href: `/${locale}/dashboard`, label: "Dashboard" },
    ...(me.is_superadmin
      ? [
          { href: `/${locale}/dashboard/admin`, label: "Admin panel", badge: "Admin", section: "Admin" },
          { href: `/${locale}/dashboard/admin/education-plans`, label: "Tədris planları", section: "Təhsil proqramları" },
          { href: `/${locale}/dashboard/admin/subject-groups`, label: "Fənn qrupları", section: "Təhsil proqramları" },
          { href: `/${locale}/dashboard/admin/courses`, label: "Dərs cədvəli", section: "Təhsil proqramları" },
          { href: `/${locale}/dashboard/admin/groups`, label: "Qruplar", section: "İdarəetmə" },
          { href: `/${locale}/dashboard/admin/teachers`, label: "Müəllimlər", section: "İdarəetmə" },
          { href: `/${locale}/dashboard/admin/departments`, label: "Kafedralar", section: "İdarəetmə" },
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


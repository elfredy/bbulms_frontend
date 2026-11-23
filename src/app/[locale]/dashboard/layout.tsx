import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/DashboardShell";
import { getMe } from "@/lib/api";
import { PERMS, hasPerm } from "@/lib/permissions";

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
  const isStudent = role === "STUDENT" && me.student_id;
  const isTutor = role === "TYUTOR";
  const isDepartment = Boolean(me.is_department_user) && (role === "OWNER" || role === "TYUTOR");
  const forcePassword = Boolean(me.must_change_password);

  const adminItems: { href: string; label: string; section: string; perm: string }[] = [
    { href: `/${locale}/dashboard/admin/edu-years`, label: "Tədris illərinin qrafiki", section: "Planlama", perm: PERMS.PLANNING },
    { href: `/${locale}/dashboard/admin/academic-calendar`, label: "Akademik təqvim", section: "Planlama", perm: PERMS.PLANNING },
    { href: `/${locale}/dashboard/admin/evaluation`, label: "Qiymətləndirmə sistemi", section: "Planlama", perm: PERMS.PLANNING },
    { href: `/${locale}/dashboard/admin/orders`, label: "Tələbə əmrləri", section: "Müəssisə idarəsi", perm: PERMS.ORG_ORDERS },
    { href: `/${locale}/dashboard/admin/students`, label: "Tələbələr", section: "Müəssisə idarəsi", perm: PERMS.ORG_STUDENTS },
    { href: `/${locale}/dashboard/admin/teachers`, label: "Pedaqoji heyət", section: "Müəssisə idarəsi", perm: PERMS.ORG_STAFF },
    { href: `/${locale}/dashboard/admin/teachers?staff_role=TYUTOR`, label: "Tyutorlar", section: "Müəssisə idarəsi", perm: PERMS.ORG_STAFF },
    { href: `/${locale}/dashboard/admin/teachers?staff_role=LABORANT`, label: "Laborantlar", section: "Müəssisə idarəsi", perm: PERMS.ORG_STAFF },
    { href: `/${locale}/dashboard/admin/user-roles`, label: "İstifadəçi rolları", section: "Müəssisə idarəsi", perm: PERMS.ROLES_MANAGE },
    { href: `/${locale}/dashboard/admin/groups`, label: "Tələbə qrupları", section: "Müəssisə idarəsi", perm: PERMS.ORG_GROUPS },
    { href: `/${locale}/dashboard/admin/subject-catalog`, label: "Kafedralar üzrə fənn kataloqu", section: "Təhsil proqramları", perm: PERMS.EDU_CATALOG },
    { href: `/${locale}/dashboard/admin/subject-blocks`, label: "Fənn blokları", section: "Təhsil proqramları", perm: PERMS.PLANNING },
    { href: `/${locale}/dashboard/admin/education-plans`, label: "Tədris planları", section: "Təhsil proqramları", perm: PERMS.EDU_PLANS },
    { href: `/${locale}/dashboard/admin/subject-groups`, label: "Fənn qrupları", section: "Təhsil proqramları", perm: PERMS.EDU_PLANS },
    { href: `/${locale}/dashboard/admin/courses`, label: "Cari semestrin dərs cədvəli", section: "Təhsil proqramları", perm: PERMS.EDU_TIMETABLE },
    { href: `/${locale}/dashboard/admin/journal`, label: "Jurnal admin", section: "Təhsil proqramları", perm: PERMS.EDU_JOURNAL },
    { href: `/${locale}/dashboard/admin/exams`, label: "İmtahan", section: "Təhsil proqramları", perm: PERMS.EDU_EXAM },
    { href: `/${locale}/dashboard/admin/student-transcript`, label: "Tələbə transkripti", section: "Təhsil proqramları", perm: PERMS.EDU_TRANSCRIPT },
  ];

  const items = forcePassword
    ? [{ href: `/${locale}/dashboard/change-password`, label: "Şifrəni dəyiş" }]
    : [
        { href: `/${locale}/dashboard`, label: "Şəxsi kabinet" },
        ...(isStudent
          ? [
              { href: `/${locale}/dashboard/schedule`, label: "Dərs cədvəli", section: "Tələbə" },
              { href: `/${locale}/dashboard/requests`, label: "Müraciətlər", section: "Tələbə" },
            ]
          : []),
        ...(me.teacher_id
          ? [
              { href: `/${locale}/dashboard/exams`, label: "İmtahan balları", section: "Müəllim" },
              { href: `/${locale}/dashboard/requests`, label: "Müraciətlər", section: "Müəllim" },
            ]
          : []),
        ...(isTutor ? [{ href: `/${locale}/dashboard/tutor`, label: "Tyutor paneli", section: "Tyutor" }] : []),
        ...adminItems
          .filter((item) => hasPerm(me, item.perm))
          .map(({ href, label, section }) => ({ href, label, section })),
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
        can_access_admin: me.can_access_admin,
        permissions: me.permissions,
        must_change_password: me.must_change_password,
        available_roles: me.available_roles,
      }}
      items={items}
    >
      {children}
    </DashboardShell>
  );
}

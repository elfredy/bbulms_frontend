import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { getMe } from "@/lib/api";
import { PERMS, canAccessAdmin, hasPerm } from "@/lib/permissions";

import styles from "../dashboard.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminHomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!canAccessAdmin(me)) redirect(`/${locale}/dashboard`);

  const groups = [
    {
      title: "Planlama",
      items: [
        { href: `/${locale}/dashboard/admin/edu-years`, label: "Tədris illərinin qrafiki", perm: PERMS.PLANNING },
        { href: `/${locale}/dashboard/admin/academic-calendar`, label: "Akademik təqvim", perm: PERMS.PLANNING },
        { href: `/${locale}/dashboard/admin/evaluation`, label: "Qiymətləndirmə sistemi", perm: PERMS.PLANNING },
      ],
    },
    {
      title: "Müəssisə idarəsi",
      items: [
        { href: `/${locale}/dashboard/admin/orders`, label: "Tələbə əmrləri", perm: PERMS.ORG_ORDERS },
        { href: `/${locale}/dashboard/admin/students`, label: "Tələbələr", perm: PERMS.ORG_STUDENTS },
        { href: `/${locale}/dashboard/admin/teachers`, label: "Pedaqoji heyət", perm: PERMS.ORG_STAFF },
        { href: `/${locale}/dashboard/admin/teachers?staff_role=TYUTOR`, label: "Tyutorlar", perm: PERMS.ORG_STAFF },
        { href: `/${locale}/dashboard/admin/teachers?staff_role=LABORANT`, label: "Laborantlar", perm: PERMS.ORG_STAFF },
        { href: `/${locale}/dashboard/admin/user-roles`, label: "İstifadəçi rolları", perm: PERMS.ROLES_MANAGE },
        { href: `/${locale}/dashboard/admin/groups`, label: "Tələbə qrupları", perm: PERMS.ORG_GROUPS },
      ],
    },
    {
      title: "Təhsil proqramları",
      items: [
        { href: `/${locale}/dashboard/admin/subject-catalog`, label: "Kafedralar üzrə fənn kataloqu", perm: PERMS.EDU_CATALOG },
        { href: `/${locale}/dashboard/admin/education-plans`, label: t("educationPlans"), perm: PERMS.EDU_PLANS },
        { href: `/${locale}/dashboard/admin/subject-groups`, label: t("subjectGroups"), perm: [PERMS.EDU_PLANS, PERMS.EDU_SUBJECT_GROUPS_VIEW] },
        { href: `/${locale}/dashboard/admin/courses`, label: t("timetable"), perm: PERMS.EDU_TIMETABLE },
        { href: `/${locale}/dashboard/admin/journal`, label: "Jurnal admin", perm: [PERMS.EDU_JOURNAL, PERMS.EDU_JOURNAL_VIEW] },
        { href: `/${locale}/dashboard/admin/exams`, label: "İmtahan", perm: PERMS.EDU_EXAM },
        { href: `/${locale}/dashboard/admin/student-transcript`, label: "Tələbə transkripti", perm: PERMS.EDU_TRANSCRIPT },
      ],
    },
  ]
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasPerm(me, ...(Array.isArray(item.perm) ? item.perm : [item.perm]))),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.meta}>{t("subtitle")}</p>
        </div>
        <Link className={styles.meta} href={`/${locale}/dashboard`}>
          {t("back")}
        </Link>
      </header>
      <div className={styles.content} style={{ display: "grid", gap: 22 }}>
        {groups.map((group) => (
          <section key={group.title}>
            <h2 style={{ margin: "0 0 8px", fontSize: "0.82rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>
              {group.title}
            </h2>
            <ul style={{ display: "grid", gap: 10, paddingLeft: 18, margin: 0 }}>
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

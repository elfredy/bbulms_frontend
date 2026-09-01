import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { getMe } from "@/lib/api";

import styles from "../dashboard.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminHomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const groups = [
    {
      title: "Planlama",
      items: [
        { href: `/${locale}/dashboard/admin/edu-years`, label: "Tədris illərinin qrafiki" },
        { href: `/${locale}/dashboard/admin/academic-calendar`, label: "Akademik təqvim" },
        { href: `/${locale}/dashboard/admin/evaluation`, label: "Qiymətləndirmə sistemi" },
      ],
    },
    {
      title: "Müəssisə idarəsi",
      items: [
        { href: `/${locale}/dashboard/admin/orders`, label: "Tələbə əmrləri" },
        { href: `/${locale}/dashboard/admin/students`, label: "Tələbələr" },
        { href: `/${locale}/dashboard/admin/teachers`, label: "Pedaqoji heyət" },
        { href: `/${locale}/dashboard/admin/groups`, label: "Tələbə qrupları" },
      ],
    },
    {
      title: "Təhsil proqramları",
      items: [
        { href: `/${locale}/dashboard/admin/subject-catalog`, label: "Kafedralar üzrə fənn kataloqu" },
        { href: `/${locale}/dashboard/admin/education-plans`, label: t("educationPlans") },
        { href: `/${locale}/dashboard/admin/subject-groups`, label: t("subjectGroups") },
        { href: `/${locale}/dashboard/admin/courses`, label: t("timetable") },
      ],
    },
  ];

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

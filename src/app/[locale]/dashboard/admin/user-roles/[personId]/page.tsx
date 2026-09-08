import { redirect } from "next/navigation";

import { PasswordResetPanel } from "@/components/admin/PasswordResetPanel";
import { UserRoleForm } from "@/components/admin/UserRoleForm";
import { AdminFormPage } from "@/components/admin/form-shared";
import { adminGetUserRole, adminInstitutionLookups } from "@/lib/admin-org";
import { getMe } from "@/lib/api";

import styles from "../../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string; personId: string }>;
  searchParams?: Promise<{ saved?: string }>;
};

export default async function AdminUserRoleDetailPage({ params, searchParams }: Props) {
  const { locale, personId } = await params;
  const saved = ((await searchParams) ?? {}).saved === "1";
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const [lookups, person] = await Promise.all([adminInstitutionLookups(), adminGetUserRole(personId)]);
  if (!lookups || !person) redirect(`/${locale}/dashboard/admin/user-roles`);

  const hintParts = [person.pincode ? `FİN: ${person.pincode}` : null, person.username ? `@${person.username}` : null].filter(Boolean);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <AdminFormPage
        wide
        title={person.fullname ?? person.person_id}
        hint={hintParts.join(" · ") || undefined}
        backHref={`/${locale}/dashboard/admin/user-roles`}
      >
        <div className={styles.statsGrid} style={{ marginBottom: 16 }}>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{person.user_type_label}</p>
            <p className={styles.statLabel}>Cari sistem rolu</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{person.department_name_az ?? "—"}</p>
            <p className={styles.statLabel}>{person.faculty_name_az ? `${person.faculty_name_az}` : "Kafedra"}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{person.has_login ? person.username ?? "Var" : "Yox"}</p>
            <p className={styles.statLabel}>Giriş hesabı</p>
          </div>
        </div>
        {saved ? <p className={styles.alertOk}>Rol yeniləndi.</p> : null}
        {!person.has_login ? (
          <p className={styles.alertError}>Bu FİN üzrə giriş hesabı yoxdur. Rol dəyişmək üçün şəxsin sistemə giriş hesabı olmalıdır.</p>
        ) : null}
        {person.notes.length > 0 ? <p className={styles.meta}>{person.notes.join(" · ")}</p> : null}
        {person.has_login ? <UserRoleForm lookups={lookups} initial={person} locale={locale} /> : null}
        {person.has_login ? (
          <div style={{ marginTop: 24, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            <PasswordResetPanel initial={person} />
          </div>
        ) : null}
      </AdminFormPage>
    </div>
  );
}

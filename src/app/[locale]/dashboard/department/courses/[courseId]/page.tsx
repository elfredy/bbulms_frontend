import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { getDepartmentCourseFiles, getMe } from "@/lib/api";

import styles from "../../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string; courseId: string }>;
  searchParams?: Promise<{ ok?: string; err?: string }>;
};

export default async function DepartmentCourseMaterialsPage({ params, searchParams }: Props) {
  const { locale, courseId } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations("department");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_department_user) redirect(`/${locale}/dashboard`);

  const data = await getDepartmentCourseFiles(courseId);
  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>{t("materials")}</h1>
            <p className={styles.meta}>{t("loadError")}</p>
          </div>
          <Link className={styles.meta} href={`/${locale}/dashboard/department`}>
            {t("back")}
          </Link>
        </header>
      </div>
    );
  }

  async function uploadMaterialAction(formData: FormData) {
    "use server";
    const cookieStore = await cookies();
    const header = cookieStore.toString();
    if (!header) redirect(`/${locale}/login`);

    const name = String(formData.get("name") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    if (!name || !url) redirect(`/${locale}/dashboard/department/courses/${courseId}?err=form`);

    const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
    const res = await fetch(`${origin}/api/department/courses/${encodeURIComponent(courseId)}/files`, {
      method: "POST",
      headers: { cookie: header, "content-type": "application/json" },
      body: JSON.stringify({ name, url, description }),
    });
    if (!res.ok) redirect(`/${locale}/dashboard/department/courses/${courseId}?err=upload`);
    redirect(`/${locale}/dashboard/department/courses/${courseId}?ok=upload`);
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
  } as const;

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{t("materials")}</h1>
          <p className={styles.meta}>{`CourseId: ${courseId}`}</p>
        </div>
        <Link className={styles.meta} href={`/${locale}/dashboard/department`}>
          {t("back")}
        </Link>
      </header>

      <div className={styles.content} style={{ display: "grid", gap: 20 }}>
        {sp.ok === "upload" ? <p className={styles.meta}>{t("uploadOk")}</p> : null}
        {sp.err ? <p className={styles.alertError}>{t("actionError")}</p> : null}

        <section>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{t("uploadMaterial")}</h2>
          <form action={uploadMaterialAction} style={{ display: "grid", gap: 10, maxWidth: 560 }}>
            <input name="name" required placeholder={t("materialName")} style={inputStyle} />
            <input name="url" required type="url" placeholder={t("materialUrl")} style={inputStyle} />
            <textarea name="description" placeholder={t("materialDescription")} rows={3} style={inputStyle} />
            <button type="submit" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", cursor: "pointer", width: "fit-content" }}>
              {t("upload")}
            </button>
          </form>
        </section>

        <section>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{t("existingMaterials")}</h2>
          {data.items.length === 0 ? (
            <p className={styles.alertMuted}>{t("emptyMaterials")}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
              {data.items.map((f) => (
                <li key={f.file_row_id}>
                  <div>{f.name ?? f.file_row_id}</div>
                  <div className={styles.meta}>{[f.author_name, f.create_date].filter(Boolean).join(" · ")}</div>
                  {f.url ? (
                    <a href={f.url} target="_blank" rel="noreferrer">
                      {f.url}
                    </a>
                  ) : null}
                  {f.description ? <div className={styles.meta}>{f.description}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

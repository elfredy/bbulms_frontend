import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { adminListCourses, getMe } from "@/lib/api";

import styles from "../../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ ok?: string; err?: string }>;
};

export default async function AdminCourseCreatePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const courses = (await adminListCourses(null, null, null, 200, 0))?.items ?? [];

  async function createFromScratchAction(formData: FormData) {
    "use server";
    const cookieStore = await cookies();
    const header = cookieStore.toString();
    if (!header) redirect(`/${locale}/login`);

    const code = String(formData.get("code") ?? "").trim() || null;
    const education_plan_subject_id = String(formData.get("education_plan_subject_id") ?? "").trim() || null;
    const education_year_id = String(formData.get("education_year_id") ?? "").trim() || null;
    const evaluation_type_id = String(formData.get("evaluation_type_id") ?? "").trim() || null;

    const m_hours = String(formData.get("m_hours") ?? "").trim();
    const s_hours = String(formData.get("s_hours") ?? "").trim();
    const l_hours = String(formData.get("l_hours") ?? "").trim();
    const fm_hours = String(formData.get("fm_hours") ?? "").trim();

    const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
    const res = await fetch(`${origin}/api/admin/courses`, {
      method: "POST",
      headers: { cookie: header, "content-type": "application/json" },
      body: JSON.stringify({
        code,
        education_plan_subject_id,
        education_year_id,
        evaluation_type_id,
        m_hours: m_hours ? Number(m_hours) : null,
        s_hours: s_hours ? Number(s_hours) : null,
        l_hours: l_hours ? Number(l_hours) : null,
        fm_hours: fm_hours ? Number(fm_hours) : null,
      }),
    });
    if (!res.ok) redirect(`/${locale}/dashboard/admin/courses/new?err=http`);
    const json = (await res.json()) as { course_id?: string };
    redirect(`/${locale}/dashboard/admin/courses?ok=created&course_id=${encodeURIComponent(String(json.course_id ?? ""))}`);
  }

  async function createByCloneAction(formData: FormData) {
    "use server";
    const cookieStore = await cookies();
    const header = cookieStore.toString();
    if (!header) redirect(`/${locale}/login`);

    const source_course_id = String(formData.get("source_course_id") ?? "").trim();
    const new_code = String(formData.get("new_code") ?? "").trim() || null;

    if (!source_course_id) {
      redirect(`/${locale}/dashboard/admin/courses/new?err=missing`);
    }

    const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
    const res = await fetch(`${origin}/api/admin/courses/clone`, {
      method: "POST",
      headers: { cookie: header, "content-type": "application/json" },
      body: JSON.stringify({ source_course_id, new_code }),
    });
    if (!res.ok) {
      redirect(`/${locale}/dashboard/admin/courses/new?err=http`);
    }
    const json = (await res.json()) as { course_id?: string };
    redirect(`/${locale}/dashboard/admin/courses?ok=created&course_id=${encodeURIComponent(String(json.course_id ?? ""))}`);
  }

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>Course yarat</h1>
          <p className={styles.meta}>Sıfırdan yarat və ya mövcud course-u clone et.</p>
        </div>
        <Link className={styles.meta} href={`/${locale}/dashboard/admin/courses`}>
          {t("back")}
        </Link>
      </header>

      <div className={styles.content} style={{ display: "grid", gap: 14 }}>
        {sp.ok === "1" ? <p className={styles.alertMuted}>Course yaradıldı.</p> : null}
        {sp.err ? <p className={styles.alertMuted}>Xəta: {sp.err}</p> : null}

        <form action={createFromScratchAction} style={{ display: "grid", gap: 10, padding: 12, border: "1px solid var(--border)", borderRadius: 12 }}>
          <div className={styles.meta} style={{ fontWeight: 600 }}>
            Sıfırdan yarat
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className={styles.meta}>Code (opsional)</span>
              <input name="code" placeholder="TEST-001" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className={styles.meta}>Evaluation type id (opsional)</span>
              <input name="evaluation_type_id" placeholder="110000..." style={inputStyle} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className={styles.meta}>Education plan subject id (opsional)</span>
              <input name="education_plan_subject_id" placeholder="12345" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className={styles.meta}>Education year id (opsional)</span>
              <input name="education_year_id" placeholder="2026..." style={inputStyle} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className={styles.meta}>M (lecture) hours</span>
              <input name="m_hours" type="number" min={0} defaultValue={15} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className={styles.meta}>S (seminar) hours</span>
              <input name="s_hours" type="number" min={0} defaultValue={15} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className={styles.meta}>L (lab) hours</span>
              <input name="l_hours" type="number" min={0} defaultValue={0} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className={styles.meta}>FM hours</span>
              <input name="fm_hours" type="number" min={0} defaultValue={0} style={inputStyle} />
            </label>
          </div>

          <button type="submit" style={buttonStyle}>
            Course yarat (create)
          </button>
        </form>

        <form action={createByCloneAction} style={{ display: "grid", gap: 10, padding: 12, border: "1px solid var(--border)", borderRadius: 12 }}>
          <div className={styles.meta} style={{ fontWeight: 600 }}>
            Clone (köhnə course-dan)
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <span className={styles.meta}>Source course</span>
            <select name="source_course_id" defaultValue="" style={inputStyle}>
              <option value="">— seç —</option>
              {courses.map((c) => (
                <option key={c.course_id} value={c.course_id}>
                  {c.subject_name_az ?? c.course_code ?? c.course_id}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className={styles.meta}>New code (opsional)</span>
            <input name="new_code" placeholder="TEST-001" style={inputStyle} />
          </label>

          <button type="submit" style={buttonStyle}>
            Course yarat (clone)
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  cursor: "pointer",
};


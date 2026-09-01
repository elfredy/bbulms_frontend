import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import formStyles from "@/components/admin/AdminForm.module.css";
import { adminListCourses, getMe } from "@/lib/api";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ ok?: string; err?: string }>;
};

export default async function AdminCourseCreatePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
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
    <div className={formStyles.pageWrap} style={{ flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div className={`${formStyles.panel} ${formStyles.panelWide}`}>
        <header className={formStyles.panelHead}>
          <div>
            <h1 className={formStyles.panelTitle}>Dərs cədvəli əlavə et</h1>
            <p className={formStyles.panelHint}>Sıfırdan yaradın və ya mövcud dərs cədvəlini köçürün.</p>
          </div>
          <Link href={`/${locale}/dashboard/admin/courses`} className={formStyles.close} aria-label="Bağla">
            ×
          </Link>
        </header>
        <div className={formStyles.panelBody}>
          {sp.ok === "1" ? <p className={formStyles.hint}>Dərs cədvəli yaradıldı.</p> : null}
          {sp.err ? <p className={formStyles.error}>Xəta: {sp.err}</p> : null}
          <form action={createFromScratchAction} className={formStyles.form}>
            <section className={formStyles.group}>
              <h2 className={formStyles.groupTitle}>Sıfırdan yarat</h2>
              <div className={formStyles.grid2}>
                <label className={formStyles.field}>
                  <span className={formStyles.label}>Kod</span>
                  <input name="code" placeholder="TEST-001" className={formStyles.input} />
                </label>
                <label className={formStyles.field}>
                  <span className={formStyles.label}>Qiymətləndirmə tipi ID</span>
                  <input name="evaluation_type_id" placeholder="110000..." className={formStyles.input} />
                </label>
                <label className={formStyles.field}>
                  <span className={formStyles.label}>Tədris planı fənn ID</span>
                  <input name="education_plan_subject_id" placeholder="12345" className={formStyles.input} />
                </label>
                <label className={formStyles.field}>
                  <span className={formStyles.label}>Tədris ili ID</span>
                  <input name="education_year_id" placeholder="2026..." className={formStyles.input} />
                </label>
                <label className={formStyles.field}>
                  <span className={formStyles.label}>Mühazirə saatı</span>
                  <input name="m_hours" type="number" min={0} defaultValue={15} className={formStyles.input} />
                </label>
                <label className={formStyles.field}>
                  <span className={formStyles.label}>Seminar saatı</span>
                  <input name="s_hours" type="number" min={0} defaultValue={15} className={formStyles.input} />
                </label>
                <label className={formStyles.field}>
                  <span className={formStyles.label}>Laboratoriya saatı</span>
                  <input name="l_hours" type="number" min={0} defaultValue={0} className={formStyles.input} />
                </label>
                <label className={formStyles.field}>
                  <span className={formStyles.label}>FM saatı</span>
                  <input name="fm_hours" type="number" min={0} defaultValue={0} className={formStyles.input} />
                </label>
              </div>
            </section>
            <div className={formStyles.actions}>
              <button type="submit" className={formStyles.submit}>
                Əlavə et
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={`${formStyles.panel} ${formStyles.panelWide}`}>
        <header className={formStyles.panelHead}>
          <div>
            <h1 className={formStyles.panelTitle}>Mövcud cədvəldən köçür</h1>
            <p className={formStyles.panelHint}>Köhnə dərs cədvəlini klonlayın.</p>
          </div>
        </header>
        <div className={formStyles.panelBody}>
          <form action={createByCloneAction} className={formStyles.form}>
            <section className={formStyles.group}>
              <div className={formStyles.grid1}>
                <label className={formStyles.field}>
                  <span className={formStyles.label}>Mənbə dərs cədvəli</span>
                  <select name="source_course_id" defaultValue="" className={formStyles.select}>
                    <option value="">— seç —</option>
                    {courses.map((c) => (
                      <option key={c.course_id} value={c.course_id}>
                        {c.subject_name_az ?? c.course_code ?? c.course_id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={formStyles.field}>
                  <span className={formStyles.label}>Yeni kod</span>
                  <input name="new_code" placeholder="TEST-001" className={formStyles.input} />
                </label>
              </div>
            </section>
            <div className={formStyles.actions}>
              <button type="submit" className={formStyles.submit}>
                Əlavə et
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

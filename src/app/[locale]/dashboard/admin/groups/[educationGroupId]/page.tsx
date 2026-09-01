import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { adminListCourses, adminListTeachers, adminGetGroupDetail, getMe } from "@/lib/api";

import styles from "../../../dashboard.module.css";

type Props = {
  params: Promise<{ locale: string; educationGroupId: string }>;
  searchParams?: Promise<{
    course_id?: string;
    teacher_id?: string;
    course_q?: string;
    teacher_q?: string;
    ok?: string;
    created?: string;
    skipped?: string;
    err?: string;
  }>;
};

export default async function AdminGroupDetailPage({ params, searchParams }: Props) {
  const { locale, educationGroupId } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations("admin");

  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);
  if (!me.is_superadmin) redirect(`/${locale}/dashboard`);

  const data = await adminGetGroupDetail(educationGroupId);
  if (!data) {
    return (
      <div className={styles.page}>
        <header className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>{t("groupDetail")}</h1>
            <p className={styles.meta}>{t("loadError")}</p>
          </div>
          <Link className={styles.meta} href={`/${locale}/dashboard/admin/groups`}>
            {t("back")}
          </Link>
        </header>
      </div>
    );
  }

  const g = data.group as any;
  const name = g.education_group_name ?? g.education_group_id ?? educationGroupId;

  const current = data.courses.filter((c) => c.bucket === "current");
  const past = data.courses.filter((c) => c.bucket === "past");
  const future = data.courses.filter((c) => c.bucket === "future");

  const selectedCourseId = (sp.course_id ?? "").trim() || null;
  const selectedTeacherId = (sp.teacher_id ?? "").trim() || null;
  const courseQ = (sp.course_q ?? "").trim() || null;
  const teacherQ = (sp.teacher_q ?? "").trim() || null;

  const allCourses = (await adminListCourses(courseQ, null, null, 200, 0))?.items ?? [];
  const selectedCourseIsInGroup = selectedCourseId ? data.courses.some((c) => String(c.course_id) === String(selectedCourseId)) : false;

  const teachers = (await adminListTeachers(teacherQ, 200, 0))?.items ?? [];

  async function assignCourseToThisGroupAction(formData: FormData) {
    "use server";
    const cookieStore = await cookies();
    const header = cookieStore.toString();
    if (!header) redirect(`/${locale}/login`);

    const courseId = String(formData.get("course_id") ?? "").trim();
    if (!courseId) redirect(`/${locale}/dashboard/admin/groups/${educationGroupId}?err=course`);

    const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
    const res = await fetch(`${origin}/api/admin/courses/${encodeURIComponent(courseId)}/assign-group`, {
      method: "POST",
      headers: { cookie: header, "content-type": "application/json" },
      body: JSON.stringify({ education_group_id: educationGroupId }),
    });
    if (!res.ok) redirect(`/${locale}/dashboard/admin/groups/${educationGroupId}?course_id=${encodeURIComponent(courseId)}&err=assign_group`);
    redirect(`/${locale}/dashboard/admin/groups/${educationGroupId}?course_id=${encodeURIComponent(courseId)}&ok=assigned`);
  }

  async function assignTeacherToCourseAction(formData: FormData) {
    "use server";
    const cookieStore = await cookies();
    const header = cookieStore.toString();
    if (!header) redirect(`/${locale}/login`);

    const courseId = String(formData.get("course_id") ?? "").trim();
    const teacherId = String(formData.get("teacher_id") ?? "").trim();
    const lessonTypeId = String(formData.get("lesson_type_id") ?? "").trim();
    if (!courseId || !teacherId || !lessonTypeId) {
      redirect(`/${locale}/dashboard/admin/groups/${educationGroupId}?course_id=${encodeURIComponent(courseId)}&teacher_id=${encodeURIComponent(teacherId)}&err=assign_teacher_missing`);
    }

    const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
    const res = await fetch(`${origin}/api/admin/courses/${encodeURIComponent(courseId)}/assign-teacher`, {
      method: "POST",
      headers: { cookie: header, "content-type": "application/json" },
      body: JSON.stringify({ teacher_id: teacherId, lesson_type_id: lessonTypeId }),
    });
    if (!res.ok) {
      redirect(`/${locale}/dashboard/admin/groups/${educationGroupId}?course_id=${encodeURIComponent(courseId)}&teacher_id=${encodeURIComponent(teacherId)}&err=assign_teacher`);
    }
    redirect(
      `/${locale}/dashboard/admin/groups/${educationGroupId}?course_id=${encodeURIComponent(courseId)}&teacher_id=${encodeURIComponent(
        teacherId
      )}&ok=teacher_assigned`
    );
  }

  async function bulkGenerateAction(formData: FormData) {
    "use server";
    const cookieStore = await cookies();
    const header = cookieStore.toString();
    if (!header) redirect(`/${locale}/login`);

    const courseId = String(formData.get("course_id") ?? "").trim();
    if (!courseId) redirect(`/${locale}/dashboard/admin/groups/${educationGroupId}?err=course`);

    const from_date = String(formData.get("from_date") ?? "").trim();
    const to_date = String(formData.get("to_date") ?? "").trim();
    const course_hours = Number(formData.get("course_hours") ?? 30);
    const shift = Number(formData.get("shift") ?? 1);

    const teacher_id = String(formData.get("teacher_id") ?? "").trim();
    if (!teacher_id) {
      redirect(`/${locale}/dashboard/admin/groups/${educationGroupId}?course_id=${encodeURIComponent(courseId)}&err=teacher_required`);
    }

    const upper_week = {
      lecture: Number(formData.get("upper_lecture") ?? 0),
      seminar: Number(formData.get("upper_seminar") ?? 0),
      lab: Number(formData.get("upper_lab") ?? 0),
    };
    const lower_week = {
      lecture: Number(formData.get("lower_lecture") ?? 0),
      seminar: Number(formData.get("lower_seminar") ?? 0),
      lab: Number(formData.get("lower_lab") ?? 0),
    };

    const skip_existing = formData.get("skip_existing") === "on";

    const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
    const res = await fetch(`${origin}/api/admin/courses/${encodeURIComponent(courseId)}/meetings/bulk`, {
      method: "POST",
      headers: { cookie: header, "content-type": "application/json" },
      body: JSON.stringify({
        from_date,
        to_date,
        course_hours,
        shift,
        education_group_id: educationGroupId,
        teacher_id,
        lesson_type_ids: { lecture: "110000111", seminar: "110000112", lab: "110000113" },
        upper_week,
        lower_week,
        skip_existing,
      }),
    });

    if (!res.ok) {
      let detail = "http";
      try {
        const j = (await res.json()) as any;
        if (j && typeof j.detail === "string") detail = j.detail;
      } catch {
        // ignore
      }
      redirect(
        `/${locale}/dashboard/admin/groups/${educationGroupId}?course_id=${encodeURIComponent(courseId)}&teacher_id=${encodeURIComponent(
          selectedTeacherId ?? ""
        )}&err=${encodeURIComponent(detail)}`
      );
    }
    const json = (await res.json()) as { created_count?: number; skipped_count?: number };
    redirect(
      `/${locale}/dashboard/admin/groups/${educationGroupId}?course_id=${encodeURIComponent(courseId)}&teacher_id=${encodeURIComponent(
        selectedTeacherId ?? ""
      )}&ok=1&created=${encodeURIComponent(String(json.created_count ?? 0))}&skipped=${encodeURIComponent(
        String(json.skipped_count ?? 0)
      )}`
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{name}</h1>
          <p className={styles.meta}>
            {[g.education_year_name, g.education_type_az, g.education_lang_az].filter(Boolean).join(" · ") || "\u00a0"}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/${locale}/dashboard/admin/groups/${educationGroupId}/edit`} className={styles.actionLink}>
            Qrupu yenilə
          </Link>
          <Link className={styles.meta} href={`/${locale}/dashboard/admin/groups`}>
            {t("back")}
          </Link>
        </div>
      </header>

      <div className={styles.content} style={{ display: "grid", gap: 18 }}>
        <section>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Timetable yarat</h2>
          <p className={styles.meta} style={{ marginTop: 0 }}>
            Kurs seç → müəllim assign et → semestr aralığında üst/alt həftə qaydasına görə avtomatik meeting-lər yaransın.
          </p>

          {sp.ok === "1" ? (
            <p className={styles.alertMuted}>
              Yaradıldı: {sp.created ?? "0"} · Keçildi (mövcud idi): {sp.skipped ?? "0"}
            </p>
          ) : null}
          {sp.ok === "assigned" ? <p className={styles.alertMuted}>Course qrupa assign edildi.</p> : null}
          {sp.ok === "teacher_assigned" ? <p className={styles.alertMuted}>Müəllim course-a assign edildi.</p> : null}
          {sp.err ? <p className={styles.alertMuted}>Xəta: {sp.err}</p> : null}

          <form method="GET" style={{ display: "grid", gap: 10, padding: 12, border: "1px solid var(--border)", borderRadius: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className={styles.meta}>Course axtar</span>
              <input name="course_q" defaultValue={courseQ ?? ""} placeholder="məs: Test-001" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className={styles.meta}>Müəllim axtar</span>
              <input name="teacher_q" defaultValue={teacherQ ?? ""} placeholder="məs: Nəcəfov Fərid" style={inputStyle} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span className={styles.meta}>Course</span>
                <select name="course_id" defaultValue={selectedCourseId ?? ""} style={inputStyle}>
                  <option value="">— seç —</option>
                  {allCourses.map((c) => (
                    <option key={c.course_id} value={c.course_id}>
                      {c.subject_name_az ?? c.course_code ?? c.course_id}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className={styles.meta}>Müəllim</span>
                <select name="teacher_id" defaultValue={selectedTeacherId ?? ""} style={inputStyle}>
                  <option value="">— seç —</option>
                  {teachers.map((tt) => (
                    <option key={tt.teacher_id} value={tt.teacher_id}>
                      {tt.teacher_fullname ?? tt.teacher_id}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="submit" style={buttonStyle}>
              Seçimi tətbiq et
            </button>
          </form>

          <form action={bulkGenerateAction} style={{ marginTop: 12, display: "grid", gap: 10, padding: 12, border: "1px solid var(--border)", borderRadius: 12 }}>
            <input type="hidden" name="course_id" value={selectedCourseId ?? ""} />
            <input type="hidden" name="teacher_id" value={selectedTeacherId ?? ""} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span className={styles.meta}>Course saatı</span>
                <select name="course_hours" defaultValue="60" style={inputStyle}>
                  {[30, 45, 60, 75, 90].map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className={styles.meta}>Növbə</span>
                <select name="shift" defaultValue="1" style={inputStyle}>
                  <option value="1">1-ci növbə (08:30/10:00/11:35)</option>
                  <option value="2">2-ci növbə (13:25/14:55/16:25)</option>
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span className={styles.meta}>From</span>
                <input name="from_date" defaultValue="2026-09-15" placeholder="YYYY-MM-DD" style={inputStyle} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className={styles.meta}>To</span>
                <input name="to_date" defaultValue="2026-12-31" placeholder="YYYY-MM-DD" style={inputStyle} />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <fieldset style={fieldsetStyle}>
                <legend className={styles.meta} style={{ padding: "0 6px" }}>
                  Üst həftə (lecture/seminar/lab)
                </legend>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <input name="upper_lecture" type="number" min={0} max={3} defaultValue={1} style={inputStyle} />
                  <input name="upper_seminar" type="number" min={0} max={3} defaultValue={1} style={inputStyle} />
                  <input name="upper_lab" type="number" min={0} max={3} defaultValue={0} style={inputStyle} />
                </div>
              </fieldset>
              <fieldset style={fieldsetStyle}>
                <legend className={styles.meta} style={{ padding: "0 6px" }}>
                  Alt həftə (lecture/seminar/lab)
                </legend>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <input name="lower_lecture" type="number" min={0} max={3} defaultValue={1} style={inputStyle} />
                  <input name="lower_seminar" type="number" min={0} max={3} defaultValue={0} style={inputStyle} />
                  <input name="lower_lab" type="number" min={0} max={3} defaultValue={0} style={inputStyle} />
                </div>
              </fieldset>
            </div>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input name="skip_existing" type="checkbox" defaultChecked />
              <span className={styles.meta}>Mövcud olanları keç (skip)</span>
            </label>

            <button type="submit" style={buttonStyle} disabled={!selectedCourseId}>
              Bulk generate
            </button>
            <div className={styles.meta}>
              Qeyd: Generate zamanı course avtomatik bu qrupa bağlanır və lecture/seminar/lab üçün course_teacher yaradılır. Sonra müəllimin dashboardında görünəcək.
            </div>
          </form>
        </section>

        <section>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{t("students")}</h2>
          {data.students.length === 0 ? (
            <p className={styles.alertMuted}>{t("emptyStudents")}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, columns: 2, columnGap: 24 }}>
              {data.students.map((s) => (
                <li key={s.student_id}>{s.student_fullname ?? s.student_id}</li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{t("courses")}</h2>

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div className={styles.meta} style={{ fontWeight: 600 }}>
                {t("current")}
              </div>
              {current.length === 0 ? <div className={styles.meta}>—</div> : <CourseList items={current} />}
            </div>
            <div>
              <div className={styles.meta} style={{ fontWeight: 600 }}>
                {t("past")}
              </div>
              {past.length === 0 ? <div className={styles.meta}>—</div> : <CourseList items={past} />}
            </div>
            <div>
              <div className={styles.meta} style={{ fontWeight: 600 }}>
                {t("future")}
              </div>
              {future.length === 0 ? <div className={styles.meta}>—</div> : <CourseList items={future} />}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function CourseList({
  items,
}: {
  items: { course_id: string; subject_name_az: string | null; education_year_name: string | null; evaluation_type_id: string | null }[];
}) {
  return (
    <ul style={{ margin: "6px 0 0", paddingLeft: 18, display: "grid", gap: 6 }}>
      {items.map((c) => (
        <li key={c.course_id}>
          {(c.subject_name_az ?? c.course_id) + (c.education_year_name ? ` · ${c.education_year_name}` : "")}
          {c.evaluation_type_id ? <span style={{ color: "var(--muted)" }}>{` · ${c.evaluation_type_id}`}</span> : null}
        </li>
      ))}
    </ul>
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

const fieldsetStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 10,
};


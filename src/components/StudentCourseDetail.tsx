import type { StudentCourseDetail as Detail, StudentCourseLesson } from "@/lib/api";

import styles from "./StudentCourseDetail.module.css";

function show(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const s = String(value).trim();
  return s || "—";
}

function fmtDate(value: string | null | undefined): string {
  const s = String(value ?? "").trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;
  return s || "—";
}

function fmtClock(start: string | null | undefined, end: string | null | undefined): string {
  const a = String(start ?? "").trim();
  const b = String(end ?? "").trim();
  if (a && b) return `${a}–${b}`;
  return a || b || "—";
}

function isQb(value: string | null | undefined): boolean {
  const s = String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
  return s === "q.b" || s === "qb";
}

function Mark({ value }: { value: string | null }) {
  const text = String(value ?? "").trim();
  if (!text) return <span className={styles.dash}>—</span>;
  if (isQb(text)) return <span className={styles.qb}>{text}</span>;
  return <span className={styles.mark}>{text}</span>;
}

function lessonKey(lesson: StudentCourseLesson): string {
  return lesson.course_meeting_id;
}

export function StudentCourseDetailView({ data, locale }: { data: Detail; locale: string }) {
  const meta = [data.education_year_name, data.semester_name_az, data.education_group_name, data.course_code]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);

  const facts: { label: string; value: string }[] = [
    { label: "Kredit", value: show(data.credit) },
    { label: "Mühazirə saatı", value: show(data.m_hours) },
    { label: "Seminar saatı", value: show(data.s_hours) },
    { label: "Laboratoriya saatı", value: show(data.l_hours) },
    { label: "Fərdi məşğələ", value: show(data.fm_hours) },
    { label: "Auditoriya saatı", value: show(data.in_hours) },
    { label: "q.b sayı", value: String(data.qb_count) },
  ];

  const official = [
    { label: "İmtahana qədərki bal", value: data.before_point },
    { label: "İmtahan balı", value: data.exam_point },
    { label: "Yekun bal", value: data.end_point },
  ].filter((item) => String(item.value ?? "").trim());

  return (
    <div className={styles.page}>
      <a className={styles.back} href={`/${locale}/dashboard`}>
        Fənlərə qayıt
      </a>

      <header className={styles.header}>
        <h1 className={styles.title}>{data.subject_name_az?.trim() || "Fənn"}</h1>
        {meta.length ? <p className={styles.meta}>{meta.join(" · ")}</p> : null}
        {data.teachers.length ? (
          <ul className={styles.teachers}>
            {data.teachers.map((t, i) => (
              <li key={`${t.lesson_type_az ?? ""}-${t.fullname ?? ""}-${i}`}>
                {[t.lesson_type_az, t.fullname].filter(Boolean).join(" — ")}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <section className={styles.facts} aria-label="Saatlar və kredit">
        {facts.map((fact) => (
          <div key={fact.label} className={styles.fact}>
            <p className={styles.factValue}>{fact.value}</p>
            <p className={styles.factLabel}>{fact.label}</p>
          </div>
        ))}
      </section>

      {data.scores.length || official.length ? (
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>Qiymətlər</h2>
          <div className={styles.scores}>
            {data.scores.map((score) => (
              <div key={`${score.code ?? ""}-${score.name_az ?? ""}`} className={styles.score}>
                <span className={styles.scoreName}>{score.name_az || score.code || "Bal"}</span>
                <span className={styles.scorePoint}>{score.point}</span>
              </div>
            ))}
            {official.map((item) => (
              <div key={item.label} className={styles.score}>
                <span className={styles.scoreName}>{item.label}</span>
                <span className={styles.scorePoint}>{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>Dərslər</h2>
        <p className={styles.hint}>Hər sətir bazadakı dərs saatı, yazılan qiymət və q.b qeydidir.</p>
        {data.lessons.length === 0 ? (
          <p className={styles.empty}>Bu fənn üzrə dərs yazılmayıb.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tarix</th>
                  <th>Saat</th>
                  <th>Növ</th>
                  <th>Müəllim</th>
                  <th>Auditoriya</th>
                  <th>Davamiyyət</th>
                  <th>Qiymət</th>
                </tr>
              </thead>
              <tbody>
                {data.lessons.map((lesson) => (
                  <tr key={lessonKey(lesson)} className={isQb(lesson.attendance) || isQb(lesson.grade) ? styles.qbRow : undefined}>
                    <td>{fmtDate(lesson.meeting_date)}</td>
                    <td className={styles.nowrap}>{fmtClock(lesson.start_time, lesson.end_time)}</td>
                    <td>{show(lesson.lesson_type_az)}</td>
                    <td>{show(lesson.teacher_fullname)}</td>
                    <td>{show(lesson.room_name)}</td>
                    <td>
                      <Mark value={lesson.attendance} />
                    </td>
                    <td>
                      <Mark value={lesson.grade} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data.exercises.length ? (
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>Kollokvium və referat</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Növ</th>
                  <th>Tarix</th>
                  <th>Bal</th>
                </tr>
              </thead>
              <tbody>
                {data.exercises.map((item) => (
                  <tr key={item.course_execises_id}>
                    <td>{show(item.type_name_az)}</td>
                    <td>{show(item.start_date)}</td>
                    <td>
                      <Mark value={item.point} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

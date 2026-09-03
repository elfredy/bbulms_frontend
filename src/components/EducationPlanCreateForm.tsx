"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SearchableSelect } from "@/components/SearchableSelect";
import type { AdminEducationPlanLookups } from "@/lib/api";

import styles from "./EducationPlanCreateForm.module.css";

type Option = { id: string; label: string };

type SubjectDraft = {
  key: string;
  subject_id: string;
  subject_label: string;
  semester_id: string;
  subject_block_id: string;
  code: string;
  m_hours: string;
  s_hours: string;
  l_hours: string;
  credit: string;
  week_charge: string;
};

type LookupItem = { id: string; name?: string | null; name_az?: string | null; education_year_name?: string | null; org_name_az?: string | null };

function emptySubject(): SubjectDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    subject_id: "",
    subject_label: "",
    semester_id: "",
    subject_block_id: "",
    code: "",
    m_hours: "15",
    s_hours: "15",
    l_hours: "0",
    credit: "5",
    week_charge: "2",
  };
}

function SearchSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  onQueryChange,
  required: _required,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (id: string, option?: Option) => void;
  placeholder?: string;
  onQueryChange?: (q: string) => void;
  required?: boolean;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <SearchableSelect
        value={value}
        options={options}
        placeholder={placeholder ?? "— seç —"}
        onChange={(id) => onChange(id, options.find((o) => o.id === id))}
        onQueryChange={onQueryChange}
        debounceMs={0}
      />
    </label>
  );
}

export function EducationPlanCreateForm({ lookups }: { lookups: AdminEducationPlanLookups }) {
  const locale = useLocale();
  const router = useRouter();

  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [educationTypeId, setEducationTypeId] = useState("");
  const [educationLevelId, setEducationLevelId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [note, setNote] = useState("");
  const [subjects, setSubjects] = useState<SubjectDraft[]>([emptySubject()]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [groupQuery, setGroupQuery] = useState("");
  const [groups, setGroups] = useState<LookupItem[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<Option[]>([]);
  const [subjectQuery, setSubjectQuery] = useState("");
  const [teachers, setTeachers] = useState<LookupItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const orgOptions: Option[] = useMemo(
    () =>
      lookups.organizations.map((o) => ({
        id: o.id,
        label: [o.faculty_name_az, o.name_az].filter(Boolean).join(" / ") || o.id,
      })),
    [lookups.organizations]
  );
  const typeOptions = lookups.education_types.map((d) => ({ id: d.id, label: d.name_az || d.id }));
  const levelOptions = lookups.education_levels.map((d) => ({ id: d.id, label: d.name_az || d.id }));
  const statusOptions = lookups.statuses.map((d) => ({ id: d.id, label: d.name_az || d.id }));
  const semesterOptions = lookups.semesters.map((d) => ({ id: d.id, label: d.name_az || d.id }));
  const blockOptions = lookups.subject_blocks.map((d) => ({ id: d.id, label: d.name_az || d.id }));

  const subjectsRef = useRef(subjects);
  subjectsRef.current = subjects;

  const loadRelated = useCallback(async (oid: string, sq?: string, gq?: string) => {
    const params = new URLSearchParams();
    if (oid) params.set("organization_id", oid);
    const qSubjects = new URLSearchParams(params);
    if (sq?.trim()) qSubjects.set("q", sq.trim());
    qSubjects.set("limit", "500");
    const qGroups = new URLSearchParams(params);
    if (gq?.trim()) qGroups.set("q", gq.trim());
    qGroups.set("limit", "500");
    const qTeachers = new URLSearchParams(params);
    qTeachers.set("limit", "300");

    const [sRes, gRes, tRes] = await Promise.all([
      fetch(`/api/admin/education-plans/lookups/subjects?${qSubjects}`, { credentials: "include", cache: "no-store" }),
      fetch(`/api/admin/education-plans/lookups/groups?${qGroups}`, { credentials: "include", cache: "no-store" }),
      fetch(`/api/admin/education-plans/lookups/teachers?${qTeachers}`, { credentials: "include", cache: "no-store" }),
    ]);
    if (sRes.ok) {
      const json = (await sRes.json()) as { items: LookupItem[] };
      const items = json.items.map((it) => ({
        id: it.id,
        label: [it.name_az, it.org_name_az].filter(Boolean).join(" · ") || it.id,
      }));
      const keepIds = new Set(subjectsRef.current.map((s) => s.subject_id).filter(Boolean));
      setSubjectOptions((prev) => {
        const extra = prev.filter((p) => keepIds.has(p.id) && !items.some((i) => i.id === p.id));
        return [...extra, ...items];
      });
    }
    if (gRes.ok) {
      const json = (await gRes.json()) as { items: LookupItem[] };
      setGroups(json.items);
    }
    if (tRes.ok) {
      const json = (await tRes.json()) as { items: LookupItem[] };
      setTeachers(json.items);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadRelated(organizationId, subjectQuery, groupQuery);
    }, 350);
    return () => window.clearTimeout(t);
  }, [subjectQuery, groupQuery, organizationId, loadRelated]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const prepared = subjects
      .filter((s) => s.subject_id && s.semester_id)
      .map((s) => ({
        subject_id: s.subject_id,
        semester_id: s.semester_id,
        subject_block_id: s.subject_block_id || null,
        code: s.code.trim() || null,
        m_hours: Number(s.m_hours || 0),
        s_hours: Number(s.s_hours || 0),
        l_hours: Number(s.l_hours || 0),
        credit: Number(s.credit || 0),
        week_charge: Number(s.week_charge || 0),
      }));

    setSaving(true);
    try {
      const res = await fetch("/api/admin/education-plans", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          organization_id: organizationId,
          education_type_id: educationTypeId,
          education_level_id: educationLevelId,
          status: statusId,
          note: note.trim() || null,
          education_group_ids: groupIds,
          subjects: prepared,
        }),
      });
      if (!res.ok) {
        let detail = "Tədris planı yaradılmadı";
        try {
          const data = await res.json();
          if (typeof data?.detail === "string") detail = data.detail;
        } catch {
          /* ignore */
        }
        setError(detail);
        return;
      }
      const json = (await res.json()) as { education_plan_id?: string };
      router.push(`/${locale}/dashboard/admin/education-plans/${encodeURIComponent(String(json.education_plan_id ?? ""))}`);
      router.refresh();
    } catch {
      setError("Serverə qoşulmaq mümkün olmadı.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Plan məlumatları (əl ilə + DB seçimi)</h2>
        <p className={styles.hint}>Ad və qeyd əl ilə yazılır. Təşkilat, forma, səviyyə və status verilənlər bazasından seçilir.</p>

        <label className={styles.field}>
          <span className={styles.label}>Planın adı</span>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required placeholder="Məs: İT 2026/2030" />
        </label>

        <SearchSelect
          label="Təşkilat / ixtisas (DB)"
          value={organizationId}
          options={orgOptions}
          required
          onChange={(id) => {
            setOrganizationId(id);
            setGroupIds([]);
          }}
        />

        <div className={styles.row3}>
          <SearchSelect label="Tədris forması (DB)" value={educationTypeId} options={typeOptions} required onChange={setEducationTypeId} />
          <SearchSelect label="Təhsil səviyyəsi (DB)" value={educationLevelId} options={levelOptions} required onChange={setEducationLevelId} />
          <SearchSelect label="Status (DB)" value={statusId} options={statusOptions} required onChange={setStatusId} />
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Qeyd (istəyə bağlı)</span>
          <textarea className={styles.textarea} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Fənnlər</h2>
        <p className={styles.hint}>Fənn adı, semestr və blok DB-dən seçilir. Axtarış 350 ms sonra işləyir. Saat, kredit və kod əl ilə daxil edilir.</p>

        {subjects.map((s, idx) => (
          <div key={s.key} className={styles.subjectCard}>
            <div className={styles.subjectHead}>
              <strong>Fənn {idx + 1}</strong>
              {subjects.length > 1 ? (
                <button
                  type="button"
                  className={styles.buttonGhost}
                  onClick={() => setSubjects((prev) => prev.filter((x) => x.key !== s.key))}
                >
                  Sil
                </button>
              ) : null}
            </div>
            <SearchSelect
              label="Fənn adı (DB)"
              value={s.subject_id}
              options={subjectOptions}
              onQueryChange={setSubjectQuery}
              onChange={(id, opt) =>
                setSubjects((prev) => prev.map((x) => (x.key === s.key ? { ...x, subject_id: id, subject_label: opt?.label ?? "" } : x)))
              }
            />
            <div className={styles.row}>
              <SearchSelect
                label="Semestr (DB)"
                value={s.semester_id}
                options={semesterOptions}
                onChange={(id) => setSubjects((prev) => prev.map((x) => (x.key === s.key ? { ...x, semester_id: id } : x)))}
              />
              <SearchSelect
                label="Fənn bloku (DB, istəyə bağlı)"
                value={s.subject_block_id}
                options={blockOptions}
                onChange={(id) => setSubjects((prev) => prev.map((x) => (x.key === s.key ? { ...x, subject_block_id: id } : x)))}
              />
            </div>
            <div className={styles.row4}>
              <label className={styles.field}>
                <span className={styles.label}>Mühazirə saatı</span>
                <input className={styles.input} type="number" min={0} value={s.m_hours} onChange={(e) => setSubjects((prev) => prev.map((x) => (x.key === s.key ? { ...x, m_hours: e.target.value } : x)))} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Seminar saatı</span>
                <input className={styles.input} type="number" min={0} value={s.s_hours} onChange={(e) => setSubjects((prev) => prev.map((x) => (x.key === s.key ? { ...x, s_hours: e.target.value } : x)))} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Lab saatı</span>
                <input className={styles.input} type="number" min={0} value={s.l_hours} onChange={(e) => setSubjects((prev) => prev.map((x) => (x.key === s.key ? { ...x, l_hours: e.target.value } : x)))} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Kredit</span>
                <input className={styles.input} type="number" min={0} value={s.credit} onChange={(e) => setSubjects((prev) => prev.map((x) => (x.key === s.key ? { ...x, credit: e.target.value } : x)))} />
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>Həftəlik yük</span>
                <input className={styles.input} type="number" min={0} value={s.week_charge} onChange={(e) => setSubjects((prev) => prev.map((x) => (x.key === s.key ? { ...x, week_charge: e.target.value } : x)))} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Fənn kodu (istəyə bağlı)</span>
                <input className={styles.input} value={s.code} onChange={(e) => setSubjects((prev) => prev.map((x) => (x.key === s.key ? { ...x, code: e.target.value } : x)))} />
              </label>
            </div>
          </div>
        ))}

        <div className={styles.actions}>
          <button type="button" className={styles.buttonGhost} onClick={() => setSubjects((prev) => [...prev, emptySubject()])}>
            Fənn əlavə et
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Qruplar (DB)</h2>
        <p className={styles.hint}>Tədris planına bağlanacaq təhsil qrupları. Təşkilat seçiləndə siyahı daralır.</p>
        <label className={styles.field}>
          <span className={styles.label}>Qrup axtarışı</span>
          <input className={styles.input} value={groupQuery} onChange={(e) => setGroupQuery(e.target.value)} placeholder="Qrup adı…" />
        </label>
        <div className={styles.checkList}>
          {groups.length === 0 ? (
            <span className={styles.hint}>Qrup tapılmadı.</span>
          ) : (
            groups.map((g) => (
              <label key={g.id} className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={groupIds.includes(g.id)}
                  onChange={(e) => {
                    setGroupIds((prev) => (e.target.checked ? [...prev, g.id] : prev.filter((id) => id !== g.id)));
                  }}
                />
                <span>
                  {g.name ?? g.id}
                  {g.education_year_name ? ` · ${g.education_year_name}` : ""}
                </span>
              </label>
            ))
          )}
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Müəllimlər (DB, məlumat)</h2>
        <p className={styles.hint}>Müəllim tədris planına yazılmır; course yaradılanda təyin olunur. Seçilmiş təşkilatın müəllimləri:</p>
        {teachers.length === 0 ? (
          <p className={styles.hint}>Müəllim tapılmadı.</p>
        ) : (
          <ul className={styles.teacherList}>
            {teachers.map((t) => (
              <li key={t.id}>{[t.name, t.org_name_az].filter(Boolean).join(" · ")}</li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button className={styles.button} type="submit" disabled={saving}>
          {saving ? "Yaradılır…" : "Tədris planını yarat"}
        </button>
      </div>
    </form>
  );
}

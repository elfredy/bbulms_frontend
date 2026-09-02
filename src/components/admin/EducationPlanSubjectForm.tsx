"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminFormFrame, Field, FieldGroup, SearchSelect, SelectInput, TextInput, useAdminSave } from "./form-shared";

import type { AdminEducationPlanLookups, AdminEducationPlanSubjectItem } from "@/lib/api";

type Opt = { id: string; name_az?: string | null; org_name_az?: string | null };

function num(v: number | null | undefined, fallback = "0") {
  return v == null ? fallback : String(v);
}

export function EducationPlanSubjectForm({
  locale,
  planId,
  organizationId,
  lookups,
  initial,
  defaultSemesterId,
}: {
  locale: string;
  planId: string;
  organizationId?: string | null;
  lookups: AdminEducationPlanLookups;
  initial?: AdminEducationPlanSubjectItem | null;
  defaultSemesterId?: string | null;
}) {
  const back = `/${locale}/dashboard/admin/education-plans/${planId}`;
  const { error, saving, save } = useAdminSave(back);
  const [subjectId, setSubjectId] = useState(initial?.subject_id ?? "");
  const [subjectOptions, setSubjectOptions] = useState<{ id: string; label: string }[]>(
    initial?.subject_id
      ? [{ id: initial.subject_id, label: initial.subject_name_az || initial.subject_id }]
      : [],
  );
  const [subjectQuery, setSubjectQuery] = useState("");
  const [semesterId, setSemesterId] = useState(initial?.semester_id || defaultSemesterId || "");
  const [blockId, setBlockId] = useState(initial?.subject_block_id || "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [mHours, setMHours] = useState(num(initial?.m_hours, "15"));
  const [sHours, setSHours] = useState(num(initial?.s_hours, "15"));
  const [lHours, setLHours] = useState(num(initial?.l_hours, "0"));
  const [fmHours, setFmHours] = useState(num(initial?.fm_hours, "0"));
  const [credit, setCredit] = useState(num(initial?.credit, "5"));
  const [weekCharge, setWeekCharge] = useState(num(initial?.week_charge, "2"));
  const [courseWork, setCourseWork] = useState(Boolean(initial?.course_work));

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams({ limit: "80" });
    if (organizationId) params.set("organization_id", organizationId);
    if (subjectQuery.trim()) params.set("q", subjectQuery.trim());
    fetch(`/api/admin/education-plans/lookups/subjects?${params}`, {
      credentials: "include",
      cache: "no-store",
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items?: Opt[] }) => {
        const items = (d.items ?? []).map((it) => ({
          id: it.id,
          label: [it.name_az, it.org_name_az].filter(Boolean).join(" · ") || it.id,
        }));
        setSubjectOptions((prev) => {
          if (subjectId && !items.some((x) => x.id === subjectId)) {
            const keep = prev.find((x) => x.id === subjectId);
            return keep ? [keep, ...items] : items;
          }
          return items;
        });
      })
      .catch(() => {
        /* ignore abort */
      });
    return () => ctrl.abort();
  }, [organizationId, subjectQuery, subjectId]);

  const semesterOptions = useMemo(
    () => lookups.semesters.map((d) => ({ id: d.id, label: d.name_az || d.id })),
    [lookups.semesters],
  );
  const blockOptions = useMemo(
    () => lookups.subject_blocks.map((d) => ({ id: d.id, label: d.name_az || d.id })),
    [lookups.subject_blocks],
  );

  return (
    <AdminFormFrame
      error={error}
      saving={saving}
      submitLabel={initial ? "Yenilə" : "Əlavə et"}
      onSubmit={() =>
        save(
          initial
            ? `/api/admin/education-plans/${planId}/subjects/${initial.id}`
            : `/api/admin/education-plans/${planId}/subjects`,
          initial ? "PUT" : "POST",
          {
            subject_id: subjectId,
            semester_id: semesterId,
            subject_block_id: blockId || null,
            code: code.trim() || null,
            m_hours: Number(mHours || 0),
            s_hours: Number(sHours || 0),
            l_hours: Number(lHours || 0),
            fm_hours: Number(fmHours || 0),
            credit: Number(credit || 0),
            week_charge: Number(weekCharge || 0),
            course_work: courseWork ? 1 : 0,
          },
        )
      }
    >
      <FieldGroup title="Fənn">
        <Field label="Fənn axtarışı" span2>
          <TextInput value={subjectQuery} onChange={(e) => setSubjectQuery(e.target.value)} placeholder="Fənn adı…" />
        </Field>
        <Field label="Fənn adı" required span2>
          <SearchSelect value={subjectId} onChange={setSubjectId} options={subjectOptions} />
        </Field>
        <Field label="Semestr" required>
          <SelectInput value={semesterId} onChange={setSemesterId} required options={semesterOptions} />
        </Field>
        <Field label="Fənn bloku">
          <SelectInput value={blockId} onChange={setBlockId} options={blockOptions} />
        </Field>
        <Field label="Fənn kodu">
          <TextInput value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field label="Kredit">
          <TextInput type="number" min={0} value={credit} onChange={(e) => setCredit(e.target.value)} />
        </Field>
        <Field label="Mühazirə saatı">
          <TextInput type="number" min={0} value={mHours} onChange={(e) => setMHours(e.target.value)} />
        </Field>
        <Field label="Seminar saatı">
          <TextInput type="number" min={0} value={sHours} onChange={(e) => setSHours(e.target.value)} />
        </Field>
        <Field label="Laboratoriya saatı">
          <TextInput type="number" min={0} value={lHours} onChange={(e) => setLHours(e.target.value)} />
        </Field>
        <Field label="FM saatı">
          <TextInput type="number" min={0} value={fmHours} onChange={(e) => setFmHours(e.target.value)} />
        </Field>
        <Field label="Həftəlik yük">
          <TextInput type="number" min={0} value={weekCharge} onChange={(e) => setWeekCharge(e.target.value)} />
        </Field>
        <Field label="Kurs işi">
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 40 }}>
            <input type="checkbox" checked={courseWork} onChange={(e) => setCourseWork(e.target.checked)} />
            Var
          </label>
        </Field>
      </FieldGroup>
    </AdminFormFrame>
  );
}

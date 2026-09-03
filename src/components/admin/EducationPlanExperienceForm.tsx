"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminFormFrame, Field, FieldGroup, SearchSelect, SelectInput, TextInput, useAdminSave } from "./form-shared";

import type { AdminEducationPlanLookups, AdminEducationPlanSubjectItem } from "@/lib/api";

export function EducationPlanExperienceForm({
  locale,
  planId,
  lookups,
  initial,
  defaultSemesterId,
}: {
  locale: string;
  planId: string;
  lookups: AdminEducationPlanLookups;
  initial?: AdminEducationPlanSubjectItem | null;
  defaultSemesterId?: string | null;
}) {
  const back = `/${locale}/dashboard/admin/education-plans/${planId}`;
  const { error, saving, save } = useAdminSave(back);
  const [experienceId, setExperienceId] = useState(initial?.subject_id ?? "");
  const [options, setOptions] = useState<{ id: string; label: string }[]>(
    initial?.subject_id ? [{ id: initial.subject_id, label: initial.subject_name_az || initial.subject_id }] : [],
  );
  const [q, setQ] = useState("");
  const [semesterId, setSemesterId] = useState(initial?.semester_id || defaultSemesterId || "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [credit, setCredit] = useState(String(initial?.credit ?? "0"));

  useEffect(() => {
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      const params = new URLSearchParams({ limit: "500" });
      if (q.trim()) params.set("q", q.trim());
      fetch(`/api/admin/education-plans/lookups/experiences?${params}`, {
        credentials: "include",
        cache: "no-store",
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d: { items?: { id: string; name_az?: string | null; code?: string | null }[] }) => {
          const items = (d.items ?? []).map((it) => ({
            id: it.id,
            label: [it.name_az, it.code].filter(Boolean).join(" · ") || it.id,
          }));
          setOptions((prev) => {
            if (experienceId && !items.some((x) => x.id === experienceId)) {
              const keep = prev.find((x) => x.id === experienceId);
              return keep ? [keep, ...items] : items;
            }
            return items;
          });
        })
        .catch(() => {
          /* ignore */
        });
    }, 350);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [q, experienceId]);

  const semesterOptions = useMemo(
    () => lookups.semesters.map((d) => ({ id: d.id, label: d.name_az || d.id })),
    [lookups.semesters],
  );

  return (
    <AdminFormFrame
      error={error}
      saving={saving}
      submitLabel={initial ? "Yenilə" : "Əlavə et"}
      onSubmit={() =>
        save(
          initial
            ? `/api/admin/education-plans/${planId}/experiences/${initial.id}`
            : `/api/admin/education-plans/${planId}/experiences`,
          initial ? "PUT" : "POST",
          {
            experience_id: experienceId,
            semester_id: semesterId,
            code: code.trim() || null,
            credit: Number(credit || 0),
          },
        )
      }
    >
      <FieldGroup title="Təcrübə">
        <Field label="Təcrübə" required span2>
          <SearchSelect value={experienceId} onChange={setExperienceId} options={options} onQueryChange={setQ} debounceMs={350} />
        </Field>
        <Field label="Semestr" required>
          <SelectInput value={semesterId} onChange={setSemesterId} required options={semesterOptions} />
        </Field>
        <Field label="Kod">
          <TextInput value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field label="Kredit">
          <TextInput type="number" min={0} value={credit} onChange={(e) => setCredit(e.target.value)} />
        </Field>
      </FieldGroup>
    </AdminFormFrame>
  );
}

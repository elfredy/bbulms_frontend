"use client";

import { useMemo, useState } from "react";

import { AdminFormFrame, Field, FieldGroup, SelectInput, TextInput, useAdminSave } from "./form-shared";

import type { AdminEducationPlanLookups, AdminEducationPlanSubjectItem } from "@/lib/api";

export function EducationPlanThesisForm({
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
  const [semesterId, setSemesterId] = useState(initial?.semester_id || defaultSemesterId || "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [credit, setCredit] = useState(String(initial?.credit ?? "0"));

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
            ? `/api/admin/education-plans/${planId}/theses/${initial.id}`
            : `/api/admin/education-plans/${planId}/theses`,
          initial ? "PUT" : "POST",
          {
            semester_id: semesterId,
            code: code.trim() || null,
            credit: Number(credit || 0),
          },
        )
      }
    >
      <FieldGroup title="Attestasiya">
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

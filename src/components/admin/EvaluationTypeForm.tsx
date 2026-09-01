"use client";

import { useState } from "react";

import { AdminFormFrame, Field, FieldGroup, SelectInput, TextArea, TextInput, useAdminSave } from "./form-shared";

export type EvaluationLookups = {
  evaluations: { id: string; name_az?: string | null }[];
  types: { id: string; name_az?: string | null }[];
};

export function EvaluationTypeForm({
  lookups,
  initial,
  locale,
}: {
  lookups: EvaluationLookups;
  initial?: Record<string, any> | null;
  locale: string;
}) {
  const isEdit = Boolean(initial?.id);
  const { error, saving, save } = useAdminSave(`/${locale}/dashboard/admin/evaluation`);
  const [name, setName] = useState(initial?.name ?? "");
  const [evaluationId, setEvaluationId] = useState(initial?.evaluation_id ?? "");
  const [point, setPoint] = useState(String(initial?.point ?? 100));
  const [passPercent, setPassPercent] = useState(String(initial?.successful_pass_percent ?? 51));
  const [formulaWith, setFormulaWith] = useState(initial?.formula_with_cw ?? "");
  const [formulaWithout, setFormulaWithout] = useState(initial?.formula_without_cw ?? "");
  const [typeId, setTypeId] = useState(initial?.type_id ?? "");
  const [colloquium, setColloquium] = useState(String(initial?.colloquium_status ?? 0));
  const [points, setPoints] = useState(initial?.points ?? "");

  return (
    <AdminFormFrame
      error={error}
      saving={saving}
      submitLabel={isEdit ? "Yenilə" : "Əlavə et"}
      onSubmit={() =>
        save(
          isEdit ? `/api/admin/evaluation-types/${initial?.id}` : "/api/admin/evaluation-types",
          isEdit ? "PUT" : "POST",
          {
            name,
            evaluation_id: evaluationId,
            point: Number(point) || 0,
            successful_pass_percent: passPercent.trim() ? Number(passPercent) : null,
            formula_with_cw: formulaWith || null,
            formula_without_cw: formulaWithout || null,
            type_id: typeId || null,
            colloquium_status: Number(colloquium) || 0,
            points: points || null,
          }
        )
      }
    >
      <FieldGroup title="Qiymətləndirmə">
        <Field label="Ad" required>
          <TextInput value={name} required onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Qiymətləndirmə tipi" required>
          <SelectInput
            value={evaluationId}
            onChange={setEvaluationId}
            required
            options={lookups.evaluations.map((d) => ({ id: d.id, label: d.name_az || d.id }))}
          />
        </Field>
        <Field label="Maksimum bal" required>
          <TextInput type="number" min={0} max={200} value={point} required onChange={(e) => setPoint(e.target.value)} />
        </Field>
        <Field label="Keçid faizi">
          <TextInput type="number" min={0} max={100} value={passPercent} onChange={(e) => setPassPercent(e.target.value)} />
        </Field>
        <Field label="Növ">
          <SelectInput value={typeId} onChange={setTypeId} options={lookups.types.map((d) => ({ id: d.id, label: d.name_az || d.id }))} />
        </Field>
        <Field label="Kolokvium">
          <SelectInput
            value={colloquium}
            onChange={setColloquium}
            options={[
              { id: "0", label: "Xeyr" },
              { id: "1", label: "Bəli" },
            ]}
          />
        </Field>
        <Field label="CW ilə formula" span2>
          <TextArea value={formulaWith} onChange={(e) => setFormulaWith(e.target.value)} />
        </Field>
        <Field label="CW olmadan formula" span2>
          <TextArea value={formulaWithout} onChange={(e) => setFormulaWithout(e.target.value)} />
        </Field>
        <Field label="Ballar" span2>
          <TextInput value={points} onChange={(e) => setPoints(e.target.value)} />
        </Field>
      </FieldGroup>
    </AdminFormFrame>
  );
}

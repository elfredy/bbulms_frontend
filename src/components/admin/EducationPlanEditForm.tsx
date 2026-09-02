"use client";

import { useMemo, useState } from "react";

import { AdminFormFrame, Field, FieldGroup, SearchSelect, SelectInput, TextArea, TextInput, useAdminSave } from "./form-shared";

export function EducationPlanEditForm({
  lookups,
  initial,
  locale,
}: {
  lookups: {
    organizations: { id: string; name_az?: string | null; faculty_name_az?: string | null }[];
    education_types: { id: string; name_az?: string | null }[];
    education_levels: { id: string; name_az?: string | null }[];
    statuses: { id: string; name_az?: string | null }[];
  };
  initial: Record<string, any>;
  locale: string;
}) {
  const { error, saving, save } = useAdminSave(`/${locale}/dashboard/admin/education-plans/${initial.id}`);
  const [name, setName] = useState(initial.name ?? "");
  const [organizationId, setOrganizationId] = useState(initial.organization_id ?? "");
  const [typeId, setTypeId] = useState(initial.education_type_id ?? "");
  const [levelId, setLevelId] = useState(initial.education_level_id ?? "");
  const [statusId, setStatusId] = useState(initial.status ?? "");
  const [note, setNote] = useState(initial.note ?? "");

  const orgOptions = useMemo(
    () =>
      lookups.organizations.map((o) => ({
        id: o.id,
        label: [o.faculty_name_az, o.name_az].filter(Boolean).join(" / ") || o.id,
      })),
    [lookups.organizations]
  );

  return (
    <AdminFormFrame
      error={error}
      saving={saving}
      submitLabel="Yenilə"
      onSubmit={() =>
        save(`/api/admin/education-plans/${initial.id}`, "PUT", {
          name,
          organization_id: organizationId,
          education_type_id: typeId,
          education_level_id: levelId,
          status: statusId,
          note,
        })
      }
    >
      <FieldGroup title="Tədris planı">
        <Field label="Adı" required span2>
          <TextInput value={name} required onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="İxtisas" required span2>
          <SearchSelect value={organizationId} onChange={setOrganizationId} options={orgOptions} />
        </Field>
        <Field label="Təhsil forması" required>
          <SelectInput value={typeId} onChange={setTypeId} required options={lookups.education_types.map((d) => ({ id: d.id, label: d.name_az || d.id }))} />
        </Field>
        <Field label="Təhsil səviyyəsi" required>
          <SelectInput value={levelId} onChange={setLevelId} required options={lookups.education_levels.map((d) => ({ id: d.id, label: d.name_az || d.id }))} />
        </Field>
        <Field label="Status" required>
          <SelectInput value={statusId} onChange={setStatusId} required options={lookups.statuses.map((d) => ({ id: d.id, label: d.name_az || d.id }))} />
        </Field>
        <Field label="Qeyd" span2>
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </FieldGroup>
    </AdminFormFrame>
  );
}

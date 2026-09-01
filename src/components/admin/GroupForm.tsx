"use client";

import { useState } from "react";

import type { InstitutionLookups } from "@/lib/admin-org";

import { AdminFormFrame, Field, FieldGroup, SearchSelect, SelectInput, TextInput, useAdminSave } from "./form-shared";

export function GroupForm({
  lookups,
  initial,
  locale,
}: {
  lookups: InstitutionLookups;
  initial?: Record<string, any> | null;
  locale: string;
}) {
  const isEdit = Boolean(initial?.education_group_id);
  const { error, saving, save } = useAdminSave(`/${locale}/dashboard/admin/groups`);
  const [name, setName] = useState(initial?.education_group_name ?? "");
  const [organizationId, setOrganizationId] = useState(initial?.organization_id ?? "");
  const [levelId, setLevelId] = useState(initial?.education_level_id ?? "");
  const [typeId, setTypeId] = useState(initial?.education_type_id ?? "");
  const [langId, setLangId] = useState(initial?.education_lang_id ?? "");
  const [yearId, setYearId] = useState(initial?.education_year_id ?? "");
  const [tutorId, setTutorId] = useState(initial?.tyutor_id ?? "");

  return (
    <AdminFormFrame
      error={error}
      saving={saving}
      submitLabel={isEdit ? "Yenilə" : "Əlavə et"}
      onSubmit={async () => {
        if (!organizationId) {
          window.alert("İxtisas seçilməlidir.");
          return;
        }
        await save(
          isEdit ? `/api/admin/groups/${initial?.education_group_id}` : "/api/admin/groups",
          isEdit ? "PUT" : "POST",
          {
            name,
            organization_id: organizationId,
            education_level_id: levelId,
            education_type_id: typeId,
            education_lang_id: langId || null,
            education_year_id: yearId || null,
            tyutor_id: tutorId || null,
          }
        );
      }}
    >
      <FieldGroup title="Qrup məlumatları">
        <Field label="Təhsil səviyyəsi" required>
          <SelectInput value={levelId} onChange={setLevelId} required options={lookups.education_levels.map(opt)} />
        </Field>
        <Field label="Təhsil forması" required>
          <SelectInput value={typeId} onChange={setTypeId} required options={lookups.education_types.map(opt)} />
        </Field>
        <Field label="İxtisas" required span2>
          <SearchSelect
            value={organizationId}
            onChange={setOrganizationId}
            options={lookups.organizations.map((o) => ({
              id: o.id,
              label: [o.faculty_name_az, o.name_az].filter(Boolean).join(" / ") || o.id,
            }))}
          />
        </Field>
        <Field label="Qrupun adı" required>
          <TextInput value={name} required onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Tədris ili">
          <SelectInput
            value={yearId}
            onChange={setYearId}
            options={lookups.education_years.map((y) => ({ id: y.id, label: y.name || y.id }))}
          />
        </Field>
        <Field label="Tədris dili">
          <SelectInput value={langId} onChange={setLangId} options={lookups.education_langs.map(opt)} />
        </Field>
        <Field label="Tyutor">
          <SearchSelect
            value={tutorId}
            onChange={setTutorId}
            options={lookups.tutors.map((t) => ({ id: t.id, label: t.name || t.id }))}
          />
        </Field>
      </FieldGroup>
    </AdminFormFrame>
  );
}

function opt(d: { id: string; name_az?: string | null }) {
  return { id: d.id, label: d.name_az || d.id };
}

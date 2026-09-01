"use client";

import { useEffect, useState } from "react";

import type { InstitutionLookups } from "@/lib/admin-org";

import { AdminFormFrame, Field, FieldGroup, FormHint, SearchSelect, TextArea, TextInput, useAdminSave } from "./form-shared";

type SubjectOpt = { id: string; name_az?: string | null; code?: string | null };

export function SubjectCatalogForm({
  lookups,
  initial,
  locale,
}: {
  lookups: InstitutionLookups;
  initial?: Record<string, any> | null;
  locale: string;
}) {
  const isEdit = Boolean(initial?.id);
  const { error, saving, save } = useAdminSave(`/${locale}/dashboard/admin/subject-catalog`);
  const [departmentId, setDepartmentId] = useState(initial?.department_id ?? "");
  const [subjectId, setSubjectId] = useState(initial?.subject_name_id ?? "");
  const [subjectQuery, setSubjectQuery] = useState(initial?.subject_name_az ?? "");
  const [subjects, setSubjects] = useState<SubjectOpt[]>(
    initial?.subject_name_id ? [{ id: initial.subject_name_id, name_az: initial.subject_name_az }] : []
  );
  const [note, setNote] = useState(initial?.note ?? "");

  useEffect(() => {
    const q = subjectQuery.trim();
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      const params = new URLSearchParams({ limit: "80" });
      if (q) params.set("q", q);
      fetch(`/api/admin/institution/lookups/subjects?${params}`, { credentials: "include", cache: "no-store", signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => setSubjects(d.items ?? []))
        .catch(() => {});
    }, 250);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [subjectQuery]);

  return (
    <AdminFormFrame
      error={error}
      saving={saving}
      submitLabel={isEdit ? "Yenilə" : "Əlavə et"}
      onSubmit={async () => {
        if (!departmentId) {
          window.alert("Kafedra seçilməlidir.");
          return;
        }
        if (!subjectId && !subjectQuery.trim()) {
          window.alert("Fənnin adı mütləqdir.");
          return;
        }
        await save(
          isEdit ? `/api/admin/subject-catalog/${initial?.id}` : "/api/admin/subject-catalog",
          isEdit ? "PUT" : "POST",
          {
            department_id: departmentId,
            subject_name_id: subjectId || null,
            subject_name_az: subjectId ? null : subjectQuery || null,
            note,
          }
        );
      }}
    >
      <FieldGroup title="Kataloq" columns={1}>
        <Field label="Kafedra" required>
          <SearchSelect
            value={departmentId}
            onChange={setDepartmentId}
            options={lookups.departments.map((d) => ({
              id: d.id,
              label: [d.faculty_name_az, d.name_az].filter(Boolean).join(" / ") || d.id,
            }))}
          />
        </Field>
        <Field label="Açar söz">
          <TextInput value={subjectQuery} onChange={(e) => setSubjectQuery(e.target.value)} placeholder="Fənn adı axtar…" />
        </Field>
        <Field label="Fənnin adı" required>
          <SearchSelect
            value={subjectId}
            onChange={setSubjectId}
            options={subjects.map((s) => ({ id: s.id, label: [s.name_az, s.code].filter(Boolean).join(" · ") || s.id }))}
          />
        </Field>
        {!isEdit ? <FormHint>Siyahıda yoxdursa, axtarış xanasına yeni fənn adını yazıb kafedraya bağlaya bilərsiniz.</FormHint> : null}
        <Field label="Fənnin annotasiyası">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </FieldGroup>
    </AdminFormFrame>
  );
}

"use client";

import { useState } from "react";

import { AdminFormFrame, Field, FieldGroup, TextInput, toDateInput, useAdminSave } from "./form-shared";

export function EduYearForm({
  initial,
  locale,
}: {
  initial?: Record<string, any> | null;
  locale: string;
}) {
  const isEdit = Boolean(initial?.id);
  const { error, saving, save } = useAdminSave(`/${locale}/dashboard/admin/edu-years`);
  const [name, setName] = useState(initial?.name ?? "");
  const [startDate, setStartDate] = useState(toDateInput(initial?.start_date));
  const [endDate, setEndDate] = useState(toDateInput(initial?.end_date));
  const [orderBy, setOrderBy] = useState(initial?.order_by != null ? String(initial.order_by) : "");

  return (
    <AdminFormFrame
      error={error}
      saving={saving}
      submitLabel={isEdit ? "Yenilə" : "Əlavə et"}
      onSubmit={() =>
        save(isEdit ? `/api/admin/edu-years/${initial?.id}` : "/api/admin/edu-years", isEdit ? "PUT" : "POST", {
          name,
          start_date: startDate,
          end_date: endDate,
          order_by: orderBy.trim() ? Number(orderBy) : null,
        })
      }
    >
      <FieldGroup title="Tədris ili">
        <Field label="Ad" required span2>
          <TextInput value={name} required placeholder="2025-2026" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Başlama tarixi" required>
          <TextInput type="date" value={startDate} required onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Bitmə tarixi" required>
          <TextInput type="date" value={endDate} required onChange={(e) => setEndDate(e.target.value)} />
        </Field>
        <Field label="Sıra" span2>
          <TextInput type="number" value={orderBy} onChange={(e) => setOrderBy(e.target.value)} />
        </Field>
      </FieldGroup>
    </AdminFormFrame>
  );
}

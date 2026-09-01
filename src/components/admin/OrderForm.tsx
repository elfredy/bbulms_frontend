"use client";

import { useState } from "react";

import type { InstitutionLookups } from "@/lib/admin-org";

import { AdminFormFrame, Field, FieldGroup, SelectInput, TextArea, TextInput, toDateInput, useAdminSave } from "./form-shared";

export function OrderForm({
  lookups,
  initial,
  locale,
}: {
  lookups: InstitutionLookups;
  initial?: Record<string, any> | null;
  locale: string;
}) {
  const isEdit = Boolean(initial?.id);
  const { error, saving, save } = useAdminSave(`/${locale}/dashboard/admin/orders`);
  const [typeId, setTypeId] = useState(initial?.type_id ?? "");
  const [formId, setFormId] = useState(initial?.form_id ?? "");
  const [eduLevelId, setEduLevelId] = useState(initial?.edu_level_id ?? "");
  const [serial, setSerial] = useState(initial?.serial ?? "");
  const [orderDate, setOrderDate] = useState(toDateInput(initial?.order_date));
  const [statusId, setStatusId] = useState(initial?.status_id ?? lookups.order_statuses[0]?.id ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  return (
    <AdminFormFrame
      error={error}
      saving={saving}
      submitLabel={isEdit ? "Yenilə" : "Əlavə et"}
      onSubmit={() =>
        save(isEdit ? `/api/admin/orders/${initial?.id}` : "/api/admin/orders", isEdit ? "PUT" : "POST", {
          type_id: typeId,
          form_id: formId,
          edu_level_id: eduLevelId,
          serial,
          order_date: orderDate,
          status_id: statusId || null,
          note,
        })
      }
    >
      <FieldGroup title="Əmr məlumatları">
        <Field label="Əmrin tipi" required>
          <SelectInput value={typeId} onChange={setTypeId} required options={lookups.order_types.map(opt)} />
        </Field>
        <Field label="Əmrin forması" required>
          <SelectInput value={formId} onChange={setFormId} required options={lookups.order_forms.map(opt)} />
        </Field>
        <Field label="Təhsil səviyyəsi" required>
          <SelectInput value={eduLevelId} onChange={setEduLevelId} required options={lookups.education_levels.map(opt)} />
        </Field>
        <Field label="Seriya" required>
          <TextInput value={serial} required onChange={(e) => setSerial(e.target.value)} />
        </Field>
        <Field label="Əmrin tarixi" required>
          <TextInput type="date" value={orderDate} required onChange={(e) => setOrderDate(e.target.value)} />
        </Field>
        {lookups.order_statuses.length ? (
          <Field label="Status">
            <SelectInput value={statusId} onChange={setStatusId} options={lookups.order_statuses.map(opt)} />
          </Field>
        ) : null}
        <Field label="Qeyd" span2>
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </FieldGroup>
    </AdminFormFrame>
  );
}

function opt(d: { id: string; name_az?: string | null }) {
  return { id: d.id, label: d.name_az || d.id };
}

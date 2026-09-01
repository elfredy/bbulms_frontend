"use client";

import { useState } from "react";

import type { InstitutionLookups } from "@/lib/admin-org";

import { AdminFormFrame, Field, FieldGroup, SearchSelect, SelectInput, TextInput, toDateInput, useAdminSave } from "./form-shared";

export function StudentForm({
  lookups,
  initial,
  locale,
}: {
  lookups: InstitutionLookups;
  initial?: Record<string, any> | null;
  locale: string;
}) {
  const isEdit = Boolean(initial?.student_id);
  const { error, saving, save } = useAdminSave(`/${locale}/dashboard/admin/students`);
  const [lastname, setLastname] = useState(initial?.lastname ?? "");
  const [firstname, setFirstname] = useState(initial?.firstname ?? "");
  const [patronymic, setPatronymic] = useState(initial?.patronymic ?? "");
  const [pincode, setPincode] = useState(initial?.pincode ?? "");
  const [genderId, setGenderId] = useState(initial?.gender_id ?? "");
  const [birthdate, setBirthdate] = useState(toDateInput(initial?.birthdate));
  const [groupId, setGroupId] = useState(initial?.education_group_id ?? "");
  const [orderId, setOrderId] = useState(initial?.in_order_id ?? "");
  const [educationTypeId, setEducationTypeId] = useState(initial?.education_type_id ?? "");
  const [paymentId, setPaymentId] = useState(initial?.education_payment_type_id ?? "");
  const [langId, setLangId] = useState(initial?.education_lang_id ?? "");
  const [statusId, setStatusId] = useState(initial?.status_id ?? "");
  const [cardNumber, setCardNumber] = useState(initial?.card_number ?? "");

  return (
    <AdminFormFrame
      error={error}
      saving={saving}
      submitLabel={isEdit ? "Yenilə" : "Əlavə et"}
      onSubmit={async () => {
        if (!groupId) {
          window.alert("Tələbə qrupu seçilməlidir.");
          return;
        }
        if (!orderId) {
          window.alert("Tələbə əmri seçilməlidir.");
          return;
        }
        await save(isEdit ? `/api/admin/students/${initial?.student_id}` : "/api/admin/students", isEdit ? "PUT" : "POST", {
          lastname,
          firstname,
          patronymic,
          pincode,
          gender_id: genderId,
          birthdate: birthdate || null,
          education_group_id: groupId,
          in_order_id: orderId,
          education_type_id: educationTypeId || null,
          education_payment_type_id: paymentId || null,
          education_lang_id: langId || null,
          status_id: statusId || null,
          card_number: cardNumber || null,
        });
      }}
    >
      <FieldGroup title="Şəxsi məlumat">
        <Field label="Soyad" required>
          <TextInput value={lastname} required onChange={(e) => setLastname(e.target.value)} />
        </Field>
        <Field label="Ad" required>
          <TextInput value={firstname} required onChange={(e) => setFirstname(e.target.value)} />
        </Field>
        <Field label="Ata adı">
          <TextInput value={patronymic} onChange={(e) => setPatronymic(e.target.value)} />
        </Field>
        <Field label="FİN kod" required>
          <TextInput value={pincode} required onChange={(e) => setPincode(e.target.value)} />
        </Field>
        <Field label="Cinsi" required>
          <SelectInput value={genderId} onChange={setGenderId} required options={lookups.genders.map(opt)} />
        </Field>
        <Field label="Doğum tarixi">
          <TextInput type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
        </Field>
      </FieldGroup>
      <FieldGroup title="Təhsil">
        <Field label="Tələbə qrupu" required>
          <SearchSelect
            value={groupId}
            onChange={setGroupId}
            options={lookups.groups.map((g) => ({
              id: g.id,
              label: [g.name, g.specialty_name_az, g.education_year_name].filter(Boolean).join(" · ") || g.id,
            }))}
          />
        </Field>
        <Field label="Tələbə əmri" required>
          <SearchSelect
            value={orderId}
            onChange={setOrderId}
            options={lookups.orders.map((o) => ({
              id: o.id,
              label: [o.serial, o.type_name_az, o.order_date].filter(Boolean).join(" · ") || o.id,
            }))}
          />
        </Field>
        <Field label="Təhsil forması">
          <SelectInput value={educationTypeId} onChange={setEducationTypeId} options={lookups.education_types.map(opt)} />
        </Field>
        <Field label="Ödəniş növü">
          <SelectInput value={paymentId} onChange={setPaymentId} options={lookups.payment_types.map(opt)} />
        </Field>
        <Field label="Tədris dili">
          <SelectInput value={langId} onChange={setLangId} options={lookups.education_langs.map(opt)} />
        </Field>
        <Field label="Status">
          <SelectInput value={statusId} onChange={setStatusId} options={lookups.student_statuses.map(opt)} />
        </Field>
        <Field label="Kart nömrəsi" span2>
          <TextInput value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
        </Field>
      </FieldGroup>
    </AdminFormFrame>
  );
}

function opt(d: { id: string; name_az?: string | null }) {
  return { id: d.id, label: d.name_az || d.id };
}

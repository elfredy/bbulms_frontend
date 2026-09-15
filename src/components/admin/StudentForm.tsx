"use client";

import Link from "next/link";
import { useState } from "react";

import type { InstitutionLookups } from "@/lib/admin-org-shared";

import { AdminFormFrame, Field, FieldGroup, FormHint, SearchSelect, SelectInput, TextInput, readDetail, toDateInput, useAdminSave } from "./form-shared";

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
  const { error, saving, save, setError } = useAdminSave(`/${locale}/dashboard/admin/students`);
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
  const [existing, setExisting] = useState<{
    person_id: string;
    fullname: string;
    message: string;
    has_student?: boolean;
    student_group_name?: string | null;
    student_level_name?: string | null;
  } | null>(null);

  const payload = {
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
  };

  return (
    <AdminFormFrame
      error={error}
      saving={saving}
      submitLabel={
        isEdit ? "Yenilə" : existing?.has_student ? "Magistraturaya keçir" : existing ? "Mövcud şəxsi tələbə et" : "Əlavə et"
      }
      onSubmit={async () => {
        if (!groupId) {
          window.alert("Tələbə qrupu seçilməlidir.");
          return;
        }
        if (!orderId) {
          window.alert("Tələbə əmri seçilməlidir.");
          return;
        }
        if (isEdit) {
          await save(`/api/admin/students/${initial?.student_id}`, "PUT", payload);
          return;
        }
        if (existing?.has_student) {
          const ok = window.confirm(
            `${existing.fullname} artıq tələbədir${
              existing.student_group_name ? ` (${[existing.student_level_name, existing.student_group_name].filter(Boolean).join(" · ")})` : ""
            }. Seçilmiş magistr qrupuna yeni qeyd yaradılsın?`,
          );
          if (!ok) return;
        }
        const res = await fetch("/api/admin/students", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...payload, use_existing_person: Boolean(existing) }),
        });
        if (res.status === 409) {
          const data = await res.json().catch(() => null);
          const detail = data?.detail;
          if (detail?.person_id) {
            setExisting({
              person_id: String(detail.person_id),
              fullname: detail.fullname || "",
              message: detail.message || "",
              has_student: Boolean(detail.has_student),
              student_group_name: detail.student_group_name || null,
              student_level_name: detail.student_level_name || null,
            });
            setError(detail.message || "Bu FİN artıq mövcuddur.");
            return;
          }
        }
        if (!res.ok) {
          setError(await readDetail(res, "Tələbə əlavə olunmadı"));
          return;
        }
        window.location.href = `/${locale}/dashboard/admin/students`;
      }}
    >
      {existing ? (
        <FormHint>
          {existing.fullname} artıq bazadadır
          {existing.student_group_name
            ? ` (${[existing.student_level_name, existing.student_group_name].filter(Boolean).join(" · ")})`
            : ""}
          . {existing.has_student
            ? "«Magistraturaya keçir» ilə eyni şəxsə yeni tələbə qeydi (yeni qrup) yaradın."
            : "«Mövcud şəxsi tələbə et» ilə tələbə qeydi yaradın."}{" "}
          və ya <Link href={`/${locale}/dashboard/admin/user-roles/${existing.person_id}`}>yeni rol təyin edin</Link>.
        </FormHint>
      ) : null}
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

"use client";

import { useState } from "react";

import type { InstitutionLookups } from "@/lib/admin-org";

import { AdminFormFrame, Field, FieldGroup, SearchSelect, SelectInput, TextInput, toDateInput, useAdminSave } from "./form-shared";

export function TeacherForm({
  lookups,
  initial,
  locale,
}: {
  lookups: InstitutionLookups;
  initial?: Record<string, any> | null;
  locale: string;
}) {
  const isEdit = Boolean(initial?.teacher_id);
  const { error, saving, save } = useAdminSave(`/${locale}/dashboard/admin/teachers`);
  const [lastname, setLastname] = useState(initial?.lastname ?? "");
  const [firstname, setFirstname] = useState(initial?.firstname ?? "");
  const [patronymic, setPatronymic] = useState(initial?.patronymic ?? "");
  const [pincode, setPincode] = useState(initial?.pincode ?? "");
  const [genderId, setGenderId] = useState(initial?.gender_id ?? "");
  const [departmentId, setDepartmentId] = useState(initial?.department_id ?? "");
  const [staffTypeId, setStaffTypeId] = useState(initial?.staff_type_id ?? "");
  const [positionId, setPositionId] = useState(initial?.position_id ?? "");
  const [contractTypeId, setContractTypeId] = useState(initial?.contract_type_id ?? "");
  const [inActionId, setInActionId] = useState(initial?.in_action_id ?? "");
  const [inActionDate, setInActionDate] = useState(toDateInput(initial?.in_action_date));
  const [teaching, setTeaching] = useState(String(initial?.teaching ?? 1));
  const [cardNumber, setCardNumber] = useState(initial?.card_number ?? "");

  return (
    <AdminFormFrame
      error={error}
      saving={saving}
      submitLabel={isEdit ? "Yenilə" : "Əlavə et"}
      onSubmit={async () => {
        if (!departmentId) {
          window.alert("Müəllim kafedraya bağlanmalıdır.");
          return;
        }
        await save(isEdit ? `/api/admin/teachers/${initial?.teacher_id}` : "/api/admin/teachers", isEdit ? "PUT" : "POST", {
          lastname,
          firstname,
          patronymic,
          pincode: pincode || null,
          gender_id: genderId,
          department_id: departmentId,
          staff_type_id: staffTypeId || null,
          position_id: positionId || null,
          contract_type_id: contractTypeId || null,
          in_action_id: inActionId || null,
          in_action_date: inActionDate || null,
          teaching: Number(teaching) || 1,
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
        <Field label="FİN kod">
          <TextInput value={pincode} onChange={(e) => setPincode(e.target.value)} />
        </Field>
        <Field label="Cinsi" required>
          <SelectInput value={genderId} onChange={setGenderId} required options={lookups.genders.map(opt)} />
        </Field>
        <Field label="Kart nömrəsi">
          <TextInput value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
        </Field>
      </FieldGroup>
      <FieldGroup title="Kafedra və vəzifə">
        <Field label="Kafedra" required span2>
          <SearchSelect
            value={departmentId}
            onChange={setDepartmentId}
            options={lookups.departments.map((d) => ({
              id: d.id,
              label: [d.faculty_name_az, d.name_az].filter(Boolean).join(" / ") || d.id,
            }))}
          />
        </Field>
        <Field label="Ştat növü">
          <SelectInput value={staffTypeId} onChange={setStaffTypeId} options={lookups.staff_types.map(opt)} />
        </Field>
        <Field label="Vəzifə">
          <SelectInput value={positionId} onChange={setPositionId} options={lookups.positions.map(opt)} />
        </Field>
        <Field label="Müqavilə növü">
          <SelectInput value={contractTypeId} onChange={setContractTypeId} options={lookups.contract_types.map(opt)} />
        </Field>
        <Field label="Qəbul forması">
          <SelectInput value={inActionId} onChange={setInActionId} options={lookups.in_actions.map(opt)} />
        </Field>
        <Field label="Başlama tarixi">
          <TextInput type="date" value={inActionDate} onChange={(e) => setInActionDate(e.target.value)} />
        </Field>
        <Field label="Dərs deyir">
          <SelectInput
            value={teaching}
            onChange={setTeaching}
            options={[
              { id: "1", label: "Bəli" },
              { id: "0", label: "Xeyr" },
            ]}
          />
        </Field>
      </FieldGroup>
    </AdminFormFrame>
  );
}

function opt(d: { id: string; name_az?: string | null }) {
  return { id: d.id, label: d.name_az || d.id };
}

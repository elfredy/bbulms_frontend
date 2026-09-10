"use client";

import { useMemo, useState } from "react";

import type { InstitutionLookups, UserRoleDetail } from "@/lib/admin-org-shared";

import { AdminFormFrame, Field, FieldGroup, FormHint, SearchSelect, SelectInput, useAdminSave } from "./form-shared";

const ROLE_OPTIONS = [
  { id: "STUDENT", label: "Tələbə" },
  { id: "TEACHER", label: "Müəllim" },
  { id: "OWNER", label: "Kafedra müdiri" },
  { id: "TYUTOR", label: "Tyutor" },
  { id: "ADMIN", label: "Admin" },
  { id: "SUPERADMIN", label: "Superadmin" },
];

const STAFF_ROLES = new Set(["TEACHER", "OWNER", "TYUTOR"]);

export function UserRoleForm({
  lookups,
  initial,
  locale,
}: {
  lookups: InstitutionLookups;
  initial: UserRoleDetail;
  locale: string;
}) {
  const { error, saving, save } = useAdminSave(`/${locale}/dashboard/admin/user-roles/${initial.person_id}?saved=1`);
  const currentType = (initial.user_type ?? "").toUpperCase();
  const [userType, setUserType] = useState(currentType);
  const [departmentId, setDepartmentId] = useState(initial.department_id ?? "");
  const [staffTypeId, setStaffTypeId] = useState(initial.staff_type_id ?? "");
  const [positionId, setPositionId] = useState(initial.position_id ?? "");
  const [contractTypeId, setContractTypeId] = useState(initial.contract_type_id ?? "");
  const [inActionId, setInActionId] = useState(initial.in_action_id ?? "");
  const roleOptions =
    currentType && !ROLE_OPTIONS.some((o) => o.id === currentType)
      ? [{ id: currentType, label: initial.user_type_label || currentType }, ...ROLE_OPTIONS]
      : ROLE_OPTIONS;

  const needsDepartment = STAFF_ROLES.has(userType);
  const creatingTeacher = needsDepartment && !initial.teacher_id;
  const departmentOptions = useMemo(
    () =>
      lookups.departments.map((d) => ({
        id: d.id,
        label: [d.faculty_name_az, d.name_az].filter(Boolean).join(" / ") || d.id,
      })),
    [lookups.departments],
  );

  return (
    <AdminFormFrame
      error={error}
      saving={saving}
      submitLabel="Rolu yenilə"
      onSubmit={async () => {
        if (!userType) {
          window.alert("Rol seçilməlidir.");
          return;
        }
        if (needsDepartment && !departmentId) {
          window.alert("Müəllim, kafedra müdiri və ya tyutor üçün kafedra seçilməlidir.");
          return;
        }
        await save(`/api/admin/user-roles/${initial.person_id}`, "PUT", {
          user_type: userType,
          department_id: needsDepartment ? departmentId : null,
          staff_type_id: creatingTeacher ? staffTypeId || null : null,
          position_id: creatingTeacher ? positionId || null : null,
          contract_type_id: creatingTeacher ? contractTypeId || null : null,
          in_action_id: creatingTeacher ? inActionId || null : null,
        });
      }}
    >
      <FieldGroup title="Yeni rol">
        <Field label="Sistem rolu" required span2>
          <SelectInput value={userType} onChange={setUserType} required options={roleOptions} />
        </Field>
        {needsDepartment ? (
          <Field label="Kafedra" required span2>
            <SearchSelect value={departmentId} onChange={setDepartmentId} options={departmentOptions} placeholder="Kafedra seçin" />
          </Field>
        ) : null}
      </FieldGroup>
      {creatingTeacher ? (
        <FieldGroup title="Yeni müəllim qeydi">
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
        </FieldGroup>
      ) : null}
      {creatingTeacher ? (
        <FormHint>Köhnə tələbə müəllim olanda pedaqoji qeyd avtomatik yaradılır və seçilmiş kafedraya bağlanır. Tələbə qeydi silinmir.</FormHint>
      ) : null}
      {needsDepartment && initial.teacher_id ? (
        <FormHint>Mövcud müəllim qeydi saxlanılır, yalnız kafedra və giriş rolu yenilənir. Tələbə qeydi silinmir.</FormHint>
      ) : null}
      {userType === "STUDENT" ? (
        <FormHint>Tələbə kabineti açılacaq. Əgər müəllim girişi varsa, o əlaqə bağlanacaq (müəllim qeydi silinmir).</FormHint>
      ) : null}
    </AdminFormFrame>
  );
}

function opt(d: { id: string; name_az?: string | null }) {
  return { id: d.id, label: d.name_az || d.id };
}

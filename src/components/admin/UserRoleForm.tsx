"use client";

import { useMemo, useState } from "react";

import type { InstitutionLookups, UserRoleDetail } from "@/lib/admin-org-shared";

import { AdminFormFrame, Field, FieldGroup, FormHint, SearchSelect, SelectInput, useAdminSave } from "./form-shared";

const ROLE_OPTIONS = [
  { id: "STUDENT", label: "Tələbə" },
  { id: "TEACHER", label: "Müəllim" },
  { id: "OWNER", label: "Kafedra müdiri" },
  { id: "TYUTOR", label: "Tyutor" },
  { id: "LABORANT", label: "Laborant" },
  { id: "ADMIN", label: "Admin" },
  { id: "SUPERADMIN", label: "Superadmin" },
];

const STAFF_ROLES = new Set(["TEACHER", "OWNER", "TYUTOR", "LABORANT"]);

export function UserRoleForm({
  lookups,
  initial,
  locale,
}: {
  lookups: InstitutionLookups;
  initial: UserRoleDetail;
  locale: string;
}) {
  const { error, saving, save, setError } = useAdminSave(`/${locale}/dashboard/admin/user-roles/${initial.person_id}?saved=1`);
  const currentRoles = (initial.roles ?? []).map((r) => (typeof r === "string" ? r : r.user_type)).filter(Boolean);
  const currentType = (initial.user_type ?? "").toUpperCase();
  const [userType, setUserType] = useState(currentType && !currentRoles.includes(currentType) ? currentType : "");
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

  async function removeRole(role: string) {
    if (!window.confirm(`${role} rolunu silmək istəyirsiniz?`)) return;
    await save(`/api/admin/user-roles/${initial.person_id}`, "PUT", {
      user_type: role,
      remove_role: true,
      add_role: false,
    });
  }

  return (
    <AdminFormFrame
      error={error}
      saving={saving}
      submitLabel="Rol əlavə et"
      onSubmit={async () => {
        if (!userType) {
          window.alert("Əlavə olunacaq rol seçilməlidir.");
          return;
        }
        if (currentRoles.includes(userType)) {
          setError("Bu rol artıq təyin olunub. Kafedra və ya məlumatı yeniləmək üçün eyni rolü yenidən göndərə bilərsiniz.");
        }
        if (needsDepartment && !departmentId) {
          window.alert("Müəllim, kafedra müdiri, tyutor və ya laborant üçün kafedra seçilməlidir.");
          return;
        }
        await save(`/api/admin/user-roles/${initial.person_id}`, "PUT", {
          user_type: userType,
          add_role: true,
          department_id: needsDepartment ? departmentId : null,
          staff_type_id: creatingTeacher ? staffTypeId || null : null,
          position_id: creatingTeacher ? positionId || null : null,
          contract_type_id: creatingTeacher ? contractTypeId || null : null,
          in_action_id: creatingTeacher ? inActionId || null : null,
        });
      }}
    >
      <FieldGroup title="Mövcud rollar" columns={1}>
        {currentRoles.length === 0 ? <FormHint>Hələ sistem rolu yoxdur.</FormHint> : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(initial.roles ?? []).map((r) => {
            const id = typeof r === "string" ? r : r.user_type;
            const label = typeof r === "string" ? r : r.user_type_label || r.user_type;
            return (
              <span
                key={id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  fontSize: "0.86rem",
                }}
              >
                {label}
                <button type="button" onClick={() => void removeRole(id)} style={{ border: 0, background: "transparent", cursor: "pointer" }}>
                  ×
                </button>
              </span>
            );
          })}
        </div>
      </FieldGroup>
      <FieldGroup title="Yeni rol təyin et">
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
        <FormHint>Köhnə tələbə müəllim, tyutor və ya laborant olanda pedaqoji qeyd avtomatik yaradılır. Mövcud tələbə qeydi silinmir.</FormHint>
      ) : null}
      {needsDepartment && initial.teacher_id ? (
        <FormHint>Mövcud müəllim qeydi saxlanılır. Yeni rol əlavə olunur, köhnə rollar qalır. Girişdə profil seçmək olar.</FormHint>
      ) : null}
      {userType === "STUDENT" ? <FormHint>Tələbə kabineti açılacaq. Digər rollar silinmir.</FormHint> : null}
      {userType === "TYUTOR" ? <FormHint>Tyutor qruplara bağlanır və tyutor panelində öz qruplarını idarə edir.</FormHint> : null}
      {userType === "LABORANT" ? <FormHint>Laborant müəllim kabinetində laboratoriya dərslərini görür.</FormHint> : null}
    </AdminFormFrame>
  );
}

function opt(d: { id: string; name_az?: string | null }) {
  return { id: d.id, label: d.name_az || d.id };
}

import { cookies } from "next/headers";

export type DictItem = { id: string; name_az?: string | null; code?: string | null; name?: string | null };

export type InstitutionLookups = {
  order_types: DictItem[];
  order_forms: DictItem[];
  order_statuses: DictItem[];
  education_levels: DictItem[];
  genders: DictItem[];
  education_types: DictItem[];
  payment_types: DictItem[];
  education_langs: DictItem[];
  student_statuses: DictItem[];
  staff_types: DictItem[];
  positions: DictItem[];
  contract_types: DictItem[];
  in_actions: DictItem[];
  departments: { id: string; name_az?: string | null; faculty_name_az?: string | null }[];
  organizations: { id: string; name_az?: string | null; faculty_name_az?: string | null }[];
  groups: { id: string; name?: string | null; education_year_name?: string | null; specialty_name_az?: string | null }[];
  orders: { id: string; serial?: string | null; order_date?: string | null; type_name_az?: string | null }[];
  education_years: { id: string; name?: string | null }[];
  tutors: { id: string; name?: string | null }[];
};

async function adminGet<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}${path}`, { headers: { cookie: header }, cache: "no-store" });
  if (res.status === 403 || !res.ok) return null;
  return res.json();
}

export async function adminInstitutionLookups(): Promise<InstitutionLookups | null> {
  return adminGet("/api/admin/institution/lookups");
}

export async function adminListOrders(opts?: { q?: string | null; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  params.set("limit", String(opts?.limit ?? 25));
  params.set("offset", String(opts?.offset ?? 0));
  return adminGet<{ items: any[]; total: number; limit: number; offset: number }>(`/api/admin/orders?${params}`);
}

export async function adminGetOrder(id: string) {
  return adminGet<any>(`/api/admin/orders/${encodeURIComponent(id)}`);
}

export async function adminListStudents(opts?: { q?: string | null; education_group_id?: string | null; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  if (opts?.education_group_id) params.set("education_group_id", opts.education_group_id);
  params.set("limit", String(opts?.limit ?? 25));
  params.set("offset", String(opts?.offset ?? 0));
  return adminGet<{ items: any[]; total: number; stats: Record<string, number> }>(`/api/admin/students?${params}`);
}

export async function adminGetStudent(id: string) {
  return adminGet<any>(`/api/admin/students/${encodeURIComponent(id)}`);
}

export async function adminListSubjectCatalog(opts?: { q?: string | null; department_id?: string | null; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  if (opts?.department_id) params.set("department_id", opts.department_id);
  params.set("limit", String(opts?.limit ?? 25));
  params.set("offset", String(opts?.offset ?? 0));
  return adminGet<{ items: any[]; total: number; stats: Record<string, number> }>(`/api/admin/subject-catalog?${params}`);
}

export async function adminGetSubjectCatalog(id: string) {
  return adminGet<any>(`/api/admin/subject-catalog/${encodeURIComponent(id)}`);
}

export type SubjectCatalogTopic = {
  id: string;
  subject_catalog_id: string;
  lesson_type_id: string | null;
  lesson_type_az: string | null;
  topic: string | null;
};

export type SubjectCatalogTopicsData = {
  catalog: {
    id: string;
    subject_name_az?: string | null;
    department_name_az?: string | null;
    department_id?: string | null;
  };
  lesson_types: DictItem[];
  items: SubjectCatalogTopic[];
  total: number;
  limit: number;
  offset: number;
};

export async function adminListSubjectCatalogTopics(
  catalogId: string,
  opts?: { lesson_type_id?: string | null; limit?: number; offset?: number },
) {
  const params = new URLSearchParams();
  if (opts?.lesson_type_id) params.set("lesson_type_id", opts.lesson_type_id);
  params.set("limit", String(opts?.limit ?? 25));
  params.set("offset", String(opts?.offset ?? 0));
  return adminGet<SubjectCatalogTopicsData>(`/api/admin/subject-catalog/${encodeURIComponent(catalogId)}/topics?${params}`);
}

export function pageList(current: number, last: number) {
  const pages = new Set<number>([1, last, current, current - 1, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
}

export function dictLabel(item?: { name_az?: string | null; name?: string | null; id?: string } | null) {
  return item?.name_az || item?.name || item?.id || "—";
}

export async function adminListEduYears(q?: string | null) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  const qs = params.toString();
  return adminGet<{ items: any[]; total: number }>(`/api/admin/edu-years${qs ? `?${qs}` : ""}`);
}

export async function adminGetEduYear(id: string) {
  return adminGet<any>(`/api/admin/edu-years/${encodeURIComponent(id)}`);
}

export async function adminAcademicCalendar(educationYearId?: string | null) {
  const params = new URLSearchParams();
  if (educationYearId) params.set("education_year_id", educationYearId);
  const qs = params.toString();
  return adminGet<{
    year: { id: string; name?: string | null; start_date?: string | null; end_date?: string | null } | null;
    years: { id: string; name?: string | null; start_date?: string | null; end_date?: string | null }[];
    weeks: { week: number; start_date: string; end_date: string; week_type: string }[];
    total: number;
  }>(`/api/admin/academic-calendar${qs ? `?${qs}` : ""}`);
}

export async function adminListSubjectBlocks() {
  return adminGet<{ items: { id: string; code?: string | null; name_az?: string | null; order_by?: number | null; plan_count?: number }[]; total: number }>(
    "/api/admin/subject-blocks",
  );
}

export async function adminListEvaluationTypes(q?: string | null) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  const qs = params.toString();
  return adminGet<{
    items: any[];
    total: number;
    lookups: { evaluations: { id: string; name_az?: string | null }[]; types: { id: string; name_az?: string | null }[] };
  }>(`/api/admin/evaluation-types${qs ? `?${qs}` : ""}`);
}

export async function adminGetEvaluationType(id: string) {
  return adminGet<any>(`/api/admin/evaluation-types/${encodeURIComponent(id)}`);
}

export type UserRoleListItem = {
  person_id: string;
  fullname: string | null;
  pincode: string | null;
  username: string | null;
  user_type: string | null;
  user_type_label: string;
  department_name_az: string | null;
  has_student: boolean;
  has_teacher: boolean;
};

export type UserRoleDetail = {
  person_id: string;
  fullname: string | null;
  firstname?: string | null;
  lastname?: string | null;
  patronymic?: string | null;
  pincode: string | null;
  gender_name_az?: string | null;
  account_id: string | null;
  username: string | null;
  user_id: string | null;
  user_type: string | null;
  user_type_label: string;
  is_blocked?: number;
  department_id: string | null;
  department_name_az: string | null;
  faculty_name_az: string | null;
  student_id: string | null;
  teacher_id: string | null;
  staff_type_id?: string | null;
  position_id?: string | null;
  contract_type_id?: string | null;
  in_action_id?: string | null;
  has_login: boolean;
  must_change_password?: boolean;
  notes: string[];
};

export async function adminSearchUserRoles(opts?: { q?: string | null; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  params.set("limit", String(opts?.limit ?? 25));
  params.set("offset", String(opts?.offset ?? 0));
  return adminGet<{ items: UserRoleListItem[]; total: number; limit: number; offset: number }>(`/api/admin/user-roles?${params}`);
}

export async function adminGetUserRole(personId: string) {
  return adminGet<UserRoleDetail>(`/api/admin/user-roles/${encodeURIComponent(personId)}`);
}

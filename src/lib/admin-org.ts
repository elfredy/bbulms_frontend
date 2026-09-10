import { cookies } from "next/headers";

import type { InstitutionLookups, SubjectCatalogTopicsData, UserRoleDetail, UserRoleListItem } from "./admin-org-shared";
import { serverApiBase } from "./server-api-base";

export type {
  DictItem,
  InstitutionLookups,
  SubjectCatalogTopic,
  SubjectCatalogTopicsData,
  UserRoleDetail,
  UserRoleListItem,
} from "./admin-org-shared";
export { dictLabel, pageList } from "./admin-org-shared";

async function adminGet<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = serverApiBase();
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

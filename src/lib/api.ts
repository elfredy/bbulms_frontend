import { cookies } from "next/headers";

export type UserProfile = {
  account_id: number;
  username: string;
  firstname: string | null;
  lastname: string | null;
  patronymic: string | null;
  display_name: string;
  user_id: number | null;
  user_type: string | null;
  teacher_id: number | null;
  student_id: number | null;
  organization_id?: number | null;
  department_id?: number | null;
  department_name_az?: string | null;
  faculty_name_az?: string | null;
  is_department_user?: boolean;
  is_superadmin?: boolean;
};

export type AdminGroupItem = {
  education_group_id: string;
  education_group_name: string | null;
  education_year_id: string | null;
  education_year_name: string | null;
  student_count: number;
};

export type AdminGroupListResponse = {
  items: AdminGroupItem[];
  limit: number;
  offset: number;
};

export type AdminGroupStudentItem = {
  student_id: string;
  student_fullname: string | null;
};

export type AdminGroupCourseItem = {
  course_id: string;
  evaluation_type_id: string | null;
  education_year_id: string | null;
  education_year_name: string | null;
  subject_name_az: string | null;
  bucket: "current" | "past" | "future";
};

export type AdminGroupDetailResponse = {
  group: Record<string, any>;
  students: AdminGroupStudentItem[];
  courses: AdminGroupCourseItem[];
};

export type AdminTeacherItem = {
  teacher_id: string;
  teacher_fullname: string | null;
  course_count: number;
};

export type AdminTeacherListResponse = {
  items: AdminTeacherItem[];
  limit: number;
  offset: number;
};

export type AdminTeacherCourseItem = {
  course_teacher_id: string;
  course_id: string;
  subject_name_az: string | null;
  education_year_id: string | null;
  education_year_name: string | null;
  lesson_type_id: string | null;
  lesson_type_az: string | null;
  close_status: number;
};

export type AdminTeacherDetailResponse = {
  teacher: { teacher_id: string; teacher_fullname: string | null };
  courses: AdminTeacherCourseItem[];
};

export type AdminDepartmentItem = {
  department_id: string;
  department_name_az: string | null;
  faculty_name_az: string | null;
  department_code: string | null;
  teacher_count: number;
  course_count: number;
};

export type AdminDepartmentListResponse = {
  items: AdminDepartmentItem[];
  limit: number;
  offset: number;
};

export type AdminDepartmentDetailResponse = {
  department: Record<string, any>;
  teachers: { teacher_id: string; teacher_fullname: string | null; course_count: number }[];
  owners: { user_id: string; username: string; user_type: string }[];
  courses: { course_id: string; course_code: string | null; subject_name_az: string | null; education_year_name: string | null }[];
};

export type DepartmentOverviewResponse = {
  department: Record<string, any>;
  teacher_count: number;
  course_count: number;
  material_count: number;
};

export type DepartmentTeacherItem = {
  teacher_id: string;
  teacher_fullname: string | null;
  linked_to_department: boolean;
  course_count: number;
};

export type DepartmentCourseItem = {
  course_id: string;
  course_code: string | null;
  subject_name_az: string | null;
  education_year_id: string | null;
  education_year_name: string | null;
  material_count: number;
};

export type DepartmentCourseFileItem = {
  file_row_id: string;
  course_id: string;
  name: string | null;
  author_name: string | null;
  description: string | null;
  url: string | null;
  file_type: string | null;
  create_date: string | null;
};

export type AdminEducationPlanItem = {
  id: string;
  name: string | null;
  organization_id: string | null;
  specialty_name_az?: string | null;
  faculty_name_az?: string | null;
  org_name_az: string | null;
  education_type_id?: string | null;
  education_type_name_az: string | null;
  education_level_id?: string | null;
  education_level_name_az: string | null;
  status?: string | null;
  status_name_az: string | null;
  note: string | null;
  create_date: string | null;
  subject_count: number;
  group_count: number;
};

export type AdminEducationPlanStats = {
  bachelor_count: number;
  master_count: number;
  fulltime_count: number;
  parttime_count: number;
  total: number;
};

export type AdminEducationPlanListResponse = {
  items: AdminEducationPlanItem[];
  limit: number;
  offset: number;
  total: number;
  stats: AdminEducationPlanStats;
};

export type AdminSubjectGroupItem = {
  id: string;
  code: string | null;
  specialty_name_az: string | null;
  faculty_name_az: string | null;
  subject_name_az: string | null;
  semester_name_az: string | null;
  education_lang_name_az: string | null;
  education_type_name_az: string | null;
  education_year_name: string | null;
  status_name_az: string | null;
  education_plan_id: string | null;
  education_plan_name: string | null;
  edu_group_ids: string | null;
};

export type AdminSubjectGroupListResponse = {
  items: AdminSubjectGroupItem[];
  limit: number;
  offset: number;
  total: number;
};

export type AdminEducationPlanSubjectItem = {
  id: string;
  code: string | null;
  subject_name_az: string | null;
  semester_id: string | null;
  semester_name_az: string | null;
  subject_block_name_az: string | null;
  m_hours: number | null;
  s_hours: number | null;
  l_hours: number | null;
  credit: number | null;
  week_charge: number | null;
  type_name: string | null;
};

export type AdminEducationPlanDetailResponse = {
  plan: AdminEducationPlanItem & {
    education_type_id?: string | null;
    education_level_id?: string | null;
    status?: string | null;
  };
  subjects: AdminEducationPlanSubjectItem[];
  groups: { id: string; name: string | null; education_year_name: string | null }[];
};

export type AdminDictOption = { id: string; name_az: string | null; code?: string | null };

export type AdminEducationPlanLookups = {
  organizations: { id: string; name_az: string | null; faculty_name_az: string | null; formula: string | null }[];
  education_types: AdminDictOption[];
  education_levels: AdminDictOption[];
  statuses: AdminDictOption[];
  semesters: AdminDictOption[];
  subject_blocks: AdminDictOption[];
};

export type AdminCourseItem = {
  course_id: string;
  course_code: string | null;
  evaluation_type_id: string | null;
  education_year_id: string | null;
  education_year_name: string | null;
  subject_name_az: string | null;
  edu_group_ids: string;
};

export type AdminCourseListResponse = {
  items: AdminCourseItem[];
  limit: number;
  offset: number;
};

export type AdminCourseMeetingItem = {
  course_meeting_id: string;
  course_id: string;
  course_teacher_id: string | null;
  teacher_id: string | null;
  teacher_fullname: string | null;
  lesson_type_id: string | null;
  lesson_type_az: string | null;
  meeting_date: string | null;
  clock_id: string | null;
  start_time: string | null;
  end_time: string | null;
  room_id: string | null;
  room_name: string | null;
  point_status: string | null;
};

export type AdminCourseMeetingListResponse = {
  course_id: string;
  items: AdminCourseMeetingItem[];
};

export type AdminBulkCreateMeetingsRequest = {
  from_date: string; // YYYY-MM-DD
  to_date: string; // YYYY-MM-DD
  course_hours: 30 | 45 | 60 | 75 | 90;
  shift: 1 | 2;
  upper_week: { lecture: number; seminar: number; lab: number };
  lower_week: { lecture: number; seminar: number; lab: number };
  course_teacher_id?: string | null;
  room_id?: string | null;
  skip_existing?: boolean;
  lesson_type_ids?: { lecture?: string | null; seminar?: string | null; lab?: string | null } | null;
};

export type AdminBulkCreateMeetingsResponse = {
  created_count: number;
  skipped_count: number;
  created_ids: string[];
};

export type TeacherCourseItem = {
  course_teacher_id: string;
  course_id: string;
  course_code?: string | null;
  lesson_type_id: string | null;
  subject_name_az: string | null;
  education_year_name: string | null;
  lesson_type_az: string | null;
};

export type TeacherCoursesResponse = {
  current_education_year_id: number | null;
  current_education_year_name: string | null;
  teaching_current: TeacherCourseItem[];
  teaching_past: TeacherCourseItem[];
  attestation: TeacherCourseItem[];
  practice: TeacherCourseItem[];
};

export type StudentCourseItem = {
  course_student_id: string;
  course_id: string;
  subject_name_az: string | null;
  education_year_name: string | null;
};

export type StudentCoursesResponse = {
  current_education_year_id: number | null;
  current_education_year_name: string | null;
  current: StudentCourseItem[];
  past: StudentCourseItem[];
  future: StudentCourseItem[];
  attestation: StudentCourseItem[];
  practice: StudentCourseItem[];
};

export type CourseMeetingItem = {
  course_meeting_id: string;
  meeting_date: string | null;
  clock_id: string | null;
  start_time: string | null;
  end_time: string | null;
  point_status: string | null;
  lesson_type_id?: string | null;
  lesson_type_az?: string | null;
};

export type CourseMeetingListResponse = {
  course_id: string;
  course_teacher_id: string;
  lesson_type_id: string | null;
  meetings: CourseMeetingItem[];
};

export type StudentRosterItem = {
  student_id: string;
  person_fullname: string;
};

export type StudentRosterResponse = {
  course_id: string;
  students: StudentRosterItem[];
};

export type CourseEvaluationItem = {
  course_eva_id: string;
  eva_type_id: string;
  evaluation_id: string;
  evaluation_code: string | null;
  evaluation_name_az: string | null;
  max_point: number | null;
};

export type CourseEvaluationsResponse = {
  course_id: string;
  evaluations: CourseEvaluationItem[];
};

export type JournalCell = {
  student_id: string;
  course_eva_id: string;
  value: string | null;
  confirmed?: boolean;
};

export type JournalGridResponse = {
  course_id: string;
  course_meeting_id: string;
  cells: JournalCell[];
  meeting_confirmed?: boolean;
  editable?: boolean;
};

export type JournalUpsertRequest = {
  student_id: string;
  course_eva_id: string;
  course_meeting_id: string;
  value: string | null;
};

export type JournalConfirmRequest = {
  course_meeting_id: string;
};

export type JournalPointsGridResponse = {
  course_id: string;
  cells: JournalCell[];
};

export type JournalPointUpsertRequest = {
  student_id: string;
  course_eva_id: string;
  value: string | null;
};

export type JournalResultItem = {
  student_id: string;
  full_name: string | null;
  davamiyyet: number;
  aktivlik: number;
  collokvium: number;
  serbestish: number;
  imtahana_qederki_bal: number;
  imtahan: number;
  yekun_bal: number;
};

export type JournalResultResponse = {
  course_id: string;
  results: JournalResultItem[];
};

export type CourseExerciseItem = {
  course_execises_id: string;
  type: string;
  start_date: string | null;
  end_date: string | null;
  editable: boolean;
  confirmed?: boolean;
};

export type CourseExerciseListResponse = {
  course_id: string;
  type: string;
  items: CourseExerciseItem[];
};

export type CourseExerciseCreateRequest = {
  type: string; // "colloquium" | "referat"
  start_date: string; // YYYY-MM-DD
};

export type CourseExercisePointCell = {
  student_id: string;
  course_execises_id: string;
  value: string | null;
};

export type CourseExercisePointsResponse = {
  course_id: string;
  type: string;
  course_execises_id: string;
  start_date: string | null;
  end_date: string | null;
  editable: boolean;
  confirmed?: boolean;
  cells: CourseExercisePointCell[];
};

export type CourseExercisePointUpsertRequest = {
  student_id: string;
  value: string | null;
};

/** Server komponentlər üçün — brauzer çərəzini Next SSR-ə ötürür */
export async function getMe(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) {
    return null;
  }
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/auth/me`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export async function getTeacherCourses(): Promise<TeacherCoursesResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) {
    return null;
  }
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/teacher/courses`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) {
    return null;
  }
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export async function getStudentCourses(): Promise<StudentCoursesResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) {
    return null;
  }
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/student/courses`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) {
    return null;
  }
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export async function getTeacherCourseMeetings(
  courseTeacherId: string,
  lessonTypeId?: string | null
): Promise<CourseMeetingListResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const qs = lessonTypeId != null ? `?lesson_type_id=${encodeURIComponent(String(lessonTypeId))}` : "";
  const res = await fetch(`${origin}/api/teacher/courses/${courseTeacherId}/meetings${qs}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function adminListGroups(q?: string | null, limit = 50, offset = 0): Promise<AdminGroupListResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const params = new URLSearchParams();
  if (q != null && String(q).trim()) params.set("q", String(q).trim());
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  const res = await fetch(`${origin}/api/admin/groups?${params.toString()}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function adminGetGroupDetail(educationGroupId: string): Promise<AdminGroupDetailResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/admin/groups/${encodeURIComponent(String(educationGroupId))}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function adminListTeachers(q?: string | null, limit = 50, offset = 0): Promise<AdminTeacherListResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const params = new URLSearchParams();
  if (q != null && String(q).trim()) params.set("q", String(q).trim());
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  const res = await fetch(`${origin}/api/admin/teachers?${params.toString()}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function adminGetTeacherDetail(teacherId: string): Promise<AdminTeacherDetailResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/admin/teachers/${encodeURIComponent(String(teacherId))}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function adminListDepartments(q?: string | null, limit = 50, offset = 0): Promise<AdminDepartmentListResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const params = new URLSearchParams();
  if (q != null && String(q).trim()) params.set("q", String(q).trim());
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  const res = await fetch(`${origin}/api/admin/departments?${params.toString()}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function adminGetDepartmentDetail(departmentId: string): Promise<AdminDepartmentDetailResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/admin/departments/${encodeURIComponent(String(departmentId))}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function getDepartmentOverview(): Promise<DepartmentOverviewResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/department/overview`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function getDepartmentTeachers(q?: string | null, limit = 100, offset = 0) {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const params = new URLSearchParams();
  if (q != null && String(q).trim()) params.set("q", String(q).trim());
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  const res = await fetch(`${origin}/api/department/teachers?${params.toString()}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json() as Promise<{ items: DepartmentTeacherItem[] }>;
}

export async function getDepartmentCourses(q?: string | null, limit = 100, offset = 0) {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const params = new URLSearchParams();
  if (q != null && String(q).trim()) params.set("q", String(q).trim());
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  const res = await fetch(`${origin}/api/department/courses?${params.toString()}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json() as Promise<{ items: DepartmentCourseItem[] }>;
}

export async function getDepartmentCourseFiles(courseId: string) {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/department/courses/${encodeURIComponent(courseId)}/files`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json() as Promise<{ course_id: string; items: DepartmentCourseFileItem[] }>;
}

export async function adminListEducationPlans(opts?: {
  q?: string | null;
  education_type_id?: string | null;
  education_level_id?: string | null;
  status_id?: string | null;
  limit?: number;
  offset?: number;
}): Promise<AdminEducationPlanListResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const params = new URLSearchParams();
  const q = opts?.q;
  if (q != null && String(q).trim()) params.set("q", String(q).trim());
  if (opts?.education_type_id) params.set("education_type_id", String(opts.education_type_id));
  if (opts?.education_level_id) params.set("education_level_id", String(opts.education_level_id));
  if (opts?.status_id) params.set("status_id", String(opts.status_id));
  params.set("limit", String(opts?.limit ?? 20));
  params.set("offset", String(opts?.offset ?? 0));
  const res = await fetch(`${origin}/api/admin/education-plans?${params.toString()}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function adminListSubjectGroups(opts?: {
  q?: string | null;
  education_plan_id?: string | null;
  education_year_id?: string | null;
  semester_id?: string | null;
  limit?: number;
  offset?: number;
}): Promise<AdminSubjectGroupListResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const params = new URLSearchParams();
  if (opts?.q != null && String(opts.q).trim()) params.set("q", String(opts.q).trim());
  if (opts?.education_plan_id) params.set("education_plan_id", String(opts.education_plan_id));
  if (opts?.education_year_id) params.set("education_year_id", String(opts.education_year_id));
  if (opts?.semester_id) params.set("semester_id", String(opts.semester_id));
  params.set("limit", String(opts?.limit ?? 20));
  params.set("offset", String(opts?.offset ?? 0));
  const res = await fetch(`${origin}/api/admin/subject-groups?${params.toString()}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function adminGetEducationPlan(planId: string): Promise<AdminEducationPlanDetailResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/admin/education-plans/${encodeURIComponent(String(planId))}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function adminEducationPlanLookups(): Promise<AdminEducationPlanLookups | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/admin/education-plans/lookups`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function adminListCourses(
  q?: string | null,
  educationGroupId?: string | null,
  educationYearId?: string | null,
  limit = 50,
  offset = 0
): Promise<AdminCourseListResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const params = new URLSearchParams();
  if (q != null && String(q).trim()) params.set("q", String(q).trim());
  if (educationGroupId != null && String(educationGroupId).trim()) params.set("education_group_id", String(educationGroupId).trim());
  if (educationYearId != null && String(educationYearId).trim()) params.set("education_year_id", String(educationYearId).trim());
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  const res = await fetch(`${origin}/api/admin/courses?${params.toString()}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function adminListCourseMeetings(
  courseId: string,
  fromDate?: string | null,
  toDate?: string | null
): Promise<AdminCourseMeetingListResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const params = new URLSearchParams();
  if (fromDate != null && String(fromDate).trim()) params.set("from_date", String(fromDate).trim());
  if (toDate != null && String(toDate).trim()) params.set("to_date", String(toDate).trim());
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${origin}/api/admin/courses/${encodeURIComponent(String(courseId))}/meetings${qs}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function adminBulkCreateCourseMeetings(
  courseId: string,
  body: AdminBulkCreateMeetingsRequest
): Promise<AdminBulkCreateMeetingsResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/admin/courses/${encodeURIComponent(String(courseId))}/meetings/bulk`, {
    method: "POST",
    headers: { cookie: header, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function getTeacherCourseRoster(courseId: string): Promise<StudentRosterResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/teacher/courses/${courseId}/roster`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function getTeacherCourseEvaluations(courseId: string): Promise<CourseEvaluationsResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/teacher/courses/${courseId}/evaluations`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function getTeacherJournalGrid(courseId: string, meetingId: string): Promise<JournalGridResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/teacher/courses/${courseId}/journal?course_meeting_id=${meetingId}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function upsertTeacherJournalCell(courseId: string, body: JournalUpsertRequest): Promise<JournalGridResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/teacher/courses/${courseId}/journal`, {
    method: "POST",
    headers: { cookie: header, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function getTeacherJournalPointsGrid(courseId: string): Promise<JournalPointsGridResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/teacher/courses/${courseId}/journal-points`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function upsertTeacherJournalPoint(
  courseId: string,
  body: JournalPointUpsertRequest
): Promise<JournalPointsGridResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/teacher/courses/${courseId}/journal-points`, {
    method: "POST",
    headers: { cookie: header, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function getTeacherJournalResult(courseId: string): Promise<JournalResultResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/teacher/courses/${courseId}/journal-result`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function getTeacherJournalResultSimple(courseId: string): Promise<JournalResultResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/teacher/courses/${courseId}/journal-result-simple`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function getTeacherCourseExercises(courseId: string, type: string): Promise<CourseExerciseListResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/teacher/courses/${courseId}/course-exercises?type=${encodeURIComponent(type)}`, {
    headers: { cookie: header },
    cache: "no-store",
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function createTeacherCourseExercise(courseId: string, body: CourseExerciseCreateRequest): Promise<CourseExerciseItem | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(`${origin}/api/teacher/courses/${courseId}/course-exercises`, {
    method: "POST",
    headers: { cookie: header, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function getTeacherCourseExercisePoints(
  courseId: string,
  type: string,
  courseExecisesId: string
): Promise<CourseExercisePointsResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(
    `${origin}/api/teacher/courses/${courseId}/course-exercises/${courseExecisesId}/points?type=${encodeURIComponent(type)}`,
    { headers: { cookie: header }, cache: "no-store" }
  );
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function upsertTeacherCourseExercisePoint(
  courseId: string,
  type: string,
  courseExecisesId: string,
  body: CourseExercisePointUpsertRequest
): Promise<CourseExercisePointsResponse | null> {
  const cookieStore = await cookies();
  const header = cookieStore.toString();
  if (!header) return null;
  const origin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://localhost:3000";
  const res = await fetch(
    `${origin}/api/teacher/courses/${courseId}/course-exercises/${courseExecisesId}/points?type=${encodeURIComponent(type)}`,
    {
      method: "POST",
      headers: { cookie: header, "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json();
}

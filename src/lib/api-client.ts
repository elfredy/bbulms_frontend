import type {
  CourseExerciseCreateRequest,
  CourseExerciseItem,
  CourseExerciseListResponse,
  CourseExercisePointsResponse,
  CourseExercisePointUpsertRequest,
  JournalConfirmRequest,
  JournalGridResponse,
  JournalPointsGridResponse,
  JournalResultResponse,
  JournalUpsertRequest,
  JournalPointUpsertRequest,
} from "./api";

async function jsonOrNull<T>(res: Response): Promise<T | null> {
  if (!res.ok) return null;
  return res.json();
}

async function readErrorDetail(res: Response): Promise<string | null> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) return data.detail.map((d: any) => d?.msg ?? String(d)).join("; ");
  } catch {
    /* ignore */
  }
  return null;
}

export async function getTeacherJournalGrid(courseId: string, meetingId: string): Promise<JournalGridResponse | null> {
  const res = await fetch(`/api/teacher/courses/${courseId}/journal?course_meeting_id=${encodeURIComponent(String(meetingId))}`, {
    credentials: "include",
    cache: "no-store",
  });
  return jsonOrNull(res);
}

export async function upsertTeacherJournalCell(
  courseId: string,
  body: JournalUpsertRequest
): Promise<{ ok: true; data: JournalGridResponse } | { ok: false; error: string }> {
  const res = await fetch(`/api/teacher/courses/${courseId}/journal`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return { ok: false, error: (await readErrorDetail(res)) || "Yadda saxlanmadı" };
  }
  const data = (await res.json()) as JournalGridResponse;
  return { ok: true, data };
}

export async function confirmTeacherJournalMeeting(courseId: string, body: JournalConfirmRequest): Promise<JournalGridResponse | null> {
  const res = await fetch(`/api/teacher/courses/${courseId}/journal/confirm`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOrNull(res);
}

export async function getTeacherJournalPointsGrid(courseId: string): Promise<JournalPointsGridResponse | null> {
  const res = await fetch(`/api/teacher/courses/${courseId}/journal-points`, {
    credentials: "include",
    cache: "no-store",
  });
  return jsonOrNull(res);
}

export async function upsertTeacherJournalPoint(courseId: string, body: JournalPointUpsertRequest): Promise<JournalPointsGridResponse | null> {
  const res = await fetch(`/api/teacher/courses/${courseId}/journal-points`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOrNull(res);
}

export async function getTeacherJournalResult(courseId: string): Promise<JournalResultResponse | null> {
  const res = await fetch(`/api/teacher/courses/${courseId}/journal-result`, {
    credentials: "include",
    cache: "no-store",
  });
  return jsonOrNull(res);
}

export async function getTeacherJournalResultSimple(courseId: string): Promise<JournalResultResponse | null> {
  const res = await fetch(`/api/teacher/courses/${courseId}/journal-result-simple`, {
    credentials: "include",
    cache: "no-store",
  });
  return jsonOrNull(res);
}

export async function getTeacherCourseExercises(courseId: string, type: string): Promise<CourseExerciseListResponse | null> {
  const res = await fetch(`/api/teacher/courses/${courseId}/course-exercises?type=${encodeURIComponent(type)}`, {
    credentials: "include",
    cache: "no-store",
  });
  return jsonOrNull(res);
}

export async function createTeacherCourseExercise(courseId: string, body: CourseExerciseCreateRequest): Promise<CourseExerciseItem | null> {
  const res = await fetch(`/api/teacher/courses/${courseId}/course-exercises`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOrNull(res);
}

export async function getTeacherCourseExercisePoints(
  courseId: string,
  type: string,
  courseExecisesId: string
): Promise<CourseExercisePointsResponse | null> {
  const res = await fetch(
    `/api/teacher/courses/${courseId}/course-exercises/${courseExecisesId}/points?type=${encodeURIComponent(type)}`,
    { credentials: "include", cache: "no-store" }
  );
  return jsonOrNull(res);
}

export async function upsertTeacherCourseExercisePoint(
  courseId: string,
  type: string,
  courseExecisesId: string,
  body: CourseExercisePointUpsertRequest
): Promise<CourseExercisePointsResponse | null> {
  const res = await fetch(
    `/api/teacher/courses/${courseId}/course-exercises/${courseExecisesId}/points?type=${encodeURIComponent(type)}`,
    {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  return jsonOrNull(res);
}

export async function confirmTeacherCourseExercise(
  courseId: string,
  type: string,
  courseExecisesId: string
): Promise<CourseExercisePointsResponse | null> {
  const res = await fetch(
    `/api/teacher/courses/${courseId}/course-exercises/${courseExecisesId}/confirm?type=${encodeURIComponent(type)}`,
    {
      method: "POST",
      credentials: "include",
    }
  );
  return jsonOrNull(res);
}

export type TimetableLookups = {
  faculties: { id: string; name_az: string | null }[];
  years: { id: string; name: string | null }[];
  semesters: { id: string; code: string | null; name_az: string | null }[];
  subject_types: { id: string; code: string | null; name_az: string | null }[];
  clocks: { id: string; start_time: string | null; end_time: string | null }[];
  rooms: { id: string; name: string | null; faculty_id: string | null }[];
  kurs_options: number[];
  days: { week_day: number; label: string }[];
};

export type TimetableGroupItem = {
  education_group_id: string;
  education_group_name: string | null;
  education_year_name?: string | null;
  faculty_name_az?: string | null;
  kurs?: number | null;
};

export type TimetableAvailableLesson = {
  course_id: string;
  course_code: string | null;
  subject_name_az: string | null;
  course_teacher_id: string | null;
  teacher_id: string | null;
  lesson_type_id: string;
  lesson_code: string | null;
  lesson_type_az: string | null;
  lesson_letter: string;
  week_charge: number;
  up_hours: number;
  down_hours: number;
  remaining_up: number;
  remaining_down: number;
  remaining: number;
};

export type TimetableAssignedSlot = {
  course_id: string;
  lesson_type_id: string;
  clock_id: string;
  week_day: number;
  week_type: number;
  subject_name_az: string | null;
  lesson_code: string | null;
  lesson_type_az: string | null;
  lesson_letter: string;
  room_name: string | null;
  room_id: string | null;
};

export type TimetableBoard = {
  clocks: { id: string; start_time: string | null; end_time: string | null }[];
  assigned: TimetableAssignedSlot[];
  available: TimetableAvailableLesson[];
  meeting_count?: number;
  pending_count?: number;
  confirmed_count?: number;
  teacher_count?: number;
  confirmed?: boolean;
};

export async function adminTimetableLookups(): Promise<TimetableLookups | null> {
  const res = await fetch("/api/admin/timetable/lookups", { credentials: "include", cache: "no-store" });
  return jsonOrNull(res);
}

export async function adminTimetableGroups(opts: {
  faculty_id: string;
  education_year_id: string;
  kurs?: number | null;
}): Promise<{ items: TimetableGroupItem[] } | null> {
  const params = new URLSearchParams({
    faculty_id: opts.faculty_id,
    education_year_id: opts.education_year_id,
  });
  if (opts.kurs != null) params.set("kurs", String(opts.kurs));
  const res = await fetch(`/api/admin/timetable/groups?${params}`, { credentials: "include", cache: "no-store" });
  return jsonOrNull(res);
}

export async function adminTimetableBoard(opts: {
  education_group_id: string;
  education_year_id: string;
  semester_id: string;
  subject_type_id?: string;
}): Promise<TimetableBoard | null> {
  const params = new URLSearchParams({
    education_group_id: opts.education_group_id,
    education_year_id: opts.education_year_id,
    semester_id: opts.semester_id,
  });
  if (opts.subject_type_id) params.set("subject_type_id", opts.subject_type_id);
  const res = await fetch(`/api/admin/timetable/board?${params}`, { credentials: "include", cache: "no-store" });
  return jsonOrNull(res);
}

export async function adminTimetablePlace(body: {
  education_group_id: string;
  education_year_id: string;
  semester_id: string;
  course_id: string;
  lesson_type_id: string;
  clock_id: string;
  week_day: number;
  week_type: number;
  room_id?: string | null;
}): Promise<{ ok: true; created_count: number } | { ok: false; error: string }> {
  const res = await fetch("/api/admin/timetable/place", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, error: (await readErrorDetail(res)) || "Yerləşdirilmədi" };
  const data = (await res.json()) as { created_count?: number };
  return { ok: true, created_count: Number(data.created_count ?? 0) };
}

export async function adminTimetableUnplace(body: {
  education_group_id: string;
  course_id: string;
  lesson_type_id: string;
  clock_id: string;
  week_day: number;
  week_type: number;
}): Promise<{ ok: true; removed_count: number } | { ok: false; error: string }> {
  const res = await fetch("/api/admin/timetable/unplace", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, error: (await readErrorDetail(res)) || "Silinmədi" };
  const data = (await res.json()) as { removed_count?: number };
  return { ok: true, removed_count: Number(data.removed_count ?? 0) };
}

export async function adminTimetableSetRoom(body: {
  education_group_id: string;
  course_id: string;
  lesson_type_id: string;
  clock_id: string;
  week_day: number;
  week_type: number;
  room_id: string | null;
}): Promise<{ ok: true; updated_count: number } | { ok: false; error: string }> {
  const res = await fetch("/api/admin/timetable/room", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, error: (await readErrorDetail(res)) || "Otaq dəyişdirilmədi" };
  const data = (await res.json()) as { updated_count?: number };
  return { ok: true, updated_count: Number(data.updated_count ?? 0) };
}

export async function adminTimetableConfirm(body: {
  education_group_id: string;
  education_year_id: string;
  semester_id: string;
}): Promise<
  | { ok: true; updated_count: number; teacher_count: number; confirmed: boolean; meeting_count: number }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/admin/timetable/confirm", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, error: (await readErrorDetail(res)) || "Təsdiqlənmədi" };
  const data = (await res.json()) as {
    updated_count?: number;
    teacher_count?: number;
    confirmed?: boolean;
    meeting_count?: number;
  };
  return {
    ok: true,
    updated_count: Number(data.updated_count ?? 0),
    teacher_count: Number(data.teacher_count ?? 0),
    confirmed: Boolean(data.confirmed),
    meeting_count: Number(data.meeting_count ?? 0),
  };
}

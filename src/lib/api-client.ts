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

export async function getTeacherJournalGrid(courseId: string, meetingId: string): Promise<JournalGridResponse | null> {
  const res = await fetch(`/api/teacher/courses/${courseId}/journal?course_meeting_id=${encodeURIComponent(String(meetingId))}`, {
    credentials: "include",
    cache: "no-store",
  });
  return jsonOrNull(res);
}

export async function upsertTeacherJournalCell(courseId: string, body: JournalUpsertRequest): Promise<JournalGridResponse | null> {
  const res = await fetch(`/api/teacher/courses/${courseId}/journal`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOrNull(res);
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

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { JournalClient } from "./ui";

import {
  getMe,
  getTeacherCourseEvaluations,
  getTeacherCourseMeetings,
  getTeacherCourseRoster,
  getTeacherCourses,
  type TeacherCourseItem,
} from "@/lib/api";

function uniqueNames(values: (string | null | undefined)[]): string | null {
  const set = new Set<string>();
  for (const v of values) {
    if (!v) continue;
    for (const part of String(v).split(",")) {
      const name = part.trim();
      if (name) set.add(name);
    }
  }
  const arr = Array.from(set);
  return arr.length ? arr.join(", ") : null;
}

function allTeacherCourseItems(courses: Awaited<ReturnType<typeof getTeacherCourses>>): TeacherCourseItem[] {
  if (!courses) return [];
  return [...courses.teaching_current, ...courses.teaching_past, ...courses.attestation, ...courses.practice];
}

const JOURNAL_TABS = new Set(["summary", "lessons", "files", "attendance", "exam", "referat", "colloquium"]);

type Props = {
  params: Promise<{ locale: string; courseTeacherId: string }>;
  searchParams?: Promise<{ ct_ids?: string; tab?: string }>;
};

export default async function JournalPage({ params, searchParams }: Props) {
  const { locale, courseTeacherId } = await params;
  const t = await getTranslations("journal");

  const user = await getMe();
  if (!user) {
    redirect(`/${locale}/login`);
  }
  if (user.teacher_id == null) {
    redirect(`/${locale}/dashboard`);
  }

  const ctId = String(courseTeacherId || "").trim();
  if (!ctId) {
    redirect(`/${locale}/dashboard`);
  }

  const sp = (await searchParams) ?? {};
  const tabRaw = String(sp.tab ?? "").trim();
  const initialTab = JOURNAL_TABS.has(tabRaw) ? (tabRaw as "summary" | "lessons" | "files" | "attendance" | "exam" | "referat" | "colloquium") : undefined;
  const ctIdsRaw = String(sp.ct_ids ?? "").trim();
  const ctIds = Array.from(
    new Set(
      (ctIdsRaw ? ctIdsRaw.split(",") : [ctId])
        .map((x) => String(x).trim())
        .filter(Boolean)
    )
  );

  const meetingLists = await Promise.all(ctIds.map((id) => getTeacherCourseMeetings(id)));
  const firstOk = meetingLists.find(Boolean);
  if (!firstOk) return <p>{t("loadError")}</p>;

  const courseId = firstOk.course_id;
  const mergedMeetings = meetingLists
    .filter(Boolean)
    .flatMap((m) => m!.meetings)
    .map((m) => ({
      ...m,
      meeting_date: m.meeting_date,
    }));

  const uniqueById = new Map<string, any>();
  for (const m of mergedMeetings) uniqueById.set(String(m.course_meeting_id), m);
  const meetings = Array.from(uniqueById.values()).sort((a, b) => {
    const da = String(a.meeting_date ?? "");
    const db = String(b.meeting_date ?? "");
    const na = /^\d{4}-\d{2}-\d{2}/.test(da) ? da.slice(0, 10) : da;
    const nb = /^\d{4}-\d{2}-\d{2}/.test(db) ? db.slice(0, 10) : db;
    if (na !== nb) return na.localeCompare(nb);
    const ta = String(a.start_time ?? "");
    const tb = String(b.start_time ?? "");
    if (ta !== tb) return ta.localeCompare(tb);
    return String(a.course_meeting_id).localeCompare(String(b.course_meeting_id));
  });

  const [roster, evals, teacherCourses] = await Promise.all([
    getTeacherCourseRoster(courseId, ctIds),
    getTeacherCourseEvaluations(courseId),
    getTeacherCourses(),
  ]);
  if (!roster || !evals) {
    return <p>{t("loadError")}</p>;
  }

  const allItems = allTeacherCourseItems(teacherCourses);
  const matchedByCt = allItems.filter((c) => ctIds.includes(String(c.course_teacher_id)));
  const matchedCourses = matchedByCt.length
    ? matchedByCt
    : allItems.filter((c) => String(c.course_id) === String(courseId));
  const educationGroupName = uniqueNames(matchedCourses.map((c) => c.education_group_name));
  const halfGroupName = uniqueNames(matchedCourses.map((c) => c.half_group_az));
  const subjectName = matchedCourses.find((c) => c.subject_name_az?.trim())?.subject_name_az?.trim() || null;

  return (
    <JournalClient
      locale={locale}
      courseTeacherId={ctId}
      courseId={courseId}
      educationGroupName={educationGroupName}
      halfGroupName={halfGroupName}
      subjectName={subjectName}
      lessonTypeId={firstOk.lesson_type_id}
      meetings={meetings}
      roster={roster.students}
      evaluations={evals.evaluations}
      initialTab={initialTab}
    />
  );
}


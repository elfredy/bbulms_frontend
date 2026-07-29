import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { JournalClient } from "./ui";

import { getMe, getTeacherCourseEvaluations, getTeacherCourseMeetings, getTeacherCourseRoster } from "@/lib/api";

type Props = {
  params: Promise<{ locale: string; courseTeacherId: string }>;
  searchParams?: Promise<{ ct_ids?: string }>;
};

export default async function JournalPage({ params, searchParams }: Props) {
  const { locale, courseTeacherId } = await params;
  const t = await getTranslations("journal");

  const user = await getMe();
  if (!user) {
    redirect(`/${locale}/login`);
  }
  if (user.user_type !== "TEACHER" || user.teacher_id == null) {
    redirect(`/${locale}/dashboard`);
  }

  const ctId = String(courseTeacherId || "").trim();
  if (!ctId) {
    redirect(`/${locale}/dashboard`);
  }

  const sp = (await searchParams) ?? {};
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
    if (da === db) return String(b.course_meeting_id).localeCompare(String(a.course_meeting_id));
    return db.localeCompare(da);
  });

  const roster = await getTeacherCourseRoster(courseId);
  const evals = await getTeacherCourseEvaluations(courseId);
  if (!roster || !evals) {
    return <p>{t("loadError")}</p>;
  }

  return (
    <JournalClient
      locale={locale}
      courseTeacherId={ctId}
      courseId={courseId}
      lessonTypeId={firstOk.lesson_type_id}
      meetings={meetings}
      roster={roster.students}
      evaluations={evals.evaluations}
    />
  );
}


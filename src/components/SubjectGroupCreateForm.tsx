"use client";

import { useLocale } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { SearchableSelect } from "./SearchableSelect";
import styles from "./SubjectGroupCreateForm.module.css";

type Opt = {
  id: string;
  name_az?: string | null;
  name?: string | null;
  code?: string | null;
  faculty_name_az?: string | null;
  organization_id?: string | null;
  education_level_id?: string | null;
  education_type_id?: string | null;
  group_name?: string | null;
  season_code?: string | null;
  start_date?: string | null;
  org_name_az?: string | null;
  position_name_az?: string | null;
};
type SubjectOpt = Opt & {
  semester_id?: string | null;
  semester_name_az?: string | null;
  m_hours?: number | null;
  s_hours?: number | null;
  l_hours?: number | null;
  fm_hours?: number | null;
  week_charge?: number | null;
  m_week_charge?: number | null;
  s_week_charge?: number | null;
  l_week_charge?: number | null;
  fm_week_charge?: number | null;
  course_work?: number | null;
};
type EvaRow = {
  eva_type_id: string;
  name_az: string | null;
  point: number | null;
  successful_pass_percent: number | null;
  automatic: boolean;
  access_s: boolean;
  access_l: boolean;
};
type TeacherPick = { teacher_id: string; lesson_type_id: string };
type HalfPick = { half_group_id: string; lesson_type_id: string; teacher_id: string };

type Lookups = {
  organizations: Opt[];
  education_types: Opt[];
  education_levels: Opt[];
  education_langs: Opt[];
  course_semesters: Opt[];
  course_types: Opt[];
  education_years: Opt[];
  plans: Opt[];
  evaluation_types: Opt[];
  lesson_types: Opt[];
  half_groups: Opt[];
  course_work_options: Opt[];
};

function labelOf(o: Opt) {
  if (o.faculty_name_az) return [o.name_az, o.code, o.faculty_name_az].filter(Boolean).join(" — ");
  return o.name_az || o.name || o.id;
}

function subjectLabel(o: SubjectOpt) {
  const hours = [
    o.m_hours ? `${o.m_hours}m` : null,
    o.s_hours ? `${o.s_hours}s` : null,
    o.l_hours ? `${o.l_hours}l` : null,
    o.fm_hours ? `${o.fm_hours}k` : null,
  ].filter(Boolean).join("/");
  return [o.name_az || o.id, o.code ? `(${o.code})` : "", hours, o.semester_name_az ? `· ${o.semester_name_az}` : ""]
    .filter(Boolean)
    .join(" ");
}

function teacherSearchLabel(t: { id: string; name?: string | null; org_name_az?: string | null; position_name_az?: string | null }) {
  return [t.position_name_az, t.name || t.id, t.org_name_az].filter(Boolean).join(" · ");
}

function n0(v: number | null | undefined) {
  return String(v ?? 0);
}

async function readDetail(res: Response, fallback: string) {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function SubjectGroupCreateForm({
  initialPlanId,
  initialCourseId,
}: {
  initialPlanId?: string | null;
  initialCourseId?: string | null;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [tab, setTab] = useState<"general" | "teacher" | "students" | "half">("general");
  const [courseWork, setCourseWork] = useState("1");
  const [levelId, setLevelId] = useState("");
  const [orgId, setOrgId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [planId, setPlanId] = useState(initialPlanId ?? "");
  const [planSemesterId, setPlanSemesterId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [yearId, setYearId] = useState("");
  const [langId, setLangId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [groupTypeId, setGroupTypeId] = useState("");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [mHours, setMHours] = useState("");
  const [sHours, setSHours] = useState("");
  const [lHours, setLHours] = useState("");
  const [fmHours, setFmHours] = useState("");
  const [mWeek, setMWeek] = useState("");
  const [sWeek, setSWeek] = useState("");
  const [lWeek, setLWeek] = useState("");
  const [fmWeek, setFmWeek] = useState("");
  const [evaluationType, setEvaluationType] = useState("MS");
  const [evas, setEvas] = useState<EvaRow[]>([]);
  const [planSemesters, setPlanSemesters] = useState<Opt[]>([]);
  const [subjects, setSubjects] = useState<SubjectOpt[]>([]);
  const [groups, setGroups] = useState<Opt[]>([]);
  const [teachers, setTeachers] = useState<Opt[]>([]);
  const [teacherPicks, setTeacherPicks] = useState<TeacherPick[]>([{ teacher_id: "", lesson_type_id: "" }]);
  const [students, setStudents] = useState<Opt[]>([]);
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [halfPicks, setHalfPicks] = useState<HalfPick[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdCourseId, setCreatedCourseId] = useState(initialCourseId ?? "");
  const skipCascade = useRef({
    students: Boolean(initialCourseId),
    startDate: Boolean(initialCourseId),
    evas: Boolean(initialCourseId),
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/subject-groups/lookups", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Lookups | null) => {
        if (cancelled || !data) return;
        setLookups(data);
        if (initialCourseId) return;
        const az = data.education_langs.find((x) => (x.name_az || "").toLowerCase().includes("azərbaycan"));
        const main = data.course_types.find((x) => (x.name_az || "").toLowerCase().includes("əsas"));
        const year = data.education_years[0];
        const sem = data.lesson_types.find((x) => (x.name_az || "").toLowerCase().includes("seminar"));
        if (az) setLangId(az.id);
        if (main) setGroupTypeId(main.id);
        if (year) setYearId(year.id);
        if (data.evaluation_types.some((x) => x.id === "MS")) setEvaluationType("MS");
        if (sem) {
          setTeacherPicks((prev) => prev.map((p) => ({ ...p, lesson_type_id: p.lesson_type_id || sem.id })));
        }
      })
      .catch(() => {
        if (!cancelled) setError("Lookup məlumatı yüklənmədi.");
      });
    return () => {
      cancelled = true;
    };
  }, [initialCourseId]);

  useEffect(() => {
    if (!initialPlanId || !lookups || initialCourseId) return;
    applyPlan(initialPlanId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlanId, lookups, initialCourseId]);

  useEffect(() => {
    if (!initialCourseId || !lookups) return;
    let cancelled = false;
    fetch(`/api/admin/subject-groups/${encodeURIComponent(initialCourseId)}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) {
          if (!cancelled) setError("Fənn qrupu tapılmadı.");
          return;
        }
        skipCascade.current = { students: true, startDate: true, evas: true };
        setCreatedCourseId(String(d.id || initialCourseId));
        setCourseWork(String(d.course_work ?? 0));
        if (d.education_level_id) setLevelId(String(d.education_level_id));
        if (d.organization_id) setOrgId(String(d.organization_id));
        if (d.education_type_id) setTypeId(String(d.education_type_id));
        if (d.education_plan_id) setPlanId(String(d.education_plan_id));
        if (d.plan_semester_id) setPlanSemesterId(String(d.plan_semester_id));
        if (d.education_plan_subject_id) setSubjectId(String(d.education_plan_subject_id));
        if (d.education_year_id) setYearId(String(d.education_year_id));
        if (d.education_lang_id) setLangId(String(d.education_lang_id));
        if (d.semester_id) setSemesterId(String(d.semester_id));
        if (d.start_date) setStartDate(String(d.start_date));
        if (d.type_id) setGroupTypeId(String(d.type_id));
        setGroupIds(Array.isArray(d.education_group_ids) ? d.education_group_ids.map(String) : []);
        setNote(d.note ?? "");
        setMHours(n0(d.m_hours));
        setSHours(n0(d.s_hours));
        setLHours(n0(d.l_hours));
        setFmHours(n0(d.fm_hours));
        setMWeek(n0(d.m_week_charge));
        setSWeek(n0(d.s_week_charge));
        setLWeek(n0(d.l_week_charge));
        setFmWeek(n0(d.fm_week_charge));
        if (d.evaluation_type_id) setEvaluationType(String(d.evaluation_type_id));
        const evaRows = ((d.evaluations ?? []) as EvaRow[]).map((row) => ({
          ...row,
          automatic: Boolean(row.automatic),
          access_s: Boolean(row.access_s),
          access_l: Boolean(row.access_l),
        }));
        if (evaRows.length) setEvas(evaRows);
        const tch = (d.teachers ?? []) as TeacherPick[];
        setTeacherPicks(tch.length ? tch.map((t) => ({ teacher_id: String(t.teacher_id), lesson_type_id: String(t.lesson_type_id) })) : [{ teacher_id: "", lesson_type_id: "" }]);
        const studs = (d.students ?? []) as Opt[];
        if (studs.length) setStudents(studs);
        setStudentIds((d.student_ids ?? []).map(String));
        setHalfPicks(
          ((d.half_groups ?? []) as HalfPick[]).map((h) => ({
            half_group_id: String(h.half_group_id),
            lesson_type_id: String(h.lesson_type_id),
            teacher_id: h.teacher_id ? String(h.teacher_id) : "",
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setError("Fənn qrupu yüklənmədi.");
      });
    return () => {
      cancelled = true;
    };
  }, [initialCourseId, lookups]);

  const visibleOrgs = useMemo(() => {
    const all = lookups?.organizations ?? [];
    if (!levelId) return all;
    const fromPlans = new Set(
      (lookups?.plans ?? [])
        .filter((p) => p.education_level_id === levelId)
        .map((p) => p.organization_id)
        .filter((id): id is string => Boolean(id))
    );
    return all.filter((o) => o.education_level_id === levelId || fromPlans.has(o.id));
  }, [lookups, levelId]);

  const visiblePlans = useMemo(() => {
    const all = lookups?.plans ?? [];
    if (!all.length) return [];
    let list = all;
    if (orgId) list = list.filter((p) => p.organization_id === orgId);
    if (levelId) list = list.filter((p) => p.education_level_id === levelId);
    if (typeId) list = list.filter((p) => p.education_type_id === typeId);
    if (planId && !list.some((p) => p.id === planId)) {
      const cur = all.find((p) => p.id === planId);
      if (cur) return [cur, ...list];
    }
    return list;
  }, [lookups, orgId, levelId, typeId, planId]);

  function resetDownstreamFromOrg() {
    setPlanId("");
    setPlanSemesterId("");
    setSubjectId("");
    setGroupIds([]);
    setEvas([]);
  }

  function changeLevel(id: string) {
    setLevelId(id);
    if (!id) return;
    const allowed = new Set(
      (lookups?.plans ?? [])
        .filter((p) => p.education_level_id === id)
        .map((p) => p.organization_id)
        .filter((oid): oid is string => Boolean(oid))
    );
    const orgOk =
      !orgId || allowed.has(orgId) || Boolean(lookups?.organizations.some((o) => o.id === orgId && o.education_level_id === id));
    if (!orgOk) {
      setOrgId("");
      resetDownstreamFromOrg();
    }
  }

  function applyPlan(id: string) {
    setPlanId(id);
    setPlanSemesterId("");
    setSubjectId("");
    setGroupIds([]);
    setEvas([]);
    const p = (lookups?.plans ?? []).find((x) => x.id === id);
    if (!p) return;
    if (p.organization_id) setOrgId(p.organization_id);
    if (p.education_level_id) setLevelId(p.education_level_id);
    if (p.education_type_id) setTypeId(p.education_type_id);
  }

  useEffect(() => {
    if (!planId) {
      setPlanSemesters([]);
      setSubjects([]);
      setGroups([]);
      return;
    }
    fetch(`/api/admin/subject-groups/lookups/plan-semesters?education_plan_id=${encodeURIComponent(planId)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setPlanSemesters(d.items ?? []))
      .catch(() => setPlanSemesters([]));

    const gparams = new URLSearchParams({ education_plan_id: planId });
    if (orgId) gparams.set("organization_id", orgId);
    fetch(`/api/admin/subject-groups/lookups/groups?${gparams}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setGroups(d.items ?? []))
      .catch(() => setGroups([]));
  }, [planId, orgId]);

  useEffect(() => {
    if (!planId) {
      setSubjects([]);
      return;
    }
    const params = new URLSearchParams({ education_plan_id: planId });
    if (planSemesterId) params.set("plan_semester_id", planSemesterId);
    fetch(`/api/admin/subject-groups/lookups/subjects?${params}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setSubjects(d.items ?? []))
      .catch(() => setSubjects([]));
  }, [planId, planSemesterId]);

  useEffect(() => {
    if (!subjectId) {
      setEvas([]);
      return;
    }
    const params = new URLSearchParams({
      evaluation_type: evaluationType || "MS",
      education_plan_subject_id: subjectId,
    });
    fetch(`/api/admin/subject-groups/lookups/evaluations?${params}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        if (skipCascade.current.evas) {
          skipCascade.current.evas = false;
          return;
        }
        setEvas((d.items ?? []) as EvaRow[]);
        const nextType = d.evaluation_type ? String(d.evaluation_type) : "";
        if (nextType && nextType !== evaluationType) setEvaluationType(nextType);
      })
      .catch(() => {
        if (!skipCascade.current.evas) setEvas([]);
      });
  }, [subjectId, evaluationType]);

  useEffect(() => {
    if (!orgId) {
      setTeachers([]);
      return;
    }
    const params = new URLSearchParams({ limit: "200", organization_id: orgId });
    if (subjectId) params.set("education_plan_subject_id", subjectId);
    fetch(`/api/admin/education-plans/lookups/teachers?${params}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setTeachers(d.items ?? []))
      .catch(() => setTeachers([]));
  }, [orgId, subjectId]);

  useEffect(() => {
    if (!groupIds.length) {
      if (skipCascade.current.students) return;
      setStudents([]);
      setStudentIds([]);
      return;
    }
    fetch(`/api/admin/subject-groups/lookups/students?education_group_ids=${encodeURIComponent(groupIds.join(","))}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        const items = (d.items ?? []) as Opt[];
        setStudents(items);
        if (skipCascade.current.students) {
          skipCascade.current.students = false;
          setStudentIds((prev) => {
            const allowed = new Set(items.map((s) => s.id));
            const kept = prev.filter((id) => allowed.has(id));
            return kept.length ? kept : prev;
          });
          return;
        }
        setStudentIds(items.map((s) => s.id));
      })
      .catch(() => {
        if (skipCascade.current.students) return;
        setStudents([]);
        setStudentIds([]);
      });
  }, [groupIds]);

  useEffect(() => {
    if (!yearId || !semesterId) return;
    if (skipCascade.current.startDate) {
      skipCascade.current.startDate = false;
      return;
    }
    fetch(
      `/api/admin/subject-groups/lookups/start-date?education_year_id=${encodeURIComponent(yearId)}&semester_id=${encodeURIComponent(semesterId)}`,
      { credentials: "include", cache: "no-store" }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.start_date) setStartDate(String(d.start_date));
      })
      .catch(() => {
        /* keep current */
      });
  }, [yearId, semesterId]);

  function applyPlanSemester(id: string, keepSubject = false) {
    setPlanSemesterId(id);
    if (!keepSubject) {
      setSubjectId("");
      setEvas([]);
      setMHours("");
      setSHours("");
      setLHours("");
      setFmHours("");
      setMWeek("");
      setSWeek("");
      setLWeek("");
      setFmWeek("");
    }
    const sem = planSemesters.find((x) => x.id === id);
    const season = (sem?.season_code || "").toUpperCase();
    if (!season || !lookups) return;
    const courseSem = lookups.course_semesters.find((x) => (x.code || "").toUpperCase() === season);
    if (courseSem) setSemesterId(courseSem.id);
  }

  function applySubject(id: string) {
    setSubjectId(id);
    const s = subjects.find((x) => x.id === id);
    if (!s) return;
    if (s.semester_id && s.semester_id !== planSemesterId) {
      applyPlanSemester(s.semester_id, true);
    }
    setMHours(n0(s.m_hours));
    setSHours(n0(s.s_hours));
    setLHours(n0(s.l_hours));
    setFmHours(n0(s.fm_hours));
    const weeklyEmpty = s.m_week_charge == null && s.s_week_charge == null && s.l_week_charge == null && s.fm_week_charge == null;
    if (weeklyEmpty && s.week_charge) {
      const pairs: Array<["m" | "s" | "l" | "fm", number]> = [
        ["m", s.m_hours || 0],
        ["s", s.s_hours || 0],
        ["l", s.l_hours || 0],
        ["fm", s.fm_hours || 0],
      ];
      const top = [...pairs].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "s";
      setMWeek(top === "m" ? n0(s.week_charge) : "0");
      setSWeek(top === "s" ? n0(s.week_charge) : "0");
      setLWeek(top === "l" ? n0(s.week_charge) : "0");
      setFmWeek(top === "fm" ? n0(s.week_charge) : "0");
    } else {
      setMWeek(n0(s.m_week_charge));
      setSWeek(n0(s.s_week_charge));
      setLWeek(n0(s.l_week_charge));
      setFmWeek(n0(s.fm_week_charge));
    }
    if (s.course_work != null) setCourseWork(String(s.course_work));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const missing =
      !levelId || !orgId || !typeId || !planId || !planSemesterId || !subjectId || !yearId || !langId || !semesterId || !startDate || !groupTypeId;
    if (missing) {
      setTab("general");
      setError("Ümumi məlumatları doldurun.");
      return;
    }
    if (!groupIds.length) {
      setTab("general");
      setError("Akademik qrup seçin.");
      return;
    }
    setSaving(true);
    const payload = {
      course_work: Number(courseWork),
      education_level_id: levelId,
      organization_id: orgId,
      education_type_id: typeId,
      education_plan_id: planId,
      plan_semester_id: planSemesterId,
      education_plan_subject_id: subjectId,
      education_year_id: yearId,
      education_lang_id: langId,
      semester_id: semesterId,
      start_date: startDate,
      type_id: groupTypeId,
      education_group_ids: groupIds,
      note: note.trim() || null,
      m_hours: Number(mHours || 0),
      s_hours: Number(sHours || 0),
      l_hours: Number(lHours || 0),
      fm_hours: Number(fmHours || 0),
      m_week_charge: Number(mWeek || 0),
      s_week_charge: Number(sWeek || 0),
      l_week_charge: Number(lWeek || 0),
      fm_week_charge: Number(fmWeek || 0),
      evaluation_type_id: evaluationType,
      evaluations: evas.map((row) => ({
        eva_type_id: row.eva_type_id,
        successful_pass_percent: row.successful_pass_percent,
        automatic: row.automatic,
        access_s: row.access_s,
        access_l: row.access_l,
      })),
      teachers: teacherPicks.filter((t) => t.teacher_id && t.lesson_type_id),
      student_ids: studentIds,
      half_groups: halfPicks
        .filter((h) => h.half_group_id && h.lesson_type_id)
        .map((h) => ({
          half_group_id: h.half_group_id,
          lesson_type_id: h.lesson_type_id,
          teacher_id: h.teacher_id || null,
        })),
    };
    try {
      const updating = Boolean(createdCourseId);
      const res = await fetch(updating ? `/api/admin/subject-groups/${encodeURIComponent(createdCourseId)}` : "/api/admin/subject-groups", {
        method: updating ? "PATCH" : "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(await readDetail(res, updating ? "Fənn qrupu yenilənmədi" : "Fənn qrupu yaradılmadı"));
        return;
      }
      const saved = await res.json().catch(() => null);
      const savedId = saved?.course_id ? String(saved.course_id) : createdCourseId;
      if (savedId) setCreatedCourseId(savedId);
      if (updating) {
        setInfo(initialCourseId ? "Məlumatlar yadda saxlanıldı." : "Məlumatlar yadda saxlanıldı. Davam edə və ya Geri ilə çıxa bilərsiniz.");
      } else {
        setTab("teacher");
        setInfo("Fənn qrupu yaradıldı. Səhifə açıq qalır — Müəllim, Tələbələr və Yarımqruplar tablarını doldurun. Bitirdikdən sonra Geri ilə çıxın.");
      }
    } catch {
      setError("Serverə qoşulmaq mümkün olmadı.");
    } finally {
      setSaving(false);
    }
  }

  async function finishAndClose() {
    if (!createdCourseId) {
      router.push(`/${locale}/dashboard/admin/subject-groups`);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/subject-groups/${encodeURIComponent(createdCourseId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          course_work: Number(courseWork),
          education_level_id: levelId,
          organization_id: orgId,
          education_type_id: typeId,
          education_plan_id: planId,
          plan_semester_id: planSemesterId,
          education_plan_subject_id: subjectId,
          education_year_id: yearId,
          education_lang_id: langId,
          semester_id: semesterId,
          start_date: startDate,
          type_id: groupTypeId,
          education_group_ids: groupIds,
          note: note.trim() || null,
          m_hours: Number(mHours || 0),
          s_hours: Number(sHours || 0),
          l_hours: Number(lHours || 0),
          fm_hours: Number(fmHours || 0),
          m_week_charge: Number(mWeek || 0),
          s_week_charge: Number(sWeek || 0),
          l_week_charge: Number(lWeek || 0),
          fm_week_charge: Number(fmWeek || 0),
          evaluation_type_id: evaluationType,
          evaluations: evas.map((row) => ({
            eva_type_id: row.eva_type_id,
            successful_pass_percent: row.successful_pass_percent,
            automatic: row.automatic,
            access_s: row.access_s,
            access_l: row.access_l,
          })),
          teachers: teacherPicks.filter((t) => t.teacher_id && t.lesson_type_id),
          student_ids: studentIds,
          half_groups: halfPicks
            .filter((h) => h.half_group_id && h.lesson_type_id)
            .map((h) => ({
              half_group_id: h.half_group_id,
              lesson_type_id: h.lesson_type_id,
              teacher_id: h.teacher_id || null,
            })),
        }),
      });
      if (!res.ok) {
        setError(await readDetail(res, "Fənn qrupu yenilənmədi"));
        return;
      }
      router.push(`/${locale}/dashboard/admin/subject-groups?created=${encodeURIComponent(createdCourseId)}`);
      router.refresh();
    } catch {
      setError("Serverə qoşulmaq mümkün olmadı.");
    } finally {
      setSaving(false);
    }
  }

  if (!lookups) {
    return <p className={styles.error}>{error || "Yüklənir…"}</p>;
  }

  const locked = Boolean(createdCourseId) && !initialCourseId;
  const seminarId = lookups.lesson_types.find((x) => (x.name_az || "").toLowerCase().includes("seminar"))?.id || lookups.lesson_types[0]?.id || "";
  const selectedTeacherIds = [...teacherPicks.map((t) => t.teacher_id), ...halfPicks.map((h) => h.teacher_id)].filter(Boolean);
  const teacherOptions = (() => {
    const map = new Map(teachers.map((t) => [t.id, t]));
    for (const id of selectedTeacherIds) {
      if (!map.has(id)) map.set(id, { id, name: id });
    }
    return Array.from(map.values());
  })();

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <nav className={styles.tabs}>
        <button type="button" className={tab === "general" ? styles.tabActive : styles.tab} onClick={() => setTab("general")}>
          Ümumi məlumatlar
        </button>
        <button type="button" className={tab === "teacher" ? styles.tabActive : styles.tab} onClick={() => setTab("teacher")}>
          Müəllim
        </button>
        <button type="button" className={tab === "students" ? styles.tabActive : styles.tab} onClick={() => setTab("students")}>
          Tələbələr
        </button>
        <button type="button" className={tab === "half" ? styles.tabActive : styles.tab} onClick={() => setTab("half")}>
          Yarımqruplar
        </button>
      </nav>
      <div className={tab === "general" ? undefined : styles.hidden}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Ümumi məlumatlar</h2>
            <div className={styles.row}>
              <label className={styles.field}>
                <span className={`${styles.label} ${styles.req}`}>Kurs işi</span>
                <select className={styles.select} value={courseWork} onChange={(e) => setCourseWork(e.target.value)} required disabled={locked}>
                  {lookups.course_work_options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name_az}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span className={`${styles.label} ${styles.req}`}>Təhsil səviyyəsi</span>
                <select className={styles.select} value={levelId} onChange={(e) => changeLevel(e.target.value)} required disabled={locked}>
                  <option value="">— seç —</option>
                  {lookups.education_levels.map((o) => (
                    <option key={o.id} value={o.id}>
                      {labelOf(o)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span className={`${styles.label} ${styles.req}`}>İxtisas</span>
                <SearchableSelect
                  value={orgId}
                  onChange={(id) => {
                    setOrgId(id);
                    resetDownstreamFromOrg();
                  }}
                  placeholder="— seç —"
                  searchPlaceholder="Axtar…"
                  disabled={locked}
                  options={visibleOrgs.map((o) => ({ id: o.id, label: labelOf(o) }))}
                />
              </label>
              <label className={styles.field}>
                <span className={`${styles.label} ${styles.req}`}>Təhsil forması</span>
                <select className={styles.select} value={typeId} onChange={(e) => setTypeId(e.target.value)} required disabled={locked}>
                  <option value="">— seç —</option>
                  {lookups.education_types.map((o) => (
                    <option key={o.id} value={o.id}>
                      {labelOf(o)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span className={`${styles.label} ${styles.req}`}>Tədris planı</span>
                <SearchableSelect
                  value={planId}
                  onChange={applyPlan}
                  placeholder="— seç —"
                  searchPlaceholder="Axtar…"
                  disabled={locked}
                  options={visiblePlans.map((o) => ({ id: o.id, label: labelOf(o) }))}
                />
              </label>
              <label className={styles.field}>
                <span className={`${styles.label} ${styles.req}`}>Tədris planı semestr</span>
                <select className={styles.select} value={planSemesterId} onChange={(e) => applyPlanSemester(e.target.value)} required disabled={locked}>
                  <option value="">— seç —</option>
                  {planSemesters.map((o) => (
                    <option key={o.id} value={o.id}>
                      {labelOf(o)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span className={`${styles.label} ${styles.req}`}>Fənn</span>
                <SearchableSelect
                  value={subjectId}
                  onChange={applySubject}
                  placeholder="— seç —"
                  searchPlaceholder="Axtar…"
                  disabled={locked}
                  options={subjects.map((o) => ({
                    id: o.id,
                    label: subjectLabel(o),
                  }))}
                />
              </label>
              <label className={styles.field}>
                <span className={`${styles.label} ${styles.req}`}>Tədris ili</span>
                <select className={styles.select} value={yearId} onChange={(e) => setYearId(e.target.value)} required disabled={locked}>
                  <option value="">— seç —</option>
                  {lookups.education_years.map((o) => (
                    <option key={o.id} value={o.id}>
                      {labelOf(o)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span className={`${styles.label} ${styles.req}`}>Tədris dili</span>
                <select className={styles.select} value={langId} onChange={(e) => setLangId(e.target.value)} required disabled={locked}>
                  <option value="">— seç —</option>
                  {lookups.education_langs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {labelOf(o)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span className={`${styles.label} ${styles.req}`}>Fənn qrupu semestr</span>
                <select className={styles.select} value={semesterId} onChange={(e) => setSemesterId(e.target.value)} required disabled={locked}>
                  <option value="">— seç —</option>
                  {lookups.course_semesters.map((o) => (
                    <option key={o.id} value={o.id}>
                      {labelOf(o)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span className={`${styles.label} ${styles.req}`}>Başlama tarixi</span>
                <input className={styles.input} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required disabled={locked} />
              </label>
              <label className={styles.field}>
                <span className={`${styles.label} ${styles.req}`}>Fənn qrupu növü</span>
                <select className={styles.select} value={groupTypeId} onChange={(e) => setGroupTypeId(e.target.value)} required disabled={locked}>
                  <option value="">— seç —</option>
                  {lookups.course_types.map((o) => (
                    <option key={o.id} value={o.id}>
                      {labelOf(o)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={styles.field}>
              <span className={`${styles.label} ${styles.req}`}>Akademik qruplar</span>
              <div className={styles.checkList}>
                {groups.length === 0 ? <span className={styles.label}>Əvvəl tədris planı seçin</span> : null}
                {groups.map((g) => {
                  const checked = groupIds.includes(g.id);
                  return (
                    <label key={g.id} className={styles.checkItem}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked}
                        onChange={() => setGroupIds((prev) => (checked ? prev.filter((x) => x !== g.id) : [...prev, g.id]))}
                      />
                      <span>{g.name || g.name_az || g.id}</span>
                    </label>
                  );
                })}
              </div>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Qeyd</span>
              <textarea className={styles.textarea} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Qeyd" />
            </label>
          </section>

          <section className={styles.card}>
            <div className={styles.row4}>
              <label className={styles.field}>
                <span className={styles.label}>Mühazirə saatı</span>
                <input className={styles.input} type="number" min={0} value={mHours} onChange={(e) => setMHours(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Seminar saatı</span>
                <input className={styles.input} type="number" min={0} value={sHours} onChange={(e) => setSHours(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Laboratoriya saatı</span>
                <input className={styles.input} type="number" min={0} value={lHours} onChange={(e) => setLHours(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Kurs işi/layihəsi</span>
                <input className={styles.input} type="number" min={0} value={fmHours} onChange={(e) => setFmHours(e.target.value)} />
              </label>
            </div>
            <div className={styles.row4}>
              <label className={styles.field}>
                <span className={styles.label}>Müh. həftəlik yük</span>
                <input className={styles.input} type="number" min={0} value={mWeek} onChange={(e) => setMWeek(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Sem. həftəlik yük</span>
                <input className={styles.input} type="number" min={0} value={sWeek} onChange={(e) => setSWeek(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Lab. həftəlik yük</span>
                <input className={styles.input} type="number" min={0} value={lWeek} onChange={(e) => setLWeek(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>K.i həftəlik yük</span>
                <input className={styles.input} type="number" min={0} value={fmWeek} onChange={(e) => setFmWeek(e.target.value)} />
              </label>
            </div>
            <label className={styles.field}>
              <span className={`${styles.label} ${styles.req}`}>Qiymətləndirmə növü</span>
              <select className={styles.select} value={evaluationType} onChange={(e) => setEvaluationType(e.target.value)} required disabled={locked}>
                {lookups.evaluation_types.map((o) => (
                  <option key={o.id} value={o.id}>
                    {labelOf(o)}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Ad</th>
                    <th className={styles.th}>Bal</th>
                    <th className={styles.th}>Keçid faizi</th>
                    <th className={styles.th}>Avtomatik (hesablama)</th>
                    <th className={styles.th}>Sem. müəlliminə icazə</th>
                    <th className={styles.th}>Lab. müəlliminə icazə</th>
                  </tr>
                </thead>
                <tbody>
                  {evas.length === 0 ? (
                    <tr>
                      <td className={styles.td} colSpan={6}>
                        Fənn seçiləndə cədvəl avtomatik doldurulur.
                      </td>
                    </tr>
                  ) : (
                    evas.map((row) => (
                      <tr key={row.eva_type_id}>
                        <td className={styles.td}>{row.name_az ?? row.eva_type_id}</td>
                        <td className={styles.td}>{row.point ?? ""}</td>
                        <td className={styles.td}>
                          <input
                            className={styles.num}
                            type="number"
                            min={0}
                            max={100}
                            value={row.successful_pass_percent ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEvas((prev) =>
                                prev.map((x) => (x.eva_type_id === row.eva_type_id ? { ...x, successful_pass_percent: v === "" ? null : Number(v) } : x))
                              );
                            }}
                          />
                        </td>
                        <td className={styles.td}>
                          <input
                            type="checkbox"
                            checked={row.automatic}
                            onChange={(e) => setEvas((prev) => prev.map((x) => (x.eva_type_id === row.eva_type_id ? { ...x, automatic: e.target.checked } : x)))}
                          />
                        </td>
                        <td className={styles.td}>
                          <input
                            type="checkbox"
                            checked={row.access_s}
                            onChange={(e) => setEvas((prev) => prev.map((x) => (x.eva_type_id === row.eva_type_id ? { ...x, access_s: e.target.checked } : x)))}
                          />
                        </td>
                        <td className={styles.td}>
                          <input
                            type="checkbox"
                            checked={row.access_l}
                            onChange={(e) => setEvas((prev) => prev.map((x) => (x.eva_type_id === row.eva_type_id ? { ...x, access_l: e.target.checked } : x)))}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
      </div>

      <div className={tab === "teacher" ? undefined : styles.hidden}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Müəllim</h2>
          {!orgId ? <p className={styles.label}>Əvvəl ixtisas seçin. Yalnız həmin fakültənin kafedra müəllimləri görünür.</p> : null}
          {orgId && teachers.length === 0 ? (
            <p className={styles.label}>Bu ixtisasın kafedralarında təhkim olunmuş müəllim tapılmadı.</p>
          ) : null}
          {teacherPicks.map((row, idx) => (
            <div key={idx} className={styles.teacherRow}>
              <label className={styles.field}>
                <span className={styles.label}>Müəllim</span>
                <SearchableSelect
                  value={row.teacher_id}
                  onChange={(id) => setTeacherPicks((prev) => prev.map((x, i) => (i === idx ? { ...x, teacher_id: id } : x)))}
                  placeholder="— seç —"
                  searchPlaceholder="Axtar…"
                  options={teacherOptions.map((t) => ({
                    id: t.id,
                    label: teacherSearchLabel(t),
                  }))}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Dərs növü</span>
                <select
                  className={styles.select}
                  value={row.lesson_type_id}
                  onChange={(e) => setTeacherPicks((prev) => prev.map((x, i) => (i === idx ? { ...x, lesson_type_id: e.target.value } : x)))}
                >
                  <option value="">— seç —</option>
                  {lookups.lesson_types.map((o) => (
                    <option key={o.id} value={o.id}>
                      {labelOf(o)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() => setTeacherPicks((prev) => (prev.length === 1 ? [{ teacher_id: "", lesson_type_id: seminarId }] : prev.filter((_, i) => i !== idx)))}
              >
                Sil
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.buttonAdd}
            onClick={() => setTeacherPicks((prev) => [...prev, { teacher_id: "", lesson_type_id: seminarId }])}
          >
            Müəllim əlavə et
          </button>
        </section>
      </div>

      <div className={tab === "students" ? undefined : styles.hidden}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Tələbələr</h2>
          <div className={styles.checkList} style={{ maxHeight: 360 }}>
            {students.length === 0 ? <span className={styles.label}>Əvvəl akademik qrup seçin</span> : null}
            {students.map((s) => {
              const checked = studentIds.includes(s.id);
              return (
                <label key={s.id} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setStudentIds((prev) => (checked ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
                  />
                  <span>
                    {s.name || s.id}
                    {s.group_name ? ` · ${s.group_name}` : ""}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      </div>

      <div className={tab === "half" ? undefined : styles.hidden}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Yarımqruplar</h2>
          {lookups.half_groups.length === 0 ? <p className={styles.label}>Yarımqrup tapılmadı.</p> : null}
          {lookups.half_groups.map((hg) => {
            const picked = halfPicks.find((x) => x.half_group_id === hg.id);
            return (
              <div key={hg.id} className={styles.halfRow}>
                <label className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={Boolean(picked)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setHalfPicks((prev) => [...prev, { half_group_id: hg.id, lesson_type_id: seminarId, teacher_id: "" }]);
                      } else {
                        setHalfPicks((prev) => prev.filter((x) => x.half_group_id !== hg.id));
                      }
                    }}
                  />
                  <span>{labelOf(hg)}</span>
                </label>
                <select
                  className={styles.select}
                  disabled={!picked}
                  value={picked?.lesson_type_id ?? ""}
                  onChange={(e) =>
                    setHalfPicks((prev) => prev.map((x) => (x.half_group_id === hg.id ? { ...x, lesson_type_id: e.target.value } : x)))
                  }
                >
                  <option value="">Dərs növü</option>
                  {lookups.lesson_types.map((o) => (
                    <option key={o.id} value={o.id}>
                      {labelOf(o)}
                    </option>
                  ))}
                </select>
                <SearchableSelect
                  disabled={!picked}
                  value={picked?.teacher_id ?? ""}
                  onChange={(id) => setHalfPicks((prev) => prev.map((x) => (x.half_group_id === hg.id ? { ...x, teacher_id: id } : x)))}
                  placeholder="Müəllim (istəyə bağlı)"
                  searchPlaceholder="Axtar…"
                  options={teacherOptions.map((t) => ({
                    id: t.id,
                    label: teacherSearchLabel(t),
                  }))}
                />
              </div>
            );
          })}
        </section>
      </div>

      {info ? <p className={styles.ok}>{info}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.actions}>
        <button type="submit" className={styles.buttonAdd} disabled={saving}>
          {saving ? (initialCourseId ? "Yadda saxlanır…" : "Əlavə olunur…") : initialCourseId ? "Yadda saxla" : "Əlavə et"}
        </button>
        {createdCourseId ? (
          <button type="button" className={styles.buttonBack} disabled={saving} onClick={() => void finishAndClose()}>
            {saving ? "Yadda saxlanır…" : "Geri"}
          </button>
        ) : (
          <Link href={`/${locale}/dashboard/admin/subject-groups`} className={styles.buttonBack}>
            Geri
          </Link>
        )}
      </div>
    </form>
  );
}

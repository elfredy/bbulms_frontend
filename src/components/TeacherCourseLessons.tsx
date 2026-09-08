"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { CatalogTopicItem, LessonFileItem, LessonMeetingItem } from "@/lib/api";
import {
  assignTeacherLessonTopic,
  deleteTeacherLessonFile,
  getTeacherCatalogTopics,
  getTeacherCourseLessons,
  getTeacherLessonFiles,
  removeTeacherLessonTopic,
  uploadTeacherLessonPdf,
} from "@/lib/api-client";

import styles from "./TeacherCourseLessons.module.css";

type Mode = "lessons" | "files";

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const s = String(d).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  return s;
}

function fmtTime(start: string | null | undefined, end: string | null | undefined): string {
  return [start, end].filter(Boolean).join(" - ");
}

function lessonLetter(m: Pick<LessonMeetingItem, "lesson_type_id" | "lesson_type_az">): string {
  const id = String(m.lesson_type_id ?? "").trim();
  if (id === "110000111") return "M";
  if (id === "110000112") return "S";
  if (id === "110000113") return "L";
  const name = String(m.lesson_type_az ?? "").trim().toLowerCase();
  if (name.startsWith("müha") || name.startsWith("muha")) return "M";
  if (name.startsWith("sem")) return "S";
  if (name.startsWith("lab")) return "L";
  return (m.lesson_type_az ?? "?").slice(0, 1).toUpperCase() || "?";
}

function fmtSize(n: number | null | undefined): string {
  if (n == null || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function TeacherCourseLessons({ courseId, mode }: { courseId: string; mode: Mode }) {
  const [meetings, setMeetings] = useState<LessonMeetingItem[]>([]);
  const [files, setFiles] = useState<LessonFileItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [modalMeeting, setModalMeeting] = useState<LessonMeetingItem | null>(null);
  const [topics, setTopics] = useState<CatalogTopicItem[]>([]);
  const [topicQuery, setTopicQuery] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");

  const [uploadMeetingId, setUploadMeetingId] = useState("");
  const [uploadName, setUploadName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rowFileInputRef = useRef<HTMLInputElement | null>(null);
  const [rowUploadMeetingId, setRowUploadMeetingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const [lessons, fileList] = await Promise.all([
      getTeacherCourseLessons(courseId),
      getTeacherLessonFiles(courseId),
    ]);
    if (!lessons) {
      setErr("Dərslər yüklənmədi");
      return;
    }
    setMeetings(lessons.meetings);
    setFiles(fileList?.items ?? []);
    setUploadMeetingId((prev) => {
      const withTopic = lessons.meetings.filter((m) => m.course_meeting_topic_id);
      if (prev && withTopic.some((m) => m.course_meeting_id === prev)) return prev;
      return withTopic[0]?.course_meeting_id ?? "";
    });
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredTopics = useMemo(() => {
    const q = topicQuery.trim().toLocaleLowerCase("az");
    if (!q) return topics;
    return topics.filter((t) => (t.topic ?? "").toLocaleLowerCase("az").includes(q));
  }, [topics, topicQuery]);

  const meetingsWithTopic = useMemo(
    () => meetings.filter((m) => Boolean(m.course_meeting_topic_id)),
    [meetings],
  );

  async function openTopicModal(m: LessonMeetingItem) {
    setErr(null);
    setModalMeeting(m);
    setSelectedTopicId(m.subject_topic_id ?? "");
    setTopicQuery("");
    const res = await getTeacherCatalogTopics(courseId, m.lesson_type_id);
    setTopics(res?.items ?? []);
  }

  async function saveTopic() {
    if (!modalMeeting || !selectedTopicId) {
      setErr("Mövzu seçin");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await assignTeacherLessonTopic(courseId, modalMeeting.course_meeting_id, selectedTopicId);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setModalMeeting(null);
    await load();
  }

  async function clearTopic(m: LessonMeetingItem) {
    if (!window.confirm("Bu dərsin mövzusunu silmək istəyirsiniz?")) return;
    setBusy(true);
    setErr(null);
    const res = await removeTeacherLessonTopic(courseId, m.course_meeting_id);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    await load();
  }

  async function uploadPdf(meetingId: string, file: File, name?: string) {
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setErr("Yalnız PDF fayl yükləmək olar");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await uploadTeacherLessonPdf(courseId, meetingId, file, name);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setUploadName("");
    await load();
  }

  async function removeFile(fileRowId: string) {
    if (!window.confirm("Bu PDF-i silmək istəyirsiniz?")) return;
    setBusy(true);
    setErr(null);
    const res = await deleteTeacherLessonFile(courseId, fileRowId);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    await load();
  }

  return (
    <div className={styles.wrap}>
      {mode === "lessons" ? (
        <p className={styles.hint}>
          Dərsə mövzu əlavə edin. Mövzu əlavə olunduqdan sonra həmin dərs üçün PDF material yükləyə bilərsiniz.
        </p>
      ) : (
        <p className={styles.hint}>
          Dərs materiallarını PDF kimi yükləyin. Yükləmə üçün əvvəlcə Dərslər bölməsində mövzu seçilməlidir.
        </p>
      )}

      {err ? <p className={styles.err}>{err}</p> : null}

      {mode === "files" ? (
        <div className={styles.uploadBox}>
          <div className={styles.uploadRow}>
            <div>
              <div className={styles.label}>Dərs</div>
              <select
                className={styles.select}
                value={uploadMeetingId}
                onChange={(e) => setUploadMeetingId(e.target.value)}
                disabled={busy || meetingsWithTopic.length === 0}
              >
                {meetingsWithTopic.length === 0 ? <option value="">Mövzulu dərs yoxdur</option> : null}
                {meetingsWithTopic.map((m) => (
                  <option key={m.course_meeting_id} value={m.course_meeting_id}>
                    {[m.lesson_type_az, fmtDate(m.meeting_date), fmtTime(m.start_time, m.end_time), m.topic_name]
                      .filter(Boolean)
                      .join(" · ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className={styles.label}>Fayl adı (istəyə bağlı)</div>
              <input
                className={styles.input}
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Məs: Mühazirə 1.pdf"
                disabled={busy}
              />
            </div>
            <button
              type="button"
              className={styles.btn}
              disabled={busy || !uploadMeetingId}
              onClick={() => fileInputRef.current?.click()}
            >
              PDF yüklə
            </button>
            <input
              ref={fileInputRef}
              className={styles.hiddenInput}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f && uploadMeetingId) void uploadPdf(uploadMeetingId, f, uploadName);
              }}
            />
          </div>
        </div>
      ) : null}

      {mode === "lessons" ? (
        meetings.length === 0 ? (
          <p className={styles.empty}>Dərs cədvəli tapılmadı.</p>
        ) : (
          <ul className={styles.list}>
            {meetings.map((m) => {
              const hasTopic = Boolean(m.topic_name || m.course_meeting_topic_id);
              return (
                <li key={m.course_meeting_id} className={styles.row}>
                  <div className={styles.badge} title={m.lesson_type_az ?? ""}>
                    {lessonLetter(m)}
                  </div>
                  <div className={styles.body}>
                    <p className={`${styles.topic} ${hasTopic ? "" : styles.topicEmpty}`}>
                      {m.topic_name || "Mövzu əlavə edilməyib"}
                    </p>
                    <p className={styles.meta}>
                      {[m.lesson_type_az, fmtDate(m.meeting_date), fmtTime(m.start_time, m.end_time)]
                        .filter(Boolean)
                        .join(" · ")}
                      {m.file_count ? ` · ${m.file_count} fayl` : ""}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <button type="button" className={styles.btn} disabled={busy} onClick={() => void openTopicModal(m)}>
                      {hasTopic ? "Mövzunu dəyiş" : "Mövzu əlavə edin"}
                    </button>
                    {hasTopic ? (
                      <>
                        <button
                          type="button"
                          className={styles.btn}
                          disabled={busy}
                          onClick={() => {
                            setRowUploadMeetingId(m.course_meeting_id);
                            rowFileInputRef.current?.click();
                          }}
                        >
                          PDF yüklə
                        </button>
                        <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={() => void clearTopic(m)}>
                          Sil
                        </button>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : files.length === 0 ? (
        <p className={styles.empty}>Dərs materialı yoxdur.</p>
      ) : (
        <table className={styles.fileTable}>
          <thead>
            <tr>
              <th>Fayl</th>
              <th>Dərs / mövzu</th>
              <th>Tarix</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.file_row_id}>
                <td>
                  <a className={styles.fileLink} href={f.url || "#"} target="_blank" rel="noreferrer">
                    {f.name || "PDF"}
                  </a>
                  <div className={styles.meta}>{[f.author_name, fmtSize(f.file_size)].filter(Boolean).join(" · ")}</div>
                </td>
                <td>
                  {[f.lesson_type_az, f.topic_name].filter(Boolean).join(" · ") || "—"}
                </td>
                <td>{fmtDate(f.meeting_date || f.create_date)}</td>
                <td>
                  <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={() => void removeFile(f.file_row_id)}>
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <input
        ref={rowFileInputRef}
        className={styles.hiddenInput}
        type="file"
        accept="application/pdf,.pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          const mid = rowUploadMeetingId;
          e.target.value = "";
          setRowUploadMeetingId(null);
          if (f && mid) void uploadPdf(mid, f);
        }}
      />

      {modalMeeting
        ? createPortal(
            <div className={styles.overlay} role="dialog" aria-modal="true" onClick={() => setModalMeeting(null)}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHead}>
                  <p className={styles.modalTitle}>
                    Tarix: {fmtDate(modalMeeting.meeting_date)} · {fmtTime(modalMeeting.start_time, modalMeeting.end_time)}
                  </p>
                  <p className={styles.modalTitle}>Dərs tipi: {modalMeeting.lesson_type_az || "—"}</p>
                </div>
                <div className={styles.modalSearch}>
                  <input
                    className={styles.input}
                    value={topicQuery}
                    onChange={(e) => setTopicQuery(e.target.value)}
                    placeholder="Axtar"
                  />
                </div>
                <div className={styles.topicList}>
                  {filteredTopics.length === 0 ? (
                    <p className={styles.empty} style={{ border: "none" }}>
                      Mövzu tapılmadı. Admin fənn kataloqunda mövzu əlavə etməlidir.
                    </p>
                  ) : (
                    filteredTopics.map((t) => (
                      <button
                        key={t.subject_topic_id}
                        type="button"
                        className={`${styles.topicOption} ${selectedTopicId === t.subject_topic_id ? styles.topicOptionActive : ""}`}
                        onClick={() => setSelectedTopicId(t.subject_topic_id)}
                      >
                        {t.topic || t.subject_topic_id}
                      </button>
                    ))
                  )}
                </div>
                <div className={styles.modalFoot}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} disabled={busy} onClick={() => setModalMeeting(null)}>
                    Geri
                  </button>
                  <button type="button" className={styles.btn} disabled={busy || !selectedTopicId} onClick={() => void saveTopic()}>
                    Əlavə et
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

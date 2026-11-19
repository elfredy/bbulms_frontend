"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { fmtClockRange } from "@/lib/clock-time";

import styles from "@/app/[locale]/dashboard/dashboard.module.css";
import tableStyles from "@/app/[locale]/dashboard/admin/courses/[courseId]/meetings-table.module.css";

export type AdminCourseMeetingRow = {
  course_meeting_id: string;
  course_id: string;
  course_teacher_id: string | null;
  teacher_id: string | null;
  teacher_fullname: string | null;
  lesson_type_id: string | null;
  lesson_type_az: string | null;
  meeting_date: string | null;
  week_day?: string | null;
  week_type?: string | null;
  clock_id: string | null;
  start_time: string | null;
  end_time: string | null;
  room_id: string | null;
  room_name: string | null;
  point_status: string | null;
  has_journal?: boolean;
};

type Props = {
  locale: string;
  courseId: string;
  from: string | null;
  to: string | null;
  initialItems: AdminCourseMeetingRow[];
  initialCounts: Record<string, number>;
  labels: {
    title: string;
    hint: string;
    back: string;
    fromDate: string;
    toDate: string;
    apply: string;
    empty: string;
    loadError: string;
  };
};

async function readDetail(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail.map((d: { msg?: string }) => d.msg || "").filter(Boolean).join("; ") || fallback;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

function fmtDate(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  return s;
}

export function AdminCourseMeetingsClient({
  locale,
  courseId,
  from,
  to,
  initialItems,
  initialCounts,
  labels,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [counts, setCounts] = useState(initialCounts);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [allowJournal, setAllowJournal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const selectedList = useMemo(() => Array.from(selected), [selected]);
  const selectedWithJournal = useMemo(
    () => items.filter((m) => selected.has(m.course_meeting_id) && m.has_journal).length,
    [items, selected]
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((m) => m.course_meeting_id));
    });
  }, [items]);

  const selectLatestByType = useCallback(
    (lessonTypeId: string, n: number) => {
      const ofType = items
        .filter((m) => String(m.lesson_type_id) === lessonTypeId)
        .slice()
        .sort((a, b) => String(b.meeting_date).localeCompare(String(a.meeting_date)));
      const ids = ofType.slice(0, Math.max(0, n)).map((m) => m.course_meeting_id);
      setSelected(new Set(ids));
      setMsg(null);
      setErr(null);
    },
    [items]
  );

  const reload = useCallback(async () => {
    const params = new URLSearchParams();
    if (from) params.set("from_date", from);
    if (to) params.set("to_date", to);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/admin/courses/${encodeURIComponent(courseId)}/meetings${qs}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await readDetail(res, labels.loadError));
    const data = (await res.json()) as {
      items: AdminCourseMeetingRow[];
      counts?: Record<string, number>;
    };
    setItems(data.items ?? []);
    setCounts(data.counts ?? {});
    setSelected(new Set());
  }, [courseId, from, to, labels.loadError]);

  const deactivate = useCallback(async () => {
    if (selectedList.length === 0) return;
    const journalNote =
      selectedWithJournal > 0
        ? allowJournal
          ? `\nDiqqət: ${selectedWithJournal} dərsdə jurnal qeydi var — onlar da silinəcək.`
          : `\n${selectedWithJournal} dərsdə jurnal qeydi var — onlar avtomatik buraxılacaq (və ya «Jurnal ilə» işarələyin).`
        : "";
    if (!window.confirm(`${selectedList.length} dərs soft-delete ediləcək (active=0).${journalNote}`)) return;

    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/courses/${encodeURIComponent(courseId)}/meetings/deactivate`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          meeting_ids: selectedList,
          allow_with_journal: allowJournal,
        }),
      });
      if (!res.ok) throw new Error(await readDetail(res, "Silinmə alınmadı"));
      const data = (await res.json()) as {
        deactivated_count: number;
        skipped_journal_count: number;
      };
      await reload();
      setMsg(
        `Silindi: ${data.deactivated_count}` +
          (data.skipped_journal_count ? `; jurnal üçün buraxıldı: ${data.skipped_journal_count}` : "")
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xəta");
    } finally {
      setBusy(false);
    }
  }, [allowJournal, courseId, reload, selectedList, selectedWithJournal]);

  const countText = Object.entries(counts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{labels.title}</h1>
          <p className={styles.meta}>{labels.hint}</p>
          {countText ? <p className={styles.meta}>Cəmi — {countText}</p> : null}
        </div>
        <Link className={styles.meta} href={`/${locale}/dashboard/admin/courses`}>
          {labels.back}
        </Link>
      </header>

      <div className={styles.content}>
        <form
          action={`/${locale}/dashboard/admin/courses/${courseId}`}
          method="get"
          style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <div className={styles.meta}>{labels.fromDate}</div>
            <input
              name="from"
              type="date"
              defaultValue={from ?? ""}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
              }}
            />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <div className={styles.meta}>{labels.toDate}</div>
            <input
              name="to"
              type="date"
              defaultValue={to ?? ""}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            {labels.apply}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <button
            type="button"
            disabled={busy || selectedList.length === 0}
            onClick={() => void deactivate()}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: selectedList.length ? "color-mix(in srgb, #b91c1c 12%, var(--card))" : "var(--card)",
              color: "var(--text)",
              cursor: selectedList.length && !busy ? "pointer" : "not-allowed",
              opacity: selectedList.length && !busy ? 1 : 0.55,
            }}
          >
            Seçilənləri sil ({selectedList.length})
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setSelected(new Set(items.filter((m) => !m.has_journal).map((m) => m.course_meeting_id)));
              setMsg(null);
              setErr(null);
            }}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            Boş slotları seç
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => selectLatestByType("110000112", 1)}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            Son məşğələni seç
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => selectLatestByType("110000111", 1)}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            Son mühazirəni seç
          </button>
          <label className={styles.meta} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={allowJournal}
              onChange={(e) => setAllowJournal(e.target.checked)}
              disabled={busy}
            />
            Jurnal qeydi olanları da sil
          </label>
        </div>

        {msg ? <p className={styles.meta} style={{ marginTop: 10 }}>{msg}</p> : null}
        {err ? (
          <p className={styles.alertMuted} style={{ marginTop: 10, color: "#b91c1c" }}>
            {err}
          </p>
        ) : null}

        <div className={tableStyles.tableWrap}>
          {items.length === 0 ? (
            <p className={styles.alertMuted} style={{ margin: 0, padding: "1rem 1.15rem" }}>
              {labels.empty}
            </p>
          ) : (
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th className={tableStyles.th}>
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selected.size === items.length}
                      onChange={toggleAll}
                      aria-label="Hamısını seç"
                    />
                  </th>
                  <th className={tableStyles.th}>Tarix</th>
                  <th className={tableStyles.th}>Saat</th>
                  <th className={tableStyles.th}>Dərs növü</th>
                  <th className={tableStyles.th}>Müəllim</th>
                  <th className={tableStyles.th}>Otaq</th>
                  <th className={tableStyles.th}>Qiymət</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.course_meeting_id} className={tableStyles.row}>
                    <td className={tableStyles.td}>
                      <input
                        type="checkbox"
                        checked={selected.has(m.course_meeting_id)}
                        onChange={() => toggle(m.course_meeting_id)}
                        aria-label={`Seç ${fmtDate(m.meeting_date)}`}
                      />
                    </td>
                    <td className={tableStyles.td}>{fmtDate(m.meeting_date)}</td>
                    <td className={`${tableStyles.td} ${tableStyles.tdTime}`}>
                      {fmtClockRange(m.start_time, m.end_time) || "—"}
                    </td>
                    <td className={tableStyles.td}>{m.lesson_type_az?.trim() || "—"}</td>
                    <td className={tableStyles.td}>{m.teacher_fullname?.trim() || "—"}</td>
                    <td className={tableStyles.td}>{m.room_name?.trim() || "—"}</td>
                    <td className={tableStyles.td}>{m.has_journal ? "var" : "boş"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "./StudentRequests.module.css";

type RequestItem = {
  id: string;
  course_id: string;
  student_id: string;
  message: string;
  reply?: string | null;
  status: string;
  created_at?: string;
  subject_name_az?: string | null;
  student_name?: string | null;
};

async function readDetail(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    /* ignore */
  }
  return fallback;
}

function fmtWhen(v?: string): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 16);
  return d.toLocaleString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function TeacherRequestsClient() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/teacher/requests", { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        setError(await readDetail(res, "Müraciətlər yüklənmədi"));
        return;
      }
      const data = await res.json();
      setItems(data.items || []);
      setOpenCount(Number(data.open_count) || 0);
    } catch {
      setError("Yüklənmədi");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sendReply = async (id: string) => {
    const reply = (drafts[id] || "").trim();
    if (!reply) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/teacher/requests/${encodeURIComponent(id)}/reply`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reply }),
      });
      if (!res.ok) {
        setError(await readDetail(res, "Cavab yazılmadı"));
        return;
      }
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } catch {
      setError("Cavab yazılmadı");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h2 className={styles.title}>
          Müraciətlər {openCount > 0 ? `(${openCount} açıq)` : ""}
        </h2>
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.list}>
          {!items.length ? <p className={styles.meta}>Müraciət yoxdur.</p> : null}
          {items.map((it) => {
            const open = it.status === "open";
            const draft = drafts[it.id] ?? "";
            return (
              <div key={it.id} className={styles.item}>
                <div className={styles.itemHead}>
                  <p className={styles.subject}>{it.student_name || "Tələbə"}</p>
                  <span className={open ? styles.badgeOpen : styles.badgeAnswered}>
                    {open ? "Açıq" : "Cavablanıb"}
                  </span>
                </div>
                <p className={styles.meta}>
                  {it.subject_name_az || "Fənn"}
                  {it.created_at ? ` · ${fmtWhen(it.created_at)}` : ""}
                </p>
                <p className={styles.msg}>{it.message}</p>
                {it.reply ? (
                  <p className={styles.reply}>
                    <strong>Sizin cavab:</strong> {it.reply}
                  </p>
                ) : (
                  <div className={styles.replyRow}>
                    <div className={styles.field}>
                      <textarea
                        className={styles.textarea}
                        style={{ minHeight: 56 }}
                        maxLength={120}
                        placeholder="Qısa cavab (maks. 120)"
                        value={draft}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [it.id]: e.target.value }))}
                      />
                      <p className={styles.meta}>{draft.length}/120</p>
                    </div>
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      disabled={busyId === it.id || draft.trim().length < 1}
                      onClick={() => void sendReply(it.id)}
                    >
                      {busyId === it.id ? "…" : "Cavab ver"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

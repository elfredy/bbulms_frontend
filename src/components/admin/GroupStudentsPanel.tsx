"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { AdminGroupStudentItem } from "@/lib/api";

import { readDetail } from "./form-shared";
import styles from "@/app/[locale]/dashboard/dashboard.module.css";

type OrderOpt = {
  id: string;
  serial?: string | null;
  form_name_az?: string | null;
  order_date?: string | null;
};

type StudentHit = {
  student_id: string;
  fullname: string | null;
  pincode: string | null;
  education_group_id: string | null;
  group_name: string | null;
  specialty_name_az: string | null;
  faculty_name_az?: string | null;
  is_hidden?: boolean;
};

export function GroupStudentsPanel({
  locale,
  educationGroupId,
  students,
  hideOrders,
  restoreOrders,
}: {
  locale: string;
  educationGroupId: string;
  students: AdminGroupStudentItem[];
  hideOrders: OrderOpt[];
  restoreOrders: OrderOpt[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, string>>({});

  const hideOpts = useMemo(() => hideOrders.map(orderLabel), [hideOrders]);
  const restoreOpts = useMemo(() => restoreOrders.map(orderLabel), [restoreOrders]);
  const hiddenCount = students.filter((s) => s.is_hidden).length;

  async function bind(studentId: string, action: "hide" | "restore") {
    const orderId = picked[studentId] || (action === "hide" ? hideOpts[0]?.id : restoreOpts[0]?.id) || "";
    if (!orderId) {
      setError(action === "hide" ? "Əvvəl fasilə/xaric əmri seçin." : "Əvvəl bərpa əmri seçin.");
      return;
    }
    setBusyId(studentId);
    setError(null);
    const res = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}/bind-order`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order_id: orderId, action }),
    });
    setBusyId(null);
    if (!res.ok) {
      setError(await readDetail(res, "Əmr bağlanmadı"));
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <AddStudentsSearch educationGroupId={educationGroupId} memberIds={students.map((s) => s.student_id)} />
      {students.length === 0 ? <p className={styles.alertMuted}>Qrupda tələbə yoxdur.</p> : null}
      {students.length > 0 ? (
      <>
      <p className={styles.meta} style={{ marginTop: 0 }}>
        {students.length - hiddenCount} aktiv · {hiddenCount} fasilə/xaric. Əmrə bağlayanda tələbə qrup siyahısından və
        e-jurnaldan çıxır; bərpa əmri ilə yenidən görünür.
      </p>
      {error ? <p className={styles.alertMuted}>Xəta: {error}</p> : null}
      <div className={styles.tableCard} style={{ marginTop: 8 }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>#</th>
              <th className={styles.th}>Tələbə</th>
              <th className={styles.th}>FİN</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Əmr</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const hidden = Boolean(s.is_hidden);
              const options = hidden ? restoreOpts : hideOpts;
              const value = picked[s.student_id] || "";
              return (
                <tr key={s.student_id} className={hidden ? `${styles.row} ${styles.rowMuted}` : styles.row}>
                  <td className={`${styles.td} ${styles.tdNum}`}>{i + 1}</td>
                  <td className={styles.td}>{s.student_fullname ?? s.student_id}</td>
                  <td className={styles.td}>{s.pincode || "—"}</td>
                  <td className={styles.td}>
                    {hidden ? (
                      <span className={styles.badgeWarn}>{s.out_order_form_name_az || "Siyahıdan çıxıb"}</span>
                    ) : (
                      <span className={styles.badgeOk}>Aktiv</span>
                    )}
                    {hidden && s.out_order_serial ? (
                      <div className={styles.tdMuted}>
                        {s.out_order_serial}
                        {s.out_order_date ? ` · ${s.out_order_date}` : ""}
                      </div>
                    ) : null}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.inlineForm}>
                      <select
                        className={styles.compactSelect}
                        value={value}
                        onChange={(e) => setPicked((prev) => ({ ...prev, [s.student_id]: e.target.value }))}
                      >
                        <option value="">{hidden ? "Bərpa əmri seçin" : "Fasilə/xaric əmri seçin"}</option>
                        {options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {hidden ? (
                        <button
                          type="button"
                          className={styles.button}
                          disabled={busyId === s.student_id || restoreOpts.length === 0}
                          onClick={() => bind(s.student_id, "restore")}
                        >
                          Bərpa et
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.button}
                          disabled={busyId === s.student_id || hideOpts.length === 0}
                          onClick={() => bind(s.student_id, "hide")}
                        >
                          Siyahıdan çıxar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.meta}>
        Əmr yoxdursa əvvəl{" "}
        <Link href={`/${locale}/dashboard/admin/orders/new`}>yeni əmr</Link> yaradın (fasilə/xaric və ya bərpa
        forması).
      </p>
      </>
      ) : null}
    </div>
  );
}

function AddStudentsSearch({ educationGroupId, memberIds }: { educationGroupId: string; memberIds: string[] }) {
  const router = useRouter();
  const memberKey = memberIds.join("\n");
  const members = useMemo(() => new Set(memberKey ? memberKey.split("\n") : []), [memberKey]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [selected, setSelected] = useState<Record<string, StudentHit>>({});
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    setSelected((prev) => {
      const next = Object.fromEntries(Object.entries(prev).filter(([id]) => !members.has(id)));
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [members]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      const params = new URLSearchParams({ q, limit: "20", offset: "0" });
      fetch(`/api/admin/students?${params}`, { credentials: "include", cache: "no-store", signal: ctrl.signal })
        .then(async (res) => {
          if (!res.ok) {
            setError(await readDetail(res, "Tələbələr yüklənmədi"));
            setHits([]);
            return;
          }
          const data = (await res.json()) as { items?: StudentHit[] };
          setError(null);
          setHits(Array.isArray(data.items) ? data.items : []);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError("Tələbələr yüklənmədi");
          setHits([]);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setSearching(false);
        });
    }, 300);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const chosen = Object.values(selected);

  function toggle(hit: StudentHit) {
    if (members.has(hit.student_id)) return;
    setSelected((prev) => {
      const next = { ...prev };
      if (next[hit.student_id]) delete next[hit.student_id];
      else next[hit.student_id] = hit;
      return next;
    });
  }

  async function addSelected() {
    const ids = chosen.map((s) => s.student_id).filter((id) => !members.has(id));
    if (!ids.length) return;
    const moving = chosen.filter((s) => s.education_group_id && s.education_group_id !== educationGroupId);
    if (moving.length) {
      const preview = moving
        .slice(0, 5)
        .map((s) => `${s.fullname || s.student_id}${s.group_name ? ` (${s.group_name})` : ""}`)
        .join(", ");
      const extra = moving.length > 5 ? ` və daha ${moving.length - 5} tələbə` : "";
      const ok = window.confirm(`${preview}${extra} başqa qrupdadır. Bu qrupa keçirilsin?`);
      if (!ok) return;
    }
    setSaving(true);
    setError(null);
    setInfo(null);
    const res = await fetch(`/api/admin/groups/${encodeURIComponent(educationGroupId)}/students`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ student_ids: ids }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(await readDetail(res, "Tələbə əlavə olunmadı"));
      return;
    }
    const data = (await res.json()) as { added?: string[]; moved?: { student_id: string }[]; already?: string[] };
    const parts = [];
    if (data.added?.length) parts.push(`${data.added.length} tələbə qrupa əlavə olundu`);
    if (data.moved?.length) parts.push(`${data.moved.length} tələbə əvvəlki qrupundan bu qrupa keçirildi`);
    if (data.already?.length) parts.push(`${data.already.length} tələbə artıq bu qrupda idi`);
    setInfo(parts.join(". ") || "Hazırdır");
    setSelected({});
    setQuery("");
    setHits([]);
    router.refresh();
  }

  return (
    <div className={styles.picker}>
      <div>
        <p className={styles.meta} style={{ marginTop: 0 }}>
          Bazada olan tələbəni ad, soyad və ya FİN ilə tapıb bu qrupa əlavə edin. Başqa qrupda olan tələbə bu qrupa keçir.
        </p>
      </div>
      <input
        className={styles.input}
        value={query}
        placeholder="Ad, soyad və ya FİN"
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim().length > 0 && query.trim().length < 2 ? <p className={styles.meta}>Axtarış üçün ən azı 2 simvol yazın.</p> : null}
      {searching ? <p className={styles.meta}>Axtarılır…</p> : null}
      {!searching && query.trim().length >= 2 && hits.length === 0 ? <p className={styles.meta}>Tələbə tapılmadı.</p> : null}
      {hits.length > 0 ? (
        <div className={styles.pickerList}>
          {hits.map((hit) => {
            const inGroup = members.has(hit.student_id);
            const checked = inGroup || Boolean(selected[hit.student_id]);
            return (
              <label key={hit.student_id} className={inGroup ? `${styles.pickerItem} ${styles.pickerItemDisabled}` : styles.pickerItem}>
                <input type="checkbox" checked={checked} disabled={inGroup} onChange={() => toggle(hit)} />
                <span>
                  <span className={styles.pickerName}>{hit.fullname || hit.student_id}</span>
                  <span className={styles.tdMuted}>
                    {[hit.pincode, hit.group_name || "Qrupu yoxdur", [hit.faculty_name_az, hit.specialty_name_az].filter(Boolean).join(" / ")]
                      .filter(Boolean)
                      .join(" · ")}
                    {inGroup ? " · bu qrupdadır" : ""}
                    {hit.is_hidden ? " · fasilə/xaric" : ""}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      ) : null}
      <div className={styles.inlineForm}>
        <button type="button" className={styles.buttonPrimary} disabled={saving || chosen.length === 0} onClick={() => void addSelected()}>
          {saving ? "Əlavə olunur…" : chosen.length ? `Seçilənləri əlavə et (${chosen.length})` : "Seçilənləri əlavə et"}
        </button>
        {chosen.length > 0 ? (
          <span className={styles.meta}>{chosen.map((s) => s.fullname || s.pincode || s.student_id).join(", ")}</span>
        ) : null}
      </div>
      {error ? <p className={styles.alertMuted}>Xəta: {error}</p> : null}
      {info ? <p className={styles.alertMuted}>{info}</p> : null}
    </div>
  );
}

function orderLabel(o: OrderOpt) {
  return {
    id: o.id,
    label: [o.serial, o.form_name_az, o.order_date].filter(Boolean).join(" · ") || o.id,
  };
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { AdminGroupStudentItem } from "@/lib/api";

import { readDetail } from "./form-shared";
import styles from "@/app/[locale]/dashboard/dashboard.module.css";

type OrderOpt = {
  id: string;
  serial?: string | null;
  form_name_az?: string | null;
  order_date?: string | null;
};

export function GroupStudentsPanel({
  locale,
  students,
  hideOrders,
  restoreOrders,
}: {
  locale: string;
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

  if (students.length === 0) {
    return <p className={styles.alertMuted}>Qrupda tələbə yoxdur.</p>;
  }

  return (
    <div>
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
    </div>
  );
}

function orderLabel(o: OrderOpt) {
  return {
    id: o.id,
    label: [o.serial, o.form_name_az, o.order_date].filter(Boolean).join(" · ") || o.id,
  };
}

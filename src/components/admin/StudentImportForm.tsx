"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { InstitutionLookups } from "@/lib/admin-org-shared";
import { Field, FieldGroup, SearchSelect, readDetail } from "./form-shared";

import dash from "@/app/[locale]/dashboard/dashboard.module.css";
import styles from "./StudentImport.module.css";

type PreviewRow = {
  row_number: number;
  action: "create" | "skip" | string;
  lastname: string | null;
  firstname: string | null;
  patronymic: string | null;
  pincode: string | null;
  pincode_source: string | null;
  external_id: string | null;
  group_name: string | null;
  group_label: string | null;
  faculty_name_az: string | null;
  specialty_name_az: string | null;
  payment_name_az: string | null;
  status_name_az: string | null;
  gender_name_az: string | null;
  gender_inferred: boolean;
  score: string | null;
  birthdate: string | null;
  registered: boolean | null;
  group_source?: "excel" | "auto" | string | null;
  issues: string[];
};

type PreviewResponse = {
  total: number;
  ready: number;
  skipped: number;
  education_year_name?: string | null;
  warnings: string[];
  unmatched_groups: { name: string; count: number }[];
  groups: {
    group_name: string;
    education_group_id: string | null;
    group_label: string | null;
    faculty_name_az: string | null;
    specialty_name_az: string | null;
    ready: number;
    skipped: number;
    total: number;
  }[];
  rows: PreviewRow[];
};

type ImportResult = {
  created: number;
  skipped: number;
  failed: number;
  errors: { row_number: number; detail: string }[];
  unmatched_groups: { name: string; count: number }[];
};

export function StudentImportForm({ lookups }: { lookups: InstitutionLookups; locale: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [orderId, setOrderId] = useState("");
  const [skipUnregistered, setSkipUnregistered] = useState(true);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"preview" | "import" | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);

  const orderOptions = useMemo(
    () =>
      lookups.orders.map((o) => ({
        id: o.id,
        label: [o.serial, o.type_name_az, o.order_date].filter(Boolean).join(" · ") || o.id,
      })),
    [lookups.orders],
  );

  const visibleRows = preview?.rows.filter((row) => !onlyProblems || row.action !== "create" || row.issues.length > 0) ?? [];

  function formData() {
    if (!file) throw new Error("no-file");
    const data = new FormData();
    data.set("file", file);
    data.set("skip_unregistered", skipUnregistered ? "true" : "false");
    return data;
  }

  async function runPreview() {
    setError(null);
    setResult(null);
    if (!file) {
      setError("Excel faylı seçin.");
      return;
    }
    setLoading("preview");
    try {
      const res = await fetch("/api/admin/students/import/preview", { method: "POST", credentials: "include", body: formData() });
      if (!res.ok) {
        setError(await readDetail(res, "Fayl oxunmadı"));
        setPreview(null);
        return;
      }
      setPreview(await res.json());
    } catch {
      setError("Serverə qoşulmaq mümkün olmadı");
    } finally {
      setLoading(null);
    }
  }

  async function runImport() {
    setError(null);
    if (!file) {
      setError("Excel faylı seçin.");
      return;
    }
    if (!orderId) {
      setError("Tələbə əmri seçilməlidir.");
      return;
    }
    if (!preview?.ready) {
      setError("Əlavə ediləcək hazır sətir yoxdur.");
      return;
    }
    const ok = window.confirm(`${preview.ready} tələbə öz qrupuna əlavə olunacaq. Davam edilsin?`);
    if (!ok) return;
    setLoading("import");
    try {
      const data = formData();
      data.set("in_order_id", orderId);
      const res = await fetch("/api/admin/students/import", { method: "POST", credentials: "include", body: data });
      if (!res.ok) {
        setError(await readDetail(res, "Toplu əlavə alınmadı"));
        return;
      }
      const body = (await res.json()) as ImportResult;
      setResult(body);
      router.refresh();
    } catch {
      setError("Serverə qoşulmaq mümkün olmadı");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <FieldGroup title="Excel">
          <Field label="Fayl (.xlsx)" required span2>
            <div className={styles.fileRow}>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className={dash.input}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setPreview(null);
                  setResult(null);
                }}
              />
              {file ? <span className={styles.fileName}>{file.name}</span> : null}
            </div>
          </Field>
          <Field label="Tələbə əmri" required span2>
            <SearchSelect value={orderId} onChange={setOrderId} options={orderOptions} />
          </Field>
          <Field label="Seçimlər" span2>
            <label className={styles.check}>
              <input type="checkbox" checked={skipUnregistered} onChange={(e) => setSkipUnregistered(e.target.checked)} />
              <span>Qeydiyyatdan keçməyənləri ötür (tövsiyə olunur)</span>
            </label>
          </Field>
        </FieldGroup>
        <p className={dash.meta}>
          Qrup sütunu varsa ada görə tutuşdurulur; yoxdursa ixtisas, forma və dilə görə I kurs qruplarına paylanır.
          FİN artıq sistemdədirsə həmin sətir ötürülür — eyni tələbə ikinci dəfə əlavə olunmur.
        </p>
        <div className={styles.actions}>
          <button type="button" className={dash.button} onClick={() => void runPreview()} disabled={loading !== null}>
            {loading === "preview" ? "Oxunur…" : "Öncədən bax"}
          </button>
          <button type="button" className={dash.buttonPrimary} onClick={() => void runImport()} disabled={loading !== null || !preview || preview.ready === 0}>
            {loading === "import" ? "Əlavə olunur…" : preview ? `${preview.ready} tələbəni əlavə et` : "Əlavə et"}
          </button>
        </div>
        {error ? <p className={dash.alertError}>{error}</p> : null}
        {result ? (
          <div className={styles.result}>
            {result.created} tələbə əlavə olundu
            {result.skipped ? ` · ${result.skipped} sətir buraxıldı` : ""}
            {result.failed ? ` · ${result.failed} sətir xəta verdi` : ""}.
            {result.unmatched_groups.length
              ? ` Tapılmayan qruplar: ${result.unmatched_groups.map((g) => `${g.name} (${g.count})`).join(", ")}.`
              : ""}
          </div>
        ) : null}
      </div>

      {preview ? (
        <>
          <div className={dash.statsGrid}>
            <div className={dash.statCard}>
              <p className={dash.statValue}>{preview.total}</p>
              <p className={dash.statLabel}>Excel sətiri</p>
            </div>
            <div className={dash.statCard}>
              <p className={dash.statValue}>{preview.ready}</p>
              <p className={dash.statLabel}>Qrupa düşəcək</p>
            </div>
            <div className={dash.statCard}>
              <p className={dash.statValue}>{preview.skipped}</p>
              <p className={dash.statLabel}>Buraxılan</p>
            </div>
          </div>
          {preview.warnings.length ? (
            <ul className={styles.warnList}>
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          {preview.unmatched_groups.length ? (
            <p className={dash.alertError}>
              Sistemdə tapılmayan qruplar:{" "}
              {preview.unmatched_groups.map((g) => `${g.name} (${g.count} tələbə)`).join(", ")}. Əvvəlcə qrupu yaradın, sonra eyni
              faylı yenidən yükləyin.
            </p>
          ) : null}
          <div className={styles.groupGrid}>
            {preview.groups.map((g) => (
              <div key={g.group_name} className={styles.groupCard}>
                <p className={styles.groupName}>{g.group_name}</p>
                <p className={styles.groupMeta}>
                  {[g.specialty_name_az, g.faculty_name_az].filter(Boolean).join(" · ") || "Qrup tapılmadı"}
                  <br />
                  {g.ready}/{g.total} hazır
                </p>
              </div>
            ))}
          </div>
          <div className={styles.actions}>
            <label className={styles.check}>
              <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
              Yalnız problemli sətirlər
            </label>
          </div>
          <div className={`${dash.tableCard} ${styles.tableWrap}`}>
            <table className={dash.table}>
              <thead>
                <tr>
                  <th className={dash.th}>#</th>
                  <th className={dash.th}>Tələbə</th>
                  <th className={dash.th}>Qrup</th>
                  <th className={dash.th}>Ödəniş</th>
                  <th className={dash.th}>Cins</th>
                  <th className={dash.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.row_number} className={row.action === "create" ? dash.row : dash.row}>
                    <td className={`${dash.td} ${dash.tdNum}`}>{row.row_number}</td>
                    <td className={`${dash.td} ${dash.tdName}`}>
                      {[row.lastname, row.firstname, row.patronymic].filter(Boolean).join(" ") || "—"}
                      <div className={dash.tdMuted}>
                        ID {row.external_id || "—"}
                        {row.pincode_source === "external_id" ? " · FİN = Tələbə ID" : row.pincode ? ` · FİN ${row.pincode}` : ""}
                        {row.score ? ` · ${row.score} bal` : ""}
                      </div>
                      {row.issues.map((issue) => (
                        <span key={issue} className={issue.startsWith("Cins") || issue.startsWith("Ödəniş") ? `${styles.issue} ${styles.mutedIssue}` : styles.issue}>
                          {issue}
                        </span>
                      ))}
                    </td>
                    <td className={dash.td}>
                      {row.group_label || row.group_name || "—"}
                      {row.specialty_name_az ? <div className={dash.tdMuted}>{row.specialty_name_az}</div> : null}
                      {row.group_source === "auto" ? <div className={dash.tdMuted}>avtomatik paylandı</div> : null}
                    </td>
                    <td className={dash.td}>{row.payment_name_az ?? "—"}</td>
                    <td className={dash.td}>
                      {row.gender_name_az ?? "—"}
                      {row.gender_inferred ? <div className={dash.tdMuted}>təxmin</div> : null}
                    </td>
                    <td className={dash.td}>
                      <span className={row.action === "create" ? dash.badgeOk : dash.badgePending}>
                        {row.action === "create" ? "Əlavə olunacaq" : "Buraxılır"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

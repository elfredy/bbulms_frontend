"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { SearchableSelect } from "@/components/SearchableSelect";
import type { DictItem, SubjectCatalogTopicsData } from "@/lib/admin-org-shared";
import { pageList } from "@/lib/admin-org-shared";

import dash from "@/app/[locale]/dashboard/dashboard.module.css";
import { Field, readDetail } from "./form-shared";
import styles from "./SubjectCatalogTopics.module.css";

const PAGE_SIZES = [25, 50, 100, 200];

function optLabel(item: DictItem) {
  return item.name_az || item.name || item.code || item.id;
}

export function SubjectCatalogTopicsForm({
  catalogId,
  locale,
  initial,
}: {
  catalogId: string;
  locale: string;
  initial: SubjectCatalogTopicsData;
}) {
  const [data, setData] = useState(initial);
  const [lessonTypeId, setLessonTypeId] = useState("");
  const [topic, setTopic] = useState("");
  const [topicInvalid, setTopicInvalid] = useState(false);
  const [typeInvalid, setTypeInvalid] = useState(false);
  const [filterTypeId, setFilterTypeId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initial.limit || 25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lessonOptions = useMemo(
    () => (data.lesson_types ?? []).map((x) => ({ id: x.id, label: optLabel(x) })),
    [data.lesson_types],
  );

  const load = useCallback(
    async (opts?: { lessonTypeId?: string; page?: number; pageSize?: number }) => {
      const nextFilter = opts?.lessonTypeId ?? filterTypeId;
      const nextPage = opts?.page ?? page;
      const nextSize = opts?.pageSize ?? pageSize;
      const params = new URLSearchParams();
      if (nextFilter) params.set("lesson_type_id", nextFilter);
      params.set("limit", String(nextSize));
      params.set("offset", String((nextPage - 1) * nextSize));
      const res = await fetch(`/api/admin/subject-catalog/${encodeURIComponent(catalogId)}/topics?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError(await readDetail(res, "Mövzular yüklənmədi"));
        return;
      }
      const json = (await res.json()) as SubjectCatalogTopicsData;
      setData(json);
      setError(null);
    },
    [catalogId, filterTypeId, page, pageSize],
  );

  async function onAdd() {
    const name = topic.trim();
    setTypeInvalid(!lessonTypeId);
    setTopicInvalid(!name);
    if (!lessonTypeId || !name) {
      setError(!lessonTypeId ? "Dərs tipi seçilməlidir." : "Mövzu adı mütləqdir.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/subject-catalog/${encodeURIComponent(catalogId)}/topics`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lesson_type_id: lessonTypeId, topic: name }),
      });
      if (!res.ok) {
        setError(await readDetail(res, "Mövzu əlavə olunmadı"));
        return;
      }
      setTopic("");
      setTopicInvalid(false);
      setFilterTypeId("");
      setPage(1);
      await load({ lessonTypeId: "", page: 1 });
    } catch {
      setError("Serverə qoşulmaq mümkün olmadı");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteAll() {
    const filtered = Boolean(filterTypeId);
    const msg = filtered
      ? "Seçilmiş dərs tipi üzrə bütün mövzuları silmək istəyirsiniz?"
      : "Bu fənnin bütün mövzularını silmək istəyirsiniz?";
    if (!window.confirm(msg)) return;
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterTypeId) params.set("lesson_type_id", filterTypeId);
      const qs = params.toString();
      const res = await fetch(
        `/api/admin/subject-catalog/${encodeURIComponent(catalogId)}/topics${qs ? `?${qs}` : ""}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) {
        setError(await readDetail(res, "Mövzular silinmədi"));
        return;
      }
      setPage(1);
      await load({ page: 1 });
    } catch {
      setError("Serverə qoşulmaq mümkün olmadı");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteOne(id: string) {
    if (!window.confirm("Mövzunu silmək istəyirsiniz?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/subject-catalog/${encodeURIComponent(catalogId)}/topics/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        setError(await readDetail(res, "Mövzu silinmədi"));
        return;
      }
      const remaining = data.items.length - 1;
      const nextPage = remaining <= 0 && page > 1 ? page - 1 : page;
      setPage(nextPage);
      await load({ page: nextPage });
    } catch {
      setError("Serverə qoşulmaq mümkün olmadı");
    } finally {
      setBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / pageSize));
  const catalog = data.catalog;
  const hintParts = [catalog?.subject_name_az, catalog?.department_name_az].filter(Boolean);

  return (
    <div className={dash.pageWide}>
      <header className={dash.headerCard}>
        <div>
          <h1 className={dash.title}>Mövzu əlavə et</h1>
          <p className={dash.meta}>{hintParts.join(" · ") || "Dərs tipi və mövzu adı mütləqdir."}</p>
        </div>
        <div className={dash.headerActions}>
          <Link href={`/${locale}/dashboard/admin/subject-catalog`} className={dash.actionLink}>
            Kataloqa qayıt
          </Link>
        </div>
      </header>
      <div className={dash.content}>
        <div className={styles.addCard}>
          <div className={styles.fields}>
            <Field label="Dərs tipi" required>
              <SearchableSelect
                value={lessonTypeId}
                onChange={(v) => {
                  setLessonTypeId(v);
                  setTypeInvalid(false);
                }}
                options={lessonOptions}
                placeholder="Məlumat seçilməyib"
                searchPlaceholder="Axtar"
              />
              {typeInvalid ? <p className={dash.meta}>Dərs tipi seçin.</p> : null}
            </Field>
            <Field label="Mövzu" required>
              <input
                className={topicInvalid ? `${dash.input} ${dash.inputInvalid}` : dash.input}
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setTopicInvalid(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void onAdd();
                  }
                }}
                placeholder="Mövzu adı"
              />
            </Field>
          </div>
          <div className={styles.actions}>
            <button type="button" className={dash.buttonPrimary} disabled={busy} onClick={() => void onAdd()}>
              Əlavə et
            </button>
            <button type="button" className={dash.buttonDanger} disabled={busy || data.total === 0} onClick={() => void onDeleteAll()}>
              Hamısını sil
            </button>
          </div>
          {error ? <p className={dash.alertError}>{error}</p> : null}
        </div>

        <div className={styles.filterRow}>
          <Field label="Dərs tipinə görə axtarış">
            <SearchableSelect
              value={filterTypeId}
              onChange={(v) => {
                setFilterTypeId(v);
                setPage(1);
                void load({ lessonTypeId: v, page: 1 });
              }}
              options={lessonOptions}
              placeholder="Hamısı"
              searchPlaceholder="Axtar"
            />
          </Field>
        </div>

        {data.items.length === 0 ? (
          <div className={dash.tableCard}>
            <div className={dash.emptyState}>
              <p>Məlumat yoxdur</p>
            </div>
            <div className={dash.tableFooter}>
              <span>Sətir sayı: 0</span>
              <span>0 / 0</span>
            </div>
          </div>
        ) : (
          <div className={dash.tableCard}>
            <table className={dash.table}>
              <thead>
                <tr>
                  <th className={dash.th}>#</th>
                  <th className={dash.th}>Dərs tipi</th>
                  <th className={dash.th}>Mövzu</th>
                  <th className={dash.th} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((row, i) => (
                  <tr key={row.id} className={dash.row}>
                    <td className={`${dash.td} ${dash.tdNum}`}>{(page - 1) * pageSize + i + 1}</td>
                    <td className={dash.td}>{row.lesson_type_az ?? "—"}</td>
                    <td className={`${dash.td} ${dash.tdName}`}>{row.topic ?? "—"}</td>
                    <td className={dash.td}>
                      <button type="button" className={styles.rowBtn} disabled={busy} onClick={() => void onDeleteOne(row.id)}>
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={dash.tableFooter}>
              <span>Sətir sayı: {data.total}</span>
              <nav className={dash.pager}>
                <select
                  className={dash.select}
                  value={String(pageSize)}
                  onChange={(e) => {
                    const next = Number(e.target.value) || 25;
                    setPageSize(next);
                    setPage(1);
                    void load({ page: 1, pageSize: next });
                  }}
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                {pageList(page, totalPages).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={n === page ? styles.pagerBtnActive : styles.pagerBtn}
                    disabled={busy || n === page}
                    onClick={() => {
                      setPage(n);
                      void load({ page: n });
                    }}
                  >
                    {n}
                  </button>
                ))}
                <span>
                  {page} / {totalPages}
                </span>
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

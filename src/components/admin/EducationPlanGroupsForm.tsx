"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminFormFrame, Field, FieldGroup, FormHint, SearchSelect } from "./form-shared";

type Opt = { id: string; name?: string | null; education_year_name?: string | null };

export function EducationPlanGroupsForm({
  planId,
  organizationId,
  locale,
  existing,
}: {
  planId: string;
  organizationId?: string | null;
  locale: string;
  existing: { id: string; name?: string | null; education_year_name?: string | null }[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Opt[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams({ limit: "120" });
    if (q.trim()) params.set("q", q.trim());
    if (organizationId) params.set("organization_id", organizationId);
    const t = window.setTimeout(() => {
      fetch(`/api/admin/education-plans/lookups/groups?${params}`, { credentials: "include", cache: "no-store", signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => setItems(d.items ?? []))
        .catch(() => {});
    }, 200);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [q, organizationId]);

  const existingIds = new Set(existing.map((g) => g.id));
  const options = items
    .filter((g) => !existingIds.has(g.id))
    .map((g) => ({ id: g.id, label: [g.name, g.education_year_name].filter(Boolean).join(" · ") || g.id }));

  return (
    <AdminFormFrame
      error={error}
      saving={saving}
      submitLabel="Əlavə et"
      onSubmit={async () => {
        if (!selected.length) {
          setError("Qrup seçin");
          return;
        }
        setSaving(true);
        setError(null);
        try {
          const res = await fetch(`/api/admin/education-plans/${encodeURIComponent(planId)}/groups`, {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ education_group_ids: selected }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(typeof data?.detail === "string" ? data.detail : "Əlavə olunmadı");
            return;
          }
          router.push(`/${locale}/dashboard/admin/education-plans/${planId}`);
          router.refresh();
        } finally {
          setSaving(false);
        }
      }}
    >
      <FieldGroup title="Qruplar" columns={1}>
        {existing.length ? (
          <FormHint>Artıq bağlı: {existing.map((g) => g.name || g.id).join(", ")}</FormHint>
        ) : null}
        <Field label="Axtarış">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Qrup adı…"
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 10, border: "1px solid #d0d5dd", font: "inherit" }}
          />
        </Field>
        <Field label="Akademik qrup" required>
          <SearchSelect
            value={selected[0] ?? ""}
            onChange={(id) => setSelected(id ? [id] : [])}
            options={options}
            placeholder="— qrup seç —"
          />
        </Field>
      </FieldGroup>
    </AdminFormFrame>
  );
}

"use client";

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SearchableSelect } from "@/components/SearchableSelect";

import styles from "./AdminForm.module.css";

export type FormOption = { id: string; label: string };

export function AdminFormPage({
  title,
  hint,
  backHref,
  wide,
  children,
}: {
  title: string;
  hint?: string;
  backHref: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.pageWrap}>
      <div className={wide ? `${styles.panel} ${styles.panelWide}` : styles.panel}>
        <header className={styles.panelHead}>
          <div>
            <h1 className={styles.panelTitle}>{title}</h1>
            {hint ? <p className={styles.panelHint}>{hint}</p> : null}
          </div>
          <Link href={backHref} className={styles.close} aria-label="Bağla">
            ×
          </Link>
        </header>
        <div className={styles.panelBody}>{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  required,
  span2,
  children,
}: {
  label: string;
  required?: boolean;
  span2?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={span2 ? `${styles.field} ${styles.span2}` : styles.field}>
      <span className={styles.label}>
        {label}
        {required ? <span className={styles.req}>*</span> : null}
      </span>
      {children}
    </div>
  );
}

export function FieldGroup({
  title,
  columns = 2,
  children,
}: {
  title?: string;
  columns?: 1 | 2;
  children: ReactNode;
}) {
  return (
    <section className={styles.group}>
      {title ? <h2 className={styles.groupTitle}>{title}</h2> : null}
      <div className={columns === 2 ? styles.grid2 : styles.grid1}>{children}</div>
    </section>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={styles.input} {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={styles.textarea} {...props} />;
}

export function FormHint({ children }: { children: ReactNode }) {
  return <p className={styles.hint}>{children}</p>;
}

export function toDateInput(value?: string | null) {
  if (!value) return "";
  const m = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const dmy = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return "";
}

export function SelectInput({
  value,
  onChange,
  options,
  required,
  placeholder = "— seç —",
}: {
  value: string;
  onChange: (v: string) => void;
  options: FormOption[];
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <select className={styles.select} value={value} required={required} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: FormOption[];
  placeholder?: string;
}) {
  return <SearchableSelect value={value} onChange={onChange} options={options} placeholder={placeholder ?? "— seç —"} />;
}

export async function readDetail(res: Response, fallback: string) {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      const parts = data.detail
        .map((item: { msg?: string } | string) => (typeof item === "string" ? item : item?.msg))
        .filter(Boolean);
      if (parts.length) return parts.join(". ");
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export function AdminFormFrame({
  children,
  error,
  saving,
  submitLabel,
  onSubmit,
}: {
  children: ReactNode;
  error: string | null;
  saving: boolean;
  submitLabel: string;
  onSubmit: () => Promise<void | boolean>;
}) {
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit();
      }}
    >
      {children}
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? "Yadda saxlanılır…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function useAdminSave(successHref: string) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(url: string, method: "POST" | "PUT", body: unknown) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(await readDetail(res, "Yadda saxlanılmadı"));
        return false;
      }
      router.push(successHref);
      router.refresh();
      return true;
    } catch {
      setError("Serverə qoşulmaq mümkün olmadı");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { error, saving, save, setError };
}

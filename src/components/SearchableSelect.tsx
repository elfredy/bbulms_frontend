"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./SearchableSelect.module.css";

export type SearchableOption = { id: string; label: string };

type Props = {
  value: string;
  options: SearchableOption[];
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyText?: string;
};

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "— seç —",
  searchPlaceholder = "Axtar…",
  disabled = false,
  emptyText = "Nəticə yoxdur",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const selected = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.id.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div className={styles.wrap} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected ? styles.value : styles.placeholder}>{selected?.label || placeholder}</span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div className={styles.menu} role="listbox">
          <input
            ref={searchRef}
            className={styles.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            autoComplete="off"
          />
          <div className={styles.list}>
            <button type="button" className={styles.option} onClick={() => pick("")}>
              {placeholder}
            </button>
            {filtered.length === 0 ? <div className={styles.empty}>{emptyText}</div> : null}
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                className={o.id === value ? `${styles.option} ${styles.optionActive}` : styles.option}
                onClick={() => pick(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

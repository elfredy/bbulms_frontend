"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "./SearchableSelect.module.css";

export type SearchableOption = { id: string; label: string; disabled?: boolean };

type Props = {
  value: string;
  options: SearchableOption[];
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyText?: string;
  compact?: boolean;
  triggerClassName?: string;
};

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "— seç —",
  searchPlaceholder = "Axtar…",
  disabled = false,
  emptyText = "Nəticə yoxdur",
  compact = false,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
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

    function placeMenu() {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = compact ? Math.max(r.width, 220) : Math.max(r.width, 160);
      const estimatedH = 280;
      const below = r.bottom + 4;
      const top = below + estimatedH > window.innerHeight && r.top > estimatedH ? Math.max(8, r.top - estimatedH - 4) : below;
      const left = Math.min(r.left, Math.max(8, window.innerWidth - width - 8));
      setMenuPos({ top, left, width });
    }

    placeMenu();
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    const onDoc = (e: MouseEvent) => {
      const node = e.target as Node;
      if (rootRef.current?.contains(node) || menuRef.current?.contains(node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, compact]);

  function pick(id: string) {
    const opt = options.find((o) => o.id === id);
    if (opt?.disabled) return;
    onChange(id);
    setOpen(false);
  }

  const menu =
    open && menuPos ? (
      <div
        ref={menuRef}
        className={styles.menu}
        role="listbox"
        style={{ position: "fixed", top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 80 }}
      >
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
              disabled={Boolean(o.disabled)}
              className={o.id === value ? `${styles.option} ${styles.optionActive}` : styles.option}
              onClick={() => pick(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div
      className={`${styles.wrap} ${compact ? styles.wrapCompact : ""}`}
      ref={rootRef}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`${styles.trigger} ${compact ? styles.triggerCompact : ""} ${triggerClassName ?? ""}`}
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected ? styles.value : styles.placeholder}>{selected?.label || placeholder}</span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

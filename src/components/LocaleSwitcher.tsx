"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function onChange(next: string) {
    const segments = pathname.split("/");
    if (segments.length > 1 && routing.locales.includes(segments[1] as (typeof routing.locales)[number])) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    const href = segments.join("/") || `/${next}`;
    router.push(href || `/${next}`);
    router.refresh();
  }

  return (
    <label style={{ fontSize: "0.85rem", color: "var(--muted)", display: "flex", gap: 8, alignItems: "center" }}>
      <span>AZ / EN</span>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)" }}
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {l.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}

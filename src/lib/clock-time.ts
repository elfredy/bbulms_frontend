/** Lesson hours as HH:MM. Never interpret clock strings as UTC instants. */

function unshiftUtcPlusFour(hh: number, mm: number): [number, number] {
  if (hh >= 20 && hh <= 23) {
    const total = (hh * 60 + mm - 4 * 60 + 24 * 60) % (24 * 60);
    return [Math.floor(total / 60), total % 60];
  }
  return [hh, mm];
}

export function fmtClockTime(v: string | null | undefined): string {
  if (v == null) return "";
  const s = String(v).trim();
  if (!s) return "";

  const iso = s.match(/T(\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?/i);
  if (iso) {
    const hh = Number(iso[1]);
    const mm = Number(iso[2]);
    const z = iso[3] || "";
    if (z === "Z" || z === "+00:00" || z === "+0000" || z === "+00") {
      const [h, m] = unshiftUtcPlusFour(hh, mm);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    if (z.startsWith("+04")) {
      const [h, m] = unshiftUtcPlusFour(hh, mm);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    const [h, m] = unshiftUtcPlusFour(hh, mm);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const hm = s.match(/(\d{1,2}):(\d{2})/);
  if (!hm) return s;
  const [h, m] = unshiftUtcPlusFour(Number(hm[1]), Number(hm[2]));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function fmtClockRange(start: string | null | undefined, end: string | null | undefined): string {
  return [fmtClockTime(start), fmtClockTime(end)].filter(Boolean).join("–");
}

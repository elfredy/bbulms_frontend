/** Lesson hours as HH:MM. Never interpret clock strings as UTC instants. */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function offsetMinutes(z: string): number | null {
  if (!z || z === "Z" || z === "+00:00" || z === "+0000" || z === "+00") return 0;
  const m = z.match(/^([+-])(\d{2}):?(\d{2})?$/);
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] || "0"));
}

export function fmtClockTime(v: string | null | undefined): string {
  if (v == null) return "";
  const s = String(v).trim();
  if (!s) return "";

  const iso = s.match(/T(\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?/i);
  if (iso) {
    let hh = Number(iso[1]);
    let mm = Number(iso[2]);
    const off = offsetMinutes(iso[3] || "");
    if (off) {
      const total = (hh * 60 + mm - off + 24 * 60) % (24 * 60);
      hh = Math.floor(total / 60);
      mm = total % 60;
    }
    return `${pad(hh)}:${pad(mm)}`;
  }

  const hm = s.match(/(\d{1,2}):(\d{2})/);
  if (!hm) return s;
  return `${pad(Number(hm[1]))}:${pad(Number(hm[2]))}`;
}

export function fmtClockRange(start: string | null | undefined, end: string | null | undefined): string {
  return [fmtClockTime(start), fmtClockTime(end)].filter(Boolean).join("–");
}

/** SSR calls FastAPI directly (skips Next.js rewrite hop). */
export function serverApiBase(): string {
  const raw =
    process.env.BACKEND_URL?.trim() ||
    process.env.NEXT_INTERNAL_ORIGIN ||
    "http://127.0.0.1:8000";
  return raw.replace(/\/$/, "");
}

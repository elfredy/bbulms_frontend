"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "../../app/[locale]/dashboard/dashboard.module.css";

export function SubjectBlockCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Ad mütləqdir");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/subject-blocks", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), code: code.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "Əlavə olunmadı");
        return;
      }
      setName("");
      setCode("");
      router.refresh();
    } catch {
      setError("Serverə qoşulmaq mümkün olmadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.toolbar} onSubmit={onSubmit}>
      <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Yeni blok adı…" />
      <input className={styles.input} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Kod (istəyə bağlı)" />
      <button type="submit" className={styles.button} disabled={busy}>
        {busy ? "Əlavə olunur…" : "Blok əlavə et"}
      </button>
      {error ? <p className={styles.alertMuted}>{error}</p> : null}
    </form>
  );
}

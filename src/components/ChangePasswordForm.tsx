"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { readDetail } from "@/components/admin/form-shared";

import styles from "./LoginForm.module.css";

export function ChangePasswordForm() {
  const t = useTranslations("changePassword");
  const router = useRouter();
  const locale = useLocale();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, confirm_password: confirm }),
      });
      if (!res.ok) {
        setError(await readDetail(res, t("error")));
        return;
      }
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="new-password">
          {t("password")}
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          className={styles.input}
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="confirm-password">
          {t("confirm")}
        </label>
        <input
          id="confirm-password"
          name="confirm_password"
          type="password"
          className={styles.input}
          autoComplete="new-password"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}

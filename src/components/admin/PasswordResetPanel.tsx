"use client";

import { useState } from "react";

import type { UserRoleDetail } from "@/lib/admin-org-shared";

import { Field, FieldGroup, FormHint, readDetail } from "./form-shared";
import styles from "./AdminForm.module.css";

export function PasswordResetPanel({ initial }: { initial: UserRoleDetail }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ username: string; message: string } | null>(
    initial.must_change_password && initial.pincode
      ? {
          username: initial.pincode,
          message: "Bu hesabın şifrəsi sıfırlanıb. İstifadəçi FİN ilə daxil olub yeni şifrə təyin etməlidir.",
        }
      : null,
  );

  async function onReset() {
    if (!initial.pincode) {
      setError("Bu şəxsin FİN kodu yoxdur");
      return;
    }
    const ok = window.confirm(
      initial.has_login
        ? `İstifadəçi adı və şifrə FİN koduna (${initial.pincode}) sıfırlanacaq. Davam edilsin?`
        : `Bu şəxs üçün giriş hesabı yaradılacaq. İstifadəçi adı və şifrə FİN (${initial.pincode}) olacaq. Davam edilsin?`,
    );
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/user-roles/${initial.person_id}/reset-password`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setError(await readDetail(res, "Parol sıfırlanmadı"));
        return;
      }
      const data = await res.json();
      setDone({
        username: data.reset_username || initial.pincode,
        message: data.message || "Parol sıfırlandı.",
      });
      if (data.login_created || !initial.has_login) {
        window.setTimeout(() => window.location.reload(), 600);
      }
    } catch {
      setError("Serverə qoşulmaq mümkün olmadı");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.form}>
      <FieldGroup title={initial.has_login ? "Parol sıfırlama" : "Giriş hesabı"}>
        <Field label="Cari istifadəçi adı" span2>
          <p className={styles.hint}>{initial.username || "—"}</p>
        </Field>
        <Field label="FİN kod" span2>
          <p className={styles.hint}>{initial.pincode || "—"}</p>
        </Field>
      </FieldGroup>
      <FormHint>
        {initial.has_login
          ? "Sıfırlananda həm istifadəçi adı, həm şifrə FİN olur. İstifadəçi daxil olandan sonra öz şifrəsini təyin edir. Növbəti girişdə istifadəçi adı yenə FİN, şifrə isə onun seçdiyi olur."
          : "Hesab yoxdursa, FİN ilə giriş hesabı yaranır. Müəllim FİN / FİN yazıb daxil olur, sonra şifrəni dəyişməlidir."}
      </FormHint>
      {error ? <p className={styles.error}>{error}</p> : null}
      {done ? (
        <p className={styles.ok}>
          {done.message}
          <br />
          İstifadəçi adı / şifrə: <strong>{done.username}</strong>
        </p>
      ) : null}
      <div className={styles.actions}>
        <button type="button" className={styles.submitWarn} disabled={saving || !initial.pincode} onClick={() => void onReset()}>
          {saving ? "Sıfırlanır…" : initial.has_login ? "Parolu FİN-ə sıfırla" : "Giriş hesabı yarat (FİN)"}
        </button>
      </div>
    </div>
  );
}

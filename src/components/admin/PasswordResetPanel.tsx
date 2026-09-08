"use client";

import { useState } from "react";

import type { UserRoleDetail } from "@/lib/admin-org";

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
      `İstifadəçi adı və şifrə FİN koduna (${initial.pincode}) sıfırlanacaq. Davam edilsin?`,
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
    } catch {
      setError("Serverə qoşulmaq mümkün olmadı");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.form}>
      <FieldGroup title="Parol sıfırlama">
        <Field label="Cari istifadəçi adı" span2>
          <p className={styles.hint}>{initial.username || "—"}</p>
        </Field>
        <Field label="FİN kod" span2>
          <p className={styles.hint}>{initial.pincode || "—"}</p>
        </Field>
      </FieldGroup>
      <FormHint>
        Sıfırlananda həm istifadəçi adı, həm şifrə FİN olur. İstifadəçi daxil olandan sonra öz şifrəsini təyin edir.
        Növbəti girişdə istifadəçi adı yenə FİN, şifrə isə onun seçdiyi olur.
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
          {saving ? "Sıfırlanır…" : "Parolu FİN-ə sıfırla"}
        </button>
      </div>
    </div>
  );
}
